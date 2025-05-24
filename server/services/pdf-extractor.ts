/**
 * Simple text extraction from PDF buffer
 * This doesn't rely on any external libraries that might need test files
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    // Convert buffer to string and look for text patterns
    const pdfString = pdfBuffer.toString('utf-8', 0, pdfBuffer.length);
    
    // Format the output with basic information
    let result = `# PDF Document\n`;
    result += `Size: ${Math.round(pdfBuffer.length / 1024)} KB\n\n`;
    
    // Try to extract some metadata
    const titleMatch = pdfString.match(/\/Title\s*\(([^)]+)\)/i);
    if (titleMatch && titleMatch[1]) {
      result += `Title: ${titleMatch[1].trim()}\n`;
    }
    
    const authorMatch = pdfString.match(/\/Author\s*\(([^)]+)\)/i);
    if (authorMatch && authorMatch[1]) {
      result += `Author: ${authorMatch[1].trim()}\n`;
    }
    
    // Extract readable text portions
    const textParts: string[] = [];
    
    // Look for text blocks in PDF format
    const textMatches = pdfString.match(/\(([A-Za-z0-9\s.,;:'"!?()-]{5,})\)/g) || [];
    if (textMatches.length > 0) {
      // Process only the text segments that look meaningful
      const cleanSegments = textMatches
        .map(seg => seg.substring(1, seg.length - 1)) // Remove parentheses
        .filter(seg => seg.length > 10 && /[a-zA-Z]{3,}/.test(seg)) // Only text with actual words
        .map(seg => seg.replace(/\\n/g, '\n').replace(/\\r/g, '')) // Handle escaped newlines
        .slice(0, 200); // Limit to first 200 segments
      
      textParts.push(...cleanSegments);
    }
    
    // Add content section if we found text
    if (textParts.length > 0) {
      result += `\n## Content:\n\n${textParts.join(' ')}\n`;
    } else {
      result += `\nThis PDF file contains limited machine-readable text content. The document may consist primarily of images or scanned content.`;
    }
    
    return result;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    return 'Unable to extract text from this PDF format. The file may be encrypted or damaged.';
  }
}

/**
 * Process a PDF file buffer and extract its text
 */
export async function processPDFFile(fileBuffer: Buffer): Promise<string> {
  try {
    return await extractTextFromPDF(fileBuffer);
  } catch (error) {
    console.error('Error processing PDF file:', error);
    throw new Error('Failed to process PDF file');
  }
}