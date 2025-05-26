import { useEffect, useRef } from 'react';

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

/**
 * Hook for rendering MathJax content
 */
export function useMathJax() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const renderMath = async (element?: HTMLElement) => {
    if (!window.MathJax || !window.MathJax.typesetPromise) {
      console.warn('MathJax not loaded yet');
      return;
    }
    
    try {
      const targetElement = element || containerRef.current;
      if (targetElement) {
        await window.MathJax.typesetPromise([targetElement]);
      }
    } catch (error) {
      console.error('MathJax rendering error:', error);
    }
  };

  const renderMathInContainer = async () => {
    if (containerRef.current) {
      await renderMath(containerRef.current);
    }
  };

  useEffect(() => {
    // Auto-render when container content changes
    if (containerRef.current) {
      renderMathInContainer();
    }
  }, []);

  return {
    containerRef,
    renderMath,
    renderMathInContainer
  };
}