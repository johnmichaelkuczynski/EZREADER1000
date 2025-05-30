/**
 * Mathpix OCR service for extracting text and math from images
 */

interface MathpixResponse {
  text: string;
  latex_styled?: string;
  confidence?: number;
  error?: string;
}

export async function extractTextFromImage(imageBuffer: Buffer, mimeType: string): Promise<string> {
  const appId = process.env.MATHPIX_APP_ID;
  const appKey = process.env.MATHPIX_APP_KEY;

  if (!appId || !appKey) {
    throw new Error('Mathpix API credentials not configured');
  }

  try {
    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const response = await fetch('https://api.mathpix.com/v3/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'app_id': appId,
        'app_key': appKey,
      },
      body: JSON.stringify({
        src: dataUrl,
        formats: ['text', 'latex_styled'],
        data_options: {
          include_asciimath: true,
          include_latex: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mathpix API error: ${response.status} - ${errorText}`);
    }

    const result: MathpixResponse = await response.json();

    if (result.error) {
      throw new Error(`Mathpix OCR error: ${result.error}`);
    }

    // Return the text with LaTeX math formatting preserved
    return result.text || '';
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw new Error(`Failed to extract text from image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}