export type LLMProvider = "openai" | "anthropic" | "perplexity";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface ProcessTextRequest {
  inputText: string;
  contentSource?: string;
  instructions: string;
  llmProvider: LLMProvider;
  useContentSource: boolean;
  reprocessOutput?: boolean;
}

export interface ProcessChunkRequest extends ProcessTextRequest {
  chunkIndex: number;
  totalChunks: number;
}

export interface ProcessingStatus {
  isProcessing: boolean;
  currentChunk: number;
  totalChunks: number;
  progress: number;
}

export interface AIDetectionResult {
  isAI: boolean;
  confidence: number;
  details: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SavedInstruction {
  id: number;
  name: string;
  instructions: string;
  userId: number;
  createdAt: Date;
}

export interface ContentSourceTab {
  id: "manual" | "upload" | "search";
  label: string;
}

export interface EmailData {
  to: string;
  subject: string;
  text: string;
  originalText: string;
  transformedText: string;
}
