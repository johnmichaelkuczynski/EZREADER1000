import pdfParse from 'pdf-parse';

/**
 * Extract text from a PDF buffer with minimal processing
 * This focuses on preserving the original text while cleaning up common PDF extraction issues
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    // Use pdf-parse to extract text from the PDF
    const data = await pdfParse(pdfBuffer, {
      // Keep original formatting as much as possible
      normalizeWhitespace: false,
      disableCombineTextItems: true
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
    
    // Process the extracted text with minimal changes
    let processedText = text;
    
    // Only mark up very complex mathematical expressions
    // Look for LaTeX-style math environments which are clear indicators of math content
    processedText = processedText.replace(
      /\\begin\{(?:equation|align|gather|multline|eqnarray|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|array)\}[\s\S]*?\\end\{(?:equation|align|gather|multline|eqnarray|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|array)\}/g,
      (match) => `\n[COMPLEX MATH EXPRESSION]\n`
    );
    
    // Clean up common PDF extraction issues
    processedText = processedText
      // Fix excessive whitespace
      .replace(/\s{3,}/g, '\n\n')
      // Fix line breaks in the middle of sentences (common in PDFs)
      .replace(/(\w)-\n(\w)/g, '$1$2')
      // Remove page numbers that appear as single numbers on lines
      .replace(/^\s*\d+\s*$/gm, '')
      // Clean up bullet points
      .replace(/•/g, '* ');
    
    // Add the cleaned text
    result += processedText;
    
    return result;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
  }
}