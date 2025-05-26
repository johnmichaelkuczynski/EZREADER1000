import { useState, useCallback } from 'react';
import { exportToPDF, exportToDOCX } from '@/lib/file-utils';
import { useToast } from '@/hooks/use-toast';
import { sendEmail } from '@/lib/api';

export function useFileOperations() {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const { toast } = useToast();
  
  // Copy text to clipboard
  const copyToClipboard = useCallback(async (text: string) => {
    if (!text) {
      toast({
        title: "Nothing to copy",
        description: "There is no text to copy to clipboard.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Text copied successfully.",
      });
    } catch (err) {
      const error = err as Error;
      console.error('Error copying to clipboard:', error);
      toast({
        title: "Copy failed",
        description: error.message || "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  }, [toast]);
  
  // Export text as PDF using browser print dialog - perfect for math rendering
  const exportAsPDF = useCallback((text: string, filename = 'document.pdf') => {
    if (!text) {
      toast({
        title: "Nothing to export",
        description: "There is no text to export as PDF.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Use browser's print dialog for perfect math rendering
      window.print();
      toast({
        title: "Print Dialog Opened",
        description: "Use 'Save as PDF' in the print dialog to download your document with perfect math formatting.",
      });
    } catch (err) {
      const error = err as Error;
      console.error('Error opening print dialog:', error);
      toast({
        title: "Print failed",
        description: error.message || "Failed to open print dialog",
        variant: "destructive"
      });
    }
  }, [toast]);
  
  // Export text as DOCX - skip math content as requested
  const exportAsDOCX = useCallback(async (text: string, filename = 'document.docx') => {
    if (!text) {
      toast({
        title: "Nothing to export",
        description: "There is no text to export as DOCX.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsExporting(true);
      await exportToDOCX(text, filename);
      
      toast({
        title: "Export successful",
        description: `Exported as ${filename}`,
      });
    } catch (err) {
      const error = err as Error;
      console.error('Error exporting as DOCX:', error);
      toast({
        title: "Export failed",
        description: error.message || "Failed to export as DOCX",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  }, [toast]);
  
  // Send email with document
  const sendDocumentEmail = useCallback(async (
    to: string, 
    subject: string, 
    message: string, 
    originalText: string, 
    transformedText: string
  ) => {
    if (!to || !subject || !transformedText) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return false;
    }
    
    try {
      setIsSendingEmail(true);
      
      const success = await sendEmail({
        to,
        subject,
        text: message,
        originalText,
        transformedText
      });
      
      if (success) {
        toast({
          title: "Email sent",
          description: `Document sent successfully to ${to}`,
        });
        return true;
      } else {
        throw new Error('Email sending failed');
      }
    } catch (err) {
      const error = err as Error;
      console.error('Error sending email:', error);
      toast({
        title: "Email failed",
        description: error.message || "Failed to send email",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSendingEmail(false);
    }
  }, [toast]);
  
  return {
    isExporting,
    isSendingEmail,
    copyToClipboard,
    exportAsPDF,
    exportAsDOCX,
    sendDocumentEmail
  };
}