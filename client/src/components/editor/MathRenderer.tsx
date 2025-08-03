import { useEffect, useRef, useState } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
}

export function MathRenderer({ content, className = "" }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if MathJax is loaded
    const checkMathJax = () => {
      if (window.MathJax && window.MathJax.typesetPromise) {
        setIsReady(true);
      } else {
        // Wait a bit and check again
        setTimeout(checkMathJax, 100);
      }
    };
    
    checkMathJax();
  }, []);

  // Function to process content and wrap LaTeX expressions properly
  const processContent = (text: string): string => {
    let processed = text;
    
    console.log('Original content:', text.substring(0, 200) + '...');
    
    // First, convert markdown headers to HTML (including #### headers)
    processed = processed.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
    processed = processed.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    processed = processed.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    processed = processed.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // Convert markdown bold and italic
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert line breaks to proper HTML
    processed = processed.replace(/\n\n/g, '</p><p>');
    processed = '<p>' + processed + '</p>';
    
    // Clean up empty paragraphs
    processed = processed.replace(/<p><\/p>/g, '');
    processed = processed.replace(/<p>\s*<h/g, '<h');
    processed = processed.replace(/<\/h([1-6])>\s*<\/p>/g, '</h$1>');
    
    // If already has math delimiters, return processed content
    if (processed.includes('\\(') && processed.includes('\\)')) {
      console.log('Content already has math delimiters');
      return processed;
    }
    
    // Split content into lines for better processing
    const lines = processed.split('\n');
    const processedLines = lines.map(line => {
      let processedLine = line;
      
      // Skip if line already has math delimiters
      if (processedLine.includes('\\(') || processedLine.includes('$$')) {
        return processedLine;
      }
      
      // Look for mathematical expressions and wrap them
      
      // Handle complete mathematical statements (equations)
      if (/e\s*=\s*\\sum/.test(processedLine)) {
        processedLine = processedLine.replace(/(e\s*=\s*\\sum[^.]*)/g, '$$$$1$$');
      }
      
      // Handle sum expressions with complex subscripts/superscripts
      processedLine = processedLine.replace(/\\sum_\{[^}]*\}\^\{[^}]*\}[^.]*?(?=\s|$|\.)/g, (match) => {
        return '\\(' + match.trim() + '\\)';
      });
      
      // Handle limit expressions
      processedLine = processedLine.replace(/\\lim_\{[^}]*\}[^.]*?(?=\s|$|\.)/g, (match) => {
        return '\\(' + match.trim() + '\\)';
      });
      
      // Handle fraction expressions
      processedLine = processedLine.replace(/\\frac\{[^}]*\}\{[^}]*\}/g, (match) => {
        return '\\(' + match + '\\)';
      });
      
      // Handle individual mathematical symbols and expressions
      const mathPatterns = [
        /\\rightarrow(?![a-zA-Z])/g,
        /\\leftarrow(?![a-zA-Z])/g,
        /\\mathbb\{[^}]*\}/g,
        /\\mathcal\{[^}]*\}/g,
        /\\mathfrak\{[^}]*\}/g,
        /\\infty(?![a-zA-Z])/g,
        /\\alpha(?![a-zA-Z])/g,
        /\\beta(?![a-zA-Z])/g,
        /\\gamma(?![a-zA-Z])/g,
        /\\delta(?![a-zA-Z])/g,
        /\\epsilon(?![a-zA-Z])/g,
        /\\theta(?![a-zA-Z])/g,
        /\\lambda(?![a-zA-Z])/g,
        /\\mu(?![a-zA-Z])/g,
        /\\nu(?![a-zA-Z])/g,
        /\\pi(?![a-zA-Z])/g,
        /\\rho(?![a-zA-Z])/g,
        /\\sigma(?![a-zA-Z])/g,
        /\\tau(?![a-zA-Z])/g,
        /\\phi(?![a-zA-Z])/g,
        /\\omega(?![a-zA-Z])/g,
        /\\sqrt\{[^}]*\}/g,
        /\\log(?![a-zA-Z])/g,
        /\\ln(?![a-zA-Z])/g,
        /\\exp(?![a-zA-Z])/g,
        /\\sin(?![a-zA-Z])/g,
        /\\cos(?![a-zA-Z])/g,
        /\\tan(?![a-zA-Z])/g
      ];
      
      mathPatterns.forEach(pattern => {
        processedLine = processedLine.replace(pattern, (match) => {
          return '\\(' + match + '\\)';
        });
      });
      
      // Handle mathematical function notation like f: A → B or (C, A) → R
      processedLine = processedLine.replace(/([a-zA-Z])\s*:\s*([A-Z])\s*\\rightarrow\s*([A-Z])/g, '\\($1: $2 \\rightarrow $3\\)');
      processedLine = processedLine.replace(/\(([^)]+)\)\s*\\rightarrow\s*\\mathbb\{([^}]+)\}/g, '\\(($1) \\rightarrow \\mathbb{$2}\\)');
      processedLine = processedLine.replace(/\(([^)]+)\)\s*\\rightarrow\s*([A-Z])/g, '\\(($1) \\rightarrow $2\\)');
      
      // Handle subscripts and superscripts
      processedLine = processedLine.replace(/([a-zA-Z])_\{([^}]+)\}/g, '\\($1_{$2}\\)');
      processedLine = processedLine.replace(/([a-zA-Z])\^\{([^}]+)\}/g, '\\($1^{$2}\\)');
      processedLine = processedLine.replace(/([a-zA-Z])_([0-9]+)/g, '\\($1_{$2}\\)');
      processedLine = processedLine.replace(/([a-zA-Z])\^([0-9]+)/g, '\\($1^{$2}\\)');
      
      return processedLine;
    });
    
    const result = processedLines.join('\n');
    console.log('Processed content:', result.substring(0, 200) + '...');
    
    return result;
  };

  useEffect(() => {
    if (!isReady || !containerRef.current || !window.MathJax) return;

    // Process the content to ensure proper LaTeX formatting
    const processedContent = processContent(content);
    
    // Set the processed content
    containerRef.current.innerHTML = processedContent;

    // Render math with MathJax
    try {
      window.MathJax.typesetPromise([containerRef.current]).then(() => {
        console.log('MathJax rendering completed');
      }).catch((error: any) => {
        console.warn('MathJax rendering error:', error);
        // Fallback: show original content if MathJax fails
        if (containerRef.current) {
          containerRef.current.innerHTML = content;
        }
      });
    } catch (error) {
      console.warn('MathJax rendering error:', error);
      // Fallback: show original content
      if (containerRef.current) {
        containerRef.current.innerHTML = content;
      }
    }
  }, [content, isReady]);

  if (!isReady) {
    return (
      <div 
        className={`math-renderer ${className}`}
        style={{ 
          fontSize: '14px',
          lineHeight: '1.6',
          padding: '12px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          whiteSpace: 'pre-wrap',
          maxHeight: '300px',
          overflowY: 'auto'
        }}
      >
        <div className="flex items-center justify-center h-20 text-gray-500">
          Loading math renderer...
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`math-renderer ${className}`}
      style={{ 
        fontSize: '14px',
        lineHeight: '1.6',
        padding: '12px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        whiteSpace: 'pre-wrap',
        maxHeight: '300px',
        overflowY: 'auto',
        overflowX: 'auto',
        wordWrap: 'break-word',
        wordBreak: 'break-word',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}
    />
  );
}

// Type declarations for MathJax
declare global {
  interface Window {
    MathJax: {
      typesetPromise: (elements?: Element[]) => Promise<void>;
      startup: {
        ready: () => void;
      };
    };
  }
}