import Anthropic from '@anthropic-ai/sdk';
import { ProcessTextOptions } from './openai';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function processTextWithAnthropic(options: ProcessTextOptions): Promise<string> {
  const { text, instructions, contentSource, useContentSource, maxTokens = 4000 } = options;
  
  let systemPrompt = "You are an assistant that transforms text according to user instructions.";
  let userContent = `Instructions: ${instructions}\n\nText to transform:\n${text}`;
  
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
    
    return message.content[0].text;
  } catch (error) {
    console.error("Anthropic processing error:", error);
    throw new Error(`Failed to process text with Anthropic: ${error.message}`);
  }
}

export async function detectAIWithAnthropic(text: string): Promise<{ isAI: boolean; confidence: number; details: string }> {
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
      // Parse the JSON from the response
      const matches = response.content[0].text.match(/\{[\s\S]*\}/);
      if (matches && matches[0]) {
        result = JSON.parse(matches[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse Anthropic JSON response:", parseError);
      // Extract information from the text response as fallback
      const content = response.content[0].text.toLowerCase();
      result.isAI = content.includes("ai generated") || content.includes("written by ai");
      result.details = response.content[0].text;
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
