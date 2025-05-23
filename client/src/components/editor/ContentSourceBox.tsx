import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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

interface ContentSourceBoxProps {
  text: string;
  onTextChange: (text: string) => void;
  onClear: () => void;
  useContentSource: boolean;
  onUseContentSourceChange: (use: boolean) => void;
  onFileUpload: (file: File) => Promise<void>;
  contentSourceFileRef: React.RefObject<HTMLInputElement>;
}

export function ContentSourceBox({
  text,
  onTextChange,
  onClear,
  useContentSource,
  onUseContentSourceChange,
  onFileUpload,
  contentSourceFileRef
}: ContentSourceBoxProps) {
  const [activeTab, setActiveTab] = useState<ContentSourceTab['id']>('manual');
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ title: string; url: string; snippet: string }>>([]);
  const { toast } = useToast();
  
  // Setup dropzone for file uploads
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        await onFileUpload(acceptedFiles[0]);
        setActiveTab('manual');
      }
    },
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt']
    }
  });
  
  // Handle file input change
  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      await onFileUpload(files[0]);
      setActiveTab('manual');
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
    } catch (error) {
      console.error('Error searching online:', error);
      toast({
        title: "Search failed",
        description: error.message,
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
              ref={contentSourceFileRef}
              onChange={handleFileInputChange}
              accept=".pdf,.docx,.doc,.txt"
            />
            
            <FileText className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500 mb-2">Drag & drop a file here, or click to browse</p>
            <p className="text-xs text-slate-400">Supports Word, PDF, and plain text</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => contentSourceFileRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1" /> Select File
            </Button>
          </div>
        )}
        
        <div className="mt-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="use-content-source"
              checked={useContentSource}
              onCheckedChange={(checked) => onUseContentSourceChange(!!checked)}
            />
            <Label htmlFor="use-content-source" className="text-sm">
              Incorporate into output
            </Label>
          </div>
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
