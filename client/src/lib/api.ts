import { apiRequest } from "./queryClient";
import type { 
  ProcessTextRequest, 
  ProcessChunkRequest,
  AIDetectionResult, 
  SearchResult,
  EmailData,
  SavedInstruction
} from "@/types";

// SEPARATE HOMEWORK SOLVER - BYPASSES ALL REWRITE LOGIC
export async function solveHomework(assignment: string, llmProvider: string): Promise<string> {
  const response = await apiRequest("POST", "/api/solve-homework", { assignment, llmProvider });
  const result = await response.json();
  return result.result;
}

// Process text with the selected LLM
export async function processText(data: ProcessTextRequest): Promise<string> {
  const response = await apiRequest("POST", "/api/process-text", data);
  const result = await response.json();
  return result.result;
}

// Process a chunk of text for large documents
export async function processChunk(data: ProcessChunkRequest): Promise<{
  result: string;
  chunkIndex: number;
  totalChunks: number;
}> {
  const response = await apiRequest("POST", "/api/process-chunk", data);
  return await response.json();
}

// Detect if text was AI-generated
export async function detectAI(text: string, llmProvider: string = "openai"): Promise<AIDetectionResult> {
  const response = await apiRequest("POST", "/api/detect-ai", { text, llmProvider });
  return await response.json();
}

// Transcribe audio file
export async function transcribeAudio(audioFile: File): Promise<string> {
  const formData = new FormData();
  formData.append("audio", audioFile);
  
  const response = await fetch("/api/transcribe", {
    method: "POST",
    body: formData,
    credentials: "include"
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transcription failed: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  return result.result;
}

// Process PDF file using server-side extraction
export async function processPDFFile(pdfFile: File): Promise<string> {
  const formData = new FormData();
  formData.append("pdf", pdfFile);
  
  const response = await fetch("/api/process-pdf", {
    method: "POST",
    body: formData,
    credentials: "include"
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PDF processing failed: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  return result.text;
}

// Search for content online
export async function searchOnline(query: string): Promise<{
  results: SearchResult[];
  content: string;
}> {
  const response = await apiRequest("POST", "/api/search-online", { query });
  return await response.json();
}

// Fetch content from a URL
export async function fetchContent(url: string): Promise<string> {
  const response = await apiRequest("POST", "/api/fetch-content", { url });
  const result = await response.json();
  return result.content;
}

// Send email with processed text
export async function sendEmail(data: EmailData): Promise<boolean> {
  const response = await apiRequest("POST", "/api/send-email", data);
  const result = await response.json();
  return result.success;
}

// Save instructions
export async function saveInstructions(name: string, instructions: string): Promise<SavedInstruction> {
  const response = await apiRequest("POST", "/api/save-instructions", { name, instructions });
  return await response.json();
}

// Extract text from image using Mathpix OCR (including math)
export async function extractTextFromImage(file: File): Promise<{ text: string; confidence?: number }> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch("/api/process-image-ocr", {
    method: "POST",
    body: formData,
    credentials: "include"
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to extract text from image: ${response.status} - ${errorText}`);
  }
  
  return await response.json();
}

// Get saved instructions
export async function getSavedInstructions(): Promise<SavedInstruction[]> {
  const response = await fetch("/api/saved-instructions", {
    credentials: "include"
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get saved instructions: ${response.status} - ${errorText}`);
  }
  
  return await response.json();
}
