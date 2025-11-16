// src/controllers/TranscriptController.ts
import { Request, Response } from "express";
import { TranscriptProcessor } from "../services/TranscriptProcessor";
import { JobConfig } from "../types";
import archiver from "archiver";
import { serverConfig } from "../config";
import path from "path";
import fs from "fs";

export class TranscriptController {
  private processor: TranscriptProcessor;

  constructor() {
    this.processor = new TranscriptProcessor();
    this.initializeProcessor();
  }

  private async initializeProcessor(): Promise<void> {
    try {
      await this.processor.initialize();
      console.log("✅ TranscriptController initialized");
    } catch (error) {
      console.error("❌ Failed to initialize TranscriptController:", error);
    }
  }

  // Upload transcripts and start processing
  processTranscripts = async (req: Request, res: Response): Promise<void> => {
    try {
      const files = (req as Request & { files?: Express.Multer.File[] }).files;
      const { jobDescription, prompt, openaiModel, claudeModel, geminiModel } =
        req.body;

      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: "No files uploaded",
        });
        return;
      }

      const txtFiles = files.filter(
        (file) =>
          file.mimetype === "text/plain" ||
          file.originalname.toLowerCase().endsWith(".txt")
      );

      if (txtFiles.length === 0) {
        res.status(400).json({
          success: false,
          error: "No valid TXT files found",
        });
        return;
      }

      // Validate inputs
      if (!jobDescription || jobDescription.trim().length < 20) {
        res.status(400).json({
          success: false,
          error: "Job description must be at least 20 characters",
        });
        return;
      }

      if (!prompt || prompt.trim().length < 20) {
        res.status(400).json({
          success: false,
          error: "Prompt must be at least 20 characters",
        });
        return;
      }

      if (!openaiModel || !claudeModel || !geminiModel) {
        res.status(400).json({
          success: false,
          error:
            "All model names are required (openaiModel, claudeModel, geminiModel)",
        });
        return;
      }

      const jobConfig: JobConfig = {
        jobDescription: jobDescription.trim(),
        prompt: prompt.trim(),
        models: {
          openai: openaiModel.trim(),
          claude: claudeModel.trim(),
          gemini: geminiModel.trim(),
        },
      };

      console.log(`🚀 Starting transcript processing:`);
      console.log(`   • Files: ${txtFiles.length}`);
      console.log(`   • OpenAI Model: ${jobConfig.models.openai}`);
      console.log(`   • Claude Model: ${jobConfig.models.claude}`);
      console.log(`   • Gemini Model: ${jobConfig.models.gemini}`);

      // Create batch and start processing
      const batchId = await this.processor.createBatch(txtFiles, jobConfig);

      // Start processing in background
      this.processor.startProcessing(batchId).catch((error) => {
        console.error(`❌ Error processing batch ${batchId}:`, error);
      });

      res.status(200).json({
        success: true,
        data: {
          batchId,
          totalFiles: txtFiles.length,
          status: "processing",
          message: `Processing ${txtFiles.length} transcript file(s) with multiple AI models`,
        },
      });
    } catch (error) {
      console.error("Error processing transcripts:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  };

  // Get batch progress
  getBatchProgress = async (req: Request, res: Response): Promise<void> => {
    try {
      const { batchId } = req.params;
      const progress = this.processor.getBatchProgress(batchId);

      if (!progress) {
        res.status(404).json({
          success: false,
          error: "Batch not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (error) {
      console.error("Error getting batch progress:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  };

  // Download all results as ZIP
  downloadResults = async (req: Request, res: Response): Promise<void> => {
    try {
      const { batchId } = req.params;

      const results = this.processor.getMultiModelResults(batchId);
      if (!results) {
        res.status(404).json({
          success: false,
          error: "Batch not found or results not ready",
        });
        return;
      }

      const zipFilename = `transcript-results-${batchId}.zip`;

      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${zipFilename}"`
      );

      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.on("error", (err) => {
        console.error("Archive error:", err);
        res.status(500).json({
          success: false,
          error: "Error creating zip file",
        });
      });

      archive.pipe(res);

      // Add results from each model (analysis text only, no metadata)
      results.files.forEach((file) => {
        const baseFilename = path.basename(file.filename, ".txt");

        if (file.openai) {
          archive.append(file.openai.analysis, {
            name: `openai/${baseFilename}-openai.txt`,
          });
        }

        if (file.claude) {
          archive.append(file.claude.analysis, {
            name: `claude/${baseFilename}-claude.txt`,
          });
        }

        if (file.gemini) {
          archive.append(file.gemini.analysis, {
            name: `gemini/${baseFilename}-gemini.txt`,
          });
        }
      });

      archive.finalize();
      console.log(`📥 Generated results zip: ${zipFilename}`);
    } catch (error) {
      console.error("Error downloading results:", error);
      res.status(500).json({
        success: false,
        error: "Failed to download results",
      });
    }
  };

  // Get all batches
  getAllBatches = async (req: Request, res: Response): Promise<void> => {
    try {
      const batches = this.processor.getAllBatches();

      const batchSummaries = batches.map((batch) => ({
        id: batch.id,
        status: batch.status,
        totalFiles: batch.metrics.total,
        completed: batch.metrics.completed,
        failed: batch.metrics.failed,
        openaiComplete: batch.metrics.openaiComplete,
        claudeComplete: batch.metrics.claudeComplete,
        geminiComplete: batch.metrics.geminiComplete,
        createdAt: batch.createdAt,
        startedAt: batch.startedAt,
        completedAt: batch.completedAt,
      }));

      res.status(200).json({
        success: true,
        data: {
          batches: batchSummaries,
          total: batches.length,
        },
      });
    } catch (error) {
      console.error("Error getting all batches:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  };

  // Cancel batch
  cancelBatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { batchId } = req.params;
      const success = this.processor.cancelBatch(batchId);

      if (!success) {
        res.status(400).json({
          success: false,
          error: "Cannot cancel batch (not found or already completed)",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { batchId, status: "cancelled" },
      });
    } catch (error) {
      console.error("Error cancelling batch:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  };

  // Delete batch
  deleteBatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { batchId } = req.params;
      const success = this.processor.deleteBatch(batchId);

      if (!success) {
        res.status(400).json({
          success: false,
          error: "Cannot delete batch (not found or still processing)",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { batchId, message: "Batch deleted successfully" },
      });
    } catch (error) {
      console.error("Error deleting batch:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  };

  // System health
  getSystemHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const batches = this.processor.getAllBatches();
      const memUsage = process.memoryUsage();

      const stats = {
        system: {
          memoryUsage: {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          },
          uptime: Math.round(process.uptime()),
          status: "healthy",
        },
        batches: {
          total: batches.length,
          processing: batches.filter((b) => b.status === "processing").length,
          completed: batches.filter((b) => b.status === "completed").length,
          failed: batches.filter((b) => b.status === "failed").length,
        },
        processing: {
          totalFilesProcessed: batches.reduce(
            (sum, b) => sum + b.metrics.completed,
            0
          ),
          totalFilesFailed: batches.reduce(
            (sum, b) => sum + b.metrics.failed,
            0
          ),
        },
      };

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error getting system health:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  };
}
