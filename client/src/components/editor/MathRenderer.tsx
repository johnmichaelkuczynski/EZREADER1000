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

  useEffect(() => {
    if (!isReady || !containerRef.current || !window.MathJax) return;

    // Set the content first
    containerRef.current.innerHTML = content;

    // Render math with MathJax
    try {
      window.MathJax.typesetPromise([containerRef.current]).then(() => {
        console.log('MathJax rendering completed');
      }).catch((error: any) => {
        console.warn('MathJax rendering error:', error);
      });
    } catch (error) {
      console.warn('MathJax rendering error:', error);
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