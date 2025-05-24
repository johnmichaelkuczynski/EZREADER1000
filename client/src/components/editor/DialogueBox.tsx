import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Message } from '@/types';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronRight, Eraser, Mic, MicOff, RotateCcw } from 'lucide-react';

interface DialogueBoxProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
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
  onProcessGlobalQuestion
}: DialogueBoxProps) {
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
    
    // All commands now go through the special command processor
    // which handles the conversation directly in the chat interface
    onProcessSpecialCommand(inputValue);
    
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
                  onClick={onReset}
                  disabled={isProcessing}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset All
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
                    className={`rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="prose-sm whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {/* Input Form */}
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