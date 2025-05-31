import pdfParse from 'pdf-parse';

/**
 * Convert common mathematical expressions to LaTeX format
 */
function formatMathExpressions(text: string): string {
  let formatted = text;
  
  // Convert common math patterns to LaTeX
  // Fractions like (x^2 - 4)/(x - 2) -> \frac{x^2 - 4}{x - 2}
  formatted = formatted.replace(/\(([^)]+)\)\/\(([^)]+)\)/g, '\\frac{$1}{$2}');
  
  // Simple fractions like a/b -> \frac{a}{b} (when a and b are simple expressions)
  formatted = formatted.replace(/([a-zA-Z0-9\^{}+-]+)\/([a-zA-Z0-9\^{}+-]+)/g, '\\frac{$1}{$2}');
  
  // Limits like lim_{x -> 2} -> \lim_{x \to 2}
  formatted = formatted.replace(/lim_\{([^}]+)\}/g, '\\lim_{$1}');
  formatted = formatted.replace(/->/g, '\\to');
  
  // Square roots like sqrt(x) -> \sqrt{x}
  formatted = formatted.replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}');
  formatted = formatted.replace(/sqrtx/g, '\\sqrt{x}');
  formatted = formatted.replace(/√/g, '\\sqrt');
  
  // Exponents in expressions like x^2 -> x^{2}
  formatted = formatted.replace(/([a-zA-Z])\^(\d+)/g, '$1^{$2}');
  formatted = formatted.replace(/([a-zA-Z])\^([a-zA-Z])/g, '$1^{$2}');
  
  // Handle expressions like 3x^2 -> 3x^{2}
  formatted = formatted.replace(/(\d+[a-zA-Z])\^(\d+)/g, '$1^{$2}');
  
  // Convert ln to \ln
  formatted = formatted.replace(/\bln\(/g, '\\ln(');
  
  // Convert log to \log
  formatted = formatted.replace(/\blog\(/g, '\\log(');
  
  // Convert sin, cos, tan to LaTeX
  formatted = formatted.replace(/\bsin\(/g, '\\sin(');
  formatted = formatted.replace(/\bcos\(/g, '\\cos(');
  formatted = formatted.replace(/\btan\(/g, '\\tan(');
  
  // Handle mathematical expressions that start with f(x) = or g(x) = etc.
  formatted = formatted.replace(/^(\s*[a-zA-Z]\([^)]*\)\s*=\s*.+)$/gm, '$$$$1$$');
  
  // Handle derivative notation like f'(x)
  formatted = formatted.replace(/([a-zA-Z])'/g, '$1\'');
  
  // Wrap lines that contain mathematical operators and variables
  formatted = formatted.replace(/^(\s*[a-zA-Z]\([^)]*\)\s*=\s*[^=]*[\+\-\*/\^][^=]*)$/gm, '$$$$1$$');
  
  // Handle expressions that are clearly mathematical (contain fractions, limits, etc.)
  formatted = formatted.replace(/^(\s*.*\\(?:frac|lim|sqrt|ln|log|sin|cos|tan).*)$/gm, '$$$$1$$');
  
  return formatted;
}

/**
 * Extract text from a PDF buffer with multiple fallback methods
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  // Try multiple extraction methods with different configurations
  const extractionMethods = [
    // Method 1: Standard extraction
    () => pdfParse(pdfBuffer, {
      max: 0,
      version: 'v1.10.100'
    }),
    
    // Method 2: Relaxed parsing for corrupted PDFs
    () => pdfParse(pdfBuffer, {
      max: 0,
      normalizeWhitespace: false,
      disableCombineTextItems: true
    }),
    
    // Method 3: Basic extraction with minimal options
    () => pdfParse(pdfBuffer),
    
    // Method 4: Force extraction with error tolerance
    () => pdfParse(pdfBuffer, {
      max: 0,
      pagerender: (pageData: any) => {
        try {
          return pageData.getTextContent();
        } catch (e) {
          return Promise.resolve({ items: [] });
        }
      }
    })
  ];

  let lastError: Error | null = null;
  
  for (let i = 0; i < extractionMethods.length; i++) {
    try {
      console.log(`Attempting PDF extraction method ${i + 1}...`);
      const data = await extractionMethods[i]();
      
      // Extract text and metadata
      const { text, info, numpages } = data;
      
      // Create a formatted output with metadata if available
      let result = '';
      
      // Add metadata if available
      if (info) {
        if (info.Title) result += `Title: ${info.Title}\n`;
        if (info.Author) result += `Author: ${info.Author}\n`;
        if (info.Subject) result += `Subject: ${info.Subject}\n`;
        if (info.Keywords) result += `Keywords: ${info.Keywords}\n`;
        if (numpages) result += `Pages: ${numpages}\n`;
        
        // Add a separator if we have metadata
        if (result.length > 0) result += '\n';
      }
      
      // Add the extracted text with math formatting
      result += formatMathExpressions(text);
      
      // If text is empty or very short, try next method or show note
      if (text.trim().length < 10 && i < extractionMethods.length - 1) {
        console.log(`Method ${i + 1} extracted minimal text, trying next method...`);
        continue;
      }
      
      // If still minimal text on last method, add helpful note
      if (text.trim().length < 10) {
        result += '\n\n[Note: This PDF appears to contain mostly images or has minimal text. For image-based PDFs, consider using the image OCR feature by taking screenshots of the pages.]';
      }
      
      console.log(`PDF extraction successful with method ${i + 1}`);
      return result;
      
    } catch (error) {
      console.error(`PDF extraction method ${i + 1} failed:`, error);
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Continue to next method unless this is the last one
      if (i < extractionMethods.length - 1) {
        continue;
      }
    }
  }
  
  // All methods failed, provide helpful error message
  console.error('All PDF extraction methods failed:', lastError);
  const errorMessage = lastError?.message || 'Unknown error';
  
  // Provide more helpful error messages for common PDF issues
  if (errorMessage.includes('bad XRef') || errorMessage.includes('XRef')) {
    throw new Error('This PDF has structural issues. Try converting it to a new PDF using an online PDF converter, or use the image OCR feature by taking screenshots of the pages.');
  } else if (errorMessage.includes('Invalid PDF') || errorMessage.includes('not a PDF')) {
    throw new Error('The uploaded file is not a valid PDF document. Please ensure you are uploading a proper PDF file.');
  } else if (errorMessage.includes('password') || errorMessage.includes('encrypted')) {
    throw new Error('This PDF is password-protected or encrypted. Please upload an unprotected PDF file or remove the password protection.');
  } else {
    throw new Error(`Could not extract text from this PDF. The file may be image-based, corrupted, or have compatibility issues. Try using the image OCR feature by taking screenshots of the pages instead.`);
  }
}