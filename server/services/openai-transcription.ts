import OpenAI from 'openai';
import { Readable } from 'stream';

/**
 * Transcribe audio using OpenAI Whisper model
 */
export async function transcribeAudioWithOpenAI(audioBuffer: Buffer): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
  }

  try {
    console.log('OpenAI transcription starting with buffer size:', audioBuffer.length);

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Create a readable stream from the buffer
    const audioStream = new Readable({
      read() {}
    });
    audioStream.push(audioBuffer);
    audioStream.push(null);

    // Add required properties for OpenAI API
    (audioStream as any).path = 'audio.webm';

    const transcription = await openai.audio.transcriptions.create({
      file: audioStream as any,
      model: 'whisper-1',
      response_format: 'text',
    });

    console.log('OpenAI transcription completed, text length:', transcription.length);

    if (!transcription || !transcription.trim()) {
      throw new Error('No transcription text returned from OpenAI');
    }

    return transcription.trim();
  } catch (error: any) {
    console.error('OpenAI transcription error:', error);
    throw new Error(`Failed to transcribe audio with OpenAI: ${error.message}`);
  }
}