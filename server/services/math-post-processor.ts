/**
 * Post-process text to enhance math formatting using Azure OpenAI
 */
import { enhanceMathFormatting } from './azure-math';

export async function postProcessMathContent(text: string): Promise<string> {
  if (!text) return text;
  
  try {
    // Use Azure OpenAI to enhance all mathematical content
    const enhancedText = await enhanceMathFormatting(text);
    return enhancedText;
  } catch (error) {
    console.error('Math post-processing failed:', error);
    return text;
  }
}