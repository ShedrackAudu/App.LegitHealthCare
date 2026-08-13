import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowRight01Icon,
  StethoscopeIcon,
  UserSettings01Icon,
  UserAdd01Icon,
  Chemistry02Icon,
  Shield01Icon,
  Database02Icon,
  Activity01Icon,
  UserGroupIcon,
  UserIcon,
  Key01Icon,
  Clock01Icon,
  ClipboardIcon,
  Settings02Icon,
  Download01Icon,
  SmartPhone01Icon,
  Cancel01Icon,
  PackageIcon,
  Calendar03Icon,
  Note01Icon,
  MachineRobotIcon,
  PaintBrush01Icon,
  Delete02Icon,
  VolumeHighIcon,
  FastWindIcon,
  FavouriteIcon
} from '@hugeicons/core-free-icons';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAppContext } from '@/context/AppContext';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
// Removed Loader2 lucide-react import
import { toast } from 'react-hot-toast';
import { ActionConfirmModal } from '@/components/ActionConfirmModal';

const quickActions = [
  { 
    title: 'Registration', 
    description: 'Intake new patients and update bio-data.',
    icon: UserAdd01Icon, 
    path: '/registration',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    permission: 'registration'
  },
  { 
    title: 'Consultation', 
    description: 'Enter clinical assessments and recommendations.',
    icon: StethoscopeIcon, 
    path: '/consultation',
    color: 'bg-primary/10 text-primary border-primary/20',
    permission: 'consultation'
  },
  { 
    title: 'Test Results', 
    description: 'Record diagnostic findings (FBC, KFT, LFT, etc).',
    icon: Chemistry02Icon, 
    path: '/tests',
    color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    permission: 'lab_entry'
  },
  { 
    title: 'Director Review', 
    description: 'Final clinical assessment & record validation.',
    icon: Shield01Icon, 
    path: '/director',
    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    permission: 'director_review'
  },
  { 
    title: 'Patient Report', 
    description: 'Generate and export individual patient reports.',
    icon: UserIcon, 
    path: '/patient-report',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    permission: 'view_records'
  },
  { 
    title: 'Screening Matrix', 
    description: 'Search and review detailed clinical findings.',
    icon: Database02Icon, 
    path: '/view-records',
    color: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    permission: 'view_records'
  },
  { 
    title: 'Patient Directory', 
    description: 'Access complete registry of registered patients.',
    icon: UserGroupIcon, 
    path: '/view-patients',
    color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    permission: 'view_patients'
  },
  { 
    title: 'Appointments', 
    description: 'Manage clinic schedule and patient bookings.',
    icon: Calendar03Icon, 
    path: '/appointments',
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    permission: 'manage_appointments'
  },
  { 
    title: 'Inventory', 
    description: 'Track clinical supplies and stock levels.',
    icon: PackageIcon, 
    path: '/inventory',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    permission: 'view_inventory'
  },
  { 
    title: 'Messaging', 
    description: 'Internal communication & staff coordination.',
    icon: Activity01Icon, 
    path: '/messages',
    color: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    permission: 'messaging'
  },
];

