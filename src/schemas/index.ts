import { z } from "zod";

/**
 * Technology schema for libraries, frameworks, languages and tools
 */
export const technologySchema = z.object({
  name: z.string().describe("The name of the technology"),
  version: z.string().optional().describe("The version of the technology if available"),
  type: z.enum(["language", "framework", "library", "tool"]).describe("The type of technology")
});

/**
 * Project info schema for project type identification
 */
export const projectInfoSchema = z.object({
  type: z.string().describe("The project type (e.g. 'Web Application', 'CLI Tool', 'API Service')"),
  technologies: z.array(technologySchema).describe("List of technologies used in the project"),
  frameworks: z.array(technologySchema.extend({
    type: z.literal("framework")
  })).describe("List of frameworks used in the project"),
  description: z.string().describe("A brief description of what the project does")
});

/**
 * Key file schema for identifying important files
 */
export const keyFileSchema = z.object({
  path: z.string().describe("Path to the file relative to the project root"),
  importance: z.number().min(1).max(10).describe("Importance score from 1-10 where 10 is highest"),
  reason: z.string().describe("Reason why this file is important to review")
});

/**
 * Schema for code review issues
 */
export const issueSchema = z.object({
  description: z.string().describe("Description of the issue"),
  codeSnippet: z.string().optional().describe("Relevant code snippet if applicable"),
  lineNumbers: z.string().optional().describe("Line numbers if applicable"),
  severity: z.enum(["HIGH", "MEDIUM", "LOW"]).describe("Severity of the issue"),
  impact: z.string().describe("Description of the potential impact")
});

/**
 * Schema for code review strengths
 */
export const strengthSchema = z.object({
  description: z.string().describe("Description of a strength or good practice"),
  codeSnippet: z.string().optional().describe("Relevant code snippet if applicable"),
  lineNumbers: z.string().optional().describe("Line numbers if applicable")
});

/**
 * Schema for code review
 */
export const codeReviewSchema = z.object({
  path: z.string().describe("Path to the file that was reviewed"),
  codeQuality: z.string().describe("Brief assessment of the overall code quality"),
  issues: z.array(issueSchema).describe("List of issues identified in the code"),
  strengths: z.array(strengthSchema).describe("List of strengths identified in the code"),
  recommendations: z.array(z.string()).describe("Specific recommendations for improvement")
});

/**
 * Schema for related files suggestions
 */
export const relatedFilesSchema = z.object({
  files: z.array(z.string()).describe("List of related files that should be reviewed next")
});

/**
 * Schema for recommendation in the final report
 */
export const recommendationSchema = z.object({
  description: z.string().describe("Description of the recommendation"),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).describe("Priority level"),
  effort: z.enum(["HIGH", "MEDIUM", "LOW"]).describe("Estimated effort required"),
  category: z.string().describe("Category of the recommendation")
});

/**
 * Schema for final report summary
 */
export const finalReportSummarySchema = z.object({
  projectPurpose: z.string().describe("What the project is designed to do"),
  mainFunctionalities: z.array(z.string()).describe("Main functionalities of the project"),
  issues: z.array(issueSchema).describe("Major issues identified across the codebase"),
  strengths: z.array(strengthSchema).describe("Major strengths identified across the codebase"),
  recommendations: z.array(recommendationSchema).describe("Recommendations for improvement")
}); 