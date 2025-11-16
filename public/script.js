class TranscriptProcessor {
  constructor() {
    this.apiBaseUrl = this.detectApiBaseUrl();
    this.currentBatchId = null;
    this.files = [];
    this.progressInterval = null;

    this.initializeDarkMode();
    this.initializeEventListeners();
    this.addLog("System initialized - ready for transcript processing", "info");
    this.checkServerConnection();
  }

  initializeDarkMode() {
    // Check for saved theme preference or default to 'light'
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    this.addLog(`🎨 Switched to ${newTheme} mode`, "info");
  }

  detectApiBaseUrl() {
    const currentOrigin = window.location.origin;
    if (
      currentOrigin.includes("127.0.0.1:5500") ||
      currentOrigin.includes("file://") ||
      currentOrigin.includes("localhost:5500")
    ) {
      return "http://localhost:3000";
    } else {
      return currentOrigin;
    }
  }

  async checkServerConnection() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/health`);
      if (response.ok) {
        this.addLog("✅ Connected to server successfully", "success");
        this.addLog("🤖 AI Models: OpenAI + Claude + Gemini", "info");
      } else {
        throw new Error(`Server responded with status ${response.status}`);
      }
    } catch (error) {
      this.addLog(`❌ Cannot connect to server at ${this.apiBaseUrl}`, "error");
      this.addLog(
        "Please ensure the Node.js server is running on port 3000",
        "warning"
      );
    }
  }

  initializeEventListeners() {
    // Dark mode toggle
    const themeToggle = document.getElementById("themeToggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", this.toggleDarkMode.bind(this));
    }

    // File upload
    const fileUploadArea = document.getElementById("fileUploadArea");
    const fileInput = document.getElementById("fileInput");

    if (fileUploadArea && fileInput) {
      fileUploadArea.addEventListener("click", () => fileInput.click());
      fileUploadArea.addEventListener("dragover", this.handleDragOver.bind(this));
      fileUploadArea.addEventListener("dragleave", this.handleDragLeave.bind(this));
      fileUploadArea.addEventListener("drop", this.handleDrop.bind(this));
      fileInput.addEventListener("change", this.handleFileSelect.bind(this));
    }

    // Start processing button
    const startBtn = document.getElementById("startProcessing");
    if (startBtn) {
      startBtn.addEventListener("click", this.startProcessing.bind(this));
    }

    // Download button
    const downloadBtn = document.getElementById("downloadResults");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", this.downloadResults.bind(this));
    }
  }

  handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    const uploadArea = document.getElementById("fileUploadArea");
    if (uploadArea) {
      uploadArea.classList.add("drag-over");
    }
  }

  handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    const uploadArea = document.getElementById("fileUploadArea");
    if (uploadArea) {
      uploadArea.classList.remove("drag-over");
    }
  }

  handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const uploadArea = document.getElementById("fileUploadArea");
    if (uploadArea) {
      uploadArea.classList.remove("drag-over");
    }

    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.name.toLowerCase().endsWith(".txt")
    );

    if (files.length > 0) {
      this.files = files;
      this.displayFileList();
      this.addLog(`📄 ${files.length} transcript file(s) selected`, "success");
    } else {
      this.addLog("⚠️ Please select only .txt files", "warning");
    }
  }

  handleFileSelect(e) {
    const files = Array.from(e.target.files).filter(
      (file) => file.name.toLowerCase().endsWith(".txt")
    );

    if (files.length > 0) {
      this.files = files;
      this.displayFileList();
      this.addLog(`📄 ${files.length} transcript file(s) selected`, "success");
      } else {
      this.addLog("⚠️ Please select only .txt files", "warning");
    }
  }

  displayFileList() {
    const fileListDiv = document.getElementById("fileList");
    if (!fileListDiv) return;

    if (this.files.length === 0) {
      fileListDiv.classList.add("hidden");
      return;
    }

    fileListDiv.classList.remove("hidden");
    fileListDiv.innerHTML = `
      <div style="margin-top: 15px; padding: 15px; background: #f8fafc; border-radius: 8px">
        <div style="font-weight: 600; margin-bottom: 10px">Selected Files (${this.files.length}):</div>
        ${this.files
        .map(
            (file, index) => `
          <div style="display: flex; justify-content: space-between; padding: 8px; background: white; margin-bottom: 5px; border-radius: 4px">
            <span>📄 ${file.name}</span>
            <span style="color: #6b7280">${this.formatFileSize(file.size)}</span>
              </div>
            `
        )
          .join("")}
      </div>
    `;
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  async startProcessing() {
    if (this.files.length === 0) {
      this.addLog("⚠️ Please select transcript files first", "warning");
      return;
    }

    const jobDescription = document.getElementById("jobDescription").value;
    const analysisPrompt = document.getElementById("analysisPrompt").value;
    const openaiModel = document.getElementById("openaiModel").value;
    const claudeModel = document.getElementById("claudeModel").value;
    const geminiModel = document.getElementById("geminiModel").value;

    // Validation
    if (!jobDescription || jobDescription.trim().length < 20) {
      this.addLog("⚠️ Job description must be at least 20 characters", "warning");
      return;
    }

    if (!analysisPrompt || analysisPrompt.trim().length < 20) {
      this.addLog("⚠️ Analysis prompt must be at least 20 characters", "warning");
      return;
    }

    if (!openaiModel || !claudeModel || !geminiModel) {
      this.addLog("⚠️ Please specify all AI model names", "warning");
      return;
    }

    try {
      this.addLog("🚀 Starting multi-model processing...", "info");

      const formData = new FormData();
      this.files.forEach((file) => {
        formData.append("transcripts", file);
      });
      formData.append("jobDescription", jobDescription);
      formData.append("prompt", analysisPrompt);
      formData.append("openaiModel", openaiModel);
      formData.append("claudeModel", claudeModel);
      formData.append("geminiModel", geminiModel);

      const response = await fetch(`${this.apiBaseUrl}/api/process`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Processing failed");
      }

        this.currentBatchId = result.data.batchId;
      this.addLog(`✅ Processing started: ${result.data.message}`, "success");

      // Show progress section
      document.getElementById("progressSection").classList.remove("hidden");

      // Start monitoring progress
      this.startProgressMonitoring();
    } catch (error) {
      this.addLog(`❌ Error: ${error.message}`, "error");
    }
  }

  startProgressMonitoring() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
  }

    this.progressInterval = setInterval(async () => {
      await this.updateProgress();
    }, 2000); // Update every 2 seconds

    // Initial update
    this.updateProgress();
  }

  async updateProgress() {
      if (!this.currentBatchId) return;

    try {
      const response = await fetch(
        `${this.apiBaseUrl}/api/batch/${this.currentBatchId}/progress`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to get progress");
      }

      const { metrics } = result.data;

      // Update overall progress
      const overallPercent = metrics.total > 0 
        ? Math.round((metrics.completed / metrics.total) * 100) 
        : 0;
      document.getElementById("overallProgress").textContent = 
        `${metrics.completed} / ${metrics.total}`;
      document.getElementById("overallProgressFill").style.width = 
        `${overallPercent}%`;

        // Update OpenAI progress
      const openaiPercent = metrics.total > 0 
        ? Math.round((metrics.openaiComplete / metrics.total) * 100) 
        : 0;
      document.getElementById("openaiProgress").textContent = 
        `${metrics.openaiComplete} / ${metrics.total}`;
      document.getElementById("openaiProgressFill").style.width = 
        `${openaiPercent}%`;

        // Update Claude progress
      const claudePercent = metrics.total > 0 
        ? Math.round((metrics.claudeComplete / metrics.total) * 100) 
        : 0;
      document.getElementById("claudeProgress").textContent = 
        `${metrics.claudeComplete} / ${metrics.total}`;
      document.getElementById("claudeProgressFill").style.width = 
        `${claudePercent}%`;

        // Update Gemini progress
      const geminiPercent = metrics.total > 0 
        ? Math.round((metrics.geminiComplete / metrics.total) * 100) 
        : 0;
      document.getElementById("geminiProgress").textContent = 
        `${metrics.geminiComplete} / ${metrics.total}`;
      document.getElementById("geminiProgressFill").style.width = 
        `${geminiPercent}%`;

      // Check if completed
      if (result.data.status === "completed") {
      clearInterval(this.progressInterval);
        this.addLog("🎉 All processing completed!", "success");
        document.getElementById("downloadSection").classList.remove("hidden");
      } else if (result.data.status === "failed") {
        clearInterval(this.progressInterval);
        this.addLog("❌ Processing failed", "error");
      }
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  }

  async downloadResults() {
    if (!this.currentBatchId) return;

    try {
      this.addLog("📥 Preparing download...", "info");

      const url = `${this.apiBaseUrl}/api/batch/${this.currentBatchId}/download`;
      
      // Create invisible link and trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = `transcript-results-${this.currentBatchId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      this.addLog("✅ Download started!", "success");
    } catch (error) {
      this.addLog(`❌ Download error: ${error.message}`, "error");
    }
  }

  addLog(message, type = "info") {
    const statusLog = document.getElementById("statusLog");
    if (!statusLog) return;

    const entry = document.createElement("div");
    entry.className = `log-entry ${type}`;
    entry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;

    statusLog.insertBefore(entry, statusLog.firstChild);

    // Keep only last 20 entries
    while (statusLog.children.length > 20) {
      statusLog.removeChild(statusLog.lastChild);
    }
  }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  new TranscriptProcessor();
});
