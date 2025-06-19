import { useRef, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useDropzone } from 'react-dropzone';
import { FileText, Trash2, Copy, Upload, Bot, Eye, EyeOff, Camera } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MathRenderer } from './MathRenderer';
import { VoiceInput } from '@/components/ui/voice-input';
import { MathTextArea } from '@/components/MathTextArea';

interface InputEditorProps {
  text: string;
  onTextChange: (text: string) => void;
  onFileUpload: (file: File) => Promise<void>;
  onImageUpload?: (file: File) => Promise<void>;
  onClear: () => void;
  onCopy: (text: string) => void;
  onDetectAI: (text: string) => Promise<void>;
  isDetecting: boolean;
  inputFileRef: React.RefObject<HTMLInputElement>;
  aiResult?: { isAI: boolean; confidence: number; details: string } | null;
}

export function InputEditor({
  text,
  onTextChange,
  onFileUpload,
  onImageUpload,
  onClear,
  onCopy,
  onDetectAI,
  isDetecting,
  inputFileRef,
  aiResult
}: InputEditorProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [showMathPreview, setShowMathPreview] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // Calculate word count whenever text changes
  useEffect(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
  }, [text]);
  
  // Setup dropzone
  const { getRootProps, getInputProps, isDragActive: dropzoneIsDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        try {
          // Check if it's an image file
          if (file.type.startsWith('image/') && onImageUpload) {
            await onImageUpload(file);
            console.log("Image processed successfully:", file.name);
          } else {
            await onFileUpload(file);
            console.log("File uploaded successfully:", file.name);
          }
        } catch (error) {
          console.error("Error uploading file:", error);
        }
      }
    },
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff']
    },
    noClick: true // Disable the click behavior of the dropzone
  });
  
  // Handle file input change
  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      await onFileUpload(files[0]);
    }
  };

  // Handle image input for OCR
  const handleImageInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0 && onImageUpload) {
      setIsProcessingImage(true);
      try {
        await onImageUpload(files[0]);
      } catch (error) {
        console.error('Error processing image:', error);
      } finally {
        setIsProcessingImage(false);
      }
    }
  };
  
  return (
    <Card className="overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Input</h2>
          <Badge variant="outline" className="ml-2">{wordCount} words</Badge>
        </div>
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
              <TooltipContent>Clear</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => onCopy(text)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => inputFileRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  <input 
                    type="file" 
                    hidden 
                    ref={inputFileRef}
                    onChange={handleFileInputChange}
                    accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.gif,.bmp,.tiff"
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Upload</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`p-1 transition-colors ${showMathPreview ? 'text-blue-600 hover:text-blue-700' : 'text-slate-400 hover:text-slate-600'}`}
                  onClick={() => setShowMathPreview(!showMathPreview)}
                >
                  {showMathPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Math Preview</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => onDetectAI(text)}
                  disabled={isDetecting || !text}
                >
                  {isDetecting ? (
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>GPTZero AI Detection</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <CardContent className="p-0">
        {showMathPreview ? (
          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mx-4 mt-4 mb-0">
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Math Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="mt-0">
              <div 
                {...getRootProps()}
                className={`editor overflow-y-auto p-0 ${isDragActive ? 'border-2 border-dashed border-blue-300' : ''}`}
              >
                <input {...getInputProps()} />
                <Textarea
                    className="min-h-[600px] h-full rounded-none border-0 resize-none focus-visible:ring-0"
                    placeholder="Enter your text with LaTeX math here... Examples: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$ or $$\\sum_{i=1}^{n} x_i$$"
                    value={text}
                    onChange={(e) => onTextChange(e.target.value)}
                  />
              </div>
            </TabsContent>
            <TabsContent value="preview" className="mt-0">
              <div className="min-h-[600px] border border-gray-200 rounded-none">
                {text.trim() ? (
                  <MathRenderer content={text} className="min-h-[600px]" />
                ) : (
                  <div className="flex items-center justify-center h-[600px] text-gray-500">
                    <div className="text-center">
                      <Eye className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                      <p className="text-lg mb-2">Enter text with LaTeX math to see preview</p>
                      <p className="text-sm text-gray-400">Supports: $inline$, $$display$$, \\(inline\\), \\[display\\]</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div 
            {...getRootProps()}
            className={`editor overflow-y-auto p-0 ${isDragActive ? 'border-2 border-dashed border-blue-300' : ''}`}
          >
            <input {...getInputProps()} />
            <div className="relative h-full">
              <Textarea
                className="min-h-[600px] h-full rounded-none border-0 resize-none focus-visible:ring-0 pr-10"
                placeholder="Type or paste your text here..."
                value={text}
                onChange={(e) => onTextChange(e.target.value)}
              />
              <div className="absolute right-2 top-2 z-10">
                <VoiceInput
                  onTranscription={(voiceText) => onTextChange(text ? `${text} ${voiceText}` : voiceText)}
                  className="h-8 w-8"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* AI Detection Results */}
        {aiResult && (
          <div className="mt-3 flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Detection:</span>
            <Badge variant={aiResult.isAI ? "destructive" : "secondary"} className="font-medium">
              {Math.round(aiResult.confidence * 100)}%
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
