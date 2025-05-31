import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Utility function to estimate token count for OpenAI models
function estimateTokenCount(text: string): number {
  // OpenAI typically counts tokens at roughly 4 characters per token for English text
  return Math.ceil(text.length / 4);
}

// Utility function to split very large text into smaller chunks
function splitIntoChunks(text: string, maxChunkTokens: number = 32000): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\s*\n/);
  let currentChunk = '';
  let currentTokenCount = 0;
  
  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokenCount(paragraph);
    
    // If this paragraph alone exceeds the chunk size, split it further
    if (paragraphTokens > maxChunkTokens) {
      // Add current chunk if not empty
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
        currentTokenCount = 0;
      }
      
      // Split large paragraph into sentences
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      let sentenceChunk = '';
      let sentenceTokenCount = 0;
      
      for (const sentence of sentences) {
        const sentenceTokens = estimateTokenCount(sentence);
        
        if (sentenceTokenCount + sentenceTokens > maxChunkTokens && sentenceChunk) {
          chunks.push(sentenceChunk);
          sentenceChunk = sentence;
          sentenceTokenCount = sentenceTokens;
        } else {
          sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
          sentenceTokenCount += sentenceTokens;
        }
      }
      
      if (sentenceChunk) {
        chunks.push(sentenceChunk);
      }
    } 
    // Normal paragraph handling
    else if (currentTokenCount + paragraphTokens > maxChunkTokens) {
      chunks.push(currentChunk);
      currentChunk = paragraph;
      currentTokenCount = paragraphTokens;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      currentTokenCount += paragraphTokens;
    }
  }
  
  // Add the final chunk if not empty
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

export interface ProcessTextOptions {
  text: string;
  instructions: string;
  contentSource?: string;
  styleSource?: string;
  useContentSource: boolean;
  useStyleSource?: boolean;
  maxTokens?: number;
  examMode?: boolean;
}

import { protectMathFormulas, restoreMathFormulas, protectMathAndStructure, restoreMathAndFormatting, splitIntoSemanticBlocks, reconstructFromBlocks } from "../utils/math-formula-protection";

// Process extremely large text by processing ALL chunks sequentially
async function processLargeTextWithOpenAI(options: ProcessTextOptions): Promise<string> {
  const { text, instructions, contentSource, styleSource, useContentSource, useStyleSource, maxTokens = 4000 } = options;
  
  console.log("Processing extremely large document with full content processing");
  
  // Step 1: Split the text into manageable chunks
  const MAX_CHUNK_TOKENS = 32000; // Well below GPT-4o's context limit
  const chunks = splitIntoChunks(text, MAX_CHUNK_TOKENS);
  console.log(`Split large document into ${chunks.length} chunks for processing`);
  
  let processedResults: string[] = [];
  
  // Process each chunk individually with full content
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Processing chunk ${i + 1}/${chunks.length}`);
    
    const chunkInstructions = `${instructions}\n\nThis is chunk ${i + 1} of ${chunks.length} from a larger document. Process this entire chunk according to the instructions.`;
  
    try {
      // Process the current chunk
      const { processedText, mathBlocks } = protectMathFormulas(chunk);
    
      let systemPrompt = "You are processing one chunk of a larger document. Do not modify any content within [[MATH_BLOCK_*]] or [[MATH_INLINE_*]] tokens as they contain special mathematical notation. CRITICAL: When generating mathematical expressions, use clean LaTeX format (e.g., A = P(1 + r/n)^{nt}) NOT Unicode superscripts or special characters. This ensures proper PDF rendering.";
    
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${chunkInstructions}\n\nContent to process:\n${processedText}` }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      });

      const result = response.choices[0]?.message?.content || '';
      const finalResult = restoreMathFormulas(result, mathBlocks);
      processedResults.push(finalResult);
      
    } catch (error: any) {
      console.error(`Error processing chunk ${i + 1}:`, error);
      processedResults.push(`[Error processing chunk ${i + 1}: ${error.message}]`);
    }
  }
  
  // Combine all processed chunks
  return processedResults.join('\n\n--- CHUNK BREAK ---\n\n');
}

