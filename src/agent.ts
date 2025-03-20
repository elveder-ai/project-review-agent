import dotenv from 'dotenv';
import path from 'path';
import {
  generateFinalReport,
  identifyKeyFiles,
  identifyProjectType,
  reviewCode,
  suggestRelatedFiles
} from './services/llmService';
import {
  CodeReviewResult,
  KeyFile,
  ProjectInfo,
  ProjectSize,
  ProjectStructure
} from './types';
import {
  generateFilePrompt
} from './utils/codeUtils';
import {
  createDirectoryIfNotExists,
  fileExists,
  getFileSize,
  getProjectSize,
  getProjectStructure,
  isDirectory,
  readTextFile,
  saveFinalReport,
  saveToCache
} from './utils/fileUtils';

dotenv.config();

class ProjectReviewAgent {
  private projectPath: string;
  private projectStructure: ProjectStructure | null = null;
  private projectInfo: ProjectInfo | null = null;
  private keyFiles: KeyFile[] = [];
  private reviewResults: CodeReviewResult[] = [];
  private projectSize: ProjectSize | null = null;
  private maxFilesToReview: number = 50;

  constructor(projectPath: string) {
    this.projectPath = path.resolve(projectPath);
    createDirectoryIfNotExists('./cache');
    createDirectoryIfNotExists('./output');
  }

  /**
   * Run the complete project review process
   */
  async run(): Promise<string> {
    console.log(`Starting review of project at: ${this.projectPath}`);
    
    // Step 1: Get the project structure
    await this.getProjectStructure();
    
    // Step 2: Identify project type and technologies
    await this.identifyProjectType();
    
    // Step 3: Identify key files for review
    await this.identifyKeyFiles();
    
    // Step 4: Review the files
    await this.reviewFiles();
    
    // Step 5: Get project size using cloc
    this.getProjectSize();
    
    // Step 6: Generate the final report
    const reportPath = await this.generateFinalReport();
    
    return reportPath;
  }

  /**
   * Step 1: Get the project structure
   */
  private async getProjectStructure(): Promise<void> {
    console.log('Getting project structure...');
    
    this.projectStructure = await getProjectStructure(this.projectPath);
    await saveToCache('project_structure.json', this.projectStructure);
    
    console.log('Project structure obtained.');
  }

  /**
   * Step 2: Identify project type and technologies
   */
  private async identifyProjectType(): Promise<void> {
    console.log('Identifying project type and technologies...');
    
    if (!this.projectStructure) {
      throw new Error('Project structure not available. Run getProjectStructure first.');
    }
    
    // Find and read important configuration files
    const configFiles: Record<string, string> = {};
    
    // Common configuration files to check
    const configFilePatterns = [
      'package.json', 'requirements.txt', 'Cargo.toml', 'go.mod',
      'Gemfile', 'pom.xml', 'build.gradle', '.csproj', 'Dockerfile',
      'docker-compose.yml', 'tsconfig.json', 'pyproject.toml'
    ];
    
    const findConfigFiles = (fileInfo: any, rootPath: string) => {
      if (fileInfo.type === 'file') {
        const fileName = path.basename(fileInfo.path);
        if (configFilePatterns.some(pattern => fileName.includes(pattern))) {
          const filePath = path.join(rootPath, fileInfo.path);
          try {
            const content = readTextFile(filePath);
            configFiles[fileInfo.path] = content;
          } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
          }
        }
      } else if (fileInfo.type === 'directory' && fileInfo.children) {
        for (const child of fileInfo.children) {
          findConfigFiles(child, rootPath);
        }
      }
    };
    
    findConfigFiles(this.projectStructure.root, this.projectPath);
    
    // Pass the raw configFiles object to identifyProjectType
    this.projectInfo = await identifyProjectType(this.projectStructure, configFiles);
    await saveToCache('project_info.json', this.projectInfo);
    
