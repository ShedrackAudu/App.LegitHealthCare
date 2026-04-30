import React, { useState, useEffect, useCallback } from 'react';
import { Sun, Moon, LogOut, User, Bell, Download } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
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
  const { user, setUser } = useAppContext();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);
  const [profileName, setProfileName] = useState<string | null>(null);

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
    navigate('/login?portal=patient');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm h-14 border-l no-print">
      <div className="flex h-full items-center justify-between px-4 sm:px-6 w-full gap-4">
        
        {/* Left Side: Back Button, Page Title */}
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-full" onClick={() => navigate(-1)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          </Button>
          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <h1 className="text-sm sm:text-base md:text-xl font-bold tracking-tight truncate whitespace-nowrap">
              {pageTitle}
            </h1>
          </div>
        </div>

        {/* Right Side: Install, Theme, Notifications, Profile */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0 px-4">
          {deferredPrompt && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleInstallClick}
              className="hidden sm:flex h-9 w-auto rounded-lg border-2 border-primary/20 hover:border-primary/50 gap-2 font-black text-[11px] uppercase tracking-wider bg-primary/5 shadow-sm text-primary transition-all active:scale-95 px-3"
              title="Install App"
            >
              <Download className="h-3.5 w-3.5" />
              Install App
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 border-2 rounded-lg bg-card"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className={`h-[1.2rem] w-[1.2rem] transition-all ${
              resolvedTheme === "dark" 
                ? "-rotate-90 scale-0 opacity-0" 
                : "rotate-0 scale-100 opacity-100"
            }`} />
            <Moon className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${
              resolvedTheme === "dark" 
                ? "rotate-0 scale-100 opacity-100" 
                : "rotate-90 scale-0 opacity-0"
            }`} />
          </Button>

          <Button variant="outline" size="icon" className="h-9 w-9 border-2 rounded-lg bg-card group">
            <Bell className="h-4 w-4 group-hover:text-primary transition-colors" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 w-auto px-2 border-2 rounded-lg ml-1 bg-primary/5 hover:border-primary/50 transition-all flex items-center gap-2 group">
                <div className="p-1 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <User className="h-4 w-4 text-primary" />
                </div>
                {user && (
                    <span className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors hidden md:inline-block pr-1">
                        {profileName || user.first_name}
                    </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/patient/account')}>
                <User className="mr-2 h-4 w-4" /> Manage Account
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
