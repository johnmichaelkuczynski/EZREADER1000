import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Eye, Edit, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMathJax } from '@/hooks/use-mathjax';



interface MathTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  showVoiceInput?: boolean;
  onVoiceInput?: () => void;
}

export function MathTextArea({
  value,
  onChange,
  placeholder,
  className,
  readOnly = false,
  showVoiceInput = false,
  onVoiceInput
}: MathTextAreaProps) {
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const previewRef = useRef<HTMLDivElement>(null);

  // Render MathJax when in preview mode
  useEffect(() => {
    if (viewMode === 'preview' && previewRef.current && window.MathJax) {
      // Clear previous content
      previewRef.current.innerHTML = processTextForMathJax(value);
      
      // Trigger MathJax rendering
      window.MathJax.typesetPromise([previewRef.current]).catch((err: any) => {
        console.warn('MathJax rendering error:', err);
      });
    }
  }, [viewMode, value]);

  const processTextForMathJax = (text: string): string => {
    if (!text) return '';
    
    // Convert text to HTML with proper math delimiters
    let processedText = text
      // Preserve line breaks
      .replace(/\n/g, '<br>')
      // Ensure proper LaTeX display math delimiters
      .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$1$$')
      // Ensure proper LaTeX inline math delimiters  
      .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$')
      // Clean up any existing $$ that might be doubled
      .replace(/\$\$\$\$/g, '$$');
    
    return processedText;
  };

  const normalizeLatex = (text: string): string => {
    return text
      // Fix common LaTeX formatting issues
      .replace(/\\log_(\w+)/g, '\\log_{$1}')
      .replace(/\\sum([^_\s])/g, '\\sum $1')
      .replace(/log₂/g, '\\log_2')
      .replace(/([a-zA-Z])₂/g, '$1_2')
      // Fix broken math expressions
      .replace(/lo\s*g₂/g, '\\log_2')
      .replace(/\\\s*\[/g, '\\[')
      .replace(/\\\s*\]/g, '\\]')
      // Ensure proper spacing around operators
      .replace(/([a-zA-Z])(=)/g, '$1 $2 ')
      .replace(/(=)([a-zA-Z])/g, '$1 $2')
      .replace(/([a-zA-Z])(-)/g, '$1 $2 ')
      .replace(/(-)([a-zA-Z])/g, '$1 $2');
  };

  const handleInputChange = (newValue: string) => {
    // Normalize LaTeX as user types
    const normalizedValue = normalizeLatex(newValue);
    onChange(normalizedValue);
  };

  const insertMathTemplate = (template: string) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + template + value.substring(end);
      onChange(newValue);
      
      // Set cursor position after template
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + template.length, start + template.length);
      }, 0);
    }
  };

  if (readOnly) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Output</span>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'edit' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('edit')}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant={viewMode === 'preview' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('preview')}
            >
              <Eye className="h-4 w-4 mr-1" />
              Math Preview
            </Button>
          </div>
        </div>
        
        {viewMode === 'edit' ? (
          <div className="bg-gray-50 p-3 rounded border font-mono text-sm whitespace-pre-wrap">
            {value || 'No output yet...'}
          </div>
        ) : (
          <div
            ref={previewRef}
            className="bg-white p-3 rounded border min-h-[100px] prose prose-sm max-w-none"
            style={{ lineHeight: '1.6' }}
          />
        )}
      </Card>
    );
  }

  return (
    <Card className={cn("p-4", className)}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">Input</span>
        <div className="flex gap-2">
          {showVoiceInput && (
            <Button
              variant="outline"
              size="sm"
              onClick={onVoiceInput}
            >
              <Mic className="h-4 w-4 mr-1" />
              Voice
            </Button>
          )}
          <Button
            variant={viewMode === 'edit' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('edit')}
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            variant={viewMode === 'preview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('preview')}
          >
            <Eye className="h-4 w-4 mr-1" />
            Math Preview
          </Button>
        </div>
      </div>

      {/* Math template shortcuts */}
      {viewMode === 'edit' && (
        <div className="flex flex-wrap gap-1 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertMathTemplate('\\[ \\]')}
            className="text-xs"
          >
            Display Math
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertMathTemplate('\\( \\)')}
            className="text-xs"
          >
            Inline Math
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertMathTemplate('\\frac{}{}')}
            className="text-xs"
          >
            Fraction
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertMathTemplate('\\sum_{i=1}^{n}')}
            className="text-xs"
          >
            Sum
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertMathTemplate('\\log_{}')}
            className="text-xs"
          >
            Log
          </Button>
        </div>
      )}
      
      {viewMode === 'edit' ? (
        <Textarea
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[200px] font-mono text-sm"
        />
      ) : (
        <div
          ref={previewRef}
          className="bg-white p-3 rounded border min-h-[200px] prose prose-sm max-w-none"
          style={{ lineHeight: '1.6' }}
        />
      )}
    </Card>
  );
}