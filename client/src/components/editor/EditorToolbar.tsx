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
import { PlayIcon, SearchIcon, MicIcon, FileAudioIcon, SaveIcon } from 'lucide-react';
import { LLMProvider, SavedInstruction } from '@/types';
import { saveInstructions, getSavedInstructions } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface EditorToolbarProps {
  onProcess: () => void;
  onFindOnline: () => void;
  onVoiceInput: () => void;
  onAudioTranscription: () => void;
  isProcessing: boolean;
  llmProvider: LLMProvider;
  setLLMProvider: (provider: LLMProvider) => void;
  onInstructionsSelect: (instructions: string) => void;
  currentInstructions: string;
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
  currentInstructions
}: EditorToolbarProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [instructionName, setInstructionName] = useState('');
  const [savedInstructions, setSavedInstructions] = useState<SavedInstruction[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Load saved instructions
  useEffect(() => {
    async function loadSavedInstructions() {
      try {
        setIsLoading(true);
        const instructions = await getSavedInstructions();
        setSavedInstructions(instructions);
      } catch (error) {
        console.error('Error loading saved instructions:', error);
        toast({
          title: "Failed to load saved instructions",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    loadSavedInstructions();
  }, [toast]);
  
  // Handle saving instructions
  const handleSaveInstructions = async () => {
    if (!currentInstructions) {
      toast({
        title: "No instructions to save",
        description: "Please enter instructions in the chat window first.",
        variant: "destructive"
      });
      return;
    }
    
    if (!instructionName) {
      toast({
        title: "Name required",
        description: "Please enter a name for these instructions.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSaving(true);
      
      const savedInstruction = await saveInstructions(instructionName, currentInstructions);
      setSavedInstructions(prev => [...prev, savedInstruction]);
      
      toast({
        title: "Instructions saved",
        description: `"${instructionName}" has been saved.`,
      });
      
      setSaveDialogOpen(false);
      setInstructionName('');
    } catch (error) {
      console.error('Error saving instructions:', error);
      toast({
        title: "Failed to save instructions",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle selecting a saved instruction
  const handleSelectInstruction = (value: string) => {
    if (value === "default") return;
    
    const instruction = savedInstructions.find(i => i.id.toString() === value);
    if (instruction) {
      onInstructionsSelect(instruction.instructions);
    }
  };
  
  return (
    <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
      <div className="flex items-center">
        <Button 
          className="mr-2 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-1.5 text-sm font-medium transition-colors"
          onClick={onProcess}
          disabled={isProcessing}
        >
          <PlayIcon className="h-4 w-4" />
          <span>{isProcessing ? 'Processing...' : 'Process Text'}</span>
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
    </div>
  );
}
