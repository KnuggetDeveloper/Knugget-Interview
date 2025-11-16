// src/types/index.ts - Transcript processing types
export interface TranscriptFile {
  id: string;
  originalFile: Express.Multer.File;
  content?: string; // Transcript text content
  status: "pending" | "processing" | "completed" | "failed";
  progress: {
    startTime: Date;
    processingEnd?: Date;
    totalDuration?: number;
  };
  results: {
    openai?: TranscriptAnalysis;
    claude?: TranscriptAnalysis;
    gemini?: TranscriptAnalysis;
  };
  error?: string;
  retryCount: number;
}

export interface BatchJob {
  id: string;
  status: "created" | "processing" | "completed" | "failed" | "cancelled";
  files: TranscriptFile[];
  jobConfig?: JobConfig;
  metrics: BatchMetrics;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface JobConfig {
  jobDescription: string;
  prompt: string;
  models: {
    openai: string;
    claude: string;
    gemini: string;
  };
}

export interface BatchMetrics {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  openaiComplete: number;
  claudeComplete: number;
  geminiComplete: number;
  timing: {
    elapsedMs: number;
    estimatedCompletionMs?: number;
  };
}

export interface TranscriptAnalysis {
  model: string;
  filename: string;
  analysis: string;
  metadata?: {
    tokens?: number;
    processingTime?: number;
  };
  timestamp: Date;
}

export interface BatchProgress {
  batchId: string;
  status: BatchJob["status"];
  metrics: BatchMetrics;
  currentFiles: {
    processing: string[];
  };
}

export interface MultiModelResults {
  batchId: string;
  files: {
    filename: string;
    openai?: TranscriptAnalysis;
    claude?: TranscriptAnalysis;
    gemini?: TranscriptAnalysis;
  }[];
}
