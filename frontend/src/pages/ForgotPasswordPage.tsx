import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity,
  ArrowLeft, 
  Key, 
  Lock, 
  Loader2, 
  ShieldCheck,
  User as UserIcon,
  CheckCircle2,
  X
} from 'lucide-react';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { toast } from 'react-hot-toast';
import { ModeToggle } from '@/components/mode-toggle';
import { useAppContext } from '@/context/AppContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const ForgotPasswordPage = () => {
    const [step, setStep] = useState<'identify' | 'verify' | 'reset'>('identify');
    const [identifier, setIdentifier] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();
    const portal = searchParams.get('portal') || 'staff';
    const navigate = useNavigate();
    const { branding } = useAppContext();

    const handleIdentify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const resp = await axios.post('/forgot-password', { 
                identity: identifier,
                portal: portal
            });
            setUserId(resp.data.user_id);
            toast.success(resp.data.message);
            setStep('verify');
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Account not found");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('/forgot-password/verify', { 
                user_id: userId, 
                otp,
                portal: portal
            });
            toast.success("OTP Verified Successfully");
            setStep('reset');
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Invalid OTP");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        setLoading(true);
        try {
            await axios.post('/forgot-password/reset', { 
                user_id: userId, 
                otp: otp,
                password: password,
                portal: portal
            });
            toast.success("Password Reset Successful. Please Login.");
            navigate(`/login?portal=${portal}`);
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to reset password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-4 right-4">
                <ModeToggle />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Removed external logo - moved into cards */}


                <AnimatePresence mode="wait">
                    {step === 'identify' && (
                        <motion.div
                            key="identify"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                        >
                            <Card className="border-2 shadow-2xl">
                                <CardHeader className="text-center">
                                    <Link to="/" className="flex justify-center mb-4 hover:opacity-80 transition-opacity">
                                        {branding?.logo_light ? (
                                            <img 
                                                src={`${branding.logo_light}`} 
                                                alt="Logo" 
                                                className="h-16 w-auto object-contain" 
                                            />
                                        ) : (
                                            <div className="bg-primary/10 p-2.5 rounded-xl">
                                                <Activity className="w-7 h-7 text-primary" />
                                            </div>
                                        )}
                                    </Link>
                                    <CardTitle className="text-2xl font-black">Password Reset</CardTitle>
                                    <CardDescription>Enter your Username, Email, or Phone to begin.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleIdentify} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="identifier">Account Identity</Label>
                                            <div className="relative group">
                                                <UserIcon className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                <Input 
                                                    id="identifier" 
                                                    placeholder="Username, Email or Phone" 
                                                    className="pl-10 h-11"
                                                    value={identifier}
                                                    onChange={e => setIdentifier(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <Button className="w-full h-11 font-bold" disabled={loading}>
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Identity"}
                                        </Button>
                                    </form>
                                </CardContent>
                                <CardFooter className="flex flex-col gap-2">
                                    <Link to={`/login?portal=${portal}`} className="text-sm font-bold text-muted-foreground hover:text-primary flex items-center gap-1">
                                        <ArrowLeft className="w-4 h-4" /> Back to Login
                                    </Link>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    )}

                    {step === 'verify' && (
                        <motion.div
                            key="verify"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                        >
                            <Card className="border-2 shadow-2xl border-primary/20">
                                <CardHeader className="text-center">
                                    <div className="flex justify-between items-start mb-4">
                                        <Link to="/" className="hover:opacity-80 transition-opacity">
                                            {branding?.logo_light ? (
                                                <img 
                                                    src={`${branding.logo_light}`} 
                                                    alt="Logo" 
                                                    className="h-12 w-auto object-contain" 
                                                />
                                            ) : (
                                                <div className="bg-primary/10 p-2.5 rounded-xl">
                                                    <Activity className="w-5 h-5 text-primary" />
                                                </div>
                                            )}
                                        </Link>
                                        <div className="bg-primary/10 w-fit p-2 rounded-lg text-primary">
                                            <Key className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <CardTitle className="text-2xl font-black">Security Verification</CardTitle>
                                    <CardDescription>Enter the 6-digit OTP sent to your registered email.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleVerify} className="space-y-4">
                                        <div className="space-y-2 text-center">
                                            <Label htmlFor="otp">Verification Code</Label>
                                            <Input 
                                                id="otp" 
                                                placeholder="000000" 
                                                className="text-center text-3xl font-black tracking-[1rem] h-16 border-2 focus-visible:ring-primary rounded-xl"
                                                maxLength={6}
                                                value={otp}
                                                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                                                required
                                            />
                                        </div>
                                        <Button className="w-full h-11 font-bold" disabled={loading}>
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Code"}
                                        </Button>
                                    </form>
                                </CardContent>
                                <CardFooter className="flex flex-col gap-2">
                                    <p className="text-xs text-center text-muted-foreground">Didn't receive the code? Check your spam or <button onClick={() => setStep('identify')} className="text-primary font-bold">try again</button>.</p>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    )}

                    {step === 'reset' && (
                        <motion.div
                            key="reset"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 20, opacity: 0 }}
                        >
                            <Card className="border-2 shadow-2xl border-emerald-500/20">
                                <CardHeader className="text-center">
                                    <div className="flex justify-between items-start mb-4">
                                        <Link to="/" className="hover:opacity-80 transition-opacity">
                                            {branding?.logo_light ? (
                                                <img 
                                                    src={`${branding.logo_light}`} 
                                                    alt="Logo" 
                                                    className="h-12 w-auto object-contain" 
                                                />
                                            ) : (
                                                <div className="bg-emerald-500/10 p-2.5 rounded-xl">
                                                    <Activity className="w-5 h-5 text-emerald-500" />
                                                </div>
                                            )}
                                        </Link>
                                        <div className="flex items-center gap-2 text-emerald-500">
                                            <ShieldCheck className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Final Step</span>
                                        </div>
                                    </div>
                                    <CardTitle className="text-2xl font-black">Secure Reset</CardTitle>
                                    <CardDescription>Define your new account access credentials.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleReset} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="password">New Password</Label>
                                            <div className="relative group">
                                                <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
                                                <Input 
                                                    id="password" 
                                                    type="password" 
                                                    placeholder="••••••••" 
                                                    className="pl-10 h-11"
                                                    value={password}
                                                    onChange={e => setPassword(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <PasswordStrength password={password} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                                            <div className="relative group">
                                                <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
                                                <Input 
                                                    id="confirmPassword" 
                                                    type="password" 
                                                    placeholder="••••••••" 
                                                    className="pl-10 pr-10 h-11"
                                                    value={confirmPassword}
                                                    onChange={e => setConfirmPassword(e.target.value)}
                                                    required
                                                />
                                                <div className="absolute right-3 top-3">
                                                    {confirmPassword && (
                                                        password === confirmPassword ? 
                                                        <CheckCircle2 className="h-5 w-5 text-emerald-500 animate-in zoom-in duration-300" /> : 
                                                        <X className="h-5 w-5 text-rose-500 animate-in zoom-in duration-300" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <Button className="w-full h-11 font-bold bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading}>
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Apply New Password"}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
