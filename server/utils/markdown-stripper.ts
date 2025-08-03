/**
 * Utility function to strip markdown syntax from text
 */
export function stripMarkdown(text: string): string {
  if (!text) return '';
  
  // Replace headers (### Header)
  text = text.replace(/#{1,6}\s+/g, '');
  
  // Replace bold/italic markers
  text = text.replace(/(\*\*|\*|__|_)/g, '');
  
  // Replace bullet points
  text = text.replace(/^\s*[\*\-\+]\s+/gm, '• ');
  
  // Replace numbered lists
  text = text.replace(/^\s*\d+\.\s+/gm, '');
  
  // Replace blockquotes
  text = text.replace(/^\s*>\s+/gm, '');
  
  // Replace code blocks
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`([^`]+)`/g, '$1');
  
  // Replace horizontal rules
  text = text.replace(/^\s*(\*{3,}|_{3,}|-{3,})\s*$/gm, '');
  
  // Replace links
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  
  // Replace images
  text = text.replace(/!\[([^\]]+)\]\([^\)]+\)/g, '');
  
  // Clean up multiple consecutive line breaks
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text;
}

/**
 * Strip markdown while preserving mathematical notation
 */
export function preserveMathAndStripMarkdown(text: string): string {
  if (!text) return '';
  
  // First, protect math expressions by temporarily replacing them
  const mathExpressions: string[] = [];
  const mathPlaceholder = 'ZZZMATHHOLDERZZZZ'; // Use format that won't be affected by markdown stripping
  
  // Protect inline math \( ... \)
  text = text.replace(/\\\((.*?)\\\)/g, (match, content) => {
    const index = mathExpressions.length;
    mathExpressions.push(`\\(${content}\\)`);
    return `${mathPlaceholder}${index}ZZZZ`;
  });
  
  // Protect display math \[ ... \]
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, content) => {
    const index = mathExpressions.length;
    mathExpressions.push(`\\[${content}\\]`);
    return `${mathPlaceholder}${index}ZZZZ`;
  });
  
  // Protect dollar sign math $ ... $
  text = text.replace(/\$([^$]+)\$/g, (match, content) => {
    const index = mathExpressions.length;
    mathExpressions.push(`\\(${content}\\)`); // Convert to \( \) format for consistency
    return `${mathPlaceholder}${index}ZZZZ`;
  });
  
  // Protect double dollar sign math $$ ... $$
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, content) => {
    const index = mathExpressions.length;
    mathExpressions.push(`\\[${content}\\]`); // Convert to \[ \] format for consistency
    return `${mathPlaceholder}${index}ZZZZ`;
  });
  
  // Handle standalone LaTeX expressions that aren't wrapped yet
  // Look for common mathematical expressions and wrap them
  
  // Handle function notation like (C, A) → R or f: A → B
  text = text.replace(/\(([^)]+)\)\s*\\rightarrow\s*\\mathbb\{([^}]+)\}/g, (match) => {
    const index = mathExpressions.length;
    mathExpressions.push(`\\(${match}\\)`);
    return `${mathPlaceholder}${index}ZZZZ`;
  });
  
  // Handle mathematical symbols that aren't wrapped
  text = text.replace(/\\rightarrow/g, (match) => {
    const index = mathExpressions.length;
    mathExpressions.push(`\\(${match}\\)`);
    return `${mathPlaceholder}${index}ZZZZ`;
  });
  
  text = text.replace(/\\mathbb\{([^}]+)\}/g, (match) => {
    const index = mathExpressions.length;
    mathExpressions.push(`\\(${match}\\)`);
    return `${mathPlaceholder}${index}ZZZZ`;
  });
  
  // Now strip markdown from the protected text
  text = stripMarkdown(text);
  
  // Restore math expressions
  mathExpressions.forEach((mathExpr, index) => {
    const placeholder = `${mathPlaceholder}${index}ZZZZ`;
    text = text.replaceAll(placeholder, mathExpr);
  });
  
  return text;
}