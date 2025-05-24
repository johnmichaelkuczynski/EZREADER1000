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
      content: 'I can help answer questions about your document. What would you like to know?'
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
  
  // Process commands in the dialogue box - similar to a ChatGPT conversation
  const processSpecialCommand = useCallback(async (command: string) => {
    if (!inputText && !outputText) {
      toast({
        title: "No content to process",
        description: "Please enter or generate some text first.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Add the user's message to the dialogue chat (not the rewrite instructions)
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
        content: `Thinking about your request...`
      }]);
      
      // Determine which text to use (prefer output if available)
      const textToProcess = outputText || inputText;
      
      // Always create chunks for the document for dialogue processing
      // This ensures we can handle large documents without hitting token limits
      const dialogueChunks = chunkText(textToProcess, 300); // Use smaller chunks (300 words) for dialogue
      
      // Construct a prompt that provides context and handles the specific request
      let prompt = "";
      
      // Check if Full Document Synthesis Mode is enabled for global document queries
      if (enableSynthesisMode && 
          (command.toLowerCase().includes("summarize") || 
           command.toLowerCase().includes("table of contents") || 
           command.toLowerCase().includes("overview") ||
           command.toLowerCase().includes("explain") ||
           command.toLowerCase().includes("whole document") ||
           command.toLowerCase().includes("full document") ||
           command.toLowerCase().includes("entire document"))) {
          
        // If we don't have document summaries yet, let's create them on-demand
        if (documentMap.length === 0 && dialogueChunks.length > 0) {
          // Create a simplified summary for each chunk
          setDialogueMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId
              ? { ...msg, content: `Generating summaries for all ${dialogueChunks.length} chunks. This may take a moment...` }
              : msg
          ));
          
          // Generate summaries for all chunks
          for (let i = 0; i < dialogueChunks.length; i++) {
            try {
              const chunkSummary = `Section ${i+1}: Summary of chunk ${i+1}`;
              setDocumentMap(prev => {
                const newMap = [...prev];
                newMap[i] = chunkSummary;
                return newMap;
              });
            } catch (error) {
              console.error(`Error creating on-demand summary for chunk ${i}:`, error);
            }
          }
        }
        
        try {
          // Process the global query using document summaries
          await processGlobalQuestion(command);
          
          // Update the assistant message to inform the user
          setDialogueMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId
              ? { ...msg, content: `I've processed your request using Full Document Synthesis Mode. The results are shown in the popup window.` }
              : msg
          ));
          
          return;
        } catch (error) {
          console.error('Error using Full Document Synthesis Mode:', error);
          setDialogueMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId
              ? { ...msg, content: `I couldn't process your request using Document Synthesis Mode. Falling back to normal processing...` }
              : msg
          ));
          // Continue with normal processing if synthesis mode fails
        }
      }
      
      // Handle showing chunk information
      if (command.toLowerCase().includes("show chunks") || command.toLowerCase().includes("list chunks")) {
        setDialogueMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId
            ? { ...msg, content: `I've divided the document into ${dialogueChunks.length} chunks. You can ask about a specific chunk by saying "rewrite chunk X" or "summarize chunk X" where X is a number between 1 and ${dialogueChunks.length}.` }
            : msg
        ));
        return;
      }
      
      // For very large documents, recommend using chunks
      if (dialogueChunks.length > 5 && !command.toLowerCase().includes("chunk")) {
        setDialogueMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId
            ? { ...msg, content: `This is a large document (${textToProcess.length} characters, approximately ${Math.round(textToProcess.length/5)} tokens). I've divided it into ${dialogueChunks.length} chunks.\n\nFor better results, please try:\n1. Asking about a specific chunk: "summarize chunk 3"\n2. Type "show chunks" to see information about all chunks\n3. Ask a more specific question about the document` }
            : msg
        ));
        return;
      }
      
      // Special handling for "rewrite chunk" commands
      if (command.toLowerCase().match(/rewrite chunk \d+/)) {
        // Extract chunk number and any instructions
        const chunkMatch = command.match(/rewrite chunk (\d+)/i);
        if (chunkMatch && dialogueChunks.length > 0) {
          const chunkIndex = parseInt(chunkMatch[1]) - 1; // Convert to 0-based index
          
          if (chunkIndex >= 0 && chunkIndex < dialogueChunks.length) {
            // Use the specified chunk from our dialogue chunks
            const chunkText = dialogueChunks[chunkIndex];
            
            // Extract any additional instructions after the chunk number
            const additionalInstructions = command.substring(command.indexOf(chunkMatch[0]) + chunkMatch[0].length).trim();
            const instructions = additionalInstructions || "Rewrite this chunk to improve clarity and flow";
            
            // Process just this chunk
            const response = await processText({
              inputText: chunkText,
              instructions: instructions,
              contentSource: "",
              useContentSource: false,
              reprocessOutput: false,
              llmProvider
            });
            
            // Update the assistant message with the processed chunk
            setDialogueMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId
                ? { ...msg, content: response }
                : msg
            ));
            
            return;
          } else {
            // Invalid chunk index
            setDialogueMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId
                ? { ...msg, content: `I can't find chunk ${chunkIndex + 1}. The document only has ${dialogueChunks.length} chunks. Please specify a valid chunk number between 1 and ${dialogueChunks.length}.` }
                : msg
            ));
            return;
          }
        } else {
          // No chunks available
          setDialogueMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId
              ? { ...msg, content: `I can't process chunk operations for this document. Please make sure there is text in the input or output box first.` }
              : msg
          ));
          return;
        }
      }
      
      // Create an appropriate prompt based on the user's request
      if (command.toLowerCase().includes("table of contents") || command.toLowerCase().includes("toc")) {
        prompt = "You are analyzing a document. Create a detailed table of contents for it, including section numbers, titles, and brief descriptions for each section. Format it clearly with proper indentation for subsections. Here's the document: " + textToProcess;
      } 
      else if (command.toLowerCase().includes("bibliography") || command.toLowerCase().includes("references")) {
        prompt = "You are analyzing a document. Extract all references and citations from it and format them as a properly formatted bibliography or reference list. If you can't find explicit references, infer what sources might have been used based on the content. Here's the document: " + textToProcess;
      }
      else if (command.toLowerCase().includes("summary") || command.toLowerCase().includes("summarize")) {
        prompt = "You are analyzing a document. Provide a comprehensive summary of the key points, arguments, and conclusions. Here's the document: " + textToProcess;
      }
      else if (command.toLowerCase().includes("analyze") || command.toLowerCase().includes("analysis")) {
        prompt = "You are analyzing a document. Provide a detailed analysis of its content, structure, arguments, and effectiveness. Identify strengths and weaknesses. Here's the document: " + textToProcess;
      }
      else if (command.toLowerCase().includes("title") || command.toLowerCase().includes("heading")) {
        prompt = "You are analyzing a document. Suggest an appropriate title and section headings based on the content. Explain your reasoning briefly. Here's the document: " + textToProcess;
      }
      else {
        // For general queries about the document
        prompt = "You are having a conversation about a document. Answer the following query about it as helpfully as possible: '" + command + "'. Here's the document: " + textToProcess;
      }
      
      // For large documents, only process the first few chunks to avoid token limits
      let textToSend = textToProcess;
      
      // Check if document is very large (more than 10,000 characters)
      if (textToProcess.length > 10000) {
        // Use only the first 1-3 chunks depending on size
        const numChunksToUse = textToProcess.length > 30000 ? 1 : 
                              textToProcess.length > 20000 ? 2 : 3;
        
        textToSend = dialogueChunks.slice(0, numChunksToUse).join("\n\n");
        
        // Add a note that we're using a limited portion of the text
        prompt = prompt.replace("Here's the document:", "Note: This document is very large, so I'm only analyzing the beginning portion. Here's the excerpt:");
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
      
      // Get the input text to chunk
      const textToProcess = inputText;
      
      // Generate chunks if we don't have them
      if (textToProcess) {
        const chunks = chunkText(textToProcess, 300);
        setDialogueChunks(chunks);
      }
      
      // If we don't have summaries yet but we have text to process, generate summaries
      if (documentMap.length === 0 && inputText.length > 0) {
        setSpecialContent("Generating document summaries for your document. This may take a moment...");
        
        const chunks = chunkText(inputText, 300);
        // Store the chunks for later use
        setDialogueChunks(chunks);
        
        // Create temporary summaries for all chunks
        for (let i = 0; i < chunks.length; i++) {
          const chunkContent = chunks[i];
          
          // Create a simple summary for each chunk (2-3 sentences)
          const tempSummary = `Section ${i+1}: This section contains approximately ${chunkContent.length} characters of text from the document.`;
          
          // Add to document map
          setDocumentMap(prev => {
            const newMap = [...prev];
            newMap[i] = tempSummary;
            return newMap;
          });
        }
        
        // Now process an actual summary for the first 10 chunks only (to avoid overloading)
        // This will happen in the background while the user waits
        const chunkLimit = Math.min(chunks.length, 10);
        setSpecialContent(`Generating summaries for ${chunkLimit} sections to answer your query. Please wait...`);
        
        for (let i = 0; i < chunkLimit; i++) {
          try {
            const chunkContent = chunks[i];
            
            // Create a real summary for the chunk
            const response = await processText({
              inputText: chunkContent,
              instructions: "Summarize this section in 2-3 sentences, capturing the key points.",
              contentSource: "",
              useContentSource: false,
              llmProvider
            });
            
            // Update document map with real summary
            setDocumentMap(prev => {
              const newMap = [...prev];
              newMap[i] = `Section ${i+1}: ${response}`;
              return newMap;
            });
            
            // Update status
            setSpecialContent(`Generated summaries for ${i+1} of ${chunkLimit} sections. Please wait...`);
          } catch (error) {
            console.error(`Error creating summary for chunk ${i}:`, error);
          }
        }
      }
      
      // Now actually process the query with the document map
      // Construct the input with section summaries (use what we have, even if incomplete)
      setSpecialContent(`Processing your query: "${query}"...`);
      
      // First make sure we have meaningful summaries
      let summariesReady = false;
      
      // Check if summaries are just placeholders or actual content
      const hasRealSummaries = documentMap.some(summary => 
        !summary.includes("This section contains approximately") && 
        summary.split(" ").length > 10
      );
      
      // If we don't have real summaries yet, generate them directly from input text
      if (!hasRealSummaries && inputText) {
        const chunks = chunkText(inputText);
        const chunkLimit = Math.min(chunks.length, 10); // Limit to 10 chunks for performance
        
        // Update status
        setSpecialContent(`Creating detailed summaries of your document (${chunkLimit} sections)...`);
        
        // Process each chunk to create real summaries
        for (let i = 0; i < chunkLimit; i++) {
          try {
            // Get the chunk text
            const chunkContent = chunks[i];
            
            // Process the chunk with the LLM to get a real summary
            const summary = await processText({
              inputText: chunkContent,
              instructions: "Summarize this section in 2-3 sentences, capturing the key points and main ideas.",
              contentSource: "",
              useContentSource: false,
              llmProvider
            });
            
            // Update the document map with the real summary
            setDocumentMap(prev => {
              const newMap = [...prev];
              newMap[i] = `Section ${i+1}: ${summary}`;
              return newMap;
            });
            
            // Update status
            setSpecialContent(`Generated summary ${i+1} of ${chunkLimit}. Please wait...`);
          } catch (error) {
            console.error(`Error creating summary for chunk ${i}:`, error);
          }
        }
        
        summariesReady = true;
      } else if (documentMap.length > 0) {
        // We already have real summaries
        summariesReady = true;
      }
      
      // Join available summaries
      const summaries = documentMap.length > 0 ? documentMap.join("\n\n") : 
                      "No section summaries available. This is a large document with multiple sections.";
      
      // Create a more specific prompt based on the query type
      let instructions = "Answer the query thoroughly based on the document content.";
      let prompt = "";
      
      if (query.toLowerCase().includes("table of contents") || query.toLowerCase().includes("outline")) {
        prompt = `Based on these section summaries, create a detailed table of contents for the document:\n\n${summaries}`;
        instructions = "Create a hierarchical table of contents with main sections and subsections based on the content.";
      } else if (query.toLowerCase().includes("summarize") || query.toLowerCase().includes("summary")) {
        prompt = `Based on these section summaries from the document, provide a comprehensive summary:\n\n${summaries}`;
        instructions = "Create a cohesive summary that captures the main points, arguments and conclusions from the document.";
      } else if (query.toLowerCase().includes("key points") || query.toLowerCase().includes("main ideas")) {
        prompt = `Based on these section summaries, what are the key points or main ideas in the document?:\n\n${summaries}`;
        instructions = "Extract and explain the most important ideas, arguments or findings from the document.";
      } else {
        // Generic query
        prompt = `Based on the following section summaries from the document, ${query}:\n\n${summaries}`;
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
    // Full Document Synthesis Mode
    enableSynthesisMode,
    setEnableSynthesisMode,
    documentMap,
    processGlobalQuestion
  };
}
