import { execSync } from 'child_process';
import path from 'path';
import {
  copyFile,
  createDirectoryIfNotExists,
  currentRunTimestamp,
  getCode2promptCachePath,
  readTextFile,
  removeDirectory,
  writeTextFile
} from './fileUtils';

/**
 * Generate a code prompt using code2prompt CLI
 * @param directory Directory to generate prompt for
 * @param options Options for code2prompt
 * @returns The generated prompt as a string
 */
export async function generateCodePrompt(
  directory: string,
  options: {
    include?: string[];
    exclude?: string[];
    template?: string;
    outputFile?: string;
    lineNumbers?: boolean;
    hidden?: boolean;
    noIgnore?: boolean;
    diff?: boolean;
  } = {}
): Promise<string> {
  try {
    // Create a temporary directory for code2prompt output if needed
    const outputDir = `./cache/${currentRunTimestamp}/code2prompt`;
    await createDirectoryIfNotExists(outputDir);
    
    // Set default output file if not specified
    const outputFile = options.outputFile || getCode2promptCachePath('code_prompt.md');
    
    // Build command options
    const cmdOptions = [];
    
    if (options.include && options.include.length > 0) {
      cmdOptions.push(`--include="${options.include.join(',')}"`);
    }
    
    if (options.exclude && options.exclude.length > 0) {
      cmdOptions.push(`--exclude="${options.exclude.join(',')}"`);
    }
    
    if (options.template) {
      cmdOptions.push(`--template=${options.template}`);
    }
    
    if (options.lineNumbers) {
      cmdOptions.push('--line-number');
    }
    
    if (options.hidden) {
      cmdOptions.push('--hidden');
    }
    
    if (options.noIgnore) {
      cmdOptions.push('--no-ignore');
    }
    
    if (options.diff) {
      cmdOptions.push('--diff');
    }
    
    cmdOptions.push(`--output=${outputFile}`);
    cmdOptions.push('--tokens');
    
    // Run code2prompt command
    const cmd = `code2prompt ${directory} ${cmdOptions.join(' ')}`;
    console.log(`Executing command: ${cmd}`);
    
    execSync(cmd, { 
      stdio: 'inherit',
      encoding: 'utf-8'
    });
    
    // Read generated prompt from file
    return readTextFile(outputFile);
  } catch (error) {
    console.error('Error generating code prompt:', error);
    throw error;
  }
}

/**
 * Generate a prompt for a specific file using code2prompt
 * @param filePath Path to the file
 * @param options Options for code2prompt
 * @returns The generated prompt as a string
 */
export async function generateFilePrompt(
  filePath: string,
  options: {
    template?: string;
    lineNumbers?: boolean;
  } = {}
): Promise<string> {
  // Create a temporary directory
  const tempDir = path.join(`./cache/${currentRunTimestamp}/code2prompt`, 'temp_' + Date.now().toString());
  await createDirectoryIfNotExists(tempDir);
  
  // Copy the file to the temporary directory
  const fileName = path.basename(filePath);
  const tempFilePath = path.join(tempDir, fileName);
  copyFile(filePath, tempFilePath);
  
  try {
    // Generate prompt for the single file
    const prompt = await generateCodePrompt(tempDir, {
      ...options,
      outputFile: getCode2promptCachePath(`file_${fileName}_prompt.md`)
    });
    
    return prompt;
  } finally {
    // Clean up temporary directory
    removeDirectory(tempDir);
  }
}

/**
 * Get file content without using code2prompt (fallback)
 * @param filePath Path to the file
 * @returns The file content as a string
 */
export function getFileContent(filePath: string): string {
  return readTextFile(filePath);
}

/**
 * Execute code2prompt with JSON output and return the parsed result
 * @param directory Directory to analyze
 * @param outputFile Optional output file path
 * @param excludePatterns Optional patterns to exclude
 * @returns The parsed JSON output from code2prompt
 */
export async function executeCode2promptJson(
  directory: string,
  outputFile?: string,
  excludePatterns: string = ""
): Promise<any> {
  // Create a temporary directory for code2prompt output if needed
  const outputDir = `./cache/${currentRunTimestamp}/code2prompt`;
  await createDirectoryIfNotExists(outputDir);
  
  // Set default output file if not specified
  const jsonOutputFile = outputFile || getCode2promptCachePath('code2prompt_output.json');
  
  try {
    // Run code2prompt with JSON output format and capture the output directly
    const cmd = `code2prompt ${directory} --json --exclude="${excludePatterns}"`;
    console.log(`Executing command: ${cmd}`);
    
    const jsonOutput = execSync(cmd, { 
      encoding: 'utf-8'
    });
    
    // Save the output to the file
    await writeTextFile(jsonOutputFile, jsonOutput);
    
    // Parse and return the JSON content
    try {
      return JSON.parse(jsonOutput);
    } catch (parseError) {
      console.error('Error parsing JSON output:', parseError);
      throw new Error('code2prompt did not generate valid JSON output');
    }
  } catch (error) {
    console.error('Error executing code2prompt:', error);
    throw error;
  }
} 