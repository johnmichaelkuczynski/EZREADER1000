import * as pdfjsLib from 'pdfjs-dist';

// Disable worker requirement for server-side use
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

/**
 * Extract text from a PDF buffer using the PDF.js library
 * This handles proper text extraction from PDF documents
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: pdfBuffer,
      disableFontFace: true,
    });
    
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    
    // Begin extracting metadata if available
    let documentInfo = '';
    try {
      const metadata = await pdf.getMetadata();
      if (metadata.info) {
        const info = metadata.info as any;
        if (info.Title) documentInfo += `Title: ${info.Title}\n`;
        if (info.Author) documentInfo += `Author: ${info.Author}\n`;
        if (info.Subject) documentInfo += `Subject: ${info.Subject}\n`;
        if (info.Keywords) documentInfo += `Keywords: ${info.Keywords}\n`;
      }
    } catch (metaError) {
      console.log('Could not extract PDF metadata:', metaError);
    }
    
    // Process all pages to extract text
    let fullText = '';
    
    for (let i = 1; i <= numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Process each text item from the page
        if (textContent.items) {
          const pageText = textContent.items
            .map((item: any) => item.str || '')
            .join(' ');
          
          fullText += `\n--- Page ${i} ---\n${pageText}\n`;
        }
      } catch (pageError) {
        console.log(`Error processing page ${i}:`, pageError);
      }
    }
    
    // Format the final output
    let result = `PDF Document (${numPages} pages)\n`;
    if (documentInfo) {
      result += `\n${documentInfo}\n`;
    }
    
    result += `\nContent:\n${fullText}`;
    
    return result;
  } catch (error) {
    console.error('PDF processing error:', error);
    return `Error processing PDF: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}