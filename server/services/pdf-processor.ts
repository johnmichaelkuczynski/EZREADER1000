import pdfParse from 'pdf-parse';

/**
 * Extract text from a PDF buffer with no processing
 * This preserves the exact text as extracted by pdf-parse
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    // Use pdf-parse to extract text from the PDF with error recovery options
    const data = await pdfParse(pdfBuffer, {
      // Enable max buffer size to handle large PDFs
      max: 0,
      // Add page render options for better text extraction
      pagerender: undefined,
      // Version compatibility
      version: 'v1.10.100'
    });
    
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
    
    // Add the raw extracted text without any processing
    result += text;
    
    // If text is empty or very short, the PDF might be image-based
    if (text.trim().length < 10) {
      result += '\n\n[Note: This PDF appears to contain mostly images or has minimal text. For image-based PDFs, consider using the image OCR feature by taking screenshots of the pages.]';
    }
    
    return result;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Provide more helpful error messages for common PDF issues
    if (errorMessage.includes('bad XRef') || errorMessage.includes('XRef')) {
      throw new Error('This PDF file appears to be corrupted or has an invalid structure. Please try a different PDF file or convert it to a new PDF format.');
    } else if (errorMessage.includes('Invalid PDF') || errorMessage.includes('not a PDF')) {
      throw new Error('The uploaded file is not a valid PDF document. Please ensure you are uploading a proper PDF file.');
    } else if (errorMessage.includes('password') || errorMessage.includes('encrypted')) {
      throw new Error('This PDF is password-protected or encrypted. Please upload an unprotected PDF file.');
    } else {
      throw new Error(`Failed to extract text from PDF: ${errorMessage}. The PDF may be corrupted, password-protected, or image-based.`);
    }
  }
}