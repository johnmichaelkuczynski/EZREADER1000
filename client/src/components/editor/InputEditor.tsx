import { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useDropzone } from 'react-dropzone';
import { FileText, Trash2, Copy, Upload, Bot } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface InputEditorProps {
  text: string;
  onTextChange: (text: string) => void;
  onFileUpload: (file: File) => Promise<void>;
  onClear: () => void;
  onCopy: (text: string) => void;
  onDetectAI: (text: string) => Promise<void>;
  isDetecting: boolean;
  inputFileRef: React.RefObject<HTMLInputElement>;
}

export function InputEditor({
  text,
  onTextChange,
  onFileUpload,
  onClear,
  onCopy,
  onDetectAI,
  isDetecting,
  inputFileRef
}: InputEditorProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  
  // Setup dropzone
  const { getRootProps, getInputProps, isDragActive: dropzoneIsDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        try {
          await onFileUpload(acceptedFiles[0]);
          console.log("File uploaded successfully:", acceptedFiles[0].name);
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
      'text/plain': ['.txt']
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
  
  return (
    <Card className="overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2 border-b border-slate-200">
        <h2 className="font-semibold">Input</h2>
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
                    accept=".pdf,.docx,.doc,.txt"
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
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => onDetectAI(text)}
                  disabled={isDetecting || !text}
                >
                  <Bot className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>AI Detect</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <CardContent className="p-0">
        <div 
          {...getRootProps()}
          className={`editor overflow-y-auto p-0 ${isDragActive ? 'border-2 border-dashed border-blue-300' : ''}`}
        >
          <input {...getInputProps()} />
          <Textarea
              className="min-h-[600px] h-full rounded-none border-0 resize-none focus-visible:ring-0"
              placeholder="Type or paste your text here..."
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
            />
          {false && (
            <div 
              className={`border-2 border-dashed border-slate-200 rounded-lg h-full min-h-[300px] flex flex-col items-center justify-center p-6 text-center cursor-pointer ${
                isDragActive ? 'drag-active' : ''
              }`}
            >
              <input {...getInputProps()} />
              <FileText className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-slate-500 mb-2">Drag & drop a file, paste text, or type here</p>
              <p className="text-xs text-slate-400">Supports Word, PDF, and plain text up to 400,000 words</p>
              <Button 
                className="mt-4 bg-slate-100 hover:bg-slate-200 text-slate-700"
                onClick={() => inputFileRef.current?.click()}
              >
                Browse Files
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
