import { ProcessTextOptions } from './openai';
import { protectMathFormulas, restoreMathFormulas } from "../utils/math-formula-protection";

const API_URL = 'https://api.perplexity.ai/chat/completions';

// Utility function to estimate token count for Perplexity models
function estimateTokenCount(text: string): number {
  // Perplexity typically counts tokens at ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

// Utility function to split very large text into smaller chunks
function splitIntoChunks(text: string, maxChunkTokens: number = 30000): string[] {
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

// Process extremely large text by chunking and sampling for Perplexity
async function processLargeTextWithPerplexity(options: ProcessTextOptions): Promise<string> {
  const { text, instructions, contentSource, useContentSource, maxTokens = 4000 } = options;
  
  console.log("Processing extremely large document with specialized Perplexity approach");
  
  // Step 1: Split the text into manageable chunks
  const MAX_CHUNK_TOKENS = 30000; // Safe limit for Perplexity models
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
    
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `${enhancedInstructions}\n\nText to transform:\n${processedText}` }
    ];
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY || ""}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages,
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: maxTokens * 2, // Allow more output tokens for comprehensive processing
        stream: false,
        presence_penalty: 0,
        frequency_penalty: 1
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const processedContent = data.choices[0].message.content;
    
    // Restore math formulas in the processed text
    const finalResult = restoreMathFormulas(processedContent, mathBlocks);
    
    return finalResult;
  } catch (error: any) {
    console.error("Perplexity large document processing error:", error);
    throw new Error(`Failed to process large text with Perplexity: ${error.message}`);
  }
}

export async function processTextWithPerplexity(options: ProcessTextOptions): Promise<string> {
  const { text, instructions, contentSource, useContentSource, maxTokens = 4000 } = options;
  
  // Estimate token count to check for large documents
  const estimatedTokens = estimateTokenCount(text);
  const MAX_INPUT_TOKENS = 100000; // Perplexity's Llama model supports up to 128k, leaving buffer
  
  // Handle extremely large documents with special processing
  if (estimatedTokens > MAX_INPUT_TOKENS) {
    console.log(`Document exceeds Perplexity token limit (${estimatedTokens} tokens). Using document summarization approach.`);
    return await processLargeTextWithPerplexity(options);
  }
  
  // Standard processing for normal-sized documents
  // Protect math formulas before processing
  const { processedText, mathBlocks } = protectMathFormulas(text);
  
  // Base system prompt
  let systemPrompt = "Transform the provided text according to the instructions. Do not modify any content within [[MATH_BLOCK_*]] or [[MATH_INLINE_*]] tokens as they contain special mathematical notation.";
  
  // Check if instructions contain keywords about shortening
  const requestsShorterOutput = instructions.toLowerCase().includes('shorter') || 
                               instructions.toLowerCase().includes('summarize') || 
                               instructions.toLowerCase().includes('reduce') ||
                               instructions.toLowerCase().includes('condense') ||
                               instructions.toLowerCase().includes('brief');
  
  // Add the instruction about length unless user has specified they want shorter output
  if (!requestsShorterOutput) {
    systemPrompt += " IMPORTANT: Unless explicitly requested otherwise, your rewrite MUST be longer than the original text. Add more examples, explanations, or details to make the content more comprehensive.";
  } else {
    systemPrompt += " Be precise and concise as requested.";
  }
  
  // Use the protected text with math formulas replaced by tokens
  let userContent = `Instructions: ${instructions}\n\nText to transform:\n${processedText}`;
  
  if (useContentSource && contentSource) {
    userContent += `\n\nAdditional content source for reference:\n${contentSource}`;
  }
  
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent }
  ];
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY || ""}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages,
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: maxTokens,
        stream: false,
        presence_penalty: 0,
        frequency_penalty: 1
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const processedContent = data.choices[0].message.content;
    
    // Restore math formulas in the processed text
    const finalResult = restoreMathFormulas(processedContent, mathBlocks);
    
    return finalResult;
  } catch (error: any) {
    console.error("Perplexity processing error:", error);
    throw new Error(`Failed to process text with Perplexity: ${error.message}`);
  }
}

export async function detectAIWithPerplexity(text: string): Promise<{ isAI: boolean; confidence: number; details: string }> {
  const systemPrompt = "You are an AI content detection expert. Analyze the text and determine if it was likely generated by AI. Return a JSON object with these fields: isAI (boolean), confidence (number between 0 and 1), and details (string with explanation).";
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY || ""}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 1000,
        stream: false
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    let result: any = { isAI: false, confidence: 0.5, details: "Analysis failed" };
    
    try {
      // Try to extract JSON from the response
      const matches = content.match(/\{[\s\S]*\}/);
      if (matches && matches[0]) {
        result = JSON.parse(matches[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse Perplexity JSON response:", parseError);
      // Extract information from the text response as fallback
      result.details = content;
      result.isAI = content.toLowerCase().includes("ai generated") || 
                    content.toLowerCase().includes("written by ai");
    }
    
    return {
      isAI: Boolean(result.isAI),
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
      details: result.details || "No analysis details provided"
    };
  } catch (error) {
    console.error("Perplexity detection error:", error);
    throw new Error(`Failed to detect AI with Perplexity: ${error.message}`);
  }
}
