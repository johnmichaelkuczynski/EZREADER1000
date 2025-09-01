import { TextChunk } from "@shared/schema";
import { randomUUID } from "crypto";

export class TextChunkerService {
  private readonly CHUNK_SIZE = 500; // words per chunk
  private readonly OVERLAP_SIZE = 50; // word overlap between chunks

  chunkText(text: string): TextChunk[] {
    const words = text.trim().split(/\s+/);
    const totalWords = words.length;
    
    if (totalWords <= this.CHUNK_SIZE) {
      return [{
        id: randomUUID(),
        content: text,
        startWord: 1,
        endWord: totalWords,
      }];
    }

    const chunks: TextChunk[] = [];
    let currentStart = 0;

    while (currentStart < totalWords) {
      const currentEnd = Math.min(currentStart + this.CHUNK_SIZE, totalWords);
      const chunkWords = words.slice(currentStart, currentEnd);
      const chunkContent = chunkWords.join(' ');

      chunks.push({
        id: randomUUID(),
        content: chunkContent,
        startWord: currentStart + 1,
        endWord: currentEnd,
      });

      // Move to next chunk with overlap
      currentStart = currentEnd - this.OVERLAP_SIZE;
      
      // Ensure we don't create tiny final chunks
      if (totalWords - currentStart < this.CHUNK_SIZE / 2) {
        break;
      }
    }

    return chunks;
  }

  reconstructFromChunks(chunks: TextChunk[], selectedChunkIds: string[]): string {
    const selectedChunks = chunks
      .filter(chunk => selectedChunkIds.includes(chunk.id))
      .sort((a, b) => a.startWord - b.startWord);

    if (selectedChunks.length === 0) {
      return '';
    }

    // Handle overlaps when reconstructing
    let reconstructedText = selectedChunks[0].content;
    
    for (let i = 1; i < selectedChunks.length; i++) {
      const currentChunk = selectedChunks[i];
      const previousChunk = selectedChunks[i - 1];
      
      // Check if chunks are adjacent or overlapping
      if (currentChunk.startWord <= previousChunk.endWord + this.OVERLAP_SIZE) {
        // Remove overlap
        const overlapWords = previousChunk.endWord - currentChunk.startWord + 1;
        if (overlapWords > 0) {
          const currentWords = currentChunk.content.split(/\s+/);
          const nonOverlappingWords = currentWords.slice(overlapWords);
          reconstructedText += ' ' + nonOverlappingWords.join(' ');
        } else {
          reconstructedText += ' ' + currentChunk.content;
        }
      } else {
        // Add gap indicator if chunks are not adjacent
        reconstructedText += '\n\n[...]\n\n' + currentChunk.content;
      }
    }

    return reconstructedText;
  }

  getChunkPreview(content: string, maxLength: number = 150): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  }
}

export const textChunkerService = new TextChunkerService();
