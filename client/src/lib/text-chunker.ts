// Chunk a large text into smaller parts for processing
export function chunkText(text: string, chunkSize: number = 1000): string[] {
  // No need to chunk if the text is smaller than the chunk size
  if (countWords(text) <= chunkSize) {
    return [text];
  }
  
  // Split the text into paragraphs first
  const paragraphs = text.split(/\n+/);
  const chunks: string[] = [];
  let currentChunk = '';
  let currentChunkWordCount = 0;
  
  for (const paragraph of paragraphs) {
    const paragraphWordCount = countWords(paragraph);
    
    // If adding this paragraph would exceed the chunk size and we already have content
    if (currentChunkWordCount + paragraphWordCount > chunkSize && currentChunk !== '') {
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
