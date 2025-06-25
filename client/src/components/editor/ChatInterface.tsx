import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Message } from '@/types';
import { Trash2, Send, ArrowDown, Upload, FileText } from 'lucide-react';
import { MathRenderer } from './MathRenderer';
import { VoiceInput } from '@/components/ui/voice-input';
import { useToast } from '@/hooks/use-toast';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (content: string, contextDocument?: string) => void;
  onClearChat: () => void;
  reprocessOutput: boolean;
  onReprocessOutputChange: (value: boolean) => void;
  onSendToInput?: (content: string) => void;
}

export function ChatInterface({
  messages,
  onSendMessage,
  onClearChat,
  reprocessOutput,
  onReprocessOutputChange,
  onSendToInput
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const [uploadedDocument, setUploadedDocument] = useState<string>('');
  const [documentName, setDocumentName] = useState<string>('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Unsupported file type",
        description: "Please upload PDF, DOCX, or TXT files only.",
        variant: "destructive"
      });
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      let response;
      if (file.type === 'application/pdf') {
        response = await fetch('/api/process-pdf', {
          method: 'POST',
          body: formData
        });
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        response = await fetch('/api/process-docx', {
          method: 'POST',
          body: formData
        });
      } else {
        // Text file
        const text = await file.text();
        setUploadedDocument(text);
        setDocumentName(file.name);
        toast({
          title: "Document uploaded",
          description: `${file.name} is ready for analysis`
        });
        return;
      }

      if (!response?.ok) {
        throw new Error('Failed to process document');
      }

      const data = await response.json();
      setUploadedDocument(data.text);
      setDocumentName(file.name);
      
      // Automatically send document for analysis
      onSendMessage(`Please analyze this document: ${file.name}`, data.text);
      
      toast({
        title: "Document uploaded and analyzed",
        description: `${file.name} has been processed and sent for AI analysis`
      });
      
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to process the document. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    onSendMessage(inputValue, uploadedDocument || undefined);
    setInputValue('');
  };
  
  // Character count
  const characterCount = inputValue.length;
  
  return (
    <Card className="mt-4 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2 border-b border-slate-200">
        <h2 className="font-semibold">Rewrite Instructions</h2>
        <div className="flex gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-slate-600 transition-colors h-6 w-6 p-0"
                  onClick={onClearChat}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear Chat</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {/* Message Container */}
      <div 
        ref={chatContainerRef}
        className="max-h-96 overflow-y-auto p-3 space-y-3"
      >
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
              </div>
            )}
            
            <div className={`group relative max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
              message.role === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700'
            }`}>
              {message.content.includes('$') || message.content.includes('\\') ? (
                <div className="text-sm">
                  <MathRenderer content={message.content} />
                  {onSendToInput && message.role === 'assistant' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6 bg-white/80 hover:bg-white"
                      onClick={() => onSendToInput(message.content)}
                      title="Send to Input Box"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
              )}
            </div>
            
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 ml-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="border-t border-slate-200 p-3">
        {/* Document upload indicator */}
        {documentName && (
          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">Document: {documentName}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setUploadedDocument('');
                setDocumentName('');
              }}
              className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
            >
              ×
            </Button>
          </div>
        )}
        
        <form className="flex items-end gap-2" onSubmit={handleSubmit}>
          <div className="flex-1 relative">
            <Textarea
              className="w-full border border-slate-200 rounded-lg p-3 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px] resize-none"
              placeholder="Ask a question, give special commands, or provide new instructions..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <div className="absolute right-3 bottom-3 flex gap-1">
              <VoiceInput
                onTranscription={(text) => setInputValue(inputValue ? `${inputValue} ${text}` : text)}
                className="h-6 w-6 p-0"
                size="sm"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.docx,.txt"
              className="hidden"
            />
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-10 w-10 p-0"
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Upload document (PDF, DOCX, TXT)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Button 
              type="submit" 
              className="bg-primary hover:bg-blue-600 text-white p-3 rounded-lg flex-shrink-0 transition-colors h-10 w-10"
              disabled={!inputValue.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
        <div className="flex justify-between mt-1.5">
          <div className="flex items-center">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="reprocess-output" 
                checked={reprocessOutput}
                onCheckedChange={(checked) => onReprocessOutputChange(!!checked)}
              />
              <Label htmlFor="reprocess-output" className="text-sm">Send output to input box after processing</Label>
            </div>
          </div>
          <span className="text-xs text-slate-400">{characterCount} characters</span>
        </div>
      </div>
    </Card>
  );
}