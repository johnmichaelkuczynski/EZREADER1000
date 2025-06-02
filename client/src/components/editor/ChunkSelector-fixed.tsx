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
  onProcessSelected: (selectedIndices: number[], modes: ('rewrite' | 'add' | 'expand')[], additionalChunks?: number) => void;
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
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState('select');
  
  // Multiple mode selection state
  const [selectedModes, setSelectedModes] = useState<('rewrite' | 'add' | 'expand')[]>(['rewrite']);
  const [additionalChunks, setAdditionalChunks] = useState(1);

  // Filter and search chunks
  const filteredChunks = useMemo(() => {
    if (!searchTerm.trim()) return chunks;
    
    return chunks.filter((chunk, index) => 
      chunk.toLowerCase().includes(searchTerm.toLowerCase()) ||
      index.toString().includes(searchTerm)
    );
  }, [chunks, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredChunks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentChunks = filteredChunks.slice(startIndex, endIndex);

  const toggleChunkSelection = (index: number) => {
    const originalIndex = chunks.indexOf(filteredChunks[index]);
    setSelectedIndices(prev => 
      prev.includes(originalIndex)
        ? prev.filter(i => i !== originalIndex)
        : [...prev, originalIndex]
    );
  };

  const selectAll = () => {
    const allIndices = filteredChunks.map(chunk => chunks.indexOf(chunk));
    setSelectedIndices(allIndices);
  };

  const selectNone = () => {
    setSelectedIndices([]);
  };

  const toggleChunkExpansion = (index: number) => {
    const newExpanded = new Set(expandedChunks);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedChunks(newExpanded);
  };

  const toggleMode = (mode: 'rewrite' | 'add' | 'expand') => {
    setSelectedModes(prev => 
      prev.includes(mode)
        ? prev.filter(m => m !== mode)
        : [...prev, mode]
    );
  };

  const handleProcess = () => {
    if (selectedIndices.length === 0 && !selectedModes.includes('add')) {
      return;
    }
    if (selectedModes.length === 0) {
      return;
    }
    
    onProcessSelected(selectedIndices, selectedModes, additionalChunks);
  };

  const canProcess = selectedModes.length > 0 && (selectedIndices.length > 0 || selectedModes.includes('add'));

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Select Chunks to Process ({chunks.length} total)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="select">Select Chunks</TabsTrigger>
            <TabsTrigger value="modes">Processing Modes</TabsTrigger>
            <TabsTrigger value="process">Process</TabsTrigger>
          </TabsList>
          
          <TabsContent value="select" className="space-y-4">
            {/* Search and Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search chunks by content or index..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={selectNone}>
                  Select None
                </Button>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Show:
                </span>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                  setItemsPerPage(parseInt(value));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  per page
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm px-3">
                  {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Chunks List */}
            <ScrollArea className="h-96 border rounded-lg">
              <div className="space-y-2 p-4">
                {currentChunks.map((chunk, localIndex) => {
                  const originalIndex = chunks.indexOf(chunk);
                  const isSelected = selectedIndices.includes(originalIndex);
                  const isExpanded = expandedChunks.has(localIndex);
                  const wordCount = getWordCount(chunk);
                  
                  return (
                    <Collapsible key={originalIndex} open={isExpanded} onOpenChange={() => toggleChunkExpansion(localIndex)}>
                      <div className={`border rounded-lg p-3 transition-colors ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}>
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleChunkSelection(localIndex)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium">
                                Chunk {originalIndex + 1}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {wordCount} words
                              </span>
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              {getTextPreview(chunk, isExpanded ? 2000 : 200)}
                            </div>
                          </div>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent>
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400">
                            {chunk}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="modes" className="space-y-4">
            <h4 className="text-sm font-medium mb-3">Select Processing Modes (can select multiple)</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div 
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedModes.includes('rewrite')
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => toggleMode('rewrite')}
              >
                <div className="font-medium text-sm">Rewrite Existing</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Modify selected chunks with new instructions
                </div>
              </div>
              
              <div 
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedModes.includes('expand')
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => toggleMode('expand')}
              >
                <div className="font-medium text-sm">Expand Selected</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Add content to each selected chunk individually
                </div>
              </div>
              
              <div 
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedModes.includes('add')
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => toggleMode('add')}
              >
                <div className="font-medium text-sm">Add New Content</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Generate new chunks to expand the document
                </div>
              </div>
            </div>
            
            {/* Show additional chunks input when add mode is selected */}
            {selectedModes.includes('add') && (
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
                  </SelectContent>
                </Select>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="process" className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Processing Summary</h4>
              <div className="space-y-2 text-sm">
                <div>Selected chunks: {selectedIndices.length}</div>
                <div>Processing modes: {selectedModes.join(', ') || 'None'}</div>
                {selectedModes.includes('add') && (
                  <div>New chunks to add: {additionalChunks}</div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={handleProcess}
                disabled={!canProcess}
                className="flex-1"
              >
                Process Selected Chunks
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}