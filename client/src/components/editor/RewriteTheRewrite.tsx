import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw, X } from 'lucide-react';

interface RewriteTheRewriteProps {
  isVisible: boolean;
  onClose: () => void;
  onProcess: () => void;
  instructions: string;
  setInstructions: (instructions: string) => void;
  processing: boolean;
}

export function RewriteTheRewrite({
  isVisible,
  onClose,
  onProcess,
  instructions,
  setInstructions,
  processing
}: RewriteTheRewriteProps) {
  if (!isVisible) return null;

  return (
    <Card className="w-full mb-4 border-orange-200 dark:border-orange-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
            <RefreshCw className="h-5 w-5" />
            Rewrite the Rewrite
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Not satisfied with the AI output? Provide additional instructions to refine the rewrite.
        </div>
        
        <Textarea
          placeholder="Provide specific instructions to improve the rewrite (e.g., 'Make it more formal', 'Add more examples', 'Simplify the language')..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={3}
          className="resize-none"
        />
        
        <div className="flex gap-2">
          <Button
            onClick={onProcess}
            disabled={processing || !instructions.trim()}
            className="flex-1"
          >
            {processing ? 'Refining...' : 'Refine Rewrite'}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}