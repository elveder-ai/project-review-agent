import fs from 'fs';
import path from 'path';
import { FileInfo, ProjectStructure } from '../types';
import { execSync } from 'child_process';
import { executeCode2promptJson } from './codeUtils';

// Base path for cache directory
export const CACHE_ROOT = './cache';

// Generate a timestamp string for folder naming
function getTimestampString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}-${now.getMilliseconds().toString().padStart(3, '0')}`;
}

// Store the current run timestamp to reuse across function calls
export const currentRunTimestamp = getTimestampString();

// DIRECTORY OPERATIONS
export async function createDirectoryIfNotExists(dirPath: string): Promise<void> {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function removeDirectory(dirPath: string): void {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

// CACHE OPERATIONS
export async function saveToCache(fileName: string, data: any): Promise<void> {
  const cachePath = `${CACHE_ROOT}/${currentRunTimestamp}`;
  await createDirectoryIfNotExists(cachePath);
  await writeJsonFile(`${cachePath}/${fileName}`, data);
}

export async function readFromCache(fileName: string): Promise<any> {
  const filePath = `${CACHE_ROOT}/${currentRunTimestamp}/${fileName}`;
  return readJsonFile(filePath);
}

export function getCachePath(fileName: string): string {
  return `${CACHE_ROOT}/${currentRunTimestamp}/${fileName}`;
}

export function getCode2promptCachePath(fileName: string): string {
  const cachePath = `${CACHE_ROOT}/${currentRunTimestamp}/code2prompt`;
  return path.join(cachePath, fileName);
}

// FILE OPERATIONS
export async function writeTextFile(filePath: string, content: string): Promise<void> {
  await createDirectoryIfNotExists(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf-8');
}

export async function writeJsonFile(filePath: string, data: any): Promise<void> {
  await writeTextFile(filePath, JSON.stringify(data, null, 2));
}

export function readTextFile(filePath: string): string {
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  }
  return '';
}

export function readJsonFile(filePath: string): any {
  const content = readTextFile(filePath);
  if (content) {
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error parsing JSON from ${filePath}:`, error);
    }
  }
  return null;
}

