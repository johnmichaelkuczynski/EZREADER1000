import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { 
  processTextSchema, 
  detectAiSchema, 
  searchOnlineSchema, 
  sendEmailSchema 
} from "@shared/schema";
import { processTextWithOpenAI, detectAIWithOpenAI, transcribeAudio } from "./llm/openai";
import { processTextWithAnthropic, detectAIWithAnthropic } from "./llm/anthropic";
import { processTextWithPerplexity, detectAIWithPerplexity } from "./llm/perplexity";
import { detectAIWithGPTZero } from "./services/gptzero";
import { searchOnline, fetchWebContent } from "./services/google";
import { sendDocumentEmail } from "./services/sendgrid";

// Configure multer storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Process text endpoint
  app.post('/api/process-text', async (req: Request, res: Response) => {
    try {
      const data = processTextSchema.parse(req.body);
      
      // Select LLM provider based on user choice
      let processedText: string;
      
      switch (data.llmProvider) {
        case 'openai':
          processedText = await processTextWithOpenAI({
            text: data.inputText,
            instructions: data.instructions,
            contentSource: data.contentSource,
            useContentSource: data.useContentSource
          });
          break;
        case 'anthropic':
          processedText = await processTextWithAnthropic({
            text: data.inputText,
            instructions: data.instructions,
            contentSource: data.contentSource,
            useContentSource: data.useContentSource
          });
          break;
        case 'perplexity':
          processedText = await processTextWithPerplexity({
            text: data.inputText,
            instructions: data.instructions,
            contentSource: data.contentSource,
            useContentSource: data.useContentSource
          });
          break;
        default:
          throw new Error('Invalid LLM provider');
      }
      
      res.json({ result: processedText });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else {
        console.error('Error processing text:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to process text' });
      }
    }
  });

  // Process document chunk endpoint
  app.post('/api/process-chunk', async (req: Request, res: Response) => {
    try {
      const schema = processTextSchema.extend({
        chunkIndex: z.number(),
        totalChunks: z.number()
      });
      
      const data = schema.parse(req.body);
      
      // Select LLM provider based on user choice
      let processedText: string;
      
      // Add context about this being part of a larger document
      const chunkContext = `[Processing chunk ${data.chunkIndex + 1} of ${data.totalChunks}]\n`;
      const enhancedInstructions = chunkContext + data.instructions + 
        "\nNote: This is part of a larger document, maintain consistency with previous chunks.";
      
      switch (data.llmProvider) {
        case 'openai':
          processedText = await processTextWithOpenAI({
            text: data.inputText,
            instructions: enhancedInstructions,
            contentSource: data.contentSource,
            useContentSource: data.useContentSource
          });
          break;
        case 'anthropic':
          processedText = await processTextWithAnthropic({
            text: data.inputText,
            instructions: enhancedInstructions,
            contentSource: data.contentSource,
            useContentSource: data.useContentSource
          });
          break;
        case 'perplexity':
          processedText = await processTextWithPerplexity({
            text: data.inputText,
            instructions: enhancedInstructions,
            contentSource: data.contentSource,
            useContentSource: data.useContentSource
          });
          break;
        default:
          throw new Error('Invalid LLM provider');
      }
      
      res.json({ 
        result: processedText,
        chunkIndex: data.chunkIndex,
        totalChunks: data.totalChunks
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else {
        console.error('Error processing chunk:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to process text chunk' });
      }
    }
  });

  // Detect AI-generated content
  app.post('/api/detect-ai', async (req: Request, res: Response) => {
    try {
      const { text } = detectAiSchema.parse(req.body);
      
      // Try GPTZero first, fall back to model-based detection
      try {
        const result = await detectAIWithGPTZero(text);
        res.json(result);
      } catch (gptzeroError) {
        console.log("GPTZero failed, falling back to model-based detection:", gptzeroError instanceof Error ? gptzeroError.message : 'GPTZero error');
        
        // Fall back to OpenAI for detection
        const result = await detectAIWithOpenAI(text);
        res.json(result);
      }
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else {
        console.error('Error detecting AI:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to detect AI content' });
      }
    }
  });

  // Transcribe audio endpoint
  app.post('/api/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }
      
      const audioBuffer = req.file.buffer;
      const transcribedText = await transcribeAudio(audioBuffer);
      
      res.json({ result: transcribedText });
    } catch (error: unknown) {
      console.error('Error transcribing audio:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to transcribe audio' });
    }
  });

  // Search online
  app.post('/api/search-online', async (req: Request, res: Response) => {
    try {
      const { query } = searchOnlineSchema.parse(req.body);
      const searchResults = await searchOnline(query);
      
      res.json(searchResults);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else {
        console.error('Error searching online:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to search online' });
      }
    }
  });

  // Fetch specific content
  app.post('/api/fetch-content', async (req: Request, res: Response) => {
    try {
      const schema = z.object({ url: z.string().url() });
      const { url } = schema.parse(req.body);
      
      const content = await fetchWebContent(url);
      res.json({ content });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else {
        console.error('Error fetching content:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch content' });
      }
    }
  });

  // Send email with processed text
  app.post('/api/send-email', async (req: Request, res: Response) => {
    try {
      const { to, subject, text } = sendEmailSchema.parse(req.body);
      const { originalText, transformedText } = req.body;
      
      if (!originalText || !transformedText) {
        return res.status(400).json({ error: 'Original and transformed text are required' });
      }
      
      const success = await sendDocumentEmail({
        to,
        subject,
        text,
        originalText,
        transformedText
      });
      
      res.json({ success });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else {
        console.error('Error sending email:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to send email' });
      }
    }
  });

  // Save instructions
  app.post('/api/save-instructions', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        name: z.string().min(1),
        instructions: z.string().min(1),
        userId: z.number().optional()
      });
      
      const data = schema.parse(req.body);
      const userId = data.userId || 1; // Default to 1 for anonymous user
      
      const savedInstructions = await storage.createSavedInstructions({
        userId,
        name: data.name,
        instructions: data.instructions
      });
      
      res.json(savedInstructions);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else {
        console.error('Error saving instructions:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to save instructions' });
      }
    }
  });

  // Get saved instructions
  app.get('/api/saved-instructions', async (req: Request, res: Response) => {
    try {
      const userId = Number(req.query.userId) || 1; // Default to 1 for anonymous user
      const savedInstructions = await storage.getSavedInstructionsByUserId(userId);
      
      res.json(savedInstructions);
    } catch (error: unknown) {
      console.error('Error getting saved instructions:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get saved instructions' });
    }
  });

  return httpServer;
}
