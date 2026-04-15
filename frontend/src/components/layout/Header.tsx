import React, { useState, useEffect } from 'react';
import { Sun, Moon, LogOut, User, Bell, Trash2, Check, Building2, Clock } from 'lucide-react';
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
  
  return (branding?.clinic_name && !brandingError) ? branding.clinic_name : 'Legit HealthCare';
};

export const Header: React.FC = () => {
  const { 
    activeSection, setActiveSection, 
    activeYear, setActiveYear,
    user, setUser,
    branding, brandingError
  } = useAppContext();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname, branding, brandingError);

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
    navigate('/login?portal=staff');
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
            {brandingError && <Building2 className="h-5 w-5 text-muted-foreground/50 shrink-0" />}
            <h1 className="text-sm sm:text-base md:text-xl font-bold tracking-tight truncate whitespace-nowrap">
              {pageTitle}
            </h1>
          </div>
        </div>

        {/* Right Side: Options and Auth */}
        <div className="flex items-center gap-0.5 sm:gap-4 shrink-0 transition-all duration-300">
          {timeLeft && (
            <div className="hidden sm:flex items-center gap-2 h-9 px-3 border-2 rounded-lg bg-amber-500/5 border-amber-500/20 text-amber-600 font-bold shadow-sm animate-pulse shrink-0 transition-all">
              <Clock className="h-4 w-4" />
              <span className="text-[10px] uppercase tracking-wider">
                Expiring in: {timeLeft}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground hidden lg:inline">Section:</span>
            <Select 
              value={activeSection} 
              onValueChange={(val) => setActiveSection(val as SectionID)}
            >
              <SelectTrigger className="w-[72px] sm:w-[130px] h-7 sm:h-9 border-2 font-semibold bg-card px-1 sm:px-2 text-[10px] sm:text-sm">
                <SelectValue placeholder="Section" />
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

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground hidden lg:inline">Year:</span>
            <Select value={activeYear} onValueChange={setActiveYear}>
              <SelectTrigger className="w-[60px] sm:w-[110px] h-7 sm:h-9 border-2 font-semibold bg-card px-1 sm:px-2 text-[10px] sm:text-sm">
                <SelectValue placeholder="Year" />
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

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 sm:h-9 sm:w-9 border-2 rounded-lg bg-card"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            >
              <label className="sr-only">Toggle theme</label>
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
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-7 w-7 sm:h-9 sm:w-9 border-2 rounded-lg flex bg-card group relative">
                <Bell className="h-3 w-3 sm:h-4 sm:w-4 group-hover:text-primary transition-colors" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 border border-background"></span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80" sideOffset={8}>
              <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
                <span className="text-xs font-black uppercase tracking-widest text-foreground">Administrative Alerts</span>
                {notifications.length > 0 && (
                  <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        markAllAsRead(); 
                    }} 
                    className="flex items-center gap-1.5 text-[11px] font-bold text-rose-500 hover:text-rose-600 transition-colors group/clear"
                  >
                    Delete All
                    <Trash2 className="h-3 w-3 group-hover/clear:rotate-12 transition-transform" />
                  </button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                    No active system alerts.
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
                            <Check className="h-3.5 w-3.5" />
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
              <Button variant="outline" className="h-7 sm:h-9 w-auto px-1 sm:px-2 border-2 rounded-lg ml-0.5 sm:ml-1 bg-primary/5 hover:border-primary/50 transition-all flex items-center gap-1 sm:gap-2 group">
                <div className="p-0.5 sm:p-1 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </div>
                {user && (
                  <span className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors hidden md:inline-block pr-1 text-nowrap">
                    {user.first_name}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/account')}>
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
