// GPTZero API integration for AI detection
// Documentation: https://gptzero.me/docs/api

const GPTZERO_API_URL = 'https://api.gptzero.me/v2/predict/text';

export interface GPTZeroResponse {
  documents: Array<{
    completely_generated_prob: number;
    overall_burstiness: number;
    paragraphs: Array<{
      generated_prob: number;
      perplexity: number;
      burstiness: number;
    }>;
  }>;
  isHuman: boolean;
  isGenerated: boolean;
}

export async function detectAIWithGPTZero(text: string): Promise<{ 
  isAI: boolean; 
  confidence: number; 
  details: string;
}> {
  try {
    // Truncate text to fit GPTZero's 50,000 character limit
    const maxLength = 45000; // Leave some buffer
    const truncatedText = text.length > maxLength 
      ? text.substring(0, maxLength) + "\n\n[Text truncated for analysis]"
      : text;
    
    const response = await fetch(GPTZERO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Api-Key': process.env.GPTZERO_API_KEY || ""
      },
      body: JSON.stringify({
        document: truncatedText,
        docType: 'text'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GPTZero API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json() as GPTZeroResponse;
    
    // Calculate confidence from GPTZero response
    const confidence = data.documents[0]?.completely_generated_prob || 0;
    
    // Build detailed result
    const burstiness = data.documents[0]?.overall_burstiness || 0;
    const paragraphAnalysis = data.documents[0]?.paragraphs?.map((p, i) => 
      `Paragraph ${i+1}: ${Math.round((p.generated_prob || 0) * 100)}% AI probability, Perplexity: ${p.perplexity?.toFixed(2) || 'N/A'}, Burstiness: ${p.burstiness?.toFixed(2) || 'N/A'}`
    ).join("\n") || "No paragraph analysis available";
    
    return {
      isAI: data.isGenerated,
      confidence,
      details: `Overall AI probability: ${Math.round(confidence * 100)}%\nOverall burstiness: ${burstiness?.toFixed(2) || 'N/A'}\n\n${paragraphAnalysis}`
    };
  } catch (error) {
    console.error("GPTZero detection error:", error);
    
    if (process.env.GPTZERO_API_KEY) {
      throw new Error(`Failed to detect AI with GPTZero: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } else {
      console.log("GPTZero API key not found, falling back to model-based detection");
      throw new Error("GPTZero API key not configured");
    }
  }
}
