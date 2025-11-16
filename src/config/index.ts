// src/config/index.ts - Simplified for transcript processing
import dotenv from "dotenv";
dotenv.config();

export interface ProcessingConfig {
  concurrent: {
    processing: number;
  };
  timeouts: {
    processing: number;
  };
  retries: {
    maxAttempts: number;
    delay: number;
  };
  files: {
    maxSize: number;
    maxBatch: number;
  };
}

export interface APIConfig {
  openai: {
    apiKey: string;
    defaultModel: string;
    maxTokens: number;
  };
  anthropic: {
    apiKey: string;
    defaultModel: string;
    maxTokens: number;
  };
  gemini: {
    apiKey: string;
    defaultModel: string;
    maxTokens: number;
  };
}

export interface ServerConfig {
  port: number;
  uploadDir: string;
  outputDir: string;
}

export const config: ProcessingConfig = {
  concurrent: {
    processing: parseInt(process.env.CONCURRENT_PROCESSING || "10"),
  },
  timeouts: {
    processing: 120000, // 2 minutes
  },
  retries: {
    maxAttempts: 2,
    delay: 1000,
  },
  files: {
    maxSize: 10 * 1024 * 1024, // 10MB
    maxBatch: 100, // Max 100 transcript files
  },
};

export const apiConfig: APIConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    defaultModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
    maxTokens: 4000,
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    defaultModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
    maxTokens: 4000,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || "",
    defaultModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    maxTokens: 4000,
  },
};

export const serverConfig: ServerConfig = {
  port: parseInt(process.env.PORT || "3000"),
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  outputDir: process.env.OUTPUT_DIR || "output",
};

export function validateConfig(): void {
  const errors: string[] = [];

  if (!apiConfig.openai.apiKey) errors.push("OPENAI_API_KEY required");
  if (!apiConfig.anthropic.apiKey) errors.push("ANTHROPIC_API_KEY required");
  if (!apiConfig.gemini.apiKey) errors.push("GEMINI_API_KEY required");

  if (errors.length > 0) {
    console.error("❌ Configuration errors:", errors);
    process.exit(1);
  }

  console.log("✅ Configuration validated");
  console.log(`⚡ Processing settings:`);
  console.log(`   • Concurrent processing: ${config.concurrent.processing}`);
  console.log(`   • Max transcript files: ${config.files.maxBatch}`);
  console.log(`   • Max file size: ${config.files.maxSize / 1024 / 1024}MB`);
}
