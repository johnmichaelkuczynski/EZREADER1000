import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, X } from 'lucide-react';

interface RewriteTheRewriteProps {
  onRewrite: (instructions: string) => void;
  onCancel: () => void;
  instructions: string;
  setInstructions: (instructions: string) => void;
  processing: boolean;
}

export function RewriteTheRewrite({
  onRewrite,
  onCancel,
  instructions,
  setInstructions,
  processing
}: RewriteTheRewriteProps) {
  const handleSubmit = () => {
    if (!instructions.trim()) return;
    onRewrite(instructions);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card className="mt-4 border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-orange-800 dark:text-orange-200 flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Rewrite the Rewrite
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-orange-700 dark:text-orange-300">
          The AI's rewrite didn't meet your expectations? Provide specific feedback and refinement instructions to improve the result.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2 block">
            Refinement Instructions
          </label>
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what was wrong with the rewrite and how to fix it. For example: 'You left out the 30 laws of logic from the original document. Please include all the laws with their explanations and examples.'"
            className="min-h-[100px] border-orange-200 focus:border-orange-400 dark:border-orange-700 dark:focus:border-orange-500"
            disabled={processing}
          />
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
            The AI will see your original text, previous instructions, current rewrite, and these refinement instructions.
          </p>
        </div>
        
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={processing}
            className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-600 dark:text-orange-300 dark:hover:bg-orange-900"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!instructions.trim() || processing}
            className="bg-orange-600 hover:bg-orange-700 text-white dark:bg-orange-600 dark:hover:bg-orange-700"
          >
            {processing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Refining...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refine Rewrite
              </>
            )}
          </Button>
        </div>
        
        <div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900 p-2 rounded">
          <strong>Tip:</strong> Be specific about what was missing, incorrect, or needs improvement. 
          The more detailed your feedback, the better the refined result will be.
        </div>
      </CardContent>
    </Card>
  );
}