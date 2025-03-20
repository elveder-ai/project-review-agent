export interface FileInfo {
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileInfo[];
}

export interface ProjectStructure {
  root: FileInfo;
}

export interface ProjectTechnology {
  name: string;
  version?: string;
  type: 'language' | 'framework' | 'library' | 'tool';
}

export interface ProjectInfo {
  type: string;
  technologies: ProjectTechnology[];
  frameworks: ProjectTechnology[];
  description: string;
}

export interface KeyFile {
  path: string;
  importance: number;
  reason: string;
}

export interface CodeReviewResult {
  path: string;
  codeQuality: string;
  issues: ReviewIssue[];
  strengths: ReviewStrength[];
  recommendations: string[];
}

export interface ReviewIssue {
  description: string;
  codeSnippet?: string;
  lineNumbers?: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  impact: string;
}

export interface ReviewStrength {
  description: string;
  codeSnippet?: string;
  lineNumbers?: string;
}

export interface ProjectSize {
  total: number;
  byLanguage: Record<string, number>;
  category: 'SMALL' | 'MEDIUM' | 'LARGE';
}

export interface FinalReport {
  introduction: {
    projectType: string;
    projectPurpose: string;
    mainFunctionalities: string[];
    technologies: ProjectTechnology[];
    structureOverview: string;
  };
  issues: ReviewIssue[];
  strengths: ReviewStrength[];
  miscellaneous: {
    projectSize: ProjectSize;
    dependencies: ProjectTechnology[];
  };
  recommendations: {
    description: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    effort: 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
  }[];
} 