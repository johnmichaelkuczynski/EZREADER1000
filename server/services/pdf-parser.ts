/**
 * Simple text extraction from PDF buffer using Buffer processing
 * This is a backup method that doesn't rely on external libraries
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    // Convert buffer to text
    const pdfText = pdfBuffer.toString('utf8');
    
    // Basic extraction of readable text from PDF
    // This is a simplified extraction that works for text-based PDFs
    let extractedText = '';
    
    // Look for text between stream and endstream markers
    const regex = /stream([\s\S]*?)endstream/g;
    let match;
    
    while ((match = regex.exec(pdfText)) !== null) {
      // Extract content between stream and endstream
      const content = match[1];
      
      // Add only readable text content (filter out binary data)
      const readableText = content.replace(/[^\x20-\x7E\r\n]/g, '');
      if (readableText.trim().length > 0) {
        extractedText += readableText + '\n';
      }
    }
    
    // If we couldn't extract any text using the regex method,
    // fall back to direct string conversion (will be less clean but might work)
    if (extractedText.trim().length === 0) {
      extractedText = pdfText.replace(/[^\x20-\x7E\r\n]/g, '');
    }
    
    return extractedText || 'No text could be extracted from this PDF.';
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    return `Error processing PDF: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}