export async function processTextWithOpenAI(options: ProcessTextOptions): Promise<string> {
  const { text, instructions, contentSource, styleSource, useContentSource, useStyleSource, maxTokens = 4000, examMode = false } = options;
  
  // For pure passthrough dialogue (no instructions), send user input directly
  if (!instructions || instructions.trim() === "") {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
  
  // Estimate token count to check for large documents
  const estimatedTokens = estimateTokenCount(text);
  const MAX_INPUT_TOKENS = 100000; // GPT-4o's limit is 128k, leaving buffer for system and instruction tokens
  
  // Handle extremely large documents with special processing
  if (estimatedTokens > MAX_INPUT_TOKENS) {
    console.log(`Document exceeds OpenAI token limit (${estimatedTokens} tokens). Using document summarization approach.`);
    return await processLargeTextWithOpenAI(options);
  }
  
  // STEP 1: PRE-PROCESSING - Protect math formulas and split into semantic blocks
  const { processedText, mathBlocks, semanticBlocks } = protectMathAndStructure(text);
  
  let systemPrompt = examMode 
    ? `You are taking an exam. Answer the exam questions directly and thoroughly to achieve a perfect score. Follow these CRITICAL rules:

1. MATH PROTECTION: Never modify content within __MATH_BLOCK_### tokens - these contain LaTeX math expressions
2. EXAM MODE: You are a student taking this exam. Provide complete, accurate answers to all questions
3. FORMATTING: Use clean LaTeX format for any new math (e.g., A = P(1 + r/n)^{nt}) NOT Unicode superscripts
4. OUTPUT: Give detailed answers that demonstrate full understanding of the material`
    : `You are a helpful assistant that transforms text according to user instructions. Follow these CRITICAL formatting rules:

1. MATH PROTECTION: Never modify content within __MATH_BLOCK_### tokens - these contain LaTeX math expressions
2. FORMATTING: Use clean LaTeX format for any new math (e.g., A = P(1 + r/n)^{nt}) NOT Unicode superscripts
3. OUTPUT: Ensure output is markdown-compatible with proper spacing between paragraphs`;
  
  // Check if instructions contain keywords about shortening
  const requestsShorterOutput = instructions.toLowerCase().includes('shorter') || 
                               instructions.toLowerCase().includes('summarize') || 
                               instructions.toLowerCase().includes('reduce') ||
                               instructions.toLowerCase().includes('condense') ||
                               instructions.toLowerCase().includes('brief');
  
  // Add the instruction about length unless user has specified they want shorter output
  if (!requestsShorterOutput) {
    systemPrompt += " IMPORTANT: Unless explicitly requested otherwise, your rewrite MUST be longer than the original text. Add more examples, explanations, or details to make the content more comprehensive.";
  }
  
  // STEP 2: BLOCK-LEVEL REWRITING - Process semantic blocks to preserve structure
  let userPrompt = `Instructions: ${instructions}

IMPORTANT: The text below is organized into semantic blocks. Rewrite each block as a complete unit while preserving:
- Paragraph structure and spacing
- List formatting (bullets, numbers)
- Mathematical expressions (never modify __MATH_BLOCK_### tokens)
- Overall document flow

Text to transform:
${processedText}`;
  
  if (useContentSource && contentSource) {
    systemPrompt += " Use the provided content source for additional context or information.";
    userPrompt += `\n\nAdditional content source for reference:\n${contentSource}`;
  }
  
  if (useStyleSource && styleSource) {
    systemPrompt += " Analyze the provided style source and adopt its writing style, tone, structure, and linguistic patterns in your output.";
    userPrompt += `\n\nStyle source to analyze and emulate:\n${styleSource}`;
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    });
    
    const processedContent = response.choices[0].message.content || "";
    
    // STEP 3: POST-PROCESSING - Restore math formulas and normalize formatting
    const finalResult = restoreMathAndFormatting(processedContent, mathBlocks);
    
    return finalResult;
  } catch (error: any) {
    console.error("OpenAI processing error:", error);
    throw new Error(`Failed to process text with OpenAI: ${error.message}`);
  }
}

export async function detectAIWithOpenAI(text: string): Promise<{ isAI: boolean; confidence: number; details: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an AI detection expert. Analyze the provided text and determine if it was likely written by an AI. Respond with JSON in this format: { 'isAI': boolean, 'confidence': number between 0 and 1, 'details': string with reasoning }"
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      isAI: result.isAI || false,
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      details: result.details || "No analysis details provided"
    };
  } catch (error) {
    console.error("OpenAI detection error:", error);
    throw new Error(`Failed to detect AI with OpenAI: ${error.message}`);
  }
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    const tempFilePath = `/tmp/audio-${Date.now()}.mp3`;
    require('fs').writeFileSync(tempFilePath, audioBuffer);
    
    const transcription = await openai.audio.transcriptions.create({
      file: require('fs').createReadStream(tempFilePath),
      model: "whisper-1",
    });
    
    // Clean up temp file
    require('fs').unlinkSync(tempFilePath);
    
    return transcription.text;
  } catch (error) {
    console.error("OpenAI transcription error:", error);
    throw new Error(`Failed to transcribe audio with OpenAI: ${error.message}`);
  }
}
