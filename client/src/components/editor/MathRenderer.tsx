import { useEffect, useRef } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
}

export function MathRenderer({ content, className = "" }: MathRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Load MathJax if not already loaded
    if (!window.MathJax) {
      const script = document.createElement('script');
      script.src = 'https://polyfill.io/v3/polyfill.min.js?features=es6';
      script.onload = () => {
        const mathjaxScript = document.createElement('script');
        mathjaxScript.id = 'MathJax-script';
        mathjaxScript.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
        mathjaxScript.onload = () => {
          window.MathJax = {
            tex: {
              inlineMath: [['$', '$'], ['\\(', '\\)']],
              displayMath: [['$$', '$$'], ['\\[', '\\]']],
              processEscapes: true,
              processEnvironments: true
            },
            options: {
              skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
              ignoreHtmlClass: 'tex2jax_ignore',
              processHtmlClass: 'tex2jax_process'
            }
          };
          renderMath();
        };
        document.head.appendChild(mathjaxScript);
      };
      document.head.appendChild(script);
    } else {
      renderMath();
    }

    function renderMath() {
      if (containerRef.current && window.MathJax) {
        // Clear and set new content
        containerRef.current.innerHTML = content;
        
        // Process the math
        window.MathJax.typesetPromise([containerRef.current]).catch((err: any) => {
          console.log('MathJax error:', err);
        });
      }
    }
  }, [content]);

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

// Type declaration for MathJax
declare global {
  interface Window {
    MathJax: any;
  }
}