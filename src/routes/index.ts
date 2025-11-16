// src/routes/index.ts - Transcript processing routes
import express from "express";
import { TranscriptController } from "../controllers/TranscriptController";
import { uploadMiddleware } from "../middleware/uploadMiddleware";
import { param, body, validationResult } from "express-validator";

const router = express.Router();
const transcriptController = new TranscriptController();

// Validation middleware
const handleValidationErrors = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("❌ Validation failed:");
    console.log(`   • Request body:`, req.body);
    console.log(`   • Validation errors:`, errors.array());
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: errors.array(),
    });
  }
  return next();
};

// Validation rules
const validateBatchId = [
  param("batchId").isUUID().withMessage("Invalid batch ID format"),
  handleValidationErrors,
];

// Upload and process transcripts with multi-model analysis
router.post(
  "/process",
  uploadMiddleware.array("transcripts", 100),
  transcriptController.processTranscripts
);

// Get batch progress
router.get(
  "/batch/:batchId/progress",
  validateBatchId,
  transcriptController.getBatchProgress
);

// Download results
router.get(
  "/batch/:batchId/download",
  validateBatchId,
  transcriptController.downloadResults
);

// Cancel batch
router.post(
  "/batch/:batchId/cancel",
  validateBatchId,
  transcriptController.cancelBatch
);

// Delete batch
router.delete(
  "/batch/:batchId",
  validateBatchId,
  transcriptController.deleteBatch
);

// Get all batches
router.get("/batches", transcriptController.getAllBatches);

// System health
router.get("/health", transcriptController.getSystemHealth);

export default router;
