import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Copy, Download, Mail, FileType, FileText } from 'lucide-react';

interface SpecialContentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  onCopyToClipboard: (text: string) => Promise<void>;
  onExportPDF: (text: string) => void;
  onExportDOCX: (text: string) => Promise<void>;
  onSendEmail: (params: { to: string; subject: string; message: string; document: string }) => Promise<boolean>;
}

export function SpecialContentPopup({
  isOpen,
  onClose,
  content,
  onCopyToClipboard,
  onExportPDF,
  onExportDOCX,
  onSendEmail
}: SpecialContentPopupProps) {
  const [activeTab, setActiveTab] = useState('view');
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('Generated Content');
  const [emailMessage, setEmailMessage] = useState('Please find the generated content attached.');
  const [isSending, setIsSending] = useState(false);
  
  const { toast } = useToast();
  
  // Copy content to clipboard
  const handleCopy = async () => {
    try {
      await onCopyToClipboard(content);
      toast({
        title: "Copied to clipboard",
        description: "Content has been copied to your clipboard."
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy content to clipboard.",
        variant: "destructive"
      });
    }
  };
  
  // Export as PDF
  const handleExportPDF = () => {
    try {
      onExportPDF(content);
      toast({
        title: "PDF exported",
        description: "Content has been exported as PDF."
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export content as PDF.",
        variant: "destructive"
      });
    }
  };
  
  // Export as DOCX
  const handleExportDOCX = async () => {
    try {
      await onExportDOCX(content);
      toast({
        title: "DOCX exported",
        description: "Content has been exported as DOCX."
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export content as DOCX.",
        variant: "destructive"
      });
    }
  };
  
  // Send email
  const handleSendEmail = async () => {
    if (!emailTo) {
      toast({
        title: "Email required",
        description: "Please enter a recipient email address.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSending(true);
    
    try {
      await onSendEmail({
        to: emailTo,
        subject: emailSubject,
        message: emailMessage,
        document: content
      });
      
      toast({
        title: "Email sent",
        description: "Content has been sent to " + emailTo
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Send failed",
        description: "Failed to send email.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Generated Content</DialogTitle>
          <DialogDescription>
            View, download or share the content generated from your dialogue.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="view">View Content</TabsTrigger>
            <TabsTrigger value="share">Download & Share</TabsTrigger>
          </TabsList>
          
          <TabsContent value="view" className="flex-1">
            <div className="border rounded-md my-2 h-[50vh] overflow-auto">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap p-4">
                {content}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
              <Button onClick={() => setActiveTab('share')}>
                Download & Share
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="share" className="flex-1 overflow-auto space-y-4">
            <div className="space-y-4 p-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="w-full justify-start" onClick={handleExportPDF}>
                  <FileType className="h-4 w-4 mr-2" />
                  Export as PDF
                </Button>
                
                <Button variant="outline" className="w-full justify-start" onClick={handleExportDOCX}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as DOCX
                </Button>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-2">Send via Email</h3>
                <div className="space-y-3">
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
                  
                  <Button 
                    className="w-full" 
                    onClick={handleSendEmail}
                    disabled={isSending || !emailTo}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {isSending ? 'Sending...' : 'Send Email'}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}