import React, { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Sun01Icon,
  Moon01Icon,
  Logout01Icon,
  UserIcon,
  Notification01Icon,
  Delete02Icon,
  Tick01Icon,
  Building02Icon,
  Clock01Icon,
  Settings02Icon
} from '@hugeicons/core-free-icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAppContext } from '@/context/AppContext';
import { SECTIONS, YEARS } from '@/lib/constants';
import type { SectionID } from '@/lib/constants';
import { toast } from 'react-hot-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocation } from 'react-router-dom';
import { SafeImage } from '@/components/common/SafeImage';

const getPageTitle = (pathname: string, branding: any, brandingError: boolean) => {
  if (pathname.includes('/dashboard')) return 'Dashboard';
  if (pathname.includes('/registration')) return 'Registration';
  if (pathname.includes('/consultation')) return 'Consultation';
  if (pathname.includes('/tests')) return 'Lab Test Results';
  if (pathname.includes('/director')) return 'Director Review';
  if (pathname.includes('/view-patients')) return 'Patient Directory';
  if (pathname.includes('/view-records')) return 'Screening Matrix';
  if (pathname.includes('/patient-report')) return 'Patient Report';
  if (pathname.includes('/account/2fa')) return 'Manage 2FA';
  if (pathname.includes('/account')) return 'Manage Account';
  if (pathname.includes('/messages')) return 'Messaging';
  if (pathname.includes('/ai-integration')) return 'AI Insights & Parameters';
  if (pathname.includes('/branding') || pathname.includes('/system-branding')) return 'Branding & Assets';
  if (pathname.includes('/admin/access-keys')) return 'Security Access Keys';
  if (pathname.includes('/user-management')) return 'User & Account Management';
  if (pathname.includes('/roles-permissions')) return 'Role Configuration';
  if (pathname.includes('/audit-logs')) return 'Security Audit Trails';
  if (pathname.includes('/data-management')) return 'Data Management';
  if (pathname.includes('/system-config')) return 'System Settings';
  if (pathname.includes('/departments')) return 'Clinic Departments';
  if (pathname.includes('/appointments')) return 'Appointment Scheduler';
  if (pathname.includes('/security-analytics')) return 'Security Command Center';
  
  return (branding?.clinic_name && !brandingError) ? branding.clinic_name : 'Legit HealthCare';
};

