import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Clock01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  SmartPhone01Icon,
  Download01Icon,
  Activity01Icon,
  Shield01Icon,
  Note01Icon,
  Calendar03Icon,
  AlertCircleIcon,
  Attachment01Icon,
  Comment01Icon,
  ArrowRight01Icon,
  Link01Icon
} from '@hugeicons/core-free-icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { PatientLayout } from '@/components/layout/PatientLayout';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

const patientQuickLinks = [
  { 
    title: 'Medical Report', 
    description: 'View screening results & lab findings.',
    icon: Note01Icon, 
    path: '/patient/records',
    color: 'bg-primary/10 text-primary border-primary/20'
  },
  { 
    title: 'Technical Files', 
    description: 'Access PDFs & technical attachments.',
    icon: Attachment01Icon, 
    path: '/patient/files',
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
  },
  { 
    title: 'Appointments', 
    description: 'Schedule & manage clinic visits.',
    icon: Calendar03Icon, 
    path: '/patient/appointments',
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/20'
  },
  { 
    title: 'Contact Us', 
    description: 'Get support or submit medical inquiries.',
    icon: Comment01Icon, 
    path: '/patient/contact',
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
  },
];

const PatientDashboard = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    totalReports: 0,
    lastScreening: 'N/A'
  });

  const [profile, setProfile] = useState<any>(null);
  const [reportProgress, setReportProgress] = useState<any>(null);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    // Check if the event was already captured by index.html
    if ((window as any).deferredPWAPrompt) {
      setDeferredPrompt((window as any).deferredPWAPrompt);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handlePromptReady = () => {
      if ((window as any).deferredPWAPrompt) {
        setDeferredPrompt((window as any).deferredPWAPrompt);
      }
    };

    // When app is successfully installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).deferredPWAPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstalled(true);
        (window as any).deferredPWAPrompt = null;
      }
    } catch (err) {
      console.error('PWA install failed:', err);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.username) return;

      // 1. Profile Fetch (Critical)
      try {
        const profileRes = await api.get('/api/patient/profile', {
          headers: { 'X-Staff-ID': user?.username }
        });
        setProfile(profileRes.data);
      } catch (err) {
        console.error("Profile fetch error:", err);
      }

      // 2. Core Stats (Years/Reports)
      try {
        const yearsRes = await api.get('/api/patient/reports/years', {
          headers: { 'X-Staff-ID': user?.username }
        });
        setStats(prev => ({
          ...prev,
          totalReports: yearsRes.data.length,
          lastScreening: yearsRes.data[0] || 'N/A'
        }));
      } catch (err) {
        console.error("Years fetch error:", err);
      }

      // 3. Progress Tracking (Non-blocking)
      try {
        const progressRes = await api.get('/api/patient/report-progress', {
          headers: { 'X-Staff-ID': user?.username }
        });
        setReportProgress(progressRes.data);
      } catch (err) {
        console.error("Progress fetch error:", err);
        setReportProgress({
            percentage: 0,
            points: 0,
            total: 42,
            status: "Report Pending",
            year: new Date().getFullYear(),
            missing_count: 42,
            missing_preview: []
        });
      }
    };

    fetchData();
  }, [user]);

  const getProgressColor = (percent: number) => {
    if (percent < 30) return "#f97316"; // orange-500
    if (percent < 70) return "#6366f1"; // indigo-500
    if (percent < 100) return "#3b82f6"; // blue-500
    return "#10b981"; // emerald-500
  };

  const formatDateTime = (date: Date) => {
    const timeOptions: Intl.DateTimeFormatOptions = { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    };
    const dateOptions: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    
    const timeString = date.toLocaleTimeString('en-US', timeOptions);
    const dateString = date.toLocaleDateString('en-US', dateOptions);
    
    return `${timeString} - ${dateString}`;
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <PatientLayout>
      <div className="space-y-5 animate-in fade-in duration-700 dashboard-page">
        {/* PWA Install Banner — Mobile only */}
        <AnimatePresence>
          {deferredPrompt && !isInstalled && !dismissed && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="block sm:hidden"
            >
              <div className="relative overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent backdrop-blur-md p-4 shadow-xs">
                {/* Dismiss button */}
                <button
                  onClick={() => setDismissed(true)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors z-10"
                  aria-label="Dismiss"
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                </button>
 
                {/* Background decoration */}
                <div className="absolute -right-6 -bottom-6 w-32 h-32 text-primary/[0.06] pointer-events-none">
                  <HugeiconsIcon icon={SmartPhone01Icon} className="w-full h-full" />
                </div>
 
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 border border-primary/20">
                      <HugeiconsIcon icon={Download01Icon} className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-foreground tracking-tight">Install the App</h3>
                      <p className="text-[11px] text-muted-foreground font-medium leading-snug">
                        Get quick access to your health records directly from your home screen.
                      </p>
                    </div>
                  </div>
 
                  <Button
                    onClick={handleInstallClick}
                    className="w-full sm:w-auto h-10 sm:h-9 rounded-lg font-bold text-xs uppercase tracking-wider shadow-xs active:scale-95 transition-all shrink-0 gap-2"
                  >
                    <HugeiconsIcon icon={Download01Icon} className="h-3.5 w-3.5" />
                    Install Now
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Executive Welcome Hero Section - Matching Staff Portal Aesthetic */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-r from-teal-500/10 via-primary/5 to-emerald-500/10 dark:from-teal-950/45 dark:via-card/70 dark:to-emerald-950/30 backdrop-blur-md border border-teal-500/25 dark:border-teal-500/35 p-3.5 sm:p-5 lg:p-6 shadow-xs shadow-teal-500/5 group"
        >
          {/* Subtle Watermark Icon */}
          <div className="absolute -right-8 -bottom-8 w-28 sm:w-44 h-28 sm:h-44 text-primary/[0.06] dark:text-primary/[0.1] pointer-events-none -rotate-12 group-hover:rotate-0 transition-transform duration-1000">
             <HugeiconsIcon icon={Activity01Icon} className="w-full h-full stroke-1" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2 max-w-2xl text-left">
              {/* Badges */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-bold uppercase tracking-wider text-primary shadow-2xs">
                  <HugeiconsIcon icon={Shield01Icon} className="w-2.5 h-2.5" />
                  NHA & NDPA Secured
                </span>
                <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full bg-muted/60 border border-border/60 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Patient Portal • <strong className="text-foreground">{new Date().getFullYear()}</strong>
                </span>
              </div>

              <div>
                <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground leading-tight">
                  Welcome back, {profile?.first_name || user?.first_name}!
                </h1>
                <p className="hidden sm:block text-[11px] sm:text-sm text-muted-foreground font-medium mt-0.5">
                  Access your screening reports, schedule clinical visits, and track your wellness progress.
                </p>
              </div>

              <div className="text-[10px] sm:text-[11px] font-medium text-muted-foreground/90 pt-0 flex items-center gap-1.5">
                <HugeiconsIcon icon={Clock01Icon} className="w-3 h-3 text-primary" />
                <span className="tabular-nums">{formatDateTime(currentTime).replace(' - ', ' | ')}</span>
              </div>
            </div>

            {/* Quick Actions — Hidden on mobile, visible on sm and up */}
            <div className="hidden sm:flex flex-row items-center gap-2 sm:gap-2.5 shrink-0 sm:self-auto mt-1 lg:mt-0">
              <Button 
                variant="outline"
                size="sm"
                className={`rounded-xl font-bold px-3.5 h-9 text-[10px] uppercase tracking-wider shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1.5 ${
                  (reportProgress?.percentage || 0) < 100 
                  ? 'border-border/60 text-muted-foreground opacity-60 cursor-not-allowed' 
                  : 'border-primary/30 hover:border-primary/50 text-primary hover:bg-primary/5'
                }`} 
                onClick={() => {
                  if ((reportProgress?.percentage || 0) < 100) {
                    toast.error("Your report is being compiled, please check back later");
                  } else {
                    navigate('/patient/records');
                  }
                }}
              >
                {(reportProgress?.percentage || 0) < 100 ? <HugeiconsIcon icon={Shield01Icon} className="w-3.5 h-3.5" /> : <HugeiconsIcon icon={Note01Icon} className="w-3.5 h-3.5" />}
                <span>Reports</span>
              </Button>
              <Button 
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold px-3.5 h-9 text-[10px] uppercase tracking-wider shadow-2xs shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-1.5" 
                onClick={() => navigate('/patient/appointments')}
              >
                <HugeiconsIcon icon={Calendar03Icon} className="w-3.5 h-3.5" />
                <span>Book Visit</span>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Report Progress Card - Compact & Responsive */}
        <motion.div variants={item} initial="hidden" animate="show" className="grid grid-cols-1 gap-6">
          <Card className="border border-border/60 shadow-xs rounded-xl overflow-hidden bg-card/60 dark:bg-card/45 backdrop-blur-md transition-colors hover:bg-card/80">
            <CardContent className="p-3 sm:p-4 md:p-5">
              {!reportProgress ? (
                <div className="flex flex-row items-center gap-3 sm:gap-6 animate-pulse w-full">
                  <Skeleton className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-full bg-muted/40 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-28 bg-muted/40 rounded" />
                    <Skeleton className="h-4 w-40 bg-muted/40 rounded" />
                    <div className="flex gap-1.5 pt-0.5">
                      <Skeleton className="h-4 w-16 bg-muted/40 rounded-md" />
                      <Skeleton className="h-4 w-16 bg-muted/40 rounded-md" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-row items-center justify-between gap-2.5 sm:gap-6">
                    {/* Compact Circular Progress */}
                    <div className="relative h-11 w-11 sm:h-16 sm:w-16 md:h-20 md:w-20 shrink-0">
                        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                            <circle className="text-muted/15" strokeWidth="12" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                            <motion.circle 
                                strokeWidth="12" 
                                strokeDasharray={251.2}
                                initial={{ strokeDashoffset: 251.2 }}
                                animate={{ strokeDashoffset: 251.2 - (251.2 * (reportProgress.percentage || 0)) / 100 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                strokeLinecap="round" 
                                stroke={getProgressColor(reportProgress.percentage)} 
                                fill="transparent" 
                                r="40" cx="50" cy="50" 
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-[10px] sm:text-base md:text-xl font-black tracking-tighter leading-none" style={{ color: getProgressColor(reportProgress.percentage) }}>
                                {reportProgress.percentage}%
                             </span>
                        </div>
                    </div>
                    
                    {/* Information Grid */}
                    <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1.5">
                        <div className="space-y-0">
                            <h2 className="text-[8px] sm:text-[10px] md:text-xs font-bold tracking-wider text-muted-foreground uppercase">{reportProgress.year} Screening Status</h2>
                            <p className="text-xs sm:text-base md:text-lg font-bold text-foreground truncate leading-tight">
                                {reportProgress.status}
                            </p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 pt-0.5">
                            <div className="px-1.5 py-0.5 sm:px-2 sm:py-0.5 bg-primary/10 rounded-md border border-primary/20 text-[8px] sm:text-[10px] font-bold text-primary flex items-center gap-1 shadow-2xs">
                                <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                <span>{reportProgress.points}/{reportProgress.total} Items</span>
                            </div>
                            {reportProgress.missing_count > 0 && (
                                <div className="px-1.5 py-0.5 sm:px-2 sm:py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20 text-[8px] sm:text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 shadow-2xs">
                                    <HugeiconsIcon icon={AlertCircleIcon} className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                    <span>{reportProgress.missing_count} Pending</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Action Button - In-row across all screens */}
                    <div className="shrink-0">
                        <Button 
                          size="sm"
                          className="rounded-xl font-bold h-7 sm:h-9 px-2.5 sm:px-4 text-[9px] sm:text-xs uppercase tracking-wider shadow-2xs active:scale-95 transition-all" 
                          onClick={() => {
                            if ((reportProgress?.percentage || 0) < 100) {
                              toast.error("Your report is being compiled, please check back later");
                            } else {
                              navigate('/patient/records');
                            }
                          }}
                          disabled={(reportProgress?.percentage || 0) < 100}
                        >
                            {(reportProgress?.percentage || 0) < 100 ? 'Locked' : 'Details'}
                        </Button>
                    </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Grid - 2 columns even on mobile */}
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-3"
        >
          <motion.div variants={item}>
            <Card className="border border-border/60 shadow-2xs rounded-xl overflow-hidden bg-card/60 dark:bg-card/40 backdrop-blur-sm hover:shadow-xs transition-all">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                   <div className="p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400">
                      <HugeiconsIcon icon={Note01Icon} className="w-3.5 h-3.5" />
                   </div>
                   <span className="text-[8px] md:text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Reports</span>
                </div>
                <div className="space-y-0.5">
                   <h3 className="text-lg md:text-xl font-bold tracking-tight">{stats.totalReports}</h3>
                   <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">Medical Findings</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
 
          <motion.div variants={item}>
            <Card className="border border-border/60 shadow-2xs rounded-xl overflow-hidden bg-card/60 dark:bg-card/40 backdrop-blur-sm hover:shadow-xs transition-all">
              <CardContent className="p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                   <div className="p-1.5 bg-primary/10 border border-primary/20 rounded-lg text-primary">
                      <HugeiconsIcon icon={Calendar03Icon} className="w-3.5 h-3.5" />
                   </div>
                   <span className="text-[8px] md:text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Last Screening</span>
                </div>
                <div className="space-y-0.5">
                   <h3 className="text-lg md:text-xl font-bold tracking-tight">{stats.lastScreening}</h3>
                   <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">Session Record</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Quick Links Section - Matched to Staff Portal */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">Quick Links</h2>
            <div className="h-px flex-1 bg-border/60" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {patientQuickLinks.map((action) => (
              <Card 
                key={action.path}
                className="group cursor-pointer transition-all duration-300 border border-border/60 hover:border-primary/40 rounded-xl overflow-hidden bg-card/50 hover:bg-card/80 backdrop-blur-md shadow-2xs hover:shadow-md hover:-translate-y-0.5 flex flex-col h-full"
                onClick={() => navigate(action.path)}
              >
                <CardHeader className="p-3.5 pb-2.5 flex flex-row items-center gap-3 space-y-0 flex-1">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 ${action.color}`}>
                    <HugeiconsIcon icon={action.icon} className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-bold tracking-tight truncate">{action.title}</CardTitle>
                    <CardDescription className="text-[11px] font-medium text-muted-foreground line-clamp-1 mt-0.5">
                      {action.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-3.5 pt-0 mt-auto">
                  <div className="flex items-center justify-between group-hover:text-primary transition-colors text-muted-foreground/70 border-t border-border/50 pt-2.5">
                    <span className="text-[9px] uppercase font-bold tracking-wider">Open Tool</span>
                    <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </PatientLayout>
  );
};

export default PatientDashboard;
