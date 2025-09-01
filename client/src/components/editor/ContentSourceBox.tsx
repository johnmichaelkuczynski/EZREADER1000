import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Trash2, Search, Upload, FileText } from 'lucide-react';
import { ContentSourceTab } from '@/types';
import { searchOnline } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';

type SourceUsageMode = 'content' | 'style' | 'both' | 'none';

interface ContentSourceBoxProps {
  text: string;
  onTextChange: (text: string) => void;
  onClear: () => void;
  useContentSource: boolean;
  onUseContentSourceChange: (use: boolean) => void;
  useStyleSource: boolean;
  onUseStyleSourceChange: (use: boolean) => void;
  onFileUpload: (file: File) => Promise<void>;
  onMultipleFileUpload?: (files: File[]) => Promise<void>;
  contentSourceFileRef: React.RefObject<HTMLInputElement>;
  llmProvider: string;
}

export function ContentSourceBox({
  text,
  onTextChange,
  onClear,
  useContentSource,
  onUseContentSourceChange,
  useStyleSource,
  onUseStyleSourceChange,
  onFileUpload,
  onMultipleFileUpload,
  contentSourceFileRef,
  llmProvider
}: ContentSourceBoxProps) {
  const [activeTab, setActiveTab] = useState<ContentSourceTab['id']>('manual');
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ title: string; url: string; snippet: string }>>([]);
  const [queryQuestion, setQueryQuestion] = useState('');
  const [queryAnswer, setQueryAnswer] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const { toast } = useToast();

  // Derive current usage mode from boolean flags
  const getCurrentUsageMode = (): SourceUsageMode => {
    if (useContentSource && useStyleSource) return 'both';
    if (useContentSource) return 'content';
    if (useStyleSource) return 'style';
    return 'none';
  };

  // Handle usage mode change
  const handleUsageModeChange = (mode: SourceUsageMode) => {
    switch (mode) {
      case 'content':
        onUseContentSourceChange(true);
        onUseStyleSourceChange(false);
        break;
      case 'style':
        onUseContentSourceChange(false);
        onUseStyleSourceChange(true);
        break;
      case 'both':
        onUseContentSourceChange(true);
        onUseStyleSourceChange(true);
        break;
      case 'none':
        onUseContentSourceChange(false);
        onUseStyleSourceChange(false);
        break;
    }
  };
  
  // Setup dropzone for file uploads
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        try {
          if (onMultipleFileUpload && acceptedFiles.length > 1) {
            // Handle multiple files
            await onMultipleFileUpload(acceptedFiles);
          } else {
            // Handle single file (fallback to original behavior)
            await onFileUpload(acceptedFiles[0]);
          }
          // Always switch to manual tab after successful upload
          setActiveTab('manual');
        } catch (error) {
          console.error("Error uploading file(s):", error);
          toast({
            title: "Upload failed",
            description: error instanceof Error ? error.message : "Could not process file(s)",
            variant: "destructive"
          });
        }
      }
    },
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt']
    },
    noClick: true // Disable the default click behavior
  });
  
  // Handle file input change
  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      try {
        const fileArray = Array.from(files);
        
        if (onMultipleFileUpload && fileArray.length > 1) {
          // Handle multiple files
          await onMultipleFileUpload(fileArray);
        } else {
          // Handle single file (fallback to original behavior)
          await onFileUpload(fileArray[0]);
        }
        // Always switch to manual tab after successful upload
        setActiveTab('manual');
      } catch (error: any) {
        console.error("Error uploading file(s):", error);
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "Could not process file(s)",
          variant: "destructive"
        });
      }
    }
  };
  
  // Handle search
  const handleSearch = async () => {
    if (!searchQuery) {
      toast({
        title: "Search query required",
        description: "Please enter a search term.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSearching(true);
      
      const result = await searchOnline(searchQuery);
      setSearchResults(result.results);
      
      if (result.content) {
        onTextChange(result.content);
      }
      
      setSearchDialogOpen(false);
      setActiveTab('manual');
    } catch (error: any) {
      console.error('Error searching online:', error);
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "Search failed unexpectedly",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Handle content source query
  const handleQueryContentSource = async () => {
    if (!queryQuestion.trim()) {
      toast({
        title: "Question required",
        description: "Please enter a question to ask about the content source.",
        variant: "destructive"
      });
      return;
    }

    if (!text.trim()) {
      toast({
        title: "Content source required",
        description: "Please add content to query before asking questions.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsQuerying(true);
      
      const response = await fetch('/api/query-content-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: queryQuestion,
          contentSource: text,
          llmProvider
        })
      });

      if (!response.ok) {
        throw new Error(`Query failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setQueryAnswer(data.answer);
      
    } catch (error: any) {
      console.error('Error querying content source:', error);
      toast({
        title: "Query failed",
        description: error?.message || 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsQuerying(false);
    }
  };
  
  return (
    <Card className="bg-white rounded-lg shadow-sm border border-slate-200 h-full">
      <div className="flex justify-between items-center p-4">
        <h2 className="font-semibold">Content Source</h2>
        <div className="flex gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={onClear}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear content</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => setSearchDialogOpen(true)}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Find content online</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <div className="flex items-center mb-3 bg-slate-50 rounded-md p-1.5 mx-4">
        <Button
          variant={activeTab === 'manual' ? 'default' : 'ghost'}
          className={`flex-1 py-1 px-2 rounded-md text-sm font-medium ${
            activeTab === 'manual' ? 'bg-white shadow-sm' : 'text-slate-600'
          }`}
          onClick={() => setActiveTab('manual')}
        >
          Manual
        </Button>
        <Button
          variant={activeTab === 'upload' ? 'default' : 'ghost'}
          className={`flex-1 py-1 px-2 rounded-md text-sm font-medium ${
            activeTab === 'upload' ? 'bg-white shadow-sm' : 'text-slate-600'
          }`}
          onClick={() => setActiveTab('upload')}
        >
          Upload
        </Button>
        <Button
          variant={activeTab === 'search' ? 'default' : 'ghost'}
          className={`flex-1 py-1 px-2 rounded-md text-sm font-medium ${
            activeTab === 'search' ? 'bg-white shadow-sm' : 'text-slate-600'
          }`}
          onClick={() => setSearchDialogOpen(true)}
        >
          Search
        </Button>
      </div>
      
      <CardContent className="px-4 pb-4 pt-0">
        {activeTab === 'manual' && (
          <div className="content-source-container overflow-y-auto border border-slate-200 rounded-md">
            <Textarea
              className="w-full h-full min-h-[200px] resize-none border-0 focus-visible:ring-0"
              placeholder="Type or paste reference content here..."
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
            />
          </div>
        )}
        
        {activeTab === 'upload' && (
          <div
            {...getRootProps()}
            className="content-source-container overflow-y-auto border-2 border-dashed border-slate-200 rounded-md p-4 flex flex-col items-center justify-center text-center cursor-pointer"
          >
            <input {...getInputProps()} />
            <input
              type="file"
              hidden
              multiple
              ref={contentSourceFileRef}
              onChange={handleFileInputChange}
              accept=".pdf,.docx,.doc,.txt"
            />
            
            <FileText className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500 mb-2">Drag & drop files here, or click to browse</p>
            <p className="text-xs text-slate-400">Supports multiple Word, PDF, and plain text files</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={(e) => {
                e.stopPropagation();
                if (contentSourceFileRef.current) {
                  contentSourceFileRef.current.click();
                }
              }}
            >
              <Upload className="h-4 w-4 mr-1" /> Select File
            </Button>
          </div>
        )}
        
        <div className="mt-3">
          <Label className="text-sm font-medium">Usage Mode</Label>
          <RadioGroup
            value={getCurrentUsageMode()}
            onValueChange={(value) => handleUsageModeChange(value as SourceUsageMode)}
            className="mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="none" id="none" />
              <Label htmlFor="none" className="text-sm">
                Don't use
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="content" id="content" />
              <Label htmlFor="content" className="text-sm">
                Use as content source
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="style" id="style" />
              <Label htmlFor="style" className="text-sm">
                Use as style source
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="both" id="both" />
              <Label htmlFor="both" className="text-sm">
                Use as both content and style source
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Query Content Source Feature - MUCH BIGGER */}
        {text.trim() && (
          <div className="mt-6 p-6 bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-blue-300 dark:border-blue-700">
            <Label className="text-lg font-bold text-blue-900 dark:text-blue-100">Query Content Source</Label>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">Ask questions about your uploaded content</p>
            
            <div className="space-y-4">
              <Textarea
                placeholder="What would you like to know about this content? Ask detailed questions about specific topics, concepts, or sections..."
                value={queryQuestion}
                onChange={(e) => setQueryQuestion(e.target.value)}
                className="min-h-[120px] text-base resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    handleQueryContentSource();
                  }
                }}
              />
              
              <Button
                onClick={handleQueryContentSource}
                disabled={isQuerying || !queryQuestion.trim()}
                size="lg"
                className="w-full h-12 text-base font-semibold"
              >
                {isQuerying ? 'Querying Content Source...' : 'Ask Question (Ctrl+Enter)'}
              </Button>
              
              {queryAnswer && (
                <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-green-200 dark:border-green-700 shadow-sm">
                  <div className="flex items-center mb-2">
                    <strong className="text-lg text-green-800 dark:text-green-200">Answer:</strong>
                  </div>
                  <div className="text-base text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed min-h-[100px] max-h-[400px] overflow-y-auto">
                    {queryAnswer}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <Button
                      onClick={() => {
                        setQueryQuestion('');
                        setQueryAnswer('');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Ask Another Question
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Search Dialog */}
      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Find Content Online</DialogTitle>
            <DialogDescription>
              Search the web for content to use as a reference.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter search query..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