    console.log(`Project identified as: ${this.projectInfo.type}`);
  }

  /**
   * Step 3: Identify key files for review
   */
  private async identifyKeyFiles(): Promise<void> {
    console.log('Identifying key files for review...');
    
    if (!this.projectStructure || !this.projectInfo) {
      throw new Error('Project structure or info not available. Run previous steps first.');
    }
    
    this.keyFiles = await identifyKeyFiles(this.projectStructure, this.projectInfo);
    
    // Sort by importance (descending)
    this.keyFiles.sort((a, b) => b.importance - a.importance);
    
    await saveToCache('key_files.json', this.keyFiles);
    
    console.log(`Identified ${this.keyFiles.length} key files for review.`);
  }

  /**
   * Step 4: Review the files
   */
  private async reviewFiles(): Promise<void> {
    console.log('Reviewing files...');
    
    if (!this.keyFiles.length || !this.projectInfo) {
      throw new Error('Key files or project info not available. Run previous steps first.');
    }
    
    const reviewedFiles = new Set<string>();
    this.reviewResults = [];
    
    // Start with the key files identified earlier
    const filesToReview = [...this.keyFiles.map(file => file.path)];
    
    while (filesToReview.length > 0 && reviewedFiles.size < this.maxFilesToReview) {
      const filePath = filesToReview.shift();
      
      if (!filePath || reviewedFiles.has(filePath)) {
        continue;
      }
      
      reviewedFiles.add(filePath);
      
      console.log(`Reviewing file ${reviewedFiles.size}/${this.maxFilesToReview}: ${filePath}`);
      
      try {
        const fullPath = path.join(this.projectPath, filePath);
        
        // Skip files that don't exist
        if (!fileExists(fullPath)) {
          console.warn(`File ${filePath} does not exist.`);
          continue;
        }
        
        // Skip directories
        if (isDirectory(fullPath)) {
          console.warn(`${filePath} is a directory, skipping review.`);
          continue;
        }
        
        // Skip files that are too large
        if (getFileSize(fullPath) > 1000000) { // 1MB limit
          console.warn(`File ${filePath} is too large to review (${getFileSize(fullPath)} bytes).`);
          continue;
        }
        
        // Generate file prompt
        let filePrompt = '';
        try {
          filePrompt = await generateFilePrompt(fullPath, { lineNumbers: true });
        } catch (error) {
          console.error(`Error generating prompt for file ${filePath}:`, error);
          continue;
        }
        
        // Review the file
        const reviewResult = await reviewCode(filePath, this.projectInfo, filePrompt);
        this.reviewResults.push(reviewResult);
        
        // Save the intermediate results after each file
        await saveToCache('review_results.json', this.reviewResults);
        
        // Get suggestions for related files to review
        const relatedFiles = await suggestRelatedFiles(
          filePath,
          reviewResult,
          this.projectStructure!,
          Array.from(reviewedFiles)
        );
        
        // Add new suggested files to the review queue
        for (const relatedFile of relatedFiles) {
          if (!reviewedFiles.has(relatedFile) && !filesToReview.includes(relatedFile)) {
            filesToReview.push(relatedFile);
          }
        }
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    }
    
    console.log(`Completed review of ${this.reviewResults.length} files.`);
  }

  /**
   * Step 5: Get project size using cloc
   */
  private getProjectSize(): void {
    console.log('Getting project size...');
    
    this.projectSize = getProjectSize(this.projectPath);
    saveToCache('project_size.json', this.projectSize);
    
    console.log(`Project size: ${this.projectSize.total} lines (${this.projectSize.category})`);
  }

  /**
   * Step 6: Generate the final report
   */
  private async generateFinalReport(): Promise<string> {
    console.log('Generating final report...');
    
    if (!this.projectInfo || !this.reviewResults.length || !this.projectSize) {
      throw new Error('Required data not available. Run previous steps first.');
    }
    
    // Generate final report using LLM for summaries and cached data for other parts
    console.log('Combining cached project data with LLM summaries for the final report...');
    const finalReport = await generateFinalReport(
      this.projectInfo,
      this.reviewResults,
      this.projectSize
    );
    
    const reportPath = await saveFinalReport(finalReport);
    
    console.log(`Final report generated at: ${reportPath}`);
    return reportPath;
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const projectPath = args[0] || '.';
  
  const agent = new ProjectReviewAgent(projectPath);
  
  agent.run()
    .then(reportPath => {
      console.log(`Review completed. Report available at: ${reportPath}`);
    })
    .catch(error => {
      console.error('Error running project review:', error);
      process.exit(1);
    });
}

export default ProjectReviewAgent; 