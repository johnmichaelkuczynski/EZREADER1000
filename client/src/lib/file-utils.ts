import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

// Utility function to strip markdown syntax from text (client-side version)
function stripMarkdown(text: string): string {
  if (!text) return '';
  
  // Replace headers (### Header)
  text = text.replace(/#{1,6}\s+/g, '');
  
  // Replace bold/italic markers
  text = text.replace(/(\*\*|\*|__|_)/g, '');
  
  // Replace bullet points
  text = text.replace(/^\s*[\*\-\+]\s+/gm, '• ');
  
  // Replace numbered lists
  text = text.replace(/^\s*\d+\.\s+/gm, '');
  
  // Replace blockquotes
  text = text.replace(/^\s*>\s+/gm, '');
  
  // Replace code blocks
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`([^`]+)`/g, '$1');
  
  // Replace horizontal rules
  text = text.replace(/^\s*(\*{3,}|_{3,}|-{3,})\s*$/gm, '');
  
  // Replace links
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  
  // Replace images
  text = text.replace(/!\[([^\]]+)\]\([^\)]+\)/g, '');
  
  // Clean up multiple consecutive line breaks
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text;
}

// Removed PDF.js dependency to use a simpler approach for PDF extraction

// Extract text from a file (PDF or DOCX)
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;
  
  if (fileType === 'application/pdf') {
    return extractTextFromPDF(file);
  } else if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType === 'application/msword'
  ) {
    return extractTextFromDOCX(file);
  } else if (fileType === 'text/plain') {
    return extractTextFromTXT(file);
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
}

// Use server-side PDF processing for reliable text extraction
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Use the server-side API to process the PDF
    const formData = new FormData();
    formData.append("pdf", file);
    
    const response = await fetch("/api/process-pdf", {
      method: "POST",
      body: formData,
      credentials: "include"
    });
    
    if (!response.ok) {
      throw new Error(`PDF processing failed: ${response.status}`);
    }
    
    const result = await response.json();
    return result.text;
  } catch (error: unknown) {
    console.error('Error extracting text from PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to extract PDF text: ${errorMessage}`);
  }
}

// Extract text from DOCX using server-side processing
async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    // Use the server-side API to process the Word document
    const formData = new FormData();
    formData.append("docx", file);
    
    const response = await fetch("/api/process-docx", {
      method: "POST",
      body: formData,
      credentials: "include"
    });
    
    if (!response.ok) {
      throw new Error(`Word document processing failed: ${response.status}`);
    }
    
    const result = await response.json();
    return result.text;
  } catch (error: unknown) {
    console.error('Error extracting text from DOCX:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to extract text from Word document: ${errorMessage}`);
  }
}

// Extract text from TXT
async function extractTextFromTXT(file: File): Promise<string> {
  return await file.text();
}

// Export text as PDF
export function exportToPDF(text: string, filename = 'document.pdf'): void {
  const doc = new jsPDF();
  
  // Split text into lines to fit on the page
  const pageWidth = doc.internal.pageSize.getWidth() - 20;
  const fontSize = 12;
  doc.setFontSize(fontSize);
  
  const lines = doc.splitTextToSize(text, pageWidth);
  const lineHeight = fontSize * 0.5;
  
  let y = 20;
  let currentPage = 1;
  
  for (let i = 0; i < lines.length; i++) {
    if (y > 270) {
      doc.addPage();
      currentPage++;
      y = 20;
    }
    
    doc.text(lines[i], 10, y);
    y += lineHeight;
  }
  
  doc.save(filename);
}

// Export text as DOCX using proper Word document structure
export async function exportToDOCX(text: string, filename = 'document.docx'): Promise<void> {
  try {
    // Strip markdown formatting for clean DOCX output
    const cleanText = stripMarkdown(text);
    
    // Create proper Word document structure
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: cleanText.split('\n').map(line => 
            new Paragraph({
              children: [new TextRun(line || ' ')], // Use TextRun for proper formatting
            })
          ),
        },
      ],
    });

    // Generate proper DOCX blob and download using file-saver
    const blob = await Packer.toBlob(doc);
    saveAs(blob, filename);
    
  } catch (error) {
    console.error('Error exporting to DOCX:', error);
    throw new Error('Failed to export document as DOCX. Please try again.');
  }
}
