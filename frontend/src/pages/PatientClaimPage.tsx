import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, Hash, Calendar, Building, MapPin, Check, AlertCircle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAppContext } from '@/context/AppContext';

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
      const resp = await axios.post('/api/patient/claim', {
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
      toast.error(err.response?.data?.error || 'Failed to initiate account claiming.');
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
            <Card className="lg:col-span-2 border-2 border-border/50 shadow-xl shadow-foreground/5 bg-card/50 backdrop-blur-xl">
              <CardHeader className="border-b bg-muted/30">
                <div className="flex justify-between items-start mb-6">
                  {branding?.logo_light ? (
                    <img 
                      src={`${branding.logo_light}`} 
                      alt="Logo" 
                      className="h-12 w-auto object-contain" 
                    />
                  ) : (
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                  )}
                  <div className="text-right">
                    <CardTitle className="text-2xl font-black">Complete Your Profile</CardTitle>
                    <CardDescription>Finish claiming your account by verifying your info.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                <div className="space-y-2">
                  <FieldLabel>Staff ID</FieldLabel>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input name="staff_id" value={formData.staff_id} readOnly className="pl-10 bg-muted/50 border-primary/20 cursor-not-allowed font-medium" />
                  </div>
                </div>

                <div className="space-y-2">
                    <FieldLabel>Section</FieldLabel>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input name="section" value={formData.section} readOnly className="pl-10 bg-muted/50 border-primary/20 cursor-not-allowed font-medium" />
                    </div>
                </div>

                <div className="space-y-2">
                  <FieldLabel>First Name</FieldLabel>
                  <Input name="first_name" value={formData.first_name} readOnly className="bg-muted/50 cursor-not-allowed" />
                </div>

                <div className="space-y-2">
                  <FieldLabel>Last Name</FieldLabel>
                  <Input name="last_name" value={formData.last_name} readOnly className="bg-muted/50 cursor-not-allowed" />
                </div>

                <div className="space-y-2">
                  <FieldLabel>Middle Name</FieldLabel>
                  <Input name="middle_name" value={formData.middle_name || ''} readOnly className="bg-muted/50 cursor-not-allowed" />
                </div>

                <div className="space-y-2">
                  <FieldLabel>Department</FieldLabel>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input name="department" value={formData.department} readOnly className="pl-10 bg-muted/50 border-primary/20 cursor-not-allowed" />
                  </div>
                </div>

                <div className="space-y-2">
                  <FieldLabel>Gender</FieldLabel>
                  <Input name="gender" value={formData.gender} readOnly className="bg-muted/50 cursor-not-allowed" />
                </div>

                <div className="space-y-2">
                  <FieldLabel>Date of Birth</FieldLabel>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input name="dob" value={formData.dob} readOnly className="pl-10 bg-muted/50 border-primary/20 cursor-not-allowed" />
                  </div>
                </div>

                <div className="space-y-2">
                  <FieldLabel>Contact Phone</FieldLabel>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input name="phone" value={formData.phone} onChange={handleChange} required className="pl-10 border-2 focus:border-primary transition-all" placeholder="Enter phone number" />
                  </div>
                </div>

                <div className="space-y-2">
                  <FieldLabel>Email Address</FieldLabel>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input name="email" type="email" value={formData.email} onChange={handleChange} required className="pl-10 border-2 focus:border-primary transition-all" placeholder="Enter email address" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sidebar: Security */}
            <div className="space-y-8">
              <Card className="border-2 border-primary/30 shadow-xl shadow-primary/5 bg-primary/5 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Lock className="w-5 h-5 text-primary" /> Security
                  </CardTitle>
                  <CardDescription>Set your account access password.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <FieldLabel>New Password</FieldLabel>
                    <Input 
                      name="password" 
                      type="password" 
                      required 
                      value={formData.password} 
                      onChange={handleChange} 
                      className="border-2 focus:border-primary h-12" 
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Confirm Password</FieldLabel>
                    <Input 
                      name="confirm_password" 
                      type="password" 
                      required 
                      value={formData.confirm_password} 
                      onChange={handleChange} 
                      className="border-2 focus:border-primary h-12"
                      placeholder="••••••••"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="bg-card/80 p-4 rounded-xl border border-primary/10 w-full">
                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Password Requirements:</h5>
                    <ul className="text-[10px] space-y-1 text-muted-foreground font-medium">
                        <li className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-primary" /> At least 8 characters long</li>
                        <li className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-primary" /> One uppercase & one lowercase</li>
                        <li className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-primary" /> At least one number & special char</li>
                    </ul>
                  </div>
                </CardFooter>
              </Card>

              <Button 
                type="submit" 
                className="w-full h-20 text-xl font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Complete Registration'} <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
              
              <div className="p-4 border-2 border-dashed rounded-2xl bg-muted/50 text-center">
                 <p className="text-xs text-muted-foreground font-medium italic">
                   "By completing this process, you agree to our Terms of Service and Privacy Policy regarding sensitive medical data."
                 </p>
              </div>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const ArrowRight = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
)

export default PatientClaimPage;
