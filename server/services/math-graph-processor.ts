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
   * Process text to identify mathematical functions and add graph instructions
   */
  static processTextForGraphs(text: string): string {
    // Look for mathematical functions that should be graphed
    const graphInstructions = this.extractGraphInstructions(text);
    
    if (graphInstructions.length === 0) {
      return text;
    }

    let processedText = text;

    // Add graph generation instructions to the text
    graphInstructions.forEach((instruction, index) => {
      const graphPlaceholder = `\n\n[GRAPH_${index + 1}:${instruction.equation}:${instruction.type}]\n\n`;
      
      // Find the equation in the text and add the graph instruction after it
      const equationPatterns = [
        new RegExp(`(f\\(x\\)\\s*=\\s*${this.escapeRegex(instruction.equation)})`, 'gi'),
        new RegExp(`(y\\s*=\\s*${this.escapeRegex(instruction.equation)})`, 'gi'),
        new RegExp(`(g\\(x\\)\\s*=\\s*${this.escapeRegex(instruction.equation)})`, 'gi')
      ];

      for (const pattern of equationPatterns) {
        if (pattern.test(processedText)) {
          processedText = processedText.replace(pattern, `$1${graphPlaceholder}`);
          break;
        }
      }
    });

    return processedText;
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
   * Add graph generation instructions to LLM prompt
   */
  static enhancePromptForGraphing(originalPrompt: string, text: string): string {
    const graphInstructions = this.extractGraphInstructions(text);
    
    if (graphInstructions.length === 0) {
      return originalPrompt;
    }

    const graphingInstruction = `

IMPORTANT GRAPHING INSTRUCTIONS:
- When you encounter mathematical functions in this problem, you MUST include graphs
- For any equation like f(x) = [expression], y = [expression], etc., add a graph placeholder immediately after the equation
- Use this exact format: [GRAPH:equation_here]
- Examples:
  * After "f(x) = x^2 + 2x - 1", add: [GRAPH:x^2 + 2x - 1]
  * After "y = sin(x) + cos(2x)", add: [GRAPH:sin(x) + cos(2x)]
  * After solving and getting "f(x) = 3x^3 - 2x + 5", add: [GRAPH:3x^3 - 2x + 5]

- Include graphs for:
  * Original functions
  * Solutions to equations
  * Derivatives when asked
  * Any function that needs visualization

This is a homework assignment that requires mathematical graphing. Do not skip the graph placeholders.`;

    return originalPrompt + graphingInstruction;
  }
}

/**
 * Post-process LLM output to replace graph placeholders with actual graph instructions
 */
export function processGraphPlaceholders(text: string): string {
  // Replace [GRAPH:equation] placeholders with instructions for client-side rendering
  const graphPattern = /\[GRAPH:([^\]]+)\]/g;
  
  return text.replace(graphPattern, (match, equation) => {
    return `\n\n**Graph:**\n[RENDER_GRAPH:${equation.trim()}]\n\n`;
  });
}