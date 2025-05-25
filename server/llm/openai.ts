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
  useContentSource: boolean;
  maxTokens?: number;
}

import { protectMathFormulas, restoreMathFormulas } from "../utils/math-formula-protection";

// Process extremely large text by chunking and sampling
async function processLargeTextWithOpenAI(options: ProcessTextOptions): Promise<string> {
  const { text, instructions, contentSource, useContentSource, maxTokens = 4000 } = options;
  
  console.log("Processing extremely large document with specialized OpenAI approach");
  
  // Step 1: Split the text into manageable chunks
  const MAX_CHUNK_TOKENS = 32000; // Well below GPT-4o's context limit
  const chunks = splitIntoChunks(text, MAX_CHUNK_TOKENS);
  console.log(`Split large document into ${chunks.length} chunks for processing`);
  
  // Step 2: Create a representative sample of the document
  // Include the beginning, end, and some evenly distributed middle sections
  let representativeText = '';
  
  // Always include the first chunk (introduction)
  representativeText += chunks[0] + "\n\n--- SECTION BREAK ---\n\n";
  
  // For very large documents, include some evenly distributed middle sections
  if (chunks.length > 4) {
    const numMiddleChunks = Math.min(3, Math.floor(chunks.length / 2));
    const step = Math.floor((chunks.length - 2) / (numMiddleChunks + 1));
    
    for (let i = 1; i <= numMiddleChunks; i++) {
      const index = Math.min(chunks.length - 2, i * step);
      representativeText += chunks[index] + "\n\n--- SECTION BREAK ---\n\n";
    }
  }
  
  // Always include the last chunk (conclusion)
  representativeText += chunks[chunks.length - 1];
  
  // Step 3: Process the representative text with modified instructions
  const enhancedInstructions = `NOTE: This is a very large document (${estimateTokenCount(text)} estimated tokens) that has been sampled to include the beginning, end, and some middle sections. The document is separated by "--- SECTION BREAK ---" markers.\n\nOriginal instructions: ${instructions}\n\nPlease process this representative sample of the document according to the instructions. Since this is only a sample of a much larger document, focus on maintaining the overall intent, style, and key points.`;
  
  try {
    // Process the representative text
    const { processedText, mathBlocks } = protectMathFormulas(representativeText);
    
    let systemPrompt = "You are processing a very large document that has been sampled. Do not modify any content within [[MATH_BLOCK_*]] or [[MATH_INLINE_*]] tokens as they contain special mathematical notation.";
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `${enhancedInstructions}\n\nText to transform:\n${processedText}` }
      ],
      max_tokens: maxTokens * 2, // Allow more output tokens for comprehensive processing
      temperature: 0.7,
    });
    
    const processedContent = response.choices[0].message.content || "";
    
    // Restore math formulas in the processed text
    const finalResult = restoreMathFormulas(processedContent, mathBlocks);
    
    return finalResult;
  } catch (error: any) {
    console.error("OpenAI large document processing error:", error);
    throw new Error(`Failed to process large text with OpenAI: ${error.message}`);
  }
}

export async function processTextWithOpenAI(options: ProcessTextOptions): Promise<string> {
  const { text, instructions, contentSource, useContentSource, maxTokens = 4000 } = options;
  
  // Estimate token count to check for large documents
  const estimatedTokens = estimateTokenCount(text);
  const MAX_INPUT_TOKENS = 100000; // GPT-4o's limit is 128k, leaving buffer for system and instruction tokens
  
  // Handle extremely large documents with special processing
  if (estimatedTokens > MAX_INPUT_TOKENS) {
    console.log(`Document exceeds OpenAI token limit (${estimatedTokens} tokens). Using document summarization approach.`);
    return await processLargeTextWithOpenAI(options);
  }
  
  // Standard processing for normal-sized documents
  // Protect math formulas before processing
  const { processedText, mathBlocks } = protectMathFormulas(text);
  
  let systemPrompt = "You are a helpful assistant that transforms text according to user instructions. Do not modify any content within [[MATH_BLOCK_*]] or [[MATH_INLINE_*]] tokens as they contain special mathematical notation.";
  
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
  
  let userPrompt = `Instructions: ${instructions}\n\nText to transform:\n${text}`;
  
  if (useContentSource && contentSource) {
    systemPrompt += " Use the provided content source for additional context or information.";
    userPrompt += `\n\nAdditional content source for reference:\n${contentSource}`;
  }
  
  try {
    // Use the protected text with math formulas replaced by tokens
    const userPromptWithProtectedMath = userPrompt.replace(text, processedText);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPromptWithProtectedMath }
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    });
    
    const processedContent = response.choices[0].message.content || "";
    
    // Restore math formulas in the processed text
    const finalResult = restoreMathFormulas(processedContent, mathBlocks);
    
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
