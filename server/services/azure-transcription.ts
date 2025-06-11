import fetch from 'node-fetch';
import { FormData } from 'formdata-node';
import { Blob } from 'formdata-node';

/**
 * Transcribe audio using Azure OpenAI Whisper model
 */
export async function transcribeAudioWithAzure(audioBuffer: Buffer): Promise<string> {
  const apiKey = process.env.AZURE_OPENAI_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;

  if (!apiKey || !endpoint) {
    throw new Error('Azure OpenAI credentials not configured. Please set AZURE_OPENAI_KEY and AZURE_OPENAI_ENDPOINT environment variables.');
  }

  try {
    console.log('Azure OpenAI transcription starting with buffer size:', audioBuffer.length);

    // Create form data with audio file
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');

    // Azure OpenAI Whisper API endpoint
    const transcriptionUrl = `${endpoint}/openai/deployments/whisper-1/audio/transcriptions?api-version=2024-02-01`;

    const response = await fetch(transcriptionUrl, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
      },
      body: formData as any,
    });

    console.log('Azure OpenAI transcription response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure OpenAI transcription error response:', errorText);
      throw new Error(`Azure OpenAI transcription failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Azure OpenAI transcription result:', { textLength: result.text?.length || 0 });

    const transcribedText = result.text || '';
    
    if (!transcribedText.trim()) {
      throw new Error('No transcription text returned from Azure OpenAI');
    }

    console.log('Azure OpenAI transcription completed, text length:', transcribedText.length);
    return transcribedText;
  } catch (error: any) {
    console.error('Azure OpenAI transcription error:', error);
    throw new Error(`Failed to transcribe audio with Azure OpenAI: ${error.message}`);
  }
}