import functionPlot, { FunctionPlotOptions } from 'function-plot';
import { evaluate, parse, MathNode } from 'mathjs';

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
      // Create a temporary container for the graph
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = `${fullConfig.width}px`;
      container.style.height = `${fullConfig.height}px`;
      document.body.appendChild(container);

      // Prepare the equation for function-plot
      const plotConfig: FunctionPlotOptions = {
        target: container,
        width: fullConfig.width!,
        height: fullConfig.height!,
        grid: fullConfig.grid!,
        xAxis: {
          domain: [fullConfig.xMin!, fullConfig.xMax!]
        },
        yAxis: {
          domain: [fullConfig.yMin!, fullConfig.yMax!]
        },
        data: [{
          fn: this.convertToJavaScriptFunction(config.equation),
          color: fullConfig.color!,
          graphType: 'polyline'
        }]
      };

      // Generate the graph
      functionPlot(plotConfig);

      // Wait for rendering to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Extract the SVG
      const svgElement = container.querySelector('svg');
      if (!svgElement) {
        throw new Error('Failed to generate graph SVG');
      }

      // Add title if provided
      if (fullConfig.title) {
        const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        titleElement.setAttribute('x', String(fullConfig.width! / 2));
        titleElement.setAttribute('y', '20');
        titleElement.setAttribute('text-anchor', 'middle');
        titleElement.setAttribute('font-family', 'Arial, sans-serif');
        titleElement.setAttribute('font-size', '14');
        titleElement.setAttribute('font-weight', 'bold');
        titleElement.textContent = fullConfig.title;
        svgElement.insertBefore(titleElement, svgElement.firstChild);
      }

      const svgString = new XMLSerializer().serializeToString(svgElement);
      
      // Clean up
      document.body.removeChild(container);

      return {
        svg: svgString,
        equation: config.equation,
        domain: `[${fullConfig.xMin}, ${fullConfig.xMax}]`,
        range: `[${fullConfig.yMin}, ${fullConfig.yMax}]`
      };
    } catch (error) {
      throw new Error(`Failed to generate graph: ${error}`);
    }
  }

  /**
   * Convert mathematical notation to JavaScript function syntax
   */
  private static convertToJavaScriptFunction(equation: string): string {
    // Handle common mathematical functions and notation
    let jsEquation = equation
      .replace(/\^/g, '**')  // Exponentiation
      .replace(/sin/g, 'Math.sin')
      .replace(/cos/g, 'Math.cos')
      .replace(/tan/g, 'Math.tan')
      .replace(/log/g, 'Math.log10')
      .replace(/ln/g, 'Math.log')
      .replace(/sqrt/g, 'Math.sqrt')
      .replace(/abs/g, 'Math.abs')
      .replace(/pi/g, 'Math.PI')
      .replace(/e(?![a-zA-Z])/g, 'Math.E')  // Don't replace 'e' in words like 'exp'
      .replace(/exp/g, 'Math.exp');

    return jsEquation;
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
      // Try to parse with math.js
      parse(expression);
      
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