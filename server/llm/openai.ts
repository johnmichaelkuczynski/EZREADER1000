import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

function splitIntoChunks(text: string, maxChunkTokens: number = 32000): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\s*\n/);
  let currentChunk = '';
  let currentTokenCount = 0;
  
  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokenCount(paragraph);
    
    if (paragraphTokens > maxChunkTokens) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
        currentTokenCount = 0;
      }
      
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
    } else if (currentTokenCount + paragraphTokens > maxChunkTokens && currentChunk) {
      chunks.push(currentChunk);
      currentChunk = paragraph;
      currentTokenCount = paragraphTokens;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      currentTokenCount += paragraphTokens;
    }
  }
  
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

import { protectMathFormulas, restoreMathFormulas } from "../utils/math-formula-protection";

// Process large documents by processing ALL chunks with full content
async function processLargeTextWithOpenAI(options: ProcessTextOptions): Promise<string> {
  const { text, instructions, contentSource, styleSource, useContentSource, useStyleSource, maxTokens = 4000 } = options;
  
  console.log("Processing large document - sending ALL content to LLM");
  
  const MAX_CHUNK_TOKENS = 32000;
  const chunks = splitIntoChunks(text, MAX_CHUNK_TOKENS);
  console.log(`Processing ${chunks.length} chunks with full content`);
  
  let processedResults: string[] = [];
  
  // Process each chunk with its FULL content
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Processing chunk ${i + 1}/${chunks.length} - ${chunk.length} characters`);
    
    try {
      const { processedText, mathBlocks } = protectMathFormulas(chunk);
      
      let systemPrompt = "Process the full content provided. Do not modify any content within [[MATH_BLOCK_*]] or [[MATH_INLINE_*]] tokens as they contain mathematical notation. When you encounter LaTeX math notation like \\( \\) or \\[ \\], convert it to clean readable text format. For example, convert \\( Q: \\) to just Q: and \\( P: \\) to just P:.";
      
      let userPrompt = `${instructions}\n\nThis is chunk ${i + 1} of ${chunks.length} from a larger document. Process this ENTIRE chunk according to the instructions:\n\n${processedText}`;
      
      // Add content source if provided
      if (useContentSource && contentSource) {
        userPrompt = `${instructions}\n\nUse this content as reference material (do not copy it, use it to enhance your response):\n${contentSource}\n\nNow process this chunk ${i + 1} of ${chunks.length} according to the instructions above:\n${processedText}`;
      }
      
      // Add style source if provided
      if (useStyleSource && styleSource) {
        userPrompt = `${instructions}\n\nStyle reference (analyze and emulate this writing style):\n${styleSource}\n\nProcess this chunk ${i + 1} of ${chunks.length}:\n${processedText}`;
      }
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      });

      const result = response.choices[0]?.message?.content || '';
      const finalResult = restoreMathFormulas(result, mathBlocks);
      processedResults.push(finalResult);
      
    } catch (error: any) {
      console.error(`Error processing chunk ${i + 1}:`, error);
      
      // If it's a token limit error, try with a smaller chunk
      if (error.message?.includes('maximum context length')) {
        console.log(`Chunk ${i + 1} too large, splitting further...`);
        try {
          // Split this chunk into smaller pieces
          const smallerChunks = splitIntoChunks(chunk, 16000);
          let smallChunkResults = [];
          
          for (let j = 0; j < smallerChunks.length; j++) {
            const smallChunk = smallerChunks[j];
            const { processedText: smallProcessedText, mathBlocks: smallMathBlocks } = protectMathFormulas(smallChunk);
            
            const smallResponse = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                { role: "system", content: "Process the content provided. Do not modify any content within [[MATH_BLOCK_*]] or [[MATH_INLINE_*]] tokens as they contain mathematical notation. When you encounter LaTeX math notation like \\( \\) or \\[ \\], convert it to clean readable text format. For example, convert \\( Q: \\) to just Q: and \\( P: \\) to just P:." },
                { role: "user", content: `${instructions}\n\nThis is part ${j + 1} of ${smallerChunks.length} from chunk ${i + 1}:\n\n${smallProcessedText}` }
              ],
              max_tokens: 2000,
              temperature: 0.7,
            });
            
            const smallResult = smallResponse.choices[0]?.message?.content || '';
            const smallFinalResult = restoreMathFormulas(smallResult, smallMathBlocks);
            smallChunkResults.push(smallFinalResult);
          }
          
          processedResults.push(smallChunkResults.join('\n\n'));
        } catch (splitError: any) {
          console.error(`Error processing split chunk ${i + 1}:`, splitError);
          processedResults.push(`[Error: Document section too large to process - ${splitError.message}]`);
        }
      } else {
        processedResults.push(`[Error processing chunk ${i + 1}: ${error.message}]`);
      }
    }
  }
  
  return processedResults.join('\n\n');
}

export async function processTextWithOpenAI(options: ProcessTextOptions): Promise<string> {
  const { text, instructions, contentSource, styleSource, useContentSource, useStyleSource, maxTokens = 4000, examMode = false } = options;
  
  // For pure passthrough - send text directly without any system prompts or processing instructions
  if (!instructions || instructions.trim() === "" || instructions.trim() === "PASSTHROUGH") {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: text }],
      max_tokens: maxTokens,
      temperature: 0.7,
    });
    return response.choices[0]?.message?.content || '';
  }
  
  // Check if document is too large for single processing
  const estimatedTokens = estimateTokenCount(text);
  const MAX_INPUT_TOKENS = 50000; // Reduced limit to prevent token overflow
  
  if (estimatedTokens > MAX_INPUT_TOKENS) {
    console.log(`Large document detected: ${estimatedTokens} tokens. Using chunk processing.`);
    return await processLargeTextWithOpenAI(options);
  }
  
  // Regular processing for smaller documents
  try {
    const { processedText, mathBlocks } = protectMathFormulas(text);
    
    // Pure passthrough mode - no system prompts, just send the content directly
    if (instructions.trim() === "PASSTHROUGH" || (!examMode && instructions.trim() === "")) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: processedText }],
        max_tokens: maxTokens,
        temperature: 0.7,
      });
      const result = response.choices[0]?.message?.content || '';
      return restoreMathFormulas(result, mathBlocks);
    }

    let systemPrompt = examMode 
      ? `You are a highly skilled mathematics student taking an exam. Your task is to solve ALL mathematical problems, answer ALL questions, and complete ALL exercises found in the document. 

CRITICAL EXAM RULES:
1. SOLVE every mathematical problem you encounter - show full work and final answers
2. ANSWER every question posed in the document
3. COMPLETE every exercise or assignment 
4. For integrals: Calculate them step by step and provide numerical answers
5. For equations: Solve them completely 
6. For word problems: Set up equations and solve
7. For proofs: Provide complete mathematical proofs
8. Use proper mathematical notation and LaTeX formatting
9. Do not modify content within [[MATH_BLOCK_*]] or [[MATH_INLINE_*]] tokens
10. Your goal is to get 100% on this exam by solving everything correctly

You are NOT just rewriting - you are SOLVING and ANSWERING everything as a student would on an exam.`
      : "Process the content provided. Do not modify any content within [[MATH_BLOCK_*]] or [[MATH_INLINE_*]] tokens as they contain mathematical notation. When you encounter LaTeX math notation like \\( \\) or \\[ \\], convert it to clean readable text format. For example, convert \\( Q: \\) to just Q: and \\( P: \\) to just P:.";
    
    let userPrompt = examMode 
      ? `EXAM INSTRUCTIONS: You are taking a mathematics exam. Solve ALL problems, answer ALL questions, and complete ALL exercises in this document. Show your work and provide final answers.

Document to solve:\n${processedText}`
      : `${instructions}\n\n${processedText}`;
    
    if (useContentSource && contentSource) {
      userPrompt = `${instructions}\n\nUse this content as reference material (do not copy it, use it to enhance your response):\n${contentSource}\n\nNow process this content according to the instructions above:\n${processedText}`;
    }
    
    if (useStyleSource && styleSource) {
      userPrompt = `${instructions}\n\nStyle reference (analyze and emulate this writing style):\n${styleSource}\n\nContent to process:\n${processedText}`;
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    });

    const result = response.choices[0]?.message?.content || '';
    return restoreMathFormulas(result, mathBlocks);
    
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
          content: "You are an AI detection expert. Analyze the provided text and determine if it was likely written by AI or human. Respond with a JSON object containing: isAI (boolean), confidence (0-1), and details (string explanation)."
        },
        {
          role: "user",
          content: `Please analyze this text for AI detection:\n\n${text}`
        }
      ],
      max_tokens: 500,
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content || '';
    
    try {
      const parsed = JSON.parse(result);
      return {
        isAI: parsed.isAI || false,
        confidence: parsed.confidence || 0,
        details: parsed.details || 'Analysis completed'
      };
    } catch {
      // Fallback if JSON parsing fails
      const isAI = result.toLowerCase().includes('ai') || result.toLowerCase().includes('artificial');
      return {
        isAI,
        confidence: 0.5,
        details: result
      };
    }
  } catch (error: any) {
    console.error("OpenAI AI detection error:", error);
    return {
      isAI: false,
      confidence: 0,
      details: `Error during AI detection: ${error.message}`
    };
  }
}

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer]), 'audio.wav');
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OpenAI transcription failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.text || '';
  } catch (error: any) {
    console.error("OpenAI transcription error:", error);
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}