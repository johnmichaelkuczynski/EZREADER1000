import { useState } from 'react';
import { ProcessTextRequest, ProcessChunkRequest, LLMProvider, ProcessingStatus } from '@/types';
import { processText, processChunk } from '@/lib/api';
import { chunkText, estimateChunkCount } from '@/lib/text-chunker';

export function useLLM() {
  const [llmProvider, setLLMProvider] = useState<LLMProvider>('deepseek');
  const [processing, setProcessing] = useState<ProcessingStatus>({
    isProcessing: false,
    currentChunk: 0,
    totalChunks: 0,
    progress: 0
  });
  
  const [documentChunks, setDocumentChunks] = useState<string[]>([]);
  const [showChunkSelector, setShowChunkSelector] = useState<boolean>(false);
  
  // Process a complete text
  const processFullText = async (
    inputText: string,
    instructions: string,
    contentSource?: string,
    useContentSource = false,
    reprocessOutput = false,
    onChunkProcessed?: (currentResult: string, currentChunk: number, totalChunks: number) => void
  ): Promise<string> => {
    try {
      if (!inputText || !instructions) {
        throw new Error('Input text and instructions are required');
      }
      
      // Check if we need to chunk the text
      const chunks = chunkText(inputText);
      setDocumentChunks(chunks);
      
      // If only one chunk, process directly
      if (chunks.length === 1) {
        setProcessing({
          isProcessing: true,
          currentChunk: 0,
          totalChunks: 1,
          progress: 0
        });
        
        const request: ProcessTextRequest = {
          inputText,
          instructions,
          contentSource,
          llmProvider,
          useContentSource,
          reprocessOutput
        };
        
        const result = await processText(request);
        
        setProcessing({
          isProcessing: false,
          currentChunk: 1,
          totalChunks: 1,
          progress: 100
        });
        
        return result;
      }
      
      // For large documents, show chunk selector instead of processing immediately
      if (chunks.length > 1) {
        setShowChunkSelector(true);
        // Return an empty string as the function must return a promise
        // The actual processing will be triggered by processSelectedChunks
        return '';
      }
      
      // Process multiple chunks sequentially
      return await processMultipleChunks(chunks, instructions, contentSource, useContentSource, onChunkProcessed);
    } catch (error) {
      setProcessing({
        isProcessing: false,
        currentChunk: 0,
        totalChunks: 0,
        progress: 0
      });
      
      throw error;
    }
  };
  
  // Process chunks with different modes: rewrite, add, or both
  const processSelectedChunks = async (
    selectedIndices: number[],
    mode: 'rewrite' | 'add' | 'both',
    additionalChunks: number = 0,
    instructions: string,
    contentSource?: string,
    useContentSource = false,
    onChunkProcessed?: (currentResult: string, currentChunk: number, totalChunks: number) => void
  ): Promise<string> => {
    try {
      // Hide the chunk selector
      setShowChunkSelector(false);
      
      if (mode === 'add') {
        // Add mode: keep all existing chunks and add new ones
        const addedContent = await processAddChunks(
          additionalChunks,
          instructions,
          contentSource,
          useContentSource,
          onChunkProcessed
        );
        
        // Combine existing document with new content
        const existingContent = documentChunks.join('\n\n');
        return existingContent + '\n\n' + addedContent;
      } else if (mode === 'rewrite') {
        // Rewrite mode: process only selected chunks (existing behavior)
        if (selectedIndices.length === 0 || documentChunks.length === 0) {
          throw new Error('No chunks selected for processing');
        }
        const selectedChunks = selectedIndices.map(index => documentChunks[index]);
        return await processMultipleChunks(
          selectedChunks, 
          instructions, 
          contentSource, 
          useContentSource, 
          onChunkProcessed
        );
      } else if (mode === 'both') {
        // Both mode: rewrite selected chunks AND add new chunks to the full document
        let finalChunks = [...documentChunks];
        
        // First, rewrite selected chunks if any
        if (selectedIndices.length > 0) {
          const selectedChunks = selectedIndices.map(index => documentChunks[index]);
          const rewrittenContent = await processMultipleChunks(
            selectedChunks, 
            instructions, 
            contentSource, 
            useContentSource, 
            onChunkProcessed
          );
          
          // Parse the rewritten content back into chunks and replace the selected ones
          const rewrittenChunks = rewrittenContent.split('\n\n').filter(chunk => chunk.trim());
          let rewrittenIndex = 0;
          
          // Replace the selected chunks with rewritten versions
          selectedIndices.forEach(originalIndex => {
            if (rewrittenIndex < rewrittenChunks.length) {
              finalChunks[originalIndex] = rewrittenChunks[rewrittenIndex];
              rewrittenIndex++;
            }
          });
        }
        
        // Then, add new chunks at the end
        if (additionalChunks > 0) {
          const addedContent = await processAddChunks(
            additionalChunks,
            instructions,
            contentSource,
            useContentSource,
            onChunkProcessed
          );
          
          // Split added content into chunks and append them
          const newChunks = addedContent.split('\n\n').filter(chunk => chunk.trim());
          finalChunks.push(...newChunks);
        }
        
        // Return the complete document with all chunks
        return finalChunks.join('\n\n');
      }
      
      throw new Error('Invalid processing mode');
    } catch (error) {
      setProcessing({
        isProcessing: false,
        currentChunk: 0,
        totalChunks: 0,
        progress: 0
      });
      
      throw error;
    }
  };

  // New function to handle adding chunks
  const processAddChunks = async (
    additionalChunks: number,
    instructions: string,
    contentSource?: string,
    useContentSource = false,
    onChunkProcessed?: (currentResult: string, currentChunk: number, totalChunks: number) => void
  ): Promise<string> => {
    const existingContent = documentChunks.join('\n\n');
    
    // Enhanced instructions for adding new content
    const addInstructions = `Based on the existing document content below, ${instructions}

Generate ${additionalChunks} new chunk${additionalChunks > 1 ? 's' : ''} of content that expands and complements the existing material. Each new chunk should be substantial and add meaningful value to the document.

Existing document content:
${existingContent}

Please generate ${additionalChunks} new chunk${additionalChunks > 1 ? 's' : ''} that follow${additionalChunks === 1 ? 's' : ''} logically from this content.`;

    setProcessing({
      isProcessing: true,
      currentChunk: 0,
      totalChunks: additionalChunks,
      progress: 0
    });

    // Use the regular text processing API to generate new content
    const request: ProcessTextRequest = {
      inputText: existingContent,
      instructions: addInstructions,
      contentSource,
      llmProvider,
      useContentSource,
    };

    const result = await processText(request);
    
    setProcessing({
      isProcessing: false,
      currentChunk: additionalChunks,
      totalChunks: additionalChunks,
      progress: 100
    });

    if (onChunkProcessed) {
      onChunkProcessed(result, additionalChunks, additionalChunks);
    }

    return result;
  };
  
  // Process text in multiple chunks
  const processMultipleChunks = async (
    chunks: string[],
    instructions: string,
    contentSource?: string,
    useContentSource = false,
    onChunkProcessed?: (currentResult: string, currentChunk: number, totalChunks: number) => void
  ): Promise<string> => {
    try {
      setProcessing({
        isProcessing: true,
        currentChunk: 0,
        totalChunks: chunks.length,
        progress: 0
      });
      
      let result = '';
      
      for (let i = 0; i < chunks.length; i++) {
        setProcessing({
          isProcessing: true,
          currentChunk: i,
          totalChunks: chunks.length,
          progress: Math.round((i / chunks.length) * 100)
        });
        
        const request: ProcessChunkRequest = {
          inputText: chunks[i],
          instructions,
          contentSource,
          llmProvider,
          useContentSource,
          chunkIndex: i,
          totalChunks: chunks.length
        };
        
        const chunkResult = await processChunk(request);
        
        // Append the processed chunk to the result
        result += (result ? '\n\n' : '') + chunkResult.result;
        
        // Call the callback with the current result if provided
        if (onChunkProcessed) {
          onChunkProcessed(result, i + 1, chunks.length);
        }
        
        // Add 15-second delay between chunks to prevent rate limiting (except for last chunk)
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 15000));
        }
        
        // Update progress
        setProcessing({
          isProcessing: true,
          currentChunk: i + 1,
          totalChunks: chunks.length,
          progress: Math.round(((i + 1) / chunks.length) * 100)
        });
      }
      
      setProcessing({
        isProcessing: false,
        currentChunk: chunks.length,
        totalChunks: chunks.length,
        progress: 100
      });
      
      return result;
    } catch (error) {
      setProcessing({
        isProcessing: false,
        currentChunk: 0,
        totalChunks: 0,
        progress: 0
      });
      
      throw error;
    }
  };
  
  // Cancel processing
  const cancelProcessing = () => {
    setProcessing({
      isProcessing: false,
      currentChunk: 0,
      totalChunks: 0,
      progress: 0
    });
    
    // Also hide the chunk selector if it's visible
    setShowChunkSelector(false);
  };
  
  // Get estimated chunk count for user info
  const getEstimatedChunks = (text: string): number => {
    return estimateChunkCount(text);
  };
  
  return {
    llmProvider,
    setLLMProvider,
    processing,
    documentChunks,
    showChunkSelector,
    setShowChunkSelector,
    processFullText,
    processSelectedChunks,
    cancelProcessing,
    getEstimatedChunks
  };
}
