import React, { useState, useEffect } from 'react';
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
  onProcess: (instructions: string, examMode: boolean) => void;
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
  const [savedInstructions, setSavedInstructions] = useState<SavedInstruction[]>([]);
  const [instructionName, setInstructionName] = useState("");
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
  
  return (
    <div className="space-y-3 mb-3">
      {/* Rewrite Instructions Input */}
      <div className="w-full">
        <Label htmlFor="rewrite-instructions" className="text-sm font-medium mb-2 block">
          Rewrite Instructions
        </Label>
        <Input
          id="rewrite-instructions"
          placeholder="E.g., Simplify this text, Make it professional, Expand this content..."
          value={rewriteInstructions}
          onChange={(e) => setRewriteInstructions(e.target.value)}
          className="w-full"
        />
      </div>
      
      {/* Mode Toggle */}
      <div className="flex items-center space-x-6 mb-2">
        <div className="flex items-center space-x-2">
          <Switch
            id="solve-mode"
            checked={examMode || homeworkMode}
            onCheckedChange={(checked) => {
              setExamMode(checked);
              setHomeworkMode(checked);
              if (checked) {
                setRewriteInstructions("SOLVE ALL MATHEMATICAL PROBLEMS AND ANSWER ALL QUESTIONS. Show complete step-by-step solutions with final answers.");
              } else {
                setRewriteInstructions("");
              }
            }}
          />
          <Label htmlFor="solve-mode" className="text-sm font-medium">
            Solve Problems Mode {(examMode || homeworkMode) ? '(Solve All Math)' : '(Rewrite Text)'}
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
            onClick={() => onProcess(rewriteInstructions, examMode)}
            disabled={!rewriteInstructions.trim()}
          >
            <PlayIcon className="h-4 w-4" />
            <span>{isProcessing ? 'Processing...' : (examMode ? 'Take Test' : 'Process Text')}</span>
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