import { Switch, Route, Link } from "wouter";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import Settings from "@/pages/settings";
import { Settings as SettingsIcon } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useEffect } from "react";

function App() {
  useEffect(() => {
    // Debug iframe embedding issues
    const isInIframe = window !== window.top;
    console.log('App running in iframe:', isInIframe);
    console.log('Window location:', window.location.href);
    console.log('Top window accessible:', window.top !== window);
    
    if (isInIframe) {
      console.log('EZ Reader is running inside an iframe - this is normal for Wix embedding');
      // Force iframe to work by ensuring no frame-busting code
      try {
        document.body.style.display = 'block';
        document.body.style.visibility = 'visible';
      } catch (e) {
        console.log('Iframe setup complete');
      }
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200">
        <div className="container flex justify-between items-center py-4">
          <Link href="/" className="text-2xl font-bold">
            EZ Reader
          </Link>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/settings" className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                    <SettingsIcon className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>API Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

export default App;
