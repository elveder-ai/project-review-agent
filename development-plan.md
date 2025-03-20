# AI Code Review Agent Implementation Plan

This document outlines the step-by-step process to implement an AI agent for code review and analysis of an entire project. The agent uses code2prompt for preparing code snippets, Node.js for implementation, and Langchain for interacting with a large language model (LLM).

## Step-by-Step Plan

### 1. Use code2prompt to get the project's file structure

- Run code2prompt on the project directory to generate a detailed file structure
- This structure will be used as a basis for further analysis
- **Output**: Complete file structure (keep in memory and print in console)
- **Format**: JSON structure with file paths and basic metadata

### 2. Use LLM to identify the project's type and technologies

- Provide the generated project structure to the LLM and use it to select:
  - Key files that can be used to identify the project type and the technologies/frameworks being used
  - Common configuration files (package.json, requirements.txt, etc.)
  - Entry point files
- Provide the generated project structure and the content of the selected files to the LLM to identify:
  - What technologies are used in the project
  - What frameworks are used, if any
  - What is the project's type
  - Version information for key dependencies
- **Output**: A summary document describing the project type, technologies, and frameworks used (keep in `cache/` directory)
- **Format**: JSON document with structured sections for technologies, frameworks, and project type

### 3. Identify key files for review

- Use the LLM to analyze the project structure and identify key files for review:
  - Provide an overview of the project's file structure and dependency graph to the LLM
  - Request the LLM to identify the most important files to review based on their purpose and potential impact
  - Consider file types and their typical importance (e.g., entry points, core business logic, configuration files)
- **Output**: A prioritized list of key files for in-depth review (keep in memory)
- **Format**: JSON array with file paths and importance scores

### 4. Review the files

- Use code2prompt to generate prompts for each identified key file
- Send these prompts to the LLM for a general code review, focusing on:
  - Code quality
  - Commented code
  - Architectural concerns
  - Potential issues
  - Best practices compliance
  - Security considerations
  - Performance implications
- Implement a loop that allows the LLM to select additional files for review based on its findings:
  - After reviewing each file, ask the LLM if additional related files should be examined
  - If yes, process those files with the approach described above
  - Continue until the LLM determines it has sufficient understanding or no more related files need examination
- Limit the total number of files reviewed to prevent excessive processing (e.g., maximum of 50 files)
- **Output**: Review results for each file (keep in `cache/` directory)
- **Format**: Markdown with clear section headers and code blocks

### 5. Use cloc to evaluate the project's size

- Run the `cloc` tool on the project directory to count lines of code
- Parse the JSON output to get the total lines of code
- Categorize the project size:
  - Less than 1,000 lines: "SMALL"
  - 1,000 to 10,000 lines: "MEDIUM"
  - More than 10,000 lines: "LARGE"
- **Output**: Project size statistics and classification (keep in `cache/` directory)
- **Format**: JSON document with detailed statistics

### 6. Aggregate and summarize the results

- Compile all the data from previous steps into a comprehensive report
- Use the generated reviews from the `cache/` directory:
  - A summary document describing the project type, technologies, and frameworks used
  - Review results for each file
  - Project size statistics and classification
- Generate a single text file (e.g., `project_review.md`) with the following structure:

  - **Introduction**:
    - Project type
    - Project purpose
    - Main functionalities
    - Technologies and frameworks used
    - Project structure overview

  - **Issues**:
    - A list of all issues found during the LLM analysis
    - For each finding, include:
      - Brief description of the issue
      - Reference to the code snippet
      - The LLM's analysis, including any additional insights from the investigation
      - Severity level (HIGH, MEDIUM, LOW)
      - Potential impact

  - **Strengths**:
    - A list of positives found during the review:
      - Best practices followed
      - Interesting approaches
      - Problems that were solved effectively
    - Code quality metrics
    - Notable architectural decisions

  - **Miscellaneous**:
    - **Project Size**: State the total lines of code and the size category (e.g., "Project size: 5,000 lines (MEDIUM)")
    - **Dependencies**: Key external dependencies and their versions

  - **Recommendations**:
    - A list of specific, actionable recommendations for improving the project's code quality
    - Prioritized by importance and potential impact
    - Include estimated effort for implementation
    - Group by category (architecture, security, performance, etc.)

- **Output**: Final `project_review.md` document containing the complete analysis (store in `output\` directory)
- **Format**: Markdown with clear section headers and code blocks