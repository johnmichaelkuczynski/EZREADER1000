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
  let processedText = text;
  
  // STEP 1: Process LaTeX display math \[ ... \]
  processedText = processedText.replace(/\\\[([\s\S]*?)\\\]/g, (match) => {
    const token = `__MATH_BLOCK_${String(count).padStart(3, '0')}__`;
    mathBlocks.set(token, match);
    count++;
    return token;
  });
  
  // STEP 2: Process display math $$...$$
  processedText = processedText.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
    const token = `__MATH_BLOCK_${String(count).padStart(3, '0')}__`;
    mathBlocks.set(token, match);
    count++;
    return token;
  });
  
  // STEP 3: Process LaTeX inline math \( ... \)
  processedText = processedText.replace(/\\\(([\s\S]*?)\\\)/g, (match) => {
    const token = `__MATH_BLOCK_${String(count).padStart(3, '0')}__`;
    mathBlocks.set(token, match);
    count++;
    return token;
  });
  
  // STEP 4: Process inline math $...$ (avoiding currency symbols)
  // Match $ followed by non-whitespace, content, and ending with non-whitespace $
  processedText = processedText.replace(/\$([^\s$][^$]*?[^\s$])\$/g, (match) => {
    // Additional check to avoid currency: must contain math-like characters
    if (/[a-zA-Z\\{}^_=+\-*/()[\]]/.test(match)) {
      const token = `__MATH_BLOCK_${String(count).padStart(3, '0')}__`;
      mathBlocks.set(token, match);
      count++;
      return token;
    }
    return match; // Keep currency symbols unchanged
  });
  
  return { 
    processedText, 
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

/**
 * Splits text into semantic blocks for block-level processing
 * Preserves paragraph structure, lists, and headings
 */
export function splitIntoSemanticBlocks(text: string): string[] {
  const blocks: string[] = [];
  
  // Split by double newlines first (paragraph breaks)
  const paragraphs = text.split(/\n\s*\n/);
  
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    
    // Check if this is a list block
    const lines = trimmed.split('\n');
    if (lines.some(line => /^\s*[-•*]\s/.test(line))) {
      // This is a list - treat the entire list as one block
      blocks.push(trimmed);
    } else if (lines.length === 1 && (/^[A-Z].*:$/.test(trimmed) || /^#{1,6}\s/.test(trimmed))) {
      // This looks like a heading
      blocks.push(trimmed);
    } else {
      // Regular paragraph
      blocks.push(trimmed);
    }
  }
  
  return blocks;
}

/**
 * Reconstructs text from semantic blocks, preserving proper formatting
 */
export function reconstructFromBlocks(blocks: string[]): string {
  return blocks
    .filter(block => block.trim())
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n'); // Normalize excessive line breaks
}

/**
 * Enhanced math protection with block-level awareness
 */
export function protectMathAndStructure(text: string): {
  processedText: string,
  mathBlocks: Map<string, string>,
  semanticBlocks: string[]
} {
  // First protect math formulas
  const { processedText, mathBlocks } = protectMathFormulas(text);
  
  // Then split into semantic blocks
  const semanticBlocks = splitIntoSemanticBlocks(processedText);
  
  return {
    processedText,
    mathBlocks,
    semanticBlocks
  };
}

/**
 * Post-processing to restore math and normalize formatting
 */
export function restoreMathAndFormatting(text: string, mathBlocks: Map<string, string>): string {
  // First restore math formulas
  let restoredText = restoreMathFormulas(text, mathBlocks);
  
  // Normalize formatting
  restoredText = restoredText
    // Merge broken lines within paragraphs (but preserve intentional breaks)
    .replace(/([^\n])\n([^\n])/g, (match, before, after) => {
      // Don't merge if it looks like a list item or heading
      if (/^\s*[-•*]\s/.test(after) || /^#{1,6}\s/.test(after)) {
        return match;
      }
      return `${before} ${after}`;
    })
    // Preserve proper spacing between paragraphs
    .replace(/\n{3,}/g, '\n\n')
    // Restore bullet points and indentation
    .replace(/^(\s*)[-•*](\s+)/gm, '$1• $2');
  
  return restoredText;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}