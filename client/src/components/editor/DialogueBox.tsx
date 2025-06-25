import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Message } from '@/types';
import { MathRenderer } from './MathRenderer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronRight, Eraser, Mic, MicOff, RotateCcw, Upload, ArrowDown } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useToast } from '@/hooks/use-toast';

interface DialogueBoxProps {
  messages: Message[];
  onSendMessage: (content: string, contextDocument?: string) => void;
  onProcessSpecialCommand: (command: string) => void;
  onReset: () => void;
  inputText: string;
  outputText: string;
  contentSource: string;
  instructions: string;
  isProcessing: boolean;
  enableSynthesisMode?: boolean;
  documentMap?: string[];
  onProcessGlobalQuestion?: (query: string) => Promise<void>;
  onSendToInput?: (content: string) => void;
  onClearMessages?: () => void;
}

export function DialogueBox({
  messages,
  onSendMessage,
  onProcessSpecialCommand,
  onReset,
  inputText,
  outputText,
  contentSource,
  instructions,
  isProcessing,
  enableSynthesisMode = false,
  documentMap = [],
  onProcessGlobalQuestion,
  onSendToInput,
  onClearMessages
}: DialogueBoxProps) {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<BlobPart[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    // Send message directly for pure passthrough
    onSendMessage(inputValue);
    
    setInputValue('');
  };
  
  // Voice input handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks.current = [];
      
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      
      recorder.addEventListener('dataavailable', (event) => {
        audioChunks.current.push(event.data);
      });
      
      recorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunks.current);
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Here we would typically send this audio for transcription
        // For now, just alert
        console.log('Audio recording completed:', audioUrl);
        
        // Release the stream
        if (mediaRecorder.current) {
          mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
        }
      });
      
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  // File upload handlers
  const handleFileUpload = async (file: File) => {
    try {
      let extractedText = '';
      
      if (file.type.startsWith('image/')) {
        // Handle image OCR
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch('/api/process-image-ocr', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`OCR failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        extractedText = result.text;
      } else if (file.type === 'application/pdf') {
        // Handle PDF documents
        const formData = new FormData();
        formData.append('pdf', file);
        
        const response = await fetch('/api/process-pdf', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`PDF processing failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        extractedText = result.text;
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword'
      ) {
        // Handle Word documents
        const formData = new FormData();
        formData.append('docx', file);
        
        const response = await fetch('/api/process-docx', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Word document processing failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        extractedText = result.text;
      } else if (file.type === 'text/plain') {
        // Handle text files
        extractedText = await file.text();
      } else {
        throw new Error(`Unsupported file type: ${file.type}`);
      }
      
      // Add extracted text to the input
      setInputValue(prev => prev + (prev ? '\n\n' : '') + extractedText);
      
      toast({
        title: "File uploaded",
        description: `Successfully extracted text from ${file.name}`,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process file",
        variant: "destructive"
      });
    }
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  // Setup dropzone for drag and drop
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        await handleFileUpload(acceptedFiles[0]);
      }
    },
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff']
    },
    noClick: true
  });
  
  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Dialogue with App</CardTitle>
            <CardDescription>
              Discuss your text and issue special commands like "generate table of contents" or "rewrite chunk 1"
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => {
                    if (onClearMessages) {
                      onClearMessages();
                    }
                  }}
                  disabled={isProcessing}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Clear Chat
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clear all text and stop operations</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        {/* Messages Area */}
        <ScrollArea className="h-[300px] pr-4 mb-4" ref={chatContainerRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`flex items-start gap-3 max-w-[80%] ${
                    message.role === 'user'
                      ? 'flex-row-reverse'
                      : 'flex-row'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${message.role === 'user' ? 'bg-primary text-white' : 'bg-slate-300 text-slate-600'}`}>
                    {message.role === 'user' ? 'U' : 'AI'}
                  </div>
                  <div
                    className={`rounded-lg px-4 py-2 group relative ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="space-y-3">
                        <MathRenderer content={message.content} className="text-sm bg-transparent border-0 p-0" />
                        {onSendToInput && (
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-blue-500 text-white hover:bg-blue-600 border-blue-500"
                              onClick={() => onSendToInput(message.content)}
                            >
                              <ArrowDown className="h-4 w-4 mr-1" />
                              Send to Input Box
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="prose-sm whitespace-pre-wrap">
                        {message.content}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {/* Input Form */}
        <div {...getRootProps()} className={`${isDragActive ? 'border-2 border-dashed border-blue-300 bg-blue-50' : ''}`}>
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="grid gap-2">
              <Textarea
                placeholder="Ask a question, give special commands, or provide new instructions..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="min-h-[80px]"
                onKeyDown={(e) => {
                  // Submit form when Enter is pressed without Shift
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                disabled={isProcessing}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  <Upload className="h-4 w-4" />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                    accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.gif,.bmp,.tiff"
                    className="hidden"
                  />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                >
                  {isRecording ? (
                    <MicOff className="h-4 w-4 text-red-500" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setInputValue('')}
                  disabled={!inputValue || isProcessing}
                >
                  <Eraser className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
              <Button 
                type="submit" 
                size="sm"
                disabled={!inputValue.trim() || isProcessing}
              >
                <span>Send</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4 text-xs text-slate-500">
        <div>
          {inputText && <div><strong>Input text:</strong> {inputText.substring(0, 50)}...</div>}
          {outputText && <div><strong>Output text:</strong> {outputText.substring(0, 50)}...</div>}
          {contentSource && <div><strong>Content source:</strong> {contentSource.substring(0, 50)}...</div>}
          {instructions && <div><strong>Last instructions:</strong> {instructions.substring(0, 50)}...</div>}
        </div>
      </CardFooter>
    </Card>
  );
}