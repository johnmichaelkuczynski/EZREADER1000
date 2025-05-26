/**
 * MathPix OCR API integration for extracting math from images and PDFs
 */

interface MathPixTextResponse {
  text: string;
  latex_styled?: string;
  data?: {
    latex?: string;
  };
}

interface MathPixPDFResponse {
  pdf_id: string;
  status: 'processing' | 'completed' | 'error';
  text?: string;
  latex_styled?: string;
  data?: {
    latex?: string;
  };
}

/**
 * Extract text and math from image using MathPix OCR
 */
export async function extractMathFromImage(imageBuffer: Buffer, mimeType: string): Promise<string> {
  const appId = process.env.MATHPIX_APP_ID;
  const appKey = process.env.MATHPIX_APP_KEY;
  
  if (!appId || !appKey) {
    throw new Error('MathPix credentials not configured');
  }

  const base64Image = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;

  try {
    const response = await fetch('https://api.mathpix.com/v3/text', {
      method: 'POST',
      headers: {
        'app_id': appId,
        'app_key': appKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        src: base64Image,
        formats: ['text', 'data'],
        data_options: { 
          include_latex: true,
          include_table_html: true
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MathPix API error: ${response.status} - ${errorText}`);
    }

    const result: MathPixTextResponse = await response.json();
    
    // Return the latex_styled content if available, otherwise fall back to text
    return result.latex_styled || result.text || '';
  } catch (error: any) {
    console.error('MathPix image processing error:', error);
    throw new Error(`Failed to extract math from image: ${error.message}`);
  }
}

/**
 * Extract text and math from PDF using MathPix OCR
 */
export async function extractMathFromPDF(pdfBuffer: Buffer): Promise<string> {
  const appId = process.env.MATHPIX_APP_ID;
  const appKey = process.env.MATHPIX_APP_KEY;
  
  if (!appId || !appKey) {
    throw new Error('MathPix credentials not configured');
  }

  try {
    // Step 1: Submit PDF for processing
    const formData = new FormData();
    formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'document.pdf');
    formData.append('options_json', JSON.stringify({
      formats: ['text', 'data'],
      data_options: { 
        include_latex: true,
        include_table_html: true
      }
    }));

    const submitResponse = await fetch('https://api.mathpix.com/v3/pdf', {
      method: 'POST',
      headers: {
        'app_id': appId,
        'app_key': appKey
      },
      body: formData
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`MathPix PDF submission error: ${submitResponse.status} - ${errorText}`);
    }

    const submitResult: { pdf_id: string } = await submitResponse.json();
    const pdfId = submitResult.pdf_id;

    // Step 2: Poll for completion
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts with 2 second intervals = 1 minute max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const statusResponse = await fetch(`https://api.mathpix.com/v3/pdf/${pdfId}`, {
        headers: {
          'app_id': appId,
          'app_key': appKey
        }
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        throw new Error(`MathPix PDF status error: ${statusResponse.status} - ${errorText}`);
      }

      const statusResult: MathPixPDFResponse = await statusResponse.json();
      
      if (statusResult.status === 'completed') {
        // Return the latex_styled content if available, otherwise fall back to text
        return statusResult.latex_styled || statusResult.text || '';
      } else if (statusResult.status === 'error') {
        throw new Error('MathPix PDF processing failed');
      }
      
      attempts++;
    }
    
    throw new Error('MathPix PDF processing timeout - took longer than expected');
  } catch (error: any) {
    console.error('MathPix PDF processing error:', error);
    throw new Error(`Failed to extract math from PDF: ${error.message}`);
  }
}