const adminActions = [
  { 
    title: 'Security Center', 
    description: 'Monitor system-wide activity and security analytics.',
    icon: Activity01Icon, 
    path: '/security-analytics',
    color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    permission: 'manage_roles'
  },
  { 
    title: 'User Management', 
    description: 'Manage system users, roles, and account security.',
    icon: UserSettings01Icon, 
    path: '/user-management',
    color: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    permission: 'view_users'
  },
  { 
    title: 'Role Configuration', 
    description: 'Configure access control and role assignments.',
    icon: Shield01Icon, 
    path: '/roles-permissions',
    color: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    permission: 'manage_roles'
  },
  { 
    title: 'Audit Trails', 
    description: 'Monitor system-wide activity and security events.',
    icon: Note01Icon, 
    path: '/audit-logs',
    color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    permission: 'view_audit_logs'
  },
  { 
    title: 'Data Management', 
    description: 'Export records and screening data to Excel.',
    icon: Database02Icon, 
    path: '/data-management',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    permission: 'download_data'
  },
  { 
    title: 'Access Keys', 
    description: 'Generate temporary security entrance codes.',
    icon: Key01Icon, 
    path: '/admin/access-keys',
    color: 'bg-primary/10 text-primary border-primary/20',
    permission: 'manage_access_keys'
  },
  { 
    title: 'AI Integration', 
    description: 'Configure AI agents and medical parameters.',
    icon: MachineRobotIcon, 
    path: '/ai-integration',
    color: 'bg-primary/10 text-primary border-primary/20',
    permission: 'manage_ai'
  },
  { 
    title: 'System Branding', 
    description: 'Customize clinic logos, names, and visual assets.',
    icon: PaintBrush01Icon, 
    path: '/system-branding',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    permission: 'manage_branding'
  },
  { 
    title: 'System Settings', 
    description: 'Manage clinical departments and system configurations.',
    icon: Settings02Icon, 
    path: '/system-config',
    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    permission: 'manage_departments'
  },
  { 
    title: 'Report Customization', 
    description: 'Customize reference ranges, parameter names, and units on patient reports.',
    icon: Note01Icon, 
    path: '/report-customization',
    color: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    permission: 'manage_report_customization'
  },
];

