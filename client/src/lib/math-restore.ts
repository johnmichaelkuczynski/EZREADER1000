/**
 * Restore math placeholder tokens back to proper LaTeX format
 */
export function restoreMathTokens(text: string): string {
  if (!text) return text;
  
  // Handle the actual format being generated: [[MATHINLINE22/7]]
  let restored = text.replace(/\[\[MATHINLINE([^\]]+)\]\]/g, (match, content) => {
    // Extract the math content and wrap in LaTeX inline delimiters
    return `$${content}$`;
  });
  
  // Handle block math format: [[MATHBLOCK...]]
  restored = restored.replace(/\[\[MATHBLOCK([^\]]+)\]\]/g, (match, content) => {
    // Extract the math content and wrap in LaTeX block delimiters
    return `$$${content}$$`;
  });
  
  // Also handle the server format: [[MATH_INLINE_X]] and [[MATH_BLOCK_X]]
  restored = restored.replace(/\[\[MATH_INLINE_\d+\]\]/g, (match) => {
    // For now, just remove the placeholder - the actual restoration should happen on server
    return match;
  });
  
  restored = restored.replace(/\[\[MATH_BLOCK_\d+\]\]/g, (match) => {
    // For now, just remove the placeholder - the actual restoration should happen on server
    return match;
  });
  
  return restored;
}