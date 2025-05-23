import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface ProcessingStatusBarProps {
  currentChunk: number;
  totalChunks: number;
  progress: number;
  onCancel: () => void;
}

export function ProcessingStatusBar({
  currentChunk,
  totalChunks,
  progress,
  onCancel
}: ProcessingStatusBarProps) {
  return (
    <Card className="mt-4 bg-white rounded-lg shadow-sm border border-slate-200 p-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">
          Processing document (chunk {currentChunk} of {totalChunks})
        </span>
        <Button 
          variant="ghost" 
          className="text-sm text-red-500 font-medium hover:text-red-600 hover:bg-red-50 p-1 h-auto"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
      <Progress 
        value={progress} 
        className="w-full bg-slate-100 rounded-full h-2 overflow-hidden"
      />
    </Card>
  );
}
