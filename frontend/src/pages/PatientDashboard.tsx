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
        {/* Header Section with Live Clock */}
        {/* Header Section - More Compact */}
        <div className="flex flex-row items-center justify-between gap-2 border-b border-primary/5 pb-3">
          <div>
            <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/70">Patient Overview</h2>
            <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-[10px]">
               <HugeiconsIcon icon={Clock01Icon} className="w-3 h-3 text-primary" />
               <span className="tabular-nums">{formatDateTime(currentTime).replace(' - ', ' | ')}</span>
            </div>
          </div>
          <div className="flex gap-1.5">
             <div className="px-2 py-1 bg-primary/10 text-primary rounded-lg border border-primary/10 flex items-center gap-1 text-[9px] font-black">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3 h-3" /> Verified
             </div>
          </div>
        </div>

        {/* PWA Install Banner — prominent on mobile, auto-hides after install */}
        <AnimatePresence>
          {deferredPrompt && !isInstalled && !dismissed && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="block sm:hidden"
            >
              <div className="relative overflow-hidden rounded-xl border-2 border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 shadow-lg shadow-primary/5">
                {/* Dismiss button */}
                <button
                  onClick={() => setDismissed(true)}
                  className="absolute top-2 right-2 p-1 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-foreground transition-colors z-10"
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
                    <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 border border-primary/20">
                      <HugeiconsIcon icon={Download01Icon} className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-foreground tracking-tight">Install the App</h3>
                      <p className="text-[11px] text-muted-foreground font-medium leading-snug">
                        Get quick access to your health records directly from your home screen.
                      </p>
                    </div>
                  </div>
 
                  <Button
                    onClick={handleInstallClick}
                    className="w-full sm:w-auto h-10 sm:h-9 rounded-lg font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20 active:scale-95 transition-all shrink-0 gap-2"
                  >
                    <HugeiconsIcon icon={Download01Icon} className="h-3.5 w-3.5" />
                    Install Now
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Welcome Hero - Compact & Integrated Icon */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary/95 to-primary/90 p-5 md:p-6 text-primary-foreground shadow-xl shadow-primary/20"
        >          {/* Background Integrated Icon and Decorative Circles */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 text-white/[0.07] pointer-events-none -rotate-12 transition-transform duration-1000 group-hover:rotate-0">
            <HugeiconsIcon icon={Activity01Icon} className="w-full h-full stroke-[1.5]" />
          </div>
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-[50px] translate-y-1/2 -translate-x-1/4" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3.5 text-left flex-1">
               <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 text-[9px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10">
                 <HugeiconsIcon icon={Shield01Icon} className="w-2.5 h-2.5" /> NHA & NDPA Secured
               </div>
               <h1 className="text-xl md:text-3xl font-black tracking-tight leading-tight">
                  Welcome back, <br />
                  <span className="text-white/60">{profile?.first_name || user?.first_name}!</span>
               </h1>
               
               <p className="text-[10px] md:text-xs text-primary-foreground/75 max-w-lg font-medium leading-relaxed hidden sm:block">
                  Access your screening reports, schedule clinical visits, and track your wellness progress.
               </p>
            </div>
 
            <div className="flex flex-row gap-2 shrink-0 w-full lg:w-auto mt-0">
               <button 
                 className={`flex-1 lg:flex-none rounded-lg font-black px-3 h-8 text-[9px] uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 ${
                   (reportProgress?.percentage || 0) < 100 
                   ? 'bg-muted text-muted-foreground/50 border border-muted-foreground/10 cursor-not-allowed opacity-80' 
                   : 'bg-white text-primary hover:bg-white/90'
                 }`} 
                 onClick={() => {
                   if ((reportProgress?.percentage || 0) < 100) {
                     toast.error("Your report is being compiled, please check back later");
                   } else {
                     navigate('/patient/records');
                   }
                 }}
               >
                 {(reportProgress?.percentage || 0) < 100 ? <HugeiconsIcon icon={Shield01Icon} className="w-3 h-3" /> : <HugeiconsIcon icon={Note01Icon} className="w-3 h-3" />}
                 Reports
               </button>
               <button className="flex-1 lg:flex-none bg-white/10 border border-white/20 hover:bg-white/20 text-white rounded-lg font-black px-3 h-8 text-[9px] uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-1.5" onClick={() => navigate('/patient/appointments')}>
                 <HugeiconsIcon icon={Calendar03Icon} className="w-3 h-3" /> Book Visit
               </button>
            </div>
          </div>
        </motion.div>





        {/* Report Progress Card - Compact Redesign */}
        <motion.div variants={item} initial="hidden" animate="show" className="grid grid-cols-1 gap-6">
          <Card className="border shadow-lg rounded-xl overflow-hidden bg-gradient-to-br from-card to-primary/5 border-primary/10 transition-colors hover:bg-muted/30">
            <CardContent className="p-3 md:p-5">
              {!reportProgress ? (
                <div className="flex flex-row items-center gap-3 md:gap-10 animate-pulse w-full">
                  <Skeleton className="h-16 w-16 md:h-28 md:w-28 rounded-full bg-muted/40 shrink-0" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-3.5 w-32 bg-muted/40 rounded" />
                    <Skeleton className="h-5 w-48 bg-muted/40 rounded" />
                    <div className="flex gap-2 pt-1">
                      <Skeleton className="h-5 w-20 bg-muted/40 rounded-md" />
                      <Skeleton className="h-5 w-20 bg-muted/40 rounded-md" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-row items-center gap-3 md:gap-10">
                    {/* Compact Circular Progress */}
                    <div className="relative h-16 w-16 md:h-28 md:w-28 shrink-0">
                        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                            <circle className="text-muted/10" strokeWidth="12" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
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
                            <span className="text-[13px] md:text-[27px] font-black tracking-tighter leading-none" style={{ color: getProgressColor(reportProgress.percentage) }}>
                                {reportProgress.percentage}%
                             </span>
                        </div>
                    </div>
                    
                    {/* Information Grid */}
                    <div className="flex-1 min-w-0 space-y-1.5 md:space-y-4">
                        <div className="space-y-0">
                            <h2 className="text-[8px] md:text-[18px] font-black tracking-tighter text-muted-foreground uppercase">{reportProgress.year} SCREENING STATUS</h2>
                            <p className="text-xs md:text-2xl font-black text-foreground truncate">
                                {reportProgress.status}
                            </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-1 md:gap-2">
                            <div className="px-1.5 py-0.5 md:px-3 md:py-1 bg-primary/10 rounded-md border border-primary/20 text-[8px] md:text-[11px] font-black text-primary flex items-center gap-1">
                                <HugeiconsIcon icon={CheckmarkCircle01Icon} className="h-2 w-2 md:h-3.5 md:w-3.5" />
                                {reportProgress.points}/{reportProgress.total} Items
                            </div>
                            {reportProgress.missing_count > 0 && (
                                <div className="px-1.5 py-0.5 md:px-3 md:py-1 bg-amber-500/10 rounded-md border border-amber-500/20 text-[8px] md:text-[11px] font-black text-amber-600 flex items-center gap-1">
                                    <HugeiconsIcon icon={AlertCircleIcon} className="h-2 w-2 md:h-3.5 md:w-3.5" />
                                    {reportProgress.missing_count} Pending
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Action - Desktop only */}
                    <div className="hidden sm:flex shrink-0">
                        <Button 
                          className="rounded-lg font-black h-9 px-4 shadow-xl shadow-primary/10 text-[10px] active:scale-95 transition-all" 
                          onClick={() => {
                            if ((reportProgress?.percentage || 0) < 100) {
                              toast.error("Your report is being compiled, please check back later");
                            } else {
                              navigate('/patient/records');
                            }
                          }}
                          disabled={(reportProgress?.percentage || 0) < 100}
                        >
                            {(reportProgress?.percentage || 0) < 100 ? 'Locked' : 'View Details'}
                        </Button>
                    </div>
                </div>
              )}
              
              {/* Mobile Only Button - Even more compact */}
              {reportProgress && (
                <div className="mt-3 flex sm:hidden">
                    <Button 
                      className="w-full rounded-lg font-black h-8 shadow-md text-[9px] uppercase tracking-wider active:scale-95 transition-all" 
                      onClick={() => {
                        if ((reportProgress?.percentage || 0) < 100) {
                          toast.error("Your report is being compiled, please check back later");
                        } else {
                          navigate('/patient/records');
                        }
                      }}
                      disabled={(reportProgress?.percentage || 0) < 100}
                    >
                        {(reportProgress?.percentage || 0) < 100 ? 'Medical Findings Locked' : 'View Screening Details'}
                    </Button>
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
        >          <motion.div variants={item}>
            <Card className="border shadow-md rounded-lg overflow-hidden bg-card/40 backdrop-blur-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                   <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-600">
                      <HugeiconsIcon icon={Note01Icon} className="w-3.5 h-3.5" />
                   </div>
                   <span className="text-[7px] md:text-[8px] font-black uppercase text-muted-foreground tracking-widest">Reports</span>
                </div>
                <div className="space-y-0">
                   <h3 className="text-lg md:text-xl font-black">{stats.totalReports}</h3>
                   <p className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">Medical Findings</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
 
          <motion.div variants={item}>
            <Card className="border shadow-md rounded-lg overflow-hidden bg-card/40 backdrop-blur-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                   <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                      <HugeiconsIcon icon={Calendar03Icon} className="w-3.5 h-3.5" />
                   </div>
                   <span className="text-[7px] md:text-[8px] font-black uppercase text-muted-foreground tracking-widest">Last Screening</span>
                </div>
                <div className="space-y-0">
                   <h3 className="text-lg md:text-xl font-black">{stats.lastScreening}</h3>
                   <p className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">Session Record</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Quick Links Section - Matched to Staff Portal */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">Quick Links</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {patientQuickLinks.map((action) => (
              <Card 
                key={action.path}
                className="group cursor-pointer transition-all duration-300 border hover:border-primary/20 overflow-hidden bg-card/50 backdrop-blur-sm flex flex-col h-full"
                onClick={() => navigate(action.path)}
              >
                <CardHeader className="p-3.5 pb-2.5 flex flex-row items-center gap-3 space-y-0 flex-1">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${action.color}`}>
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
            ))}
          </div>
        </div>
      </div>
    </PatientLayout>
  );
};

export default PatientDashboard;


