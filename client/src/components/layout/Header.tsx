import { LLMProvider } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Settings, Menu, BookOpen } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';

interface HeaderProps {
  llmProvider: LLMProvider;
  onLLMProviderChange: (provider: LLMProvider) => void;
}

export function Header({ llmProvider, onLLMProviderChange }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <BookOpen className="text-2xl text-primary" size={24} />
          <h1 className="text-xl font-semibold">EZ Reader</h1>
        </div>
        <div className="flex items-center space-x-3">
          <div className="hidden md:flex items-center">
            <span className="text-sm text-slate-500">Powered by</span>
            {/* LLM Provider Selector */}
            <div className="relative ml-2">
              <Select
                value={llmProvider}
                onValueChange={(value) => onLLMProviderChange(value as LLMProvider)}
              >
                <SelectTrigger className="appearance-none bg-white border border-slate-200 rounded-md py-1 pl-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-primary h-auto min-w-[120px]">
                  <SelectValue placeholder="Select LLM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="perplexity">Perplexity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            variant="outline"
            className="hidden md:flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-md text-sm font-medium transition-colors border-0"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Button>
          
          {/* Mobile menu trigger */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                className="flex md:hidden text-slate-700 p-1 h-auto"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Settings</SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">LLM Provider</h3>
                  <RadioGroup 
                    defaultValue={llmProvider}
                    onValueChange={(value) => {
                      onLLMProviderChange(value as LLMProvider);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="openai" id="openai" />
                      <Label htmlFor="openai">OpenAI</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="anthropic" id="anthropic" />
                      <Label htmlFor="anthropic">Anthropic</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="perplexity" id="perplexity" />
                      <Label htmlFor="perplexity">Perplexity</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">General Settings</h3>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-save">Auto-save documents</Label>
                    <Switch id="auto-save" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="dark-mode">Dark mode</Label>
                    <Switch id="dark-mode" />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
