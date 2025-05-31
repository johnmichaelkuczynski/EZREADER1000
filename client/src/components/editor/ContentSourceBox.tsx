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
  documentContent?: string; // Main document content for auto-search
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
  documentContent
}: ContentSourceBoxProps) {
  const [activeTab, setActiveTab] = useState<ContentSourceTab['id']>('manual');
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ title: string; url: string; snippet: string }>>([]);
  const [selectedSources, setSelectedSources] = useState<Set<number>>(new Set());
  const [aiResearch, setAiResearch] = useState<{
    claude?: string;
    gpt?: string;
    perplexity?: string;
  }>({});
  const [selectedAiSources, setSelectedAiSources] = useState<Set<string>>(new Set());
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
  
  // Handle source selection
  const toggleSourceSelection = (index: number) => {
    const newSelected = new Set(selectedSources);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSources(newSelected);
  };

  const toggleAiSourceSelection = (source: string) => {
    const newSelected = new Set(selectedAiSources);
    if (newSelected.has(source)) {
      newSelected.delete(source);
    } else {
      newSelected.add(source);
    }
    setSelectedAiSources(newSelected);
  };

  const addSelectedSources = () => {
    let combinedContent = "";
    
    // Add selected web sources
    selectedSources.forEach(index => {
      const source = searchResults[index];
      if (source) {
        combinedContent += `[${source.title}]\n${source.url}\n${source.snippet}\n\n`;
      }
    });
    
    // Add selected AI research
    if (selectedAiSources.has('claude') && aiResearch.claude) {
      combinedContent += `[Claude Research]\n${aiResearch.claude}\n\n`;
    }
    if (selectedAiSources.has('gpt') && aiResearch.gpt) {
      combinedContent += `[GPT Research]\n${aiResearch.gpt}\n\n`;
    }
    if (selectedAiSources.has('perplexity') && aiResearch.perplexity) {
      combinedContent += `[Perplexity Research]\n${aiResearch.perplexity}\n\n`;
    }
    
    if (combinedContent) {
      onTextChange(text + (text ? '\n\n' : '') + combinedContent);
      setActiveTab('manual');
    }
    
    setSearchDialogOpen(false);
    setSelectedSources(new Set());
    setSelectedAiSources(new Set());
  };

  // Handle search
  const handleSearch = async () => {
    let queryToUse = searchQuery.trim();
    
    // If no search query provided, extract key terms from document content
    if (!queryToUse) {
      const docContent = documentContent || '';
      if (docContent.trim()) {
        queryToUse = docContent
          .substring(0, 200)
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 3)
          .slice(0, 8)
          .join(' ');
      }
      
      if (!queryToUse) {
        toast({
          title: "No content to search",
          description: "Please enter search terms or add content to your document first.",
          variant: "destructive"
        });
        return;
      }
    }
    
    try {
      setIsSearching(true);
      setSearchResults([]);
      setAiResearch({});
      
      // Search web sources
      const webResult = await searchOnline(queryToUse);
      setSearchResults(webResult.results);
      
      // Automatically query AI services for research
      const aiPromises = [
        fetch('/api/process-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputText: `Research and provide comprehensive information about: ${queryToUse}`,
            llmProvider: 'anthropic',
            instructions: 'Provide detailed research and analysis on this topic.',
            contentSource: '',
            styleSource: '',
            useContentSource: false,
            useStyleSource: false,
            examMode: false
          })
        }).then(res => res.json()).then(data => ({ claude: data.result })).catch(() => ({ claude: null })),
        
        fetch('/api/process-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputText: `Research and provide comprehensive information about: ${queryToUse}`,
            llmProvider: 'openai',
            instructions: 'Provide detailed research and analysis on this topic.',
            contentSource: '',
            styleSource: '',
            useContentSource: false,
            useStyleSource: false,
            examMode: false
          })
        }).then(res => res.json()).then(data => ({ gpt: data.result })).catch(() => ({ gpt: null })),
        
        fetch('/api/search-online', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: queryToUse })
        }).then(res => res.json()).then(data => ({ perplexity: data.content })).catch(() => ({ perplexity: null }))
      ];
      
      const aiResults = await Promise.all(aiPromises);
      const combinedAiResults = aiResults.reduce((acc, result) => ({ ...acc, ...result }), {});
      setAiResearch(combinedAiResults);
      
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
    <Card className="bg-white rounded-lg shadow-lg border-2 border-blue-200 h-full">
      <div className="flex justify-between items-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <h2 className="text-xl font-bold text-gray-800">Reference Content & Instructions</h2>
        <div className="flex gap-2">
          <Button 
            variant="default"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setSearchDialogOpen(true)}
          >
            <Search className="h-4 w-4 mr-1" />
            Search Online
          </Button>
        </div>
      </div>
      
      <div className="flex items-center mb-4 bg-gradient-to-r from-gray-100 to-gray-50 rounded-lg p-2 mx-6">
        <Button
          variant={activeTab === 'manual' ? 'default' : 'ghost'}
          className={`flex-1 py-3 px-4 rounded-lg text-base font-semibold transition-all ${
            activeTab === 'manual' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-600 hover:bg-white hover:shadow-md'
          }`}
          onClick={() => setActiveTab('manual')}
        >
          Write Instructions
        </Button>
        <Button
          variant={activeTab === 'upload' ? 'default' : 'ghost'}
          className={`flex-1 py-3 px-4 rounded-lg text-base font-semibold transition-all ${
            activeTab === 'upload' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-600 hover:bg-white hover:shadow-md'
          }`}
          onClick={() => setActiveTab('upload')}
        >
          Upload Files
        </Button>
      </div>
      
      <CardContent className="px-6 pb-6 pt-0">
        {activeTab === 'manual' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Elaborate Instructions & Reference Content</h3>
              <p className="text-sm text-blue-600">
                Write detailed instructions for how you want your content transformed, or paste reference materials to guide the AI.
              </p>
            </div>
            
            <div className="content-source-container overflow-y-auto border-2 border-blue-200 rounded-lg bg-white">
              <Textarea
                className="w-full h-full min-h-[400px] resize-none border-0 focus-visible:ring-0 text-base p-4"
                placeholder="Write your detailed instructions here...

Examples:
• Transform this academic paper into a conversational blog post with examples
• Rewrite this technical documentation to be accessible to beginners  
• Combine my uploaded research notes with this content to create a comprehensive guide
• Use the writing style from my uploaded samples to rewrite this content
• Create exam questions based on this material with detailed answer keys

Or paste reference content that should guide the transformation..."
                value={text}
                onChange={(e) => onTextChange(e.target.value)}
              />
            </div>
          </div>
        )}
        
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Upload Reference Files</h3>
              <p className="text-sm text-green-600">
                Upload multiple documents that will be combined and used as reference material or style guides for transforming your main content.
              </p>
            </div>
            
            <div
              {...getRootProps()}
              className="content-source-container overflow-y-auto border-2 border-dashed border-green-300 rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-green-50 hover:bg-green-100 transition-colors min-h-[350px]"
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
              
              <Upload className="h-16 w-16 text-green-400 mb-4" />
              <h4 className="text-xl font-semibold text-green-800 mb-2">Upload Your Reference Files</h4>
              <p className="text-base text-green-600 mb-4">Drag & drop multiple files here, or click to browse</p>
              <div className="bg-white rounded-lg p-3 border border-green-200 text-sm text-green-700 max-w-md">
                <strong>Supported formats:</strong><br/>
                • Word documents (.docx, .doc)<br/>
                • PDF files (.pdf)<br/>
                • Plain text files (.txt)<br/>
                • Multiple files at once
              </div>
              <Button
                variant="default"
                size="lg"
                className="mt-6 bg-green-600 hover:bg-green-700 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  if (contentSourceFileRef.current) {
                    contentSourceFileRef.current.click();
                  }
                }}
              >
                <Upload className="h-5 w-5 mr-2" /> Choose Files
              </Button>
            </div>
          </div>
        )}
        
        <div className="mt-6 bg-gray-50 rounded-lg p-4 border">
          <Label className="text-lg font-semibold text-gray-800 mb-3 block">How to Use This Content</Label>
          <RadioGroup
            value={getCurrentUsageMode()}
            onValueChange={(value) => handleUsageModeChange(value as SourceUsageMode)}
            className="space-y-3"
          >
            <div className="flex items-center space-x-3 p-2 rounded hover:bg-white transition-colors">
              <RadioGroupItem value="none" id="none" className="text-gray-500" />
              <Label htmlFor="none" className="text-base font-medium text-gray-700 cursor-pointer">
                Don't use this content
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-2 rounded hover:bg-white transition-colors">
              <RadioGroupItem value="content" id="content" className="text-blue-600" />
              <Label htmlFor="content" className="text-base font-medium text-gray-700 cursor-pointer">
                Use as reference content (combine with main text)
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-2 rounded hover:bg-white transition-colors">
              <RadioGroupItem value="style" id="style" className="text-purple-600" />
              <Label htmlFor="style" className="text-base font-medium text-gray-700 cursor-pointer">
                Use as style guide (copy writing style)
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-2 rounded hover:bg-white transition-colors">
              <RadioGroupItem value="both" id="both" className="text-green-600" />
              <Label htmlFor="both" className="text-base font-medium text-gray-700 cursor-pointer">
                Use for both content and style guidance
              </Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
      
      {/* Enhanced Search Dialog */}
      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-blue-800">Comprehensive Research & Source Selection</DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              Search web sources and get AI research from multiple providers. Select any combination of sources to add to your reference content.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="search-input" className="text-base font-medium">Search Query</Label>
              <div className="flex gap-2">
                <Input
                  id="search-input"
                  className="text-base p-3"
                  placeholder="Enter search terms or leave blank to auto-search from document content"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
                <Button 
                  onClick={handleSearch} 
                  disabled={isSearching}
                  className="bg-blue-600 hover:bg-blue-700 px-6"
                  size="lg"
                >
                  {isSearching ? 'Researching...' : 'Research All'}
                </Button>
              </div>
            </div>

            {/* Results Grid */}
            {(searchResults.length > 0 || Object.keys(aiResearch).length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Web Sources */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-2">
                    Web Sources ({searchResults.length})
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {searchResults.map((result, index) => (
                      <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedSources.has(index)}
                            onCheckedChange={() => toggleSourceSelection(index)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-blue-600 text-sm leading-tight mb-1">
                              {result.title}
                            </h4>
                            <p className="text-xs text-blue-500 mb-2 break-all">
                              {result.url}
                            </p>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {result.snippet}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Research */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-800 border-b border-gray-200 pb-2">
                    AI Research
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {aiResearch.claude && (
                      <div className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedAiSources.has('claude')}
                            onCheckedChange={() => toggleAiSourceSelection('claude')}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-purple-600 mb-2">Claude Research</h4>
                            <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
                              {aiResearch.claude.substring(0, 200)}...
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {aiResearch.gpt && (
                      <div className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedAiSources.has('gpt')}
                            onCheckedChange={() => toggleAiSourceSelection('gpt')}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-green-600 mb-2">GPT Research</h4>
                            <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
                              {aiResearch.gpt.substring(0, 200)}...
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {aiResearch.perplexity && (
                      <div className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedAiSources.has('perplexity')}
                            onCheckedChange={() => toggleAiSourceSelection('perplexity')}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-orange-600 mb-2">Perplexity Research</h4>
                            <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
                              {aiResearch.perplexity.substring(0, 200)}...
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-600">
                Selected: {selectedSources.size} web sources, {selectedAiSources.size} AI sources
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setSearchDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={addSelectedSources}
                  disabled={selectedSources.size === 0 && selectedAiSources.size === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Add Selected Sources ({selectedSources.size + selectedAiSources.size})
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