const LiveClock: React.FC = () => {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="flex items-center gap-1.5 font-bold transition-all">
      <HugeiconsIcon icon={Clock01Icon} className="h-3.5 w-3.5 text-primary" />
      {time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
    </span>
  );
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { activeSection, activeYear } = useAppContext();
  const { isAdmin, hasPermission } = usePermissions();
  const [stats, setStats] = React.useState<any>(null);
  const [queueStats, setQueueStats] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [queueEntries, setQueueEntries] = React.useState<any[]>([]);
  const [selectedDept, setSelectedDept] = React.useState<string | null>(null);
  const [isQueueModalOpen, setIsQueueModalOpen] = React.useState(false);
  const [loadingQueue, setLoadingQueue] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deletePendingEntry, setDeletePendingEntry] = React.useState<{ dept: string; staffId: string } | null>(null);

  // PWA Install Prompt State (mobile dashboard banner)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [pwaDismissed, setPwaDismissed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [serverConnected, setServerConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setPwaInstalled(true);
      return;
    }

    if ((window as any).deferredPWAPrompt) {
      setDeferredPrompt((window as any).deferredPWAPrompt);
    }

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handlePromptReady = () => {
      if ((window as any).deferredPWAPrompt) {
        setDeferredPrompt((window as any).deferredPWAPrompt);
      }
    };
    const handleAppInstalled = () => {
      setPwaInstalled(true);
      setDeferredPrompt(null);
      (window as any).deferredPWAPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handlePwaInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setPwaInstalled(true);
        (window as any).deferredPWAPrompt = null;
      }
    } catch (err) {
      console.error('PWA install failed:', err);
    }
  };
  
   const fetchDashboardStats = async () => {
    try {
      const resp = await axios.get(`/api/dashboard/stats?year=${activeYear}`, {
        headers: { 'X-Company-Context': activeSection }
      });
      setStats(resp.data);
      setServerConnected(true);
    } catch (err) {
      console.error("Dashboard stats fetch failed:", err);
      setServerConnected(false);
    }
  };

  const fetchQueueStats = async () => {
    try {
        const resp = await axios.get(`/api/queue/?year=${activeYear}`, {
            headers: { 'X-Company-Context': activeSection }
        });
        setQueueStats(resp.data);
        setServerConnected(true);
    } catch (err) {
        console.error("Queue stats fetch failed:", err);
        setServerConnected(false);
    }
  };

  const fetchQueueList = async (dept: string) => {
    setQueueEntries([]);
    setSelectedDept(dept);
    setIsQueueModalOpen(true);
    setLoadingQueue(true);
    try {
      const resp = await axios.get(`/api/queue/${dept.toLowerCase()}/?year=${activeYear}`, {
        headers: { 'X-Company-Context': activeSection }
      });
      setQueueEntries(resp.data);
    } catch (err) {
      console.error("Queue list fetch failed:", err);
      toast.error("Failed to load patient queue");
    } finally {
      setLoadingQueue(false);
    }
  };

  const handleDeleteQueueEntry = (dept: string, staffId: string) => {
    setDeletePendingEntry({ dept, staffId });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletePendingEntry) return;
    const { dept, staffId } = deletePendingEntry;
    try {
      await axios.delete(`/api/queue/${dept.toLowerCase()}/${staffId}?year=${activeYear}`, {
        headers: { 'X-Company-Context': activeSection }
      });
      toast.success("Patient removed from queue");
      fetchQueueList(dept);
      fetchQueueStats();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to remove patient from queue");
    } finally {
      setDeleteConfirmOpen(false);
      setDeletePendingEntry(null);
    }
  };

  React.useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([
          fetchDashboardStats(),
          fetchQueueStats()
        ]);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    
    const interval = setInterval(() => {
        fetchDashboardStats();
        fetchQueueStats();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [activeSection, activeYear]);

  React.useEffect(() => {
    const checkConnection = async () => {
      try {
        await axios.get('/api/ping');
        setServerConnected(true);
      } catch (err) {
        setServerConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 15000); // Check every 15 seconds
    return () => clearInterval(interval);
  }, []);

  // Mocking user profile for now
  const user = JSON.parse(localStorage.getItem('user') || '{"first_name": "Health"}');

  const getRelativeTime = (isoString: string) => {
    if (!isoString) return 'recently';
    // Fix: Python's datetime.utcnow().isoformat() often lacks the 'Z' indicating UTC.
    const dateStr = isoString.endsWith('Z') || isoString.includes('+') ? isoString : `${isoString}Z`;
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    
    // Fallback if client clock is slightly behind server clock
    if (diffInMs < 0) return 'Just now';
    
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins} mins ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <MainLayout>
      <div className="space-y-8 animate-in fade-in duration-700 dashboard-page">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col space-y-0.5 sm:space-y-1">
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight leading-tight">Welcome back, {user.first_name}!</h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
              Currently managing <span className="text-primary font-bold">{activeSection}</span> for the <span className="text-primary font-bold">{activeYear}</span> Screening Program.
            </p>
            <div className="text-[11px] sm:text-xs text-muted-foreground/80 pt-0.5">
              <LiveClock />
            </div>
          </div>
          <div className="flex items-center gap-3 bg-card border rounded-xl p-2 md:p-3 md:px-5 w-full md:w-auto justify-start md:justify-end">
             <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300 ${
                serverConnected === null ? 'bg-muted text-muted-foreground' : 
                serverConnected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
             }`}>
                <HugeiconsIcon icon={Activity01Icon} className={`w-5 h-5 md:w-6 md:h-6 ${serverConnected === null ? 'animate-pulse' : serverConnected ? 'animate-pulse' : ''}`} />
             </div>
             <div className="text-left md:text-right min-w-0">
                <p className="text-[8px] md:text-[10px] uppercase tracking-wider font-bold text-muted-foreground truncate">Server Status</p>
                <div className="flex items-center md:justify-end gap-1.5 mt-0.5">
                   {serverConnected && (
                      <span className="relative flex h-2 w-2">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                   )}
                   {!serverConnected && serverConnected !== null && (
                      <span className="relative flex h-2 w-2">
                         <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                   )}
                   <p className={`text-xs md:text-sm font-bold truncate transition-colors duration-300 ${
                      serverConnected === null ? 'text-muted-foreground' : 
                      serverConnected ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'
                   }`}>
                      {serverConnected === null ? 'Checking...' : serverConnected ? 'Connected' : 'Disconnected'}
                   </p>
                </div>
             </div>
          </div>
        </div>

        {/* PWA Install Banner — mobile only (header has the button on desktop) */}
        <AnimatePresence>
          {deferredPrompt && !pwaInstalled && !pwaDismissed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35 }}
              className="block sm:hidden"
            >
              <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4">
                <button
                  onClick={() => setPwaDismissed(true)}
                  className="absolute top-2 right-2 p-1 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors z-10"
                  aria-label="Dismiss"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                </button>
                <div className="absolute -right-6 -bottom-6 w-28 h-28 text-primary/[0.06] pointer-events-none">
                  <HugeiconsIcon icon={SmartPhone01Icon} className="w-full h-full" />
                </div>
                <div className="relative z-10 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 border border-primary/20">
                      <HugeiconsIcon icon={Download01Icon} className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-foreground tracking-tight">Install the App</h3>
                      <p className="text-[11px] text-muted-foreground font-medium leading-snug">
                        Add to your home screen for quick access.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handlePwaInstall}
                    className="w-full h-10 rounded-lg font-black text-xs uppercase tracking-wider active:scale-95 transition-all gap-2"
                  >
                    <HugeiconsIcon icon={Download01Icon} className="h-3.5 w-3.5" />
                    Install Now
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Actions Grid */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">Quick Actions</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
            {quickActions.map((action) => {
              // Visible to everyone, access handled by ProtectedRoute
              return (
                <Card 
                  key={action.path}
                  className="group cursor-pointer transition-all duration-300 border hover:border-primary/20 overflow-hidden bg-card/50 backdrop-blur-sm flex flex-col h-full"
                  onClick={() => navigate(action.path)}
                >
                  <CardHeader className="p-3.5 pb-2.5 flex flex-row items-center gap-3 space-y-0 flex-1">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${action.color.split(' ').slice(0,2).join(' ')} border ${action.color.split(' ')[2]}`}>
                      <HugeiconsIcon icon={action.icon} className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-black tracking-tight truncate">{action.title}</CardTitle>
                      <CardDescription className="text-[10px] font-medium text-muted-foreground line-clamp-1 mt-0.5">
                        {action.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3.5 pt-0 mt-auto">
                    <div className="flex items-center justify-between group-hover:text-primary transition-colors text-muted-foreground/60 border-t border-dashed pt-2.5">
                      <span className="text-[9px] uppercase font-black tracking-widest">Open Tool</span>
                      <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Admin Control Panel Section - Only visible to Admins */}
        {(() => {
          const filteredAdminActions = adminActions.filter(action => 
            action.permission ? hasPermission(action.permission) : isAdmin()
          );

          if (filteredAdminActions.length === 0) return null;

          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-primary">Admin Control Panel</h2>
                <div className="h-px flex-1 bg-primary/20" />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                {filteredAdminActions.map((action) => (
                  <Card 
                    key={action.path}
                    className="group cursor-pointer transition-all duration-300 border hover:border-primary/20 overflow-hidden bg-primary/[0.03] backdrop-blur-sm flex flex-col h-full"
                    onClick={() => navigate(action.path)}
                  >
                    <CardHeader className="p-3.5 pb-2.5 flex flex-row items-center gap-3 space-y-0 flex-1">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${action.color.split(' ').slice(0,2).join(' ')} border ${action.color.split(' ')[2]}`}>
                        <HugeiconsIcon icon={action.icon} className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm font-black tracking-tight truncate">{action.title}</CardTitle>
                        <CardDescription className="text-[10px] font-medium text-muted-foreground line-clamp-1 mt-0.5 italic">
                          {action.description}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3.5 pt-0 mt-auto">
                      <div className="flex items-center justify-between group-hover:text-primary transition-colors text-muted-foreground/60 border-t border-dashed pt-2.5">
                        <span className="text-[9px] uppercase font-black tracking-widest">Open Tool</span>
                        <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Queue Stats Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black tracking-tight text-primary">Department Queues</h2>
            <div className="h-px flex-1 bg-primary/20" />
            <Button variant="ghost" size="sm" onClick={fetchQueueStats} className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10">
              Refresh
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border border-border/80 bg-card/45 backdrop-blur-sm">
                  <CardContent className="p-3 sm:p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 w-full animate-pulse">
                      <Skeleton className="h-8 w-8 rounded-xl shrink-0 bg-muted/40" />
                      <div className="space-y-1.5 w-full flex-1">
                        <Skeleton className="h-4 w-24 rounded bg-muted/40" />
                        <Skeleton className="h-3 w-12 rounded bg-muted/40" />
                      </div>
                    </div>
                    <Skeleton className="h-7 w-7 rounded-lg shrink-0 bg-muted/40" />
                  </CardContent>
                </Card>
              ))
            ) : (
              [
                { id: 'consultation', label: 'Consultation', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: StethoscopeIcon },
                { id: 'audiometry', label: 'Audiometry', color: 'bg-primary/10 text-primary border-primary/20', icon: VolumeHighIcon },
                { id: 'spirometry', label: 'Spirometry', color: 'bg-amber-500/10 text-amber-500 border-orange-500/20', icon: FastWindIcon },
                { id: 'ecg', label: 'ECG', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20', icon: FavouriteIcon }
              ].map((dept) => (
                <Card 
                  key={dept.id} 
                  className="group cursor-pointer transition-all duration-300 border border-border/80 hover:border-primary/30 overflow-hidden bg-card/45 backdrop-blur-sm relative"
                  onClick={() => fetchQueueList(dept.label)}
                >
                  <CardContent className="p-3 sm:p-3.5 flex items-center justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 sm:p-2 rounded-xl shrink-0 ${dept.color.split(' ').slice(0, 2).join(' ')} border ${dept.color.split(' ')[2]}`}>
                        <HugeiconsIcon icon={dept.icon} className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold tracking-tight text-foreground truncate">{dept.label}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="relative flex h-1.5 w-1.5 shrink-0">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dept.id === 'consultation' ? 'bg-blue-400' : dept.id === 'audiometry' ? 'bg-primary/70' : dept.id === 'spirometry' ? 'bg-amber-400' : 'bg-rose-400'}`}></span>
                            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dept.id === 'consultation' ? 'bg-blue-500' : dept.id === 'audiometry' ? 'bg-primary' : dept.id === 'spirometry' ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                          </span>
                          <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground/80">Waiting</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xl sm:text-2xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors">
                        {queueStats?.[dept.id] || 0}
                      </span>
                      <div className="flex items-center justify-center h-6 w-6 rounded-lg bg-muted/40 group-hover:bg-primary/10 transition-colors">
                        <HugeiconsIcon icon={ArrowRight01Icon} className="h-3 w-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </CardContent>
                  <div className="absolute inset-0 -z-0 bg-gradient-to-tr from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Recent Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <HugeiconsIcon icon={Activity01Icon} className="h-5 w-5 text-primary" />
                        System Statistics
                    </CardTitle>
                    <CardDescription>Performance Overview for {activeSection} - {activeYear}</CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-4 border-t border-dashed bg-muted/5">
                    <div className="space-y-6">
                        {/* Summary Metrics */}
                        <div className="grid grid-cols-2 gap-4">
                            {isLoading ? (
                                Array.from({ length: 2 }).map((_, i) => (
                                    <div key={i} className="p-4 rounded-xl border bg-muted/5 flex items-center gap-3 animate-pulse">
                                        <Skeleton className="h-8 w-8 rounded-lg bg-muted/40 animate-pulse" />
                                        <div className="space-y-2 flex-1">
                                            <Skeleton className="h-3 w-24 rounded bg-muted/40 animate-pulse" />
                                            <Skeleton className="h-5 w-16 rounded bg-muted/40 animate-pulse" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                [
                                    { label: 'Total Registered', count: stats?.registration_stats?.year_total, icon: UserGroupIcon, color: 'text-blue-600', bg: 'bg-blue-500/10' },
                                    { label: 'Registered Today', count: stats?.registration_stats?.today, icon: Activity01Icon, color: 'text-primary', bg: 'bg-primary/10' }
                                ].map((s) => (
                                    <div key={s.label} className="bg-gradient-to-br from-muted/5 to-muted/10 p-4 rounded-xl border border-transparent hover:border-primary/10 transition-all group/stat cursor-default overflow-hidden relative">
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform duration-500"></div>
                                        <div className="flex items-center gap-2 mb-2 relative z-10">
                                            <div className={`p-1.5 rounded-lg ${s.bg}`}>
                                                <HugeiconsIcon icon={s.icon} className={`h-4 w-4 ${s.color}`} />
                                            </div>
                                            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/80">{s.label}</p>
                                        </div>
                                        <div className="flex items-baseline gap-1 relative z-10">
                                            <h4 className="text-2xl font-black tracking-tighter group-hover:text-primary transition-colors">{s.count?.toLocaleString() || '0'}</h4>
                                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Records</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Gender Distribution Chart */}
                            <div className="bg-gradient-to-br from-muted/5 to-muted/10 p-4 rounded-xl border flex flex-col items-center">
                                <h4 className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/80 w-full text-left">Gender Distribution</h4>
                                <div className="h-[150px] md:h-[140px] w-full mt-2 flex items-center justify-center">
                                    {isLoading ? (
                                        <div className="flex items-center gap-6 w-full px-4 animate-pulse">
                                            <div className="relative flex items-center justify-center shrink-0">
                                                <Skeleton className="h-[100px] w-[100px] rounded-full bg-muted/40 animate-pulse" />
                                                <div className="absolute h-[50px] w-[50px] rounded-full bg-background" />
                                            </div>
                                            <div className="space-y-3 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <Skeleton className="w-2.5 h-2.5 rounded-full bg-muted/40 animate-pulse" />
                                                    <Skeleton className="h-3 w-16 rounded bg-muted/40 animate-pulse" />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Skeleton className="w-2.5 h-2.5 rounded-full bg-muted/40 animate-pulse" />
                                                    <Skeleton className="h-3 w-16 rounded bg-muted/40 animate-pulse" />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'Male Patients', value: stats?.registration_stats?.males || 0 },
                                                        { name: 'Female Patients', value: stats?.registration_stats?.females || 0 }
                                                    ]}
                                                    cx={isMobile ? "50%" : "40%"}
                                                    cy={isMobile ? "46%" : "50%"}
                                                    innerRadius={isMobile ? 32 : 45}
                                                    outerRadius={isMobile ? 45 : 65}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    <Cell fill="#4f46e5" /> {/* Indigo for Males */}
                                                    <Cell fill="#e11d48" /> {/* Rose for Females */}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ borderRadius: '0px', border: 'none', backgroundColor: 'var(--card)', color: 'var(--foreground)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                                />
                                                <Legend 
                                                    layout={isMobile ? "horizontal" : "vertical"}
                                                    verticalAlign={isMobile ? "bottom" : "middle"}
                                                    align={isMobile ? "left" : "right"}
                                                    iconType="circle"
                                                    content={isMobile ? (props: any) => {
                                                        const { payload } = props;
                                                        return (
                                                            <div className="flex flex-col gap-1 pl-2">
                                                                {payload?.map((entry: any, index: number) => (
                                                                    <div key={`item-${index}`} className="flex items-center gap-2 text-[10px] font-bold">
                                                                        <span 
                                                                            className="w-2.5 h-2.5 rounded-full inline-block shrink-0" 
                                                                            style={{ backgroundColor: entry.color }}
                                                                        />
                                                                        <span style={{ color: entry.color }}>{entry.value}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    } : undefined}
                                                    wrapperStyle={isMobile ? { bottom: '0px', left: '10px' } : { fontSize: '10px', fontWeight: 'bold', lineHeight: '24px', right: '5%' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            {/* Age Distribution Chart */}
                            <div className="bg-gradient-to-br from-muted/5 to-muted/10 p-4 rounded-xl border flex flex-col items-center">
                                <h4 className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/80 w-full text-left">Age Demographics</h4>
                                <div className="h-[140px] w-full mt-2 flex items-end justify-center">
                                    {isLoading ? (
                                        <div className="flex items-end justify-around w-full h-[120px] px-8 pb-2 animate-pulse">
                                            <div className="flex flex-col items-center gap-2 w-12">
                                                <Skeleton className="h-[70px] w-8 rounded-t bg-muted/40 animate-pulse" />
                                                <Skeleton className="h-3 w-10 rounded bg-muted/40 animate-pulse" />
                                            </div>
                                            <div className="flex flex-col items-center gap-2 w-12">
                                                <Skeleton className="h-[40px] w-8 rounded-t bg-muted/40 animate-pulse" />
                                                <Skeleton className="h-3 w-10 rounded bg-muted/40 animate-pulse" />
                                            </div>
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={[
                                                    { name: 'Below 40', value: stats?.registration_stats?.age_below_40 || 0 },
                                                    { name: '40 & Above', value: stats?.registration_stats?.age_40_above || 0 }
                                                ]}
                                                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                                            >
                                                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold', fill: 'currentColor', opacity: 0.7 }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.7 }} axisLine={false} tickLine={false} />
                                                <Tooltip 
                                                    cursor={{ fill: 'var(--primary)', opacity: 0.1 }}
                                                    contentStyle={{ borderRadius: '0px', border: 'none', backgroundColor: 'var(--card)', color: 'var(--foreground)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                                />
                                                <Bar dataKey="value" radius={0} maxBarSize={50}>
                                                    <Cell fill="#d97706" /> {/* Amber */}
                                                    <Cell fill="#9333ea" /> {/* Purple */}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <HugeiconsIcon icon={UserIcon} className="h-5 w-5 text-primary" />
                        Recent Registrations
                    </CardTitle>
                    <CardDescription>Latest patients added</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y border-t max-h-[350px] overflow-y-auto">
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center justify-between p-4 px-6 hover:bg-muted/50 transition-colors animate-pulse">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="w-9 h-9 rounded-full bg-muted/40 animate-pulse" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-3.5 w-28 rounded bg-muted/40 animate-pulse" />
                                            <Skeleton className="h-3 w-16 rounded bg-muted/40 animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton className="h-3 w-16 rounded bg-muted/40 ml-auto animate-pulse" />
                                        <Skeleton className="h-2.5 w-12 rounded bg-muted/40 ml-auto animate-pulse" />
                                    </div>
                                </div>
                            ))
                        ) : stats?.recent_registrations?.length > 0 ? (
                            stats.recent_registrations.map((reg: any) => (
                                <div key={reg.staff_id} className="flex items-center justify-between p-4 px-6 hover:bg-muted/50 transition-colors group/row">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center text-xs font-bold text-primary group-hover/row:bg-primary group-hover/row:text-white transition-all">
                                            {reg.first_name?.[0]}{reg.last_name?.[0]}
                                        </div>
                                        <div className="text-sm">
                                            <p className="font-bold">{reg.first_name} {reg.last_name}</p>
                                            <p className="text-xs text-muted-foreground font-medium">ID: {reg.staff_id}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold text-primary block">{reg.patient_id}</span>
                                        <span className="text-[10px] font-medium text-muted-foreground">{getRelativeTime(reg.created_at)}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center">
                                <p className="text-sm text-muted-foreground italic">No recent registrations found.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Queue List Modal */}
        <Dialog open={isQueueModalOpen} onOpenChange={setIsQueueModalOpen}>
            <DialogContent className="max-w-2xl sm:max-w-[500px] border-primary/20 dashboard-dialog p-4 sm:p-6">
                <DialogHeader className="text-left">
                    <div className="flex items-center gap-3 mb-2 text-left">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <HugeiconsIcon icon={ClipboardIcon} className="w-6 h-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg sm:text-xl font-black tracking-tight">{selectedDept} Queue</DialogTitle>
                            <DialogDescription className="text-[11px] sm:text-xs font-medium"> Patients currently waiting for assessment</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                
                <div className="relative mt-2">
                    <ScrollArea className="h-[400px] px-1">
                        {loadingQueue ? (
                            <div className="space-y-3">
                                {Array.from({ length: 4 }).map((_, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl border bg-card gap-3">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <Skeleton className="w-10 h-10 rounded-xl bg-muted/40 animate-pulse shrink-0" />
                                            <div className="min-w-0 flex-1 flex flex-col gap-2">
                                                <Skeleton className="h-4 w-32 rounded bg-muted/40 animate-pulse" />
                                                <Skeleton className="h-3 w-48 rounded bg-muted/40 animate-pulse" />
                                            </div>
                                        </div>
                                        <Skeleton className="w-8 h-8 rounded-lg bg-muted/40 animate-pulse shrink-0" />
                                    </div>
                                ))}
                            </div>
                        ) : queueEntries.length > 0 ? (
                            <div className="space-y-3">
                                {queueEntries.map((entry, idx) => (
                                    <div key={entry.staff_id} className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl border bg-card hover:bg-muted/10 transition-all duration-300 gap-3 group">
                                        {/* Left Block (Avatar + Info) */}
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="relative shrink-0">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-black text-primary border border-primary/20 transition-transform group-hover:scale-105">
                                                    {entry.first_name?.[0]}{entry.last_name?.[0]}
                                                </div>
                                                <Badge className="absolute -top-2 -left-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-black text-[9px] px-1.5 py-0.5 border border-background h-5 min-w-[20px] flex items-center justify-center shadow-md">
                                                    #{entry.queue_number || '--'}
                                                </Badge>
                                            </div>

                                            <div className="min-w-0 flex-1 flex flex-col justify-center gap-0">
                                                <p className="font-bold text-sm text-foreground tracking-tight truncate whitespace-nowrap leading-tight">{entry.first_name} {entry.last_name}</p>
                                                
                                                <div className="flex items-center justify-between gap-3 mt-0.5 w-full">                                                    {/* ID & Time: stacked on mobile, row on desktop */}
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 text-muted-foreground text-[10px] leading-none shrink-0">
                                                        <span className="font-bold uppercase tracking-wider">ID: {entry.staff_id}</span>
                                                        <span className="hidden sm:inline text-muted-foreground/60">•</span>
                                                        <span className="font-medium flex items-center gap-1">
                                                            <HugeiconsIcon icon={Clock01Icon} className="w-3 h-3 text-muted-foreground/60" />
                                                            {getRelativeTime(entry.created_at)}
                                                        </span>
                                                    </div>
 
                                                    {/* Mobile-only delete button beside stacked ID/time */}
                                                    <div className="flex sm:hidden items-center gap-1.5 shrink-0">
                                                        {hasPermission('delete_from_queue') && (
                                                            <Button 
                                                                size="sm" 
                                                                variant="ghost" 
                                                                className="h-7 w-7 p-0 text-rose-500 hover:text-white hover:bg-rose-500 border border-rose-500/20 hover:border-transparent rounded-lg flex items-center justify-center transition-colors shrink-0"
                                                                onClick={() => handleDeleteQueueEntry(selectedDept || '', entry.staff_id)}
                                                                title="Remove from queue"
                                                            >
                                                                <HugeiconsIcon icon={Delete02Icon} className="w-3 h-3" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
 
                                        {/* Desktop-only delete button centered vertically inside the card */}
                                        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                                            {hasPermission('delete_from_queue') && (
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    className="h-8 w-8 p-0 text-rose-500 hover:text-white hover:bg-rose-500 border border-rose-500/20 hover:border-transparent rounded-lg flex items-center justify-center transition-colors shrink-0"
                                                    onClick={() => handleDeleteQueueEntry(selectedDept || '', entry.staff_id)}
                                                    title="Remove from queue"
                                                >
                                                    <HugeiconsIcon icon={Delete02Icon} className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
                                <HugeiconsIcon icon={ClipboardIcon} className="h-12 w-12 mb-4 text-muted-foreground" />
                                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Queue is Empty</p>
                                <p className="text-xs text-muted-foreground mt-1">No patients are waiting in this department.</p>
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <div className="mt-6 flex justify-end">
                    <Button 
                        variant="ghost" 
                        onClick={() => setIsQueueModalOpen(false)}
                        className="font-black text-xs uppercase tracking-widest"
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
      </div>

      <ActionConfirmModal 
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeletePendingEntry(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Remove from Queue"
        description="Are you sure you want to remove this patient from the queue? This will only remove them from this department's queue."
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
      />
    </MainLayout>
  );
};

export default Dashboard;
