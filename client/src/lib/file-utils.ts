import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph } from 'docx';

// Set PDF.js worker path
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

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

// Extract text from PDF
async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const typedArray = new Uint8Array(arrayBuffer);
  
  try {
    const pdf = await pdfjs.getDocument({ data: typedArray }).promise;
    let text = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ');
      
      text += pageText + '\n';
    }
    
    return text;
  } catch (error: unknown) {
    console.error('Error extracting text from PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to extract text from PDF: ${errorMessage}`);
  }
}

// Extract text from DOCX
async function extractTextFromDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error: unknown) {
    console.error('Error extracting text from DOCX:', error);
    const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
    throw new Error(`Failed to extract text from DOCX: ${errorMessage}`);
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

// Export text as DOCX
export async function exportToDOCX(text: string, filename = 'document.docx'): Promise<void> {
  try {
    // Import required modules
    const { Document, Paragraph, Packer, TextRun } = await import('docx');
    
    // Process text to handle markdown-like formatting
    const lines = text.split('\n');
    const children = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === '') {
        // Add empty paragraph for spacing
        children.push(new Paragraph({}));
      } else if (line.startsWith('# ')) {
        // Heading 1
        children.push(new Paragraph({
          children: [new TextRun({ text: line.substring(2), bold: true, size: 36 })],
        }));
      } else if (line.startsWith('## ')) {
        // Heading 2
        children.push(new Paragraph({
          children: [new TextRun({ text: line.substring(3), bold: true, size: 30 })],
        }));
      } else if (line.startsWith('### ')) {
        // Heading 3
        children.push(new Paragraph({
          children: [new TextRun({ text: line.substring(4), bold: true, size: 26 })],
        }));
      } else {
        // Regular paragraph
        children.push(new Paragraph({
          children: [new TextRun({ text: line })],
        }));
      }
    }
    
    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: children
      }]
    });
    
    // Generate document buffer
    const buffer = await Packer.toBuffer(doc);
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    
    // Create download link
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    
    // Clean up
    URL.revokeObjectURL(link.href);
    
    console.log('DOCX export completed successfully');
  } catch (error) {
    console.error('Error exporting as DOCX:', error);
    throw new Error('Failed to export document as DOCX');
  }
}
