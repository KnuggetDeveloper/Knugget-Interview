// src/services/TranscriptProcessor.ts
import { OpenAI } from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { apiConfig, config } from "../config";
import {
  TranscriptFile,
  BatchJob,
  JobConfig,
  TranscriptAnalysis,
  BatchProgress,
  MultiModelResults,
} from "../types";
import { v4 as uuidv4 } from "uuid";
import pLimit from "p-limit";
import fs from "fs";
import path from "path";

export class TranscriptProcessor {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private gemini: GoogleGenerativeAI;
  private jobs: Map<string, BatchJob> = new Map();
  private limit: any;

  constructor() {
    this.openai = new OpenAI({ apiKey: apiConfig.openai.apiKey });
    this.anthropic = new Anthropic({ apiKey: apiConfig.anthropic.apiKey });
    this.gemini = new GoogleGenerativeAI(apiConfig.gemini.apiKey);
    this.limit = pLimit(config.concurrent.processing);
  }

  async initialize(): Promise<void> {
    console.log("✅ TranscriptProcessor initialized");
    console.log(`   • OpenAI: ${apiConfig.openai.defaultModel}`);
    console.log(`   • Claude: ${apiConfig.anthropic.defaultModel}`);
    console.log(`   • Gemini: ${apiConfig.gemini.defaultModel}`);
  }

  // Create a new processing batch
  async createBatch(
    files: Express.Multer.File[],
    jobConfig: JobConfig
  ): Promise<string> {
    const batchId = uuidv4();

    // Read transcript content from files
    const transcriptFiles: TranscriptFile[] = await Promise.all(
      files.map(async (file) => {
        const content = await fs.promises.readFile(file.path, "utf-8");
        return {
          id: uuidv4(),
          originalFile: file,
          content,
          status: "pending" as const,
          progress: { startTime: new Date() },
          results: {},
          retryCount: 0,
        };
      })
    );

    const batch: BatchJob = {
      id: batchId,
      status: "created",
      files: transcriptFiles,
      jobConfig,
      metrics: {
        total: transcriptFiles.length,
        pending: transcriptFiles.length,
        processing: 0,
        completed: 0,
        failed: 0,
        openaiComplete: 0,
        claudeComplete: 0,
        geminiComplete: 0,
        timing: {
          elapsedMs: 0,
        },
      },
      createdAt: new Date(),
    };

    this.jobs.set(batchId, batch);

    console.log(
      `📦 Created batch ${batchId} with ${transcriptFiles.length} transcript files`
    );

    return batchId;
  }

  // Start processing with all three models
  async startProcessing(batchId: string): Promise<void> {
    const batch = this.jobs.get(batchId);
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }

    if (!batch.jobConfig) {
      throw new Error("Job configuration not set");
    }

    batch.status = "processing";
    batch.startedAt = new Date();

    console.log(`🚀 Starting multi-model processing for batch ${batchId}`);
    console.log(`📋 Processing strategy: Sequential `);

    try {
      // Process files SEQUENTIALLY (one at a time) to avoid hitting Gemini quota
      // Each file will be processed by all 3 models before moving to the next file
      for (let i = 0; i < batch.files.length; i++) {
        const file = batch.files[i];
        await this.processTranscript(batchId, file);

        // Add a small delay between files to help with API rate limits
        if (i < batch.files.length - 1) {
          console.log(`⏳ Waiting 2 seconds before next file...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      batch.status = "completed";
      batch.completedAt = new Date();
      console.log(`✅ Batch ${batchId} completed successfully`);
    } catch (error) {
      batch.status = "failed";
      console.error(`❌ Batch ${batchId} failed:`, error);
      throw error;
    }
  }

  private async processTranscript(
    batchId: string,
    file: TranscriptFile
  ): Promise<void> {
    const batch = this.jobs.get(batchId);
    if (!batch || !batch.jobConfig) return;

    file.status = "processing";
    batch.metrics.processing++;
    batch.metrics.pending--;

    const { jobDescription, prompt, models } = batch.jobConfig;

    console.log(`📝 Processing: ${file.originalFile.originalname}`);

    // Process with all three models in parallel, handling each independently
    const results = await Promise.allSettled([
      this.processWithOpenAI(
        file.content!,
        jobDescription,
        prompt,
        models.openai,
        file.originalFile.originalname
      ),
      this.processWithClaude(
        file.content!,
        jobDescription,
        prompt,
        models.claude,
        file.originalFile.originalname
      ),
      this.processWithGemini(
        file.content!,
        jobDescription,
        prompt,
        models.gemini,
        file.originalFile.originalname
      ),
    ]);

    // Handle OpenAI result
    if (results[0].status === "fulfilled") {
      file.results.openai = results[0].value;
      batch.metrics.openaiComplete++;
      console.log(
        `  ✅ OpenAI completed for ${file.originalFile.originalname}`
      );
    } else {
      console.error(
        `  ❌ OpenAI failed for ${file.originalFile.originalname}:`,
        results[0].reason
      );
    }

    // Handle Claude result
    if (results[1].status === "fulfilled") {
      file.results.claude = results[1].value;
      batch.metrics.claudeComplete++;
      console.log(
        `  ✅ Claude completed for ${file.originalFile.originalname}`
      );
    } else {
      console.error(
        `  ❌ Claude failed for ${file.originalFile.originalname}:`,
        results[1].reason
      );
    }

    // Handle Gemini result
    if (results[2].status === "fulfilled") {
      file.results.gemini = results[2].value;
      batch.metrics.geminiComplete++;
      console.log(
        `  ✅ Gemini completed for ${file.originalFile.originalname}`
      );
    } else {
      console.error(
        `  ❌ Gemini failed for ${file.originalFile.originalname}:`,
        results[2].reason
      );
    }

    // Determine overall status
    const successCount = [results[0], results[1], results[2]].filter(
      (r) => r.status === "fulfilled"
    ).length;

    if (successCount > 0) {
      file.status = "completed";
      batch.metrics.completed++;
      console.log(
        `✅ Completed ${file.originalFile.originalname} (${successCount}/3 models succeeded)`
      );
    } else {
      file.status = "failed";
      file.error = "All models failed to process the transcript";
      batch.metrics.failed++;
      console.log(
        `❌ Failed ${file.originalFile.originalname} (all models failed)`
      );
    }

    file.progress.processingEnd = new Date();
    file.progress.totalDuration =
      file.progress.processingEnd.getTime() - file.progress.startTime.getTime();
    batch.metrics.processing--;
  }

  private async processWithOpenAI(
    content: string,
    jobDescription: string,
    prompt: string,
    model: string,
    filename: string
  ): Promise<TranscriptAnalysis> {
    const startTime = Date.now();

    // Only use the prompt, not the job description
    const systemPrompt = prompt;

    // Use max_completion_tokens for newer models (GPT-4o and later)
    // Use max_tokens for older models
    const isNewerModel =
      model.includes("gpt-4o") ||
      model.includes("gpt-5") ||
      model.includes("o1") ||
      model.includes("o3");

    const completionParams: any = {
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analyze this transcript:\n\n${content}` },
      ],
    };

    // Add the appropriate token limit parameter based on model
    if (isNewerModel) {
      completionParams.max_completion_tokens = apiConfig.openai.maxTokens;
    } else {
      completionParams.max_tokens = apiConfig.openai.maxTokens;
    }

    const completion = await this.openai.chat.completions.create(
      completionParams
    );

    const analysis =
      completion.choices[0]?.message?.content || "No analysis generated";
    const processingTime = Date.now() - startTime;

    return {
      model: model,
      filename: filename,
      analysis: analysis,
      metadata: {
        tokens: completion.usage?.total_tokens,
        processingTime: processingTime,
      },
      timestamp: new Date(),
    };
  }

