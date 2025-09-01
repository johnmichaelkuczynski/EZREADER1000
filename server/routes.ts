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
  sendEmailSchema,
  chatRequestSchema 
} from "@shared/schema";
import { stripMarkdown, preserveMathAndStripMarkdown } from "./utils/markdown-stripper";
import { processTextWithOpenAI, detectAIWithOpenAI, transcribeAudio, solveHomeworkWithOpenAI, processChatWithOpenAI, queryContentSourceWithOpenAI } from "./llm/openai";
import { processTextWithAnthropic, detectAIWithAnthropic, solveHomeworkWithAnthropic, processChatWithAnthropic, queryContentSourceWithAnthropic } from "./llm/anthropic";
import { processTextWithPerplexity, detectAIWithPerplexity, solveHomeworkWithPerplexity, processChatWithPerplexity, queryContentSourceWithPerplexity } from "./llm/perplexity";
import { processTextWithDeepSeek, detectAIWithDeepSeek, solveHomeworkWithDeepSeek, processChatWithDeepSeek, queryContentSourceWithDeepSeek } from "./llm/deepseek";
import { detectAIWithGPTZero } from "./services/gptzero";
import { searchOnline, fetchWebContent } from "./services/google";
import { sendDocumentEmail } from "./services/sendgrid";
import { extractTextFromPDF } from "./services/pdf-processor";
import { extractTextFromImageWithMathpix } from "./services/mathpix";
import { processMathPDFWithAzure, processMathImageWithAzure, enhanceMathFormatting } from "./services/azure-math";



