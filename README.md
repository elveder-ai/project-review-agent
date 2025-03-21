🚀 Developed using Cursor and vibe coding 🚀

Special thanks to:
- [code2prompt](https://github.com/mufeedvh/code2prompt) - For code structure analysis
- [cloc](https://github.com/AlDanial/cloc) - For counting lines of code

# AI Code Review Agent

An AI-powered code review agent that analyzes your codebase using large language model (LLM) for in-depth analysis and recommendations.

## Features

- **Project Structure Analysis** - Uses code2prompt to generate detailed file structure of the project
- **Technology Detection** - Automatically identifies project type, languages, frameworks, and dependencies
- **Intelligent Key File Detection** - Identifies the most important files for in-depth review
- **Context-Aware Analysis** - Intelligently gathers related code when more context is needed
- **Comprehensive Code Review** - Analyzes code for:
  - Code quality issues
  - Architectural concerns
  - Security vulnerabilities
  - Performance implications
  - Best practices compliance
  - Commented code
- **Project Size Evaluation** - Uses cloc to count lines of code and categorize project size
- **Detailed, Actionable Reports** - Generates comprehensive reports with:
  - Project overview and structure
  - Prioritized issues with severity levels
  - Project strengths and positive practices
  - Specific, actionable recommendations
  - Dependency analysis
- Written in TypeScript for improved code quality and maintainability

## Prerequisites

Choose your preferred installation method below, each with its specific prerequisites.

## 🐳 Usage with Docker (Recommended)

### Prerequisites for Docker
- [Docker](https://www.docker.com/)

The easiest way to run the code review agent is with Docker, which includes all required dependencies:

1. Clone this repository

2. Copy `.env.example` to `.env` and add your Anthropic API key:

```bash
cp .env.example .env
```

Then edit the `.env` file to add your Anthropic API key.

3. Build the Docker image:

```bash
docker build \
   --pull \
   --rm \
   -f "Dockerfile" \
   -t project-review-agent:latest \
   .
```

4. Run the container, mounting your project directory and the desired directory for the output:

```bash
docker run \
   -v "<PATH_TO_YOUR_PROJECT_DIRECTORY>:/project" \
   -v "<PATH_TO_THE_DESIRED_DIRECTORY_FOR_THE_OUTPUT>:/app/output" \
   project-review-agent:latest
```


## 💻 Alternative: Local Installation

### Prerequisites for Local Installation
- [Node.js](https://nodejs.org/) (v22)
- [Code2Prompt](https://github.com/mufeedvh/code2prompt)
- [cloc](https://github.com/AlDanial/cloc) (Count Lines of Code)

If you prefer to run the tool without Docker:

1. Install all prerequisites listed above
2. Clone this repository
3. Install dependencies:

```bash
npm install
```

4. Copy `.env.example` to `.env` and add your Anthropic API key:

```bash
cp .env.example .env
```

Then edit the `.env` file to add your Anthropic API key.

5. Build the TypeScript project:

```bash
npm run build
```

6. Run the code review agent:

```bash
npm start -- [path-to-project]
```

**Note:** You must provide a path to the project directory to analyze.

For a quick test with the included test project:

```bash
npm run test
```

## Output

The reports will be generated in the `output` directory, in a timestamped subfolder containing:
- `project_review.md` - A comprehensive analysis with all findings

## How It Works

1. **Project Structure Analysis** - The agent first analyzes your project structure:
   - Uses code2prompt to generate a detailed file structure
   - Creates a comprehensive map of your codebase
   
2. **Technology Detection** - Based on the file structure:
   - Identifies project type (web application, mobile app, CLI tool, etc.)
   - Detects programming languages used
   - Determines frameworks and key dependencies
   
3. **Key File Detection** - The agent intelligently:
   - Identifies the most important files for review
   - Prioritizes files based on their purpose and potential impact
   - Creates a dependency map to understand relationships
   
4. **Code Review** - The agent then:
   - Uses Code2Prompt to prepare each file for analysis
   - Leverages the LLM for in-depth code review
   - Analyzes code quality, security, and architectural concerns
   - Examines related files when more context is needed
   
5. **Project Size Evaluation** - The agent:
   - Uses cloc to count lines of code
   - Categorizes the project size (small, medium, large)
   
6. **Report Generation** - Finally, it generates a comprehensive report with:
   - Project overview and technical details
   - Prioritized list of issues with severity ratings
   - Project strengths and positive practices
   - Specific, actionable recommendations
   - Dependency analysis and project statistics

## Report Structure

The generated report includes:

1. **Introduction** - Overview of the project type, purpose, and technologies
2. **Issues** - Detailed analysis of problems found with severity levels
3. **Strengths** - Positive aspects and well-implemented practices
4. **Miscellaneous** - Project size, dependencies, and other metrics
5. **Recommendations** - Actionable suggestions for improvement

## Environment Variables

The following environment variables can be set in your `.env` file:

- `ANTHROPIC_API_KEY` - Your Anthropic API key (**required**)
- LangSmith configuration (*optional*)
  - `LANGCHAIN_TRACING_V2`
  - `LANGCHAIN_ENDPOINT`
  - `LANGCHAIN_API_KEY`
  - `LANGCHAIN_PROJECT`

## License

MIT License. See [LICENSE](./LICENSE) file for details.