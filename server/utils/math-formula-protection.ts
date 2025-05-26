/**
 * Utility functions to protect and restore LaTeX math formulas during text processing
 */

/**
 * Protects LaTeX math formulas by replacing them with placeholder tokens
 * before sending text to LLMs for processing
 * 
 * @param text The original text containing LaTeX math formulas
 * @returns Text with math formulas replaced by placeholder tokens
 */
export function protectMathFormulas(text: string): { 
  processedText: string, 
  mathBlocks: Map<string, string> 
} {
  const mathBlocks = new Map<string, string>();
  let count = 0;
  
  // Process block math formulas ($$...$$)
  const processedText = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
    const token = `[[MATH_BLOCK_${count}]]`;
    mathBlocks.set(token, match);
    count++;
    return token;
  });
  
  // Also process inline math formulas ($...$) 
  // but make sure we don't match currency symbols like $50
  // Look for dollar signs with non-whitespace content between them
  const finalProcessed = processedText.replace(/\$([^\s$][^$]*?[^\s$])\$/g, (match, formula) => {
    const token = `[[MATH_INLINE_${count}]]`;
    mathBlocks.set(token, match);
    count++;
    return token;
  });
  
  return { 
    processedText: finalProcessed, 
    mathBlocks 
  };
}

/**
 * Restores LaTeX math formulas by replacing placeholder tokens with original formulas
 * 
 * @param text The processed text with placeholder tokens
 * @param mathBlocks Map of placeholder tokens to original LaTeX formulas
 * @returns Original text with math formulas restored
 */
export function restoreMathFormulas(text: string, mathBlocks: Map<string, string>): string {
  let restoredText = text;
  
  // Replace all placeholder tokens with their original math formulas
  mathBlocks.forEach((formula, token) => {
    restoredText = restoredText.replace(new RegExp(escapeRegExp(token), 'g'), formula);
  });
  
  return restoredText;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}