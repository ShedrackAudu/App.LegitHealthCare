import { useState, useEffect, useRef } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

type BannerState = 'hidden' | 'offline' | 'back-online';

const NetworkStatusBanner = () => {
  const [state, setState] = useState<BannerState>('hidden');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether the component has mounted and the user was online at mount.
  // We avoid flashing the banner on first load if the user is already online.
  const hasBeenOffline = useRef(false);

  useEffect(() => {
    const handleOffline = () => {
      hasBeenOffline.current = true;
      // Clear any pending "back online" hide timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setState('offline');
    };

    const handleOnline = () => {
      // Only show "back online" if the user was previously offline
      if (!hasBeenOffline.current) return;

      setState('back-online');
      // Auto-hide after 3 seconds
      timeoutRef.current = setTimeout(() => {
        setState('hidden');
        timeoutRef.current = null;
      }, 3000);
    };

    // Check initial state
    if (!navigator.onLine) {
      handleOffline();
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);


  const isOffline = state === 'offline';

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-[9999]
        transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${state === 'hidden' ? '-translate-y-full' : 'translate-y-0'}
      `}
      role="alert"
      aria-live="assertive"
    >
      <div
        className={`
          flex items-center justify-center gap-2.5 px-4 py-2.5
          text-sm font-semibold text-white
          transition-colors duration-300
          ${isOffline
            ? 'bg-zinc-800 dark:bg-zinc-900'
            : 'bg-emerald-600 dark:bg-emerald-700'
          }
        `}
      >
        {isOffline ? (
          <>
            <WifiOff className="h-4 w-4 shrink-0 animate-pulse" />
            <span>You are offline. Check your internet connection.</span>
          </>
        ) : (
          <>
            <Wifi className="h-4 w-4 shrink-0" />
            <span>You're back online!</span>
          </>
        )}
      </div>
    </div>
  );
};

export default NetworkStatusBanner;
