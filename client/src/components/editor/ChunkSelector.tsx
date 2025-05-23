import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface ChunkSelectorProps {
  chunks: string[];
  onProcessSelected: (selectedIndices: number[]) => void;
  onCancel: () => void;
}

export function ChunkSelector({ 
  chunks, 
  onProcessSelected, 
  onCancel 
}: ChunkSelectorProps) {
  const [selectedChunks, setSelectedChunks] = useState<number[]>([]);
  const [expandedChunk, setExpandedChunk] = useState<number | null>(null);

  const toggleChunkSelection = (index: number) => {
    setSelectedChunks(current => 
      current.includes(index)
        ? current.filter(i => i !== index)
        : [...current, index]
    );
  };

  const toggleExpandChunk = (index: number) => {
    setExpandedChunk(expandedChunk === index ? null : index);
  };

  const selectAll = () => {
    setSelectedChunks(chunks.map((_, index) => index));
  };

  const deselectAll = () => {
    setSelectedChunks([]);
  };

  const handleProcessSelected = () => {
    if (selectedChunks.length === 0) {
      return; // Don't process if nothing is selected
    }
    onProcessSelected(selectedChunks);
  };

  // Calculate a brief preview for each chunk (first 150 characters)
  const getChunkPreview = (chunkText: string): string => {
    const preview = chunkText.slice(0, 150).trim();
    return preview + (chunkText.length > 150 ? '...' : '');
  };

  // Calculate word count for each chunk
  const getWordCount = (text: string): number => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto mt-4">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle>Select Chunks to Process</CardTitle>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={selectAll}
            >
              Select All
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={deselectAll}
            >
              Deselect All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="mb-4">
          <p className="text-sm text-slate-500">
            Your document has been divided into {chunks.length} chunks. 
            Select which chunks you'd like to process, and preview them by clicking the expand button.
          </p>
        </div>
        
        <ScrollArea className="h-[400px] rounded-md border p-2">
          {chunks.map((chunk, index) => (
            <div key={index} className="mb-3 last:mb-0">
              <Collapsible 
                open={expandedChunk === index}
                onOpenChange={() => toggleExpandChunk(index)}
                className="border rounded-md overflow-hidden"
              >
                <div className="flex items-center p-3 bg-slate-50 dark:bg-slate-900">
                  <Checkbox 
                    id={`chunk-${index}`}
                    checked={selectedChunks.includes(index)}
                    onCheckedChange={() => toggleChunkSelection(index)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <label htmlFor={`chunk-${index}`} className="text-sm font-medium cursor-pointer flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-slate-400" />
                      <span>Chunk {index + 1}</span>
                      <span className="ml-2 text-xs text-slate-500">
                        ({getWordCount(chunk)} words)
                      </span>
                    </label>
                    <p className="text-xs text-slate-500 mt-1">
                      {getChunkPreview(chunk)}
                    </p>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="ml-auto">
                      {expandedChunk === index ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="p-3 border-t bg-white dark:bg-slate-950">
                    <ScrollArea className="h-64">
                      <div className="whitespace-pre-wrap text-sm">
                        {chunk}
                      </div>
                    </ScrollArea>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))}
        </ScrollArea>
        
        <div className="flex justify-end mt-4 gap-2">
          <Button 
            variant="outline" 
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleProcessSelected}
            disabled={selectedChunks.length === 0}
          >
            Process {selectedChunks.length} Selected Chunk{selectedChunks.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}