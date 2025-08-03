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
   * ONLY activates when both math content AND explicit graphing requests are present
   */
  static processTextForGraphs(text: string): string {
    // Check if this is actually a mathematical document with graphing requests
    if (!this.shouldProcessGraphs(text)) {
      return text; // No graph processing for non-math content
    }

    const instructions = this.extractGraphInstructions(text);
    if (instructions.length === 0) {
      return text; // No valid graphs found
    }

    let processedText = text;
    
    // Add graph placeholders for detected functions
    instructions.forEach(instruction => {
      const placeholder = `[RENDER_GRAPH:${instruction.equation}]`;
      
      // Find the equation in text and add graph placeholder after it
      const equationPattern = new RegExp(
        `(f\\(x\\)\\s*=\\s*${instruction.equation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|y\\s*=\\s*${instruction.equation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
        'gi'
      );
      
      if (equationPattern.test(processedText)) {
        processedText = processedText.replace(equationPattern, `$1\n\n${placeholder}\n`);
      }
    });

    return processedText;
  }

  /**
   * Determine if text should have graph processing applied
   */
  private static shouldProcessGraphs(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Must have mathematical content
    const hasMathContent = /f\(x\)\s*=|y\s*=|derivative|integral|function|equation/.test(lowerText);
    
    // Must have explicit graphing requests
    const hasGraphingRequest = /plot|graph|sketch|draw|chart|visualize|show graphically/.test(lowerText);
    
    // Exclude non-mathematical academic content
    const isNonMathAcademic = /law|legal|philosophy|literature|history|economics.*behavior|political|social/.test(lowerText) && 
                              !/mathematical.*economics|econometrics|quantitative/.test(lowerText);
    
    return hasMathContent && hasGraphingRequest && !isNonMathAcademic;
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
   * Add graph generation instructions to LLM prompt ONLY for mathematical content
   */
  static enhancePromptForGraphing(originalPrompt: string, text: string): string {
    // Only enhance prompt if this is mathematical content with graphing requests
    if (!this.shouldProcessGraphs(text)) {
      return originalPrompt; // No enhancement for non-math content
    }

    const graphingInstructions = `

If the text contains mathematical functions that should be graphed (indicated by words like "plot", "graph", "sketch", or "visualize"), add appropriate graph placeholders using the format: [RENDER_GRAPH:equation]

Only add graphs for functions that are explicitly requested to be visualized. Do not add graphs for every mathematical expression.`;

    return originalPrompt + graphingInstructions;
  }
}

/**
 * Post-process LLM output to replace graph placeholders with actual graph instructions (DISABLED)
 */
export function processGraphPlaceholders(text: string): string {
  // Only process graph placeholders if this appears to be mathematical content
  const lowerText = text.toLowerCase();
  const hasMathContent = /f\(x\)\s*=|y\s*=|\[render_graph:/.test(lowerText);
  
  if (!hasMathContent) {
    return text; // No processing for non-math content
  }

  // Process existing graph placeholders generated by LLMs
  return MathGraphProcessor.processTextForGraphs(text);
}