import React, { useState, useEffect, useCallback } from 'react';
import { Sun, Moon, LogOut, User, Bell } from 'lucide-react';
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
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);
  const [profileName, setProfileName] = useState<string | null>(null);

  const fetchName = useCallback(async () => {
    if (!user?.username) return;
    try {
      const response = await axios.get('http://localhost:5000/api/patient/profile', {
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

  const handleLogout = () => {
    setUser(null);
    navigate('/login');
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

        {/* Right Side: Theme Switcher, Notifications, Profile */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0 px-4">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 border-2 rounded-lg bg-card"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
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
