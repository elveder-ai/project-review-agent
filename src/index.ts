#!/usr/bin/env node

import ProjectReviewAgent from './agent';

async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (!args[0]) {
      console.error('Error: No project directory provided');
      process.exit(1);
    }
    
    const projectPath = args[0];
    
    console.log(`Starting project review for: ${projectPath}`);
    
    const agent = new ProjectReviewAgent(projectPath);
    const reportPath = await agent.run();
    
    console.log(`Review completed successfully! Report available at: ${reportPath}`);
  } catch (error) {
    console.error('Error running project review:', error);
    process.exit(1);
  }
}

main(); 