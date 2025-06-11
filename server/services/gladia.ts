import fetch from 'node-fetch';
import { FormData } from 'formdata-node';
import { Blob } from 'formdata-node';

interface GladiaUploadResponse {
  audio_url: string;
  error?: string;
}

interface GladiaTranscriptionResponse {
  result: {
    transcription: {
      full_transcript: string;
    };
  };
  error?: string;
}

/**
 * Upload audio file to Gladia and get transcription
 */
export async function transcribeAudioWithGladia(audioBuffer: Buffer): Promise<string> {
  const apiKey = process.env.GLADIA_API_KEY;

  if (!apiKey) {
    throw new Error('Gladia API key not configured. Please set GLADIA_API_KEY environment variable.');
  }

  try {
    console.log('Gladia transcription starting with buffer size:', audioBuffer.length);

    // Step 1: Upload audio file to Gladia
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
    formData.append('audio', audioBlob, 'audio.webm');

    const uploadResponse = await fetch('https://api.gladia.io/v2/upload', {
      method: 'POST',
      headers: {
        'x-gladia-key': apiKey,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Gladia upload error response:', errorText);
      throw new Error(`Gladia upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    const uploadResult = await uploadResponse.json() as GladiaUploadResponse;
    console.log('Gladia upload successful, audio URL:', uploadResult.audio_url);

    if (uploadResult.error) {
      throw new Error(`Gladia upload error: ${uploadResult.error}`);
    }

    // Step 2: Request transcription
    const transcriptionResponse = await fetch('https://api.gladia.io/v2/transcription', {
      method: 'POST',
      headers: {
        'x-gladia-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: uploadResult.audio_url,
        enable_code_switching: true,
        language_behaviour: 'automatic single language',
        transcription_hint: '',
        output_format: 'json',
      }),
    });

    console.log('Gladia transcription response status:', transcriptionResponse.status);

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error('Gladia transcription error response:', errorText);
      throw new Error(`Gladia transcription failed: ${transcriptionResponse.status} ${transcriptionResponse.statusText}`);
    }

    const transcriptionResult = await transcriptionResponse.json() as GladiaTranscriptionResponse;
    console.log('Gladia transcription result received');

    if (transcriptionResult.error) {
      throw new Error(`Gladia transcription error: ${transcriptionResult.error}`);
    }

    const transcribedText = transcriptionResult.result?.transcription?.full_transcript || '';
    console.log('Gladia transcription completed, text length:', transcribedText.length);

    if (!transcribedText.trim()) {
      throw new Error('No transcription text returned from Gladia');
    }

    return transcribedText;
  } catch (error: any) {
    console.error('Gladia transcription error:', error);
    throw new Error(`Failed to transcribe audio with Gladia: ${error.message}`);
  }
}