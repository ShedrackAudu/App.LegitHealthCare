import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, Link, useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import axios from 'axios';
import {
  DashboardSquare02Icon,
  UserAdd01Icon,
  StethoscopeIcon,
  Chemistry02Icon,
  Shield01Icon,
  UserGroupIcon,
  Database02Icon,
  Note01Icon,
  MachineRobotIcon,
  PaintBrush01Icon,
  Building02Icon,
  UserSettings01Icon,
  Comment01Icon,
  Key01Icon,
  Settings02Icon,
  Calendar03Icon,
  Activity01Icon,
  PackageIcon,
  SidebarLeft01Icon,
  SidebarRight01Icon,
  Logout01Icon
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/context/AppContext';
import { usePermissions } from '@/hooks/usePermissions';
import { SafeImage } from '@/components/common/SafeImage';

interface SidebarItem {
  title: string;
  path: string;
  icon: any;
  permission?: string | string[];
}

const medicalItems: SidebarItem[] = [];


const adminItems: SidebarItem[] = [];

const sharedItems: SidebarItem[] = [
  { title: 'Dashboard', path: '/dashboard', icon: DashboardSquare02Icon },
];

export const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('legit_sidebar_collapsed');
    if (saved !== null) return JSON.parse(saved);
    return true; // Lock in collapsed state by default
  });
  const { branding, brandingError, unreadMessagesCount, user, setUser } = useAppContext();
  const { isAdmin, hasPermission, hasAnyPermission } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
        // Find the NavLink that is currently active (has the bg-primary class)
        const activeItem = scrollContainerRef.current.querySelector('.bg-primary');
        if (activeItem) {
          activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    };

    // Small delay to ensure styles are applied and layout is settled
    const timer = setTimeout(scrollActiveIntoView, 100);
    return () => clearTimeout(timer);
  }, [location.pathname]);

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

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('legit_sidebar_collapsed', JSON.stringify(newState));
  };

  return (
    <aside
      className={cn(
        "h-full border-r border-primary-foreground/10 bg-primary text-primary-foreground transition-all duration-300 ease-in-out z-40 group flex flex-col no-print",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <Link to="/" className="h-14 shrink-0 flex items-center px-4 border-b border-primary-foreground/10 hover:bg-white/10 transition-colors cursor-pointer group">
        {/* Clinic Logo */}
        {!isCollapsed ? (
          branding?.logo_dark ? (
            <SafeImage 
              src={`${(window as any).API_BASE_URL}${branding.logo_dark}`} 
              alt={branding?.clinic_name || "Logo"} 
              className="max-h-10 w-auto object-contain group-hover:opacity-80 transition-opacity" 
              fallbackText={branding?.clinic_name}
            />
          ) : (
            <div className="text-primary-foreground font-bold text-lg truncate w-[90%] text-left flex items-center gap-2 group-hover:text-primary-foreground/80 transition-colors">
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
            <div className="text-primary-foreground font-bold text-lg truncate text-center w-full flex items-center justify-center group-hover:text-primary-foreground/80 transition-colors">
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
          {/* Main Items */}
          {[...sharedItems, ...medicalItems].map((item) => {
            // Visible to everyone, access handled by ProtectedRoute
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center rounded-lg transition-all duration-200 group/item relative",
                  isCollapsed ? "justify-center w-10 h-10 mx-auto mt-0.5" : "px-3 py-2.5 gap-3",
                  isActive
                    ? "bg-white text-primary shadow-lg shadow-black/10"
                    : "text-primary-foreground/80 hover:bg-white/10 hover:text-white"
                )}
              >
                <HugeiconsIcon icon={item.icon} className={cn("h-5 w-5 shrink-0", !isCollapsed && "mr-1")} />
                <span className={cn(
                  "font-semibold transition-opacity duration-300 whitespace-nowrap overflow-hidden",
                  isCollapsed ? "opacity-0 invisible w-0" : "opacity-100 visible"
                )}>
                  {item.title}
                </span>

                {!isCollapsed && item.path === '/messages' && unreadMessagesCount > 0 && (
                  <Badge variant="destructive" className="ml-auto h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] animate-in zoom-in">
                    {unreadMessagesCount}
                  </Badge>
                )}

                {isCollapsed && item.path === '/messages' && unreadMessagesCount > 0 && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border border-background animate-pulse" />
                )}

                {isCollapsed && (
                  <div className="absolute left-16 ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 invisible group-hover/item:opacity-100 group-hover/item:visible transition-all whitespace-nowrap z-50 shadow-md">
                    {item.title}
                  </div>
                )}
              </NavLink>
            );
          })}

          {/* Admin Section - Dynamic Visibility */}
          {(() => {
            const filteredAdminItems = adminItems.filter(item =>
              item.permission ? hasPermission(item.permission) : isAdmin()
            );

            if (filteredAdminItems.length === 0) return null;

            return (
              <div className="pt-1 pb-2 space-y-0.5">
                <div className={cn(
                  "px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground/60 transition-all duration-300",
                  isCollapsed && "flex justify-center"
                )}>
                  {isCollapsed ? (
                    <div className="h-px bg-primary-foreground/20 w-10 my-3" />
                  ) : (
                    "Admin Control Panel"
                  )}
                </div>
                {filteredAdminItems.map((item) => {
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) => cn(
                        "flex items-center rounded-lg transition-all duration-200 group/item relative",
                        isCollapsed ? "justify-center w-10 h-10 mx-auto" : "px-3 py-2.5 gap-3",
                        isActive
                          ? "bg-white text-primary shadow-lg shadow-black/10"
                          : "text-primary-foreground/80 hover:bg-white/10 hover:text-white"
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
                  );
                })}
              </div>
            );
          })()}
        </div>

        <div className="px-3 mt-auto space-y-1.5">
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center rounded-lg transition-all duration-200 text-rose-300 hover:bg-white/10 hover:text-rose-200 border-0 bg-transparent w-full h-10 cursor-pointer focus:outline-none",
              isCollapsed ? "justify-center w-10 mx-auto" : "px-3 gap-3 justify-start"
            )}
            title="Log out"
          >
            <HugeiconsIcon icon={Logout01Icon} className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span className="font-semibold text-sm">Log out</span>}
          </button>

          {/* Separator */}
          <div className="h-px bg-primary-foreground/10 my-1.5 mx-1" />

          {/* Collapse/Expand Button */}
          <button
            onClick={toggleSidebar}
            className={cn(
              "flex items-center rounded-lg transition-all duration-200 text-primary-foreground/80 hover:bg-white/10 hover:text-white border-0 bg-transparent w-full h-10 cursor-pointer focus:outline-none",
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
