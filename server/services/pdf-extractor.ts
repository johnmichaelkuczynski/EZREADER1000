/**
 * Simple text extraction from PDF buffer
 * This doesn't rely on any external libraries that might need test files
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    // Convert buffer to text
    const pdfText = pdfBuffer.toString('utf8');
    
    // Extract readable text content using regex patterns commonly found in PDFs
    let extractedText = '';
    
    // Extract text objects marked with BT...ET (Begin Text/End Text)
    const textObjectRegex = /BT\s*([^]*?)\s*ET/g;
    let textMatch;
    
    while ((textMatch = textObjectRegex.exec(pdfText)) !== null) {
      // Process text objects to extract readable content
      const textObject = textMatch[1];
      
      // Extract text strings (marked with parentheses or angle brackets)
      const textStringRegex = /\((.*?)\)|<([0-9A-Fa-f]+)>/g;
      let stringMatch;
      
      while ((stringMatch = textStringRegex.exec(textObject)) !== null) {
        const textString = stringMatch[1] || '';
        if (textString.length > 0) {
          extractedText += textString + ' ';
        }
      }
    }
    
    // If nothing was extracted with the text object approach, try a simpler method
    if (extractedText.trim().length === 0) {
      // Look for text between parentheses (common in PDF text objects)
      const simpleTextRegex = /\(([^\)\\]+)\)/g;
      let simpleMatch;
      
      while ((simpleMatch = simpleTextRegex.exec(pdfText)) !== null) {
        if (simpleMatch[1] && simpleMatch[1].trim().length > 0) {
          extractedText += simpleMatch[1] + ' ';
        }
      }
    }
    
    // If still nothing, fall back to extracting readable characters
    if (extractedText.trim().length === 0) {
      // Filter only printable ASCII characters
      extractedText = pdfText
        .replace(/[^\x20-\x7E\r\n]/g, ' ')  // Keep only printable ASCII
        .replace(/\s+/g, ' ')               // Normalize whitespace
        .trim();
    }
    
    return extractedText.trim() || 'No text could be extracted from this PDF.';
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error extracting PDF text:', errorMessage);
    return `Error processing PDF: ${errorMessage}`;
  }
}