// src/middleware/uploadMiddleware.ts
import multer from "multer";
import path from "path";
import fs from "fs";
import { serverConfig, config } from "../config";

// Ensure upload directory exists
if (!fs.existsSync(serverConfig.uploadDir)) {
  fs.mkdirSync(serverConfig.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, serverConfig.uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (
    file.mimetype === "text/plain" ||
    file.originalname.toLowerCase().endsWith(".txt")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only TXT files are allowed"));
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.files.maxSize, // 10MB per file
    files: config.files.maxBatch, // Up to 100 files
  },
});
