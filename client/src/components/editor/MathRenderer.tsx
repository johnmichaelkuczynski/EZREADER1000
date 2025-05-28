import { useEffect, useRef, useState } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
}

export function MathRenderer({ content, className = "" }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadKaTeX = async () => {
      try {
        // Load KaTeX CSS
        if (!document.querySelector('link[href*="katex.min.css"]')) {
          const cssLink = document.createElement('link');
          cssLink.rel = 'stylesheet';
          cssLink.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
          cssLink.integrity = 'sha384-GvrOXuhMATgEsSwCs4smul74iXGOixntILdUW9XmUC6+HX0sLNAK3q71HotJqlAn';
          cssLink.crossOrigin = 'anonymous';
          document.head.appendChild(cssLink);
        }

        // Load KaTeX JS
        if (!window.katex) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js';
            script.integrity = 'sha384-cpW21h6RZv/phavutF+AuVYrr+dA8xD9zs6FwLpaCct6O9ctzYFfFr4dgmgccOTx';
            script.crossOrigin = 'anonymous';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });

          // Load auto-render extension
          await new Promise((resolve, reject) => {
            const autoRenderScript = document.createElement('script');
            autoRenderScript.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js';
            autoRenderScript.integrity = 'sha384-+VBxd3r6XgURycqtZ117nYw44OOcIax56Z4dCRWbxyPt0Koah1uHoK0o4+/RRE05';
            autoRenderScript.crossOrigin = 'anonymous';
            autoRenderScript.onload = resolve;
            autoRenderScript.onerror = reject;
            document.head.appendChild(autoRenderScript);
          });
        }
        
        setIsReady(true);
      } catch (error) {
        console.error('Failed to load KaTeX:', error);
        setIsReady(true); // Still show content even if math rendering fails
      }
    };

    loadKaTeX();
  }, []);

  useEffect(() => {
    if (!isReady || !containerRef.current || !window.katex || !window.renderMathInElement) return;

    // Set the content first
    containerRef.current.innerHTML = content;

    // Render math with KaTeX
    try {
      window.renderMathInElement(containerRef.current, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false},
          {left: '\\[', right: '\\]', display: true},
          {left: '\\(', right: '\\)', display: false}
        ],
        throwOnError: false,
        errorColor: '#cc0000',
        strict: false
      });
    } catch (error) {
      console.warn('KaTeX rendering error:', error);
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
        overflowY: 'auto'
      }}
    />
  );
}

// Type declarations for KaTeX
declare global {
  interface Window {
    katex: any;
    renderMathInElement: any;
  }
}