import React from 'react';
import { PatientHeader } from './PatientHeader';
import { PatientSidebar } from './PatientSidebar';

export const PatientLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="h-screen bg-background flex transition-colors duration-500 overflow-hidden">
      <PatientSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <PatientHeader />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-muted/30 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
