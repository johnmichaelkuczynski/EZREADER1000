/**
 * Server-side math graph processing service
 * Identifies mathematical functions in text and generates graph placeholders
 */

export interface GraphInstruction {
  equation: string;
  type: 'function' | 'derivative' | 'integral';
  domain?: [number, number];
  range?: [number, number];
  title?: string;
}

export class MathGraphProcessor {
  /**
   * Process text to identify mathematical functions and add graph instructions (DISABLED)
   */
  static processTextForGraphs(text: string): string {
    // DISABLED: This was causing inappropriate graph generation in non-math documents
    // Return original text without processing
    return text;
  }

  /**
   * Extract graph instructions from mathematical text
   */
  private static extractGraphInstructions(text: string): GraphInstruction[] {
    const instructions: GraphInstruction[] = [];
    
    // Common patterns that indicate graphing is needed
    const graphingKeywords = [
      'plot', 'graph', 'sketch', 'draw', 'chart',
      'visualize', 'show graphically', 'plot the function',
      'graph the equation', 'sketch the curve'
    ];

    const hasGraphingKeyword = graphingKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );

    if (!hasGraphingKeyword) {
      return instructions; // No graphing requested
    }

    // Extract mathematical functions
    const functionPatterns = [
      /f\(x\)\s*=\s*([^,\n.!?]+)/gi,
      /y\s*=\s*([^,\n.!?]+)/gi,
      /g\(x\)\s*=\s*([^,\n.!?]+)/gi,
      /h\(x\)\s*=\s*([^,\n.!?]+)/gi
    ];

    functionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const equation = match[1].trim()
          .replace(/[.!?;,]*$/, '') // Remove trailing punctuation
          .trim();
        
        if (this.isValidMathExpression(equation)) {
          // Determine graph type based on context
          let type: 'function' | 'derivative' | 'integral' = 'function';
          
          const contextBefore = text.substring(Math.max(0, match.index - 100), match.index);
          const contextAfter = text.substring(match.index, match.index + 100);
          const context = (contextBefore + contextAfter).toLowerCase();
          
          if (context.includes('derivative') || context.includes("f'") || context.includes('differentiate')) {
            type = 'derivative';
          } else if (context.includes('integral') || context.includes('integrate') || context.includes('area under')) {
            type = 'integral';
          }

          instructions.push({
            equation,
            type,
            title: `Graph of ${equation}`
          });
        }
      }
    });

    return instructions;
  }

  /**
   * Check if expression is a valid mathematical function
   */
  private static isValidMathExpression(expression: string): boolean {
    // Must contain x variable for graphing
    if (!expression.includes('x')) {
      return false;
    }

    // Check for common mathematical functions and operators
    const mathPattern = /^[x\d\s+\-*/^().\w,]+$/;
    const hasValidChars = mathPattern.test(expression);

    // Check for mathematical functions
    const mathFunctions = ['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'abs', 'exp'];
    const hasMathFunction = mathFunctions.some(func => expression.includes(func));

    // Basic polynomial/algebraic expression
    const hasBasicMath = /[x\d+\-*/^]/.test(expression);

    return hasValidChars && (hasMathFunction || hasBasicMath);
  }

  /**
   * Escape special regex characters
   */
  private static escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Add graph generation instructions to LLM prompt (DISABLED)
   */
  static enhancePromptForGraphing(originalPrompt: string, text: string): string {
    // DISABLED: This was causing inappropriate graph generation in non-math documents
    // Only return original prompt without adding graphing instructions
    return originalPrompt;
  }
}

/**
 * Post-process LLM output to replace graph placeholders with actual graph instructions (DISABLED)
 */
export function processGraphPlaceholders(text: string): string {
  // DISABLED: This was causing inappropriate graph generation in non-math documents
  // Return original text without processing graph placeholders
  return text;
}