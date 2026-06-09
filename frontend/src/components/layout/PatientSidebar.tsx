import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import axios from 'axios';
import {
  DashboardSquare02Icon,
  Note01Icon,
  UserIcon,
  SidebarLeft01Icon,
  SidebarRight01Icon,
  Building02Icon,
  Calendar03Icon,
  Comment01Icon,
  Activity01Icon,
  Logout01Icon,
  UserSettings01Icon
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext';
import { SafeImage } from '@/components/common/SafeImage';

interface SidebarItem {
  title: string;
  path: string;
  icon: any;
}

const patientItems: SidebarItem[] = [
  { title: 'Dashboard', path: '/patient/dashboard', icon: DashboardSquare02Icon },
  { title: 'Medical Report', path: '/patient/records', icon: Note01Icon },
  { title: 'Technical Files', path: '/patient/files', icon: Activity01Icon },
  { title: 'Appointments', path: '/patient/appointments', icon: Calendar03Icon },
  { title: 'Contact Us', path: '/patient/contact', icon: Comment01Icon },
];

export const PatientSidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('legit_sidebar_collapsed');
    // Default to uncollapsed (false), but respect saved preference
    return saved !== null ? JSON.parse(saved) : false;
  });
  const { branding, brandingError, user, setUser } = useAppContext();
  const navigate = useNavigate();

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

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else {
        const saved = localStorage.getItem('legit_sidebar_collapsed');
        if (saved !== null) {
          setIsCollapsed(JSON.parse(saved));
        } else {
          setIsCollapsed(false);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('legit_sidebar_collapsed', JSON.stringify(newState));
  };

  return (
    <aside
      className={cn(
        "h-full border-r bg-card transition-all duration-300 ease-in-out z-40 group flex flex-col no-print overflow-x-hidden",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="h-14 shrink-0 flex items-center px-4 border-b">
        {!isCollapsed ? (
          branding?.logo_dark ? (
            <SafeImage 
              src={`${(window as any).API_BASE_URL}${branding.logo_dark}`} 
              alt={branding?.clinic_name || "Logo"} 
              className="max-h-10 w-auto object-contain" 
              fallbackText={branding?.clinic_name}
            />
          ) : (
            <div className="text-primary font-bold text-lg truncate w-[90%] text-left flex items-center gap-2">
              <HugeiconsIcon icon={Building02Icon} className="h-5 w-5 shrink-0" />
              {branding?.clinic_name || 'LEGIT HC'}
            </div>
          )
        ) : (
          branding?.logo_light ? (
            <SafeImage 
              src={`${(window as any).API_BASE_URL}${branding.logo_light}`} 
              alt="Logo" 
              className="max-h-8 w-auto object-contain mx-auto" 
            />
          ) : (
            <div className="text-primary font-bold text-lg truncate text-center w-full flex items-center justify-center">
              <HugeiconsIcon icon={Building02Icon} className="h-5 w-5 shrink-0" />
            </div>
          )
        )}
      </div>

      <div className="flex flex-col flex-1 py-4 overflow-hidden">
        <div className="flex-1 space-y-2 px-3 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {patientItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center rounded-lg transition-all duration-200 group/item relative",
                isCollapsed ? "justify-center w-10 h-10 mx-auto" : "px-3 py-2.5 gap-3",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
              )}
            >
              <HugeiconsIcon icon={item.icon} className={cn("h-5 w-5 shrink-0", !isCollapsed && "mr-1")} />
              <span className={cn(
                "font-semibold transition-opacity duration-300 whitespace-nowrap",
                isCollapsed ? "opacity-0 invisible w-0" : "opacity-100 visible"
              )}>
                {item.title}
              </span>

              {isCollapsed && (
                <div className="absolute left-16 ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 invisible group-hover/item:opacity-100 group-hover/item:visible transition-all whitespace-nowrap z-50 shadow-md">
                  {item.title}
                </div>
              )}
            </NavLink>
          ))}
        </div>

        <div className="px-3 mt-auto space-y-1.5">
          {/* Manage Account Link */}
          <NavLink
            to="/patient/account"
            className={({ isActive }) => cn(
              "flex items-center rounded-lg transition-all duration-200 group/manage relative h-10",
              isCollapsed ? "justify-center w-10 mx-auto" : "px-3 gap-3",
              isActive
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
            )}
            title="Manage Account"
          >
            <HugeiconsIcon icon={UserSettings01Icon} className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span className="font-semibold text-sm">Manage Account</span>}
            {isCollapsed && (
              <div className="absolute left-16 ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 invisible group-hover/manage:opacity-100 group-hover/manage:visible transition-all whitespace-nowrap z-50 shadow-md">
                Manage Account
              </div>
            )}
          </NavLink>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center rounded-lg transition-all duration-200 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 border-0 bg-transparent w-full h-10 cursor-pointer focus:outline-none relative group/logout",
              isCollapsed ? "justify-center w-10 mx-auto" : "px-3 gap-3 justify-start"
            )}
            title="Log out"
          >
            <HugeiconsIcon icon={Logout01Icon} className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span className="font-semibold text-sm">Log out</span>}
            {isCollapsed && (
              <div className="absolute left-16 ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 invisible group-hover/logout:opacity-100 group-hover/logout:visible transition-all whitespace-nowrap z-50 shadow-md">
                Log out
              </div>
            )}
          </button>

          {/* Separator */}
          <div className="h-px bg-border my-1.5 mx-1" />

          {/* Collapse/Expand Button */}
          <button
            onClick={toggleSidebar}
            className={cn(
              "flex items-center rounded-lg transition-all duration-200 text-muted-foreground hover:bg-muted hover:text-foreground border-0 bg-transparent w-full h-10 cursor-pointer focus:outline-none",
              isCollapsed ? "justify-center w-10 mx-auto" : "px-3 gap-3 justify-start"
            )}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <HugeiconsIcon icon={SidebarRight01Icon} className="h-5 w-5 shrink-0" />
            ) : (
              <>
                <HugeiconsIcon icon={SidebarLeft01Icon} className="h-5 w-5 shrink-0" />
                <span className="font-semibold text-sm">Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};
