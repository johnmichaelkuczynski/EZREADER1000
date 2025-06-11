import fetch from 'node-fetch';

interface MathpixResponse {
  text: string;
  latex_styled?: string;
  confidence?: number;
  error?: string;
}

function formatMathForMathJax(latexText: string): string {
  if (!latexText) return '';
  
  // Replace common Mathpix LaTeX patterns with MathJax-compatible format
  let formatted = latexText;
  
  // Handle display math blocks
  formatted = formatted.replace(/\$\$([\s\S]*?)\$\$/g, '\\[$1\\]');
  
  // Handle inline math
  formatted = formatted.replace(/\$(.*?)\$/g, '\\($1\\)');
  
  // Handle LaTeX environments that should be display math
  formatted = formatted.replace(/\\begin{(equation|align|gather|multline|split|alignat|flalign)\*?}([\s\S]*?)\\end{(equation|align|gather|multline|split|alignat|flalign)\*?}/g, 
    '\\[\\begin{$1}$2\\end{$3}\\]');
  
  // Handle fraction formatting
  formatted = formatted.replace(/\\frac{([^}]+)}{([^}]+)}/g, '\\frac{$1}{$2}');
  
  // Ensure proper spacing around math blocks
  formatted = formatted.replace(/(\\\[[^]*?\\\])/g, '\n\n$1\n\n');
  formatted = formatted.replace(/(\\\(.*?\\\))/g, ' $1 ');
  
  // Clean up excessive whitespace
  formatted = formatted.replace(/\n\s*\n\s*\n/g, '\n\n');
  formatted = formatted.trim();
  
  return formatted;
}

export async function extractTextFromImageWithMathpix(imageBuffer: Buffer, mimeType: string): Promise<{ text: string; confidence?: number }> {
  const appId = process.env.MATHPIX_APP_ID;
  const apiKey = process.env.MATHPIX_API_KEY;

  if (!appId || !apiKey) {
    throw new Error('Mathpix credentials not configured. Please set MATHPIX_APP_ID and MATHPIX_API_KEY environment variables.');
  }

  try {
    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64Image}`;

    const response = await fetch('https://api.mathpix.com/v3/text', {
      method: 'POST',
      headers: {
        'app_id': appId,
        'app_key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        src: dataUri,
        formats: ['text', 'latex_styled'],
        data_options: {
          include_asciimath: true,
          include_latex: true
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

    // Process and format the mathematical content properly
    let extractedText = '';
    
    if (result.latex_styled) {
      // Convert Mathpix LaTeX to MathJax format
      extractedText = formatMathForMathJax(result.latex_styled);
    } else if (result.text) {
      // Use plain text if no LaTeX available, but still format any math notation
      extractedText = formatMathForMathJax(result.text);
    }
    
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