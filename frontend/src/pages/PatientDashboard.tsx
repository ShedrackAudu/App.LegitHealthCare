import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  FileText, 
  Calendar, 
  ArrowRight, 
  Shield, 
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  User,
  Building2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { PatientLayout } from '@/components/layout/PatientLayout';
import axios from 'axios';

const PatientDashboard = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    totalReports: 0,
    profileStatus: 85,
    lastScreening: 'N/A'
  });

  const [profile, setProfile] = useState<any>(null);
  const [reportProgress, setReportProgress] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.username) return;

      // 1. Profile Fetch (Critical)
      try {
        const profileRes = await axios.get('/api/patient/profile', {
          headers: { 'X-Staff-ID': user?.username }
        });
        setProfile(profileRes.data);
      } catch (err) {
        console.error("Profile fetch error:", err);
      }

      // 2. Core Stats (Years/Reports)
      try {
        const yearsRes = await axios.get('/api/patient/reports/years', {
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
        const progressRes = await axios.get('/api/patient/report-progress', {
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
      <div className="space-y-8 animate-in fade-in duration-700">
        {/* Header Section with Live Clock */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Patient Portal Overview</h2>
            <div className="flex items-center gap-2 text-muted-foreground font-bold text-xs">
               <Clock className="w-3.5 h-3.5 text-primary" />
               <span className="tabular-nums">{formatDateTime(currentTime)}</span>
            </div>
          </div>
          <div className="flex gap-2">
             <div className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-xl border border-emerald-500/20 flex items-center gap-2 text-[10px] font-black">
                <CheckCircle2 className="w-3.5 h-3.5" /> Account Verified
             </div>
          </div>
        </div>

        {/* Welcome Hero - Compact & Integrated Icon */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/95 to-primary/90 p-5 md:p-8 text-primary-foreground shadow-xl shadow-primary/20"
        >
          {/* Background Integrated Icon and Decorative Circles */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 text-white/[0.07] pointer-events-none -rotate-12 transition-transform duration-1000 group-hover:rotate-0">
            <Activity className="w-full h-full stroke-[1.5]" />
          </div>
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-[50px] translate-y-1/2 -translate-x-1/4" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3.5 text-left flex-1">
               <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 text-[9px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10">
                 <Shield className="w-2.5 h-2.5" /> HIPAA Secured
               </div>
               <h1 className="text-xl md:text-4xl font-black tracking-tight leading-[1.1]">
                  Welcome back, <br />
                  <span className="text-white/60 italic">{profile?.first_name || user?.first_name}!</span>
               </h1>
               
               <p className="text-xs md:text-sm text-primary-foreground/75 max-w-lg font-medium leading-relaxed">
                  Access your screening reports, schedule clinical visits, and track your wellness progress right here.
               </p>
            </div>

            <div className="flex lg:flex-row gap-2.5 shrink-0 w-full lg:w-auto mt-1.5 lg:mt-0">
               <button className="flex-[1.4] lg:flex-none bg-white text-primary hover:bg-white/90 rounded-xl font-black px-2 md:px-5 h-10 text-[10px] md:text-[11px] uppercase tracking-wider shadow-lg active:scale-95 transition-all whitespace-nowrap" onClick={() => navigate('/patient/records')}>
                 Medical Reports
               </button>
               <button className="flex-1 lg:flex-none bg-white/10 border border-white/20 hover:bg-white/20 text-white rounded-xl font-black px-2 md:px-5 h-10 text-[10px] md:text-[11px] uppercase tracking-wider active:scale-95 transition-all whitespace-nowrap" onClick={() => navigate('/patient/appointments')}>
                 Book Visit
               </button>
            </div>
          </div>
        </motion.div>

        {/* Report Progress Card - Compact Redesign */}
        <motion.div variants={item} initial="hidden" animate="show" className="grid grid-cols-1 gap-6">
          <Card className="border shadow-lg rounded-2xl overflow-hidden bg-gradient-to-br from-card to-primary/5 border-primary/10 transition-colors hover:bg-muted/30">
            <CardContent className="p-4 md:p-6">
              {!reportProgress ? (
                <div className="flex items-center justify-center h-24">
                  <Activity className="h-5 w-5 animate-spin text-primary/30" />
                  <span className="ml-2.5 text-xs font-black text-muted-foreground uppercase tracking-wider">Analyzing...</span>
                </div>
              ) : (
                <div className="flex flex-row items-center gap-4 md:gap-10">
                    {/* Compact Circular Progress */}
                    <div className="relative h-20 w-20 md:h-32 md:w-32 shrink-0">
                        <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                            <circle className="text-muted/10" strokeWidth="10" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                            <motion.circle 
                                strokeWidth="10" 
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
                            <span className="text-lg md:text-3xl font-black tracking-tighter" style={{ color: getProgressColor(reportProgress.percentage) }}>
                                {reportProgress.percentage}%
                            </span>
                            <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground hidden md:block">Done</span>
                        </div>
                    </div>
                    
                    {/* Information Grid */}
                    <div className="flex-1 min-w-0 space-y-2 md:space-y-4">
                        <div className="space-y-0.5">
                            <h2 className="text-xs md:text-xl font-black tracking-tight text-muted-foreground uppercase">{reportProgress.year} Medical Status</h2>
                            <p className="text-sm md:text-2xl font-black text-foreground truncate">
                                {reportProgress.status}
                            </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5 md:gap-2">
                            <div className="px-2 py-0.5 md:px-3 md:py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-[9px] md:text-[11px] font-black text-emerald-600 flex items-center gap-1.5">
                                <CheckCircle2 className="h-2.5 w-2.5 md:h-3.5 md:w-3.5" />
                                {reportProgress.points}/{reportProgress.total} Items
                            </div>
                            {reportProgress.missing_count > 0 && (
                                <div className="px-2 py-0.5 md:px-3 md:py-1 bg-amber-500/10 rounded-lg border border-amber-500/20 text-[9px] md:text-[11px] font-black text-amber-600 flex items-center gap-1.5">
                                    <AlertCircle className="h-2.5 w-2.5 md:h-3.5 md:w-3.5" />
                                    {reportProgress.missing_count} Pending
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Action - Hidden on super small mobile if needed, or compact */}
                    <div className="hidden sm:flex shrink-0">
                        <Button 
                          className="rounded-xl font-black h-11 px-6 shadow-xl shadow-primary/10 text-xs active:scale-95 transition-all" 
                          onClick={() => navigate('/patient/records')}
                        >
                            View Details
                        </Button>
                    </div>
                </div>
              )}
              
              {/* Mobile Only Button */}
              {reportProgress && (
                <div className="mt-4 flex sm:hidden">
                    <Button 
                      className="w-full rounded-xl font-black h-10 shadow-lg text-xs active:scale-95 transition-all" 
                      onClick={() => navigate('/patient/records')}
                    >
                        View Details
                    </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Dynamic Metrics */}
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          <motion.div variants={item}>
            <Card className="border shadow-lg rounded-xl overflow-hidden bg-card/50 backdrop-blur-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                   <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-600">
                      <FileText className="w-5 h-5" />
                   </div>
                   <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Available Reports</span>
                </div>
                <div className="space-y-1">
                   <h3 className="text-2xl sm:text-3xl font-black">{stats.totalReports}</h3>
                   <p className="text-xs text-muted-foreground font-medium">Medical Findings</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border shadow-lg rounded-xl overflow-hidden bg-card/50 backdrop-blur-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                   <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-600">
                      <TrendingUp className="w-5 h-5" />
                   </div>
                   <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Profile Status</span>
                </div>
                <div className="space-y-2">
                   <h3 className="text-2xl sm:text-3xl font-black">{stats.profileStatus}%</h3>
                   <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full transition-all duration-1000" style={{ width: `${stats.profileStatus}%` }} />
                   </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border shadow-lg rounded-xl overflow-hidden bg-card/50 backdrop-blur-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                   <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600">
                      <Calendar className="w-5 h-5" />
                   </div>
                   <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Last Screening</span>
                </div>
                <div className="space-y-1">
                   <h3 className="text-2xl sm:text-3xl font-black">{stats.lastScreening}</h3>
                   <p className="text-xs text-muted-foreground font-medium">Session Record</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Card Links (Similar to Login Style) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
           <motion.div 
             whileHover={{ y: -4, scale: 1.01 }}
             className="group cursor-pointer"
             onClick={() => navigate('/patient/records')}
           >
              <Card className="h-full border border-primary/10 hover:border-primary/40 transition-all rounded-2xl shadow-lg overflow-hidden">
                 <div className="p-6 flex flex-col md:flex-row gap-6 items-center">
                    <div className="w-16 h-16 shrink-0 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-all duration-500">
                       <FileText className="w-7 h-7" />
                    </div>
                    <div className="space-y-1.5 text-center md:text-left">
                       <h3 className="text-lg font-black tracking-tight">Medical Reports</h3>
                       <p className="text-[13px] text-muted-foreground font-medium leading-relaxed">
                          Access your comprehensive health screening reports for all years. Download and verify your results.
                       </p>
                       <div className="pt-1.5 flex items-center justify-center md:justify-start gap-1.5 text-primary font-bold text-[10px] uppercase tracking-wider">
                          Enter Folder <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
                       </div>
                    </div>
                 </div>
              </Card>
           </motion.div>

           <motion.div 
             whileHover={{ y: -4, scale: 1.01 }}
             className="group cursor-pointer"
             onClick={() => navigate('/patient/appointments')}
           >
              <Card className="h-full border border-primary/10 hover:border-primary/40 transition-all rounded-2xl shadow-lg overflow-hidden">
                 <div className="p-6 flex flex-col md:flex-row gap-6 items-center">
                    <div className="w-16 h-16 shrink-0 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all duration-500">
                       <Calendar className="w-7 h-7" />
                    </div>
                    <div className="space-y-1.5 text-center md:text-left">
                       <h3 className="text-lg font-black tracking-tight">Appointments</h3>
                       <p className="text-[13px] text-muted-foreground font-medium leading-relaxed">
                          Schedule new screenings or consultations with our medical staff. Manage your existing bookings.
                       </p>
                       <div className="pt-1.5 flex items-center justify-center md:justify-start gap-1.5 text-amber-600 font-bold text-[10px] uppercase tracking-wider">
                          Schedule Now <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
                       </div>
                    </div>
                 </div>
              </Card>
           </motion.div>
        </div>

        {/* Support Alert */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-muted/30 border border-dashed rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4"
        >
           <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <AlertCircle className="w-6 h-6" />
           </div>
           <div className="flex-1 text-center md:text-left">
              <h4 className="text-base font-bold">Important Notice</h4>
              <p className="text-xs text-muted-foreground font-medium">Please ensure your contact information is up to date in the Profile section to receive timely notifications.</p>
           </div>
           <Button variant="outline" className="rounded-xl font-bold h-10 px-6 text-xs" onClick={() => navigate('/patient/account')}>
              Update Profile
           </Button>
        </motion.div>
      </div>
    </PatientLayout>
  );
};

export default PatientDashboard;

