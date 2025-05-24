import Anthropic from '@anthropic-ai/sdk';
import { ProcessTextOptions } from './openai';
import { protectMathFormulas, restoreMathFormulas } from "../utils/math-formula-protection";

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function processTextWithAnthropic(options: ProcessTextOptions): Promise<string> {
  const { text, instructions, contentSource, useContentSource, maxTokens = 4000 } = options;
  
  // Protect math formulas before processing
  const { processedText, mathBlocks } = protectMathFormulas(text);
  
  let systemPrompt = "You are an assistant that transforms text according to user instructions. Do not modify any content within [[MATH_BLOCK_*]] or [[MATH_INLINE_*]] tokens as they contain special mathematical notation.";
  
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
