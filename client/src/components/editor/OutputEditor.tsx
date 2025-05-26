import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Trash2, Copy, Download, Bot, Mail } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { restoreMathTokens } from '@/lib/math-restore';
import { useMathJax } from '@/hooks/use-mathjax';

interface OutputEditorProps {
  text: string;
  onTextChange: (text: string) => void;
  onClear: () => void;
  onCopy: (text: string) => void;
  onExportPDF: (text: string) => void;
  onExportDOCX: (text: string) => void;
  onDetectAI: (text: string) => Promise<void>;
  onSendEmail: (to: string, subject: string, message: string, originalText: string, transformedText: string) => Promise<boolean>;
  isDetecting: boolean;
  isSendingEmail: boolean;
  inputText: string;
}

export function OutputEditor({
  text,
  onTextChange,
  onClear,
  onCopy,
  onExportPDF,
  onExportDOCX,
  onDetectAI,
  onSendEmail,
  isDetecting,
  isSendingEmail,
  inputText
}: OutputEditorProps) {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('EZ Reader - Transformed Document');
  const [emailMessage, setEmailMessage] = useState('Here is the transformed document you requested.');
  const [wordCount, setWordCount] = useState(0);
  const { containerRef, renderMathInContainer } = useMathJax();
  const previousTextRef = useRef<string>('');

  // Trigger MathJax rendering when text changes
  useEffect(() => {
    if (text && text !== previousTextRef.current) {
      previousTextRef.current = text;
      setTimeout(() => {
        renderMathInContainer();
      }, 100);
    }
  }, [text, renderMathInContainer]);
  
  // Calculate word count whenever text changes
  useEffect(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
  }, [text]);
  
  const handleSendEmail = async () => {
    const success = await onSendEmail(
      emailTo,
      emailSubject,
      emailMessage,
      inputText,
      text
    );
    
    if (success) {
      setEmailDialogOpen(false);
    }
  };
  
  return (
    <Card className="overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Output</h2>
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
                  disabled={!text}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <DropdownMenu>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                      disabled={!text}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Download</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExportPDF(text)}>
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExportDOCX(text)}>
                Export as DOCX
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
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
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => text ? setEmailDialogOpen(true) : null}
                  disabled={!text}
                >
                  <Mail className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Email</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <CardContent className="p-0">
        <div className="editor overflow-y-auto p-0">
          {text ? (
            <div className="relative">
              <div 
                ref={containerRef}
                className="math-content tex2jax_process output-container min-h-[600px] p-6"
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: '1.6',
                  fontFamily: 'Georgia, serif'
                }}
                dangerouslySetInnerHTML={{ 
                  __html: restoreMathTokens(text).replace(/\n/g, '<br/>') 
                }}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute top-2 right-2"
                onClick={() => {
                  const editableText = text.replace(/<br\/?>/g, '\n');
                  const newText = prompt('Edit the text:', editableText);
                  if (newText !== null) {
                    onTextChange(newText);
                  }
                }}
              >
                Edit
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-6">
              <p className="text-slate-500">Processed text will appear here</p>
              <p className="text-xs text-slate-400 mt-2">Your content will be processed according to your instructions</p>
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Document via Email</DialogTitle>
            <DialogDescription>
              Enter the recipient's email address and customize your message.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email-to">To</Label>
              <Input
                id="email-to"
                type="email"
                placeholder="recipient@example.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="email-message">Message</Label>
              <Textarea
                id="email-message"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={!emailTo || isSendingEmail}>
              {isSendingEmail ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function FileIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
