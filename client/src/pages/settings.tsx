import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [perplexityKey, setPerplexityKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const saveApiKeys = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/update-api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          openaiKey: openaiKey || undefined,
          anthropicKey: anthropicKey || undefined,
          perplexityKey: perplexityKey || undefined,
        }),
      });

      if (response.ok) {
        toast({
          title: 'API Keys Updated',
          description: 'Your API keys have been saved successfully.',
        });
        // Clear the form fields for security
        setOpenaiKey('');
        setAnthropicKey('');
        setPerplexityKey('');
        // Reload the page to apply new environment variables
        window.location.reload();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to update API keys.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Configure your API keys for different LLM providers. 
            These keys are stored securely as environment variables.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="openai-key">OpenAI API Key</Label>
              <Input
                id="openai-key"
                type="password"
                placeholder="sk-..."
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                autoComplete="off"
              />
              <p className="text-sm text-slate-500">
                Get your API key from {' '}
                <a 
                  href="https://platform.openai.com/account/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  OpenAI Dashboard
                </a>
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="anthropic-key">Anthropic API Key</Label>
              <Input
                id="anthropic-key"
                type="password"
                placeholder="sk-ant-..."
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                autoComplete="off"
              />
              <p className="text-sm text-slate-500">
                Get your API key from {' '}
                <a 
                  href="https://console.anthropic.com/settings/keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Anthropic Console
                </a>
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="perplexity-key">Perplexity API Key</Label>
              <Input
                id="perplexity-key"
                type="password"
                placeholder="pplx-..."
                value={perplexityKey}
                onChange={(e) => setPerplexityKey(e.target.value)}
                autoComplete="off"
              />
              <p className="text-sm text-slate-500">
                Get your API key from {' '}
                <a 
                  href="https://www.perplexity.ai/settings/api" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Perplexity API Settings
                </a>
              </p>
            </div>
            
            <Button 
              onClick={saveApiKeys} 
              disabled={isSaving}
              className="w-full md:w-auto"
            >
              {isSaving ? 'Saving...' : 'Save API Keys'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}