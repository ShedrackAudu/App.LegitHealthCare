import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
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
  ArrowLeft01Icon,
  ArrowRight01Icon
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

const medicalItems: SidebarItem[] = [
  { title: 'Registration', path: '/registration', icon: UserAdd01Icon },
  { title: 'Consultation', path: '/consultation', icon: StethoscopeIcon },
  { title: 'Test Results', path: '/tests', icon: Chemistry02Icon },
  { title: 'Director Review', path: '/director', icon: Shield01Icon },
  { title: 'Patient Report', path: '/patient-report', icon: Note01Icon },
  { title: 'Screening Matrix', path: '/view-records', icon: Database02Icon },
  { title: 'Patient Directory', path: '/view-patients', icon: UserGroupIcon },
  { title: 'Appointments', path: '/appointments', icon: Calendar03Icon },
  { title: 'Inventory', path: '/inventory', icon: PackageIcon, permission: 'view_inventory' },
  { title: 'Messaging', path: '/messages', icon: Comment01Icon },
];


const adminItems: SidebarItem[] = [
  { title: 'Security Center', path: '/security-analytics', icon: Activity01Icon, permission: 'manage_roles' },
  { title: 'User Management', path: '/user-management', icon: UserSettings01Icon, permission: 'view_users' },
  { title: 'Role Configuration', path: '/roles-permissions', icon: Shield01Icon, permission: 'manage_roles' },
  { title: 'Audit Trails', path: '/audit-logs', icon: Note01Icon, permission: 'view_audit_logs' },
  { title: 'Data Management', path: '/data-management', icon: Database02Icon, permission: 'download_data' },
  { title: 'Access Keys', path: '/admin/access-keys', icon: Key01Icon, permission: 'manage_access_keys' },
  { title: 'AI Integration', path: '/ai-integration', icon: MachineRobotIcon, permission: 'manage_ai' },
  { title: 'System Branding', path: '/system-branding', icon: PaintBrush01Icon, permission: 'manage_branding' },
  { title: 'System Settings', path: '/system-config', icon: Settings02Icon, permission: 'manage_departments' },
];

const sharedItems: SidebarItem[] = [
  { title: 'Dashboard', path: '/dashboard', icon: DashboardSquare02Icon },
];

export const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('legit_sidebar_collapsed');
    if (saved !== null) return JSON.parse(saved);
    
    // Fallback for new visitors or cleared storage: auto-collapse on small screens
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return true;
    return false;
  });
  const { branding, brandingError, unreadMessagesCount } = useAppContext();
  const { isAdmin, hasPermission, hasAnyPermission } = usePermissions();
  const location = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      // Auto-collapse only on resize if width drops below threshold
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else {
        const saved = localStorage.getItem('legit_sidebar_collapsed');
        setIsCollapsed(saved !== null ? JSON.parse(saved) : false);
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

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('legit_sidebar_collapsed', JSON.stringify(newState));
  };

  return (
    <aside
      className={cn(
        "h-full border-r bg-card transition-all duration-300 ease-in-out z-40 group flex flex-col no-print",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <Link to="/" className="h-14 shrink-0 flex items-center px-4 border-b hover:bg-muted/30 transition-colors cursor-pointer group">
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
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
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
                  "px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 transition-all duration-300",
                  isCollapsed && "flex justify-center"
                )}>
                  {isCollapsed ? (
                    <div className="h-px bg-border/80 w-10 my-3" />
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
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
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

        <div className="px-3 mt-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="w-full h-10 border-2 border-dashed border-primary/20 hover:border-primary/50 text-primary rounded-xl"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <HugeiconsIcon icon={ArrowRight01Icon} className="h-5 w-5" /> : <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </aside>
  );
};
