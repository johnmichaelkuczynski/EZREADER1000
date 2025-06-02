import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export type LLMProvider = 'openai' | 'anthropic' | 'perplexity';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useDocumentProcessor() {
  const { toast } = useToast();
  
  // Core state
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [contentSource, setContentSource] = useState('');
  const [useContentSource, setUseContentSource] = useState(false);
  
  // Style source state
  const [styleSource, setStyleSource] = useState('');
  const [useStyleSource, setUseStyleSource] = useState(false);
  const [reprocessOutput, setReprocessOutput] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [llmProvider, setLLMProvider] = useState<LLMProvider>('openai');
  
  // Homework mode state
  const [homeworkMode, setHomeworkMode] = useState(false);
  
  // Messages for main processing
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Dialogue system state
  const [dialogueMessages, setDialogueMessages] = useState<Message[]>([]);
  
  // AI Detection state
  const [isInputDetecting, setIsInputDetecting] = useState(false);
  const [isOutputDetecting, setIsOutputDetecting] = useState(false);
  const [inputAIResult, setInputAIResult] = useState<any>(null);
  const [outputAIResult, setOutputAIResult] = useState<any>(null);
  
  // File upload refs
  const inputFileRef = useRef<HTMLInputElement>(null);
  const contentSourceFileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  
  // Special content for commands
  const [specialContent, setSpecialContent] = useState('');
  const [showSpecialContent, setShowSpecialContent] = useState(false);
  
  // Document chunks
  const [documentChunks, setDocumentChunks] = useState<string[]>([]);
  const [showChunkSelector, setShowChunkSelector] = useState(false);
  const [dialogueChunks, setDialogueChunks] = useState<string[]>([]);
  
  // Document synthesis mode
  const [enableSynthesisMode, setEnableSynthesisMode] = useState(false);
  const [documentMap, setDocumentMap] = useState<string[]>([]);
  
  // Rewrite instructions for chunking - persist last used instructions
  const [rewriteInstructions, setRewriteInstructions] = useState('');
  const [lastUsedInstructions, setLastUsedInstructions] = useState('');
  
  // Rewrite history for "Rewrite the Rewrite" functionality
  const [rewriteHistory, setRewriteHistory] = useState<{
    originalText: string;
    previousInstructions: string;
    currentRewrite: string;
  } | null>(null);
  const [showRewriteTheRewrite, setShowRewriteTheRewrite] = useState(false);
  const [rewriteTheRewriteInstructions, setRewriteTheRewriteInstructions] = useState('');

  return {
    // Core state
    inputText,
    setInputText,
    outputText,
    setOutputText,
    contentSource,
    setContentSource,
    useContentSource,
    setUseContentSource,
    styleSource,
    setStyleSource,
    useStyleSource,
    setUseStyleSource,
    reprocessOutput,
    setReprocessOutput,
    messages,
    setMessages,
    dialogueMessages,
    setDialogueMessages,
    processing,
    
    // LLM Provider
    llmProvider,
    setLLMProvider,
    
    // Chunk processing
    documentChunks,
    showChunkSelector,
    setShowChunkSelector,
    
    // Rewrite the Rewrite functionality
    rewriteHistory,
    showRewriteTheRewrite,
    setShowRewriteTheRewrite,
    rewriteTheRewriteInstructions,
    setRewriteTheRewriteInstructions,
  };
}