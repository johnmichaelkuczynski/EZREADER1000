/**
 * Restore math placeholder tokens back to proper LaTeX format
 */
export function restoreMathTokens(text: string): string {
  if (!text) return text;
  
  // Restore inline math tokens - pattern: [[MATHINLINE...]]
  let restored = text.replace(/\[\[MATHINLINE([^\]]+)\]\]/g, (match, content) => {
    // Extract the math content and wrap in LaTeX inline delimiters
    return `\\(${content}\\)`;
  });
  
  // Restore block math tokens - pattern: [[MATHBLOCK...]]
  restored = restored.replace(/\[\[MATHBLOCK([^\]]+)\]\]/g, (match, content) => {
    // Extract the math content and wrap in LaTeX block delimiters
    return `\\[${content}\\]`;
  });
  
  return restored;
}