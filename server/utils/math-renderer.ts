/**
 * Comprehensive math rendering utilities for LaTeX expressions
 */

/**
 * Enhanced math protection that preserves LaTeX integrity
 */
export function protectMathExpressions(text: string): { 
  processedText: string, 
  mathBlocks: Map<string, string> 
} {
  const mathBlocks = new Map<string, string>();
  let count = 0;
  let processedText = text;
  
  // Helper function to create unique tokens
  const createToken = () => {
    const token = `__PROTECTED_MATH_${String(count).padStart(4, '0')}__`;
    count++;
    return token;
  };
  
  // Protect display math blocks first (highest priority)
  // LaTeX display math \[ ... \]
  processedText = processedText.replace(/\\\[([\s\S]*?)\\\]/g, (match) => {
    const token = createToken();
    mathBlocks.set(token, match.trim());
    return ` ${token} `;
  });
  
  // Display math $$...$$
  processedText = processedText.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
    const token = createToken();
    mathBlocks.set(token, match.trim());
    return ` ${token} `;
  });
  
  // LaTeX inline math \( ... \)
  processedText = processedText.replace(/\\\(([\s\S]*?)\\\)/g, (match) => {
    const token = createToken();
    mathBlocks.set(token, match.trim());
    return ` ${token} `;
  });
  
  // Inline math $...$ with strict validation
  processedText = processedText.replace(/\$([^\s$][^$]*?[^\s$])\$/g, (match, content) => {
    // Must contain mathematical characters to avoid currency
    if (/[a-zA-Z\\{}^_=+\-*/()[\]∑∫∂∆∇∞≈≠≤≥±√∪∩⊂⊃∈∅φψχΩωαβγδεζηθικλμνξπρστυφχψωΓΔΘΛΞΠΣΦΨΩ]/.test(content)) {
      const token = createToken();
      mathBlocks.set(token, match.trim());
      return ` ${token} `;
    }
    return match;
  });
  
  return { processedText, mathBlocks };
}

/**
 * Restore math expressions with proper spacing
 */
export function restoreMathExpressions(text: string, mathBlocks: Map<string, string>): string {
  let restoredText = text;
  
  // Replace tokens with original math expressions
  mathBlocks.forEach((formula, token) => {
    const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    restoredText = restoredText.replace(new RegExp(escapedToken, 'g'), formula);
  });
  
  // Clean up spacing around math expressions
  restoredText = restoredText
    .replace(/\s+\\\[/g, '\n\n\\[')  // Display math gets new lines
    .replace(/\\\]\s+/g, '\\]\n\n')
    .replace(/\s+\$\$/g, '\n\n$$')   // Display math gets new lines
    .replace(/\$\$\s+/g, '$$\n\n')
    .replace(/\s+\\\(/g, ' \\(')     // Inline math gets single spaces
    .replace(/\\\)\s+/g, '\\) ')
    .replace(/\s+\$([^$]+)\$/g, ' $$$1$$')  // Inline math gets single spaces
    .replace(/\$([^$]+)\$\s+/g, '$$$1$$ ');
  
  return restoredText;
}

/**
 * Normalize LaTeX expressions for consistent rendering
 */
export function normalizeLaTeX(text: string): string {
  return text
    // Standardize common LaTeX commands
    .replace(/\\log_(\w+)/g, '\\log_{$1}')
    .replace(/\\sum_([^{])/g, '\\sum_{$1}')
    .replace(/\\int_([^{])/g, '\\int_{$1}')
    // Fix common spacing issues
    .replace(/([a-zA-Z])_([a-zA-Z0-9])/g, '$1_{$2}')
    .replace(/([a-zA-Z])\^([a-zA-Z0-9])/g, '$1^{$2}')
    // Ensure proper fraction formatting
    .replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}')
    // Clean up whitespace in math expressions
    .replace(/\$\s+/g, '$')
    .replace(/\s+\$/g, '$')
    .replace(/\\\[\s+/g, '\\[')
    .replace(/\s+\\\]/g, '\\]');
}

/**
 * Convert text with math to HTML with proper MathJax delimiters
 */
export function prepareMathForHTML(text: string): string {
  let processedText = normalizeLaTeX(text);
  
  // Ensure proper MathJax delimiters
  processedText = processedText
    // Convert LaTeX display to MathJax display
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$1$$')
    // Ensure display math has proper spacing
    .replace(/\$\$([\s\S]*?)\$\$/g, '\n\n$$$$1$$\n\n')
    // Convert LaTeX inline to MathJax inline
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$')
    // Clean up excessive newlines
    .replace(/\n{3,}/g, '\n\n');
  
  return processedText;
}

/**
 * Extract and validate math expressions from text
 */
export function extractMathExpressions(text: string): {
  displayMath: string[],
  inlineMath: string[],
  hasValidMath: boolean
} {
  const displayMath: string[] = [];
  const inlineMath: string[] = [];
  
  // Extract display math
  const displayMatches = text.match(/(\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$)/g);
  if (displayMatches) {
    displayMath.push(...displayMatches);
  }
  
  // Extract inline math
  const inlineMatches = text.match(/(\\\([\s\S]*?\\\)|\$[^$\n]+\$)/g);
  if (inlineMatches) {
    inlineMath.push(...inlineMatches.filter(match => {
      // Validate it's actually math, not currency
      const content = match.replace(/[\\\(\)$]/g, '');
      return /[a-zA-Z\\{}^_=+\-*/()[\]∑∫∂∆∇∞≈≠≤≥±√∪∩⊂⊃∈∅]/.test(content);
    }));
  }
  
  return {
    displayMath,
    inlineMath,
    hasValidMath: displayMath.length > 0 || inlineMath.length > 0
  };
}

/**
 * Safe text chunking that preserves math expressions
 */
export function safeMathChunking(text: string, maxChunkSize: number = 3000): string[] {
  const { processedText, mathBlocks } = protectMathExpressions(text);
  
  // Split on paragraph boundaries primarily
  const paragraphs = processedText.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) continue;
    
    // If adding this paragraph would exceed chunk size, start new chunk
    if (currentChunk && (currentChunk.length + trimmedParagraph.length) > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(restoreMathExpressions(currentChunk.trim(), mathBlocks));
      }
      currentChunk = trimmedParagraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph;
    }
  }
  
  // Add the last chunk
  if (currentChunk.trim()) {
    chunks.push(restoreMathExpressions(currentChunk.trim(), mathBlocks));
  }
  
  return chunks.filter(chunk => chunk.trim().length > 0);
}