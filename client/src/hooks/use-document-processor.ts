import { useState, useRef, useCallback } from 'react';
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
  const [reprocessOutput, setReprocessOutput] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [llmProvider, setLLMProvider] = useState<LLMProvider>('openai');
  
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

  // Core text processing function
  const processText = useCallback(async (options: {
    inputText: string;
    instructions: string;
    contentSource: string;
    useContentSource: boolean;
    llmProvider: LLMProvider;
    examMode?: boolean;
  }) => {
    const response = await apiRequest('POST', '/api/process-text', options);
    const data = await response.json();
    return data.result;
  }, []);

  // Process document function
  const processDocument = useCallback(async (instructions: string, examMode?: boolean) => {
    if (!inputText.trim()) {
      toast({
        title: "No input text",
        description: "Please enter some text to process",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    
    try {
      const result = await processText({
        inputText,
        instructions,
        contentSource,
        useContentSource,
        llmProvider,
        examMode
      });
      
      setOutputText(result);
      
      // Add to messages
      const userMessage: Message = {
        id: Date.now().toString() + '_user',
        role: 'user',
        content: instructions || 'Process this document',
        timestamp: new Date()
      };
      
      const assistantMessage: Message = {
        id: Date.now().toString() + '_assistant',
        role: 'assistant',
        content: result,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage, assistantMessage]);
      
    } catch (error: any) {
      console.error('Error processing document:', error);
      toast({
        title: "Processing failed",
        description: error?.message || 'Unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  }, [inputText, contentSource, useContentSource, llmProvider, processText, toast]);

  // Process dialogue command - pure passthrough
  const processDialogueCommand = useCallback(async (userInput: string) => {
    if (!userInput.trim()) return;

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString() + '_user',
      role: 'user',
      content: userInput,
      timestamp: new Date()
    };

    // Add placeholder assistant message
    const assistantMessageId = Date.now().toString() + '_assistant';
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: 'Processing...',
      timestamp: new Date()
    };

    setDialogueMessages(prev => [...prev, userMessage, assistantMessage]);

    try {
      // Pure passthrough - send directly to LLM without any app interpretation
      const response = await processText({
        inputText: userInput,
        instructions: "",
        contentSource: "",
        useContentSource: false,
        llmProvider
      });

      // Update assistant message with the pure LLM response
      setDialogueMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId
          ? { ...msg, content: response }
          : msg
      ));

    } catch (error: any) {
      console.error('Error processing dialogue:', error);
      
      setDialogueMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId
          ? { ...msg, content: `Sorry, I encountered an error: ${error?.message || 'Unknown error'}` }
          : msg
      ));
    }
  }, [llmProvider, processText, setDialogueMessages]);

  // File upload handlers
  const handleInputFileUpload = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      
      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      setInputText(data.text);
      
      toast({
        title: "File uploaded successfully",
        description: `Extracted text from ${file.name}`,
      });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: error?.message || 'Failed to process file',
        variant: "destructive"
      });
    }
  }, [toast]);

  const handleContentSourceFileUpload = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      
      const response = await apiRequest('/api/process-pdf', {
        method: 'POST',
        body: formData
      });
      
      setContentSource(response.text);
      
      toast({
        title: "Content source uploaded",
        description: `Extracted text from ${file.name}`,
      });
    } catch (error: any) {
      console.error('Error uploading content source:', error);
      toast({
        title: "Upload failed",
        description: error?.message || 'Failed to process file',
        variant: "destructive"
      });
    }
  }, [toast]);

  const handleMultipleContentSourceFileUpload = useCallback(async (files: File[]) => {
    // Handle multiple file uploads
    for (const file of files) {
      await handleContentSourceFileUpload(file);
    }
  }, [handleContentSourceFileUpload]);

  const handleAudioTranscription = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('audio', file);
      
      const response = await apiRequest('/api/transcribe', {
        method: 'POST',
        body: formData
      });
      
      setInputText(prev => prev + '\n\n' + response.transcription);
      
      toast({
        title: "Audio transcribed",
        description: "Audio has been transcribed and added to input",
      });
    } catch (error: any) {
      console.error('Error transcribing audio:', error);
      toast({
        title: "Transcription failed",
        description: error?.message || 'Failed to transcribe audio',
        variant: "destructive"
      });
    }
  }, [toast]);

  // Math processing handlers
  const handleMathPDFUpload = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      
      const response = await apiRequest('/api/process-math-pdf', {
        method: 'POST',
        body: formData
      });
      
      setInputText(response.text);
      
      toast({
        title: "Math PDF processed",
        description: "Mathematical content extracted successfully",
      });
    } catch (error: any) {
      console.error('Error processing math PDF:', error);
      toast({
        title: "Processing failed",
        description: error?.message || 'Failed to process math PDF',
        variant: "destructive"
      });
    }
  }, [toast]);

  const handleMathImageUpload = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await apiRequest('/api/process-math-image', {
        method: 'POST',
        body: formData
      });
      
      setInputText(prev => prev + '\n\n' + response.text);
      
      toast({
        title: "Math image processed",
        description: "Mathematical content extracted from image",
      });
    } catch (error: any) {
      console.error('Error processing math image:', error);
      toast({
        title: "Processing failed",
        description: error?.message || 'Failed to process math image',
        variant: "destructive"
      });
    }
  }, [toast]);

  const enhanceMathFormatting = useCallback(async (text: string) => {
    try {
      const response = await apiRequest('/api/enhance-math', {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      
      return response.enhancedText;
    } catch (error: any) {
      console.error('Error enhancing math formatting:', error);
      throw error;
    }
  }, []);

  // AI Detection
  const detectAIText = useCallback(async (text: string, target: 'input' | 'output') => {
    if (target === 'input') {
      setIsInputDetecting(true);
    } else {
      setIsOutputDetecting(true);
    }
    
    try {
      const response = await apiRequest('/api/detect-ai', {
        method: 'POST',
        body: JSON.stringify({ text, llmProvider })
      });
      
      if (target === 'input') {
        setInputAIResult(response);
      } else {
        setOutputAIResult(response);
      }
      
    } catch (error: any) {
      console.error('Error detecting AI text:', error);
      toast({
        title: "Detection failed",
        description: error?.message || 'Failed to detect AI text',
        variant: "destructive"
      });
    } finally {
      if (target === 'input') {
        setIsInputDetecting(false);
      } else {
        setIsOutputDetecting(false);
      }
    }
  }, [llmProvider, toast]);

  // Clear functions
  const clearInput = useCallback(() => {
    setInputText('');
    setInputAIResult(null);
  }, []);

  const clearOutput = useCallback(() => {
    setOutputText('');
    setOutputAIResult(null);
  }, []);

  const clearChat = useCallback(() => {
    setDialogueMessages([]);
  }, []);

  const resetAll = useCallback(() => {
    setInputText('');
    setOutputText('');
    setContentSource('');
    setMessages([]);
    setDialogueMessages([]);
    setInputAIResult(null);
    setOutputAIResult(null);
    setSpecialContent('');
    setShowSpecialContent(false);
  }, []);

  // Chunk processing
  const processSelectedChunks = useCallback(async (selectedIndexes: number[], instructions: string) => {
    const selectedText = selectedIndexes.map(i => documentChunks[i]).join('\n\n');
    
    try {
      const result = await processText({
        inputText: selectedText,
        instructions,
        contentSource,
        useContentSource,
        llmProvider
      });
      
      setOutputText(result);
      setShowChunkSelector(false);
      
    } catch (error: any) {
      console.error('Error processing selected chunks:', error);
      toast({
        title: "Processing failed",
        description: error?.message || 'Failed to process selected chunks',
        variant: "destructive"
      });
    }
  }, [documentChunks, contentSource, useContentSource, llmProvider, processText, toast]);

  const processSelectedDocumentChunks = useCallback((instructions: string) => {
    // Chunk the document for selection
    const chunks = inputText.split('\n\n').filter(chunk => chunk.trim().length > 0);
    setDocumentChunks(chunks);
    setShowChunkSelector(true);
  }, [inputText]);

  const cancelProcessing = useCallback(() => {
    setProcessing(false);
  }, []);

  // Placeholder functions for synthesis mode
  const processSpecialCommand = useCallback(async (command: string) => {
    // Simplified implementation
  }, []);

  const processGlobalQuestion = useCallback(async (query: string) => {
    // Simplified implementation
  }, []);

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
    reprocessOutput,
    setReprocessOutput,
    messages,
    setMessages,
    dialogueMessages,
    setDialogueMessages,
    processing,
    
    // Core functions
    processDocument,
    processDialogueCommand,
    processSelectedDocumentChunks,
    cancelProcessing,
    
    // File handling
    inputFileRef,
    contentSourceFileRef,
    audioRef,
    handleInputFileUpload,
    handleContentSourceFileUpload,
    handleMultipleContentSourceFileUpload,
    handleAudioTranscription,
    handleMathPDFUpload,
    handleMathImageUpload,
    enhanceMathFormatting,
    
    // AI Detection
    isInputDetecting,
    isOutputDetecting,
    inputAIResult,
    outputAIResult,
    detectAIText,
    
    // Clear functions
    clearInput,
    clearOutput,
    clearChat,
    resetAll,
    
    // Special commands
    processSpecialCommand,
    specialContent,
    setSpecialContent,
    showSpecialContent,
    setShowSpecialContent,
    
    // LLM Provider
    llmProvider,
    setLLMProvider,
    
    // Chunk processing
    documentChunks,
    showChunkSelector,
    setShowChunkSelector,
    processSelectedChunks,
    
    // Synthesis mode
    enableSynthesisMode,
    setEnableSynthesisMode,
    documentMap,
    processGlobalQuestion
  };
}