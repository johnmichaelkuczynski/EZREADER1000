// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import multer from "multer";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  documents;
  rewriteJobs;
  constructor() {
    this.documents = /* @__PURE__ */ new Map();
    this.rewriteJobs = /* @__PURE__ */ new Map();
  }
  async createDocument(insertDocument) {
    const id = randomUUID();
    const document = {
      ...insertDocument,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.documents.set(id, document);
    return document;
  }
  async getDocument(id) {
    return this.documents.get(id);
  }
  async createRewriteJob(insertJob) {
    const id = randomUUID();
    const job = {
      ...insertJob,
      id,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.rewriteJobs.set(id, job);
    return job;
  }
  async getRewriteJob(id) {
    return this.rewriteJobs.get(id);
  }
  async updateRewriteJob(id, updates) {
    const existingJob = this.rewriteJobs.get(id);
    if (!existingJob) {
      throw new Error(`Rewrite job with id ${id} not found`);
    }
    const updatedJob = { ...existingJob, ...updates };
    this.rewriteJobs.set(id, updatedJob);
    return updatedJob;
  }
  async listRewriteJobs() {
    return Array.from(this.rewriteJobs.values()).sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }
};
var storage = new MemStorage();

// server/services/fileProcessor.ts
import * as fs from "fs";
import * as path from "path";
var FileProcessorService = class {
  async processFile(filePath, originalName) {
    const ext = path.extname(originalName).toLowerCase();
    let content;
    try {
      switch (ext) {
        case ".txt":
          content = await this.processTxtFile(filePath);
          break;
        case ".pdf":
          content = await this.processPdfFile(filePath);
          break;
        case ".doc":
        case ".docx":
          content = await this.processWordFile(filePath);
          break;
        default:
          throw new Error(`Unsupported file type: ${ext}`);
      }
      const wordCount = this.countWords(content);
      return {
        filename: originalName,
        content,
        wordCount
      };
    } finally {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
  async processTxtFile(filePath) {
    return fs.readFileSync(filePath, "utf-8");
  }
  async processPdfFile(filePath) {
    try {
      const pdfParse = await import("pdf-parse");
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse.default(dataBuffer);
      return data.text;
    } catch (error) {
      throw new Error("PDF processing failed. Please ensure the file is a valid PDF.");
    }
  }
  async processWordFile(filePath) {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } catch (error) {
      throw new Error("Word document processing failed. Please ensure the file is a valid Word document.");
    }
  }
  countWords(text) {
    return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
  }
  async validateFile(file) {
    const allowedTypes = [".txt", ".pdf", ".doc", ".docx"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.includes(ext)) {
      throw new Error(`File type ${ext} is not supported. Please upload a TXT, PDF, DOC, or DOCX file.`);
    }
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error("File size exceeds 50MB limit.");
    }
  }
};
var fileProcessorService = new FileProcessorService();

// server/services/textChunker.ts
import { randomUUID as randomUUID2 } from "crypto";
var TextChunkerService = class {
  CHUNK_SIZE = 500;
  // words per chunk
  OVERLAP_SIZE = 50;
  // word overlap between chunks
  chunkText(text) {
    const words = text.trim().split(/\s+/);
    const totalWords = words.length;
    if (totalWords <= this.CHUNK_SIZE) {
      return [{
        id: randomUUID2(),
        content: text,
        startWord: 1,
        endWord: totalWords
      }];
    }
    const chunks = [];
    let currentStart = 0;
    while (currentStart < totalWords) {
      const currentEnd = Math.min(currentStart + this.CHUNK_SIZE, totalWords);
      const chunkWords = words.slice(currentStart, currentEnd);
      const chunkContent = chunkWords.join(" ");
      chunks.push({
        id: randomUUID2(),
        content: chunkContent,
        startWord: currentStart + 1,
        endWord: currentEnd
      });
      currentStart = currentEnd - this.OVERLAP_SIZE;
      if (totalWords - currentStart < this.CHUNK_SIZE / 2) {
        break;
      }
    }
    return chunks;
  }
  reconstructFromChunks(chunks, selectedChunkIds) {
    const selectedChunks = chunks.filter((chunk) => selectedChunkIds.includes(chunk.id)).sort((a, b) => a.startWord - b.startWord);
    if (selectedChunks.length === 0) {
      return "";
    }
    let reconstructedText = selectedChunks[0].content;
    for (let i = 1; i < selectedChunks.length; i++) {
      const currentChunk = selectedChunks[i];
      const previousChunk = selectedChunks[i - 1];
      if (currentChunk.startWord <= previousChunk.endWord + this.OVERLAP_SIZE) {
        const overlapWords = previousChunk.endWord - currentChunk.startWord + 1;
        if (overlapWords > 0) {
          const currentWords = currentChunk.content.split(/\s+/);
          const nonOverlappingWords = currentWords.slice(overlapWords);
          reconstructedText += " " + nonOverlappingWords.join(" ");
        } else {
          reconstructedText += " " + currentChunk.content;
        }
      } else {
        reconstructedText += "\n\n[...]\n\n" + currentChunk.content;
      }
    }
    return reconstructedText;
  }
  getChunkPreview(content, maxLength = 150) {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + "...";
  }
};
var textChunkerService = new TextChunkerService();

// server/services/gptZero.ts
var GPTZeroService = class {
  API_KEY = process.env.GPTZERO_API_KEY;
  API_URL = "https://api.gptzero.me/v2/predict/text";
  async analyzeText(text) {
    if (!this.API_KEY) {
      throw new Error("GPTZero API key not configured");
    }
    try {
      const response = await fetch(this.API_URL, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "x-api-key": this.API_KEY
        },
        body: JSON.stringify({
          document: text,
          multilingual: false
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GPTZero API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      const data = await response.json();
      const document = data.documents[0];
      const aiProbability = document.class_probabilities?.ai || 0;
      const aiScore = Math.round(aiProbability * 100);
      const isHighConfidence = document.confidence_category === "high";
      return {
        aiScore,
        isAI: document.document_classification === "AI_ONLY" || document.document_classification === "MIXED",
        confidence: isHighConfidence ? 0.9 : document.confidence_category === "medium" ? 0.7 : 0.5
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("GPTZero API error:", errorMessage);
      throw new Error(`Failed to analyze text with GPTZero: ${errorMessage}`);
    }
  }
  async analyzeBatch(texts) {
    const results = await Promise.all(
      texts.map((text) => this.analyzeText(text))
    );
    return results;
  }
};
var gptZeroService = new GPTZeroService();

// server/services/aiProviders.ts
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
var DEFAULT_OPENAI_MODEL = "gpt-4o";
var DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
var openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR
});
var anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY_ENV_VAR || "default_key"
});
var AIProviderService = class {
  async rewriteWithOpenAI(params) {
    const systemPrompt = this.buildSystemPrompt(params);
    try {
      const response = await openai.chat.completions.create({
        model: DEFAULT_OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: params.inputText }
        ],
        temperature: 0.7,
        max_tokens: 4e3
      });
      return response.choices[0].message.content || "";
    } catch (error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }
  async rewriteWithAnthropic(params) {
    const systemPrompt = this.buildSystemPrompt(params);
    try {
      const response = await anthropic.messages.create({
        model: DEFAULT_ANTHROPIC_MODEL,
        system: systemPrompt,
        messages: [
          { role: "user", content: params.inputText }
        ],
        max_tokens: 4e3,
        temperature: 0.7
      });
      return response.content[0].text || "";
    } catch (error) {
      throw new Error(`Anthropic API error: ${error.message}`);
    }
  }
  async rewriteWithPerplexity(params) {
    const systemPrompt = this.buildSystemPrompt(params);
    try {
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY_ENV_VAR || "default_key"}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: params.inputText }
          ],
          temperature: 0.7,
          max_tokens: 4e3,
          stream: false
        })
      });
      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.statusText}`);
      }
      const data = await response.json();
      return data.choices[0].message.content || "";
    } catch (error) {
      throw new Error(`Perplexity API error: ${error.message}`);
    }
  }
  async rewriteWithDeepSeek(params) {
    const systemPrompt = this.buildSystemPrompt(params);
    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY_ENV_VAR || "default_key"}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: params.inputText }
          ],
          temperature: 0.7,
          max_tokens: 4e3,
          stream: false
        })
      });
      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.statusText}`);
      }
      const data = await response.json();
      return data.choices[0].message.content || "";
    } catch (error) {
      throw new Error(`DeepSeek API error: ${error.message}`);
    }
  }
  buildSystemPrompt(params) {
    let prompt = "You are an expert text rewriter. Your task is to rewrite the given text to make it sound more human-written and less AI-generated, while preserving the core meaning and content.\n\n";
    if (params.styleText && (params.mixingMode === "style" || params.mixingMode === "both" || !params.mixingMode)) {
      prompt += `STYLE REFERENCE: Please mimic the writing style, tone, and voice of this sample text with surgical precision:
"${params.styleText}"

Analyze the sentence structure, word choice, rhythm, and personality from this sample and apply it to your rewrite.

`;
    }
    if (params.contentMixText && (params.mixingMode === "content" || params.mixingMode === "both")) {
      prompt += `CONTENT REFERENCE: Blend concepts, themes, and information from this reference material with the target text:
"${params.contentMixText}"

Integrate relevant ideas, terminology, and perspectives from this reference while maintaining the coherence of the original message.

`;
    }
    if (params.mixingMode === "both" && params.styleText && params.contentMixText) {
      prompt += "MIXING MODE: You are performing both STYLE CLONING and CONTENT MIXING. Apply the writing style from the style reference while incorporating relevant concepts from the content reference.\n\n";
    } else if (params.mixingMode === "content" && params.contentMixText) {
      prompt += "CONTENT MIXING MODE: Focus on blending the ideas and concepts from the content reference with the original text, while keeping a natural writing style.\n\n";
    } else if (params.mixingMode === "style" && params.styleText) {
      prompt += "STYLE CLONING MODE: Focus primarily on mimicking the exact writing style, tone, and voice from the style reference.\n\n";
    }
    if (params.selectedPresets && params.selectedPresets.length > 0) {
      prompt += "REWRITING INSTRUCTIONS:\n";
      params.selectedPresets.forEach((preset) => {
        prompt += `- ${preset}
`;
      });
      prompt += "\n";
    }
    if (params.customInstructions) {
      prompt += `CUSTOM INSTRUCTIONS: ${params.customInstructions}

`;
    }
    prompt += "REQUIREMENTS:\n";
    prompt += "- Preserve all factual content and key arguments from the original text\n";
    prompt += "- Maintain the original meaning and intent\n";
    prompt += "- Make the text sound naturally human-written\n";
    prompt += "- Vary sentence structure and length naturally\n";
    prompt += "- Use natural language patterns and flow\n";
    prompt += "- Avoid obvious AI writing patterns and repetitive structures\n";
    if (params.styleText) {
      prompt += "- Match the style, tone, and voice of the style reference precisely\n";
    }
    if (params.contentMixText) {
      prompt += "- Incorporate relevant concepts and terminology from the content reference\n";
    }
    prompt += "- Only return the rewritten text, no explanations or meta-commentary\n";
    return prompt;
  }
  async rewrite(provider, params) {
    switch (provider) {
      case "openai":
        return this.rewriteWithOpenAI(params);
      case "anthropic":
        return this.rewriteWithAnthropic(params);
      case "perplexity":
        return this.rewriteWithPerplexity(params);
      case "deepseek":
        return this.rewriteWithDeepSeek(params);
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }
};
var aiProviderService = new AIProviderService();

