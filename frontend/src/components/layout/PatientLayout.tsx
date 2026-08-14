import React from 'react';
import { PatientHeader } from './PatientHeader';
import { PatientSidebar } from './PatientSidebar';

export const PatientLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative h-full bg-background flex transition-colors duration-500 overflow-hidden print:h-auto print:overflow-visible">
      {/* Ambient Aura Background Glow */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden print:hidden">
        <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-primary/[0.035] dark:bg-primary/[0.05] blur-[120px]" />
        <div className="absolute top-[40%] -left-[10%] w-[500px] h-[500px] rounded-full bg-teal-500/[0.025] dark:bg-teal-500/[0.04] blur-[100px]" />
        <div className="absolute -bottom-[20%] right-[20%] w-[550px] h-[550px] rounded-full bg-blue-500/[0.02] dark:bg-blue-500/[0.03] blur-[110px]" />
      </div>

      <PatientSidebar />
      <div className="relative z-10 flex flex-col flex-1 overflow-hidden print:overflow-visible">
        <PatientHeader />
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 bg-muted/20 dark:bg-background/80 custom-scrollbar print:p-0 print:overflow-visible">
          <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 print:max-w-none print:m-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
