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
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  const maxRecordingTime = useRef<NodeJS.Timeout | null>(null);
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
      setRecordingTime(0);
      
      // Start recording timer
      recordingTimer.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Auto-stop after 2 minutes to prevent large files
      maxRecordingTime.current = setTimeout(() => {
        if (isRecording) {
          stopRecording();
          toast({
            title: "Recording stopped",
            description: "Maximum recording time (2 minutes) reached",
            variant: "destructive"
          });
        }
      }, 120000); // 2 minutes
      
      toast({
        title: "Recording started",
        description: "Speak into the microphone (max 2 minutes)",
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
      
      // Clear timers
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
      if (maxRecordingTime.current) {
        clearTimeout(maxRecordingTime.current);
        maxRecordingTime.current = null;
      }
      
      setRecordingTime(0);
    }
  };

  const transcribeAudio = async (file: File) => {
    // Check file size before sending (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`Audio file too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is 10MB.`);
    }
    
    const formData = new FormData();
    formData.append('audio', file);
    
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Transcription failed: ${response.status} ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          errorMessage = errorJson.error;
        }
      } catch {
        // Keep original error message if parsing fails
      }
      throw new Error(errorMessage);
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

  // Cleanup function to clear timers on unmount
  React.useEffect(() => {
    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
      if (maxRecordingTime.current) {
        clearTimeout(maxRecordingTime.current);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size={size === 'sm' ? 'icon' : size}
      className={`${isRecording ? 'text-red-500 hover:text-red-600 animate-pulse' : 'text-slate-400 hover:text-slate-600'} ${className}`}
      onClick={isRecording ? stopRecording : startRecording}
      title={isRecording ? `Stop recording (${formatTime(recordingTime)})` : 'Voice input'}
    >
      <MicIcon className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
      {isRecording && size !== 'sm' && (
        <span className="ml-1 text-xs">{formatTime(recordingTime)}</span>
      )}
    </Button>
  );
}