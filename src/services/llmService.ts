import { ChatAnthropic } from '@langchain/anthropic';
import { PromptTemplate } from '@langchain/core/prompts';
import dotenv from 'dotenv';
import { z } from "zod";
import {
  codeReviewSchema,
  finalReportSummarySchema,
  keyFileSchema,
  projectInfoSchema,
  relatedFilesSchema
} from '../schemas';
import {
  CodeReviewResult,
  KeyFile,
  ProjectInfo,
  ProjectStructure
} from '../types';

dotenv.config();

// Initialize the LLM with Anthropic's Claude
const llm = new ChatAnthropic({
  modelName: 'claude-3-7-sonnet-latest',
  temperature: 0.0,
});

// Helper function to parse LLM output in case of errors
const parseLLMOutput = (error: any, context: string): any => {
  if (!error.llmOutput) {
    return null;
  }

  try {
    let rawOutput = error.llmOutput;
    
    // Clean up the output if it's not valid JSON
    if (typeof rawOutput === 'string') {
      // Remove markdown code blocks if present
      rawOutput = rawOutput.replace(/```json\s+/g, '').replace(/```\s*$/g, '');
      
      // Remove any trailing commas which can cause JSON parse errors
      rawOutput = rawOutput.replace(/,(\s*[}\]])/g, '$1');
      
      // Try to find valid JSON within the output if it's mixed with other text
      const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        rawOutput = jsonMatch[0];
      }
    }
    
    const parsedOutput = typeof rawOutput === 'string' 
      ? JSON.parse(rawOutput) 
      : rawOutput;
      
    console.log(`Successfully parsed partial output from LLM for ${context}`);
    return parsedOutput;
  } catch (parseError) {
    console.error('Error parsing LLM output:', parseError);
    return null;
  }
};

// Format project structure as a tree-like representation
const formatStructureAsTree = (node: any, indent: string = ''): string => {
  if (node.type === 'file') {
    return `${indent}├── ${node.path}\n`;
  }
  
  let result = node.path ? `${indent}├── ${node.path}/\n` : '';
  
  if (node.children) {
    const nextIndent = node.path ? indent + '│   ' : indent;
    for (const child of node.children) {
      result += formatStructureAsTree(child, nextIndent);
    }
  }
  
  return result;
};

export async function identifyProjectType(
  projectStructure: ProjectStructure,
  configFiles: Record<string, string>
): Promise<ProjectInfo> {
  try {
    // Create a structured output model
    const structuredLlm = llm.withStructuredOutput(projectInfoSchema, {
      name: "projectInfo"
    });

    // Format the config files into a readable prompt
    let configFilesPrompt = '';
    for (const [filePath, content] of Object.entries(configFiles)) {
      configFilesPrompt += `File: ${filePath}\n\n\`\`\`\n${content}\n\`\`\`\n\n`;
    }

    const formattedStructure = formatStructureAsTree(projectStructure.root);

    const prompt = PromptTemplate.fromTemplate(`
      You are an expert code analyzer. Given the file structure of a project and the content of key configuration files,
      identify the project type, technologies used, frameworks, and provide a brief description of what this project is about.
      
      Project Structure (Directory Tree):
      {projectStructure}
      
      Configuration Files:
      {configFilesPrompt}
    `);

    const result = await prompt.pipe(structuredLlm).invoke({
      projectStructure: formattedStructure,
      configFilesPrompt
    });
    
    return result;
  } catch (error) {
    console.error('Error in identifyProjectType:', error);
    
    // Try to extract partial output from error if available
    const parsedOutput = parseLLMOutput(error, 'project type');
    if (parsedOutput) {
      return parsedOutput;
    }
    
    // Return a default structure if the function fails
    return {
      type: 'Unknown',
      technologies: [],
      frameworks: [],
      description: 'Failed to analyze the project due to an error.'
    };
  }
}

