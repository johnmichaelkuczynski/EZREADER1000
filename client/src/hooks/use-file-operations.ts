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
  
  // Export text as PDF using Puppeteer - captures exactly what you see
  const exportAsPDF = useCallback(async (text: string, filename = 'document') => {
    if (!text) {
      toast({
        title: "Nothing to export",
        description: "There is no text to export as PDF.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsExporting(true);
      
      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: text,
          filename: filename.replace('.pdf', '')
        })
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename.replace('.pdf', '')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "PDF Export Complete",
        description: "Your document has been exported with perfect math rendering!",
      });
    } catch (err) {
      const error = err as Error;
      console.error('Error exporting PDF:', error);
      toast({
        title: "Export failed",
        description: error.message || "Failed to export PDF",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  }, [toast]);
  
  // Export text as DOCX
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
  const sendEmailWithDocument = useCallback(async (
    to: string,
    subject: string,
    message: string,
    originalText: string,
    transformedText: string
  ): Promise<boolean> => {
    if (!to || !subject || !transformedText) {
      toast({
        title: "Missing information",
        description: "Email address, subject, and transformed text are required.",
        variant: "destructive"
      });
      return false;
    }
    
    try {
      setIsSendingEmail(true);
      
      await sendEmail({
        to,
        subject,
        text: message,
        originalText,
        transformedText
      });
      
      toast({
        title: "Email sent successfully",
        description: `Document sent to ${to}`,
      });
      
      return true as boolean; // Success
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
    return true;
  }, [toast]);
  
  return {
    isExporting,
    isSendingEmail,
    copyToClipboard,
    exportAsPDF,
    exportAsDOCX,
    sendEmailWithDocument
  };
}
