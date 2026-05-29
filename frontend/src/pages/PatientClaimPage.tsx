import React, { useState, useEffect } from 'react';
import { getErrorMessage } from '@/lib/networkError';
import { useLocation, useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  UserIcon, 
  Mail01Icon, 
  CallIcon, 
  LockIcon, 
  Hash, 
  Calendar03Icon, 
  Building02Icon,
  ArrowRight01Icon
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { useAppContext } from '@/context/AppContext';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { PasswordMatchIndicator } from '@/components/ui/PasswordMatchIndicator';

const PatientClaimPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const patientFound = location.state?.patient;
  const { branding } = useAppContext();

  const [formData, setFormData] = useState({
    staff_id: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    department: '',
    gender: '',
    dob: '',
    section: '',
    phone: '',
    email: '',
    password: '',
    confirm_password: ''
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientFound) {
      navigate('/patient/search');
      return;
    }
    
    // Pre-fill form from patient record
    setFormData(prev => ({
      ...prev,
      ...patientFound,
      section: patientFound.section,
      phone: patientFound.phone || '', // Allow editing these 2
      email: patientFound.email || ''
    }));
  }, [patientFound, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Prevent editing of non-editable fields
    const nonEditable = ['staff_id', 'department', 'dob', 'section'];
    if (nonEditable.includes(name)) return;
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const resp = await api.post('/api/patient/claim', {
        ...formData
      });
      toast.success(resp.data.message);
      // Navigate to OTP verification page
      navigate('/patient/verify-otp', { 
        state: { 
          patientData: formData, 
          claimData: { email: formData.email, password: formData.password } 
        } 
      });
    } catch (err: any) {
      console.error('Claim error:', err);
      toast.error(getErrorMessage(err, 'Failed to initiate account claiming.'));
    } finally {
      setLoading(false);
    }
  };

  if (!patientFound) return null;

  const FieldLabel = ({ children, required = true }: { children: React.ReactNode, required?: boolean }) => (
    <Label className="text-sm font-semibold flex items-center gap-1 mb-2">
      {children} {required && <span className="text-destructive">*</span>}
    </Label>
  );

  return (
    <div className="min-h-screen bg-background py-12 px-4 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 bg-grid-white/[0.02]" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto"
      >
        {/* Removed external title - moved into main card */}


        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form Fields */}
            <Card className="lg:col-span-2 border shadow-lg bg-card/50 backdrop-blur-xl overflow-hidden rounded-2xl">
              {/* Premium Patient Result Header */}
              <div className="p-6 bg-primary/5 border-b border-primary/10 relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary font-bold text-xl">
                      {formData.first_name?.[0]}{formData.last_name?.[0]}
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight text-foreground leading-none">
                        {formData.first_name} {formData.middle_name ? formData.middle_name + ' ' : ''}{formData.last_name}
                      </h2>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Verified Record</span>
                        <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                        <span className="text-[10px] font-black text-muted-foreground tracking-[0.2em]">{formData.staff_id}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`px-3 py-1 rounded-md text-white font-black text-[10px] tracking-[0.2em] shadow-md shadow-primary/10 ${formData.section?.toUpperCase() === 'DCP' ? 'bg-primary' : 'bg-blue-500'}`}>
                    {formData.section?.toUpperCase() || 'N/A'}
                  </div>
                </div>
              </div>

              <CardContent className="space-y-6 pt-6 px-6">
                {/* 1. Verified Bio-Data (read-only) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">Department</Label>
                        <p className="font-bold text-foreground text-sm flex items-center gap-2">
                           <HugeiconsIcon icon={Building02Icon} className="w-3.5 h-3.5 text-primary" /> {formData.department || 'N/A'}
                        </p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">Gender</Label>
                        <p className="font-bold text-foreground text-sm flex items-center gap-2">
                           <HugeiconsIcon icon={UserIcon} className="w-3.5 h-3.5 text-primary" /> {formData.gender || 'N/A'}
                        </p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">Date of Birth</Label>
                        <p className="font-bold text-foreground text-sm flex items-center gap-2">
                           <HugeiconsIcon icon={Calendar03Icon} className="w-3.5 h-3.5 text-primary" /> {formData.dob || 'N/A'}
                        </p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">Staff ID</Label>
                        <p className="font-bold text-foreground text-sm flex items-center gap-2">
                           <HugeiconsIcon icon={Hash} className="w-3.5 h-3.5 text-primary" /> {formData.staff_id}
                        </p>
                    </div>
                </div>

                <div className="h-px bg-border/50 w-full" />

                {/* 2. Contact Verification (Editable) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</Label>
                      <div className="relative">
                        <HugeiconsIcon icon={CallIcon} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                            name="phone" 
                            value={formData.phone} 
                            onChange={handleChange} 
                            required 
                            className="h-11 pl-10 rounded-xl border text-sm font-bold" 
                            placeholder="0803 000 0000" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</Label>
                      <div className="relative">
                        <HugeiconsIcon icon={Mail01Icon} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                            name="email" 
                            type="email" 
                            value={formData.email} 
                            onChange={handleChange} 
                            required 
                            className="h-11 pl-10 rounded-xl border text-sm font-bold" 
                            placeholder="name@company.com" 
                        />
                      </div>
                    </div>
                </div>
              </CardContent>
            </Card>

            {/* Sidebar: Security */}
            <div className="space-y-6">
              <Card className="border shadow-lg bg-primary/5 backdrop-blur-xl rounded-2xl overflow-hidden border-primary/20">
                <CardHeader className="p-6 pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 font-black">
                    <HugeiconsIcon icon={LockIcon} className="w-5 h-5 text-primary" /> Security
                  </CardTitle>
                  <CardDescription className="text-xs font-medium">Set account access password.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-2 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center mb-1">
                      <FieldLabel>Password</FieldLabel>
                      <PasswordStrength password={formData.password} />
                    </div>
                    <Input 
                      name="password" 
                      type="password" 
                      required 
                      value={formData.password} 
                      onChange={handleChange} 
                      className="border rounded-xl h-11 text-sm font-bold" 
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center mb-1">
                      <FieldLabel>Confirm</FieldLabel>
                      <PasswordMatchIndicator password={formData.password} confirmPassword={formData.confirm_password} />
                    </div>
                    <Input 
                      name="confirm_password" 
                      type="password" 
                      required 
                      value={formData.confirm_password} 
                      onChange={handleChange} 
                      className="border rounded-xl h-11 text-sm font-bold"
                      placeholder="••••••••"
                    />
                  </div>
                </CardContent>
                <CardFooter className="p-6 pt-0">
                  <div className="bg-card/80 p-3 rounded-lg border border-primary/10 w-full">
                    <h5 className="text-[9px] font-black uppercase tracking-widest text-primary mb-1.5">Requirements:</h5>
                    <ul className="text-[9px] space-y-1 text-muted-foreground font-semibold">
                        <li className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-primary" /> 8+ characters long</li>
                        <li className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-primary" /> Case sensitive mixed</li>
                    </ul>
                  </div>
                </CardFooter>
              </Card>

              <Button 
                type="submit" 
                className="w-full h-14 text-lg font-black rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.01] transition-all"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Complete Registration'} <HugeiconsIcon icon={ArrowRight01Icon} className="ml-2 w-5 h-5" />
              </Button>
              
              <div className="p-4 border border-dashed rounded-xl bg-muted/50 text-center">
                 <p className="text-[10px] text-muted-foreground font-medium italic leading-relaxed">
                   "By completing this process, you agree to our Terms regarding sensitive medical data."
                 </p>
              </div>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default PatientClaimPage;
