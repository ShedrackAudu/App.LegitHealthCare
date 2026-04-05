import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="h-screen bg-background flex transition-colors duration-500 overflow-hidden print:h-auto print:overflow-visible">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden print:overflow-visible">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-muted/30 custom-scrollbar print:p-0 print:overflow-visible">
          <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 print:max-w-none print:m-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
