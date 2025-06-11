import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Trash2Icon, SaveIcon, LoaderIcon } from 'lucide-react';
import { getSavedInstructions, saveInstructions, deleteSavedInstructions } from '@/lib/queryClient';

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
    if (!instructionName.trim() || !currentInstructions.trim()) return;
    
    setIsSaving(true);
    try {
      await saveInstructions({
        name: instructionName.trim(),
        instructions: currentInstructions
      });
      
      // Reload instructions
      const updatedInstructions = await getSavedInstructions();
      setSavedInstructions(updatedInstructions);
      setInstructionName("");
      
      toast({
        title: "Instructions saved",
        description: `"${instructionName}" has been saved successfully.`
      });
    } catch (error) {
      console.error('Failed to save instructions:', error);
      toast({
        title: "Save failed",
        description: "Could not save instructions. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInstructions = async (id: number, name: string) => {
    try {
      await deleteSavedInstructions(id);
      setSavedInstructions(prev => prev.filter(inst => inst.id !== id));
      
      toast({
        title: "Instructions deleted",
        description: `"${name}" has been deleted.`
      });
    } catch (error) {
      console.error('Failed to delete instructions:', error);
      toast({
        title: "Delete failed",
        description: "Could not delete instructions. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleInstructionSelect = (value: string) => {
    if (value === 'none') {
      onInstructionsSelect('');
      return;
    }
    
    const instruction = savedInstructions.find(inst => inst.id.toString() === value);
    if (instruction) {
      onInstructionsSelect(instruction.instructions);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
      {/* LLM Provider Selection */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Label htmlFor="llm-provider">AI Provider</Label>
          <Select value={llmProvider} onValueChange={setLLMProvider}>
            <SelectTrigger>
              <SelectValue placeholder="Select AI provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI GPT-4</SelectItem>
              <SelectItem value="anthropic">Anthropic Claude</SelectItem>
              <SelectItem value="perplexity">Perplexity</SelectItem>
              <SelectItem value="azure">Azure OpenAI</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Synthesis Mode Toggle */}
      {setEnableSynthesisMode && (
        <div className="flex items-center space-x-2">
          <Switch
            id="synthesis-mode"
            checked={enableSynthesisMode}
            onCheckedChange={setEnableSynthesisMode}
          />
          <Label htmlFor="synthesis-mode">Enable Synthesis Mode</Label>
        </div>
      )}

      {/* Saved Instructions */}
      <div className="space-y-2">
        <Label>Saved Instructions</Label>
        <div className="flex gap-2">
          <Select onValueChange={handleInstructionSelect}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={isLoading ? "Loading..." : "Select saved instructions"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {savedInstructions.map((instruction) => (
                <SelectItem key={instruction.id} value={instruction.id.toString()}>
                  {instruction.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Save new instructions */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Name for these instructions"
            value={instructionName}
            onChange={(e) => setInstructionName(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-md text-sm"
          />
          <Button
            onClick={handleSaveInstructions}
            disabled={!instructionName.trim() || !currentInstructions.trim() || isSaving}
            size="sm"
          >
            {isSaving ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
          </Button>
        </div>

        {/* Delete instructions */}
        {savedInstructions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {savedInstructions.map((instruction) => (
              <Button
                key={instruction.id}
                variant="outline"
                size="sm"
                onClick={() => handleDeleteInstructions(instruction.id, instruction.name)}
                className="text-xs"
              >
                <Trash2Icon className="h-3 w-3 mr-1" />
                {instruction.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Rewrite Instructions */}
      <div className="space-y-2">
        <Label htmlFor="rewrite-instructions">Rewrite Instructions</Label>
        <div className="relative">
          <Textarea
            id="rewrite-instructions"
            placeholder="Type your rewrite instructions here..."
            value={rewriteInstructions}
            onChange={(e) => setRewriteInstructions(e.target.value)}
            className="w-full pr-10"
          />
        </div>
      </div>
      
      {/* Homework Mode Toggle */}
      <div className="flex items-center space-x-2">
        <Switch
          id="homework-mode"
          checked={homeworkMode}
          onCheckedChange={setHomeworkMode}
        />
        <Label htmlFor="homework-mode">Homework Mode</Label>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={() => onProcess(currentInstructions, homeworkMode)}
          disabled={isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Process Document'
          )}
        </Button>

        {onFindOnline && (
          <Button onClick={onFindOnline} variant="outline">
            Find Online
          </Button>
        )}

        {onVoiceInput && (
          <Button onClick={onVoiceInput} variant="outline">
            Voice Input
          </Button>
        )}

        {onAudioTranscription && (
          <Button onClick={onAudioTranscription} variant="outline">
            Audio Transcription
          </Button>
        )}

        {onClearAll && (
          <Button onClick={onClearAll} variant="outline">
            Clear All
          </Button>
        )}
      </div>
    </div>
  );
}