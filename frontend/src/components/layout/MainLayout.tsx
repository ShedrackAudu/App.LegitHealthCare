import React, { useEffect, useRef, useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import axios from 'axios';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Alert01Icon,
  InformationCircleIcon,
  Shield01Icon,
  PinIcon,
  CheckmarkCircle01Icon,
  Settings02Icon,
  ArrowRight01Icon,
  ViewIcon
} from '@hugeicons/core-free-icons';

const TickerBanner: React.FC<{ message: string; icon: string }> = ({ message, icon }) => {
  const getIcon = () => {
    switch (icon) {
      case 'warning':
        return <HugeiconsIcon icon={Alert01Icon} className="h-3 w-3" />;
      case 'alert':
        return <HugeiconsIcon icon={Shield01Icon} className="h-3 w-3" />;
      case 'success':
        return <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-3 w-3" />;
      case 'pin':
        return <HugeiconsIcon icon={PinIcon} className="h-3 w-3" />;
      default:
        return <HugeiconsIcon icon={InformationCircleIcon} className="h-3 w-3" />;
    }
  };

  const getColors = () => {
    switch (icon) {
      case 'warning':
        return 'bg-amber-600 border-amber-700 text-white';
      case 'alert':
        return 'bg-rose-600 border-rose-700 text-white';
      case 'success':
        return 'bg-emerald-600 border-emerald-700 text-white';
      case 'pin':
        return 'bg-blue-600 border-blue-700 text-white';
      default:
        return 'bg-primary border-primary/80 text-primary-foreground';
    }
  };

  return (
    <>
      <style>{`
        @keyframes ticker {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        .animate-ticker {
          display: inline-flex;
          white-space: nowrap;
          animation: ticker 40s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className={`w-full ${getColors()} border-b px-3 py-1 flex items-center justify-between text-xs font-semibold shadow-xs select-none relative overflow-hidden z-20 shrink-0`}>
        <div className="flex items-center gap-2 mr-3 font-bold uppercase tracking-wider text-[10px] bg-black/20 dark:bg-white/20 px-2 py-0.5 rounded-full shrink-0">
          {getIcon()}
          <span>Notice</span>
        </div>
        <div className="flex-1 overflow-hidden relative mask-linear-fade">
          <div className="animate-ticker">
            <span className="inline-block px-4 font-medium tracking-wide">
              {message}
            </span>
            <span className="inline-block px-4 font-medium tracking-wide" aria-hidden="true">
              {message}
            </span>
            <span className="inline-block px-4 font-medium tracking-wide" aria-hidden="true">
              {message}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

const AdminMaintenanceBanner: React.FC = () => {
  return (
    <div className="relative z-30 w-full bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/15 dark:from-amber-950/50 dark:via-amber-900/35 dark:to-orange-950/50 backdrop-blur-xl border-b border-amber-500/30 dark:border-amber-500/25 px-3.5 sm:px-6 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-xs shrink-0 select-none animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          Maintenance Active
        </span>
        <span className="text-xs font-semibold text-amber-950 dark:text-amber-100/90 leading-tight">
          Public & patient portals are locked &mdash; visitors are viewing the scheduled maintenance notice.
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <a
          href="/maintenance"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-900 dark:text-amber-300/90 hover:text-amber-950 dark:hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 transition-all shadow-2xs active:scale-[0.98]"
        >
          <HugeiconsIcon icon={ViewIcon} className="w-3.5 h-3.5" />
          <span>Preview Visitor View</span>
        </a>
        <a
          href="/system-config"
          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider text-amber-950 dark:text-zinc-950 bg-amber-400 hover:bg-amber-300 dark:bg-amber-400 dark:hover:bg-amber-300 transition-all shadow-2xs shadow-amber-500/20 active:scale-[0.98]"
        >
          <HugeiconsIcon icon={Settings02Icon} className="w-3.5 h-3.5" />
          <span>Settings</span>
          <HugeiconsIcon icon={ArrowRight01Icon} className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

export const MainLayout: React.FC<{ children: React.ReactNode; title?: string; noScroll?: boolean }> = ({ children, title, noScroll = false }) => {
  const mainRef = useRef<HTMLElement>(null);
  const [ticker, setTicker] = useState<{ message: string; icon: string; enabled: boolean } | null>(null);
  const [maintenanceActive, setMaintenanceActive] = useState(false);

  const fetchTicker = async () => {
    try {
      const response = await axios.get('/api/config/ticker');
      setTicker(response.data);
    } catch (err) {
      console.error("Failed to fetch announcement ticker", err);
    }
  };

  const fetchMaintenance = async () => {
    try {
      const res = await axios.get('/api/config/maintenance');
      setMaintenanceActive(res.data.enabled === true);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (noScroll && mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [noScroll]);

  useEffect(() => {
    fetchTicker();
    fetchMaintenance();
    
    window.addEventListener('tickerUpdate', fetchTicker);
    window.addEventListener('maintenanceUpdate', fetchMaintenance);
    return () => {
      window.removeEventListener('tickerUpdate', fetchTicker);
      window.removeEventListener('maintenanceUpdate', fetchMaintenance);
    };
  }, []);

  const hasTicker = ticker && ticker.enabled && ticker.message.trim();

  return (
    <div className="relative flex flex-col h-full w-full bg-background transition-colors duration-500 overflow-hidden print:h-auto print:overflow-visible">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden print:hidden">
        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-primary/[0.035] dark:bg-primary/[0.05] blur-[120px]" />
        <div className="absolute top-[40%] -left-[10%] w-[500px] h-[500px] rounded-full bg-teal-500/[0.025] dark:bg-teal-500/[0.04] blur-[100px]" />
        <div className="absolute -bottom-[20%] right-[20%] w-[550px] h-[550px] rounded-full bg-blue-500/[0.02] dark:bg-blue-500/[0.03] blur-[110px]" />
      </div>

      {maintenanceActive && <AdminMaintenanceBanner />}

      {hasTicker && (
        <TickerBanner message={ticker.message} icon={ticker.icon} />
      )}
      <div className="relative z-10 flex flex-1 overflow-hidden print:overflow-visible">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden print:overflow-visible">
          <Header manualTitle={title} />
          <main ref={mainRef} className={`flex-1 ${noScroll ? 'overflow-hidden flex flex-col min-h-0' : 'overflow-y-auto'} p-4 sm:p-6 lg:p-8 bg-muted/20 dark:bg-background/80 custom-scrollbar print:p-0 print:overflow-visible`}>
            <div className={`max-w-[1600px] w-full mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 print:max-w-none print:m-0 ${noScroll ? 'flex-1 flex flex-col overflow-hidden min-h-0 h-full' : ''}`}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
