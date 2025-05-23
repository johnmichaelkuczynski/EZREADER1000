import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ProcessTextOptions {
  text: string;
  instructions: string;
  contentSource?: string;
  useContentSource: boolean;
  maxTokens?: number;
}

export async function processTextWithOpenAI(options: ProcessTextOptions): Promise<string> {
  const { text, instructions, contentSource, useContentSource, maxTokens = 4000 } = options;
  
  let systemPrompt = "You are a helpful assistant that transforms text according to user instructions.";
  
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
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    });
    
    return response.choices[0].message.content || "";
  } catch (error) {
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
