import pdfParse from 'pdf-parse';

/**
 * Extract text from a PDF buffer with clear math section markup
 * This approach clearly labels math sections rather than trying to preserve exact notation
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
    
    // Process the extracted text to identify mathematical sections
    let processedText = text;
    
    // Detect potential math sections using LaTeX-like patterns
    // We'll wrap these in special markers for clear identification
    let mathBlockCount = 1;
    let inlineCount = 1;
    
    // First, mark up full equation blocks with proper spacing
    processedText = processedText.replace(
      /(\$\$[\s\S]*?\$\$)/g, 
      (_match, content) => `\n[[MATHBLOCK${mathBlockCount++}]]\n`
    );
    
    // Find potential LaTeX commands
    processedText = processedText.replace(
      /\\(?:sum|int|frac|sqrt|alpha|beta|gamma|delta|theta|lambda|sigma|omega|infty|partial|nabla|begin\{.*?\}[\s\S]*?end\{.*?\})/g,
      (match) => `[[MATHEXPRESSION${inlineCount++}: ${match}]]`
    );
    
    // Find potential inline math between dollar signs but not currency
    // This uses negative lookbehind to avoid marking up currency
    processedText = processedText.replace(
      /(?<![0-9])\$(.*?)\$/g,
      (_match, content) => `[[INLINEMATH${inlineCount++}]]`
    );
    
    // Identify lines with unusual symbol density that might be math
    const lines = processedText.split('\n');
    const processedLines = lines.map(line => {
      // Check if the line has a high ratio of math-like symbols
      const mathSymbols = line.match(/[\+\-\*\/\=\(\)\[\]\{\}\^\_\<\>]/g) || [];
      const symbolRatio = mathSymbols.length / (line.length || 1);
      
      // If high symbol ratio and not already marked as math, tag it
      if (symbolRatio > 0.15 && 
          !line.includes('[[MATHBLOCK') && 
          !line.includes('[[INLINEMATH') &&
          !line.includes('[[MATHEXPRESSION')) {
        return `[[POSSIBLE_MATH${mathBlockCount++}]]\n${line}`;
      }
      return line;
    });
    
    // Reassemble the text
    result += processedLines.join('\n');
    
    return result;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
  }
}