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
  
  // Homework mode state
  const [homeworkMode, setHomeworkMode] = useState(false);
  
  // Rewrite history for "Rewrite the Rewrite" functionality
  const [rewriteHistory, setRewriteHistory] = useState<{
    originalText: string;
    previousInstructions: string;
    currentRewrite: string;
  } | null>(null);
  const [showRewriteTheRewrite, setShowRewriteTheRewrite] = useState(false);
  const [rewriteTheRewriteInstructions, setRewriteTheRewriteInstructions] = useState('');

  // Process selected chunks with multiple modes support
  const processSelectedChunks = useCallback(async (
    selectedIndices: number[],
    modes: ('rewrite' | 'add' | 'expand')[],
    additionalChunks: number = 0
  ) => {
    try {
      console.log('Processing chunks:', { selectedIndices, modes, additionalChunks, documentChunks: documentChunks.length });
      setShowChunkSelector(false);
      setProcessing(true);
      
      // Clear output and start fresh
      setOutputText('');
      let workingContent = [...documentChunks];
      let finalResult = workingContent.join('\n\n');
      
      // Process modes sequentially - supports multiple modes now
      if (modes.includes('rewrite') && selectedIndices.length > 0) {
        console.log('Rewrite mode: processing', selectedIndices.length, 'chunks');
        
        for (let i = 0; i < selectedIndices.length; i++) {
          const chunkIndex = selectedIndices[i];
          const chunkText = workingContent[chunkIndex];
          
          const response = await fetch('/api/process-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inputText: chunkText,
              instructions: rewriteInstructions,
              contentSource,
              useContentSource,
              llmProvider
            }),
          });
          
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          
          const data = await response.json();
          workingContent[chunkIndex] = data.result;
          finalResult = workingContent.join('\n\n');
          setOutputText(finalResult);
        }
      }
      
      if (modes.includes('expand') && selectedIndices.length > 0) {
        console.log('Expand mode: expanding', selectedIndices.length, 'chunks');
        
        for (let i = 0; i < selectedIndices.length; i++) {
          const chunkIndex = selectedIndices[i];
          const chunkText = workingContent[chunkIndex];
          
          const expandPrompt = `${rewriteInstructions}\n\nExpand this section with additional content:\n\n${chunkText}`;
          
          const response = await fetch('/api/process-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inputText: expandPrompt,
              instructions: 'Expand this content with more details while keeping the original',
              contentSource,
              useContentSource,
              llmProvider
            }),
          });
          
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          
          const data = await response.json();
          workingContent[chunkIndex] = data.result;
          finalResult = workingContent.join('\n\n');
          setOutputText(finalResult);
        }
      }
      
      if (modes.includes('add') && additionalChunks > 0) {
        console.log('Add mode: generating', additionalChunks, 'new chunks');
        
        const addPrompt = `${rewriteInstructions}\n\nGenerate ${additionalChunks} additional sections:\n\n${finalResult}`;
        
        const response = await fetch('/api/process-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inputText: addPrompt,
            instructions: `Generate ${additionalChunks} new sections`,
            contentSource,
            useContentSource,
            llmProvider
          }),
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        finalResult = finalResult + '\n\n' + data.result;
        setOutputText(finalResult);
      }
      
      // Capture rewrite history for "Rewrite the Rewrite" functionality
      setRewriteHistory({
        originalText: documentChunks.join('\n\n'),
        previousInstructions: rewriteInstructions,
        currentRewrite: finalResult
      });
      
      // Show the "Rewrite the Rewrite" option after processing
      setShowRewriteTheRewrite(true);
      
      toast({
        title: "Processing completed",
        description: `Successfully processed ${modes.join(', ')} modes`,
      });
      
    } catch (error: any) {
      console.error('Error processing chunks:', error);
      toast({
        title: "Processing failed",
        description: error?.message || 'Failed to process chunks',
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  }, [documentChunks, rewriteInstructions, contentSource, useContentSource, llmProvider, toast]);

  // Process "Rewrite the Rewrite" functionality
  const processRewriteTheRewrite = useCallback(async () => {
    if (!rewriteHistory) return;
    
    try {
      setProcessing(true);
      setShowRewriteTheRewrite(false);
      
      if (!rewriteHistory.currentRewrite) {
        toast({
          title: "No content to rewrite",
          description: "There's no previous rewrite to improve",
          variant: "destructive"
        });
        return;
      }
      
      const refinementPrompt = `${rewriteTheRewriteInstructions}\n\nOriginal instructions: ${rewriteHistory.previousInstructions}\n\nCurrent rewrite to improve:\n\n${rewriteHistory.currentRewrite}`;
      
      const response = await fetch('/api/process-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputText: refinementPrompt,
          instructions: rewriteTheRewriteInstructions || 'Improve and refine this rewritten content',
          contentSource,
          useContentSource,
          llmProvider
        }),
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      setOutputText(data.result);
      
      // Update rewrite history
      setRewriteHistory({
        ...rewriteHistory,
        currentRewrite: data.result
      });
      
      // Clear the rewrite instructions
      setRewriteTheRewriteInstructions('');
      
      toast({
        title: "Rewrite refinement completed",
        description: "Successfully improved the previous rewrite",
      });
      
    } catch (error: any) {
      console.error('Error processing rewrite refinement:', error);
      toast({
        title: "Refinement failed",
        description: error?.message || 'Failed to refine the rewrite',
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  }, [rewriteHistory, contentSource, useContentSource, llmProvider, toast]);

  // Placeholder functions for missing functionality
  const processDocument = useCallback(async () => {
    // This would be the main document processing function
  }, []);

  const processSelectedDocumentChunks = useCallback(async () => {
    // This would handle document chunk processing
  }, []);

  const cancelProcessing = useCallback(() => {
    setProcessing(false);
  }, []);

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
        
        if (!response.ok) throw new Error(`PDF processing failed: ${response.statusText}`);
        
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
        
        if (!response.ok) throw new Error(`Word document processing failed: ${response.statusText}`);
        
        const result = await response.json();
        extractedText = result.text;
      } else if (file.type === 'text/plain') {
        extractedText = await file.text();
      } else if (file.type.startsWith('image/')) {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch('/api/process-image-ocr', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) throw new Error(`OCR failed: ${response.statusText}`);
        
        const result = await response.json();
        extractedText = result.text;
      } else {
        throw new Error(`Unsupported file type: ${file.type}`);
      }
      
      setInputText(prev => prev + (prev ? '\n\n' : '') + extractedText);
      
      toast({
        title: "File uploaded",
        description: `Successfully extracted text from ${file.name}`,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process file",
        variant: "destructive"
      });
    }
  }, [setInputText, toast]);

  const handleContentSourceFileUpload = useCallback(async (file: File) => {
    try {
      let extractedText = '';
      
      if (file.type === 'application/pdf') {
        const formData = new FormData();
        formData.append('pdf', file);
        
        const response = await fetch('/api/process-pdf', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) throw new Error(`PDF processing failed: ${response.statusText}`);
        
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
        
        if (!response.ok) throw new Error(`Word document processing failed: ${response.statusText}`);
        
        const result = await response.json();
        extractedText = result.text;
      } else if (file.type === 'text/plain') {
        extractedText = await file.text();
      } else {
        throw new Error(`Unsupported file type: ${file.type}`);
      }
      
      setContentSource(extractedText);
      
      toast({
        title: "File uploaded",
        description: `Successfully extracted text from ${file.name}`,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process file",
        variant: "destructive"
      });
    }
  }, [setContentSource, toast]);

  const handleMultipleContentSourceFileUpload = useCallback(async (files: File[]) => {
    try {
      let combinedText = '';
      
      for (const file of files) {
        let extractedText = '';
        
        if (file.type === 'application/pdf') {
          const formData = new FormData();
          formData.append('pdf', file);
          
          const response = await fetch('/api/process-pdf', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) throw new Error(`PDF processing failed: ${response.statusText}`);
          
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
          
          if (!response.ok) throw new Error(`Word document processing failed: ${response.statusText}`);
          
          const result = await response.json();
          extractedText = result.text;
        } else if (file.type === 'text/plain') {
          extractedText = await file.text();
        } else {
          throw new Error(`Unsupported file type: ${file.type}`);
        }
        
        combinedText += (combinedText ? '\n\n---\n\n' : '') + `[${file.name}]\n\n${extractedText}`;
      }
      
      setContentSource(combinedText);
      
      toast({
        title: "Files uploaded",
        description: `Successfully processed ${files.length} files`,
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process files",
        variant: "destructive"
      });
    }
  }, [setContentSource, toast]);

  const handleAudioTranscription = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('audio', file);
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error(`Transcription failed: ${response.statusText}`);
      
      const result = await response.json();
      
      setInputText(prev => prev + (prev ? '\n\n' : '') + result.text);
      
      toast({
        title: "Audio transcribed",
        description: `Successfully transcribed ${file.name}`,
      });
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast({
        title: "Transcription failed",
        description: error instanceof Error ? error.message : "Failed to transcribe audio",
        variant: "destructive"
      });
    }
  }, [setInputText, toast]);

  const detectAIText = useCallback(async (text: string) => {
    // AI detection functionality
  }, []);

  const clearInput = useCallback(() => {
    setInputText('');
  }, []);

  const clearOutput = useCallback(() => {
    setOutputText('');
  }, []);

  const clearContentSource = useCallback(() => {
    setContentSource('');
  }, []);

  const clearStyleSource = useCallback(() => {
    setStyleSource('');
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setDialogueMessages([]);
  }, []);

  const resetAll = useCallback(() => {
    setInputText('');
    setOutputText('');
    setContentSource('');
    setStyleSource('');
    setMessages([]);
    setDialogueMessages([]);
  }, []);

  const processSpecialCommand = useCallback(async (command: string) => {
    // Special command processing
  }, []);

  const processGlobalQuestion = useCallback(async (question: string) => {
    // Global question processing
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
    
    // Processing functions
    processDocument,
    processSelectedDocumentChunks,
    cancelProcessing,
    
    // File refs
    inputFileRef,
    contentSourceFileRef,
    audioRef,
    
    // File upload handlers
    handleInputFileUpload,
    handleContentSourceFileUpload,
    handleMultipleContentSourceFileUpload,
    handleAudioTranscription,
    
    // AI Detection
    isInputDetecting,
    isOutputDetecting,
    inputAIResult,
    outputAIResult,
    detectAIText,
    
    // Clear functions
    clearInput,
    clearOutput,
    clearContentSource,
    clearStyleSource,
    clearChat,
    resetAll,
    
    // Special processing
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
    
    // Synthesis and global features
    enableSynthesisMode,
    setEnableSynthesisMode,
    documentMap,
    processGlobalQuestion,
    
    // Homework mode
    homeworkMode,
    setHomeworkMode,
    
    // Instructions
    lastUsedInstructions,
    rewriteInstructions,
    setRewriteInstructions,
    
    // Rewrite the Rewrite functionality
    rewriteHistory,
    showRewriteTheRewrite,
    setShowRewriteTheRewrite,
    rewriteTheRewriteInstructions,
    setRewriteTheRewriteInstructions,
    processRewriteTheRewrite,
  };
}