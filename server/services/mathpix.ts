import fetch from 'node-fetch';

interface MathpixResponse {
  text: string;
  latex_styled?: string;
  confidence?: number;
  error?: string;
}

export async function extractTextFromImageWithMathpix(imageBuffer: Buffer, mimeType: string): Promise<{ text: string; confidence?: number }> {
  const appId = process.env.MATHPIX_APP_ID;
  const appKey = process.env.MATHPIX_APP_KEY;

  if (!appId || !appKey) {
    throw new Error('Mathpix credentials not configured. Please set MATHPIX_APP_ID and MATHPIX_APP_KEY environment variables.');
  }

  try {
    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    const response = await fetch('https://api.mathpix.com/v3/text', {
      method: 'POST',
      headers: {
        'app_id': appId,
        'app_key': appKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        src: dataUri,
        formats: ['text', 'latex_styled'],
        data_options: {
          include_line_data: true,
          include_word_data: true
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mathpix API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as MathpixResponse;

    if (result.error) {
      throw new Error(`Mathpix error: ${result.error}`);
    }

    // Prefer latex_styled for math content, fallback to text
    const extractedText = result.latex_styled || result.text || '';
    
    if (!extractedText.trim()) {
      throw new Error('No text could be extracted from the image');
    }

    return {
      text: extractedText,
      confidence: result.confidence
    };

  } catch (error) {
    console.error('Mathpix OCR error:', error);
    throw new Error(`Failed to extract text from image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}