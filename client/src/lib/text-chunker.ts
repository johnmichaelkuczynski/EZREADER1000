// Chunk a large text into smaller parts for processing
export function chunkText(text: string, chunkSize: number = 1000): string[] {
  // Dynamically adjust chunk size based on document length for very large documents
  const adjustedChunkSize = adjustChunkSizeForLargeDocument(text, chunkSize);
  
  // No need to chunk if the text is smaller than the chunk size
  if (countWords(text) <= adjustedChunkSize) {
    return [text];
  }
  
  // Split the text into paragraphs first
  const paragraphs = text.split(/\n+/);
  const chunks: string[] = [];
  let currentChunk = '';
  let currentChunkWordCount = 0;
  
  for (const paragraph of paragraphs) {
    const paragraphWordCount = countWords(paragraph);
    
    // Handle extremely long paragraphs (longer than our chunk size)
    if (paragraphWordCount > adjustedChunkSize * 1.5) {
      // If we have accumulated content, add it as a chunk first
      if (currentChunk !== '') {
        chunks.push(currentChunk);
        currentChunk = '';
        currentChunkWordCount = 0;
      }
      
      // Split the long paragraph into sentences
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      let sentenceChunk = '';
      let sentenceChunkWordCount = 0;
      
      for (const sentence of sentences) {
        const sentenceWordCount = countWords(sentence);
        
        if (sentenceChunkWordCount + sentenceWordCount > adjustedChunkSize && sentenceChunk !== '') {
          chunks.push(sentenceChunk);
          sentenceChunk = sentence;
          sentenceChunkWordCount = sentenceWordCount;
        } else {
          if (sentenceChunk !== '') {
            sentenceChunk += ' ';
          }
          sentenceChunk += sentence;
          sentenceChunkWordCount += sentenceWordCount;
        }
      }
      
      // Add the last sentence chunk if it has content
      if (sentenceChunk !== '') {
        chunks.push(sentenceChunk);
      }
      
      continue; // Skip to the next paragraph
    }
    
    // For normal paragraphs, use the standard chunking logic
    // If adding this paragraph would exceed the chunk size and we already have content
    if (currentChunkWordCount + paragraphWordCount > adjustedChunkSize && currentChunk !== '') {
      chunks.push(currentChunk);
      currentChunk = paragraph;
      currentChunkWordCount = paragraphWordCount;
    } else {
      // Add a newline if we already have content in the current chunk
      if (currentChunk !== '') {
        currentChunk += '\n\n';
      }
      currentChunk += paragraph;
      currentChunkWordCount += paragraphWordCount;
    }
  }
  
  // Add the last chunk if it has content
  if (currentChunk !== '') {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

// Dynamically adjust chunk size based on document length
function adjustChunkSizeForLargeDocument(text: string, baseChunkSize: number): number {
  const wordCount = countWords(text);
  
  // For very large documents (>50,000 words), use larger chunks to reduce the total number
  if (wordCount > 100000) {
    return 4000; // Very large documents
  } else if (wordCount > 50000) {
    return 3000; // Large documents
  } else if (wordCount > 20000) {
    return 2000; // Medium-large documents
  } else {
    return baseChunkSize; // Use the provided base chunk size
  }
}

// Count words in a text
function countWords(text: string): number {
  if (!text || text.trim() === '') {
    return 0;
  }
  
  const words = text.trim().split(/\s+/);
  return words.length;
}

// Estimate token count (for API limits)
export function estimateTokenCount(text: string): number {
  // A rough estimate: average English word is about 4.7 characters
  // and 1 token is approximately 4 characters
  const characters = text.length;
  return Math.ceil(characters / 4);
}

// Estimate chunk count needed for a text
export function estimateChunkCount(text: string, chunkSize: number = 1000): number {
  const wordCount = countWords(text);
  return Math.max(1, Math.ceil(wordCount / chunkSize));
}
