import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayIcon, SearchIcon, MicIcon, BookOpenIcon, SaveIcon, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSavedInstructions, saveInstructions } from "@/lib/api";

interface SavedInstruction {
  id: number;
  name: string;
  instructions: string;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}

interface EditorToolbarProps {
  onProcess: (instructions: string, homeworkMode: boolean) => void;
  onFindOnline?: () => void;
  onVoiceInput?: () => void;
  onAudioTranscription?: () => void;
  isProcessing: boolean;
  llmProvider: string;
  setLLMProvider: (provider: string) => void;
  onInstructionsSelect: (instructions: string) => void;
  currentInstructions: string;
  enableSynthesisMode?: boolean;
  setEnableSynthesisMode?: (enabled: boolean) => void;
  rewriteInstructions: string;
  setRewriteInstructions: (instructions: string) => void;
  homeworkMode: boolean;
  setHomeworkMode: (enabled: boolean) => void;
  onClearAll?: () => void;
}

export function EditorToolbar({
  onProcess,
  onFindOnline,
  onVoiceInput,
  onAudioTranscription,
  isProcessing,
  llmProvider,
  setLLMProvider,
  onInstructionsSelect,
  currentInstructions,
  enableSynthesisMode = false,
  setEnableSynthesisMode,
  rewriteInstructions,
  setRewriteInstructions,
  homeworkMode,
  setHomeworkMode,
  onClearAll
}: EditorToolbarProps) {
  const [savedInstructions, setSavedInstructions] = useState<SavedInstruction[]>([]);
  const [instructionName, setInstructionName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const { toast } = useToast();
  
  // Audio recording refs
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<BlobPart[]>([]);
  
  // Load saved instructions
  useEffect(() => {
    const loadInstructions = async () => {
      setIsLoading(true);
      try {
        const instructions = await getSavedInstructions();
        setSavedInstructions(instructions);
      } catch (error) {
        console.error('Failed to load saved instructions:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadInstructions();
  }, []);

  const handleSaveInstructions = async () => {
    if (!instructionName.trim() || !currentInstructions.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both a name and instructions to save.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      await saveInstructions(instructionName.trim(), currentInstructions);
      toast({
        title: "Instructions saved",
        description: "Your instructions have been saved successfully.",
      });
      setInstructionName("");
      
      // Reload saved instructions
      const instructions = await getSavedInstructions();
      setSavedInstructions(instructions);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save instructions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInstructionSelect = (value: string) => {
    const instruction = savedInstructions.find(inst => inst.id.toString() === value);
    if (instruction) {
      onInstructionsSelect(instruction.instructions);
    }
  };

  // Audio transcription for instructions input
  const handleAudioTranscription = async (file: File) => {
    try {
      console.log('Starting audio transcription for instructions:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      const formData = new FormData();
      formData.append('audio', file);
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });
      
      console.log('Transcription response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Transcription API error:', errorText);
        throw new Error(`Transcription failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Transcription result:', result);
      
      if (!result.result) {
        throw new Error('No transcription text returned from API');
      }
      
      const newText = result.result.trim();
      if (newText) {
        setRewriteInstructions(rewriteInstructions ? `${rewriteInstructions} ${newText}` : newText);
        
        toast({
          title: "Audio transcribed",
          description: `Added ${newText.length} characters to instructions`,
        });
      } else {
        toast({
          title: "No speech detected",
          description: "The audio recording appears to be silent",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error transcribing audio:', error);
      toast({
        title: "Transcription failed",
        description: error?.message || 'Failed to transcribe audio',
        variant: "destructive"
      });
    }
  };

  const startRecording = async () => {
    console.log('Starting recording for rewrite instructions...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      console.log('Microphone access granted');
      audioChunks.current = [];
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      console.log('Using MIME type:', mimeType);
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.current = recorder;
      
      recorder.addEventListener('dataavailable', (event) => {
        console.log('Audio data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      });
      
      recorder.addEventListener('stop', async () => {
        console.log('Recording stopped for instructions');
        stream.getTracks().forEach(track => track.stop());
        
        if (audioChunks.current.length === 0) {
          console.error('No audio chunks recorded');
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
        
        console.log('Audio file created for instructions:', audioFile.size, 'bytes');
        
        try {
          toast({
            title: "Transcribing audio",
            description: "Processing your recording...",
          });
          
          await handleAudioTranscription(audioFile);
        } catch (error: any) {
          console.error('Transcription error in instructions:', error);
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
        description: "Speak your instructions into the microphone",
      });
      console.log('Recording started successfully for instructions');
    } catch (error) {
      console.error('Error starting recording for instructions:', error);
      toast({
        title: "Recording failed",
        description: "Could not access microphone. Please check permissions and try again.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      console.log('Stopping recording...');
      mediaRecorder.current.stop();
    }
  };
  
  return (
    <div className="space-y-3 mb-3">
      {/* Rewrite Instructions Input */}
      <div className="w-full">
        <Label htmlFor="rewrite-instructions" className="text-sm font-medium mb-2 block">
          Rewrite Instructions
        </Label>
        <div className="relative">
          <Input
            id="rewrite-instructions"
            placeholder="E.g., TAKE THE EXAM AND GET A 100/100, Simplify this text, Make it professional..."
            value={rewriteInstructions}
            onChange={(e) => setRewriteInstructions(e.target.value)}
            className="w-full pr-10"
          />

        </div>
      </div>
      
      {/* Homework Mode Toggle */}
      <div className="flex items-center space-x-6 mb-2">
        <div className="flex items-center space-x-2">
          <Switch
            id="homework-mode"
            checked={homeworkMode}
            onCheckedChange={setHomeworkMode}
          />
          <Label htmlFor="homework-mode" className="text-sm font-medium">
            Homework Mode {homeworkMode ? '(Complete Assignment)' : '(Text Processing)'}
          </Label>
        </div>
      </div>

      {/* Clear All Button Row */}
      {onClearAll && (
        <div className="flex justify-end mb-2">
          <Button 
            variant="destructive" 
            size="sm"
            onClick={onClearAll}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        </div>
      )}

      {/* Main Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button 
            className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-1.5 text-sm font-medium transition-colors"
            onClick={() => onProcess(rewriteInstructions, homeworkMode)}
            disabled={false}
          >
            <PlayIcon className="h-4 w-4" />
            <span>{isProcessing ? 'Processing...' : (homeworkMode ? 'Complete Assignment' : 'Process Text')}</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="px-3 py-1 text-xs font-medium rounded bg-slate-100 hover:bg-slate-200"
            onClick={onFindOnline}
          >
            <SearchIcon className="h-3 w-3 mr-1" />
            <span>Find Online</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="px-3 py-1 text-xs font-medium rounded bg-slate-100 hover:bg-slate-200"
            onClick={onVoiceInput}
          >
            <MicIcon className="h-3 w-3 mr-1" />
            <span>Voice</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="px-3 py-1 text-xs font-medium rounded bg-slate-100 hover:bg-slate-200"
            onClick={onAudioTranscription}
          >
            <BookOpenIcon className="h-3 w-3 mr-1" />
            <span>Audio</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* LLM Provider Selector */}
          <Select value={llmProvider} onValueChange={setLLMProvider}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="anthropic">Anthropic</SelectItem>
              <SelectItem value="perplexity">Perplexity</SelectItem>
            </SelectContent>
          </Select>

          {/* Saved Instructions */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <SaveIcon className="h-4 w-4 mr-1" />
                Instructions
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Saved Instructions</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="instruction-select" className="text-sm font-medium">
                    Select Saved Instructions
                  </Label>
                  <Select onValueChange={handleInstructionSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose saved instructions..." />
                    </SelectTrigger>
                    <SelectContent>
                      {savedInstructions.map((instruction) => (
                        <SelectItem key={instruction.id} value={instruction.id.toString()}>
                          {instruction.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="instruction-name" className="text-sm font-medium">
                    Save Current Instructions
                  </Label>
                  <Input
                    id="instruction-name"
                    placeholder="Enter name for instructions..."
                    value={instructionName}
                    onChange={(e) => setInstructionName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSaveInstructions} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}