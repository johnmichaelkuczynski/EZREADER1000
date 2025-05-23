import { useState, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { InputEditor } from "@/components/editor/InputEditor";
import { OutputEditor } from "@/components/editor/OutputEditor";
import { ContentSourceBox } from "@/components/editor/ContentSourceBox";
import { ChatInterface } from "@/components/editor/ChatInterface";
import { ProcessingStatusBar } from "@/components/editor/ProcessingStatusBar";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { ChunkSelector } from "@/components/editor/ChunkSelector";
import { useDocumentProcessor } from "@/hooks/use-document-processor";
import { useFileOperations } from "@/hooks/use-file-operations";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchOnline } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const {
    inputText,
    setInputText,
    outputText,
    setOutputText,
    contentSource,
    setContentSource,
    useContentSource,
    setUseContentSource,
    reprocessOutput,
    setReprocessOutput,
    messages,
    setMessages,
    processing,
    processDocument,
    processSelectedDocumentChunks,
    cancelProcessing,
    inputFileRef,
    contentSourceFileRef,
    audioRef,
    handleInputFileUpload,
    handleContentSourceFileUpload,
    handleAudioTranscription,
    isInputDetecting,
    isOutputDetecting,
    detectAIText,
    clearInput,
    clearOutput,
    clearChat,
    llmProvider,
    setLLMProvider,
    documentChunks,
    showChunkSelector,
    setShowChunkSelector
  } = useDocumentProcessor();

  const {
    isExporting,
    isSendingEmail,
    copyToClipboard,
    exportAsPDF,
    exportAsDOCX,
    sendEmailWithDocument
  } = useFileOperations();

  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioTranscribeDialogOpen, setAudioTranscribeDialogOpen] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  
  const { toast } = useToast();
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<BlobPart[]>([]);

  // Handle online search
  const handleSearch = async () => {
    if (!searchQuery) {
      toast({
        title: "Search query required",
        description: "Please enter a search term.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSearching(true);
      
      const result = await searchOnline(searchQuery);
      setInputText(prev => prev ? `${prev}\n\n${result.content}` : result.content);
      
      setSearchDialogOpen(false);
      toast({
        title: "Search complete",
        description: `Found ${result.results.length} results`,
      });
    } catch (error: any) {
      console.error('Error searching online:', error);
      toast({
        title: "Search failed",
        description: error?.message || "Failed to search online",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Voice input handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks.current = [];
      
      const recorder = new MediaRecorder(stream);
      mediaRecorder.current = recorder;
      
      recorder.addEventListener('dataavailable', (event) => {
        audioChunks.current.push(event.data);
      });
      
      recorder.addEventListener('stop', async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/mp3' });
        const audioFile = new File([audioBlob], "recording.mp3", { type: "audio/mp3" });
        
        try {
          toast({
            title: "Transcribing audio",
            description: "Processing your recording...",
          });
          
          await handleAudioTranscription(audioFile);
          setVoiceDialogOpen(false);
        } catch (error: any) {
          console.error('Transcription error:', error);
          toast({
            title: "Transcription failed",
            description: error?.message || "Failed to transcribe audio",
            variant: "destructive"
          });
        } finally {
          setIsRecording(false);
        }
      });
      
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
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
      // Stream is stopped in the 'stop' event handler above
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  // Handle audio file selection for transcription
  const handleAudioFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAudioFile(e.target.files[0]);
    }
  };

  const transcribeSelectedAudio = async () => {
    if (!audioFile) {
      toast({
        title: "No audio file selected",
        description: "Please select an audio file to transcribe.",
        variant: "destructive"
      });
      return;
    }

    try {
      await handleAudioTranscription(audioFile);
      setAudioTranscribeDialogOpen(false);
      setAudioFile(null);
    } catch (error: any) {
      console.error('Transcription error:', error);
      toast({
        title: "Transcription failed",
        description: error?.message || "Failed to transcribe audio",
        variant: "destructive"
      });
    }
  };

  // Handle processing
  const handleProcess = () => {
    // Get the last user message as instructions
    const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
    
    if (!lastUserMessage) {
      toast({
        title: "No instructions",
        description: "Please provide instructions in the chat box below.",
        variant: "destructive"
      });
      return;
    }
    
    processDocument(lastUserMessage.content);
  };

  // Select an instruction from saved instructions
  const handleInstructionSelect = (instructions: string) => {
    // Create a new user message with the instructions
    const newMessage = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: instructions
    };
    
    setMessages(prev => [...prev, newMessage]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        llmProvider={llmProvider}
        onLLMProviderChange={setLLMProvider}
      />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Mobile LLM Selector - shown only on small screens */}
        <div className="mb-4 flex items-center md:hidden">
          <span className="text-sm text-slate-500">Powered by</span>
          <div className="relative ml-2 flex-1">
            <select 
              className="w-full appearance-none bg-white border border-slate-200 rounded-md py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={llmProvider}
              onChange={(e) => setLLMProvider(e.target.value as any)}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="perplexity">Perplexity</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Content Source Box and Main Editors Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Content Source Box - Left Column on Large Screens */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <ContentSourceBox
              text={contentSource}
              onTextChange={setContentSource}
              onClear={() => setContentSource('')}
              useContentSource={useContentSource}
              onUseContentSourceChange={setUseContentSource}
              onFileUpload={handleContentSourceFileUpload}
              contentSourceFileRef={contentSourceFileRef}
            />
          </div>
          
          {/* Main Editor Area - Right Column on Large Screens */}
          <div className="lg:col-span-9 order-1 lg:order-2">
            {/* Editor Toolbar */}
            <EditorToolbar
              onProcess={handleProcess}
              onFindOnline={() => setSearchDialogOpen(true)}
              onVoiceInput={() => setVoiceDialogOpen(true)}
              onAudioTranscription={() => setAudioTranscribeDialogOpen(true)}
              isProcessing={processing.isProcessing}
              llmProvider={llmProvider}
              setLLMProvider={setLLMProvider}
              onInstructionsSelect={handleInstructionSelect}
              currentInstructions={messages.filter(msg => msg.role === 'user').pop()?.content || ''}
            />
            
            {/* Text Processing Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Input Editor */}
              <InputEditor
                text={inputText}
                onTextChange={setInputText}
                onFileUpload={handleInputFileUpload}
                onClear={clearInput}
                onCopy={copyToClipboard}
                onDetectAI={(text) => {
                  detectAIText(text, true);
                  return Promise.resolve();
                }}
                isDetecting={isInputDetecting}
                inputFileRef={inputFileRef}
              />
              
              {/* Output Editor */}
              <OutputEditor
                text={outputText}
                onTextChange={setOutputText}
                onClear={clearOutput}
                onCopy={copyToClipboard}
                onExportPDF={exportAsPDF}
                onExportDOCX={exportAsDOCX}
                onDetectAI={(text) => {
                  detectAIText(text, false);
                  return Promise.resolve();
                }}
                onSendEmail={sendEmailWithDocument}
                isDetecting={isOutputDetecting}
                isSendingEmail={isSendingEmail}
                inputText={inputText}
              />
            </div>
            
            {/* Chunk Selector - shown when document is divided into chunks */}
            {showChunkSelector && documentChunks.length > 0 && (
              <ChunkSelector
                chunks={documentChunks}
                onProcessSelected={processSelectedDocumentChunks}
                onCancel={() => setShowChunkSelector(false)}
              />
            )}
            
            {/* Processing Status Bar - shown only when processing */}
            {processing.isProcessing && (
              <ProcessingStatusBar
                currentChunk={processing.currentChunk}
                totalChunks={processing.totalChunks}
                progress={processing.progress}
                onCancel={cancelProcessing}
              />
            )}
            
            {/* Chat Interface */}
            <ChatInterface
              messages={messages}
              onSendMessage={(content) => {
                const newMessage = {
                  id: crypto.randomUUID(),
                  role: 'user' as const,
                  content
                };
                setMessages(prev => [...prev, newMessage]);
                processDocument(content);
              }}
              onClearChat={clearChat}
              reprocessOutput={reprocessOutput}
              onReprocessOutputChange={setReprocessOutput}
            />
          </div>
        </div>
      </main>
      
      <Footer />
      
      {/* Find Online Dialog */}
      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Find Content Online</DialogTitle>
            <DialogDescription>
              Search the web for content to add to your input text.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter search query..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Voice Input Dialog */}
      <Dialog open={voiceDialogOpen} onOpenChange={(open) => {
        if (!open && isRecording) stopRecording();
        setVoiceDialogOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Voice Input</DialogTitle>
            <DialogDescription>
              Record your voice to add text to the input box.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center py-8">
            <div className={`relative w-20 h-20 rounded-full ${isRecording ? 'bg-red-100' : 'bg-slate-100'} flex items-center justify-center mb-4`}>
              <Button 
                className={`w-16 h-16 rounded-full ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'}`}
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <rect x="6" y="6" width="8" height="8" rx="1" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a3 3 0 00-3 3v4a3 3 0 006 0V5a3 3 0 00-3-3zm0 2a1 1 0 011 1v4a1 1 0 11-2 0V5a1 1 0 011-1z" clipRule="evenodd" />
                    <path d="M5 10v1a5 5 0 0010 0v-1h2v1a7 7 0 01-14 0v-1h2z" />
                  </svg>
                )}
              </Button>
            </div>
            <p className="text-sm text-slate-500">
              {isRecording ? 'Recording... Click the button to stop.' : 'Click the button to start recording'}
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoiceDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Audio Transcription Dialog */}
      <Dialog open={audioTranscribeDialogOpen} onOpenChange={setAudioTranscribeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Audio Transcription</DialogTitle>
            <DialogDescription>
              Upload an audio file to transcribe to text.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
              <input
                type="file"
                id="audio-file"
                className="hidden"
                accept="audio/*"
                onChange={handleAudioFileSelected}
                ref={audioRef}
              />
              <Button 
                variant="outline" 
                onClick={() => audioRef.current?.click()}
                className="mb-2"
              >
                Select Audio File
              </Button>
              <p className="text-sm text-slate-500">
                {audioFile ? `Selected: ${audioFile.name}` : 'No file selected'}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAudioTranscribeDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={transcribeSelectedAudio} 
              disabled={!audioFile}
            >
              Transcribe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
