import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

// Configure PDF.js to work without requiring a worker file
// This is a simpler approach that works in more environments
pdfjs.GlobalWorkerOptions.workerSrc = '';

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
  try {
    // Get the file data
    const arrayBuffer = await file.arrayBuffer();
    const typedArray = new Uint8Array(arrayBuffer);
    
    // Create a PDF loading task with simplified options
    const loadingTask = pdfjs.getDocument({
      data: typedArray,
      disableFontFace: true,
    });
    
    const pdf = await loadingTask.promise;
    let text = '';
    
    // Process each page
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

// Export text as DOCX using proper Word document structure
export async function exportToDOCX(text: string, filename = 'document.docx'): Promise<void> {
  try {
    // Create proper Word document structure
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: text.split('\n').map(line => 
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
