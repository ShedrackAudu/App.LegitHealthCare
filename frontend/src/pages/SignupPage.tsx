import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Loader2, User, Phone, Mail, Lock, ShieldCheck, AtSign, Eye, EyeOff, CheckCircle2, X, Construction } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ModeToggle } from '@/components/mode-toggle';
import { useAppContext } from '@/context/AppContext';
import { PasswordStrength } from '@/components/ui/PasswordStrength';

const signupSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
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

const SignupPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { user } = useAppContext();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
  });

  const password = watch('password', '');
  const confirmPassword = watch('confirm_password', '');

  const onSubmit = async (data: SignupValues) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('http://localhost:5000/signup', data);
      navigate('/verify-otp', { state: { userId: response.data.user_id } });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8 transition-colors duration-500 selection:bg-primary/20 relative">
      <div className="absolute top-4 right-4 text-xs">
        <ModeToggle />
      </div>
      <div className="w-full max-w-lg">
        <Card className="border-border shadow-xl bg-card">
          <CardHeader className="py-4 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Activity className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardDescription className="text-center text-muted-foreground mt-1 text-sm">
              Please choose your account type to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="py-2">
            <Tabs defaultValue="staff" className="w-full mb-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="staff">Clinic Staff</TabsTrigger>
                    <TabsTrigger value="patient">Patient</TabsTrigger>
                </TabsList>
                <TabsContent value="staff">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-2 rounded-md mb-2 font-medium animate-in fade-in slide-in-from-top-1">
                  {error}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <div className="relative">
                    <Input id="first_name" placeholder="John" className="pl-10 h-12" {...register('first_name')} disabled={loading} />
                    <User className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                  </div>
                  {errors.first_name && <p className="text-xs text-destructive font-medium">{errors.first_name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <div className="relative">
                    <Input id="last_name" placeholder="Doe" className="pl-10 h-12" {...register('last_name')} disabled={loading} />
                    <User className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                  </div>
                  {errors.last_name && <p className="text-xs text-destructive font-medium">{errors.last_name.message}</p>}
                </div>
              </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <Input id="username" placeholder="johndoe123" className="pl-10 h-12" {...register('username')} disabled={loading} />
                <AtSign className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
              </div>
              {errors.username && <p className="text-xs text-destructive font-medium">{errors.username.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Input 
                  id="phone" 
                  placeholder="080..." 
                  className="pl-10 h-12 font-bold" 
                  {...register('phone')} 
                  inputMode="numeric"
                  onChange={(e) => {
                    e.target.value = e.target.value.replace(/\D/g, '');
                    register('phone').onChange(e);
                  }}
                  disabled={loading} 
                />
                <Phone className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
              </div>
              {errors.phone && <p className="text-xs text-destructive font-medium">{errors.phone.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Input id="email" type="email" placeholder="john@example.com" className="pl-10 h-12" {...register('email')} disabled={loading} />
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
              </div>
              {errors.email && <p className="text-xs text-destructive font-medium">{errors.email.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
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
                <PasswordStrength password={password} />
                {errors.password && <p className="text-xs text-destructive font-medium">{errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm Password</Label>
                <div className="relative">
                  <Input 
                    id="confirm_password" 
                    type={showConfirmPassword ? "text" : "password"} 
                    className="pl-10 pr-10 h-11" 
                    {...register('confirm_password')} 
                    disabled={loading} 
                  />
                  <ShieldCheck className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3.5 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                  <div className="absolute right-10 top-3">
                    {confirmPassword && (
                        password === confirmPassword ? 
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 animate-in zoom-in duration-300" /> : 
                        <X className="h-5 w-5 text-rose-500 animate-in zoom-in duration-300" />
                    )}
                  </div>
                </div>
                {errors.confirm_password && <p className="text-xs text-destructive font-medium">{errors.confirm_password.message}</p>}
              </div>
            </div>

              <Button type="submit" className="w-full h-11 text-base font-bold mt-4 shadow-sm" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Create Account'}
              </Button>
            </form>
            </TabsContent>
            <TabsContent value="patient">
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in duration-500">
                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center">
                  <Construction className="w-8 h-8 text-amber-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold tracking-tight">Patient Registration Coming Soon</h3>
                  <p className="text-sm text-muted-foreground max-w-[280px]">
                    We are currently developing the patient registration portal. Access to your medical reports will be available soon.
                  </p>
                </div>
                <div className="pt-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">
                        Under Development
                    </span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3 py-4 border-t border-border mt-2">
            <div className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-bold hover:underline transition-all">
                Sign in
              </Link>
            </div>
            <div className="text-[10px] text-center text-muted-foreground/50">
              © 2026 Legit HealthCare Services Ltd.
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default SignupPage;
