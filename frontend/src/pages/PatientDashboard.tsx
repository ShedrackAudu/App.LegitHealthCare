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
        const profileRes = await axios.get('http://localhost:5000/api/patient/profile', {
          headers: { 'X-Staff-ID': user?.username }
        });
        setProfile(profileRes.data);
      } catch (err) {
        console.error("Profile fetch error:", err);
      }

      // 2. Core Stats (Years/Reports)
      try {
        const yearsRes = await axios.get('http://localhost:5000/api/patient/reports/years', {
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
        const progressRes = await axios.get('http://localhost:5000/api/patient/report-progress', {
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
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary mb-1">Patient Portal Overview</h2>
            <div className="flex items-center gap-2 text-muted-foreground font-bold">
               <Clock className="w-4 h-4 text-primary" />
               <span className="tabular-nums">{formatDateTime(currentTime)}</span>
            </div>
          </div>
          <div className="flex gap-2">
             <div className="px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-2xl border border-emerald-500/20 flex items-center gap-2 text-xs font-black">
                <CheckCircle2 className="w-4 h-4" /> Account Verified
             </div>
          </div>
        </div>

        {/* Welcome Hero */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-8 md:p-12 text-primary-foreground shadow-2xl shadow-primary/30"
        >
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4" />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="space-y-6 text-center lg:text-left">
               <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 text-xs font-bold uppercase tracking-widest backdrop-blur-md border border-white/10">
                 <Shield className="w-3.5 h-3.5" /> HIPAA Compliant Security
               </div>
               <h1 className="text-4xl md:text-7xl font-black tracking-tight leading-[0.9]">
                  Welcome back, <br />
                  <span className="text-white/70 italic">{profile?.first_name || user?.first_name}!</span>
               </h1>
               {profile && (
                 <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 text-white/80 font-bold">
                   <div className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center gap-2 text-sm">
                     <Activity className="w-4 h-4 text-emerald-400" />
                     {profile.age} Years Old
                   </div>
                   <div className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center gap-2 text-sm capitalize">
                     <User className="w-4 h-4 text-blue-400" />
                     {profile.gender}
                   </div>
                   <div className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center gap-2 text-sm">
                     <Building2 className="w-4 h-4 text-amber-400" />
                     {profile.department}
                   </div>
                 </div>
               )}
               <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl font-medium leading-relaxed">
                  Everything you need to manage your medical journey is right here. 
                  Access your screening reports, schedule clinical visits, and track your wellness progress in real-time.
               </p>
               <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                  <Button size="lg" className="bg-white text-primary hover:bg-white/90 rounded-2xl font-bold px-8 h-14 shadow-xl active:scale-95 transition-all" onClick={() => navigate('/patient/records')}>
                    View Medical Reports
                  </Button>
                  <Button size="lg" variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20 text-white rounded-2xl font-bold px-8 h-14 active:scale-95 transition-all" onClick={() => navigate('/patient/appointments')}>
                    Book Appointment
                  </Button>
               </div>
            </div>
            <div className="hidden xl:block shrink-0">
               <div className="w-64 h-64 bg-white/10 rounded-[4rem] backdrop-blur-2xl border border-white/20 flex items-center justify-center p-12 group hover:scale-105 hover:rotate-3 transition-all duration-700">
                  <Activity className="w-32 h-32 text-white animate-pulse" />
               </div>
            </div>
          </div>
        </motion.div>

        {/* Report Progress Card */}
        <motion.div variants={item} initial="hidden" animate="show" className="grid grid-cols-1 gap-8">
          <Card className="border-2 shadow-xl rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-card to-primary/5 border-primary/10">
            <CardContent className="p-8">
              {!reportProgress ? (
                <div className="flex items-center justify-center h-40">
                  <Activity className="h-8 w-8 animate-spin text-primary/30" />
                  <span className="ml-3 font-bold text-muted-foreground">Calculating Report Status...</span>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="relative h-40 w-40 shrink-0">
                        <svg className="h-full w-full" viewBox="0 0 100 100">
                            <circle className="text-muted/20" strokeWidth="8" stroke="currentColor" fill="transparent" r="42" cx="50" cy="50" />
                            <motion.circle 
                                strokeWidth="8" 
                                strokeDasharray={264}
                                initial={{ strokeDashoffset: 264 }}
                                animate={{ strokeDashoffset: 264 - (264 * (reportProgress.percentage || 0)) / 100 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                strokeLinecap="round" 
                                stroke={getProgressColor(reportProgress.percentage)} 
                                fill="transparent" 
                                r="42" cx="50" cy="50" 
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black tracking-tighter" style={{ color: getProgressColor(reportProgress.percentage) }}>
                                {reportProgress.percentage}%
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Complete</span>
                        </div>
                    </div>
                    
                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">{reportProgress.year} Medical Report Status</h2>
                            <p className="text-lg font-bold text-primary flex items-center justify-center md:justify-start gap-2">
                                <Activity className="h-5 w-5" />
                                {reportProgress.status}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                            <div className="px-4 py-1.5 bg-background/50 rounded-full border border-border text-xs font-bold flex items-center gap-2">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                {reportProgress.points} / {reportProgress.total} Items Filled
                            </div>
                            {reportProgress.missing_count > 0 && (
                                <div className="px-4 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/20 text-xs font-bold text-amber-600 flex items-center gap-2">
                                    <AlertCircle className="h-3 w-3" />
                                    {reportProgress.missing_count} Items Pending
                                </div>
                            )}
                        </div>
                        {reportProgress.percentage < 100 && reportProgress.missing_preview?.length > 0 && (
                            <p className="text-sm text-muted-foreground font-medium">
                                Pending: <span className="text-foreground">{reportProgress.missing_preview.map((m: any) => m.label).join(", ")}...</span>
                            </p>
                        )}
                    </div>
                    
                    <div className="shrink-0 flex flex-col gap-3">
                        <Button className="rounded-xl font-bold h-12 shadow-lg" onClick={() => navigate('/patient/records')}>
                            View Detailed Report
                        </Button>
                    </div>
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
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <motion.div variants={item}>
            <Card className="border-2 border-primary/5 shadow-xl rounded-[2rem] overflow-hidden bg-card/50 backdrop-blur-md">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-4">
                   <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-600">
                      <FileText className="w-6 h-6" />
                   </div>
                   <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Available Reports</span>
                </div>
                <div className="space-y-1">
                   <h3 className="text-4xl font-black">{stats.totalReports}</h3>
                   <p className="text-sm text-muted-foreground font-medium">Digital Medical Findings</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-2 border-primary/5 shadow-xl rounded-[2rem] overflow-hidden bg-card/50 backdrop-blur-md">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-4">
                   <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-600">
                      <TrendingUp className="w-6 h-6" />
                   </div>
                   <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Profile Status</span>
                </div>
                <div className="space-y-3">
                   <h3 className="text-4xl font-black">{stats.profileStatus}%</h3>
                   <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full transition-all duration-1000" style={{ width: `${stats.profileStatus}%` }} />
                   </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-2 border-primary/5 shadow-xl rounded-[2rem] overflow-hidden bg-card/50 backdrop-blur-md">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-4">
                   <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-600">
                      <Calendar className="w-6 h-6" />
                   </div>
                   <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Last Screening</span>
                </div>
                <div className="space-y-1">
                   <h3 className="text-4xl font-black">{stats.lastScreening}</h3>
                   <p className="text-sm text-muted-foreground font-medium">Session Record Year</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Card Links (Similar to Login Style) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
           <motion.div 
             whileHover={{ y: -8, scale: 1.01 }}
             className="group cursor-pointer"
             onClick={() => navigate('/patient/records')}
           >
              <Card className="h-full border-2 border-primary/10 hover:border-primary/40 transition-all rounded-[2.5rem] shadow-xl overflow-hidden">
                 <div className="p-8 flex flex-col md:flex-row gap-8 items-center">
                    <div className="w-24 h-24 shrink-0 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-all duration-500">
                       <FileText className="w-10 h-10" />
                    </div>
                    <div className="space-y-2 text-center md:text-left">
                       <h3 className="text-2xl font-black">Medical Reports</h3>
                       <p className="text-muted-foreground font-medium leading-relaxed">
                          Access your comprehensive health screening reports for all years. Download and verify your results anytime.
                       </p>
                       <div className="pt-2 flex items-center justify-center md:justify-start gap-2 text-primary font-bold text-sm uppercase tracking-wider">
                          Enter Folder <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                       </div>
                    </div>
                 </div>
              </Card>
           </motion.div>

           <motion.div 
             whileHover={{ y: -8, scale: 1.01 }}
             className="group cursor-pointer"
             onClick={() => navigate('/patient/appointments')}
           >
              <Card className="h-full border-2 border-primary/10 hover:border-primary/40 transition-all rounded-[2.5rem] shadow-xl overflow-hidden">
                 <div className="p-8 flex flex-col md:flex-row gap-8 items-center">
                    <div className="w-24 h-24 shrink-0 bg-amber-500/10 rounded-3xl flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all duration-500">
                       <Calendar className="w-10 h-10" />
                    </div>
                    <div className="space-y-2 text-center md:text-left">
                       <h3 className="text-2xl font-black">Booking & Appointments</h3>
                       <p className="text-muted-foreground font-medium leading-relaxed">
                          Schedule new screenings or consultations with our medical staff. Manage your existing bookings with ease.
                       </p>
                       <div className="pt-2 flex items-center justify-center md:justify-start gap-2 text-amber-600 font-bold text-sm uppercase tracking-wider">
                          Schedule Now <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                       </div>
                    </div>
                 </div>
              </Card>
           </motion.div>
        </div>

        {/* Support Alert */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-muted/30 border-2 border-dashed rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-6"
        >
           <div className="p-4 bg-primary/10 rounded-2xl text-primary">
              <AlertCircle className="w-8 h-8" />
           </div>
           <div className="flex-1 text-center md:text-left">
              <h4 className="text-lg font-bold">Important Notice</h4>
              <p className="text-sm text-muted-foreground font-medium">Please ensure your contact information is up to date in the Profile section to receive timely notifications regarding your health tests.</p>
           </div>
           <Button variant="outline" className="rounded-xl font-bold h-12 px-6" onClick={() => navigate('/patient/account')}>
              Update Profile
           </Button>
        </motion.div>
      </div>
    </PatientLayout>
  );
};

export default PatientDashboard;

