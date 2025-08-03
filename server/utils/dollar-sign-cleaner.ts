/**
 * Critical function to prevent dollar sign formatting catastrophes
 * Replaces all monetary dollar signs with "X dollars" format to prevent
 * LaTeX math misinterpretation that corrupts document formatting
 */
export function removeDollarSigns(text: string): string {
  if (!text) return '';
  
  // Replace monetary amounts like $15, $150.50, $1,500 with "15 dollars", "150.50 dollars", "1,500 dollars"
  // This pattern matches: optional $ sign, followed by numbers with optional commas and decimal points
  text = text.replace(/\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g, '$1 dollars');
  
  // Replace $N patterns where N is a variable (like $N, $X, $Y, etc.)
  text = text.replace(/\$([A-Za-z][A-Za-z0-9]*)/g, '$1 dollars');
  
  // Replace any remaining isolated dollar signs
  text = text.replace(/\$/g, 'dollars');
  
  return text;
}

/**
 * Enhanced system prompt that instructs LLMs to never generate dollar signs
 */
export function getDollarSignFreePrompt(): string {
  return `CRITICAL FORMATTING RULE: NEVER use dollar signs ($) in your response. Instead of writing "$15" write "15 dollars". Instead of "$N" write "N dollars". This prevents serious formatting issues. Always convert monetary amounts to the "X dollars" format.`;
}