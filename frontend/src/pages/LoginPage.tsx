import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Loader2, Lock, User, Activity, Construction } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'react-hot-toast';

import { ModeToggle } from '@/components/mode-toggle';
import { useAppContext } from '@/context/AppContext';

const loginSchema = z.object({
  identity: z.string().min(3, 'Username, Email, or Phone must be at least 3 characters'),
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
  const { user, setUser } = useAppContext();

  const [activePortal, setActivePortal] = useState<'staff' | 'patient'>(initialPortal === 'patient' ? 'patient' : 'staff');

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginValues) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('http://localhost:5000/login', {
        ...data,
        portal: activePortal
      });
      
      if (response.data.requires_2fa) {
          setRequires2FA(true);
          setTempUserId(response.data.user_id);
          // Don't auto-login yet
          return;
      }
      
      // Success - Update context and redirect to Dashboard
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate(activePortal === 'patient' ? '/patient/dashboard' : '/dashboard'); 
    } catch (err: any) {
        if (err.response?.status === 403) {
            setError(err.response?.data?.error || "Your account is not verified. Please check your email.");
        } else {
            setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
        }
    } finally {
      setLoading(false);
    }
  };

  const onVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
        const resp = await axios.post('http://localhost:5000/login/2fa', {
            user_id: tempUserId,
            code: totpCode
        });
        
        setUser(resp.data.user);
        localStorage.setItem('user', JSON.stringify(resp.data.user));
        toast.success("Login successful!");
        navigate(activePortal === 'patient' ? '/patient/dashboard' : '/dashboard');
    } catch (err: any) {
        setError(err.response?.data?.error || "Invalid 2FA code");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8 transition-colors duration-500 selection:bg-primary/20 relative">
      <div className="absolute top-4 right-4 text-xs">
        <ModeToggle />
      </div>
      <div className="w-full max-w-sm">
        <Card className="border-border shadow-xl bg-card">
          <CardHeader className="py-4 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Activity className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Welcome Back</CardTitle>
            <CardDescription className="text-muted-foreground mt-1 text-sm">
              Sign in to your account.
            </CardDescription>
          </CardHeader>
        <CardContent className="py-2">
          <Tabs 
            value={activePortal} 
            onValueChange={(v) => setActivePortal(v as 'staff' | 'patient')} 
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="staff">Clinical Staff</TabsTrigger>
              <TabsTrigger value="patient">Patient Portal</TabsTrigger>
            </TabsList>
            <TabsContent value="staff">
              <form onSubmit={requires2FA ? onVerify2FA : handleSubmit(onSubmit)} className="space-y-4 pt-4">
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-2 rounded-md font-medium">
                    {error}
                  </div>
                )}
                
                {!requires2FA ? (
                  <>
                <div className="space-y-2">
                  <Label htmlFor="identity">Username</Label>
                  <div className="relative">
                    <Input 
                        id="identity" 
                        placeholder="Enter your username" 
                        className="pl-10 h-11"
                        {...register('identity')} 
                        disabled={loading} 
                    />
                    <User className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                  </div>
                  {errors.identity && <p className="text-xs text-destructive font-medium">{errors.identity.message}</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link to="/forgot-password" title="Recover your account password" className="text-xs text-primary hover:underline font-bold">
                        Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••"
                        className="pl-10 pr-10 h-11"
                        {...register('password')} 
                        disabled={loading} 
                    />
                    <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive font-medium">{errors.password.message}</p>}
                </div>

                <Button type="submit" className="w-full h-11 text-base font-bold shadow-sm" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Login'}
                </Button>
              </>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-300 relative">
                <div className="bg-primary/5 border border-primary/20 rounded-md p-3 text-sm text-center mb-4">
                    Two-Factor Authentication is enabled on your account. Please enter the 6-digit code from your authenticator app.
                </div>
                <div className="space-y-2">
                  <Label>Authenticator Code</Label>
                  <Input 
                      value={totpCode}
                      onChange={e => setTotpCode(e.target.value)}
                      placeholder="000000" 
                      className="h-12 text-center text-xl tracking-widest font-mono"
                      maxLength={8}
                      disabled={loading} 
                  />
                </div>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" className="w-1/3 h-11" onClick={() => {setRequires2FA(false); setTotpCode(''); setError(null);}} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" className="w-2/3 h-11 text-base font-bold shadow-sm" disabled={loading}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Verify'}
                    </Button>
                </div>
              </div>
            )}

                <div className="text-sm text-center text-muted-foreground mt-6">
                  Don't have an account?{' '}
                  <Link to="/signup?portal=staff" className="text-primary font-bold hover:underline transition-all">
                    Sign up now
                  </Link>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="patient">
              <form onSubmit={requires2FA ? onVerify2FA : handleSubmit(onSubmit)} className="space-y-4 pt-4">
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-2 rounded-md font-medium">
                    {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="identity-patient">Staff ID</Label>
                  <div className="relative">
                    <Input 
                        id="identity-patient" 
                        placeholder="e.g. 310520" 
                        className="pl-10 h-11"
                        {...register('identity')} 
                        disabled={loading} 
                        onChange={(e) => {
                          e.target.value = e.target.value.replace(/\D/g, '');
                          register('identity').onChange(e);
                        }}
                    />
                    <User className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password-patient">Password</Label>
                  <div className="relative">
                    <Input 
                        id="password-patient" 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••"
                        className="pl-10 pr-10 h-11"
                        {...register('password')} 
                        disabled={loading} 
                    />
                    <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 text-base font-bold shadow-sm" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Login to Patient Portal'}
                </Button>

                <div className="text-sm text-center text-muted-foreground mt-6">
                  Don't have an account?{' '}
                  <Link to="/signup?portal=patient" className="text-primary font-bold hover:underline transition-all">
                    Sign up now
                  </Link>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
          <CardFooter className="flex flex-col space-y-3 py-4 border-t border-border mt-2">
            <div className="text-[10px] text-center text-muted-foreground/50">
              © 2026 Legit HealthCare Services Ltd.
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
