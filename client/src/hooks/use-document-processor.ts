import { useState, useRef, useCallback } from 'react';
import { useLLM } from './use-llm';
import { Message } from '@/types';
import { extractTextFromFile } from '@/lib/file-utils';
import { v4 as uuidv4 } from 'uuid';
import { transcribeAudio, detectAI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export function useDocumentProcessor() {
  const [inputText, setInputText] = useState<string>('');
  const [outputText, setOutputText] = useState<string>('');
  const [contentSource, setContentSource] = useState<string>('');
  const [useContentSource, setUseContentSource] = useState<boolean>(false);
  const [reprocessOutput, setReprocessOutput] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uuidv4(),
      role: 'assistant',
      content: 'Provide instructions on how you\'d like your text to be transformed. For example:\n\n• Summarize this content while maintaining key points\n• Rewrite in a more conversational tone\n• Convert this text to a bullet-point list\n• Simplify for a middle-school reading level'
    }
  ]);
  const [isInputDetecting, setIsInputDetecting] = useState<boolean>(false);
  const [isOutputDetecting, setIsOutputDetecting] = useState<boolean>(false);
  const [inputAIResult, setInputAIResult] = useState<{ isAI: boolean; confidence: number; details: string } | null>(null);
  const [outputAIResult, setOutputAIResult] = useState<{ isAI: boolean; confidence: number; details: string } | null>(null);
  const [savedInstructions, setSavedInstructions] = useState<string>('');
  
  const { toast } = useToast();
  const { 
    llmProvider, 
    setLLMProvider, 
    processing, 
    processFullText, 
    processSelectedChunks,
    cancelProcessing, 
    getEstimatedChunks,
    documentChunks,
    showChunkSelector,
    setShowChunkSelector
  } = useLLM();
  
  const inputFileRef = useRef<HTMLInputElement>(null);
  const contentSourceFileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  
  // Process text based on user instructions
  const processDocument = useCallback(async (instructions: string) => {
    if (!inputText) {
      toast({
        title: "Input required",
        description: "Please enter or upload text to process.",
        variant: "destructive"
      });
      return;
    }
    
    if (!instructions) {
      toast({
        title: "Instructions required",
        description: "Please provide instructions for how to transform the text.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Save the instructions for potential use with selected chunks later
      setSavedInstructions(instructions);
      
      // Add the user message
      const userMessageId = uuidv4();
      setMessages(prev => [...prev, {
        id: userMessageId,
        role: 'user',
        content: instructions
      }]);
      
      // Add processing message
      const assistantMessageId = uuidv4();
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: `I'll process your document according to these instructions using ${llmProvider}. Starting now...`
      }]);
      
      // Store the assistant message ID for updating status
      const messageIdRef = { current: assistantMessageId };
      
      // Determine the source text (input or output if reprocessing)
      const textToProcess = reprocessOutput && outputText ? outputText : inputText;
      const estimatedChunks = getEstimatedChunks(textToProcess);
      
      if (estimatedChunks > 1) {
        toast({
          title: "Processing large document",
          description: `Document will be divided into ${estimatedChunks} chunks. You'll be able to select which chunks to process.`,
        });
      }
      
      // Process the text with real-time chunk updates
      const result = await processFullText(
        textToProcess,
        instructions,
        contentSource,
        useContentSource,
        reprocessOutput,
        // Add callback to update output text in real-time as each chunk is processed
        (currentResult, currentChunk, totalChunks) => {
          // Update the output text as each chunk is processed
          setOutputText(currentResult);
          
          // Also update the assistant message to show progress
          setMessages(prev => prev.map(msg => 
            msg.id === messageIdRef.current
              ? { ...msg, content: `Processing document: Completed chunk ${currentChunk} of ${totalChunks} (${Math.round((currentChunk/totalChunks) * 100)}%)` }
              : msg
          ));
        }
      );
      
      // If the chunk selector is shown, we need to wait for user selection
      // The actual processing will happen in processSelectedDocumentChunks
      if (showChunkSelector) {
        // Update the assistant message to guide the user
        setMessages(prev => prev.map(msg => 
          msg.id === messageIdRef.current
            ? { ...msg, content: 'Please select which chunks of the document you would like to process from the list below.' }
            : msg
        ));
        return '';
      }
      
      // If we get here, the document was processed normally (single chunk)
      // Final update to output text (should be the same as last chunk update)
      setOutputText(result);
      
      // Update the assistant message
      setMessages(prev => prev.map(msg => 
        msg.id === messageIdRef.current
          ? { ...msg, content: 'Document processed successfully! All chunks have been displayed in the output box.' }
          : msg
      ));
      
      return result;
    } catch (error: any) {
      console.error('Error processing document:', error);
      
      // Update the assistant message with the error
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId
          ? { ...msg, content: `Error processing document: ${error?.message || 'Unknown error'}` }
          : msg
      ));
      
      toast({
        title: "Processing failed",
        description: error?.message || 'Unknown error occurred',
        variant: "destructive"
      });
    }
  }, [inputText, outputText, contentSource, useContentSource, reprocessOutput, llmProvider, toast, processFullText, getEstimatedChunks, showChunkSelector, setMessages, setSavedInstructions]);
  
  // Process selected document chunks
  const processSelectedDocumentChunks = useCallback(async (selectedIndices: number[]) => {
    if (selectedIndices.length === 0) {
      toast({
        title: "No chunks selected",
        description: "Please select at least one chunk to process.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Add processing message
      const assistantMessageId = uuidv4();
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: `Processing ${selectedIndices.length} selected chunk(s)...`
      }]);
      
      // Store the assistant message ID for updating status
      const messageIdRef = { current: assistantMessageId };
      
      // Process only the selected chunks
      const result = await processSelectedChunks(
        selectedIndices,
        savedInstructions,
        contentSource,
        useContentSource,
        // Add callback to update output text in real-time as each chunk is processed
        (currentResult, currentChunk, totalChunks) => {
          // Update the output text as each chunk is processed
          setOutputText(currentResult);
          
          // Also update the assistant message to show progress
          setMessages(prev => prev.map(msg => 
            msg.id === messageIdRef.current
              ? { ...msg, content: `Processing selected chunks: Completed chunk ${currentChunk} of ${totalChunks} (${Math.round((currentChunk/totalChunks) * 100)}%)` }
              : msg
          ));
        }
      );
      
      // Final update to output text (should be the same as last chunk update)
      setOutputText(result);
      
      // Update the assistant message
      setMessages(prev => prev.map(msg => 
        msg.id === messageIdRef.current
          ? { ...msg, content: 'Selected chunks processed successfully! Results have been displayed in the output box.' }
          : msg
      ));
      
      return result;
    } catch (error: any) {
      console.error('Error processing selected chunks:', error);
      
      // Update the assistant message with the error
      setMessages(prev => prev.map(msg => 
        msg.id === messageIdRef.current
              ? { ...msg, content: `Error processing selected chunks: ${error?.message || 'Unknown error'}` }
              : msg
      ));
      
      toast({
        title: "Processing failed",
        description: error?.message || 'Unknown error occurred',
        variant: "destructive"
      });
    }
  }, [savedInstructions, contentSource, useContentSource, processSelectedChunks, toast, setMessages]);
  
  // Handle file upload for the input editor
  const handleInputFileUpload = useCallback(async (file: File) => {
    try {
      const text = await extractTextFromFile(file);
      setInputText(text);
      
      toast({
        title: "File uploaded",
        description: `Successfully extracted ${text.length} characters from ${file.name}`,
      });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: error?.message || "Failed to process file",
        variant: "destructive"
      });
    }
  }, [toast]);
  
  // Handle file upload for the content source editor
  const handleContentSourceFileUpload = useCallback(async (file: File) => {
    try {
      const text = await extractTextFromFile(file);
      setContentSource(text);
      
      toast({
        title: "Source file uploaded",
        description: `Successfully extracted ${text.length} characters`,
      });
    } catch (error: any) {
      console.error('Error uploading content source file:', error);
      toast({
        title: "Upload failed",
        description: error?.message || "Failed to process file",
        variant: "destructive"
      });
    }
  }, [toast]);
  
  // Handle audio transcription
  const handleAudioTranscription = useCallback(async (file: File) => {
    try {
      toast({
        title: "Transcribing audio",
        description: "This may take a moment...",
      });
      
      const transcribedText = await transcribeAudio(file);
      setInputText(prev => prev ? `${prev}\n\n${transcribedText}` : transcribedText);
      
      toast({
        title: "Transcription complete",
        description: `Added ${transcribedText.length} characters to the input`,
      });
    } catch (error: any) {
      console.error('Error transcribing audio:', error);
      toast({
        title: "Transcription failed",
        description: error?.message || "Failed to transcribe audio",
        variant: "destructive"
      });
    }
  }, [toast]);
  
  // Detect AI in text
  const detectAIText = useCallback(async (text: string, isInput: boolean) => {
    if (!text) {
      toast({
        title: "No text to analyze",
        description: "Please enter or upload text first.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      if (isInput) {
        setIsInputDetecting(true);
      } else {
        setIsOutputDetecting(true);
      }
      
      const result = await detectAI(text);
      
      if (isInput) {
        setInputAIResult(result);
        setIsInputDetecting(false);
      } else {
        setOutputAIResult(result);
        setIsOutputDetecting(false);
      }
      
      toast({
        title: `AI Detection Result: ${result.isAI ? 'AI Generated' : 'Human Written'}`,
        description: `Confidence: ${Math.round(result.confidence * 100)}%`,
      });
      
      return result;
    } catch (error: any) {
      console.error('Error detecting AI:', error);
      
      if (isInput) {
        setIsInputDetecting(false);
      } else {
        setIsOutputDetecting(false);
      }
      
      toast({
        title: "Detection failed",
        description: error?.message || "Failed to analyze text",
        variant: "destructive"
      });
    }
  }, [toast]);
  
  // Clear input text
  const clearInput = useCallback(() => {
    setInputText('');
    setInputAIResult(null);
  }, []);
  
  // Clear output text
  const clearOutput = useCallback(() => {
    setOutputText('');
    setOutputAIResult(null);
  }, []);
  
  // Clear chat messages
  const clearChat = useCallback(() => {
    setMessages([
      {
        id: uuidv4(),
        role: 'assistant',
        content: 'Welcome to EZ Reader! Provide instructions on how you\'d like your text to be transformed. For example:\n\n• Summarize this content while maintaining key points\n• Rewrite in a more conversational tone\n• Convert this text to a bullet-point list\n• Simplify for a middle-school reading level'
      }
    ]);
  }, []);
  
  return {
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
    processing,
    processDocument,
    processSelectedDocumentChunks,
    cancelProcessing,
    inputFileRef,
    contentSourceFileRef,
    audioRef,
    handleInputFileUpload,
    handleContentSourceFileUpload,
    handleAudioTranscription,
    isInputDetecting,
    isOutputDetecting,
    inputAIResult,
    outputAIResult,
    detectAIText,
    clearInput,
    clearOutput,
    clearChat,
    llmProvider,
    setLLMProvider,
    documentChunks,
    showChunkSelector,
    setShowChunkSelector
  };
}
