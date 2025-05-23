import { useState } from 'react';
import { ProcessTextRequest, ProcessChunkRequest, LLMProvider, ProcessingStatus } from '@/types';
import { processText, processChunk } from '@/lib/api';
import { chunkText, estimateChunkCount } from '@/lib/text-chunker';

export function useLLM() {
  const [llmProvider, setLLMProvider] = useState<LLMProvider>('openai');
  const [processing, setProcessing] = useState<ProcessingStatus>({
    isProcessing: false,
    currentChunk: 0,
    totalChunks: 0,
    progress: 0
  });
  
  // Process a complete text
  const processFullText = async (
    inputText: string,
    instructions: string,
    contentSource?: string,
    useContentSource = false,
    reprocessOutput = false
  ): Promise<string> => {
    try {
      if (!inputText || !instructions) {
        throw new Error('Input text and instructions are required');
      }
      
      // Check if we need to chunk the text
      const chunks = chunkText(inputText);
      
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
      
      // Process multiple chunks sequentially
      return await processMultipleChunks(chunks, instructions, contentSource, useContentSource);
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
  
  // Process text in multiple chunks
  const processMultipleChunks = async (
    chunks: string[],
    instructions: string,
    contentSource?: string,
    useContentSource = false
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
  };
  
  // Get estimated chunk count for user info
  const getEstimatedChunks = (text: string): number => {
    return estimateChunkCount(text);
  };
  
  return {
    llmProvider,
    setLLMProvider,
    processing,
    processFullText,
    cancelProcessing,
    getEstimatedChunks
  };
}
