import { evaluate } from 'mathjs';

export interface GraphConfig {
  equation: string;
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  width?: number;
  height?: number;
  title?: string;
  grid?: boolean;
  color?: string;
}

export interface GraphResult {
  svg: string;
  equation: string;
  domain: string;
  range?: string;
}

/**
 * Parse mathematical equations and generate SVG graphs
 */
export class MathGraphing {
  private static defaultConfig: Partial<GraphConfig> = {
    xMin: -10,
    xMax: 10,
    yMin: -10,
    yMax: 10,
    width: 400,
    height: 300,
    grid: true,
    color: '#2563eb'
  };

  /**
   * Generate a graph for a mathematical function
   */
  static async generateGraph(config: GraphConfig): Promise<GraphResult> {
    const fullConfig = { ...this.defaultConfig, ...config };
    
    try {
      // Generate points for the function
      const points = this.generateFunctionPoints(config.equation, fullConfig);
      
      // Create SVG
      const svg = this.createSVGGraph(points, fullConfig);
      
      return {
        svg,
        equation: config.equation,
        domain: `[${fullConfig.xMin}, ${fullConfig.xMax}]`,
        range: `[${fullConfig.yMin}, ${fullConfig.yMax}]`
      };
    } catch (error) {
      throw new Error(`Failed to generate graph: ${error}`);
    }
  }

  /**
   * Generate points for mathematical function using Math.js
   */
  private static generateFunctionPoints(equation: string, config: Partial<GraphConfig>): Array<{x: number, y: number}> {
    const points: Array<{x: number, y: number}> = [];
    const stepSize = (config.xMax! - config.xMin!) / 200; // 200 points
    
    // Convert equation to evaluable expression
    const mathExpression = MathGraphing.convertToMathJSExpression(equation);
    
    for (let x = config.xMin!; x <= config.xMax!; x += stepSize) {
      try {
        const y = evaluate(mathExpression, { x });
        if (typeof y === 'number' && isFinite(y)) {
          points.push({ x, y });
        }
      } catch (error) {
        // Skip invalid points
        continue;
      }
    }
    
    return points;
  }

  /**
   * Create SVG graph from points
   */
  private static createSVGGraph(points: Array<{x: number, y: number}>, config: Partial<GraphConfig>): string {
    const { width, height, xMin, xMax, yMin, yMax, title, grid, color } = config;
    
    // Calculate actual y range from data if not specified
    let actualYMin = yMin!;
    let actualYMax = yMax!;
    
    if (points.length > 0) {
      const yValues = points.map(p => p.y);
      const dataYMin = Math.min(...yValues);
      const dataYMax = Math.max(...yValues);
      
      // Expand range slightly for better visibility
      const yRange = dataYMax - dataYMin;
      const padding = yRange * 0.1;
      actualYMin = Math.min(actualYMin, dataYMin - padding);
      actualYMax = Math.max(actualYMax, dataYMax + padding);
    }
    
    // SVG coordinate conversion functions
    const scaleX = (x: number) => ((x - xMin!) / (xMax! - xMin!)) * width!;
    const scaleY = (y: number) => height! - ((y - actualYMin) / (actualYMax - actualYMin)) * height!;
    
    let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background: white;">`;
    
    // Add grid if enabled
    if (grid) {
      svg += '<defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e5e5" stroke-width="1"/></pattern></defs>';
      svg += `<rect width="100%" height="100%" fill="url(#grid)" />`;
    }
    
    // Add axes
    const centerX = scaleX(0);
    const centerY = scaleY(0);
    
    // X-axis
    if (actualYMin <= 0 && actualYMax >= 0) {
      svg += `<line x1="0" y1="${centerY}" x2="${width}" y2="${centerY}" stroke="#666" stroke-width="2"/>`;
    }
    
    // Y-axis  
    if (xMin! <= 0 && xMax! >= 0) {
      svg += `<line x1="${centerX}" y1="0" x2="${centerX}" y2="${height}" stroke="#666" stroke-width="2"/>`;
    }
    
    // Add axis labels (clean, no math notation in SVG)
    svg += `<text x="10" y="15" font-family="Arial" font-size="12" fill="#666">Function Graph</text>`;
    
    // Add axis markers
    const numTicks = 5;
    const xStep = (xMax! - xMin!) / numTicks;
    const yStep = (actualYMax - actualYMin) / numTicks;
    
    // X-axis markers
    for (let i = 0; i <= numTicks; i++) {
      const x = xMin! + i * xStep;
      const screenX = scaleX(x);
      if (actualYMin <= 0 && actualYMax >= 0) {
        svg += `<line x1="${screenX}" y1="${centerY - 5}" x2="${screenX}" y2="${centerY + 5}" stroke="#666" stroke-width="1"/>`;
        if (Math.abs(x) > 0.01) {
          svg += `<text x="${screenX}" y="${centerY + 20}" text-anchor="middle" font-family="Arial" font-size="10" fill="#666">${x.toFixed(1)}</text>`;
        }
      }
    }
    
    // Y-axis markers  
    for (let i = 0; i <= numTicks; i++) {
      const y = actualYMin + i * yStep;
      const screenY = scaleY(y);
      if (xMin! <= 0 && xMax! >= 0) {
        svg += `<line x1="${centerX - 5}" y1="${screenY}" x2="${centerX + 5}" y2="${screenY}" stroke="#666" stroke-width="1"/>`;
        if (Math.abs(y) > 0.01) {
          svg += `<text x="${centerX - 20}" y="${screenY + 3}" text-anchor="middle" font-family="Arial" font-size="10" fill="#666">${y.toFixed(1)}</text>`;
        }
      }
    }
    
    // Plot the function
    if (points.length > 1) {
      let pathData = `M ${scaleX(points[0].x)} ${scaleY(points[0].y)}`;
      
      for (let i = 1; i < points.length; i++) {
        pathData += ` L ${scaleX(points[i].x)} ${scaleY(points[i].y)}`;
      }
      
      svg += `<path d="${pathData}" fill="none" stroke="${color}" stroke-width="2"/>`;
    }
    
    // Add title
    if (title) {
      svg += `<text x="${width! / 2}" y="25" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="#333">${title}</text>`;
    }
    
    svg += '</svg>';
    return svg;
  }

