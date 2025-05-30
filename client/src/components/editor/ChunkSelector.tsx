import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Search,
  ChevronRight,
  ChevronLeft,
  SkipBack,
  SkipForward 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ChunkSelectorProps {
  chunks: string[];
  onProcessSelected: (selectedIndices: number[], mode: 'rewrite' | 'add' | 'both', additionalChunks?: number) => void;
  onCancel: () => void;
}

// Calculate word count for a text
const getWordCount = (text: string): number => {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
};

// Calculate a preview for text (first N characters)
const getTextPreview = (text: string, length = 500): string => {
  const preview = text.slice(0, length).trim();
  return preview + (text.length > length ? '...' : '');
};

export function ChunkSelector({ 
  chunks, 
  onProcessSelected, 
  onCancel 
}: ChunkSelectorProps) {
  const [selectedChunks, setSelectedChunks] = useState<number[]>([]);
  const [expandedChunk, setExpandedChunk] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selectionMode, setSelectionMode] = useState<'individual' | 'range'>('individual');
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [processingMode, setProcessingMode] = useState<'rewrite' | 'add' | 'both'>('rewrite');
  const [additionalChunks, setAdditionalChunks] = useState<number>(1);
  
  // Filter chunks based on search term
  const filteredChunks = useMemo(() => {
    if (!chunks || chunks.length === 0) return [];
    if (!searchTerm || !searchTerm.trim()) {
      // Return properly formatted chunks when no search term
      return chunks.map((chunk, index) => ({ 
        chunk: chunk || '', 
        originalIndex: index 
      }));
    }
    
    // Filter chunks based on search term
    return chunks.map((chunk, index) => ({ chunk: chunk || '', index }))
      .filter(item => item.chunk.toLowerCase().includes(searchTerm.toLowerCase()))
      .map(item => ({ chunk: item.chunk, originalIndex: item.index }));
  }, [chunks, searchTerm]);
  
  // Calculate total pages
  const totalPages = Math.ceil(filteredChunks.length / pageSize);
  
  // Get current page chunks
  const currentChunks = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredChunks.slice(start, start + pageSize);
  }, [filteredChunks, currentPage, pageSize]);
  
  // Calculate statistics for chunks safely
  const chunkStats = useMemo(() => {
    if (!chunks || chunks.length === 0) {
      return {
        totalChunks: 0,
        totalWords: 0,
        avgWordsPerChunk: 0,
        minWords: 0,
        maxWords: 0
      };
    }
    
    const totalWords = chunks.reduce((sum, chunk) => sum + getWordCount(chunk || ''), 0);
    const avgWordsPerChunk = Math.round(totalWords / chunks.length);
    
    const wordCounts = chunks.map(chunk => getWordCount(chunk || ''));
    const minWords = wordCounts.length ? Math.min(...wordCounts) : 0;
    const maxWords = wordCounts.length ? Math.max(...wordCounts) : 0;
    
    return {
      totalChunks: chunks.length,
      totalWords,
      avgWordsPerChunk,
      minWords,
      maxWords
    };
  }, [chunks]);

  const toggleChunkSelection = (originalIndex: number) => {
    if (selectionMode === 'individual') {
      setSelectedChunks(current => 
        current.includes(originalIndex)
          ? current.filter(i => i !== originalIndex)
          : [...current, originalIndex]
      );
    } else if (selectionMode === 'range') {
      if (rangeStart === null) {
        setRangeStart(originalIndex);
        setSelectedChunks(current => 
          current.includes(originalIndex)
            ? current.filter(i => i !== originalIndex)
            : [...current, originalIndex]
        );
      } else {
        // Select all chunks in the range
        const start = Math.min(rangeStart, originalIndex);
        const end = Math.max(rangeStart, originalIndex);
        
        // Create array of indices in the range
        const rangeIndices = [];
        for (let i = start; i <= end; i++) {
          rangeIndices.push(i);
        }
        
        // Combine existing selection with new range indices (avoiding duplicates)
        const allIndices = [...selectedChunks, ...rangeIndices];
        const uniqueIndices = allIndices.filter((value, index, self) => 
          self.indexOf(value) === index
        );
        
        setSelectedChunks(uniqueIndices);
        setRangeStart(null); // Reset range start
      }
    }
  };

  const toggleExpandChunk = (originalIndex: number) => {
    setExpandedChunk(expandedChunk === originalIndex ? null : originalIndex);
  };

  const selectAll = () => {
    setSelectedChunks(chunks.map((_, index) => index));
  };

  const deselectAll = () => {
    setSelectedChunks([]);
  };

  const selectAllVisible = () => {
    setSelectedChunks(prev => {
      // Create array of all visible chunk indices
      const visibleIndices = currentChunks.map(item => item.originalIndex);
      // Add all visible indices to previous selection (avoid duplicates)
      return Array.from(new Set([...prev, ...visibleIndices]));
    });
  };

  const deselectAllVisible = () => {
    // Convert visible indices to a regular array for filtering
    const visibleIndices = currentChunks.map(item => item.originalIndex);
    setSelectedChunks(prev => 
      prev.filter(index => !visibleIndices.includes(index))
    );
  };
  
  // Select chunks by pattern (e.g. every Nth chunk, first/last N chunks)
  const selectPattern = (pattern: string) => {
    switch (pattern) {
      case 'first10':
        setSelectedChunks(Array.from({ length: Math.min(10, chunks.length) }, (_, i) => i));
        break;
      case 'last10':
        const startIndex = Math.max(0, chunks.length - 10);
        setSelectedChunks(Array.from({ length: chunks.length - startIndex }, (_, i) => startIndex + i));
        break;
      case 'every3rd':
        setSelectedChunks(chunks.map((_, i) => i).filter(i => i % 3 === 0));
        break;
      case 'every5th':
        setSelectedChunks(chunks.map((_, i) => i).filter(i => i % 5 === 0));
        break;
      case 'bookends': {
        // Select first 3 and last 3 chunks to get beginning and end of document
        const first = Array.from({ length: Math.min(3, chunks.length) }, (_, i) => i);
        const last = chunks.length <= 6 
          ? [] 
          : Array.from({ length: 3 }, (_, i) => chunks.length - 3 + i);
        setSelectedChunks([...first, ...last]);
        break;
      }
      case 'distributed': {
        // Select evenly distributed chunks throughout the document
        if (chunks.length <= 10) {
          selectAll();
          return;
        }
        
        const numToSelect = Math.min(10, chunks.length);
        const step = chunks.length / numToSelect;
        const indices = [];
        
        for (let i = 0; i < numToSelect; i++) {
          indices.push(Math.floor(i * step));
        }
        
        setSelectedChunks(indices);
        break;
      }
    }
  };

  const handleProcessSelected = () => {
    if (processingMode === 'add' || (processingMode === 'both' && selectedChunks.length === 0)) {
      // For add mode, we don't need selected chunks
      onProcessSelected(selectedChunks, processingMode, additionalChunks);
    } else if (selectedChunks.length === 0) {
      return; // Don't process if nothing is selected for rewrite mode
    } else {
      onProcessSelected(selectedChunks, processingMode, additionalChunks);
    }
  };

  // Pagination controls
  const goToFirstPage = () => setCurrentPage(0);
  const goToPrevPage = () => setCurrentPage(prev => Math.max(0, prev - 1));
  const goToNextPage = () => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  const goToLastPage = () => setCurrentPage(totalPages - 1);

  return (
    <Card className="w-full max-w-4xl mx-auto mt-4">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle>Choose Processing Mode</CardTitle>
          <div className="flex space-x-2">
            <Select
              value={selectionMode}
              onValueChange={(value) => setSelectionMode(value as 'individual' | 'range')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selection Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual Selection</SelectItem>
                <SelectItem value="range">Range Selection</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Processing Mode Selection */}
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium mb-3">What would you like to do?</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div 
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                processingMode === 'rewrite' 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => setProcessingMode('rewrite')}
            >
              <div className="font-medium text-sm">Rewrite Existing</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Modify selected chunks with new instructions
              </div>
            </div>
            
            <div 
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                processingMode === 'add' 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => setProcessingMode('add')}
            >
              <div className="font-medium text-sm">Add New Content</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Generate new chunks to expand the document
              </div>
            </div>
            
            <div 
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                processingMode === 'both' 
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              onClick={() => setProcessingMode('both')}
            >
              <div className="font-medium text-sm">Rewrite + Add</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Modify selected chunks AND add new content
              </div>
            </div>
          </div>
          
          {/* Show additional chunks input when in add or both mode */}
          {(processingMode === 'add' || processingMode === 'both') && (
            <div className="mt-3 flex items-center space-x-3">
              <label className="text-sm font-medium">Number of new chunks to add:</label>
              <Select
                value={additionalChunks.toString()}
                onValueChange={(value) => setAdditionalChunks(parseInt(value))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <Tabs defaultValue="chunks">
          <TabsList className="mb-4">
            <TabsTrigger value="chunks">Chunks</TabsTrigger>
            <TabsTrigger value="stats">Document Stats</TabsTrigger>
          </TabsList>
          
          <TabsContent value="stats">
            <div className="rounded-md border p-4 mb-4">
              <h3 className="text-lg font-medium mb-2">Document Statistics</h3>
              <ul className="space-y-1 text-sm">
                <li>Total chunks: {chunkStats.totalChunks}</li>
                <li>Total words: {chunkStats.totalWords}</li>
                <li>Average words per chunk: {chunkStats.avgWordsPerChunk}</li>
                <li>Smallest chunk: {chunkStats.minWords} words</li>
                <li>Largest chunk: {chunkStats.maxWords} words</li>
              </ul>
              
              <h3 className="text-lg font-medium mt-4 mb-2">Quick Selection Patterns</h3>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => selectPattern('first10')}>
                  First 10 Chunks
                </Button>
                <Button size="sm" variant="outline" onClick={() => selectPattern('last10')}>
                  Last 10 Chunks
                </Button>
                <Button size="sm" variant="outline" onClick={() => selectPattern('bookends')}>
                  Document Bookends
                </Button>
                <Button size="sm" variant="outline" onClick={() => selectPattern('distributed')}>
                  Distributed Sample
                </Button>
                <Button size="sm" variant="outline" onClick={() => selectPattern('every3rd')}>
                  Every 3rd Chunk
                </Button>
                <Button size="sm" variant="outline" onClick={() => selectPattern('every5th')}>
                  Every 5th Chunk
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="chunks">
            <div className="flex items-center mb-4 gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search chunks..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(0); // Reset to first page on search
                  }}
                  className="pl-8"
                />
              </div>
              
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(parseInt(value));
                  setCurrentPage(0); // Reset to first page when changing page size
                }}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="Page Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 per page</SelectItem>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="mb-4 flex justify-between">
              <div>
                <span className="text-sm text-slate-500">
                  {filteredChunks.length > 0 
                    ? `Showing ${currentPage * pageSize + 1}-${Math.min((currentPage + 1) * pageSize, filteredChunks.length)} of ${filteredChunks.length} chunks`
                    : "No chunks found"}
                </span>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={selectAllVisible}
                >
                  Select Visible
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={deselectAllVisible}
                >
                  Deselect Visible
                </Button>
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
            
            <ScrollArea className="h-[400px] rounded-md border p-2">
              {currentChunks.length > 0 ? (
                currentChunks.map(({ chunk, originalIndex }, index) => (
                  <div key={originalIndex} className="mb-3 last:mb-0">
                    <Collapsible 
                      open={expandedChunk === originalIndex}
                      onOpenChange={() => toggleExpandChunk(originalIndex)}
                      className="border rounded-md overflow-hidden"
                    >
                      <div className="flex items-center p-3 bg-slate-50 dark:bg-slate-900">
                        <Checkbox 
                          id={`chunk-${originalIndex}`}
                          checked={selectedChunks.includes(originalIndex)}
                          onCheckedChange={() => toggleChunkSelection(originalIndex)}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <label 
                            htmlFor={`chunk-${originalIndex}`} 
                            className="text-sm font-medium cursor-pointer flex items-center"
                          >
                            <FileText className="w-4 h-4 mr-2 text-slate-400" />
                            <span>Chunk {originalIndex + 1}</span>
                            <span className="ml-2 text-xs text-slate-500">
                              ({getWordCount(chunk)} words)
                            </span>
                            {rangeStart === originalIndex && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 py-0.5 px-1.5 rounded-full">
                                Range Start
                              </span>
                            )}
                          </label>
                          <p className="text-xs text-slate-500 mt-1">
                            {getTextPreview(chunk)}
                          </p>
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="ml-auto">
                            {expandedChunk === originalIndex ? 
                              <ChevronUp className="h-4 w-4" /> : 
                              <ChevronDown className="h-4 w-4" />}
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
                ))
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-500">No chunks match your search criteria</p>
                </div>
              )}
            </ScrollArea>
            
            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-slate-500">
                  Page {currentPage + 1} of {totalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToFirstPage}
                    disabled={currentPage === 0}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPrevPage}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPage >= totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToLastPage}
                    disabled={currentPage >= totalPages - 1}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-between mt-4 gap-2">
          <div>
            {processingMode === 'add' ? (
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Will add {additionalChunks} new chunk{additionalChunks !== 1 ? 's' : ''}
              </span>
            ) : processingMode === 'both' ? (
              <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                {selectedChunks.length} chunk{selectedChunks.length !== 1 ? 's' : ''} selected + {additionalChunks} new
              </span>
            ) : (
              <span className="text-sm font-medium">
                {selectedChunks.length} chunk{selectedChunks.length !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleProcessSelected}
              disabled={
                processingMode === 'rewrite' && selectedChunks.length === 0 ||
                processingMode === 'both' && selectedChunks.length === 0
              }
              className={
                processingMode === 'add' ? 'bg-green-600 hover:bg-green-700' :
                processingMode === 'both' ? 'bg-purple-600 hover:bg-purple-700' : ''
              }
            >
              {processingMode === 'add' ? `Add ${additionalChunks} New Chunks` :
               processingMode === 'both' ? `Rewrite + Add ${additionalChunks}` :
               'Process Selected Chunks'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}