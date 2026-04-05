import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Mail, Phone, Shield, ShieldCheck, 
  Save, ArrowLeft, Building2, Calendar, IdCard,
  Lock, Key
} from 'lucide-react';
import { PatientLayout } from '@/components/layout/PatientLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const PatientManageAccountPage = () => {
  const { user, setUser } = useAppContext();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
    section: '',
    staff_id: '',
    dob: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        department: user.department || '',
        section: user.section || '',
        staff_id: user.username || '',
        dob: user.dob || 'N/A'
      });
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await axios.put('http://localhost:5000/api/account/profile', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        email: formData.email
      });
      const updatedUser = response.data.user;
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;

  return (
    <PatientLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black tracking-tight">Account Settings</h1>
              <p className="text-muted-foreground font-medium mt-2">Manage your personal profile and security preferences.</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/patient/dashboard')} className="gap-2 font-bold rounded-xl border-2">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Personal Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-2 shadow-xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8 border-b bg-muted/10">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-black tracking-tight">Personal Profile</CardTitle>
                      <CardDescription className="text-sm font-medium">Update your contact information below.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <form onSubmit={handleUpdateProfile}>
                  <CardContent className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="first_name" className="text-sm font-bold uppercase tracking-widest text-muted-foreground">First Name</Label>
                        <Input
                          id="first_name"
                          className="h-12 rounded-xl border-2 font-bold px-4"
                          value={formData.first_name}
                          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name" className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Last Name</Label>
                        <Input
                          id="last_name"
                          className="h-12 rounded-xl border-2 font-bold px-4"
                          value={formData.last_name}
                          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Email Address</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                          <Input
                            id="email"
                            className="h-12 pl-12 rounded-xl border-2 font-bold"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                          <Input
                            id="phone"
                            className="h-12 pl-12 rounded-xl border-2 font-bold"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-dashed space-y-4">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Verified Corporate Identity</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="flex flex-col gap-1 bg-muted/40 p-4 rounded-2xl border-2 border-border/10 transition-all hover:border-primary/20">
                          <IdCard className="w-5 h-5 text-primary mb-1" />
                          <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Employee ID</p>
                          <p className="text-sm font-black">{formData.staff_id}</p>
                        </div>
                        <div className="flex flex-col gap-1 bg-muted/40 p-4 rounded-2xl border-2 border-border/10 transition-all hover:border-primary/20 md:col-span-2">
                          <Building2 className="w-5 h-5 text-primary mb-1" />
                          <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Department & Group</p>
                          <p className="text-sm font-black truncate">{formData.department} ({formData.section})</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-8 pt-0 bg-muted/5 flex justify-end">
                    <Button type="submit" disabled={saving} className="h-14 px-10 rounded-[1.5rem] font-black text-lg shadow-xl shadow-primary/20 active:scale-95 transition-all">
                      {saving ? 'Synchronizing...' : <><Save className="mr-2 h-5 w-5" /> Save Changes</>}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </div>

            {/* Right Column: Security */}
            <div className="space-y-8">
              <Card className="border-2 shadow-2xl rounded-[2.5rem] overflow-hidden border-emerald-500/10">
                <CardHeader className="p-8 border-b bg-emerald-500/[0.03]">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-600">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-black tracking-tight">Security Center</CardTitle>
                      <CardDescription className="text-xs font-medium">Protect your health data.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                            <Lock className="w-5 h-5" />
                          </div>
                          <span className="font-black text-sm uppercase tracking-wider">Multi-Factor Auth</span>
                        </div>
                        <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${user.is_2fa_enabled ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-muted text-muted-foreground'}`}>
                          {user.is_2fa_enabled ? 'Active' : 'Disabled'}
                        </div>
                     </div>
                     <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                       Add an extra layer of clinical data protection. Requires a code from your mobile device to log in.
                     </p>
                     <Button 
                      className={`w-full h-12 rounded-xl font-black shadow-lg transition-all active:scale-95 ${user.is_2fa_enabled ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'shadow-primary/20'}`}
                      onClick={() => navigate('/patient/account/2fa')}
                     >
                      {user.is_2fa_enabled ? "Update 2FA Settings" : "Enable Shield Protection"}
                     </Button>
                  </div>

                  <div className="pt-6 border-t border-dashed space-y-4">
                     <Button 
                        variant="outline" 
                        className="w-full justify-start gap-4 h-14 rounded-xl border-2 font-bold px-6 group transition-all hover:bg-primary/5" 
                        onClick={() => toast('Password reset link sent to your email', { icon: '📧' })}
                      >
                        <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                          <Key className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                        </div>
                        <span>Reset Passcode</span>
                     </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="p-8 bg-primary/5 rounded-[2.5rem] border-2 border-dashed border-primary/20 flex flex-col items-center text-center space-y-4 shadow-inner">
                 <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shadow-lg">
                    <Shield className="w-8 h-8" />
                 </div>
                 <h4 className="font-black text-lg uppercase tracking-tight">Privacy Guard</h4>
                 <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                   Legit HealthCare ensures that your medical records are encrypted and only accessible by authorized clinical staff and you.
                 </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </PatientLayout>
  );
};

export default PatientManageAccountPage;
