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