// server/routes.ts
var upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 50 * 1024 * 1024
    // 50MB limit
  }
});
async function registerRoutes(app2) {
  app2.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      await fileProcessorService.validateFile(req.file);
      const processedFile = await fileProcessorService.processFile(req.file.path, req.file.originalname);
      const gptZeroResult = await gptZeroService.analyzeText(processedFile.content);
      const document = await storage.createDocument({
        filename: processedFile.filename,
        content: processedFile.content,
        wordCount: processedFile.wordCount,
        aiScore: gptZeroResult.aiScore
      });
      const chunks = processedFile.wordCount > 500 ? textChunkerService.chunkText(processedFile.content) : [];
      if (chunks.length > 0) {
        const chunkTexts = chunks.map((chunk) => chunk.content);
        const chunkResults = await gptZeroService.analyzeBatch(chunkTexts);
        chunks.forEach((chunk, index) => {
          chunk.aiScore = chunkResults[index].aiScore;
        });
      }
      res.json({
        document,
        chunks,
        aiScore: gptZeroResult.aiScore,
        needsChunking: processedFile.wordCount > 500
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/analyze-text", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ message: "Text is required" });
      }
      const gptZeroResult = await gptZeroService.analyzeText(text);
      const wordCount = text.trim().split(/\s+/).length;
      const chunks = wordCount > 500 ? textChunkerService.chunkText(text) : [];
      if (chunks.length > 0) {
        const chunkTexts = chunks.map((chunk) => chunk.content);
        const chunkResults = await gptZeroService.analyzeBatch(chunkTexts);
        chunks.forEach((chunk, index) => {
          chunk.aiScore = chunkResults[index].aiScore;
        });
      }
      res.json({
        aiScore: gptZeroResult.aiScore,
        wordCount,
        chunks,
        needsChunking: wordCount > 500
      });
    } catch (error) {
      console.error("Text analysis error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/rewrite", async (req, res) => {
    try {
      const rewriteRequest = req.body;
      if (!rewriteRequest.inputText || !rewriteRequest.provider) {
        return res.status(400).json({ message: "Input text and provider are required" });
      }
      const inputAnalysis = await gptZeroService.analyzeText(rewriteRequest.inputText);
      const rewriteJob = await storage.createRewriteJob({
        inputText: rewriteRequest.inputText,
        styleText: rewriteRequest.styleText,
        contentMixText: rewriteRequest.contentMixText,
        customInstructions: rewriteRequest.customInstructions,
        selectedPresets: rewriteRequest.selectedPresets,
        provider: rewriteRequest.provider,
        chunks: [],
        selectedChunkIds: rewriteRequest.selectedChunkIds,
        mixingMode: rewriteRequest.mixingMode,
        inputAiScore: inputAnalysis.aiScore,
        status: "processing"
      });
      try {
        const rewrittenText = await aiProviderService.rewrite(rewriteRequest.provider, {
          inputText: rewriteRequest.inputText,
          styleText: rewriteRequest.styleText,
          contentMixText: rewriteRequest.contentMixText,
          customInstructions: rewriteRequest.customInstructions,
          selectedPresets: rewriteRequest.selectedPresets,
          mixingMode: rewriteRequest.mixingMode
        });
        const outputAnalysis = await gptZeroService.analyzeText(rewrittenText);
        await storage.updateRewriteJob(rewriteJob.id, {
          outputText: rewrittenText,
          outputAiScore: outputAnalysis.aiScore,
          status: "completed"
        });
        const response = {
          rewrittenText,
          inputAiScore: inputAnalysis.aiScore,
          outputAiScore: outputAnalysis.aiScore,
          jobId: rewriteJob.id
        };
        res.json(response);
      } catch (error) {
        await storage.updateRewriteJob(rewriteJob.id, {
          status: "failed"
        });
        throw error;
      }
    } catch (error) {
      console.error("Rewrite error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/re-rewrite/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      const { customInstructions, selectedPresets, provider } = req.body;
      const originalJob = await storage.getRewriteJob(jobId);
      if (!originalJob || !originalJob.outputText) {
        return res.status(404).json({ message: "Original job not found or incomplete" });
      }
      const rewriteJob = await storage.createRewriteJob({
        inputText: originalJob.outputText,
        styleText: originalJob.styleText,
        contentMixText: originalJob.contentMixText,
        customInstructions: customInstructions || originalJob.customInstructions,
        selectedPresets: selectedPresets || originalJob.selectedPresets,
        provider: provider || originalJob.provider,
        chunks: [],
        selectedChunkIds: [],
        mixingMode: originalJob.mixingMode,
        inputAiScore: originalJob.outputAiScore,
        status: "processing"
      });
      try {
        const rewrittenText = await aiProviderService.rewrite(provider || originalJob.provider, {
          inputText: originalJob.outputText,
          styleText: originalJob.styleText,
          contentMixText: originalJob.contentMixText,
          customInstructions: customInstructions || originalJob.customInstructions,
          selectedPresets: selectedPresets || originalJob.selectedPresets,
          mixingMode: originalJob.mixingMode
        });
        const outputAnalysis = await gptZeroService.analyzeText(rewrittenText);
        await storage.updateRewriteJob(rewriteJob.id, {
          outputText: rewrittenText,
          outputAiScore: outputAnalysis.aiScore,
          status: "completed"
        });
        const response = {
          rewrittenText,
          inputAiScore: originalJob.outputAiScore || 0,
          outputAiScore: outputAnalysis.aiScore,
          jobId: rewriteJob.id
        };
        res.json(response);
      } catch (error) {
        await storage.updateRewriteJob(rewriteJob.id, { status: "failed" });
        throw error;
      }
    } catch (error) {
      console.error("Re-rewrite error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/jobs/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      const job = await storage.getRewriteJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Get job error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  app2.get("/api/jobs", async (req, res) => {
    try {
      const jobs = await storage.listRewriteJobs();
      res.json(jobs);
    } catch (error) {
      console.error("List jobs error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