  private async processWithClaude(
    content: string,
    jobDescription: string,
    prompt: string,
    model: string,
    filename: string
  ): Promise<TranscriptAnalysis> {
    const startTime = Date.now();

    // Only use the prompt, not the job description
    const systemPrompt = prompt;

    const message = await this.anthropic.messages.create({
      model: model,
      max_tokens: apiConfig.anthropic.maxTokens,
      messages: [
        {
          role: "user",
          content: `${systemPrompt}\n\nAnalyze this transcript:\n\n${content}`,
        },
      ],
    });

    const analysis =
      message.content[0]?.type === "text"
        ? message.content[0].text
        : "No analysis generated";
    const processingTime = Date.now() - startTime;

    return {
      model: model,
      filename: filename,
      analysis: analysis,
      metadata: {
        tokens: message.usage?.input_tokens
          ? message.usage.input_tokens + (message.usage?.output_tokens || 0)
          : undefined,
        processingTime: processingTime,
      },
      timestamp: new Date(),
    };
  }

  private async processWithGemini(
    content: string,
    jobDescription: string,
    prompt: string,
    model: string,
    filename: string
  ): Promise<TranscriptAnalysis> {
    const startTime = Date.now();

    // Only use the prompt, not the job description
    const systemPrompt = prompt;

    const genModel = this.gemini.getGenerativeModel({ model: model });

    const result = await genModel.generateContent([
      systemPrompt,
      `\n\nAnalyze this transcript:\n\n${content}`,
    ]);

    const response = await result.response;
    const analysis = response.text();
    const processingTime = Date.now() - startTime;

    return {
      model: model,
      filename: filename,
      analysis: analysis,
      metadata: {
        processingTime: processingTime,
      },
      timestamp: new Date(),
    };
  }

  // Get batch progress
  getBatchProgress(batchId: string): BatchProgress | null {
    const batch = this.jobs.get(batchId);
    if (!batch) return null;

    return {
      batchId: batch.id,
      status: batch.status,
      metrics: batch.metrics,
      currentFiles: {
        processing: batch.files
          .filter((f) => f.status === "processing")
          .map((f) => f.originalFile.originalname),
      },
    };
  }

  // Get multi-model results for download
  getMultiModelResults(batchId: string): MultiModelResults | null {
    const batch = this.jobs.get(batchId);
    if (!batch) return null;

    return {
      batchId: batch.id,
      files: batch.files.map((file) => ({
        filename: file.originalFile.originalname,
        openai: file.results.openai,
        claude: file.results.claude,
        gemini: file.results.gemini,
      })),
    };
  }

  // Get all batches
  getAllBatches(): BatchJob[] {
    return Array.from(this.jobs.values());
  }

  // Cancel batch
  cancelBatch(batchId: string): boolean {
    const batch = this.jobs.get(batchId);
    if (
      !batch ||
      batch.status === "completed" ||
      batch.status === "cancelled"
    ) {
      return false;
    }
    batch.status = "cancelled";
    return true;
  }

  // Delete batch
  deleteBatch(batchId: string): boolean {
    const batch = this.jobs.get(batchId);
    if (!batch || batch.status === "processing") {
      return false;
    }
    this.jobs.delete(batchId);
    return true;
  }
}