// Configure multer storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept PDF, Word documents, text files, images, and audio files
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/octet-stream', // Many browsers default to this for .docx files
      'text/plain',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/m4a',
      'audio/aac'
    ];
    
    // Check MIME type or file extension for better compatibility
    const isValidByMime = allowedTypes.includes(file.mimetype);
    const isValidByExtension = file.originalname.match(/\.(pdf|docx?|txt|jpe?g|png|gif|bmp|tiff?|webm|mp4|mpe?g|wav|ogg|m4a|aac)$/i);
    
    if (isValidByMime || isValidByExtension) {
      cb(null, true);
    } else {
      console.log('Rejected file type:', file.mimetype, 'for file:', file.originalname);
      cb(null, false);
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // SEPARATE HOMEWORK ENDPOINT - BYPASSES ALL REWRITE LOGIC
  app.post('/api/solve-homework', async (req: Request, res: Response) => {
    try {
      const { assignment, llmProvider = 'anthropic', contentSource, styleSource } = req.body;
      
      let solution: string;
      
      switch (llmProvider) {
        case 'openai':
          solution = await solveHomeworkWithOpenAI(assignment, contentSource, styleSource);
          break;
        case 'anthropic':
          solution = await solveHomeworkWithAnthropic(assignment, contentSource, styleSource);
          break;
        case 'perplexity':
          solution = await solveHomeworkWithPerplexity(assignment, contentSource, styleSource);
          break;
        case 'deepseek':
          solution = await solveHomeworkWithDeepSeek(assignment, contentSource, styleSource);
          break;
        default:
          throw new Error(`Unsupported LLM provider: ${llmProvider}`);
      }
      
      res.json({ result: solution });
    } catch (error: any) {
      console.error('Error solving homework:', error);
      res.status(500).json({ 
        error: 'Failed to solve homework', 
        details: error.message 
      });
    }
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
            styleSource: data.styleSource,
            useContentSource: data.useContentSource,
            useStyleSource: data.useStyleSource,
            examMode: data.examMode
          });
          break;
        case 'anthropic':
          processedText = await processTextWithAnthropic({
            text: data.inputText,
            instructions: data.instructions,
            contentSource: data.contentSource,
            styleSource: data.styleSource,
            useContentSource: data.useContentSource,
            useStyleSource: data.useStyleSource,
            examMode: data.examMode
          });
          break;
        case 'perplexity':
          processedText = await processTextWithPerplexity({
            text: data.inputText,
            instructions: data.instructions,
            contentSource: data.contentSource,
            styleSource: data.styleSource,
            useContentSource: data.useContentSource,
            useStyleSource: data.useStyleSource,
            examMode: data.examMode
          });
          break;
        case 'deepseek':
          processedText = await processTextWithDeepSeek(
            data.inputText,
            data.instructions,
            data.useContentSource ? data.contentSource : undefined,
            data.useStyleSource ? data.styleSource : undefined,
            data.examMode
          );
          break;
        default:
          throw new Error('Invalid LLM provider');
      }
      
      // Return LLM output exactly as received - NO FILTERING OR PROCESSING
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
        case 'deepseek':
          processedText = await processTextWithDeepSeek(
            data.inputText,
            enhancedInstructions,
            data.useContentSource ? data.contentSource : undefined
          );
          break;
        default:
          throw new Error('Invalid LLM provider');
      }
      
      // Return LLM output exactly as received - NO FILTERING OR PROCESSING
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
      const { text, llmProvider } = detectAiSchema.parse(req.body);
      
      // Try GPTZero first, fall back to model-based detection
      try {
        const result = await detectAIWithGPTZero(text);
        res.json(result);
      } catch (gptzeroError) {
        console.log("GPTZero failed, falling back to model-based detection:", gptzeroError instanceof Error ? gptzeroError.message : 'GPTZero error');
        
        // Fall back to selected LLM provider for detection
        let result;
        switch (llmProvider) {
          case 'anthropic':
            result = await detectAIWithAnthropic(text);
            break;
          case 'perplexity':
            result = await detectAIWithPerplexity(text);
            break;
          case 'deepseek':
            result = await detectAIWithDeepSeek(text);
            break;
          default:
            result = await detectAIWithOpenAI(text);
        }
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
        console.log('No audio file in request');
        return res.status(400).json({ error: 'No audio file provided' });
      }
      
      console.log('Audio file received:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.buffer.length
      });
      
      // Check file size limit (10MB max for audio)
      const maxAudioSize = 10 * 1024 * 1024; // 10MB
      if (req.file.buffer.length > maxAudioSize) {
        console.log('Audio file too large:', req.file.buffer.length);
        return res.status(400).json({ 
          error: `Audio file too large. Maximum size is 10MB, received ${Math.round(req.file.buffer.length / 1024 / 1024)}MB` 
        });
      }
      
      if (req.file.buffer.length === 0) {
        console.log('Empty audio buffer received');
        return res.status(400).json({ error: 'Empty audio file provided' });
      }
      
      const audioBuffer = req.file.buffer;
      console.log('Starting transcription with buffer size:', audioBuffer.length);
      
      // Set a timeout for transcription (30 seconds)
      const transcriptionTimeout = 30000;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Transcription timeout after 30 seconds')), transcriptionTimeout);
      });
      
      const { transcribeAudioWithOpenAI } = await import('./services/openai-transcription');
      const transcriptionPromise = transcribeAudioWithOpenAI(audioBuffer);
      
      const transcribedText = await Promise.race([transcriptionPromise, timeoutPromise]) as string;
      console.log('Transcription completed, text length:', transcribedText.length);
      
      res.json({ result: transcribedText });
    } catch (error: unknown) {
      console.error('Error transcribing audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to transcribe audio';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Chat endpoint with conversation memory
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { message, conversationHistory, llmProvider, contextDocument } = chatRequestSchema.parse(req.body);
      
      let response;
      switch (llmProvider) {
        case 'openai':
          response = await processChatWithOpenAI(message, conversationHistory, contextDocument);
          break;
        case 'anthropic':
          response = await processChatWithAnthropic(message, conversationHistory, contextDocument);
          break;
        case 'perplexity':
          response = await processChatWithPerplexity(message, conversationHistory, contextDocument);
          break;
        case 'deepseek':
          response = await processChatWithDeepSeek(message, conversationHistory, contextDocument);
          break;
        default:
          throw new Error('Invalid LLM provider');
      }
      
      res.json({ response });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: fromZodError(error).message });
      } else {
        console.error('Error processing chat:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to process chat' });
      }
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
  
  // Process PDF file - server-side PDF extraction
  app.post('/api/process-pdf', upload.single('pdf'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file provided' });
      }
      
      // Process the PDF file with our PDF processor
      const pdfBuffer = req.file.buffer;
      const extractedText = await extractTextFromPDF(pdfBuffer);
      
      // Return the extracted text
      res.json({ 
        text: extractedText,
        filename: req.file.originalname,
        size: req.file.size
      });
    } catch (error: unknown) {
      console.error('Error processing PDF file:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to process PDF file' });
    }
  });

  // Process Word document - server-side DOCX extraction
  app.post('/api/process-docx', upload.single('docx'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No Word document provided' });
      }
      
      // Accept various MIME types for Word documents (some browsers/systems report different types)
      const validDocxTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/octet-stream' // Many systems default to this for .docx files
      ];
      
      const isValidDocx = validDocxTypes.includes(req.file.mimetype) || 
                         req.file.originalname.toLowerCase().endsWith('.docx') ||
                         req.file.originalname.toLowerCase().endsWith('.doc');
      
      if (!isValidDocx) {
        return res.status(400).json({ error: `Unsupported file type: ${req.file.mimetype}. Please upload a Word document (.docx or .doc)` });
      }
      
      console.log('Processing Word document:', req.file.originalname, 'Size:', req.file.size, 'Type:', req.file.mimetype);
      
      // Import mammoth for server-side processing
      const mammoth = await import('mammoth');
      
      // Process the Word document
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      
      console.log('Successfully extracted text from Word document, length:', result.value.length);
      
      // Return the extracted text
      res.json({ 
        text: result.value,
        filename: req.file.originalname,
        size: req.file.size
      });
    } catch (error: unknown) {
      console.error('Error processing Word document:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to process Word document' });
    }
  });

  // Azure OpenAI PDF processing endpoint
  app.post('/api/process-math-pdf', upload.single('pdf'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file provided" });
      }

      console.log('Processing PDF with Azure OpenAI:', req.file.originalname, 'Size:', req.file.size);
      
      // Temporarily using standard PDF extraction until Azure model is configured
      const extractedText = await extractTextFromPDF(req.file.buffer);
      
      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(400).json({ error: "Could not extract text from PDF using Azure OpenAI" });
      }

      console.log('Azure OpenAI extracted text length:', extractedText.length);
      
      res.json({ 
        text: extractedText,
        filename: req.file.originalname,
        source: 'azure-openai'
      });
    } catch (error: any) {
      console.error('Azure OpenAI PDF processing error:', error);
      res.status(500).json({ error: error.message || "Failed to process PDF with Azure OpenAI" });
    }
  });

  // Math image processing endpoint using Mathpix
  app.post('/api/process-math-image', upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: "Unsupported image format. Please use JPG, PNG, GIF, BMP, or WebP." });
      }

      console.log('Processing math image with Mathpix:', req.file.originalname, 'Type:', req.file.mimetype, 'Size:', req.file.size);
      
      const { extractTextFromImageWithMathpix } = await import('./services/mathpix');
      const result = await extractTextFromImageWithMathpix(req.file.buffer, req.file.mimetype);
      
      if (!result.text || result.text.trim().length === 0) {
        return res.status(400).json({ error: "Could not extract text from image" });
      }

      console.log('Mathpix extracted text length:', result.text.length);
      
      res.json({ 
        text: result.text,
        confidence: result.confidence,
        filename: req.file.originalname,
        source: 'mathpix'
      });
    } catch (error: any) {
      console.error('Mathpix image processing error:', error);
      res.status(500).json({ error: error.message || "Failed to process math image" });
    }
  });

  // Math formatting enhancement endpoint
  app.post('/api/enhance-math', async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "No text provided" });
      }

      const enhancedText = await enhanceMathFormatting(text);
      
      res.json({ 
        text: enhancedText,
        source: 'azure-math-enhanced'
      });
    } catch (error: any) {
      console.error('Math enhancement error:', error);
      res.status(500).json({ error: error.message || "Failed to enhance math formatting" });
    }
  });

  // Send email with processed text
  // Simple PDF export using print dialog approach
  app.post('/api/export-pdf', async (req: Request, res: Response) => {
    try {
      const { content, filename = 'document' } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: 'Content is required' });
      }
      
      // Use the existing markdown stripper that preserves math properly
      const processedContent = preserveMathAndStripMarkdown(content);
      
      // Return HTML content for client-side PDF generation via print dialog
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${filename}</title>
    <script>
        window.MathJax = {
            tex: {
                inlineMath: [['\\\\(', '\\\\)']],
                displayMath: [['\\\\[', '\\\\]']],
                processEscapes: true,
                processEnvironments: true
            },
            options: {
                skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
            },
            startup: {
                ready: function () {
                    MathJax.startup.defaultReady();
                    MathJax.startup.promise.then(function () {
                        console.log('MathJax initial typesetting complete');
                        document.body.setAttribute('data-mathjax-ready', 'true');
                    });
                }
            }
        };
    </script>
    <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
    <script id="MathJax-script" src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    <style>
        body {
            font-family: 'Georgia', serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            color: #333;
        }
        
        .math-content {
            font-size: 16px;
        }
        
        mjx-container {
            margin: 0.5em 0;
        }
        
        @media print {
            @page {
                margin: 0.5in;
                size: letter;
                /* Remove all headers and footers except page number */
                @top-left { content: ""; }
                @top-center { content: ""; }
                @top-right { content: ""; }
                @bottom-left { content: ""; }
                @bottom-center { content: counter(page); }
                @bottom-right { content: ""; }
            }
            
            body {
                margin: 0;
                padding: 20px;
                /* Remove any browser-generated content */
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            /* Hide any potential browser UI elements */
            * {
                -webkit-box-shadow: none !important;
                box-shadow: none !important;
            }
        }
    </style>
</head>
<body>
    <div class="math-content">
        ${processedContent.replace(/\n/g, '<br>')}
    </div>
    
    <script>
        // Wait for MathJax to finish rendering before printing
        function waitForMathJaxAndPrint() {
            if (window.MathJax && window.MathJax.startup && window.MathJax.startup.promise) {
                window.MathJax.startup.promise.then(function() {
                    // Force another typeset to ensure everything is rendered
                    return window.MathJax.typesetPromise ? window.MathJax.typesetPromise() : Promise.resolve();
                }).then(function() {
                    console.log('MathJax rendering complete, triggering print');
                    document.body.setAttribute('data-math-ready', 'true');
                    // Give extra time for rendering to complete and verify rendering
                    setTimeout(() => {
                        // Check if math elements are actually rendered
                        const mathElements = document.querySelectorAll('mjx-container');
                        console.log('Math elements found before print:', mathElements.length);
                        
                        // Add visual indicator that math is ready
                        if (mathElements.length > 0) {
                            document.body.style.backgroundColor = '#f0fff0'; // light green indicates math rendered
                        } else {
                            document.body.style.backgroundColor = '#fff0f0'; // light red indicates no math rendered
                        }
                        
                        window.print();
                    }, 4000); // Increased to 4 seconds
                }).catch(function(error) {
                    console.error('MathJax error:', error);
                    // Still try to print even if MathJax fails
                    setTimeout(() => window.print(), 1000);
                });
            } else {
                // Fallback if MathJax is not available
                setTimeout(() => {
                    console.log('MathJax not available, printing anyway');
                    window.print();
                }, 1000);
            }
        }
        
        // Start the process when page loads
        window.addEventListener('load', waitForMathJaxAndPrint);
        
        // Also try after a delay in case load event already fired
        setTimeout(waitForMathJaxAndPrint, 500);
    </script>
</body>
</html>`;
      
      res.json({ 
        htmlContent,
        filename: `${filename}.pdf`,
        message: 'Use browser print dialog to save as PDF'
      });
    } catch (error: any) {
      console.error('PDF export error:', error);
      res.status(500).json({ error: 'Failed to export PDF' });
    }
  });

  app.post('/api/export-html', async (req: Request, res: Response) => {
    try {
      const { content, filename = 'document' } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: 'Content is required' });
      }
      
      const { exportToHTML } = await import('./services/export-service-simple');
      const htmlContent = await exportToHTML(content, filename);
      
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.html"`);
      res.send(htmlContent);
    } catch (error: any) {
      console.error('HTML export error:', error);
      res.status(500).json({ error: 'Failed to export HTML' });
    }
  });

  app.post('/api/export-latex', async (req: Request, res: Response) => {
    try {
      const { content, filename = 'document' } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: 'Content is required' });
      }
      
      const { exportToLaTeX } = await import('./services/export-service-simple');
      const latexContent = await exportToLaTeX(content, filename);
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.tex"`);
      res.send(latexContent);
    } catch (error: any) {
      console.error('LaTeX export error:', error);
      res.status(500).json({ error: 'Failed to export LaTeX' });
    }
  });

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

  // Query Content Source - NEW FEATURE
  app.post('/api/query-content-source', async (req: Request, res: Response) => {
    try {
      const { question, contentSource, llmProvider = 'deepseek' } = req.body;
      
      if (!question || !contentSource) {
        return res.status(400).json({ error: 'Both question and content source are required' });
      }
      
      let answer: string;
      
      switch (llmProvider) {
        case 'openai':
          answer = await queryContentSourceWithOpenAI(question, contentSource);
          break;
        case 'anthropic':
          answer = await queryContentSourceWithAnthropic(question, contentSource);
          break;
        case 'perplexity':
          answer = await queryContentSourceWithPerplexity(question, contentSource);
          break;
        case 'deepseek':
          answer = await queryContentSourceWithDeepSeek(question, contentSource);
          break;
        default:
          throw new Error(`Unsupported LLM provider: ${llmProvider}`);
      }
      
      res.json({ answer });
    } catch (error: any) {
      console.error('Error querying content source:', error);
      res.status(500).json({ 
        error: 'Failed to query content source', 
        details: error.message 
      });
    }
  });

  // Update API keys
  app.post('/api/update-api-keys', async (req: Request, res: Response) => {
    try {
      const { openaiKey, anthropicKey, perplexityKey } = req.body;
      
      // Update environment variables
      if (openaiKey) process.env.OPENAI_API_KEY = openaiKey;
      if (anthropicKey) process.env.ANTHROPIC_API_KEY = anthropicKey;
      if (perplexityKey) process.env.PERPLEXITY_API_KEY = perplexityKey;
      
      res.status(200).json({ success: true, message: 'API keys updated successfully' });
    } catch (error: unknown) {
      console.error('Error updating API keys:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to update API keys' 
      });
    }
  });

  // Process image with Mathpix OCR (including math text)
  app.post('/api/process-image-ocr', upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const result = await extractTextFromImageWithMathpix(req.file.buffer, req.file.mimetype);
      res.json({ 
        text: result.text,
        confidence: result.confidence
      });
    } catch (error: any) {
      console.error('Error processing image with Mathpix OCR:', error);
      res.status(500).json({ error: error.message || "Failed to extract text from image" });
    }
  });



  return httpServer;
}
