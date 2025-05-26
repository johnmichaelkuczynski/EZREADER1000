import { useEffect, useRef } from 'react';
import { useMathJax } from '@/hooks/use-mathjax';
import { Card, CardContent } from '@/components/ui/card';

interface MathOutputProps {
  content: string;
  className?: string;
}

export function MathOutput({ content, className = '' }: MathOutputProps) {
  const { containerRef, renderMathInContainer } = useMathJax();
  const contentRef = useRef<string>('');

  useEffect(() => {
    // Only re-render if content has actually changed
    if (contentRef.current !== content && content) {
      contentRef.current = content;
      // Small delay to ensure DOM is updated before MathJax processing
      setTimeout(() => {
        renderMathInContainer();
      }, 100);
    }
  }, [content, renderMathInContainer]);

  return (
    <Card className={`${className} output-container`}>
      <CardContent className="p-6">
        <div
          ref={containerRef}
          className="math-content tex2jax_process"
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: '1.6',
            fontFamily: 'Georgia, serif'
          }}
          dangerouslySetInnerHTML={{ __html: content || 'No content to display' }}
        />
      </CardContent>
    </Card>
  );
}