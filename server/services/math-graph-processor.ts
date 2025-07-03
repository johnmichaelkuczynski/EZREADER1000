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
    // Always check for mathematical content that might need graphing
    const hasMathContent = /f\(x\)|y\s*=|graph|plot|function|equation|derivative|integral/i.test(text) || 
                          /x\^|e\^|sin|cos|tan|log|ln|\+|\-|\*|\//.test(text);
    
    if (!hasMathContent) {
      return originalPrompt;
    }

    const graphingInstruction = `

CRITICAL GRAPHING REQUIREMENT:
This problem involves mathematical functions that MUST be graphed. You are REQUIRED to include graph placeholders.

MANDATORY FORMAT FOR ALL MATHEMATICAL FUNCTIONS:
1. Whenever you write ANY equation with f(x) = [expression] or y = [expression], you MUST immediately add the graph placeholder on the next line
2. Use EXACTLY this format: [GRAPH:expression]
3. NO exceptions - every mathematical function must have a graph

EXAMPLES (follow these exactly):
If you write: "The function f(x) = e^x"
You MUST add: [GRAPH:e^x]

If you write: "We have y = x^2 + 3x - 2"  
You MUST add: [GRAPH:x^2 + 3x - 2]

If you write: "The derivative is f'(x) = 2x + 3"
You MUST add: [GRAPH:2x + 3]

HOMEWORK GRAPHING REQUIREMENT:
This is homework requiring graphs. Failure to include [GRAPH:expression] placeholders will result in incomplete work. Include graph placeholders for EVERY mathematical function you mention.`;

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