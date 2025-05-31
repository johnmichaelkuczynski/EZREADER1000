import fetch from 'node-fetch';

interface GoogleVisionResponse {
  responses: Array<{
    textAnnotations?: Array<{
      description: string;
      boundingPoly?: any;
    }>;
    fullTextAnnotation?: {
      text: string;
    };
    error?: {
      code: number;
      message: string;
    };
  }>;
}

export async function extractTextFromImageWithGoogleVision(imageBuffer: Buffer, mimeType: string): Promise<{ text: string; confidence?: number }> {
  const apiKey = process.env.GOOGLE_CLOUD_VISION_KEY;

  if (!apiKey) {
    throw new Error('Google Cloud Vision API key not configured. Please set GOOGLE_CLOUD_VISION_KEY environment variable.');
  }

  try {
    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');

    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Image
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 1
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Vision API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json() as GoogleVisionResponse;

    if (!result.responses || result.responses.length === 0) {
      throw new Error('No response from Google Vision API');
    }

    const visionResponse = result.responses[0];

    if (visionResponse.error) {
      throw new Error(`Google Vision error: ${visionResponse.error.message}`);
    }

    // Get text from fullTextAnnotation or first textAnnotation
    let extractedText = '';
    
    if (visionResponse.fullTextAnnotation?.text) {
      extractedText = visionResponse.fullTextAnnotation.text;
    } else if (visionResponse.textAnnotations && visionResponse.textAnnotations.length > 0) {
      extractedText = visionResponse.textAnnotations[0].description;
    }
    
    if (!extractedText.trim()) {
      throw new Error('No text could be extracted from the image');
    }

    return {
      text: extractedText.trim(),
      confidence: 0.9 // Google Vision doesn't provide confidence scores for text detection
    };

  } catch (error) {
    console.error('Google Vision OCR error:', error);
    throw new Error(`Failed to extract text from image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}