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
  const { text, instructions, contentSource, styleSource, useContentSource, useStyleSource, maxTokens = 4000 } = options;
  
  console.log("Processing extremely large document with specialized approach");
  
  // Step 1: Split the text into manageable chunks
  const MAX_CHUNK_TOKENS = 50000; // Keep well below Claude's context limit
  const chunks = splitIntoChunks(text, MAX_CHUNK_TOKENS);
  console.log(`Split large document into ${chunks.length} chunks for processing`);
  
  let processedResults: string[] = [];
  
  try {
    // Process each chunk individually with 15-second delays
    for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Processing chunk ${i + 1}/${chunks.length} - ${chunk.length} characters`);
    
    try {
      let systemPrompt = "You are a helpful assistant. Follow the instructions exactly and return your response as-is without any filtering or modification.";
      
      let userPrompt = `${instructions}\n\nThis is chunk ${i + 1} of ${chunks.length} from a larger document. Process this ENTIRE chunk according to the instructions:\n\n${chunk}`;
      
      // Add content source if provided
      if (useContentSource && contentSource) {
        userPrompt = `${instructions}\n\nUse this content as reference material (do not copy it, use it to enhance your response):\n${contentSource}\n\nNow process this chunk ${i + 1} of ${chunks.length} according to the instructions above:\n${chunk}`;
      }
      
      // Add style source if provided
      if (useStyleSource && styleSource) {
        userPrompt = `${instructions}\n\nStyle reference (analyze and emulate this writing style):\n${styleSource}\n\nProcess this chunk ${i + 1} of ${chunks.length}:\n${chunk}`;
      }
      
      const message = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        system: systemPrompt,
        max_tokens: maxTokens,
        messages: [
          { role: 'user', content: userPrompt }
        ],
      });
      
      // Get the response content
      let responseContent = '';
      if (message.content && message.content.length > 0) {
        const contentBlock = message.content[0];
        if ('text' in contentBlock) {
          responseContent = contentBlock.text;
        }
      }
      
      processedResults.push(responseContent);
      
      // Add 15-second delay between chunks to prevent rate limiting (except for last chunk)
      if (i < chunks.length - 1) {
        console.log(`Waiting 15 seconds before processing next chunk...`);
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
      
    } catch (error: any) {
      console.error(`Error processing chunk ${i + 1}:`, error);
      throw new Error(`Failed to process chunk ${i + 1} with Anthropic: ${error.message}`);
    }
  }
  
  // Join all processed chunks
  return processedResults.join('\n\n');
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
  const { text, instructions, contentSource, styleSource, useContentSource, useStyleSource, maxTokens = 4000, examMode = false } = options;
  
  // Estimate token count to check for large documents
  const estimatedTokens = estimateTokenCount(text);
  const MAX_INPUT_TOKENS = 190000; // Anthropic's limit is 200k, leaving some buffer for system and instruction tokens
  
  // Handle extremely large documents with special processing
  if (estimatedTokens > MAX_INPUT_TOKENS) {
    console.log(`Document exceeds token limit (${estimatedTokens} tokens). Using document summarization approach.`);
    return await processLargeTextWithAnthropic(options);
  }
  
  // HOMEWORK MODE DETECTION: Check if this is homework/assignment completion
  const isHomeworkMode = instructions.includes("I am a teacher creating solution keys") || 
                        instructions.includes("educational assessment purposes") ||
                        instructions.includes("COMPLETE THIS ASSIGNMENT ENTIRELY");
  
  if (isHomeworkMode) {
    // HOMEWORK MODE: Treat input as assignment questions to solve
    const systemPrompt = "You are an expert tutor and academic assistant. Solve the following assignment thoroughly and step-by-step. Provide complete solutions, not just explanations. For math problems, show all work and provide final answers. For written questions, provide comprehensive responses. Do not reformat or rewrite - actually solve the problems presented.";
    
    const userContent = `Please solve the following assignment completely:\n\n${text}`;
    
    try {
      const message = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        system: systemPrompt,
        max_tokens: maxTokens,
        messages: [
          { role: 'user', content: userContent }
        ],
      });
      
      let responseContent = '';
      if (message.content && message.content.length > 0) {
        const contentBlock = message.content[0];
        if ('text' in contentBlock) {
          responseContent = contentBlock.text;
        }
      }
      
      return responseContent;
    } catch (error: any) {
      console.error("Anthropic homework processing error:", error);
      throw new Error(`Failed to process homework with Anthropic: ${error.message}`);
    }
  }
  
  // REGULAR REWRITE MODE: Standard processing for normal-sized documents
  // Protect math formulas before processing
  const { processedText, mathBlocks } = protectMathFormulas(text);
  
  let systemPrompt = examMode 
    ? "You are taking an exam. Answer the exam questions directly and thoroughly to achieve a perfect score. Do not modify any content within [[MATH_BLOCK_*]] or [[MATH_INLINE_*]] tokens as they contain special mathematical notation. CRITICAL: When generating mathematical expressions, use clean LaTeX format (e.g., A = P(1 + r/n)^{nt}) NOT Unicode superscripts or special characters. Provide complete, accurate answers that demonstrate full understanding of the material."
    : "You are an assistant that transforms text according to user instructions. Do not modify any content within [[MATH_BLOCK_*]] or [[MATH_INLINE_*]] tokens as they contain special mathematical notation. CRITICAL: When generating mathematical expressions, use clean LaTeX format (e.g., A = P(1 + r/n)^{nt}) NOT Unicode superscripts or special characters. This ensures proper PDF rendering.";
  
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
    systemPrompt += " Use the provided content source as reference material to enhance your response. Do not copy it directly.";
    userContent = `Instructions: ${instructions}\n\nUse this content as reference material (do not copy it, use it to enhance your response):\n${contentSource}\n\nNow transform this text according to the instructions above:\n${processedText}`;
  }
  
  if (useStyleSource && styleSource) {
    systemPrompt += " Analyze and emulate the writing style from the provided style reference.";
    userContent = `Instructions: ${instructions}\n\nStyle reference (analyze and emulate this writing style):\n${styleSource}\n\nText to transform:\n${processedText}`;
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

// PURE HOMEWORK SOLVER - NO REWRITE LOGIC
export async function solveHomeworkWithAnthropic(assignment: string): Promise<string> {
  try {
    const message = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      system: "You are an expert tutor and academic assistant. Solve the following assignment thoroughly and step-by-step. Provide complete solutions, not just explanations. For math problems, show all work and provide final answers. For written questions, provide comprehensive responses. Actually solve the problems presented.",
      max_tokens: 4000,
      messages: [
        { role: 'user', content: `Please solve the following assignment completely:\n\n${assignment}` }
      ],
    });
    
    let responseContent = '';
    if (message.content && message.content.length > 0) {
      const contentBlock = message.content[0];
      if ('text' in contentBlock) {
        responseContent = contentBlock.text;
      }
    }
    
    return responseContent;
  } catch (error: any) {
    console.error("Anthropic homework solving error:", error);
    throw new Error(`Failed to solve homework with Anthropic: ${error.message}`);
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
  } catch (error: any) {
    console.error("Anthropic detection error:", error);
    throw new Error(`Failed to detect AI with Anthropic: ${error.message}`);
  }
}
