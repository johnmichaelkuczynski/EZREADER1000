import OpenAI from 'openai';
import { File as FormDataFile } from 'formdata-node';

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

    // Create a File object from the buffer
    const audioFile = new FormDataFile([audioBuffer], 'audio.webm', {
      type: 'audio/webm',
    });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile as any,
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