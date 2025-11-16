# Transcript Processor - Multi-Model AI Analysis

A powerful web application for analyzing transcripts using multiple AI models (OpenAI, Claude, and Gemini) simultaneously.

## 🚀 Features

- **Multi-Model Analysis**: Process transcripts with OpenAI GPT, Anthropic Claude, and Google Gemini in parallel
- **Batch Processing**: Upload and process up to 100 transcript files at once
- **Custom Prompts**: Define your own job descriptions and analysis prompts
- **Dynamic Model Configuration**: Choose any model version from each AI provider
- **Real-time Progress**: Monitor processing progress for each AI model
- **Easy Download**: Download all results as a ZIP file organized by model

## 📋 Workflow

1. **Upload Transcripts**: Upload one or more `.txt` transcript files
2. **Configure Analysis**: Provide job description and analysis prompt
3. **Select Models**: Specify the model names for OpenAI, Claude, and Gemini
4. **Start Processing**: Click to begin multi-model analysis
5. **Download Results**: Get all analysis results in a convenient ZIP file

## 🛠️ Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- API keys for:
  - OpenAI
  - Anthropic (Claude)
  - Google Gemini

### Setup

1. **Clone the repository**
   ```bash
   cd Kugget-Transcript
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # AI API Keys (Required)
   OPENAI_API_KEY=your_openai_api_key_here
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here

   # Default Models (Optional)
   OPENAI_MODEL=gpt-4o-mini
   ANTHROPIC_MODEL=claude-3-5-sonnet-20240620
   GEMINI_MODEL=gemini-2.0-flash-exp

   # Server Configuration (Optional)
   PORT=3000
   UPLOAD_DIR=uploads
   OUTPUT_DIR=output
   CONCURRENT_PROCESSING=10
   ```

4. **Build the application**
   ```bash
   npm run build
   ```

5. **Start the server**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
Kugget-Transcript/
├── src/
│   ├── config/
│   │   └── index.ts           # Configuration management
│   ├── controllers/
│   │   └── TranscriptController.ts  # Main controller
│   ├── middleware/
│   │   └── uploadMiddleware.ts     # File upload handling
│   ├── routes/
│   │   └── index.ts           # API routes
│   ├── services/
│   │   └── TranscriptProcessor.ts  # Multi-model processing logic
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions
│   └── index.ts               # Main server entry point
├── public/
│   ├── index.html             # Frontend UI
│   ├── script.js              # Frontend logic
│   └── style.css              # Styling
├── package.json
├── tsconfig.json
└── README.md
```

## 🎯 API Endpoints

### POST /api/process
Upload and process transcripts with multi-model analysis.

**Body (multipart/form-data):**
- `transcripts`: Array of .txt files
- `jobDescription`: String (min 20 chars)
- `prompt`: String (min 20 chars)
- `openaiModel`: String (model name)
- `claudeModel`: String (model name)
- `geminiModel`: String (model name)

### GET /api/batch/:batchId/progress
Get real-time processing progress for a batch.

### GET /api/batch/:batchId/download
Download all results as a ZIP file.

### GET /api/batches
Get all processing batches.

### GET /api/health
Check system health and status.

## 🤖 Supported AI Models

### OpenAI
- `gpt-4o-mini` (recommended)
- `gpt-4o`
- `gpt-4-turbo`
- `gpt-3.5-turbo`
- Or any other available OpenAI model

### Anthropic Claude
- `claude-3-5-sonnet-20240620` (recommended)
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`
- Or any other available Claude model

### Google Gemini
- `gemini-2.0-flash-exp` (recommended)
- `gemini-1.5-pro`
- `gemini-1.5-flash`
- Or any other available Gemini model

## 📊 Output Format

Results are organized in a ZIP file with the following structure:

```
transcript-results-{batchId}.zip
├── openai/
│   ├── transcript1-openai.json
│   └── transcript2-openai.json
├── claude/
│   ├── transcript1-claude.json
│   └── transcript2-claude.json
└── gemini/
    ├── transcript1-gemini.json
    └── transcript2-gemini.json
```

Each JSON file contains:
```json
{
  "model": "gpt-4o-mini",
  "filename": "transcript1.txt",
  "analysis": "AI-generated analysis...",
  "metadata": {
    "tokens": 1234,
    "processingTime": 5678
  },
  "timestamp": "2025-11-15T..."
}
```

## 🔧 Configuration

### File Limits
- Maximum file size: 10MB per file
- Maximum files per batch: 100 files
- Supported format: `.txt` (plain text)

### Processing
- Concurrent processing limit: 10 (configurable)
- Processing timeout: 2 minutes per request
- Retry attempts: 2 per request

## 🐛 Troubleshooting

### "Cannot connect to server"
- Ensure the server is running on port 3000
- Check if another process is using port 3000

### "API key errors"
- Verify all API keys are correctly set in `.env`
- Ensure API keys have sufficient credits/quota

### "Processing timeout"
- Try processing fewer files at once
- Check your internet connection
- Verify API service status

## 📝 Development

### Run in development mode
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

### Clean build artifacts
```bash
npm run clean
```

## 🔒 Security Notes

- Never commit `.env` file to version control
- Keep API keys secure and rotate them regularly
- The application accepts only `.txt` files for security
- All uploads are temporary and cleaned on server shutdown

## 📄 License

ISC License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## 📧 Support

For issues or questions, please create an issue on the repository.

---

**Built with ❤️ using Node.js, Express, and multiple AI models**

