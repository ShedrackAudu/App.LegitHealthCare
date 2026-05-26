import { useState, useEffect } from 'react';
import { getErrorMessage } from '@/lib/networkError';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Loader2, Lock, User, Activity, ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'react-hot-toast';

import { ModeToggle } from '@/components/mode-toggle';
import { useAppContext } from '@/context/AppContext';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { PasswordMatchIndicator } from '@/components/ui/PasswordMatchIndicator';
import { SafeImage } from '@/components/common/SafeImage';

const loginSchema = z.object({
  identity: z.string().min(3, 'Staff ID, Username, Email or Phone must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginValues = z.infer<typeof loginSchema>;


const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const initialPortal = searchParams.get('portal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempUserId, setTempUserId] = useState<number | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const navigate = useNavigate();
  const { user, setUser, branding } = useAppContext();

  const [portal, setPortal] = useState<'staff' | 'patient' | 'auto'>('auto');

  // Forgot Password State
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'identify' | 'verify' | 'reset'>('identify');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fpUserId, setFpUserId] = useState<string | null>(null);

  // Force Reset State
  const [isForceReset, setIsForceReset] = useState(false);
  const [forceResetData, setForceResetData] = useState<{ newPassword: string; confirmPassword: string }>({
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const portalParam = searchParams.get('portal');
    if (portalParam === 'patient' || portalParam === 'staff') {
      setPortal(portalParam);
    }

    if (searchParams.get('forgot') === 'true') {
      setIsForgotPassword(true);
      setForgotPasswordStep('identify');
    }

    if (user) {
      if (user.must_reset_password) {
        setIsForceReset(true);
      } else if (user.roles?.includes('Patient')) {
        navigate('/patient/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate, searchParams]);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginValues) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/login', {
        ...data,
        portal: portal
      });
      
      const detectedPortal = response.data.portal;

      if (response.data.requires_2fa) {
          setRequires2FA(true);
          setTempUserId(response.data.user_id);
          setPortal(detectedPortal);
          return;
      }
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      }

      if (response.data.user.must_reset_password) {
          setUser(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          setIsForceReset(true);
          return;
      }

      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      const target = detectedPortal === 'patient' ? '/patient/dashboard' : '/dashboard';
      navigate(target); 
    } catch (err: any) {
        if (err._isNetworkError) {
            setError(err._networkMessage);
        } else if (err.response?.status === 403 && err.response?.data?.needs_verification) {
            const { user_id, email, portal: detectedPortal } = err.response.data;
            toast.success("Verification required. A new code has been sent to your email.");
            navigate('/signup', { 
                state: { 
                    resuming: true, 
                    portal: detectedPortal, 
                    user_id, 
                    email 
                } 
            });
        } else if (err.response?.status === 403) {
            setError(err.response?.data?.error || "Your account is not verified.");
        } else {
            setError(getErrorMessage(err, 'Invalid credentials. Please try again.'));
        }
    } finally {
      setLoading(false);
    }
  };

  const handleForceReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forceResetData.newPassword !== forceResetData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/account/force-reset-password', {
        new_password: forceResetData.newPassword
      });

      toast.success("Security hardening complete! Welcome aboard.");
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      const target = response.data.user.roles?.includes('Patient') ? '/patient/dashboard' : '/dashboard';
      navigate(target);
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Failed to update password"));
    } finally {
      setLoading(false);
    }
  };

  const onVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
        const resp = await axios.post('/login/2fa', {
            user_id: tempUserId,
            code: totpCode,
            portal: portal
        });
        
        const detectedPortal = resp.data.portal;
        setUser(resp.data.user);
        localStorage.setItem('user', JSON.stringify(resp.data.user));
        if (resp.data.token) {
          localStorage.setItem('token', resp.data.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${resp.data.token}`;
        }
        toast.success("Login successful!");

        if (resp.data.user.must_reset_password) {
            setIsForceReset(true);
            return;
        }

        const target = detectedPortal === 'patient' ? '/patient/dashboard' : '/dashboard';
        navigate(target);
    } catch (err: any) {
        setError(getErrorMessage(err, "Invalid 2FA code"));
    } finally {
        setLoading(false);
    }
  };

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) return;
    setLoading(true);
    setError(null);
    try {
        const resp = await axios.post('/forgot-password', { 
            identity: identifier,
            portal: portal
        });
        setFpUserId(resp.data.user_id);
        if (resp.data.portal) {
            setPortal(resp.data.portal);
        }
        toast.success(resp.data.message);
        setForgotPasswordStep('verify');
    } catch (err: any) {
        setError(getErrorMessage(err, "Account not found"));
    } finally {
        setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setLoading(true);
    setError(null);
    try {
        await axios.post('/forgot-password/verify', { 
            user_id: fpUserId, 
            otp,
            portal: portal
        });
        toast.success("OTP Verified Successfully");
        setForgotPasswordStep('reset');
    } catch (err: any) {
        setError(getErrorMessage(err, "Invalid OTP"));
    } finally {
        setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // System-wide strong password validation
    const isStrong = (pw: string) => {
        return pw.length >= 8 && 
               /[A-Z]/.test(pw) && 
               /[a-z]/.test(pw) && 
               /[0-9]/.test(pw) && 
               /[^A-Za-z0-9]/.test(pw);
    };

    if (!isStrong(resetPassword)) {
        toast.error("Password must be at least 8 chars long with uppercase, lowercase, digit, and symbol.");
        return;
    }

    if (resetPassword !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
    }

    setLoading(true);
    setError(null);
    try {
        await axios.post('/forgot-password/reset', { 
            user_id: fpUserId, 
            otp: otp,
            password: resetPassword,
            portal: portal
        });
        toast.success("Password Reset Successful! You can now log in.");
        setIsForgotPassword(false);
        setForgotPasswordStep('identify');
        setIdentifier('');
        setOtp('');
        setResetPassword('');
        setConfirmPassword('');
    } catch (err: any) {
        setError(getErrorMessage(err, "Failed to reset password"));
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden grid grid-cols-1 lg:grid-cols-2 bg-background selection:bg-primary/20">
      {/* Left Side: Branding & Visuals */}
      <div className="hidden lg:flex relative overflow-hidden group h-full">
        {/* Background Image with Parallax-like effect */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
          style={{ 
            backgroundImage: branding?.auth_branding_image 
              ? `url(${(window as any).API_BASE_URL}${branding.auth_branding_image})` 
              : `url('https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=2080&auto=format&fit=crop')` 
          }}
        />
        
        {/* Colour Blend Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-transparent mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-transparent to-transparent" />

        {/* Content on Image */}
        <div className="relative z-10 flex flex-col justify-between p-16 w-full text-white">
          <Link to="/" className="flex items-center gap-3 w-fit hover:scale-105 transition-all duration-500">
            {branding?.auth_logo ? (
                <SafeImage 
                  src={`${(window as any).API_BASE_URL}${branding.auth_logo}`} 
                  alt={branding?.clinic_name || "Logo"} 
                  className="h-[62px] w-auto object-contain transition-all hover:scale-105 duration-300" 
                  fallbackText={branding?.clinic_name}
                />
            ) : branding?.logo_dark ? (
                <SafeImage 
                  src={`${(window as any).API_BASE_URL}${branding.logo_dark}`} 
                  alt={branding?.clinic_name || "Logo"} 
                  className="h-[41px] w-auto object-contain transition-all hover:scale-105 duration-300" 
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

          <div className="max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
             <h2 className="text-2xl font-black leading-tight mb-2 tracking-tight">
               Precision Care,<br />
               Seamless Operations.
             </h2>
             <p className="text-sm font-bold text-white/80 italic border-l-4 border-white/30 pl-4 py-1">
               {branding?.clinic_slogan || 'Excellence in Clinical Management.'}
             </p>
             
             <div className="mt-4 flex gap-3 text-[10px] font-black uppercase tracking-widest">
               <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white/70 rounded-full border border-white/10">Secure</span>
               <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white/70 rounded-full border border-white/10">Fast</span>
               <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white/70 rounded-full border border-white/10">Reliable</span>
             </div>
          </div>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 relative overflow-y-auto h-full scrollbar-hide">
        <div className="absolute top-8 right-8">
          <ModeToggle />
        </div>

        <div className="w-full max-w-sm space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
          <div className="text-left space-y-1">
             <Link to="/" className="lg:hidden flex justify-start mb-4 hover:scale-105 transition-transform duration-300">
                 {branding?.logo_light ? (
                    <SafeImage src={`${(window as any).API_BASE_URL}${branding.logo_light}`} alt="Logo" className="h-12 w-auto object-contain" fallbackText={branding?.clinic_name} />
                 ) : (
                    <Activity className="w-12 h-12 text-primary" />
                 )}
             </Link>
             <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
               {isForceReset ? 'Security Update' : 
                isForgotPassword ? (
                  forgotPasswordStep === 'identify' ? 'Password Reset' : 
                  forgotPasswordStep === 'verify' ? 'Verify Identity' : 'New Password'
               ) : 'Sign In'}
             </h1>
             <p className="text-muted-foreground font-medium text-sm sm:text-base">
               {isForceReset ? 'Protect your account with a new password.' :
                isForgotPassword ? (
                  forgotPasswordStep === 'identify' ? 'Enter your details to begin.' : 
                  forgotPasswordStep === 'verify' ? 'Check your email for the code.' : 'Set your new secure password.'
               ) : 'Log in to your account.'}
             </p>
          </div>

          {isForceReset ? (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
               <div className="bg-primary/5 border-2 border-primary/10 rounded-2xl p-4 flex gap-3">
                  <Lock className="h-5 w-5 text-primary shrink-0 mt-1" />
                  <p className="text-[10px] text-primary/80 leading-relaxed font-bold uppercase tracking-wider">
                     Hello {user?.first_name}, for your security, please replace your temporary password with a permanent one.
                  </p>
               </div>

               <form onSubmit={handleForceReset} className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">New Permanent Password</Label>
                      <PasswordStrength password={forceResetData.newPassword} />
                    </div>
                    <div className="relative group">
                      <Input 
                          type="password" 
                          placeholder="••••••••"
                          className="pl-12 h-12 rounded-2xl border-2 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-all bg-muted/20"
                          value={forceResetData.newPassword}
                          onChange={(e) => setForceResetData({ ...forceResetData, newPassword: e.target.value })}
                          disabled={loading} 
                      />
                      <Lock className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Confirm Permanent Password</Label>
                      <PasswordMatchIndicator password={forceResetData.newPassword} confirmPassword={forceResetData.confirmPassword} />
                    </div>
                    <div className="relative group">
                      <Input 
                          type="password" 
                          placeholder="••••••••"
                          className="pl-12 h-12 rounded-2xl border-2 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-all bg-muted/20"
                          value={forceResetData.confirmPassword}
                          onChange={(e) => setForceResetData({ ...forceResetData, confirmPassword: e.target.value })}
                          disabled={loading} 
                      />
                      <Lock className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-14 text-sm font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20" disabled={loading || !forceResetData.newPassword || forceResetData.newPassword !== forceResetData.confirmPassword}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Harden Account'}
                  </Button>
               </form>
            </div>
          ) : !isForgotPassword ? (
            <div className="space-y-6">
                <form onSubmit={requires2FA ? onVerify2FA : handleSubmit(onSubmit)} className="space-y-4">
                  {error && (
                    <div className="bg-destructive/5 border-2 border-destructive/10 text-destructive text-[11px] p-3 rounded-xl font-bold flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                      {error}
                    </div>
                  )}
                  
                  {!requires2FA ? (
                    <>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Staff ID, Username, Email or Phone</Label>
                        <div className="relative group">
                          <Input 
                              id="identity" 
                              placeholder="Staff ID, Username, Email or Phone" 
                              className="pl-12 h-14 rounded-2xl border-2 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-all bg-muted/20"
                              {...register('identity')} 
                              disabled={loading} 
                          />
                          <User className="absolute left-4 top-4.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        </div>
                        {errors.identity && <p className="text-[10px] text-destructive font-black ml-1 uppercase">{errors.identity.message}</p>}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between ml-1">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Password</Label>
                        </div>
                        <div className="relative group">
                          <Input 
                              id="password" 
                              type={showPassword ? "text" : "password"} 
                              placeholder="••••••••"
                              className="pl-12 pr-12 h-14 rounded-2xl border-2 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-all bg-muted/20"
                              {...register('password')} 
                              disabled={loading} 
                          />
                          <Lock className="absolute left-4 top-4.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-4.5 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                            disabled={loading}
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        {errors.password && <p className="text-[10px] text-destructive font-black ml-1 uppercase">{errors.password.message}</p>}
                      </div>

                      <div className="flex justify-end pt-1">
                        <button 
                            type="button"
                            onClick={() => { setIsForgotPassword(true); setForgotPasswordStep('identify'); setError(null); }}
                            className="text-xs text-primary hover:underline font-black uppercase tracking-tighter"
                        >
                            Forgot Password?
                        </button>
                      </div>

                      <Button type="submit" className="w-full h-14 text-sm font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all" disabled={loading}>
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Log In'}
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                      <div className="bg-primary/5 border-2 border-primary/10 rounded-2xl p-4 text-[11px] text-center font-bold text-primary leading-relaxed">
                          Two-Factor Authentication is enabled. Enter the 6-digit code from your authenticator app.
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Authenticator Code</Label>
                        <Input 
                            value={totpCode}
                            onChange={e => setTotpCode(e.target.value)}
                            placeholder="000 000" 
                            className="h-14 text-center text-2xl tracking-[0.5em] font-black rounded-2xl border-2 bg-muted/20 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-primary"
                            maxLength={6}
                            disabled={loading} 
                        />
                      </div>
                      <div className="flex gap-3">
                          <Button type="button" variant="outline" className="w-1/3 h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2" onClick={() => {setRequires2FA(false); setTotpCode(''); setError(null);}} disabled={loading}>
                              Cancel
                          </Button>
                          <Button type="submit" className="w-2/3 h-12 rounded-2xl font-black uppercase tracking-widest" disabled={loading}>
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify'}
                          </Button>
                      </div>
                    </div>
                  )}
                </form>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-left-8 duration-500">
               {error && (
                  <div className="bg-destructive/5 border-2 border-destructive/10 text-destructive text-[11px] p-3 rounded-xl font-bold flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                    {error}
                  </div>
               )}

               {forgotPasswordStep === 'identify' && (
                  <form onSubmit={handleIdentify} className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Staff ID, Username, Email or Phone</Label>
                      <div className="relative group">
                        <Input 
                            placeholder="Staff ID, Username, Email or Phone" 
                            className="pl-12 h-14 rounded-2xl border-2 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-all bg-muted/20"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            disabled={loading} 
                        />
                        <User className="absolute left-4 top-4.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      </div>
                      <p className="text-[10px] text-muted-foreground font-medium px-2">Enter your registered details to receive an OTP.</p>
                    </div>
                    <Button type="submit" className="w-full h-14 text-sm font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20" disabled={loading}>
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify Identity'}
                    </Button>
                    <button 
                        type="button" 
                        onClick={() => setIsForgotPassword(false)} 
                        className="block group w-full mt-2"
                    >
                      <div className="border border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all rounded-xl p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <ArrowLeft className="w-4.5 h-4.5" />
                          </div>
                          <div className="text-left">
                            <p className="text-[9px] font-black text-primary/70 uppercase tracking-widest leading-none mb-0.5">Changed your mind?</p>
                            <p className="text-[13px] font-black tracking-tight text-foreground group-hover:text-primary transition-colors leading-none">Back to Login</p>
                          </div>
                        </div>
                      </div>
                    </button>
                  </form>
               )}

               {forgotPasswordStep === 'verify' && (
                  <form onSubmit={handleVerifyOTP} className="space-y-6">
                    <div className="bg-primary/5 border-2 border-primary/10 rounded-2xl p-4 text-[11px] text-center font-bold text-primary leading-relaxed">
                        Identity confirmed! We've sent a 6-digit code to your registered contact.
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 text-center block">One-Time Password</Label>
                      <Input 
                          placeholder="000 000" 
                          className="h-20 text-center text-4xl tracking-[0.3em] font-black rounded-3xl border-4 focus:border-primary/50 focus-visible:ring-0 focus-visible:ring-offset-0 bg-muted/20"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                          maxLength={6}
                          disabled={loading} 
                      />
                    </div>
                    <Button type="submit" className="w-full h-14 text-sm font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20" disabled={loading || otp.length < 6}>
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm OTP'}
                    </Button>
                    <button 
                        type="button" 
                        onClick={() => setForgotPasswordStep('identify')} 
                        className="w-full text-center text-[10px] font-black uppercase tracking-tighter text-muted-foreground hover:underline"
                    >
                        Wrong Account? Try again.
                    </button>
                  </form>
               )}

               {forgotPasswordStep === 'reset' && (
                  <form onSubmit={handleResetPassword} className="space-y-5">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center mb-1">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">New Password</Label>
                          <PasswordStrength password={resetPassword} />
                        </div>
                        <div className="relative group">
                          <Input 
                              type="password" 
                              placeholder="••••••••"
                              className="pl-12 h-12 rounded-2xl border-2 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-all bg-muted/20"
                              value={resetPassword}
                              onChange={(e) => setResetPassword(e.target.value)}
                              disabled={loading} 
                          />
                          <Lock className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center mb-1">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Confirm New Password</Label>
                          <PasswordMatchIndicator password={resetPassword} confirmPassword={confirmPassword} />
                        </div>
                        <div className="relative group">
                          <Input 
                              type="password" 
                              placeholder="••••••••"
                              className="pl-12 h-12 rounded-2xl border-2 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 transition-all bg-muted/20"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              disabled={loading} 
                          />
                          <Lock className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        </div>
                      </div>
                    </div>
                    
                    <Button type="submit" className="w-full h-14 text-sm font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20" disabled={loading || !resetPassword || resetPassword !== confirmPassword}>
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify & Finish'}
                    </Button>
                    <button 
                        type="button" 
                        onClick={() => setIsForgotPassword(false)} 
                        className="block group w-full mt-4"
                    >
                      <div className="border border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all rounded-xl p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <ArrowLeft className="w-4.5 h-4.5" />
                          </div>
                          <div className="text-left">
                            <p className="text-[9px] font-black text-primary/70 uppercase tracking-widest leading-none mb-0.5">Changed your mind?</p>
                            <p className="text-[13px] font-black tracking-tight text-foreground group-hover:text-primary transition-colors leading-none">Back to Login</p>
                          </div>
                        </div>
                      </div>
                    </button>
                  </form>
               )}
            </div>
          )}

          {!isForgotPassword && (
            <div className="space-y-4 text-left">
                <p className="text-[11px] text-muted-foreground font-bold italic">
                    Don't have an account? Sign Up as:
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <Link 
                        to="/signup?portal=staff" 
                        className="flex flex-row items-center text-left gap-3 p-3 rounded-xl border-2 border-blue-500/20 bg-blue-500/5 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all group shadow-sm"
                    >
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                          <Activity className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 leading-none">Clinical Staff</span>
                          <span className="block text-[8px] font-bold text-muted-foreground leading-none">Management & Care</span>
                        </div>
                    </Link>
                    <Link 
                        to="/signup?portal=patient" 
                        className="flex flex-row items-center text-left gap-3 p-3 rounded-xl border-2 border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all group shadow-sm"
                    >
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                          <User className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 leading-none">Patient</span>
                          <span className="block text-[8px] font-bold text-muted-foreground leading-none">Results & Records</span>
                        </div>
                    </Link>
                </div>
            </div>
          )}
        </div>

        <div className="fixed lg:absolute bottom-2 lg:bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 whitespace-nowrap z-50 px-4 py-2 bg-background/60 backdrop-blur-xl border border-border/40 rounded-full shadow-2xl">
          © 2026 {branding?.clinic_name || 'Legit HealthCare'} • v2.0
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