export async function identifyKeyFiles(
  projectStructure: ProjectStructure,
  projectInfo: ProjectInfo
): Promise<KeyFile[]> {
  try {
    // Debug info
    console.log('Project info being sent to LLM:', JSON.stringify(projectInfo));
    
    // Create a structured output model
    // Wrap the array in an object to satisfy Claude's requirement
    const keyFilesWrapperSchema = z.object({
      files: z.array(keyFileSchema).describe("List of key files to review")
    });
    
    const structuredLlm = llm.withStructuredOutput(keyFilesWrapperSchema, {
      name: "keyFiles"
    });

    const formattedStructure = formatStructureAsTree(projectStructure.root);

    const prompt = PromptTemplate.fromTemplate(`
      You are an expert code analyzer. Given the file structure of a project and information about the project type and technologies used,
      identify the most important files that should be reviewed for a comprehensive code review.
      
      Project Information:
      {projectInfo}
      
      Project Structure (Directory Tree):
      {projectStructure}
      
      For each file, provide an importance score (1-10, where 10 is highest importance) and a brief reason why this file is important to review.
      Consider entry points, core business logic, configuration files, and any files that are likely to contain critical functionality or potential issues.
      
      Limit your response to the 20 most important files.
    `);

    const result = await prompt.pipe(structuredLlm).invoke({
      projectInfo: JSON.stringify(projectInfo, null, 2),
      projectStructure: formattedStructure
    });
    
    // Return the files array from the result
    return result.files;
  } catch (error) {
    console.error('Error in identifyKeyFiles:', error);
    
    // Try to extract partial output from error if available
    const parsedOutput = parseLLMOutput(error, 'key files');
    if (parsedOutput && parsedOutput.files) {
      return parsedOutput.files;
    }
    
    return [];
  }
}

export async function reviewCode(
  filePath: string,
  projectInfo: ProjectInfo,
  filePrompt: string
): Promise<CodeReviewResult> {
  try {
    // Create a structured output model
    const structuredLlm = llm.withStructuredOutput(codeReviewSchema, {
      name: "codeReview"
    });

    const prompt = PromptTemplate.fromTemplate(`
      You are an expert code reviewer. Review the following code file in the context of the project information provided.
      Focus on code quality, commented code, architectural concerns, potential issues, best practices, security, and performance.
      
      File Path: {filePath}
      
      Project Information:
      {projectInfo}
      
      Code Content:
      {filePrompt}
    `);

    const result = await prompt.pipe(structuredLlm).invoke({
      filePath,
      filePrompt,
      projectInfo: JSON.stringify(projectInfo, null, 2)
    });
    
    return result;
  } catch (error) {
    console.error('Error in reviewCode:', error);
    
    // Try to extract partial output from error if available
    const parsedOutput = parseLLMOutput(error, 'code review');
    if (parsedOutput) {
      // Ensure all required fields are present
      return {
        path: parsedOutput.path || filePath,
        codeQuality: parsedOutput.codeQuality || 'Unable to fully analyze',
        issues: parsedOutput.issues || [],
        strengths: parsedOutput.strengths || [],
        recommendations: parsedOutput.recommendations || []
      };
    }
    
    return {
      path: filePath,
      codeQuality: 'Unable to analyze due to an error',
      issues: [],
      strengths: [],
      recommendations: []
    };
  }
}

export async function suggestRelatedFiles(
  currentFile: string,
  reviewResult: CodeReviewResult,
  projectStructure: ProjectStructure,
  alreadyReviewed: string[]
): Promise<string[]> {
  try {
    // Create a structured output model
    const structuredLlm = llm.withStructuredOutput(relatedFilesSchema, {
      name: "relatedFiles"
    });
    
    const prompt = PromptTemplate.fromTemplate(`
      You are an expert code reviewer. Based on the review of a file, suggest other files that might be related and should be reviewed next.
      Consider dependencies, imports, and functional relationships between files.
      
      Current file being reviewed: {currentFile}
      
      Review results for this file:
      {reviewResult}
      
      Project structure:
      {projectStructure}
      
      Files already reviewed:
      {alreadyReviewed}
      
      Suggest up to 5 related files that should be reviewed next, in order of importance.
      Only include files that exist in the project structure.
      Do not suggest files that have already been reviewed.
    `);

    const result = await prompt.pipe(structuredLlm).invoke({
      currentFile,
      reviewResult: JSON.stringify(reviewResult, null, 2),
      projectStructure: JSON.stringify(projectStructure, null, 2),
      alreadyReviewed: JSON.stringify(alreadyReviewed, null, 2)
    });
    
    // Return the files array from the result
    return result.files;
  } catch (error) {
    console.error('Error in suggestRelatedFiles:', error);
    
    // Try to extract partial output from error if available
    const parsedOutput = parseLLMOutput(error, 'related files');
    if (parsedOutput && parsedOutput.files) {
      return parsedOutput.files;
    }
    
    return [];
  }
}

