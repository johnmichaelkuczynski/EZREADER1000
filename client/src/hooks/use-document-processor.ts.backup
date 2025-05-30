import { useState, useRef, useCallback } from 'react';
import { useLLM } from './use-llm';
import { Message } from '@/types';
import { extractTextFromFile } from '@/lib/file-utils';
import { v4 as uuidv4 } from 'uuid';
import { transcribeAudio, detectAI, processText } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { chunkText } from '@/lib/text-chunker';

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
      content: 'Enter your rewrite instructions above.'
    }
  ]);
  
  // Separate state for dialogue messages
  const [dialogueMessages, setDialogueMessages] = useState<Message[]>([
    {
      id: uuidv4(),
      role: 'assistant',
      content: 'Hello! I can help you with anything you need. Ask me questions, request content generation, or discuss any topic.'
    }
  ]);
  const [isInputDetecting, setIsInputDetecting] = useState<boolean>(false);
  const [isOutputDetecting, setIsOutputDetecting] = useState<boolean>(false);
  const [inputAIResult, setInputAIResult] = useState<{ isAI: boolean; confidence: number; details: string } | null>(null);
  const [outputAIResult, setOutputAIResult] = useState<{ isAI: boolean; confidence: number; details: string } | null>(null);
  const [savedInstructions, setSavedInstructions] = useState<string>('');
  
  // Special content generated from dialogue
  const [specialContent, setSpecialContent] = useState<string>('');
  const [showSpecialContent, setShowSpecialContent] = useState<boolean>(false);
  
  // Full Document Synthesis Mode
  const [documentMap, setDocumentMap] = useState<string[]>([]);
  const [enableSynthesisMode, setEnableSynthesisMode] = useState<boolean>(false);
  const [dialogueChunks, setDialogueChunks] = useState<string[]>([]);
  
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

          // For synthesis mode, we'll handle summaries elsewhere
          // This helps avoid circular references in the implementation
          if (enableSynthesisMode && totalChunks > 1) {
            // For the first chunk, clear the document map to start fresh
            if (currentChunk === 1) {
              setDocumentMap([]);
            }
            
            // Store chunk text for later summarization
            const chunks = chunkText(textToProcess);
            if (chunks.length >= currentChunk) {
              // We'll summarize the chunks after processing is complete
              // This avoids circular dependency issues
              const chunkText = chunks[currentChunk - 1];
              const chunkIndex = currentChunk - 1;
              
              // Use setTimeout to avoid blocking the UI
              setTimeout(async () => {
                try {
                  // Create a simple instruction to summarize the chunk
                  const summaryInstruction = "Summarize this section in 1–2 sentences:";
                  
                  // Process the chunk using the API
                  const response = await processText({
                    inputText: chunkText,
                    instructions: summaryInstruction,
                    contentSource: "",
                    useContentSource: false,
                    llmProvider
                  });
                  
                  // Add the summary to the document map
                  setDocumentMap(prev => {
                    const newMap = [...prev];
                    newMap[chunkIndex] = `Section ${chunkIndex + 1}: ${response}`;
                    return newMap;
                  });
                } catch (error) {
                  console.error(`Error creating summary for chunk ${chunkIndex}:`, error);
                }
              }, 0);
            }
          }
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
      setMessages(prev => {
        // Find the last assistant message to update
        const lastAssistantMessage = [...prev].reverse().find(msg => msg.role === 'assistant');
        if (!lastAssistantMessage) return prev;
        
        return prev.map(msg => 
          msg.id === lastAssistantMessage.id
            ? { ...msg, content: `Error processing document: ${error?.message || 'Unknown error'}` }
            : msg
        );
      });
      
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
      
      // Process only the selected chunks (using 'rewrite' mode for backwards compatibility)
      const result = await processSelectedChunks(
        selectedIndices,
        'rewrite',
        0,
        savedInstructions,
        contentSource,
        useContentSource,
        // Add callback to update output text in real-time as each chunk is processed
        (currentResult, currentChunk, totalChunks) => {
          // Update the output text as each chunk is processed
          setOutputText(currentResult);
          
          // Also update the assistant message to show progress
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId
              ? { ...msg, content: `Processing selected chunks: Completed chunk ${currentChunk} of ${totalChunks} (${Math.round((currentChunk/totalChunks) * 100)}%)` }
              : msg
          ));
        }
      );
      
      // Final update to output text (should be the same as last chunk update)
      setOutputText(result);
      
      // Update the assistant message
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId
          ? { ...msg, content: 'Selected chunks processed successfully! Results have been displayed in the output box.' }
          : msg
      ));
      
      return result;
    } catch (error: any) {
      console.error('Error processing selected chunks:', error);
      
      // Update the assistant message with the error
      setMessages(prev => {
        // Find the last assistant message to update
        const lastAssistantMessage = [...prev].reverse().find(msg => msg.role === 'assistant');
        if (!lastAssistantMessage) return prev;
        
        return prev.map(msg => 
          msg.id === lastAssistantMessage.id
            ? { ...msg, content: `Error processing selected chunks: ${error?.message || 'Unknown error'}` }
            : msg
        );
      });
      
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
      let text = '';
      
      if (file.type.startsWith('image/')) {
        // Handle image OCR with Mathpix
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch('/api/process-image-ocr', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`OCR failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        text = result.text;
      } else {
        // Handle PDF/Word documents
        text = await extractTextFromFile(file);
      }
      
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
  
  // Handle multiple file uploads for content source editor
  const handleMultipleContentSourceFileUpload = useCallback(async (files: File[]) => {
    try {
      let combinedText = contentSource;
      let totalCharacters = 0;
      
      // Process each file and append its text to the combined content
      for (const file of files) {
        const text = await extractTextFromFile(file);
        totalCharacters += text.length;
        
        // Add a separator between files with file name as header
        if (combinedText) {
          combinedText += `\n\n--- ${file.name} ---\n\n${text}`;
        } else {
          combinedText = `--- ${file.name} ---\n\n${text}`;
        }
      }
      
      setContentSource(combinedText);
      
      toast({
        title: "Multiple files uploaded",
        description: `Successfully extracted ${totalCharacters} characters from ${files.length} files`,
      });
    } catch (error: any) {
      console.error('Error uploading multiple content source files:', error);
      toast({
        title: "Upload failed",
        description: error?.message || "Failed to process files",
        variant: "destructive"
      });
    }
  }, [toast, contentSource]);
  
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

  const handleMathPDFUpload = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      
      const response = await fetch('/api/process-math-pdf', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process PDF with Azure OpenAI');
      }
      
      const data = await response.json();
      setInputText(data.text);
      toast({ 
        title: "Math PDF Processed", 
        description: `Successfully extracted math content from ${file.name} using Azure OpenAI` 
      });
    } catch (error: any) {
      console.error('Azure OpenAI PDF processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({ 
        title: "Azure Processing Failed", 
        description: errorMessage,
        variant: "destructive" 
      });
    }
  }, [toast, setInputText]);

  const handleMathImageUpload = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/process-math-image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process image with Azure OpenAI');
      }
      
      const data = await response.json();
      setInputText(data.text);
      toast({ 
        title: "Math Image Processed", 
        description: `Successfully extracted math content from ${file.name} using Azure OpenAI` 
      });
    } catch (error: any) {
      console.error('Azure OpenAI image processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({ 
        title: "Azure Processing Failed", 
        description: errorMessage,
        variant: "destructive" 
      });
    }
  }, [toast, setInputText]);

  const enhanceMathFormatting = useCallback(async (text: string) => {
    try {
      const response = await fetch('/api/enhance-math', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to enhance math formatting');
      }
      
      const data = await response.json();
      return data.text;
    } catch (error: any) {
      console.error('Math enhancement error:', error);
      toast({ 
        title: "Enhancement Failed", 
        description: error.message,
        variant: "destructive" 
      });
      return text; // Return original text if enhancement fails
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
        content: 'Enter your rewrite instructions above.'
      }
    ]);
    
    // Also clear dialogue messages
    setDialogueMessages([
      {
        id: uuidv4(),
        role: 'assistant',
        content: 'I can help answer questions about your document. What would you like to know?'
      }
    ]);
  }, []);

  // Reset everything - wipe slate clean and shut down any operations
  const resetAll = useCallback(() => {
    // Clear all text content
    setInputText('');
    setOutputText('');
    setContentSource('');
    
    // Reset flags and results
    setUseContentSource(false);
    setReprocessOutput(false);
    setInputAIResult(null);
    setOutputAIResult(null);
    
    // Reset saved instructions
    setSavedInstructions('');
    
    // Reset chat
    clearChat();
    
    // Cancel any ongoing processing
    if (processing.isProcessing) {
      cancelProcessing();
    }
    
    // Hide chunk selector if visible
    if (showChunkSelector) {
      setShowChunkSelector(false);
    }
    
    toast({
      title: "Reset complete",
      description: "All content has been cleared and operations stopped.",
    });
  }, [clearChat, cancelProcessing, processing.isProcessing, showChunkSelector, setShowChunkSelector, setSavedInstructions, toast]);
  
  // Process commands in the dialogue box - pure passthrough to LLM for general AI conversation
  const processSpecialCommand = useCallback(async (command: string) => {
    try {
      // Add the user's message to the dialogue chat
      const userMessageId = uuidv4();
      setDialogueMessages(prev => [...prev, {
        id: userMessageId,
        role: 'user',
        content: command
      }]);
      
      // Add typing indicator message to dialogue
      const assistantMessageId = uuidv4();
      setDialogueMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: `Processing your request...`
      }]);
      
      // Pure passthrough to LLM - send user's command directly with minimal context
      // The LLM can handle any topic, generate math content, answer questions, etc.
      let prompt = command;
      
      // Optionally provide document context if user wants to reference it
      const textToProcess = outputText || inputText || "";
      if (textToProcess && (
        command.toLowerCase().includes("document") || 
        command.toLowerCase().includes("text above") ||
        command.toLowerCase().includes("content") ||
        command.toLowerCase().includes("input") ||
        command.toLowerCase().includes("output")
      )) {
        prompt = `${command}\n\n[Document context available: ${textToProcess.substring(0, 1000)}...]`;
      }
      
      // Send directly to LLM with current provider
      const response = await processText({
        inputText: prompt,
        instructions: "You are a helpful AI assistant. Respond to the user's request naturally and helpfully. If generating mathematical content, use proper LaTeX notation with $ for inline math and $$ for display math.",
        contentSource: "",
        useContentSource: false,
        llmProvider
      });
      
      // Update the assistant message with the LLM response (pure passthrough)
      setDialogueMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId
          ? { ...msg, content: response }
          : msg
      ));
      
    } catch (error: any) {
      console.error('Error processing dialogue command:', error);
      
      // Update the assistant message with the error
      setDialogueMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId
          ? { ...msg, content: `Sorry, I encountered an error: ${error?.message || 'Unknown error'}` }
          : msg
      ));
    }
  }, [outputText, inputText, llmProvider, processText, setDialogueMessages]);
            
            // Add a note that we're using representative sections
            prompt = prompt.replace("Here's the document:", "Note: This document is very large, so I'm analyzing representative sections from the beginning, middle, and end. Here's the compilation:");
          } else {
            // If we don't have enough chunks, use a proportion of available chunks
            const numChunksToUse = Math.max(Math.floor(dialogueChunks.length * 0.4), 3);
            textToSend = dialogueChunks.slice(0, numChunksToUse).join("\n\n");
            prompt = prompt.replace("Here's the document:", "Note: This document is very large, so I'm analyzing a subset of the content. Here's the excerpt:");
          }
        } else {
          // For moderately large documents, use more chunks than before based on size
          const numChunksToUse = textToProcess.length > 30000 ? 3 : 
                               textToProcess.length > 20000 ? 4 : 5;
          
          textToSend = dialogueChunks.slice(0, numChunksToUse).join("\n\n");
          
          // Add a note that we're using a portion of the text
          prompt = prompt.replace("Here's the document:", "Note: This document is large, so I'm analyzing the beginning portion. Here's the excerpt:");
        }
      }
      
      // Process using the appropriate LLM through the API
      const response = await processText({
        inputText: textToSend,
        instructions: prompt,
        contentSource: "",
        useContentSource: false,
        reprocessOutput: false,
        llmProvider
      });
      
      // Update the assistant message with the direct response in the dialogue messages
      setDialogueMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId
          ? { ...msg, content: response }
          : msg
      ));
      
    } catch (error: any) {
      console.error('Error processing dialogue command:', error);
      
      // Update the last assistant message with the error in dialogue messages
      setDialogueMessages(prev => {
        const lastAssistantMessage = [...prev].reverse().find(msg => msg.role === 'assistant');
        if (!lastAssistantMessage) return prev;
        
        return prev.map(msg => 
          msg.id === lastAssistantMessage.id
            ? { ...msg, content: `I'm sorry, I encountered an error while processing your request: ${error?.message || 'Unknown error'}. Could you try rephrasing or asking something else?` }
            : msg
        );
      });
      
      toast({
        title: "Processing failed",
        description: error?.message || 'Something went wrong with your request',
        variant: "destructive"
      });
    }
  }, [inputText, outputText, contentSource, useContentSource, documentChunks, processFullText, processSelectedChunks, toast]);
  
  // Function to create a summary for a chunk of text
  const createChunkSummary = useCallback(async (chunkText: string, chunkIndex: number) => {
    try {
      // Create a simple instruction to summarize the chunk
      const summaryInstruction = "Summarize this section in 1–2 sentences:";
      
      // Process the chunk using the API
      const response = await processText({
        inputText: chunkText,
        instructions: summaryInstruction,
        contentSource: "",
        useContentSource: false,
        llmProvider
      });
      
      // Add the summary to the document map
      setDocumentMap(prev => {
        const newMap = [...prev];
        newMap[chunkIndex] = `Section ${chunkIndex + 1}: ${response}`;
        return newMap;
      });
    } catch (err) {
      const error = err as Error;
      console.error(`Error creating summary for chunk ${chunkIndex}:`, error);
    }
  }, [llmProvider, processText]);
  
  // Process global questions about the document using the document map
  const processGlobalQuestion = useCallback(async (query: string) => {
    try {
      // Show processing state
      setShowSpecialContent(true);
      setSpecialContent("Processing your query about the document...");
      
      // Check if we have a document to process
      if (!inputText || inputText.length === 0) {
        setSpecialContent("No document found. Please upload or enter a document first.");
        return;
      }
      
      // DIRECT DOCUMENT PROCESSING APPROACH
      // Instead of generating summaries, we'll directly use document content
      setSpecialContent(`Analyzing your document to answer: "${query}"`);
      
      // Create reasonable chunks from the document
      const chunks = chunkText(inputText, 2000); // Larger chunks for better context
      setDialogueChunks(chunks);
      
      // Create a sample of the document with representative sections
      let documentContent = "";
      
      // For small documents, use the entire text
      if (inputText.length < 8000) {
        documentContent = inputText;
      } 
      // For medium documents, use the first 3 chunks
      else if (chunks.length <= 5) {
        const chunksTouse = Math.min(chunks.length, 3);
        for (let i = 0; i < chunksTouse; i++) {
          documentContent += `\n\n--- DOCUMENT SECTION ${i+1} ---\n\n${chunks[i]}`;
        }
      } 
      // For larger documents, use beginning, middle and end
      else {
        // Get sections from beginning, middle and end
        const beginning = chunks[0];
        const middle = chunks[Math.floor(chunks.length / 2)];
        const end = chunks[chunks.length - 1];
        
        documentContent = `--- BEGINNING OF DOCUMENT ---\n\n${beginning}\n\n`;
        documentContent += `--- MIDDLE OF DOCUMENT ---\n\n${middle}\n\n`;
        documentContent += `--- END OF DOCUMENT ---\n\n${end}`;
      }
      
      // Create a specific prompt based on the query type
      let instructions = "Analyze only the provided document content. Do not add information not present in the document.";
      let prompt = "";
      
      if (query.toLowerCase().includes("table of contents") || query.toLowerCase().includes("outline")) {
        prompt = `Create a detailed table of contents with proper hierarchical organization for this document:\n\n${documentContent}`;
        instructions = "Create a hierarchical table of contents based strictly on the content provided. Format with proper indentation and numbering.";
      } 
      else if (query.toLowerCase().includes("summarize") || query.toLowerCase().includes("summary")) {
        prompt = `Provide a comprehensive, detailed summary of this document:\n\n${documentContent}`;
        instructions = "Summarize the key points, arguments, and conclusions from the document. Be specific and focus on the actual content.";
      } 
      else if (query.toLowerCase().includes("key points") || query.toLowerCase().includes("main ideas")) {
        prompt = `What are the key points or main ideas in this document?\n\n${documentContent}`;
        instructions = "Extract and explain the most important concepts, arguments, or findings directly from the document.";
      }
      else if (query.toLowerCase().includes("argument") || query.toLowerCase().includes("thesis")) {
        prompt = `What is the main argument or thesis of this document?\n\n${documentContent}`;
        instructions = "Identify and explain the central thesis or main argument that the document presents.";
      }
      else {
        // For any other query type
        prompt = `${query}\n\nDocument content:\n${documentContent}`;
        instructions = "Answer the query using only the provided document content. Be specific and accurate.";
      }
      
      // Process the query
      const response = await processText({
        inputText: prompt,
        instructions: instructions,
        contentSource: "",
        useContentSource: false,
        llmProvider
      });
      
      // Display the result
      setSpecialContent(response);
    } catch (err) {
      const error = err as Error;
      console.error('Error processing global question:', error);
      setSpecialContent(`Error processing your query: ${error.message || 'Unknown error'}`);
      
      toast({
        title: "Processing failed",
        description: error.message || "Unknown error occurred",
        variant: "destructive"
      });
    }
  }, [documentMap, inputText, toast, llmProvider, setSpecialContent, setShowSpecialContent, processText, setDialogueChunks, setDocumentMap]);
  
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
    dialogueMessages,
    setDialogueMessages,
    processing,
    processDocument,
    processSelectedDocumentChunks,
    cancelProcessing,
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
    isInputDetecting,
    isOutputDetecting,
    inputAIResult,
    outputAIResult,
    detectAIText,
    clearInput,
    clearOutput,
    clearChat,
    resetAll,
    processSpecialCommand,
    specialContent,
    setSpecialContent,
    showSpecialContent,
    setShowSpecialContent,
    llmProvider,
    setLLMProvider,
    documentChunks,
    showChunkSelector,
    setShowChunkSelector,
    processSelectedChunks,
    // Full Document Synthesis Mode
    enableSynthesisMode,
    setEnableSynthesisMode,
    documentMap,
    processGlobalQuestion
  };
}