interface HeaderProps {
  manualTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ manualTitle }) => {
  const { 
    activeSection, setActiveSection, 
    activeYear, setActiveYear,
    user, setUser,
    branding, brandingError,
    socket
  } = useAppContext();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const pageTitle = manualTitle || getPageTitle(location.pathname, branding, brandingError);
  
  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Check if the event was already captured by index.html (global sync)
    if ((window as any).deferredPWAPrompt) {
      setDeferredPrompt((window as any).deferredPWAPrompt);
    }

    // 2. Local listener for standard flow
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // 3. Listener for the custom event dispatched from index.html if captured early
    const handlePromptReady = () => {
      if ((window as any).deferredPWAPrompt) {
        setDeferredPrompt((window as any).deferredPWAPrompt);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.warn("PWA: No deferred prompt available");
      return;
    }
    
    try {
      console.log("PWA: Triggering install prompt...");
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA: User choice result: ${outcome}`);
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        (window as any).deferredPWAPrompt = null;
      }
    } catch (err) {
      console.error("PWA: Call to prompt() failed:", err);
      toast.error("Installation failed or was blocked by the browser.");
    }
  };

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.temp_access || user.temp_access.length === 0) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      // Find soonest expiry
      const upcomingExpiries = user.temp_access
        .map((t: any) => new Date(t.expires_at))
        .filter((d: Date) => d > now)
        .sort((a: Date, b: Date) => a.getTime() - b.getTime());

      if (upcomingExpiries.length === 0) {
        setTimeLeft(null);
        return;
      }

      const diff = upcomingExpiries[0].getTime() - now.getTime();
      const mins = Math.floor(diff / 1000 / 60);
      const secs = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
      
      // If it just expired, we might want to refresh permissions
      if (mins === 0 && secs === 0) {
        window.location.reload(); // Simple way to force re-validation
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (user) {
        fetchNotifications();
        
        // Polling for notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notif: any) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket]);

  const fetchNotifications = async () => {
      if (!user) return;
      try {
          const resp = await axios.get('/api/notifications/', {
              headers: { 'X-User-ID': user.id }
          });
          setNotifications(resp.data.notifications);
          setUnreadCount(resp.data.unread_count);
      } catch (err) {
          console.error("Failed to fetch notifications", err);
      }
  };

  const markAsRead = async (id: number) => {
      if (!user) return;
      try {
          await axios.put(`/api/notifications/${id}/read`, {}, {
              headers: { 'X-User-ID': user.id }
          });
          fetchNotifications();
      } catch (err) {
          console.error("Failed to mark as read", err);
      }
  };

  const markAllAsRead = async () => {
      if (!user) return;
      try {
          await axios.delete(`/api/notifications/delete-all`, {
              headers: { 'X-User-ID': user.id }
          });
          fetchNotifications();
          toast.success("All notifications deleted.");
      } catch (err) {
          console.error("Failed to delete all notifications", err);
          toast.error("Failed to clear notifications.");
      }
  };

  const handleNotificationClick = async (n: any) => {
      if (!n.is_read) {
          await markAsRead(n.id);
      }
      if (n.link) {
          navigate(n.link);
      }
  };

  const handleLogout = async () => {
    if (user) {
        try {
            await axios.post('/api/logout', { 
                user_id: user.id,
                portal: 'staff' 
            });
        } catch (err) {
            console.error("Logout logging failed", err);
        }
    }
    setUser(null);
    navigate('/login');
  };

  return (
    <header className="z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm h-14 no-print shrink-0">
      <div className="flex h-full items-center justify-between px-4 sm:px-6 w-full gap-4">
        
        {/* Left Side: Back Button, Page Title, and Mobile Logo Mark */}
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex h-8 w-8 shrink-0 rounded-full" onClick={() => navigate(-1)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          </Button>
          
          {/* Desktop Title */}
          <div className="hidden sm:flex items-center gap-2 min-w-0 overflow-hidden">
            {brandingError && <HugeiconsIcon icon={Building02Icon} className="h-5 w-5 text-muted-foreground/50 shrink-0" />}
            <h1 className="text-sm sm:text-base md:text-xl font-bold tracking-tight truncate whitespace-nowrap">
              {pageTitle}
            </h1>
          </div>

          {/* Mobile Logo Mark */}
          <div className="flex sm:hidden items-center gap-2 min-w-0">
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
          </div>
        </div>

        {/* Right Side: Options and Auth */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 transition-all duration-300">
          {timeLeft && (
            <div className="hidden sm:flex items-center gap-2 h-9 px-3 border-2 rounded-lg bg-amber-500/5 border-amber-500/20 text-amber-600 font-bold shadow-sm animate-pulse shrink-0 transition-all">
              <HugeiconsIcon icon={Clock01Icon} className="h-4 w-4" />
              <span className="text-[10px] uppercase tracking-wider">
                Expiring in: {timeLeft}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-muted-foreground hidden lg:inline">Section:</span>
            <Select 
              value={activeSection} 
              onValueChange={(val) => setActiveSection(val as SectionID)}
            >
              <SelectTrigger className="w-[64px] sm:w-[90px] h-7 sm:h-9 border-2 font-semibold bg-card px-1 sm:px-2 text-[10px] sm:text-sm">
                <SelectValue placeholder="Sec" />
              </SelectTrigger>
              <SelectContent>
                {SECTIONS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-muted-foreground hidden lg:inline">Year:</span>
            <Select value={activeYear} onValueChange={setActiveYear}>
              <SelectTrigger className="w-[60px] sm:w-[85px] h-7 sm:h-9 border-2 font-semibold bg-card px-1 sm:px-2 text-[10px] sm:text-sm">
                <SelectValue placeholder="Yr" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            {deferredPrompt && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleInstallClick}
                className="hidden sm:flex h-7 w-7 sm:h-9 sm:w-auto rounded-lg border-2 border-primary/20 hover:border-primary/50 gap-0 sm:gap-2 font-black text-[11px] uppercase tracking-wider bg-primary/5 shadow-sm text-primary transition-all active:scale-95 px-0 sm:px-3"
                title="Install App"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                <span className="hidden sm:inline">Install App</span>
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
              <HugeiconsIcon icon={Moon01Icon} className={`absolute h-3 w-3 sm:h-4 sm:w-4 transition-all ${
                resolvedTheme === "dark" 
                  ? "rotate-0 scale-100 opacity-100" 
                  : "rotate-90 scale-0 opacity-0"
              }`} />
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-7 w-7 sm:h-9 sm:w-9 border-2 rounded-lg flex bg-card group relative">
                <HugeiconsIcon icon={Notification01Icon} className="h-3 w-3 sm:h-4 sm:w-4 group-hover:text-primary transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 border border-background"></span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80" sideOffset={8}>
              <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
                <span className="text-xs font-black uppercase tracking-widest text-foreground">System Notifications</span>
                {notifications.length > 0 && (
                  <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        markAllAsRead(); 
                    }} 
                    className="flex items-center gap-1.5 text-[11px] font-bold text-rose-500 hover:text-rose-600 transition-colors group/clear"
                  >
                    Delete All
                    <HugeiconsIcon icon={Delete02Icon} className="h-3 w-3 group-hover/clear:rotate-12 transition-transform" />
                  </button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                    No active notifications.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-3 text-sm border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer relative group/item ${!n.is_read ? 'bg-primary/5' : ''}`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className={`font-semibold ${!n.is_read ? 'text-primary' : 'text-foreground'}`}>{n.title}</div>
                        {!n.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(n.id);
                            }}
                            className="p-1 rounded-md hover:bg-primary/10 text-primary opacity-0 group-hover/item:opacity-100 transition-all"
                            title="Mark as Read"
                          >
                            <HugeiconsIcon icon={Tick01Icon} className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="text-muted-foreground text-xs mt-1">{n.message}</div>
                      <div className="text-[10px] text-muted-foreground mt-2 opacity-70">
                        {new Date(n.created_at).toLocaleDateString()} at {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-7 sm:h-9 w-auto px-1 sm:px-2 border-2 rounded-lg bg-primary/5 hover:border-primary/50 transition-all flex items-center gap-1 sm:gap-2 group">
                <div className="p-0.5 sm:p-1 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <HugeiconsIcon icon={UserIcon} className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </div>
                {user && (
                  <span className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors hidden md:inline-block pr-1 text-nowrap">
                    {user.first_name}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-0.5">
                  <span className="text-sm font-bold text-foreground truncate">
                    {user ? `${user.first_name} ${user.last_name}` : 'My Account'}
                  </span>
                  {user?.role && (
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                      {user.role}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/account')}>
                <HugeiconsIcon icon={Settings02Icon} className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" /> Manage Account
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive cursor-pointer"
                onClick={handleLogout}
              >
                <HugeiconsIcon icon={Logout01Icon} className="mr-2 h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
