import { motion } from 'framer-motion';
import { Activity, FileText, Calendar, Bell, ArrowRight, Shield, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { PatientLayout } from '@/components/layout/PatientLayout';

const PatientDashboard = () => {
  const { user } = useAppContext();
  const navigate = useNavigate();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <PatientLayout>
      <div className="space-y-8">
        {/* Welcome Hero */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2.5rem] bg-primary p-8 md:p-12 text-primary-foreground shadow-2xl shadow-primary/20"
        >
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center md:text-left">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider">
                 <Shield className="w-3 h-3" /> Secure Health Portal
               </div>
               <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none">
                  Welcome back, <br />
                  <span className="text-white/80">{user?.first_name}!</span>
               </h1>
               <p className="text-lg text-primary-foreground/80 max-w-xl font-medium leading-relaxed">
                  Your health is our priority. Here you can access your screening results, manage your profile, and stay updated with your wellness.
               </p>
            </div>
            <div className="hidden lg:block shrink-0">
               <div className="w-48 h-48 bg-white/10 rounded-[3rem] backdrop-blur-xl border border-white/20 flex items-center justify-center p-8 group hover:scale-105 transition-transform duration-500">
                  <Activity className="w-24 h-24 text-white animate-pulse" />
               </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats/Actions */}
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <motion.div variants={item}>
            <Card className="border-2 hover:border-primary/40 transition-all cursor-pointer group h-full">
              <CardHeader>
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-2 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                  <FileText className="w-6 h-6" />
                </div>
                <CardTitle>Medical Records</CardTitle>
                <CardDescription>View and download your yearly screening results.</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="h-24 flex items-center justify-center bg-muted/30 rounded-xl border border-dashed text-muted-foreground text-xs font-bold uppercase tracking-widest">
                    No New Results
                 </div>
              </CardContent>
              <CardFooter>
                 <Button variant="ghost" className="w-full justify-between" onClick={() => navigate('/patient/records')}>
                    View All <ArrowRight className="w-4 h-4" />
                 </Button>
              </CardFooter>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-2 hover:border-primary/40 transition-all cursor-pointer group h-full">
              <CardHeader>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-2 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                  <Calendar className="w-6 h-6" />
                </div>
                <CardTitle>Appointments</CardTitle>
                <CardDescription>Schedule or manage your clinical consultations.</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                    <p className="text-xs font-bold uppercase tracking-wider">Next Screening:</p>
                    <p className="text-sm font-black mt-1">Pending Schedule</p>
                 </div>
              </CardContent>
              <CardFooter>
                 <Button variant="ghost" className="w-full justify-between">
                    Book Slot <ArrowRight className="w-4 h-4" />
                 </Button>
              </CardFooter>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="border-2 hover:border-primary/40 transition-all cursor-pointer group h-full">
              <CardHeader>
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-2 group-hover:bg-rose-500 group-hover:text-white transition-colors duration-300">
                  <Bell className="w-6 h-6" />
                </div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Stay updated with alerts from the medical team.</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="space-y-3">
                    <div className="p-3 bg-muted rounded-xl flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-emerald-500" />
                       <p className="text-xs font-semibold">Account successfully verified!</p>
                    </div>
                    <div className="p-3 bg-muted rounded-xl flex items-center gap-3 opacity-60">
                       <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                       <p className="text-xs font-semibold">Welcome to the Patient Portal.</p>
                    </div>
                 </div>
              </CardContent>
              <CardFooter>
                 <Button variant="ghost" className="w-full justify-between">
                    Clear All <ArrowRight className="w-4 h-4" />
                 </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </motion.div>

        {/* Support / Info Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
           <div className="p-8 rounded-[2rem] bg-card border-2 border-border/50 space-y-4">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <HelpCircle className="w-5 h-5" />
                 </div>
                 <h3 className="text-xl font-bold">Need Assistance?</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">Our support team and clinic administrators are ready to help you with any issues regarding your records or account access.</p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                 <Button className="rounded-xl font-bold shadow-lg shadow-primary/10">Contact Support</Button>
                 <Button variant="outline" className="rounded-xl font-bold">Portal User Guide</Button>
              </div>
           </div>

           <div className="p-8 rounded-[2rem] bg-emerald-500/5 border-2 border-emerald-500/20 space-y-4 group">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 transition-transform group-hover:rotate-12">
                    <Shield className="w-5 h-5" />
                 </div>
                 <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">Security Checkup</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">Your account is currently protected with a secure password. We recommend enabling Two-Factor Authentication for enhanced security.</p>
              <div className="pt-4">
                 <Button variant="link" className="px-0 font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform" onClick={() => navigate('/patient/account')}>
                    Manage Security Settings <ArrowRight className="ml-2 w-4 h-4" />
                 </Button>
              </div>
           </div>
        </motion.div>
      </div>
    </PatientLayout>
  );
};

export default PatientDashboard;
