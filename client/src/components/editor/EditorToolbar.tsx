import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect } from 'react';
import { PlayIcon, SearchIcon, MicIcon, FileAudioIcon, SaveIcon, Trash2 } from 'lucide-react';
import { LLMProvider, SavedInstruction } from '@/types';
import { saveInstructions, getSavedInstructions } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface EditorToolbarProps {
  onProcess: (instructions: string, examMode?: boolean, homeworkMode?: boolean) => void;
  onFindOnline: () => void;
  onVoiceInput: () => void;
  onAudioTranscription: () => void;
  isProcessing: boolean;
  llmProvider: LLMProvider;
  setLLMProvider: (provider: LLMProvider) => void;
  onInstructionsSelect: (instructions: string) => void;
  currentInstructions: string;
  enableSynthesisMode?: boolean;
  setEnableSynthesisMode?: (enabled: boolean) => void;
  rewriteInstructions: string;
  setRewriteInstructions: (instructions: string) => void;
  examMode: boolean;
  setExamMode: (enabled: boolean) => void;
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
  examMode,
  setExamMode,
  homeworkMode,
  setHomeworkMode,
  onClearAll
}: EditorToolbarProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [instructionName, setInstructionName] = useState('');
  const [savedInstructions, setSavedInstructions] = useState<SavedInstruction[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
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
      const savedInstruction = await saveInstructions({
        name: instructionName,
        instructions: currentInstructions
      });
      
      setSavedInstructions(prev => [...prev, savedInstruction]);
      setInstructionName('');
      setSaveDialogOpen(false);
      
      toast({
        title: "Instructions saved",
        description: "Your instructions have been saved successfully."
      });
    } catch (error) {
      console.error('Failed to save instructions:', error);
      toast({
        title: "Save failed",
        description: "Failed to save instructions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectInstruction = (value: string) => {
    if (value === 'default') return;
    
    const instruction = savedInstructions.find(inst => inst.id.toString() === value);
    if (instruction) {
      onInstructionsSelect(instruction.instructions);
    }
  };
  
  return (
    <div className="space-y-3 mb-3">
      {/* Rewrite Instructions Input */}
      <div className="w-full">
        <Label htmlFor="rewrite-instructions" className="text-sm font-medium mb-2 block">
          Rewrite Instructions
        </Label>
        <Input
          id="rewrite-instructions"
          placeholder="E.g., TAKE THE EXAM AND GET A 100/100, Simplify this text, Make it professional..."
          value={rewriteInstructions}
          onChange={(e) => setRewriteInstructions(e.target.value)}
          className="w-full"
        />
      </div>
      
      {/* Mode Toggles */}
      <div className="flex items-center space-x-4 mb-2">
        <div className="flex items-center space-x-2">
          <Switch
            id="exam-mode"
            checked={examMode}
            onCheckedChange={setExamMode}
          />
          <Label htmlFor="exam-mode" className="text-sm font-medium">
            Exam Mode {examMode ? '(Take Test)' : '(Rewrite)'}
          </Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id="homework-mode"
            checked={homeworkMode}
            onCheckedChange={setHomeworkMode}
          />
          <Label htmlFor="homework-mode" className="text-sm font-medium">
            Homework Mode {homeworkMode ? '(Follow Instructions)' : '(Rewrite)'}
          </Label>
        </div>
      </div>

      {/* Main Toolbar */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center">
          <Button 
            className="mr-2 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-1.5 text-sm font-medium transition-colors"
            onClick={() => onProcess(rewriteInstructions, examMode, homeworkMode)}
            disabled={isProcessing}
          >
            <PlayIcon className="h-4 w-4" />
            <span>{isProcessing ? 'Processing...' : (homeworkMode ? 'Follow Instructions' : examMode ? 'Take Test' : 'Process Text')}</span>
          </Button>
          
          <div className="flex bg-slate-100 rounded-md p-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="px-3 py-1 text-xs font-medium rounded"
              onClick={onFindOnline}
            >
              <SearchIcon className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Find Online</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="px-3 py-1 text-xs font-medium rounded"
              onClick={onVoiceInput}
            >
              <MicIcon className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Voice</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="px-3 py-1 text-xs font-medium rounded"
              onClick={onAudioTranscription}
            >
              <FileAudioIcon className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Transcribe</span>
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Select 
            defaultValue="default"
            onValueChange={handleSelectInstruction}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Saved Instructions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Saved Instructions</SelectItem>
              {!isLoading && savedInstructions.map(instruction => (
                <SelectItem key={instruction.id} value={instruction.id.toString()}>
                  {instruction.name}
                </SelectItem>
              ))}
              {isLoading && <SelectItem value="loading" disabled>Loading...</SelectItem>}
              {!isLoading && savedInstructions.length === 0 && (
                <SelectItem value="none" disabled>No saved instructions</SelectItem>
              )}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="icon"
            className="bg-slate-100 hover:bg-slate-200 p-2 rounded-md text-slate-600 transition-colors"
            onClick={() => setSaveDialogOpen(true)}
          >
            <SaveIcon className="h-4 w-4" />
          </Button>
          
          {/* Full Document Synthesis Mode Toggle */}
          {setEnableSynthesisMode && (
            <div className="flex items-center space-x-2 ml-2 bg-slate-100 p-2 rounded-md">
              <Switch
                id="synthesis-mode"
                checked={enableSynthesisMode}
                onCheckedChange={setEnableSynthesisMode}
              />
              <Label htmlFor="synthesis-mode" className="text-xs font-medium">
                Full Document Synthesis Mode
              </Label>
            </div>
          )}
        </div>
      </div>
      
      {/* Save Instructions Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Instructions</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="instruction-name">Instruction Name</Label>
              <Input
                id="instruction-name"
                placeholder="E.g., Simplify Text, Professional Tone, etc."
                value={instructionName}
                onChange={(e) => setInstructionName(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveInstructions} disabled={isSaving || !instructionName}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Clear Whole App Button */}
      {onClearAll && (
        <Button 
          variant="destructive" 
          size="sm"
          onClick={onClearAll}
          className="ml-2"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Clear All
        </Button>
      )}
    </div>
  );
}