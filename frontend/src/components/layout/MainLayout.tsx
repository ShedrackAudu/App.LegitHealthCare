import React, { useEffect, useRef } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const MainLayout: React.FC<{ children: React.ReactNode; title?: string; noScroll?: boolean }> = ({ children, title, noScroll = false }) => {
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (noScroll && mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [noScroll]);

  return (
    <div className="h-screen bg-background flex transition-colors duration-500 overflow-hidden print:h-auto print:overflow-visible">
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
  );
};
