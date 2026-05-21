import toast, { Toaster, resolveValue } from 'react-hot-toast';
import { CheckCircle2, AlertCircle, Info, X, Loader2 } from 'lucide-react';

export const CustomToaster = () => {
  return (
    <Toaster 
        position="top-right" 
        containerStyle={{ top: '1mm', right: 0, padding: 0 }}
        toastOptions={{
            duration: 5000,
        }}
    >
      {(t) => (
        <div
          className={`${
            t.visible ? 'animate-in fade-in slide-in-from-right-full duration-500' : 'animate-out fade-out slide-out-to-right duration-500'
          } relative max-w-sm w-full bg-background/60 backdrop-blur-2xl border-2 rounded-2xl pointer-events-auto flex overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:bg-background/80 ${
              t.type === 'success' ? 'border-emerald-500/20' : 
              t.type === 'error' ? 'border-rose-500/20' : 
              'border-border'
          }`}
        >
          {/* Progress Bar Accent - Depleting Timer */}
          <div className={`absolute bottom-0 left-0 h-1 ${
              t.type === 'success' ? 'bg-emerald-500' : 
              t.type === 'error' ? 'bg-rose-500' : 
              'bg-primary'
          }`} style={{ 
              width: '100%',
              animation: t.visible ? 'progress-deplete 5000ms linear forwards' : 'none',
          }} />

          <style>{`
            @keyframes progress-deplete {
                from { width: 100%; }
                to { width: 0%; }
            }
          `}</style>

          <div className="flex-1 w-0 p-5">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-500 group-hover:rotate-12 ${
                    t.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 
                    t.type === 'error' ? 'bg-rose-500/10 text-rose-500' : 
                    'bg-primary/10 text-primary'
                }`}>
                    {t.type === 'success' && <CheckCircle2 className="h-6 w-6" />}
                    {t.type === 'error' && <AlertCircle className="h-6 w-6" />}
                    {t.type === 'loading' && <Loader2 className="h-6 w-6 animate-spin" />}
                    {t.type === 'blank' && <Info className="h-6 w-6" />}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-1">
                  {t.type === 'success' ? 'System Success' : t.type === 'error' ? 'System Alert' : 'System Message'}
                </p>
                <p className="text-[13px] font-bold text-foreground leading-tight">
                  {resolveValue(t.message, t)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex border-l border-border/50">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-14 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus:outline-none group/close"
            >
              <X className="h-5 w-5 transition-transform group-hover/close:rotate-90" />
            </button>
          </div>
        </div>
      )}
    </Toaster>
  );
};
