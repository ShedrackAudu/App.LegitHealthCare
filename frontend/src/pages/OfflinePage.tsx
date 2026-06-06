import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { WifiOff01Icon, ReloadIcon, Home01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';

const OfflinePage: React.FC = () => {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-primary/10 rounded-full scale-150 animate-pulse" />
        <div className="relative bg-card p-8 rounded-[2.5rem] shadow-2xl border-4 border-primary/10">
          <HugeiconsIcon icon={WifiOff01Icon} className="w-20 h-20 text-primary" />
        </div>
      </div>

      <h1 className="text-4xl font-black tracking-tight mb-4 text-foreground">
        Connection Lost
      </h1>
      
      <p className="text-muted-foreground max-w-md mb-12 font-medium leading-relaxed">
        We couldn't connect to the Legit HealthCare network. 
        Please check your internet connection and try again.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <Button 
          onClick={handleRetry}
          className="h-14 rounded-2xl font-bold flex-1 gap-2 shadow-xl shadow-primary/20 hover:scale-105 transition-all text-lg"
        >
          <HugeiconsIcon icon={ReloadIcon} className="w-5 h-5 animate-spin-slow" />
          Retry Connection
        </Button>
        <Button 
          variant="outline"
          onClick={() => window.location.href = '/'}
          className="h-14 rounded-2xl font-bold flex-1 gap-2 border-2 text-lg"
        >
          <HugeiconsIcon icon={Home01Icon} className="w-5 h-5" />
          Go Home
        </Button>
      </div>

      <div className="mt-16 pt-8 border-t w-full max-w-xs">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-50">
          Legit HealthCare Mobile Sync
        </p>
      </div>
    </div>
  );
};

export default OfflinePage;
