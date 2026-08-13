import React, { useState, useEffect, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Sun01Icon,
  Moon02Icon,
  Logout02Icon,
  UserIcon,
  Notification01Icon,
  Download01Icon,
  AccountSetting01Icon,
  Building02Icon
} from '@hugeicons/core-free-icons';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { SafeImage } from '@/components/common/SafeImage';
import axios from 'axios';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const getPageTitle = (pathname: string) => {
  if (pathname.includes('/patient/dashboard')) return 'Dashboard';
  if (pathname.includes('/patient/records')) return 'My Medical Records';
  if (pathname.includes('/patient/account/2fa')) return 'Security Settings';
  if (pathname.includes('/patient/account')) return 'Account Settings';
  return 'Patient Portal';
};

export const PatientHeader: React.FC = () => {
  const { user, setUser, branding } = useAppContext();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileFullName, setProfileFullName] = useState<string | null>(null);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) return;

    if ((window as any).deferredPWAPrompt) {
      setDeferredPrompt((window as any).deferredPWAPrompt);
    }

    const handleBeforeInstall = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    const handlePromptReady = () => { if ((window as any).deferredPWAPrompt) setDeferredPrompt((window as any).deferredPWAPrompt); };
    const handleInstalled = () => { setDeferredPrompt(null); (window as any).deferredPWAPrompt = null; };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') { setDeferredPrompt(null); (window as any).deferredPWAPrompt = null; }
    } catch (err) { console.error('PWA install failed:', err); }
  };

  const fetchName = useCallback(async () => {
    if (!user?.username) return;
    try {
      const response = await axios.get('/api/patient/profile', {
        headers: { 'X-Staff-ID': user.username }
      });
      setProfileName(response.data.first_name);
      if (response.data.first_name) {
        setProfileFullName(`${response.data.first_name} ${response.data.last_name || ''}`.trim());
      }
    } catch (err) {
      console.error("Header name fetch failed:", err);
    }
  }, [user?.username]);

  useEffect(() => {
    fetchName();
  }, [fetchName]);

  const handleLogout = async () => {
    if (user) {
        try {
            await axios.post('/api/logout', { 
                user_id: user.id,
                portal: 'patient' 
            });
        } catch (err) {
            console.error("Logout logging failed", err);
        }
    }
    setUser(null);
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm h-14 border-l no-print">
      <div className="flex h-full items-center justify-between px-4 sm:px-6 w-full gap-4">
        
        {/* Left Side: Back Button, Page Title, and Mobile Logo Mark */}
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex h-8 w-8 shrink-0 rounded-full" onClick={() => navigate(-1)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          </Button>
          
          {/* Desktop Title */}
          <div className="hidden sm:flex items-center gap-2 min-w-0 overflow-hidden">
            <h1 className="text-sm sm:text-base md:text-xl font-bold tracking-tight truncate whitespace-nowrap">
              {pageTitle}
            </h1>
          </div>

          {/* Mobile Logo Mark */}
          <Link to="/" className="flex sm:hidden items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
            {branding?.logo_light ? (
              <SafeImage 
                src={`${(window as any).API_BASE_URL}${branding.logo_light}`} 
                alt={branding?.clinic_name || "Logo"} 
                className="max-h-8 w-auto object-contain" 
                fallbackText={branding?.clinic_name || 'LEGIT HC'}
              />
            ) : (
              <div className="text-primary font-bold text-sm truncate flex items-center gap-1.5">
                <HugeiconsIcon icon={Building02Icon} className="h-4.5 w-4.5 text-primary shrink-0" />
                <span className="truncate max-w-[120px]">{branding?.clinic_name || 'LEGIT HC'}</span>
              </div>
            )}
          </Link>
        </div>

        {/* Right Side: Install, Theme, Notifications, Profile */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto transition-all duration-300">
          {deferredPrompt && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleInstallClick}
              className="hidden sm:flex h-9 w-auto rounded-lg border-2 border-primary/20 hover:border-primary/50 gap-2 font-black text-[11px] uppercase tracking-wider bg-primary/5 shadow-sm text-primary transition-all active:scale-95 px-3"
              title="Install App"
            >
              <HugeiconsIcon icon={Download01Icon} className="h-3.5 w-3.5" />
              Install App
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 sm:h-9 sm:w-9 border-2 rounded-lg bg-card"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            <label className="sr-only">Toggle theme</label>
            <HugeiconsIcon icon={Sun01Icon} className={`h-3 w-3 sm:h-4 sm:w-4 transition-all ${
              resolvedTheme === "dark" 
                ? "-rotate-90 scale-0 opacity-0" 
                : "rotate-0 scale-100 opacity-100"
            }`} />
            <HugeiconsIcon icon={Moon02Icon} className={`absolute h-3 w-3 sm:h-4 sm:w-4 transition-all ${
              resolvedTheme === "dark" 
                ? "rotate-0 scale-100 opacity-100" 
                : "rotate-90 scale-0 opacity-0"
            }`} />
          </Button>

          <Button variant="outline" size="icon" className="h-7 w-7 sm:h-9 sm:w-9 border-2 rounded-lg bg-card group">
            <HugeiconsIcon icon={Notification01Icon} className="h-3 w-3 sm:h-4 sm:w-4 group-hover:text-primary transition-colors" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-7 sm:h-9 w-auto px-1 sm:px-2 border-2 rounded-lg bg-primary/5 hover:border-primary/50 transition-all flex items-center gap-1 sm:gap-2 group">
                <div className="p-0.5 sm:p-1 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <HugeiconsIcon icon={UserIcon} className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </div>
                {user && (
                    <span className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors hidden md:inline-block pr-1">
                        {profileName || user.first_name}
                    </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-0.5">
                  <span className="text-sm font-bold text-foreground truncate flex items-center gap-2">
                    <HugeiconsIcon icon={UserIcon} className="h-4 w-4 text-muted-foreground" />
                    {profileFullName || (user ? `${user.first_name} ${user.last_name || ''}`.trim() : 'My Account')}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                    Patient
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/patient/account')}>
                <HugeiconsIcon icon={AccountSetting01Icon} className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" /> Manage Account
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive cursor-pointer"
                onClick={handleLogout}
              >
                <HugeiconsIcon icon={Logout02Icon} className="mr-2 h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