  /**
   * Convert mathematical notation to Math.js evaluable expression
   */
  private static convertToMathJSExpression(equation: string): string {
    // Math.js handles most mathematical notation naturally
    let mathExpression = equation.trim();
    
    console.log('Converting equation:', equation, 'to math expression');
    
    // Handle e^x pattern specifically
    if (mathExpression === 'e^x') {
      mathExpression = 'exp(x)';
    } else {
      // Handle more complex e^x patterns
      mathExpression = mathExpression.replace(/e\^([^+\-*/\s()]+)/g, 'exp($1)');
      mathExpression = mathExpression.replace(/e\^\(([^)]+)\)/g, 'exp($1)');
    }
    
    // Math.js uses ^ for exponentiation, which it already supports
    // Replace other common patterns
    mathExpression = mathExpression
      .replace(/\bln\(/g, 'log(')        // ln -> log in Math.js
      .replace(/\bsin\b/g, 'sin')
      .replace(/\bcos\b/g, 'cos')
      .replace(/\btan\b/g, 'tan');
    
    console.log('Converted to:', mathExpression);
    return mathExpression;
  }

  /**
   * Convert mathematical notation to LaTeX format for proper rendering
   */
  private static convertToLatexNotation(equation: string): string {
    let latexEquation = equation.trim();
    
    // Convert common patterns to LaTeX
    latexEquation = latexEquation
      .replace(/e\^([^+\-*/\s()]+)/g, 'e^{$1}')     // e^x -> e^{x}
      .replace(/e\^\(([^)]+)\)/g, 'e^{$1}')         // e^(expression) -> e^{expression}
      .replace(/\^([^{}\s]+)/g, '^{$1}')            // x^2 -> x^{2}
      .replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}')    // sqrt(x) -> \sqrt{x}
      .replace(/\bpi\b/g, '\\pi')                   // pi -> \pi
      .replace(/\binfty\b/g, '\\infty');            // infty -> \infty
    
    return latexEquation;
  }

  /**
   * Parse multiple equations from text and identify graphable functions
   */
  static extractGraphableEquations(text: string): string[] {
    const equations: string[] = [];
    
    // Look for function notation like f(x) = ... or y = ...
    const functionPatterns = [
      /f\(x\)\s*=\s*([^,\n]+)/gi,
      /y\s*=\s*([^,\n]+)/gi,
      /g\(x\)\s*=\s*([^,\n]+)/gi,
      /h\(x\)\s*=\s*([^,\n]+)/gi
    ];

    functionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const equation = match[1].trim();
        if (this.isValidMathExpression(equation)) {
          equations.push(equation);
        }
      }
    });

    return equations;
  }

  /**
   * Check if a string contains a valid mathematical expression
   */
  private static isValidMathExpression(expression: string): boolean {
    try {
      // Try to evaluate with a test value
      evaluate(expression, { x: 1 });
      
      // Check if it contains 'x' variable (for functions of x)
      return expression.includes('x');
    } catch {
      return false;
    }
  }

  /**
   * Generate graphs for homework problems automatically
   */
  static async generateHomeworkGraphs(text: string): Promise<string> {
    const equations = this.extractGraphableEquations(text);
    
    if (equations.length === 0) {
      return text; // No equations found, return original text
    }

    let modifiedText = text;
    
    for (let i = 0; i < equations.length; i++) {
      const equation = equations[i];
      
      try {
        const graph = await this.generateGraph({
          equation,
          title: `Graph of f(x) = ${equation}`,
          width: 500,
          height: 400
        });

        // Create a markdown-style graph insertion
        const graphMarkdown = `\n\n**Graph of f(x) = ${equation}:**\n\n${graph.svg}\n\n*Domain: ${graph.domain}, Range: ${graph.range}*\n\n`;
        
        // Find where to insert the graph (after the equation)
        const equationPattern = new RegExp(`(f\\(x\\)\\s*=\\s*${equation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|y\\s*=\\s*${equation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i');
        
        modifiedText = modifiedText.replace(equationPattern, `$1${graphMarkdown}`);
        
      } catch (error) {
        console.warn(`Failed to generate graph for equation: ${equation}`, error);
      }
    }

    return modifiedText;
  }

  /**
   * Generate specific graph types for common calculus problems
   */
  static async generateCalculusGraph(equation: string, type: 'function' | 'derivative' | 'integral' = 'function'): Promise<GraphResult> {
    let title = `Graph of f(x) = ${equation}`;
    let color = '#2563eb';

    if (type === 'derivative') {
      title = `Derivative: f'(x) of ${equation}`;
      color = '#dc2626';
    } else if (type === 'integral') {
      title = `Integral: ∫${equation} dx`;
      color = '#16a34a';
    }

    return this.generateGraph({
      equation,
      title,
      color,
      width: 600,
      height: 450,
      xMin: -5,
      xMax: 5,
      yMin: -10,
      yMax: 10
    });
  }
}