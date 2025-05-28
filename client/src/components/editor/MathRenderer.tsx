import { useEffect, useRef, useState } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
}

export function MathRenderer({ content, className = "" }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadKaTeX = () => {
      // Load KaTeX CSS
      if (!document.querySelector('link[href*="katex.min.css"]')) {
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css';
        document.head.appendChild(cssLink);
      }

      // Load KaTeX JS
      if (!window.katex) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js';
        script.onload = () => {
          // Load auto-render extension
          const autoRenderScript = document.createElement('script');
          autoRenderScript.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js';
          autoRenderScript.onload = () => {
            setIsReady(true);
          };
          document.head.appendChild(autoRenderScript);
        };
        document.head.appendChild(script);
      } else {
        setIsReady(true);
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