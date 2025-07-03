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
import { Trash2, Copy, Download, Bot, Mail, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MathRenderer } from './MathRenderer';
import { MathGraphRenderer, GraphProcessingIndicator } from '../MathGraphRenderer';

interface OutputEditorProps {
  text: string;
  onTextChange: (text: string) => void;
  onClear: () => void;
  onCopy: (text: string) => void;
  onExportPDF: (text: string) => void;
  onExportDOCX: (text: string) => void;
  onExportHTML: (text: string) => void;
  onExportLaTeX: (text: string) => void;
  onDetectAI: (text: string) => Promise<void>;
  onSendEmail: (to: string, subject: string, message: string, originalText: string, transformedText: string) => Promise<boolean>;
  onRewrite: (text: string, instructions: string) => Promise<void>;
  isDetecting: boolean;
  isSendingEmail: boolean;
  isRewriting?: boolean;
  inputText: string;
  outputAIResult?: { isAI: boolean; confidence: number; details: string } | null;
}

export function OutputEditor({
  text,
  onTextChange,
  onClear,
  onCopy,
  onExportPDF,
  onExportDOCX,
  onExportHTML,
  onExportLaTeX,
  onDetectAI,
  onSendEmail,
  onRewrite,
  isDetecting,
  isSendingEmail,
  isRewriting = false,
  inputText,
  outputAIResult
}: OutputEditorProps) {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [rewriteDialogOpen, setRewriteDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('EZ Reader - Transformed Document');
  const [emailMessage, setEmailMessage] = useState('Here is the transformed document you requested.');
  const [rewriteInstructions, setRewriteInstructions] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [showMathPreview, setShowMathPreview] = useState(true);
  const [isProcessingGraphs, setIsProcessingGraphs] = useState(false);
  
  // Calculate word count whenever text changes
  useEffect(() => {
    const words = text && text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
  }, [text]);

  // Detect graph placeholders and set processing state
  useEffect(() => {
    const hasGraphPlaceholders = /\[RENDER_GRAPH:[^\]]+\]/g.test(text);
    if (hasGraphPlaceholders && !isProcessingGraphs) {
      setIsProcessingGraphs(true);
    }
  }, [text, isProcessingGraphs]);
  
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

  const handleRewrite = async () => {
    if (!rewriteInstructions.trim()) return;
    
    await onRewrite(text, rewriteInstructions);
    setRewriteDialogOpen(false);
    setRewriteInstructions('');
  };
  
  return (
    <Card className="overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Output</h2>
          <Badge variant="outline" className="ml-2">{wordCount} words</Badge>
          <GraphProcessingIndicator isProcessing={isProcessingGraphs} />
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

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => setRewriteDialogOpen(true)}
                  disabled={!text || isRewriting}
                >
                  <RefreshCw className={`h-4 w-4 ${isRewriting ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Re-rewrite with custom instructions</TooltipContent>
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
              <DropdownMenuItem onClick={() => onExportHTML(text)}>
                Export as HTML
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExportLaTeX(text)}>
                Export as LaTeX
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEmailDialogOpen(true)}>
                Share by Email
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
                  className={`p-1 transition-colors ${showMathPreview ? 'text-blue-600 hover:text-blue-700' : 'text-slate-400 hover:text-slate-600'}`}
                  onClick={() => setShowMathPreview(!showMathPreview)}
                >
                  {showMathPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Math Preview</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <CardContent className="p-0">
        {showMathPreview && text ? (
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mx-4 mt-4 mb-0">
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Math Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="mt-0">
              <div className="editor overflow-y-auto p-0">
                <Textarea
                  className="min-h-[600px] h-full rounded-none border-0 resize-none focus-visible:ring-0"
                  placeholder="Processed text appears here..."
                  value={text}
                  onChange={(e) => onTextChange(e.target.value)}
                />
              </div>
            </TabsContent>
            <TabsContent value="preview" className="mt-0">
              <div className="min-h-[600px] border border-gray-200 rounded-none overflow-hidden">
                <MathRenderer content={text} className="min-h-[600px] w-full overflow-x-auto" />
                <MathGraphRenderer 
                  content={text} 
                  onContentUpdate={(updatedContent) => {
                    onTextChange(updatedContent);
                    setIsProcessingGraphs(false);
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="editor overflow-y-auto p-0 relative">
            {text ? (
              <>
                <Textarea
                  className="min-h-[600px] h-full rounded-none border-0 resize-none focus-visible:ring-0 pr-16"
                  placeholder="Processed text appears here... Click to edit directly"
                  value={text}
                  onChange={(e) => onTextChange(e.target.value)}
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'Georgia, serif'
                  }}
                />
                <div className="absolute top-4 right-4 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded shadow-sm">
                  Click to edit
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[600px] text-center p-6">
                <p className="text-slate-500">Processed text will appear here</p>
                <p className="text-xs text-slate-400 mt-2">Your content will be processed and ready for editing</p>
              </div>
            )}
          </div>
        )}
        
        {/* AI Detection Results */}
        {outputAIResult && (
          <div className="mt-3 flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Detection:</span>
            <Badge variant={outputAIResult.isAI ? "destructive" : "secondary"} className="font-medium">
              {Math.round(outputAIResult.confidence * 100)}%
            </Badge>
          </div>
        )}
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

      {/* Re-rewrite Dialog */}
      <Dialog open={rewriteDialogOpen} onOpenChange={setRewriteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-rewrite Output</DialogTitle>
            <DialogDescription>
              Provide instructions to modify the current output without copying/pasting.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rewrite-instructions">Instructions</Label>
              <Textarea
                id="rewrite-instructions"
                placeholder="e.g., Make it more detailed, change the tone to formal, add examples..."
                value={rewriteInstructions}
                onChange={(e) => setRewriteInstructions(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRewriteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRewrite} 
              disabled={!rewriteInstructions.trim() || isRewriting}
            >
              {isRewriting ? 'Rewriting...' : 'Re-rewrite'}
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
