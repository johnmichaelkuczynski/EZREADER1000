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
  
  // Rewrite instructions for chunking
  const [rewriteInstructions, setRewriteInstructions] = useState('');

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

    // Check if document needs chunking (over 40,000 characters)
    if (inputText.length > 40000) {
      // Split into chunks and show chunk selector
      const chunks = inputText.split(/\n\n+/).filter(chunk => chunk.trim().length > 0);
      if (chunks.length > 1) {
        setDocumentChunks(chunks);
        setShowChunkSelector(true);
        setRewriteInstructions(instructions);
        return;
      }
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
      let extractedText = '';
      
      if (file.type === 'application/pdf') {
        const formData = new FormData();
        formData.append('pdf', file);
        
        const response = await fetch('/api/process-pdf', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`PDF processing failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        extractedText = result.text;
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.type === 'application/msword'
      ) {
        const formData = new FormData();
        formData.append('docx', file);
        
        const response = await fetch('/api/process-docx', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Word document processing failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        extractedText = result.text;
      } else if (file.type === 'text/plain') {
        extractedText = await file.text();
      } else {
        throw new Error(`Unsupported file type: ${file.type}`);
      }
      
      setInputText(extractedText);
      
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
      
      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      setContentSource(result.text);
      
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
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      setInputText(prev => prev + '\n\n' + result.result);
      
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
      
      const response = await fetch('/api/process-math-pdf', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      setInputText(result.text);
      
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
      
      const response = await fetch('/api/process-math-image', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      setInputText(prev => prev + '\n\n' + result.text);
      
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
      const response = await apiRequest('POST', '/api/enhance-math', { text });
      const result = await response.json();
      return result.enhancedText;
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
      const response = await apiRequest('POST', '/api/detect-ai', { text, llmProvider });
      const result = await response.json();
      
      if (target === 'input') {
        setInputAIResult(result);
      } else {
        setOutputAIResult(result);
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



  const processSelectedDocumentChunks = useCallback((instructions: string) => {
    // Chunk the document for selection - split into proper chunks with good size
    const text = inputText.trim();
    if (!text) return;
    
    // Split by paragraphs first, then group into reasonable chunks
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    const chunks = [];
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > 2000 && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    console.log('Created chunks:', chunks.length, 'chunks with lengths:', chunks.map(c => c.length));
    setDocumentChunks(chunks);
    setShowChunkSelector(true);
    setRewriteInstructions(instructions);
  }, [inputText]);

  // Process selected chunks with advanced options (rewrite, add, both)
  const processSelectedChunks = useCallback(async (
    selectedIndices: number[],
    mode: 'rewrite' | 'add' | 'both',
    additionalChunks: number = 0
  ) => {
    try {
      console.log('Processing chunks:', { selectedIndices, mode, additionalChunks, documentChunks: documentChunks.length });
      setShowChunkSelector(false);
      setProcessing(true);
      
      let result = '';
      
      if (mode === 'rewrite' && selectedIndices.length > 0) {
        // Rewrite selected chunks only
        console.log('Rewrite mode: processing', selectedIndices.length, 'chunks');
        const selectedText = selectedIndices.map(i => documentChunks[i]).join('\n\n');
        
        // Use the API directly instead of the processText function
        const response = await fetch('/api/process-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputText: selectedText,
            instructions: rewriteInstructions,
            contentSource,
            useContentSource,
            llmProvider
          }),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        result = data.result;
        
      } else if (mode === 'add') {
        // Add new chunks to existing document
        console.log('Add mode: generating', additionalChunks, 'new chunks');
        const existingText = documentChunks.join('\n\n');
        const addPrompt = `${rewriteInstructions}\n\nGenerate ${additionalChunks} additional section(s) that complement this document:\n\n${existingText}`;
        
        const response = await fetch('/api/process-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputText: addPrompt,
            instructions: `Generate ${additionalChunks} new section(s) based on the provided document`,
            contentSource,
            useContentSource,
            llmProvider
          }),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        result = existingText + '\n\n' + data.result;
        
      } else if (mode === 'both') {
        // Rewrite selected chunks AND add new ones
        console.log('Both mode: rewriting', selectedIndices.length, 'chunks and adding', additionalChunks, 'new chunks');
        let finalContent = [...documentChunks];
        
        // First rewrite selected chunks
        if (selectedIndices.length > 0) {
          const selectedText = selectedIndices.map(i => documentChunks[i]).join('\n\n');
          
          const rewriteResponse = await fetch('/api/process-text', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inputText: selectedText,
              instructions: rewriteInstructions,
              contentSource,
              useContentSource,
              llmProvider
            }),
          });
          
          if (!rewriteResponse.ok) {
            throw new Error(`HTTP error! status: ${rewriteResponse.status}`);
          }
          
          const rewriteData = await rewriteResponse.json();
          const rewrittenText = rewriteData.result;
          
          // Replace selected chunks with rewritten versions
          const rewrittenChunks = rewrittenText.split('\n\n').filter((chunk: string) => chunk.trim());
          selectedIndices.forEach((originalIndex, idx) => {
            if (idx < rewrittenChunks.length) {
              finalContent[originalIndex] = rewrittenChunks[idx];
            }
          });
        }
        
        // Then add new chunks
        if (additionalChunks > 0) {
          const currentText = finalContent.join('\n\n');
          const addPrompt = `${rewriteInstructions}\n\nGenerate ${additionalChunks} additional section(s) that complement this document:\n\n${currentText}`;
          
          const addResponse = await fetch('/api/process-text', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inputText: addPrompt,
              instructions: `Generate ${additionalChunks} new section(s) based on the provided document`,
              contentSource,
              useContentSource,
              llmProvider
            }),
          });
          
          if (!addResponse.ok) {
            throw new Error(`HTTP error! status: ${addResponse.status}`);
          }
          
          const addData = await addResponse.json();
          finalContent.push(...addData.result.split('\n\n').filter((chunk: string) => chunk.trim()));
        }
        
        result = finalContent.join('\n\n');
      }
      
      console.log('Chunk processing completed, result length:', result.length);
      setOutputText(result);
      
      toast({
        title: "Chunk processing completed",
        description: `Successfully processed ${selectedIndices.length} chunks in ${mode} mode`,
      });
      
    } catch (error: any) {
      console.error('Error processing chunks:', error);
      toast({
        title: "Processing failed",
        description: error?.message || 'Failed to process selected chunks',
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  }, [documentChunks, rewriteInstructions, contentSource, useContentSource, llmProvider, toast]);

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