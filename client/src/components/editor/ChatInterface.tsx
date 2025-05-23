import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Message } from '@/types';
import { Trash2, Mic, Send } from 'lucide-react';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  onClearChat: () => void;
  reprocessOutput: boolean;
  onReprocessOutputChange: (value: boolean) => void;
}

export function ChatInterface({
  messages,
  onSendMessage,
  onClearChat,
  reprocessOutput,
  onReprocessOutputChange
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<BlobPart[]>([]);
  
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
        // But for simplicity we're just setting a placeholder message
        setInputValue('Speech recognition in progress...');
        
        // Clean up
        URL.revokeObjectURL(audioUrl);
        setIsRecording(false);
      });
      
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
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
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={onClearChat}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear chat</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <div 
        className="chat-container overflow-y-auto p-4" 
        ref={chatContainerRef}
      >
        {messages.map((message) => (
          <div 
            key={message.id}
            className={`flex mb-4 ${message.role === 'user' ? 'justify-end' : ''}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 7H7v6h6V7z" />
                  <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            
            <div className={`${
              message.role === 'user' 
                ? 'bg-primary text-white' 
                : 'bg-slate-100 text-slate-800'
              } rounded-lg p-3 max-w-[85%]`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
        <form className="flex items-end gap-2" onSubmit={handleSubmit}>
          <div className="flex-1 relative">
            <Textarea
              className="w-full border border-slate-200 rounded-lg p-3 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-primary min-h-[200px] resize-none"
              placeholder="Type your rewrite instructions here..."
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="text-slate-400 hover:text-slate-600 transition-colors h-6 w-6 p-0"
                      onClick={isRecording ? stopRecording : startRecording}
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isRecording ? 'Stop recording' : 'Voice input'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <Button 
            type="submit" 
            className="bg-primary hover:bg-blue-600 text-white p-3 rounded-lg flex-shrink-0 transition-colors h-10 w-10"
            disabled={!inputValue.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <div className="flex justify-between mt-1.5">
          <div className="flex items-center">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="reprocess-output" 
                checked={reprocessOutput}
                onCheckedChange={(checked) => onReprocessOutputChange(!!checked)}
              />
              <Label htmlFor="reprocess-output" className="text-xs text-slate-500">
                Reprocess output
              </Label>
            </div>
          </div>
          <div className="text-xs text-slate-500">
            {characterCount} characters
          </div>
        </div>
      </div>
    </Card>
  );
}