export function copyFile(sourcePath: string, targetPath: string): void {
  createDirectoryIfNotExists(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function isDirectory(filePath: string): boolean {
  if (fileExists(filePath)) {
    return fs.statSync(filePath).isDirectory();
  }
  return false;
}

export function getFileSize(filePath: string): number {
  if (fileExists(filePath) && !isDirectory(filePath)) {
    return fs.statSync(filePath).size;
  }
  return 0;
}

export async function getProjectStructure(rootDir: string): Promise<ProjectStructure> {
  try {
    // Common build directories and files to exclude
    const buildPatterns = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/.cache/**',
      '**/coverage/**',
      '**/out/**',
      '**/target/**',
      '**/bin/**',
      '**/obj/**',
      '**/__pycache__/**',
      '**/.next/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/vendor/**',
      '**/bower_components/**',
      '**/release/**',
      '**/releases/**'
    ];
    
    // Join the build patterns with the correct format for code2prompt
    const excludePatternsString = buildPatterns.join(',');
    
    // Use code2prompt to get JSON output
    const outputFile = getCode2promptCachePath('get_project_structure.json');
    const code2promptOutput = await executeCode2promptJson(rootDir, outputFile, excludePatternsString);
    
    // The output format has a 'files' array with absolute paths
    if (!code2promptOutput.files || !Array.isArray(code2promptOutput.files)) {
      throw new Error('Unexpected JSON structure from code2prompt');
    }
    
    // Build a file tree from the flat files array
    const root: FileInfo = {
      path: '',
      type: 'directory',
      children: []
    };
    
    // Create a map of directories to their children
    const dirMap: Record<string, FileInfo> = {
      '': root
    };
    
    // Store filtered paths for debugging
    const includedPaths: string[] = [];
    
    // Process each file path and build the tree structure
    for (const filePath of code2promptOutput.files) {
      // Convert absolute path to relative path
      const relativePath = path.relative(rootDir, filePath);
      if (!relativePath) continue;
      
      includedPaths.push(relativePath);
      
      // Split the path into segments
      const segments = relativePath.split(path.sep);
      
      // Process each directory in the path
      let currentPath = '';
      for (let i = 0; i < segments.length - 1; i++) {
        const segment = segments[i];
        const parentPath = currentPath;
        currentPath = currentPath ? path.join(currentPath, segment) : segment;
        
        // Create directory if it doesn't exist
        if (!dirMap[currentPath]) {
          const dirInfo: FileInfo = {
            path: currentPath,
            type: 'directory',
            children: []
          };
          dirMap[currentPath] = dirInfo;
          
          // Add to parent directory
          if (dirMap[parentPath]) {
            dirMap[parentPath].children = dirMap[parentPath].children || [];
            dirMap[parentPath].children.push(dirInfo);
          }
        }
      }
      
      // Add the file to its parent directory
      const parentPath = segments.length > 1 ? segments.slice(0, -1).join(path.sep) : '';
      const fileInfo: FileInfo = {
        path: relativePath,
        type: 'file',
        size: getFileSize(filePath)
      };
      
      if (dirMap[parentPath]) {
        dirMap[parentPath].children = dirMap[parentPath].children || [];
        dirMap[parentPath].children.push(fileInfo);
      }
    }
    
    console.log(`Files included: ${includedPaths.length}`);
    
    if (includedPaths.length === 0) {
      console.warn('No files were included in the project structure! Check filtering logic.');
    }
    
    return { root };
  } catch (error) {
    console.error('Error generating project structure with code2prompt:', error);
    throw new Error('Failed to generate project structure using code2prompt. No fallback implementation will be used.');
  }
}

// PROJECT SIZE OPERATIONS
export function getProjectSize(projectPath: string): { total: number; byLanguage: Record<string, number>; category: 'SMALL' | 'MEDIUM' | 'LARGE' } {
  try {
    // Check if cloc is installed
    try {
      execSync('cloc --version', { stdio: 'ignore' });
    } catch (error) {
      console.error('cloc is not installed. Please install it using npm install -g cloc');
      return { total: 0, byLanguage: {}, category: 'SMALL' };
    }

    const result = execSync(`cloc ${projectPath} --json`, { encoding: 'utf-8' });
    const clocResult = JSON.parse(result);
    
    // Remove summary entries
    delete clocResult.header;
    delete clocResult.SUM;
    
    const byLanguage: Record<string, number> = {};
    let total = 0;
    
    for (const lang in clocResult) {
      byLanguage[lang] = clocResult[lang].code;
      total += clocResult[lang].code;
    }
    
    let category: 'SMALL' | 'MEDIUM' | 'LARGE' = 'SMALL';
    if (total > 10000) {
      category = 'LARGE';
    } else if (total > 1000) {
      category = 'MEDIUM';
    }
    
    return { total, byLanguage, category };
  } catch (error) {
    console.error('Error getting project size:', error);
    return { total: 0, byLanguage: {}, category: 'SMALL' };
  }
}

// REPORT OPERATIONS
export async function saveFinalReport(report: any): Promise<string> {
  const outputPath = `./output/${currentRunTimestamp}`;
  await createDirectoryIfNotExists(outputPath);
  const reportPath = `${outputPath}/project_review.md`;
  
  const content = generateMarkdownReport(report);
  await writeTextFile(reportPath, content);
  
  return reportPath;
}

function generateMarkdownReport(report: any): string {
  // Implementation of markdown generation based on the report structure
  const { introduction, issues, strengths, miscellaneous, recommendations } = report;
  
  let markdown = `# Project Review Report\n\n`;
  
  // Introduction section
  markdown += `## Introduction\n\n`;
  if (introduction) {
    markdown += `**Project Type:** ${introduction.projectType}\n\n`;
    markdown += `**Project Purpose:** ${introduction.projectPurpose}\n\n`;
    
    if (introduction.mainFunctionalities && introduction.mainFunctionalities.length > 0) {
      markdown += `**Main Functionalities:**\n`;
      introduction.mainFunctionalities.forEach((func: string) => {
        markdown += `- ${func}\n`;
      });
    }
    
    if (introduction.technologies && introduction.technologies.length > 0) {
      markdown += `\n**Technologies:**\n`;
      introduction.technologies.forEach((tech: any) => {
        markdown += `- ${tech.name}${tech.version ? ` (${tech.version})` : ''} - ${tech.type}\n`;
      });
    }
    
    if (introduction.structureOverview) {
      markdown += `\n**Structure Overview:**\n${introduction.structureOverview}\n\n`;
    }
  }
  
  // Issues section
  if (issues && issues.length > 0) {
    markdown += `## Issues\n`;
    issues.forEach((issue: any, index: number) => {
      markdown += `\n### Issue ${index + 1}: ${issue.description}\n\n`;
      if (issue.codeSnippet) {
        markdown += `**Code Snippet:**\n\`\`\`\n${issue.codeSnippet}\n\`\`\`\n`;
      }
      if (issue.lineNumbers) {
        markdown += `**Line Numbers:** ${issue.lineNumbers}\n`;
      }
      markdown += `**Severity:** ${issue.severity}\n`;
      markdown += `**Impact:** ${issue.impact}\n`;
    });
  }
  
  // Strengths section
  if (strengths && strengths.length > 0) {
    markdown += `\n## Strengths\n\n`;
    markdown += `- ${strengths.map((strength: any) => strength.description).join('\n- ')}\n\n`;
  }
  
  // Miscellaneous section
  markdown += `## Miscellaneous\n\n`;
  if (miscellaneous && miscellaneous.projectSize) {
    markdown += `**Project Size:** ${miscellaneous.projectSize.total} lines (${miscellaneous.projectSize.category})\n\n`;
    markdown += `**Lines of Code by Language:**\n`;
    if (miscellaneous.projectSize.byLanguage) {
      for (const [lang, lines] of Object.entries(miscellaneous.projectSize.byLanguage)) {
        markdown += `- ${lang}: ${lines} lines\n`;
      }
    }
  }
  
  if (miscellaneous && miscellaneous.dependencies) {
    markdown += `\n**Dependencies:**\n`;
    miscellaneous.dependencies.forEach((dep: any) => {
      markdown += `- ${dep.name}${dep.version ? ` (${dep.version})` : ''}\n`;
    });
  }
  
  // Recommendations section
  if (recommendations && recommendations.length > 0) {
    markdown += `\n## Recommendations\n`;
    recommendations.forEach((rec: any, index: number) => {
      markdown += `\n### ${index + 1}. ${rec.description}\n\n`;
      markdown += `**Priority:** ${rec.priority}\n`;
      markdown += `**Estimated Effort:** ${rec.effort}\n`;
      markdown += `**Category:** ${rec.category}\n`;
    });
  }
  
  return markdown;
}