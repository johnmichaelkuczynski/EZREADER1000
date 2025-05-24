import pdfParse from 'pdf-parse';

/**
 * Extract text from a PDF buffer using the PDF.js library
 * This handles proper text extraction from PDF documents
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    // Use pdf-parse to extract text from the PDF
    const data = await pdfParse(pdfBuffer);
    
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
    
    // Add the extracted text
    result += text;
    
    return result;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
  }
}