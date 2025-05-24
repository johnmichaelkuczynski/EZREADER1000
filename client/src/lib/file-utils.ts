import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

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

// More advanced PDF text extraction
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // First extract the title and basic info from the filename
    const filename = file.name;
    const fileSize = Math.round(file.size/1024);
    
    // Create a header with file information
    let extractedText = `# PDF Document: ${filename}\n`;
    extractedText += `File size: ${fileSize} KB\n\n`;
    
    // Try to extract some readable text from readable portions
    try {
      // Use ArrayBuffer to get better control over the binary data
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      // Convert to string and look for text patterns
      let textContent = '';
      
      // Try to find PDF text objects (between BT and ET markers)
      const pdfStr = new TextDecoder('utf-8').decode(bytes);
      
      // Extract the first part of the document that might contain metadata
      const header = pdfStr.substring(0, Math.min(1000, pdfStr.length));
      
      // Try to extract title from PDF metadata
      const titleMatch = header.match(/\/Title\s*\(([^)]+)\)/i);
      if (titleMatch && titleMatch[1]) {
        extractedText += `Title: ${titleMatch[1].trim()}\n`;
      }
      
      // Try to extract author from PDF metadata
      const authorMatch = header.match(/\/Author\s*\(([^)]+)\)/i);
      if (authorMatch && authorMatch[1]) {
        extractedText += `Author: ${authorMatch[1].trim()}\n`;
      }
      
      // Try to extract keywords from readable text portions
      let readableText = '';
      
      // Look for common readable text patterns in PDFs
      const readableSegments = pdfStr.match(/\(([A-Za-z0-9\s.,;:'"!?()-]{10,})\)/g) || [];
      if (readableSegments.length > 0) {
        // Process only the clearest text segments
        const cleanSegments = readableSegments
          .map(seg => seg.substring(1, seg.length - 1)) // Remove parentheses
          .filter(seg => seg.length > 15 && seg.split(/\s+/).length > 3) // Only multi-word segments
          .map(seg => seg.replace(/\\n/g, '\n').replace(/\\r/g, '')) // Handle escaped newlines
          .slice(0, 50); // Limit to first 50 segments to avoid overwhelming
        
        readableText = cleanSegments.join('\n');
      }
      
      if (readableText.length > 100) {
        extractedText += "\n## Content Preview:\n" + readableText;
      } else {
        // If we couldn't extract clean text, add a note
        extractedText += "\nThis PDF file contains limited machine-readable text content. You may need to refer to specific elements by describing their visual appearance or position in the document.";
      }
    } catch (parseError) {
      // If detailed extraction fails, provide a fallback
      extractedText += "\nUnable to extract detailed content from this PDF. You can still reference it in your instructions by document name.";
    }
    
    return extractedText;
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
