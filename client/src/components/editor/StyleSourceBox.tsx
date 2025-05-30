import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  Trash2, 
  Search, 
  Upload, 
  FileText, 
  Loader2, 
  Copy 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StyleSourceBoxProps {
  text: string;
  onTextChange: (text: string) => void;
  useStyleSource: boolean;
  onUseStyleSourceChange: (value: boolean) => void;
  onClear: () => void;
  onFileUpload: (file: File) => Promise<void>;
  onSearchOnline: (query: string) => Promise<string>;
}

export function StyleSourceBox({
  text,
  onTextChange,
  useStyleSource,
  onUseStyleSourceChange,
  onClear,
  onFileUpload,
  onSearchOnline
}: StyleSourceBoxProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      try {
        await onFileUpload(files[0]);
        toast({
          title: "Style source uploaded",
          description: "File content loaded successfully",
        });
      } catch (error: any) {
        toast({
          title: "Upload failed",
          description: error?.message || "Failed to upload file",
          variant: "destructive"
        });
      }
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "No search query",
        description: "Please enter a search query",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    try {
      const result = await onSearchOnline(searchQuery);
      onTextChange(result);
      setSearchDialogOpen(false);
      setSearchQuery('');
      toast({
        title: "Search completed",
        description: "Style reference content found and loaded",
      });
    } catch (error: any) {
      toast({
        title: "Search failed",
        description: error?.message || "Failed to search online",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied to clipboard",
        description: "Style source content copied successfully",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex justify-between items-center px-4 py-2 border-b border-slate-200">
          <h2 className="font-semibold">Style Source</h2>
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
                <TooltipContent>Clear style source</TooltipContent>
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
                <TooltipContent>Find style examples online</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    onClick={() => copyToClipboard(text)}
                    disabled={!text}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy style source</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <div className="flex items-center mb-3 bg-slate-50 rounded-md p-1.5 mx-4 mt-4">
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
        </div>

        <CardContent className="pt-0">
          {activeTab === 'manual' ? (
            <Textarea
              placeholder="Type or paste style reference content here..."
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              className="min-h-[120px] resize-none"
            />
          ) : (
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-slate-400 transition-colors"
                onClick={handleFileSelect}
              >
                <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <p className="text-sm text-slate-600 mb-1">
                  Click to upload style reference document
                </p>
                <p className="text-xs text-slate-500">
                  PDF, Word, or text files
                </p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}
          
          <div className="flex items-center space-x-2 mt-4">
            <Checkbox 
              id="use-style-source"
              checked={useStyleSource}
              onCheckedChange={(checked) => onUseStyleSourceChange(!!checked)}
            />
            <label 
              htmlFor="use-style-source" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Incorporate style into output
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Search Dialog */}
      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Find Style Examples Online</DialogTitle>
            <DialogDescription>
              Search for writing style examples to use as reference
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter search query for style examples..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSearchDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSearch} 
              disabled={isSearching || !searchQuery.trim()}
            >
              {isSearching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}