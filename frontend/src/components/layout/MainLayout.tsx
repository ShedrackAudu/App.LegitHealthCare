import React, { useEffect, useRef, useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import axios from 'axios';
import { AlertTriangle, Info, ShieldAlert, Pin, CheckCircle2 } from 'lucide-react';

const TickerBanner: React.FC<{ message: string; icon: string }> = ({ message, icon }) => {
  const getIcon = () => {
    switch (icon) {
      case 'warning':
        return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 animate-pulse shrink-0" />;
      case 'alert':
        return <ShieldAlert className="h-3.5 w-3.5 text-rose-500 animate-bounce shrink-0" />;
      case 'success':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
      case 'pin':
        return <Pin className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
      default:
        return <Info className="h-3.5 w-3.5 text-primary animate-pulse shrink-0" />;
    }
  };

  const getColors = () => {
    switch (icon) {
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200';
      case 'alert':
        return 'bg-rose-500/10 border-rose-500/20 text-rose-900 dark:text-rose-200';
      case 'success':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200';
      case 'pin':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-900 dark:text-blue-200';
      default:
        return 'bg-primary/10 border-primary/20 text-primary-900 dark:text-primary-200';
    }
  };

  return (
    <>
      <style>{`
        @keyframes marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-100%, 0, 0); }
        }
        .animate-marquee {
          display: inline-block;
          padding-left: 100%;
          animation: marquee 25s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className={`w-full py-0.5 px-4 border-b flex items-center justify-between text-xs font-bold gap-3 z-[1000] relative overflow-hidden backdrop-blur-md transition-all duration-300 ${getColors()}`}>
        <div className="flex items-center gap-1.5 shrink-0 bg-background/50 px-1.5 py-0 rounded border border-muted-foreground/10 z-10 backdrop-blur-sm">
          {getIcon()}
          <span className="uppercase tracking-widest text-[9px] font-black opacity-80">Announcement:</span>
        </div>
        <div className="flex-1 overflow-hidden relative w-full flex items-center h-full">
          <div className="inline-block whitespace-nowrap animate-marquee cursor-default text-[11px]">
            {message}
          </div>
        </div>
      </div>
    </>
  );
};

export const MainLayout: React.FC<{ children: React.ReactNode; title?: string; noScroll?: boolean }> = ({ children, title, noScroll = false }) => {
  const mainRef = useRef<HTMLElement>(null);
  const [ticker, setTicker] = useState<{ message: string; icon: string; enabled: boolean } | null>(null);

  const fetchTicker = async () => {
    try {
      const response = await axios.get('/api/config/ticker');
      setTicker(response.data);
    } catch (err) {
      console.error("Failed to fetch announcement ticker", err);
    }
  };

  useEffect(() => {
    if (noScroll && mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [noScroll]);

  useEffect(() => {
    fetchTicker();
    
    // Listen for custom update events (from SystemConfigPage.tsx)
    window.addEventListener('tickerUpdate', fetchTicker);
    return () => {
      window.removeEventListener('tickerUpdate', fetchTicker);
    };
  }, []);

  const hasTicker = ticker && ticker.enabled && ticker.message.trim();

  return (
    <div className="flex flex-col h-screen w-screen bg-background transition-colors duration-500 overflow-hidden print:h-auto print:overflow-visible">
      {hasTicker && (
        <TickerBanner message={ticker.message} icon={ticker.icon} />
      )}
      <div className="flex flex-1 overflow-hidden print:overflow-visible">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden print:overflow-visible">
          <Header manualTitle={title} />
          <main ref={mainRef} className={`flex-1 ${noScroll ? 'overflow-hidden flex flex-col min-h-0' : 'overflow-y-auto'} p-4 sm:p-6 lg:p-8 bg-muted/30 dark:bg-background custom-scrollbar print:p-0 print:overflow-visible`}>
            <div className={`max-w-[1600px] w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 print:max-w-none print:m-0 ${noScroll ? 'flex-1 flex flex-col overflow-hidden min-h-0 h-full' : ''}`}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
