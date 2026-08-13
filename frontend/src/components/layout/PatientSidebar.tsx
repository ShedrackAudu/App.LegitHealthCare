import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import axios from 'axios';
import {
  DashboardSquare02Icon,
  SidebarLeft01Icon,
  SidebarRight01Icon,
  Building02Icon,
  Logout02Icon,
  AccountSetting01Icon
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/AppContext';
import { SafeImage } from '@/components/common/SafeImage';

interface SidebarItem {
  title: string;
  path: string;
  icon: any;
}

const patientItems: SidebarItem[] = [
  { title: 'Dashboard', path: '/patient/dashboard', icon: DashboardSquare02Icon },
];

export const PatientSidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('legit_sidebar_collapsed');
    if (saved !== null) return JSON.parse(saved);
    return true; // Lock in collapsed state by default on mobile
  });
  const { branding, user, setUser } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

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
        setIsCollapsed(saved !== null ? JSON.parse(saved) : true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Ensure active link is in view after navigation
  useEffect(() => {
    const scrollActiveIntoView = () => {
      if (scrollContainerRef.current) {
        const activeItem = scrollContainerRef.current.querySelector('.bg-primary');
        if (activeItem) {
          activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    };

    const timer = setTimeout(scrollActiveIntoView, 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (!isCollapsed) {
        if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
          setIsCollapsed(true);
          localStorage.setItem('legit_sidebar_collapsed', JSON.stringify(true));
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isCollapsed]);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('legit_sidebar_collapsed', JSON.stringify(newState));
  };

  return (
    <>
      {/* Mobile Overlay backdrop */}
      {!isCollapsed && (
        <div 
          onClick={toggleSidebar}
          className="lg:hidden fixed inset-0 bg-black/40 z-[55] no-print"
        />
      )}

      <aside
        ref={sidebarRef}
        className={cn(
          "h-[100dvh] sticky top-0 touch-none border-r border-border bg-card text-card-foreground transition-all duration-300 ease-in-out z-40 group flex flex-col no-print",
          isCollapsed ? "lg:w-16" : "lg:w-64",
          isCollapsed 
            ? "max-lg:hidden" 
            : "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:w-64 max-lg:z-[60] max-lg:shadow-2xl"
        )}
      >
        <Link
          to="/"
          className={cn(
            "h-14 shrink-0 flex items-center px-4 border-b border-border transition-colors cursor-pointer group hover:bg-muted/30"
          )}
        >
          {!isCollapsed ? (
            branding?.logo_dark ? (
              <SafeImage 
                src={`${(window as any).API_BASE_URL}${branding.logo_dark}`} 
                alt={branding?.clinic_name || "Logo"} 
                className="max-h-10 w-auto object-contain group-hover:opacity-80 transition-opacity" 
                fallbackText={branding?.clinic_name}
              />
            ) : (
              <div className="text-primary font-bold text-lg truncate w-[90%] text-left flex items-center gap-2 group-hover:text-primary/80 transition-colors">
                <HugeiconsIcon icon={Building02Icon} className="h-5 w-5 shrink-0" />
                {branding?.clinic_name || 'LEGIT HC'}
              </div>
            )
          ) : (
            branding?.logo_light ? (
              <SafeImage 
                src={`${(window as any).API_BASE_URL}${branding.logo_light}`} 
                alt="Logo" 
                className="max-h-8 w-auto object-contain mx-auto group-hover:opacity-80 transition-opacity" 
              />
            ) : (
              <div className="text-primary font-bold text-lg truncate text-center w-full flex items-center justify-center group-hover:text-primary/80 transition-colors">
                <HugeiconsIcon icon={Building02Icon} className="h-5 w-5 shrink-0" />
              </div>
            )
          )}
        </Link>

        <div className="flex flex-col flex-1 py-4 overflow-hidden">
          <div 
            ref={scrollContainerRef}
            className="flex-1 space-y-2 px-3 overflow-y-auto overflow-x-hidden custom-scrollbar"
          >
            {patientItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  setIsCollapsed(true);
                  localStorage.setItem('legit_sidebar_collapsed', JSON.stringify(true));
                }}
                className={({ isActive }) => cn(
                  "flex items-center rounded-lg transition-all duration-200 group/item relative",
                  isCollapsed ? "justify-center w-10 h-10 mx-auto mt-0.5" : "px-3 py-2.5 gap-3",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <HugeiconsIcon icon={item.icon} className={cn("h-5 w-5 shrink-0", !isCollapsed && "mr-1")} />
                <span className={cn(
                  "font-semibold transition-opacity duration-300 whitespace-nowrap overflow-hidden",
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
            {/* Versioning */}
            <div className={cn(
              "py-1 text-[10px] font-bold text-muted-foreground/50 transition-all duration-200 select-none",
              isCollapsed ? "text-center" : "px-3"
            )}>
              <span>{import.meta.env.VITE_APP_VERSION || 'v1.2.0'}</span>
            </div>

            {/* Manage Account Link */}
            <NavLink
              to="/patient/account"
              onClick={() => {
                setIsCollapsed(true);
                localStorage.setItem('legit_sidebar_collapsed', JSON.stringify(true));
              }}
              className={({ isActive }) => cn(
                "flex items-center rounded-lg transition-all duration-200 text-muted-foreground hover:bg-muted hover:text-foreground border-0 bg-transparent w-full h-10 cursor-pointer focus:outline-none relative group/manage",
                isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "",
                isCollapsed ? "justify-center w-10 mx-auto" : "px-3 gap-3 justify-start"
              )}
              title="Manage Account"
            >
              <HugeiconsIcon icon={AccountSetting01Icon} className="h-5 w-5 shrink-0" />
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
              <HugeiconsIcon icon={Logout02Icon} className="h-5 w-5 shrink-0" />
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

      {/* Floating mobile expand button */}
      {isCollapsed && (
        <button
          onClick={toggleSidebar}
          className="lg:hidden fixed bottom-4 left-4 z-[55] flex items-center justify-center rounded-lg bg-primary border border-primary-foreground/10 text-primary-foreground w-10 h-10 shadow-lg cursor-pointer focus:outline-none hover:bg-primary/90 transition-colors"
          title="Expand Sidebar"
        >
          <HugeiconsIcon icon={SidebarRight01Icon} className="h-5 w-5 shrink-0" />
        </button>
      )}
    </>
  );
};
