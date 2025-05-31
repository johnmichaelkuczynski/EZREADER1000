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
  contentSourceFileRef
}: ContentSourceBoxProps) {
  const [activeTab, setActiveTab] = useState<ContentSourceTab['id']>('manual');
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ title: string; url: string; snippet: string }>>([]);
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
