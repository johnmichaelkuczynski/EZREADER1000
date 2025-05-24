import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import * as pdfParse from 'pdf-parse';

const writeFileAsync = promisify(fs.writeFile);
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);

/**
 * Extract text content from a PDF buffer
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    // Use pdf-parse library to extract text
    const data = await pdfParse.default(pdfBuffer);
    
    // Get metadata and text content
    const { text, info, metadata, numPages } = data;
    
    // Format the output with metadata
    let result = `# PDF Document\n`;
    result += `Pages: ${numPages}\n`;
    
    // Add available metadata
    if (info && typeof info === 'object') {
      if (info.Title) result += `Title: ${info.Title}\n`;
      if (info.Author) result += `Author: ${info.Author}\n`;
      if (info.Subject) result += `Subject: ${info.Subject}\n`;
      if (info.Keywords) result += `Keywords: ${info.Keywords}\n`;
      if (info.CreationDate) {
        const dateStr = info.CreationDate.toString();
        result += `Creation Date: ${dateStr}\n`;
      }
    }
    
    result += `\n## Content:\n\n${text}`;
    
    return result;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    return 'Failed to extract text from PDF. The file may be encrypted, damaged, or contain image-based content without searchable text.';
  }
}

/**
 * Process a PDF file from a temporary location and extract its text
 */
export async function processPDFFile(fileBuffer: Buffer): Promise<string> {
  try {
    return await extractTextFromPDF(fileBuffer);
  } catch (error) {
    console.error('Error processing PDF file:', error);
    throw new Error('Failed to process PDF file');
  }
}