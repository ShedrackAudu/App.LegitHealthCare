import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  User,
  ChevronLeft,
  ChevronRight,
  Building2,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext';

interface SidebarItem {
  title: string;
  path: string;
  icon: React.ElementType;
}

const patientItems: SidebarItem[] = [
  { title: 'Dashboard', path: '/patient/dashboard', icon: LayoutDashboard },
  { title: 'Medical Report', path: '/patient/records', icon: FileText },
  { title: 'Appointments', path: '/patient/appointments', icon: Calendar },
  { title: 'Contact Us', path: '/patient/contact', icon: MessageSquare },
  { title: 'Profile', path: '/patient/account', icon: User },
];

export const PatientSidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('legit_sidebar_collapsed');
    // Default to uncollapsed (false), but respect saved preference
    return saved !== null ? JSON.parse(saved) : false;
  });
  const { branding, brandingError } = useAppContext();

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
        "h-screen border-r bg-card transition-all duration-300 ease-in-out z-40 group flex flex-col no-print overflow-x-hidden",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="h-14 shrink-0 flex items-center px-4 border-b">
        {!isCollapsed ? (
          (branding?.logo_dark && !brandingError) ? (
            <img src={`${(window as any).API_BASE_URL}${branding.logo_dark}`} alt="Logo" className="max-h-10 w-auto object-contain" />
          ) : (
            <div className="text-primary font-bold text-lg truncate w-[90%] text-left flex items-center gap-2">
              <Building2 className="h-5 w-5 shrink-0" />
              {branding?.clinic_name || 'LEGIT HC'}
            </div>
          )
        ) : (
          (branding?.logo_light && !brandingError) ? (
            <img src={`${(window as any).API_BASE_URL}${branding.logo_light}`} alt="Logo" className="max-h-8 w-auto object-contain mx-auto" />
          ) : (
            <div className="text-primary font-bold text-lg truncate text-center w-full flex items-center justify-center">
              <Building2 className="h-5 w-5 shrink-0" />
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
              <item.icon className={cn("h-5 w-5 shrink-0", !isCollapsed && "mr-1")} />
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

        <div className="px-3 mt-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="w-full h-10 border-2 border-dashed border-primary/20 hover:border-primary/50 text-primary rounded-xl"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </aside>
  );
};
