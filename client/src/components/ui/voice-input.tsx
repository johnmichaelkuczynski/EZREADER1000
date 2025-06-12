import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { MicIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

export function VoiceInput({ onTranscription, className = '', size = 'sm' }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      audioChunks.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.current = recorder;
      
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      });
      
      recorder.addEventListener('stop', async () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (audioChunks.current.length === 0) {
          toast({
            title: "Recording failed",
            description: "No audio data was recorded",
            variant: "destructive"
          });
          setIsRecording(false);
          return;
        }
        
        const audioBlob = new Blob(audioChunks.current, { type: mimeType });
        const audioFile = new File([audioBlob], `recording.${mimeType.split('/')[1]}`, { type: mimeType });
        
        try {
          toast({
            title: "Transcribing audio",
            description: "Processing your recording...",
          });
          
          await transcribeAudio(audioFile);
        } catch (error: any) {
          toast({
            title: "Transcription failed",
            description: error?.message || "Failed to transcribe audio",
            variant: "destructive"
          });
        } finally {
          setIsRecording(false);
        }
      });
      
      recorder.start(1000);
      setIsRecording(true);
      
      toast({
        title: "Recording started",
        description: "Speak into the microphone",
      });
    } catch (error) {
      toast({
        title: "Recording failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current = null;
    }
  };

  const transcribeAudio = async (file: File) => {
    const formData = new FormData();
    formData.append('audio', file);
    
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transcription failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.result) {
      throw new Error('No transcription text returned from API');
    }
    
    const newText = result.result.trim();
    if (newText) {
      onTranscription(newText);
      toast({
        title: "Audio transcribed",
        description: `Added ${newText.length} characters`,
      });
    } else {
      toast({
        title: "No speech detected",
        description: "The audio recording appears to be silent",
        variant: "destructive"
      });
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size={size === 'sm' ? 'icon' : size}
      className={`${isRecording ? 'text-red-500 hover:text-red-600' : 'text-slate-400 hover:text-slate-600'} ${className}`}
      onClick={isRecording ? stopRecording : startRecording}
      title={isRecording ? 'Stop recording' : 'Voice input'}
    >
      <MicIcon className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
    </Button>
  );
}