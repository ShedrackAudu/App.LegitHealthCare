import toast, { Toaster, resolveValue } from 'react-hot-toast';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, AlertCircleIcon, Loading03Icon, InformationCircleIcon, Comment01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';

export const CustomToaster = () => {
  return (
    <Toaster 
        position="top-right" 
        containerStyle={{ top: '1mm', right: 0, padding: 0 }}
        toastOptions={{
            duration: 5000,
        }}
    >
      {(t) => {
        const isMessage = t.id.startsWith('message_');
        return (
          <div
            className={`${
              t.visible ? 'animate-in fade-in slide-in-from-right-full duration-500' : 'animate-out fade-out slide-out-to-right duration-500'
            } relative max-w-sm w-full border-2 rounded-xl pointer-events-auto flex overflow-hidden group transition-all duration-300 hover:scale-[1.01] ${
                t.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500/40 shadow-lg shadow-emerald-500/5' : 
                t.type === 'error' ? 'bg-rose-50 dark:bg-rose-950 border-rose-500/40 shadow-lg shadow-rose-500/5' : 
                isMessage ? 'bg-background/60 backdrop-blur-2xl hover:bg-background/80 border-primary/20 cursor-pointer shadow-lg shadow-primary/5' :
                'bg-background/60 backdrop-blur-2xl hover:bg-background/80 border-border'
            }`}
            style={{
              animationFillMode: 'forwards'
            }}
            onClick={() => {
              if (isMessage) {
                toast.dismiss(t.id);
                window.location.href = '/messaging';
              }
            }}
          >
            {/* Progress Bar Accent - Depleting Timer */}
            <div className={`absolute bottom-0 left-0 h-0.5 ${
                t.type === 'success' ? 'bg-emerald-500' : 
                t.type === 'error' ? 'bg-rose-500' : 
                'bg-primary'
            }`} style={{ 
                width: '0%',
                animation: t.visible ? 'progress-deplete 5000ms linear forwards' : 'none',
            }} />

            <style>{`
              @keyframes progress-deplete {
                  from { width: 100%; }
                  to { width: 0%; }
              }
            `}</style>

            <div className="flex-1 w-0 p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-transform duration-500 ${
                      t.type === 'success' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 
                      t.type === 'error' ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' : 
                      'bg-primary/10 text-primary'
                  }`}>
                      {t.type === 'success' && <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-5 w-5" />}
                      {t.type === 'error' && <HugeiconsIcon icon={AlertCircleIcon} className="h-5 w-5" />}
                      {t.type === 'loading' && <HugeiconsIcon icon={Loading03Icon} className="h-5 w-5 animate-spin" />}
                      {t.type === 'blank' && !isMessage && <HugeiconsIcon icon={InformationCircleIcon} className="h-5 w-5" />}
                      {isMessage && <HugeiconsIcon icon={Comment01Icon} className="h-5 w-5" />}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-foreground leading-tight">
                    {resolveValue(t.message, t)}
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`flex border-l ${
                t.type === 'success' ? 'border-emerald-500/10 dark:border-emerald-500/20' :
                t.type === 'error' ? 'border-rose-500/10 dark:border-rose-500/20' :
                'border-border/50'
            }`}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toast.dismiss(t.id);
                }}
                className="w-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus:outline-none group/close"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4 transition-transform group-hover/close:rotate-90" />
              </button>
            </div>
          </div>
        );
      }}
    </Toaster>
  );
};
