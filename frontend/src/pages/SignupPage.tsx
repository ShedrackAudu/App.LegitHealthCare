import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Loader2, User, Phone, Mail, Lock, ShieldCheck, AtSign, Eye, EyeOff, CheckCircle2, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Building2, HelpCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

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

const SignupPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialPortal = searchParams.get('portal');
  const [activeTab, setActiveTab] = useState(initialPortal === 'patient' ? 'patient' : 'staff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { user } = useAppContext();

  // Patient Claim State
  const [patientStep, setPatientStep] = useState<'search' | 'claim'>('search');
  const [patientData, setPatientData] = useState<any>(null);
  const [patientStaffId, setPatientStaffId] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  
  const [claimData, setClaimData] = useState({
    phone: '',
    email: '',
    password: '',
    confirm_password: ''
  });

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

  const handlePatientSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!patientStaffId.trim()) {
      toast.error('Please enter your Staff ID');
      return;
    }

    setSearchLoading(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/patient/search?staff_id=${patientStaffId.trim()}`);
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
      toast.error(err.response?.data?.error || 'Staff ID not found or server error.');
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
    
    if (claimData.password.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
    }

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/patient/claim', {
        staff_id: patientStaffId,
        email: claimData.email,
        password: claimData.password,
        first_name: patientData.first_name
      });
      toast.success(response.data.message);
      navigate('/patient/verify-otp', { 
        state: { 
          patientData, 
          claimData 
        } 
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to claim account.');
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
            <Tabs 
          value={activeTab} 
          onValueChange={(v) => setActiveTab(v as 'staff' | 'patient')} 
          className="w-full"
        >
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
              {patientStep === 'search' ? (
                <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-primary/5 border border-primary/10 p-4 rounded-xl flex items-start gap-3">
                    <div className="bg-primary/20 p-2 rounded-lg">
                      <Search className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">Search Healthcare Records</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">Enter your Staff ID provided by the clinic to find your records and claim your patient account.</p>
                    </div>
                  </div>

                  <form onSubmit={handlePatientSearch} className="space-y-4">
                    <div className="space-y-2">
                       <Label htmlFor="patient_staff_id">Staff ID</Label>
                       <div className="relative group">
                         <Input 
                           id="patient_staff_id" 
                           placeholder="e.g. 12345" 
                           className="h-14 pl-12 text-lg font-bold border-2 focus-visible:ring-primary/20 transition-all" 
                           value={patientStaffId}
                           onChange={(e) => {
                             const val = e.target.value.replace(/\D/g, '');
                             setPatientStaffId(val);
                           }}
                           inputMode="numeric"
                         />
                         <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                       </div>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-11 text-base font-bold shadow-lg shadow-primary/20 group"
                      disabled={searchLoading}
                    >
                      {searchLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Search className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />}
                      Search Records
                    </Button>
                  </form>

                  <div className="p-4 rounded-xl border border-dashed text-center bg-muted/30">
                     <p className="text-[10px] text-muted-foreground font-medium flex items-center justify-center gap-1.5 uppercase tracking-widest">
                       <HelpCircle className="w-3 h-3" /> Need help? Contact your clinic admin
                     </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePatientClaim} className="space-y-4 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-6">
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xs">
                        {patientData?.first_name?.[0]}{patientData?.last_name?.[0]}
                      </div>
                      <div>
                        <p className="text-xs font-bold leading-none">{patientData?.first_name} {patientData?.last_name}</p>
                        <p className="text-[10px] text-muted-foreground">Patient Record Found</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20 h-5">
                      {patientData?.section || 'DCP'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Staff ID</Label>
                      <Input value={patientData.staff_id} disabled className="h-10 bg-muted/50 font-bold border-muted text-xs cursor-not-allowed" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-primary">Assigned Section</Label>
                      <Input value={patientData.section || 'DCP'} disabled className="h-10 bg-primary/5 font-black border-primary/20 text-xs text-primary cursor-not-allowed" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">First Name</Label>
                      <Input value={patientData.first_name} disabled className="h-10 bg-muted/50 font-bold border-muted text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Middle Name</Label>
                      <Input value={patientData.middle_name || 'N/A'} disabled className="h-10 bg-muted/50 font-bold border-muted text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Last Name</Label>
                      <Input value={patientData.last_name} disabled className="h-10 bg-muted/50 font-bold border-muted text-xs" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Department</Label>
                      <Input value={patientData.department} disabled className="h-10 bg-muted/50 font-bold border-muted text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Gender</Label>
                      <Input value={patientData.gender || 'Unknown'} disabled className="h-10 bg-muted/50 font-bold border-muted text-xs" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1.5">
                       <Label className="text-xs font-bold">Date of Birth</Label>
                       <Input value={patientData.dob} disabled className="h-10 bg-muted/50 font-bold border-muted text-xs" />
                     </div>
                     <div className="space-y-1.5">
                        <Label htmlFor="patient_phone" className="text-xs font-bold">Phone Number</Label>
                        <div className="relative">
                          <Input 
                            id="patient_phone" 
                            value={claimData.phone} 
                            onChange={(e) => setClaimData({...claimData, phone: e.target.value})}
                            className="h-10 pl-9 font-bold text-xs" 
                            placeholder="080..."
                            required
                          />
                          <Phone className="absolute left-2.5 top-3 w-4 h-4 text-muted-foreground" />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="patient_email" className="text-xs font-bold">Email Address</Label>
                    <div className="relative">
                      <Input 
                        id="patient_email" 
                        type="email" 
                        value={claimData.email} 
                        onChange={(e) => setClaimData({...claimData, email: e.target.value})}
                        className="h-10 pl-9 text-xs" 
                        placeholder="your@email.com"
                        required
                      />
                      <Mail className="absolute left-2.5 top-3 w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="patient_password" className="text-xs font-bold">Create Password</Label>
                      <div className="relative">
                        <Input 
                          id="patient_password" 
                          type={showPassword ? "text" : "password"} 
                          value={claimData.password} 
                          onChange={(e) => setClaimData({...claimData, password: e.target.value})}
                          className="h-10 pl-9 pr-9 text-xs" 
                        />
                        <Lock className="absolute left-2.5 top-3 w-4 h-4 text-muted-foreground" />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-3 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                          disabled={loading}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <PasswordStrength password={claimData.password} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="patient_confirm" className="text-xs font-bold">Confirm Password</Label>
                      <div className="relative">
                        <Input 
                          id="patient_confirm" 
                          type={showConfirmPassword ? "text" : "password"} 
                          value={claimData.confirm_password} 
                          onChange={(e) => setClaimData({...claimData, confirm_password: e.target.value})}
                          className="h-10 pl-9 pr-9 text-xs" 
                        />
                        <ShieldCheck className="absolute left-2.5 top-3 w-4 h-4 text-muted-foreground" />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-2.5 top-3 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                          disabled={loading}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-11 text-sm font-bold mt-2 shadow-lg shadow-primary/20" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Complete Registration & Claim Account
                  </Button>
                  
                  <button 
                    type="button" 
                    onClick={() => {setPatientStep('search'); setPatientStaffId('');}}
                    className="w-full text-[10px] text-muted-foreground hover:text-primary transition-colors font-bold uppercase tracking-wider"
                  >
                    ← Not your record? Back to Search
                  </button>
                </form>
              )}
            </TabsContent>
          </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3 py-4 border-t border-border mt-2">
            <div className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link to={`/login?portal=${activeTab}`} className="text-primary font-bold hover:underline transition-all">
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
