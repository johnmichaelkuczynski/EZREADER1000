import React, { useEffect, useRef, useState } from 'react';
import { MathGraphing, GraphConfig } from '@/lib/math-graphing';

interface MathGraphRendererProps {
  content: string;
  onContentUpdate: (updatedContent: string) => void;
}

interface GraphData {
  equation: string;
  svg: string;
  placeholder: string;
}

export function MathGraphRenderer({ content, onContentUpdate }: MathGraphRendererProps) {
  const [graphs, setGraphs] = useState<GraphData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    processGraphs();
  }, [content]);

  const processGraphs = async () => {
    // Find graph placeholders in content - support multiple formats
    const renderGraphPattern = /\[RENDER_GRAPH:([^\]]+)\]/g;
    const graphDescPattern = /\[Graph of f\(x\) = ([^,\[\]]+?)(?:\s+showing[^\]]*?)?\]/g;
    const graphPattern = /\[GRAPH:([^\]]+)\]/g;
    
    const renderMatches = Array.from(content.matchAll(renderGraphPattern));
    const descMatches = Array.from(content.matchAll(graphDescPattern));
    const graphMatches = Array.from(content.matchAll(graphPattern));
    
    const allMatches = [
      ...renderMatches.map(m => [m[0], m[1]]),
      ...descMatches.map(m => [m[0], m[1]]),
      ...graphMatches.map(m => [m[0], m[1]])
    ];
    
    if (allMatches.length === 0) return;

    setIsProcessing(true);
    let updatedContent = content;
    const newGraphs: GraphData[] = [];

    for (const match of allMatches) {
      const [placeholder, equation] = match;
      
      // Skip if already processed
      if (processedRef.current.has(placeholder)) continue;
      
      try {
        console.log(`Processing graph for equation: ${equation.trim()}`);
        
        // Generate the graph
        const graphResult = await MathGraphing.generateGraph({
          equation: equation.trim(),
          title: `Graph of f(x) = ${equation.trim()}`,
          width: 500,
          height: 400,
          xMin: -10,
          xMax: 10,
          yMin: -10,
          yMax: 10
        });

        // Create a unique ID for this graph
        const graphId = `graph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Convert equation to LaTeX for proper math rendering
        const latexEquation = equation.trim()
          .replace(/e\^([^+\-*/\s()]+)/g, 'e^{$1}')
          .replace(/\^([^{}\s]+)/g, '^{$1}');
        
        // Replace placeholder with graph
        const graphHtml = `
<div class="math-graph" style="margin: 20px 0; text-align: center; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; background: #f8fafc;">
  <div id="${graphId}" style="display: inline-block;">
    ${graphResult.svg}
  </div>
  <p style="margin-top: 12px; font-size: 14px; color: #64748b;">
    <strong>Equation:</strong> $$f(x) = ${latexEquation}$$<br/>
    <strong>Domain:</strong> ${graphResult.domain} | <strong>Range:</strong> ${graphResult.range || 'Calculated from function'}
  </p>
</div>`;

        updatedContent = updatedContent.replace(placeholder, graphHtml);
        
        newGraphs.push({
          equation: equation.trim(),
          svg: graphResult.svg,
          placeholder
        });

        // Mark as processed
        processedRef.current.add(placeholder);
        
      } catch (error) {
        console.error('Error generating graph for equation:', equation, error);
        
        // Replace with error message
        const errorHtml = `
<div class="math-graph-error" style="margin: 20px 0; padding: 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626;">
  <p><strong>Graph Generation Error</strong></p>
  <p>Could not generate graph for equation: <code>${equation.trim()}</code></p>
  <p style="font-size: 12px; margin-top: 8px;">Please check the equation syntax and try again.</p>
</div>`;
        
        updatedContent = updatedContent.replace(placeholder, errorHtml);
      }
    }

    if (newGraphs.length > 0) {
      setGraphs(prev => [...prev, ...newGraphs]);
    }

    // Update content if changes were made
    if (updatedContent !== content) {
      onContentUpdate(updatedContent);
    }

    setIsProcessing(false);
  };

  // This component doesn't render anything visible itself
  // It processes the content and updates it via the callback
  return null;
}

// Helper component for displaying graph processing status
export function GraphProcessingIndicator({ isProcessing }: { isProcessing: boolean }) {
  if (!isProcessing) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md border border-blue-200">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      <span>Generating mathematical graphs...</span>
    </div>
  );
}