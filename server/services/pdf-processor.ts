import pdfParse from 'pdf-parse';
import { protectMathFormulas, restoreMathFormulas } from '../utils/math-formula-protection';

/**
 * Extract text from a PDF buffer using pdf-parse
 * This handles proper text extraction from PDF documents and preserves math formulas
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    // Use pdf-parse to extract text from the PDF
    const data = await pdfParse(pdfBuffer, {
      // Override default pdf-parse options to better handle math
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
    
    // Process the extracted text to preserve mathematical formulas
    let processedText = text;
    
    // Pre-process the text to improve math detection
    // 1. Normalize dollar signs that might be split across lines
    processedText = processedText.replace(/\$\s+\$/g, '$$');
    
    // 2. Insert proper spacing around math delimiters to help with recognition
    processedText = processedText.replace(/([^$])\$/g, '$1 $');
    processedText = processedText.replace(/\$([^$])/g, '$ $1');
    
    // 3. Try to detect and format potential LaTeX blocks
    const mathDetectionRegex = /\\(?:sum|int|frac|sqrt|alpha|beta|gamma|delta|theta|lambda|sigma|omega|infty|partial|nabla|begin\{|end\{)/g;
    
    if (mathDetectionRegex.test(processedText) || processedText.includes('$$')) {
      console.log('Math notation detected in PDF, preserving format');
      
      // Format block math with proper spacing
      processedText = processedText.replace(/(\$\$[\s\S]*?\$\$)/g, '\n$1\n');
      
      // Format inline math for better preservation
      // This helps with formulas that might be split across lines
      const mathLines = processedText.split('\n');
      const fixedLines = mathLines.map(line => {
        // Count dollar signs in the line to detect potential inline math
        const dollarCount = (line.match(/\$/g) || []).length;
        
        // If we have an odd number of $ signs, it might be incomplete math
        // spanning multiple lines. Try to be smart about it.
        if (dollarCount % 2 !== 0 && dollarCount > 0) {
          // Mark potential incomplete math for reconstruction
          if (line.lastIndexOf('$') === line.length - 1) {
            return line + ' [[MATH_CONT]]';
          } else if (line.indexOf('$') === 0) {
            return '[[MATH_CONT]] ' + line;
          }
        }
        return line;
      });
      
      // Rejoin and handle continuation markers
      processedText = fixedLines.join('\n')
        .replace(/\[\[MATH_CONT\]\]\s*\n\s*\[\[MATH_CONT\]\]/g, ' ');
    }
    
    // Add the processed text with preserved math notation
    result += processedText;
    
    return result;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
  }
}