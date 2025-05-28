import Anthropic from '@anthropic-ai/sdk';
import { ProcessTextOptions } from './openai';
import { protectMathFormulas, restoreMathFormulas, protectMathAndStructure, restoreMathAndFormatting } from "../utils/math-formula-protection";

// Utility function to estimate token count for Anthropic models
function estimateTokenCount(text: string): number {
  // Anthropic typically counts tokens at ~4 characters per token
  return Math.ceil(text.length / 4);
}

// Process extremely large text by chunking and summarizing sections
async function processLargeTextWithAnthropic(options: ProcessTextOptions): Promise<string> {
  const { text, instructions, contentSource, useContentSource, maxTokens = 4000 } = options;
  
  console.log("Processing extremely large document with specialized approach");
  
  // Step 1: Split the text into manageable chunks
  const MAX_CHUNK_TOKENS = 50000; // Keep well below Claude's context limit
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
    
    const message = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      system: systemPrompt,
      max_tokens: maxTokens * 2, // Allow more output tokens for comprehensive processing
      messages: [
        { role: 'user', content: `${enhancedInstructions}\n\nText to transform:\n${processedText}` }
      ],
    });
    
    // Get the response content
    let responseContent = '';
    
    // Handle different response types from Anthropic API
    if (message.content && message.content.length > 0) {
      const contentBlock = message.content[0];
      if ('text' in contentBlock) {
        responseContent = contentBlock.text;
      }
    }
    
    // Restore math formulas in the processed text
    const finalResult = restoreMathFormulas(responseContent, mathBlocks);
    
    return finalResult;
  } catch (error: any) {
    console.error("Anthropic large document processing error:", error);
    throw new Error(`Failed to process large text with Anthropic: ${error.message}`);
  }
}

// Utility function to split very large text into smaller chunks
function splitIntoChunks(text: string, maxChunkTokens: number = 50000): string[] {
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

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function processTextWithAnthropic(options: ProcessTextOptions): Promise<string> {
  const { text, instructions, contentSource, useContentSource, maxTokens = 4000 } = options;
  
  // Estimate token count to check for large documents
  const estimatedTokens = estimateTokenCount(text);
  const MAX_INPUT_TOKENS = 190000; // Anthropic's limit is 200k, leaving some buffer for system and instruction tokens
  
  // Handle extremely large documents with special processing
  if (estimatedTokens > MAX_INPUT_TOKENS) {
    console.log(`Document exceeds token limit (${estimatedTokens} tokens). Using document summarization approach.`);
    return await processLargeTextWithAnthropic(options);
  }
  
  // Standard processing for normal-sized documents
  // Protect math formulas before processing
  const { processedText, mathBlocks } = protectMathFormulas(text);
  
  let systemPrompt = "You are an assistant that transforms text according to user instructions. Do not modify any content within [[MATH_BLOCK_*]] or [[MATH_INLINE_*]] tokens as they contain special mathematical notation. CRITICAL: When generating mathematical expressions, use clean LaTeX format (e.g., A = P(1 + r/n)^{nt}) NOT Unicode superscripts or special characters. This ensures proper PDF rendering.";
  
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
  
  // Use the protected text with math formulas replaced by tokens
  let userContent = `Instructions: ${instructions}\n\nText to transform:\n${processedText}`;
  
  if (useContentSource && contentSource) {
    systemPrompt += " Use the provided content source for additional context or information.";
    userContent += `\n\nAdditional content source for reference:\n${contentSource}`;
  }
  
  try {
    const message = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      system: systemPrompt,
      max_tokens: maxTokens,
      messages: [
        { role: 'user', content: userContent }
      ],
    });
    
    // Get the response content
    let responseContent = '';
    
    // Handle different response types from Anthropic API
    if (message.content && message.content.length > 0) {
      const contentBlock = message.content[0];
      if ('text' in contentBlock) {
        responseContent = contentBlock.text;
      }
    }
    
    // Restore math formulas in the processed text
    const finalResult = restoreMathFormulas(responseContent, mathBlocks);
    
    return finalResult;
  } catch (error: any) {
    console.error("Anthropic processing error:", error);
    throw new Error(`Failed to process text with Anthropic: ${error.message}`);
  }
}

export async function detectAIWithAnthropic(text: string): Promise<{ isAI: boolean; confidence: number; details: string }> {
  // No need to protect math formulas for AI detection
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      system: "You're an AI detection expert. Analyze the text for AI authorship indicators. Output valid JSON with these keys: isAI (boolean), confidence (number between 0-1), and details (string with explanation).",
      max_tokens: 1024,
      messages: [
        { role: 'user', content: text }
      ],
    });
    
    let result: any = { isAI: false, confidence: 0.5, details: "Analysis failed" };
    
    try {
      // Extract content safely
      let content = '';
      if (response.content && response.content.length > 0) {
        const contentBlock = response.content[0];
        if ('text' in contentBlock) {
          content = contentBlock.text;
          // Parse the JSON from the response
          const matches = content.match(/\{[\s\S]*\}/);
          if (matches && matches[0]) {
            result = JSON.parse(matches[0]);
          }
        }
      }
    } catch (parseError) {
      console.error("Failed to parse Anthropic JSON response:", parseError);
      // Extract information from the text response as fallback
      let content = '';
      if (response.content && response.content.length > 0) {
        const contentBlock = response.content[0];
        if ('text' in contentBlock) {
          content = contentBlock.text.toLowerCase();
        }
      }
      result.isAI = content.includes("ai generated") || content.includes("written by ai");
      // Get details safely
      if (response.content && response.content.length > 0) {
        const contentBlock = response.content[0];
        if ('text' in contentBlock) {
          result.details = contentBlock.text;
        } else {
          result.details = "No details available";
        }
      }
    }
    
    return {
      isAI: Boolean(result.isAI),
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      details: result.details || "No analysis details provided"
    };
  } catch (error) {
    console.error("Anthropic detection error:", error);
    throw new Error(`Failed to detect AI with Anthropic: ${error.message}`);
  }
}
