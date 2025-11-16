// src/index.ts
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import compression from "compression";
import helmet from "helmet";
import { validateConfig, serverConfig } from "./config";
import routes from "./routes";

// Validate configuration
validateConfig();

const app = express();

// Security and performance middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable for development
  })
);
app.use(compression());

// CORS configuration
app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsing with increased limits
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Create required directories
const requiredDirs = [
  serverConfig.uploadDir,
  serverConfig.outputDir,
];

requiredDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// Log storage configuration
console.log(`💾 Storage config: ${serverConfig.outputDir}`);

// Serve static files (the UI)
app.use(express.static("public"));

// API routes
app.use("/api", routes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    uptime: process.uptime(),
    memoryUsage: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
  });
});

// Fallback to serve the main UI for any non-API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Server error:", err);

    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "File too large. Maximum 10MB per file",
        timestamp: new Date().toISOString(),
      });
    }

    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        error: "Too many files. Maximum 100 files per batch",
        timestamp: new Date().toISOString(),
      });
    }

    if (err.message === "Only TXT files are allowed") {
      return res.status(400).json({
        success: false,
        error: "Only TXT files are allowed",
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
);

// Graceful shutdown handling
const gracefulShutdown = () => {
  console.log("\n📴 Received shutdown signal, cleaning up...");

  try {
    // Clean up temporary files
    if (fs.existsSync(serverConfig.uploadDir)) {
      const files = fs.readdirSync(serverConfig.uploadDir);
      files.forEach((file) => {
        try {
          const filePath = path.join(serverConfig.uploadDir, file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        } catch (error) {
          console.warn(`⚠️ Could not cleanup ${file}:`, error);
        }
      });
      console.log("🧹 Cleaned up temporary files");
    }
  } catch (error) {
    console.warn("⚠️ Error during cleanup:", error);
  }

  process.exit(0);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Start server
const server = app.listen(serverConfig.port, () => {
  console.log("\n🚀 TRANSCRIPT PROCESSOR v1.0.0");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📡 Server running on: http://localhost:${serverConfig.port}`);
  console.log(`📊 Dashboard: http://localhost:${serverConfig.port}`);
  console.log(`🔧 API endpoints: http://localhost:${serverConfig.port}/api`);
  console.log(`💾 Output directory: ${path.resolve(serverConfig.outputDir)}`);
  console.log(`📤 Upload directory: ${path.resolve(serverConfig.uploadDir)}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📋 WORKFLOW:");
  console.log("   1. Upload Transcript Files (.txt)");
  console.log("   2. Provide Job Description & Analysis Prompt");
  console.log("   3. Specify AI Model Names (OpenAI, Claude, Gemini)");
  console.log("   4. Start Multi-Model Processing");
  console.log("   5. Download Results as ZIP");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🤖 AI MODELS:");
  console.log("   • OpenAI GPT (configurable model)");
  console.log("   • Anthropic Claude (configurable model)");
  console.log("   • Google Gemini (configurable model)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
});

// Handle server errors
server.on("error", (error: any) => {
  if (error.code === "EADDRINUSE") {
    console.error(`❌ Port ${serverConfig.port} is already in use`);
    console.error("   Try: lsof -ti:3000 | xargs kill -9");
    process.exit(1);
  } else {
    console.error("❌ Server error:", error);
    process.exit(1);
  }
});

export default app;