export async function generateFinalReport(
  projectInfo: ProjectInfo,
  reviewResults: CodeReviewResult[],
  projectSize: { total: number; byLanguage: Record<string, number>; category: 'SMALL' | 'MEDIUM' | 'LARGE' },
  projectStructure: ProjectStructure
): Promise<any> {
  // Generate the formatted structure here so it's available in all code paths
  const formattedStructure = formatStructureAsTree(projectStructure.root);
  
  try {
    // Create a structured output model
    const structuredLlm = llm.withStructuredOutput(finalReportSummarySchema, {
      name: "summarizedReport"
    });

    const prompt = PromptTemplate.fromTemplate(`
      You are an expert code analyst. Generate a summarized report focusing only on the key aspects of the project.
      
      Project Information:
      {projectInfo}
      
      Review Results:
      {reviewResults}
      
      Focus only on summarizing the following:
      - Project Purpose: What the project is designed to do
      - Main Functionalities: The key features or capabilities of the project
      - Issues: Major issues identified across the codebase
      - Strengths: Major strengths identified across the codebase
      - Recommendations: Suggestions for improvement with priority, effort, and category
    `);

    try {
      // Get LLM summary for the specified sections
      const summarizedParts = await prompt.pipe(structuredLlm).invoke({
        projectInfo: JSON.stringify(projectInfo, null, 2),
        reviewResults: JSON.stringify(reviewResults, null, 2)
      });
      
      // Build the complete report by combining LLM summarized parts with cached data
      const finalReport = {
        introduction: {
          projectType: projectInfo.type, // From cache
          projectPurpose: summarizedParts.projectPurpose, // From LLM
          mainFunctionalities: summarizedParts.mainFunctionalities, // From LLM
          technologies: projectInfo.technologies, // From cache
          structureOverview: formattedStructure // Use the formatted structure here
        },
        issues: summarizedParts.issues, // From LLM
        strengths: summarizedParts.strengths, // From LLM
        miscellaneous: {
          projectSize: projectSize, // From cache
          dependencies: projectInfo.technologies.filter(t => t.type === "library" || t.type === "framework") // From cache
        },
        recommendations: summarizedParts.recommendations // From LLM
      };
      
      return finalReport;
    } catch (error) {
      console.error('Error in generating summarized report:', error);
      
      // Extract partial output if possible
      const parsedOutput = parseLLMOutput(error, 'summarized report');
      if (parsedOutput) {
        // Build report with whatever we could get from the LLM
        return {
          introduction: {
            projectType: projectInfo.type,
            projectPurpose: parsedOutput.projectPurpose || projectInfo.description,
            mainFunctionalities: parsedOutput.mainFunctionalities || ['Unable to identify main functionalities due to an error'],
            technologies: projectInfo.technologies,
            structureOverview: formattedStructure // Use the formatted structure here
          },
          issues: parsedOutput.issues || [],
          strengths: parsedOutput.strengths || [],
          miscellaneous: {
            projectSize: projectSize,
            dependencies: projectInfo.technologies.filter(t => t.type === "library" || t.type === "framework")
          },
          recommendations: parsedOutput.recommendations || [
            {
              description: "Review code for security vulnerabilities",
              priority: "HIGH",
              effort: "MEDIUM",
              category: "Security"
            }
          ]
        };
      }
      
      // Fallback to default structure
      return {
        introduction: {
          projectType: projectInfo.type,
          projectPurpose: projectInfo.description,
          mainFunctionalities: ['Unable to identify main functionalities due to an error'],
          technologies: projectInfo.technologies,
          structureOverview: formattedStructure // Use the formatted structure here
        },
        issues: [],
        strengths: [],
        miscellaneous: {
          projectSize: projectSize,
          dependencies: projectInfo.technologies.filter(t => t.type === "library" || t.type === "framework")
        },
        recommendations: [
          {
            description: "Review code for security vulnerabilities",
            priority: "HIGH",
            effort: "MEDIUM",
            category: "Security"
          }
        ]
      };
    }
  } catch (error) {
    console.error('Error in generateFinalReport:', error);
    return {
      introduction: {
        projectType: projectInfo.type,
        projectPurpose: projectInfo.description,
        mainFunctionalities: ['Unable to identify main functionalities due to an error'],
        technologies: projectInfo.technologies,
        structureOverview: formattedStructure // Use the formatted structure here even in case of error
      },
      issues: [],
      strengths: [],
      miscellaneous: {
        projectSize: projectSize,
        dependencies: projectInfo.technologies.filter(t => t.type === "library" || t.type === "framework")
      },
      recommendations: [
        {
          description: "Review code for security vulnerabilities",
          priority: "HIGH",
          effort: "MEDIUM",
          category: "Security"
        }
      ]
    };
  }
} 