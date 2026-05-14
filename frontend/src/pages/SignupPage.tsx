import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, Loader2, User, Phone, Mail, Lock, ShieldCheck, 
  AtSign, Eye, EyeOff, CheckCircle2, X, Search, Building2, 
  HelpCircle, Calendar, ArrowLeft 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'react-hot-toast';

import { ModeToggle } from '@/components/mode-toggle';
import { useAppContext } from '@/context/AppContext';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { SafeImage } from '@/components/common/SafeImage';

const signupSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores'),
  phone: z.string().min(10, 'Invalid phone number'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special symbol'),
  confirm_password: z.string()
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type SignupValues = z.infer<typeof signupSchema>;

const SignupPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const portal = searchParams.get('portal');
  const [activeTab, setActiveTab] = useState<'staff' | 'patient'>(portal === 'patient' ? 'patient' : 'staff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { user, branding, setUser } = useAppContext();

  // Patient Claim State
  const [patientStep, setPatientStep] = useState<'search' | 'claim' | 'verify'>('search');
  const [patientData, setPatientData] = useState<any>(null);
  const [patientStaffId, setPatientStaffId] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [existingUser, setExistingUser] = useState(false);
  
  // OTP State
  const [otp, setOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(60);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [staffStep, setStaffStep] = useState<'form' | 'verify'>('form');
  const [staffUserId, setStaffUserId] = useState<number | null>(null);
  const [staffEmail, setStaffEmail] = useState('');

  const [claimData, setClaimData] = useState({
    phone: '',
    email: '',
    password: '',
    confirm_password: ''
  });
  const [isStaffSignupEnabled, setIsStaffSignupEnabled] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    let interval: any;
    const isVerifying = (activeTab === 'patient' && patientStep === 'verify') || (activeTab === 'staff' && staffStep === 'verify');
    if (isVerifying && otpTimer > 0 && !canResendOtp) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      setCanResendOtp(true);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [patientStep, staffStep, activeTab, otpTimer, canResendOtp]);

  const handleResendOTP = async () => {
    if (!canResendOtp) return;
    setResendingOtp(true);
    try {
      const email = activeTab === 'patient' ? (claimData.email || patientData.email) : staffEmail;
      const first_name = activeTab === 'patient' ? patientData.first_name : 'Staff Member';
      
      await axios.post(activeTab === 'patient' ? '/api/patient/resend-otp' : '/api/resend-otp', {
        email,
        first_name
      });
      toast.success('New code sent!');
      setOtpTimer(60);
      setCanResendOtp(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to resend');
    } finally {
      setResendingOtp(false);
    }
  };

  const handlePatientVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      toast.error('Enter 6-digit code');
      return;
    }
    setVerifyLoading(true);
    try {
      const resp = await axios.post('/api/patient/verify-otp', {
        ...patientData,
        ...claimData,
        otp
      });
      setVerifySuccess(true);
      toast.success('Verified successfully!');
      setTimeout(() => {
        setUser(resp.data.user);
        navigate('/patient/dashboard');
      }, 2000);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleStaffVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      toast.error('Enter 6-digit code');
      return;
    }
    setVerifyLoading(true);
    try {
      const resp = await axios.post('/verify-otp', {
        user_id: staffUserId,
        otp,
        portal: 'staff'
      });
      setVerifySuccess(true);
      toast.success('Verified successfully!');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setVerifyLoading(false);
    }
  };

  useEffect(() => {
    const checkSignupStatus = async () => {
      try {
        const response = await axios.get('/api/config/staff-signup-status');
        setIsStaffSignupEnabled(response.data.staff_signup_enabled);
      } catch (err) {
        console.error("Failed to check signup status");
      } finally {
        setCheckingStatus(false);
      }
    };
    checkSignupStatus();

    if (user) {
      if (user.roles?.includes('Patient')) {
        navigate('/patient/dashboard');
      } else {
        navigate('/dashboard');
      }
    }

    if (portal === 'patient') {
      setActiveTab('patient');
    } else if (portal === 'staff') {
      setActiveTab('staff');
    }
  }, [user, navigate, portal]);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
  });

  const password = watch('password', '');
  const confirmPassword = watch('confirm_password', '');

  const onSubmit = async (data: SignupValues) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/signup', data);
      setStaffUserId(response.data.user_id);
      setStaffEmail(data.email);
      setStaffStep('verify');
      setOtpTimer(60);
      setCanResendOtp(false);
      toast.success('Account created! Please check your email for the verification code.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!patientStaffId.trim()) {
      toast.error('Please enter your Staff ID');
      return;
    }

    setSearchLoading(true);
    try {
      const response = await axios.get(`/api/patient/search?staff_id=${patientStaffId.trim()}`);
      const data = response.data;
      if (!data) {
        toast.error('Patient records not found in the system.');
        return;
      }
      setPatientData(data);
      setClaimData(prev => ({
        ...prev,
        phone: data.phone || '',
        email: data.email || ''
      }));
      setPatientStep('claim');
      toast.success('Record found! Please complete your profile.');
    } catch (err: any) {
      if (err.response?.status === 409 && err.response?.data?.already_exists) {
        setExistingUser(true);
        toast.error('Account already exists for this Staff ID.');
      } else {
        toast.error(err.response?.data?.error || 'Staff ID not found or server error.');
      }
    } finally {
      setSearchLoading(false);
    }
  };

  const handlePatientClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (claimData.password !== claimData.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    
    const isStrong = (pw: string) => {
        return pw.length >= 8 && 
               /[A-Z]/.test(pw) && 
               /[a-z]/.test(pw) && 
               /[0-9]/.test(pw) && 
               /[^A-Za-z0-9]/.test(pw);
    };

    if (!isStrong(claimData.password)) {
        toast.error('Password must be at least 8 chars long with 1 uppercase, 1 lowercase, 1 digit, and 1 special symbol.');
        return;
    }

    setLoading(true);
    try {
      await axios.post('/api/patient/claim', {
        staff_id: patientStaffId,
        email: claimData.email,
        phone: claimData.phone,
        password: claimData.password,
        first_name: patientData.first_name
      });
      setPatientStep('verify');
      toast.success('Verification code sent to your email!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to claim account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden grid grid-cols-1 lg:grid-cols-2 bg-background selection:bg-primary/20">
      {/* Left Side: Branding & Visuals (Consistent with Login) */}
      <div className="hidden lg:flex relative overflow-hidden group h-full">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
          style={{ 
            backgroundImage: branding?.auth_branding_image 
              ? `url(${(window as any).API_BASE_URL}${branding.auth_branding_image})` 
              : `url('https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=2080&auto=format&fit=crop')` 
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-transparent mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-transparent to-transparent" />

        <div className="relative z-10 flex flex-col justify-between p-16 w-full text-white">
          <Link to="/" className="flex items-center gap-3 w-fit hover:scale-105 transition-all duration-500">
            {branding?.auth_logo ? (
                <SafeImage 
                  src={`${(window as any).API_BASE_URL}${branding.auth_logo}`} 
                  alt={branding?.clinic_name || "Logo"} 
                  className="h-[62px] w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] drop-shadow-[0_6px_10px_rgba(0,0,0,0.3)] transition-all hover:scale-105 duration-300" 
                  fallbackText={branding?.clinic_name}
                />
            ) : branding?.logo_dark ? (
                <SafeImage 
                  src={`${(window as any).API_BASE_URL}${branding.logo_dark}`} 
                  alt={branding?.clinic_name || "Logo"} 
                  className="h-[41px] w-auto object-contain drop-shadow-[0_0_12px_rgba(255,255,255,0.3)] drop-shadow-[0_4px_8px_rgba(0,0,0,0.2)] transition-all hover:scale-105 duration-300" 
                  fallbackText={branding?.clinic_name}
                />
              ) : (
                <div className="flex items-center gap-2">
                   <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/30">
                      <Activity className="w-7 h-7 text-white" />
                   </div>
                   <span className="text-2xl sm:text-3xl font-black tracking-tighter uppercase">{branding?.clinic_name || 'Legit HealthCare'}</span>
                </div>
            )}
          </Link>

          <div className="max-w-md">
             <h2 className="text-2xl font-black leading-tight mb-2 tracking-tight">
               Your Health Journey<br />Starts Here.
             </h2>
             <p className="text-sm font-bold text-white/80 italic border-l-4 border-white/30 pl-4 py-1">
               {branding?.clinic_slogan || 'Empowering Patients through Accessible Data.'}
             </p>

             <div className="mt-4 flex gap-3 text-[10px] font-black uppercase tracking-widest text-white/50">
               <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white/70 rounded-full border border-white/10">Secure</span>
               <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white/70 rounded-full border border-white/10">Fast</span>
               <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white/70 rounded-full border border-white/10">Reliable</span>
             </div>
          </div>
        </div>
      </div>

      {/* Right Side: Signup Form */}
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 relative overflow-y-auto h-full scrollbar-hide">
        <div className="absolute top-8 right-8">
          <ModeToggle />
        </div>

        <div className="w-full max-w-md space-y-6 py-6 animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="text-left space-y-1">
             <Link to="/" className="lg:hidden flex justify-start mb-4 hover:scale-105 transition-transform duration-300">
                 {branding?.logo_light ? (
                    <SafeImage src={`${(window as any).API_BASE_URL}${branding.logo_light}`} alt="Logo" className="h-12 w-auto object-contain" fallbackText={branding?.clinic_name} />
                 ) : (
                    <Activity className="w-12 h-12 text-primary" />
                 )}
             </Link>
             <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {activeTab === 'staff' ? 'Staff Registration' : 'Patient Setup'}
             </h1>
             <p className="text-muted-foreground font-medium text-sm sm:text-base">
                {activeTab === 'staff' ? 'Join the clinical workforce.' : 'Access your medical records securely.'}
             </p>
          </div>

          <div className="w-full">
            {activeTab === 'staff' ? (
              <div className="space-y-4">
                {!isStaffSignupEnabled && !checkingStatus ? (
                  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center justify-center py-6 w-full">
                    <div className="relative w-full">
                      <div className="relative bg-background border-2 border-destructive/20 p-8 rounded-3xl flex flex-col items-center text-center gap-6 overflow-hidden w-full">
                        
                        {/* Decorative background stripes */}
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(220,38,38,0.03)_10px,rgba(220,38,38,0.03)_20px)] pointer-events-none"></div>

                        <div className="relative bg-destructive/10 p-5 rounded-2xl ring-4 ring-destructive/5 mb-2">
                          <ShieldCheck className="w-12 h-12 text-destructive animate-pulse" strokeWidth={2.5} />
                          <div className="absolute -top-2 -right-2 bg-destructive w-5 h-5 rounded-full border-4 border-background flex items-center justify-center">
                            <Lock className="w-2.5 h-2.5 text-white" />
                          </div>
                        </div>
                        
                        <div className="space-y-3 relative z-10">
                          <h3 className="text-2xl font-black text-destructive tracking-tighter uppercase">Registration Locked</h3>
                          <div className="h-1 w-12 bg-destructive/20 rounded-full mx-auto"></div>
                          <p className="text-sm font-semibold text-muted-foreground leading-relaxed">
                            Staff account registration has been temporarily disabled by the system administrator.
                          </p>
                          <p className="text-xs font-bold text-destructive/80 bg-destructive/5 py-2 px-4 rounded-xl inline-block mt-2 border border-destructive/10">
                            Contact IT for manual provisioning
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : staffStep === 'form' ? (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                    {error && (
                      <div className="bg-destructive/5 border-2 border-destructive/10 text-destructive text-[11px] p-3 rounded-xl font-bold flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                        {error}
                      </div>
                    )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">First Name</Label>
                      <div className="relative group">
                        <Input placeholder="John" className="h-12 pl-10 rounded-2xl border-2 bg-muted/20" {...register('first_name')} disabled={loading} />
                        <User className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Last Name</Label>
                      <div className="relative group">
                        <Input placeholder="Doe" className="h-12 pl-10 rounded-2xl border-2 bg-muted/20" {...register('last_name')} disabled={loading} />
                        <User className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Username</Label>
                    <div className="relative group">
                      <Input placeholder="johndoe" className="h-12 pl-10 rounded-2xl border-2 bg-muted/20" {...register('username')} disabled={loading} />
                      <AtSign className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Phone</Label>
                      <div className="relative group">
                        <Input placeholder="080..." className="h-12 pl-10 rounded-2xl border-2 bg-muted/20" {...register('phone')} disabled={loading} />
                        <Phone className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Email</Label>
                      <div className="relative group">
                        <Input type="email" placeholder="john@email.com" className="h-12 pl-10 rounded-2xl border-2 bg-muted/20" {...register('email')} disabled={loading} />
                        <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      </div>
                    </div>
                  </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Password</Label>
                        <div className="relative group">
                          <Input type={showPassword ? "text" : "password"} className="h-12 pl-10 rounded-2xl border-2 bg-muted/20" {...register('password')} disabled={loading} />
                          <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-muted-foreground">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Confirm</Label>
                        <div className="relative group">
                          <Input type={showConfirmPassword ? "text" : "password"} className="h-12 pl-10 rounded-2xl border-2 bg-muted/20" {...register('confirm_password')} disabled={loading} />
                          <ShieldCheck className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-2">
                        <PasswordStrength password={password} />
                      </div>
                      <div className="space-y-2">
                         {(password || confirmPassword) && (
                           <div className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-3 rounded-2xl border-2 transition-all flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300 w-full justify-center ${
                             password === confirmPassword && password.length > 0
                               ? 'bg-primary/10 border-primary/20 text-primary shadow-xl shadow-primary/10' 
                               : 'bg-rose-500/10 border-rose-500/20 text-rose-500 shadow-xl shadow-rose-500/10'
                           }`}>
                             {password === confirmPassword && password.length > 0 ? (
                               <><CheckCircle2 className="w-4 h-4" /> Match</>
                             ) : (
                               <><X className="w-4 h-4" /> mismatch</>
                             )}
                           </div>
                         )}
                      </div>
                    </div>

                    <Button type="submit" className="w-full h-12 rounded-2xl font-black uppercase tracking-widest mt-4 shadow-xl shadow-primary/20" disabled={loading || !isStaffSignupEnabled}>
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create Staff Account'}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <AnimatePresence mode="wait">
                      {!verifySuccess ? (
                        <motion.form
                          key="staff-verify-form"
                          initial={{ opacity: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          onSubmit={handleStaffVerify}
                          className="space-y-6"
                        >
                          <div className="text-left space-y-1">
                             <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-2">
                               <Mail className="w-6 h-6" />
                             </div>
                             <h3 className="text-xl font-black tracking-tight leading-none">Verify Account</h3>
                             <p className="text-xs text-muted-foreground font-medium">
                               We sent a 6-digit code to <br/>
                               <span className="text-foreground font-bold">{staffEmail}</span>
                             </p>
                          </div>

                          <div className="space-y-4">
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder="000000"
                              className="h-20 text-center text-4xl font-black tracking-[1.2rem] border-4 focus:border-primary rounded-2xl bg-muted/20"
                              value={otp}
                              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                              maxLength={6}
                              autoFocus
                            />
                            
                            <Button 
                              type="submit"
                              className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                              disabled={verifyLoading || otp.length < 6}
                            >
                              {verifyLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Continue'}
                            </Button>
                          </div>

                          <div className="flex flex-col items-start gap-4 pt-2">
                            <Button 
                              variant="link" 
                              type="button"
                              className="text-primary font-black uppercase tracking-widest text-[10px] h-auto p-0"
                              disabled={!canResendOtp || resendingOtp}
                              onClick={handleResendOTP}
                            >
                              {resendingOtp ? 'Sending...' : canResendOtp ? 'Resend New Code' : `Resend available in ${otpTimer}s`}
                            </Button>

                            <button 
                              type="button" 
                              onClick={() => setStaffStep('form')} 
                              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                            >
                               <ArrowLeft className="w-3 h-3" /> Back to Signup Form
                            </button>
                          </div>
                        </motion.form>
                      ) : (
                         <motion.div
                           key="staff-success"
                           initial={{ opacity: 0, scale: 0.5 }}
                           animate={{ opacity: 1, scale: 1 }}
                           className="flex flex-col items-start py-6 space-y-4"
                         >
                           <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20">
                             <CheckCircle2 className="w-10 h-10" />
                           </div>
                           <div className="text-left space-y-1">
                             <h3 className="text-2xl font-black text-primary tracking-tight">Verified!</h3>
                             <p className="text-xs font-medium text-muted-foreground italic leading-relaxed pl-3 border-l-2 border-primary/30">
                                Your staff account is now active. <br/> Redirecting to login...
                             </p>
                           </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {patientStep === 'search' ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-primary/5 border-2 border-primary/10 p-5 rounded-2xl flex items-start gap-4">
                      <div className="bg-primary/20 p-2.5 rounded-xl">
                        <Search className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-tight">Record Finder</h4>
                        <p className="text-[11px] text-muted-foreground font-medium leading-relaxed mt-1">Provide your clinic-issued Staff ID to claim your patient profile.</p>
                      </div>
                    </div>

                    <form onSubmit={handlePatientSearch} className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Staff ID Number</Label>
                        <div className="relative group">
                          <Input 
                            placeholder="e.g. 123456" 
                            className="h-16 pl-14 text-2xl font-black rounded-2xl border-2 focus:border-primary transition-all bg-muted/20" 
                            value={patientStaffId}
                            onChange={(e) => setPatientStaffId(e.target.value.replace(/\D/g, ''))}
                            inputMode="numeric"
                          />
                          <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        </div>
                      </div>
                      
                      <Button type="submit" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 group" disabled={searchLoading}>
                        {searchLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Find My Records'}
                      </Button>
                    </form>

                    {existingUser && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-1">
                         <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
                               <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                               <h4 className="text-[11px] font-black uppercase tracking-wider text-rose-500">Account Found</h4>
                               <div className="flex items-center justify-between gap-2 mt-0.5">
                                 <p className="text-[10px] font-medium text-muted-foreground leading-tight">
                                   This Staff ID is already <br /> registered in our portal.
                                 </p>
                                 <button 
                                   onClick={() => navigate('/login?portal=patient')} 
                                   className="text-[9px] font-black uppercase tracking-widest bg-rose-500 text-white px-3 py-1.5 rounded-lg hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20 whitespace-nowrap"
                                 >
                                   Sign In Now
                                 </button>
                               </div>
                            </div>
                         </div>
                      </motion.div>
                    )}
                  </div>
                ) : patientStep === 'claim' ? (
                  <form onSubmit={handlePatientClaim} className="space-y-1 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="bg-primary/5 border-2 border-primary/10 rounded-2xl overflow-hidden">
                      <div className="p-4 flex items-center justify-between border-b border-primary/10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center font-black text-primary uppercase">
                            {patientData?.first_name?.[0]}{patientData?.last_name?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-black leading-none">{patientData?.first_name} {patientData?.middle_name ? patientData.middle_name + ' ' : ''}{patientData?.last_name}</p>
                            <p className="text-[10px] text-muted-foreground font-bold mt-1">Record Found • {patientData?.staff_id}</p>
                          </div>
                        </div>
                        <Badge className="bg-primary text-white font-black text-[10px]">{patientData?.section || 'DCP'}</Badge>
                      </div>

                      <div className="p-4 grid grid-cols-2 gap-4 bg-muted/10 border-t border-primary/5">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Building2 className="w-3 h-3" />
                              <Label className="text-[9px] font-black uppercase tracking-widest">Department</Label>
                            </div>
                            <p className="text-xs font-black text-foreground pl-4.5">{patientData?.department || 'N/A'}</p>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <User className="w-3 h-3" />
                              <Label className="text-[9px] font-black uppercase tracking-widest">Gender</Label>
                            </div>
                            <p className="text-xs font-black text-foreground pl-4.5">{patientData?.gender || 'N/A'}</p>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              <Label className="text-[9px] font-black uppercase tracking-widest">Date of Birth</Label>
                            </div>
                            <p className="text-xs font-black text-foreground pl-4.5">{patientData?.dob || 'N/A'}</p>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <ShieldCheck className="w-3 h-3" />
                              <Label className="text-[9px] font-black uppercase tracking-widest">Record Status</Label>
                            </div>
                            <div className="pl-4.5 flex items-center gap-1.5">
                               <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                               <span className="text-xs font-black text-primary uppercase tracking-tight">Verified</span>
                            </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Phone Number</Label>
                            <div className="relative group">
                              <Input value={claimData.phone} onChange={e => setClaimData({...claimData, phone: e.target.value})} className="h-12 pl-10 rounded-2xl border-2 bg-muted/20 font-bold" />
                              <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                            </div>
                         </div>
                         <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Email Address</Label>
                            <div className="relative group">
                              <Input type="email" value={claimData.email} onChange={e => setClaimData({...claimData, email: e.target.value})} className="h-12 pl-10 rounded-2xl border-2 bg-muted/20" />
                              <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                            </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Password</Label>
                            <div className="relative group">
                              <Input type={showPassword ? "text" : "password"} value={claimData.password} onChange={e => setClaimData({...claimData, password: e.target.value})} className="h-12 pl-10 rounded-2xl border-2 bg-muted/20" />
                              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-muted-foreground">
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                         </div>
                         <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Confirm</Label>
                            <div className="relative group">
                              <Input type={showConfirmPassword ? "text" : "password"} value={claimData.confirm_password} onChange={e => setClaimData({...claimData, confirm_password: e.target.value})} className="h-12 pl-10 rounded-2xl border-2 bg-muted/20" />
                              <ShieldCheck className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3 text-muted-foreground">
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                         </div>
                      </div>

                      {/* Password Strength & Match Indicators */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                         <div className="space-y-2">
                            <PasswordStrength password={claimData.password} />
                         </div>
                         <div className="space-y-2">
                            {(claimData.password || claimData.confirm_password) && (
                              <div className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-3 rounded-2xl border-2 transition-all flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300 w-full justify-center ${
                                claimData.password === claimData.confirm_password && claimData.password.length > 0
                                  ? 'bg-primary/10 border-primary/20 text-primary shadow-xl shadow-primary/10' 
                                  : 'bg-rose-500/10 border-rose-500/20 text-rose-500 shadow-xl shadow-rose-500/10'
                              }`}>
                                {claimData.password === claimData.confirm_password && claimData.password.length > 0 ? (
                                  <><CheckCircle2 className="w-4 h-4" /> Passwords Match</>
                                ) : (
                                  <><X className="w-4 h-4" /> Passwords Do Not Match</>
                                )}
                              </div>
                            )}
                         </div>
                      </div>
                    </div>

                    <Button type="submit" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20" disabled={loading}>
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Claim Account'}
                    </Button>
                    
                    <button type="button" onClick={() => {setPatientStep('search'); setPatientStaffId('');}} className="w-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                      ← Back to Search
                    </button>
                  </form>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <AnimatePresence mode="wait">
                      {!verifySuccess ? (
                        <motion.form
                          key="verify-form"
                          initial={{ opacity: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          onSubmit={handlePatientVerify}
                          className="space-y-6"
                        >
                          <div className="text-left space-y-1">
                             <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-2">
                               <Mail className="w-6 h-6" />
                             </div>
                             <h3 className="text-xl font-black tracking-tight leading-none">Check Your Email</h3>
                             <p className="text-xs text-muted-foreground font-medium">
                               We sent a 6-digit code to <br/>
                               <span className="text-foreground font-bold">{claimData.email || patientData?.email}</span>
                             </p>
                          </div>

                          <div className="space-y-4">
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder="000000"
                              className="h-20 text-center text-4xl font-black tracking-[1.2rem] border-4 focus:border-primary rounded-2xl bg-muted/20"
                              value={otp}
                              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                              maxLength={6}
                              autoFocus
                            />
                            
                            <Button 
                              type="submit"
                              className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                              disabled={verifyLoading || otp.length < 6}
                            >
                              {verifyLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Finish'}
                            </Button>
                          </div>

                          <div className="flex flex-col items-start gap-4 pt-2">
                            <Button 
                              variant="link" 
                              type="button"
                              className="text-primary font-black uppercase tracking-widest text-[10px] h-auto p-0"
                              disabled={!canResendOtp || resendingOtp}
                              onClick={handleResendOTP}
                            >
                              {resendingOtp ? 'Sending...' : canResendOtp ? 'Resend New Code' : `Resend available in ${otpTimer}s`}
                            </Button>

                            <button 
                              type="button" 
                              onClick={() => setPatientStep('claim')} 
                              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                            >
                               <ArrowLeft className="w-3 h-3" /> Change Profile Email / Password
                            </button>
                          </div>
                        </motion.form>
                      ) : (
                         <motion.div
                           key="success"
                           initial={{ opacity: 0, scale: 0.5 }}
                           animate={{ opacity: 1, scale: 1 }}
                           className="flex flex-col items-start py-6 space-y-4"
                         >
                           <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20">
                             <CheckCircle2 className="w-10 h-10" />
                           </div>
                           <div className="text-left space-y-1">
                             <h3 className="text-2xl font-black text-primary tracking-tight">Identity Verified!</h3>
                             <p className="text-xs font-medium text-muted-foreground italic leading-relaxed pl-3 border-l-2 border-primary/30">
                                Claim successful. Syncing your medical <br/> records to your personal dashboard...
                             </p>
                           </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}
          </div>

          <Link to="/login" className="block group w-full mt-2">
            <div className="border border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all rounded-xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <ArrowLeft className="w-4.5 h-4.5" />
                </div>
                <div className="text-left">
                  <p className="text-[9px] font-black text-primary/70 uppercase tracking-widest leading-none mb-0.5">Already have an account?</p>
                  <p className="text-[13px] font-black tracking-tight text-foreground group-hover:text-primary transition-colors leading-none">Back to Login</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="fixed lg:absolute bottom-2 lg:bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 whitespace-nowrap z-50 px-4 py-2 bg-background/60 backdrop-blur-xl border border-border/40 rounded-full shadow-2xl">
          © 2026 {branding?.clinic_name || 'Legit HealthCare'} • v2.0
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
