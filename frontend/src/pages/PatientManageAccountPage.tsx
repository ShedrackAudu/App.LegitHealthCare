import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Mail, Phone, Shield, ShieldCheck, 
  Save, ArrowLeft, Building2, Calendar, IdCard,
  Lock, Key, Fingerprint, ShieldEllipsis, Flag, Compass, Globe,
  Loader2
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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import axios from 'axios';

const PatientManageAccountPage = () => {
  const { user, setUser } = useAppContext();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
    section: '',
    staff_id: '',
    dob: '',
    age: '',
    gender: '',
    race: '',
    nationality: ''
  });
  
  // Password Reset States
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: Request, 2: Verify & New Pass
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user?.username) return;
    try {
      const response = await axios.get('/api/patient/profile', {
        headers: { 'X-Staff-ID': user.username }
      });
      const p = response.data;
      setFormData({
        first_name: p.first_name || '',
        middle_name: p.middle_name || '',
        last_name: p.last_name || '',
        email: p.email || '',
        phone: p.phone || '',
        department: p.department || '',
        section: p.section || user.section || 'N/A',
        staff_id: p.staff_id || '',
        dob: p.dob || 'N/A',
        age: p.age || '',
        gender: p.gender || '',
        race: p.race || '',
        nationality: p.nationality || ''
      });
    } catch (err) {
      console.error("Error fetching patient profile:", err);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await axios.put('/api/patient/profile', {
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        email: formData.email
      }, {
        headers: { 'X-Staff-ID': user.username }
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
          className="space-y-5"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">Account Settings</h1>
              <p className="text-[10px] md:text-xs text-muted-foreground font-medium mt-0.5">Manage your personal profile and security preferences.</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/patient/dashboard')} className="gap-2 font-bold rounded-xl border h-9 text-[10px]">
              <ArrowLeft className="w-3 h-3" /> Dashboard
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Personal Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="p-5 border-b bg-muted/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                       <User className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-black tracking-tight">Personal Profile</CardTitle>
                      <CardDescription className="text-[10px] font-medium">Contact information.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <form onSubmit={handleUpdateProfile}>
                  <CardContent className="p-5 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="first_name" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">First Name</Label>
                        <Input
                          id="first_name"
                          className="h-9 rounded-xl border font-bold px-3 bg-muted/50 text-[13px]"
                          value={formData.first_name}
                          readOnly
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="middle_name" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Middle Name</Label>
                        <Input
                          id="middle_name"
                          className="h-9 rounded-xl border font-bold px-3 bg-muted/50 text-[13px]"
                          value={formData.middle_name}
                          readOnly
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="last_name" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Last Name</Label>
                        <Input
                          id="last_name"
                          className="h-9 rounded-xl border font-bold px-3 bg-muted/50 text-[13px]"
                          value={formData.last_name}
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="email" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Email Address</Label>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                          <Input
                            id="email"
                            className="h-10 pl-9 rounded-xl border font-bold text-[13px] focus:ring-4 focus:ring-primary/5 transition-all"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="phone" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Phone Number</Label>
                        <div className="relative group">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                          <Input
                            id="phone"
                            className="h-10 pl-9 rounded-xl border font-bold text-[13px] focus:ring-4 focus:ring-primary/5 transition-all"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-5 border-t border-dashed space-y-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 mb-1">
                        <Fingerprint className="w-3.5 h-3.5 text-primary opacity-60" />
                        Verified Clinical Identity
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                        <div className="flex items-center gap-2.5 bg-muted/20 p-2.5 rounded-xl border border-border/50">
                           <div className="p-1.5 rounded-lg bg-background text-primary shrink-0 shadow-sm">
                              <IdCard className="w-3.5 h-3.5" />
                           </div>
                           <div className="min-w-0">
                              <p className="text-[8px] uppercase font-black text-muted-foreground tracking-widest leading-none mb-1">Staff ID</p>
                              <p className="text-[11px] font-medium truncate">{formData.staff_id}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2.5 bg-muted/20 p-2.5 rounded-xl border border-border/50">
                           <div className="p-1.5 rounded-lg bg-background text-primary shrink-0 shadow-sm">
                              <Calendar className="w-3.5 h-3.5" />
                           </div>
                           <div className="min-w-0">
                              <p className="text-[8px] uppercase font-black text-muted-foreground tracking-widest leading-none mb-1">Birth</p>
                              <p className="text-[11px] font-medium truncate">{formData.dob}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2.5 bg-muted/20 p-2.5 rounded-xl border border-border/50">
                           <div className="p-1.5 rounded-lg bg-background text-primary shrink-0 shadow-sm">
                              <ShieldEllipsis className="w-3.5 h-3.5" />
                           </div>
                           <div className="min-w-0">
                              <p className="text-[8px] uppercase font-black text-muted-foreground tracking-widest leading-none mb-1">Profile</p>
                              <p className="text-[11px] font-medium truncate">{formData.age}y / {formData.gender}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2.5 bg-muted/20 p-2.5 rounded-xl border border-border/50">
                           <div className="p-1.5 rounded-lg bg-background text-primary shrink-0 shadow-sm">
                              <Building2 className="w-3.5 h-3.5" />
                           </div>
                           <div className="min-w-0">
                              <p className="text-[8px] uppercase font-black text-muted-foreground tracking-widest leading-none mb-1">Dept</p>
                              <p className="text-[11px] font-medium truncate">{formData.department}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2.5 bg-muted/20 p-2.5 rounded-xl border border-border/50">
                           <div className="p-1.5 rounded-lg bg-background text-primary shrink-0 shadow-sm">
                              <Compass className="w-3.5 h-3.5" />
                           </div>
                           <div className="min-w-0">
                              <p className="text-[8px] uppercase font-black text-muted-foreground tracking-widest leading-none mb-1">Section</p>
                              <p className="text-[11px] font-medium truncate">{formData.section}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2.5 bg-muted/20 p-2.5 rounded-xl border border-border/50">
                           <div className="p-1.5 rounded-lg bg-background text-primary shrink-0 shadow-sm">
                              <Flag className="w-3.5 h-3.5" />
                           </div>
                           <div className="min-w-0">
                              <p className="text-[8px] uppercase font-black text-muted-foreground tracking-widest leading-none mb-1">Race</p>
                              <p className="text-[11px] font-medium truncate">{formData.race}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2.5 bg-muted/20 p-2.5 rounded-xl border border-border/50 md:col-span-2">
                           <div className="p-1.5 rounded-lg bg-background text-primary shrink-0 shadow-sm">
                              <Globe className="w-3.5 h-3.5" />
                           </div>
                           <div className="min-w-0">
                              <p className="text-[8px] uppercase font-black text-muted-foreground tracking-widest leading-none mb-1">Nationality</p>
                              <p className="text-[11px] font-medium truncate">{formData.nationality}</p>
                           </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-5 pt-0 bg-muted/5 flex justify-end">
                    <Button type="submit" disabled={saving} className="h-10 px-6 rounded-xl font-black text-[11px] shadow-lg shadow-primary/10 active:scale-95 transition-all">
                      {saving ? 'Saving...' : <><Save className="mr-2 h-3.5 w-3.5" /> Save Changes</>}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </div>

            {/* Right Column: Security */}
            <div className="space-y-6">
              <Card className="border shadow-lg rounded-2xl overflow-hidden border-emerald-500/10">
                <CardHeader className="p-5 border-b bg-emerald-500/[0.03]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-black tracking-tight">Security</CardTitle>
                      <CardDescription className="text-[10px] font-medium">Data protection.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-5">
                  <div className="space-y-2.5">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                            <Lock className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-black text-[10px] uppercase tracking-wider">Two-Factor Auth</span>
                        </div>
                        <div className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${user.is_2fa_enabled ? 'bg-emerald-500 text-white shadow-sm' : 'bg-muted text-muted-foreground'}`}>
                          {user.is_2fa_enabled ? 'ON' : 'OFF'}
                        </div>
                     </div>
                     <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                       Add an extra layer of clinical data protection.
                     </p>
                     <Button 
                      className={`w-full h-9 rounded-xl font-black shadow-md transition-all active:scale-95 text-[10px] ${user.is_2fa_enabled ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10' : 'shadow-primary/10'}`}
                      onClick={() => navigate('/patient/account/2fa')}
                     >
                      {user.is_2fa_enabled ? "Manage 2FA" : "Enable Shield"}
                     </Button>
                  </div>

                  <div className="pt-3.5 border-t border-dashed space-y-2.5">
                     <Button 
                        variant="outline" 
                        className="w-full justify-start gap-3 h-10 rounded-xl border font-bold px-3 group transition-all hover:bg-primary/5 text-[10px]" 
                        onClick={() => {
                          setShowResetModal(true);
                          setResetStep(1);
                        }}
                      >
                        <div className="p-1 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                          <Key className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
                        </div>
                        <span>Reset Passcode</span>
                     </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Password Reset Modal */}
              <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
                <DialogContent className="sm:max-w-[400px] rounded-2xl border shadow-2xl p-0 overflow-hidden gap-0">
                  <div className="p-6 space-y-4">
                    <DialogHeader className="space-y-3 items-center text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm">
                        <Key className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <DialogTitle className="text-xl font-black tracking-tight">Security Reset</DialogTitle>
                        <DialogDescription className="text-[11px] font-medium leading-relaxed">
                          {resetStep === 1 
                            ? "We'll send a 6-digit verification code to your email." 
                            : "Verify the code sent to your email and set a new password."}
                        </DialogDescription>
                      </div>
                    </DialogHeader>

                    <div className="space-y-4">
                      {resetStep === 1 ? (
                        <div className="bg-muted/30 p-4 rounded-xl border border-dashed text-center space-y-1">
                           <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Target Email</span>
                           <p className="text-sm font-black truncate">{formData.email}</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-0.5">6-Digit Code</Label>
                            <Input 
                              className="h-12 rounded-xl border text-center text-xl font-black tracking-[0.3em] focus:ring-4 focus:ring-primary/5"
                              maxLength={6}
                              value={resetOtp}
                              onChange={(e) => setResetOtp(e.target.value)}
                              placeholder="000000"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-0.5">New Passcode</Label>
                            <Input 
                              type="password"
                              className="h-11 rounded-xl border font-bold px-4 text-sm"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="••••••••"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      {resetStep === 1 ? (
                        <Button 
                          className="h-12 w-full rounded-xl font-black text-xs shadow-xl shadow-primary/20 transition-all active:scale-95"
                          onClick={async () => {
                            setResetLoading(true);
                            try {
                              await axios.post('/api/patient/reset-password/request', { email: formData.email });
                              toast.success("Code sent to your email!");
                              setResetStep(2);
                            } catch (err: any) {
                              toast.error(err.response?.data?.error || "Failed to send code.");
                            } finally {
                              setResetLoading(false);
                            }
                          }}
                          disabled={resetLoading}
                        >
                          {resetLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                          {resetLoading ? "Sending Code..." : "Send Verification Code"}
                        </Button>
                      ) : (
                        <Button 
                          className="h-12 w-full rounded-xl font-black text-xs shadow-xl shadow-primary/20 transition-all active:scale-95"
                          onClick={async () => {
                            const isStrong = (pw: string) => {
                                return pw.length >= 8 && 
                                       /[A-Z]/.test(pw) && 
                                       /[a-z]/.test(pw) && 
                                       /[0-9]/.test(pw) && 
                                       /[^A-Za-z0-9]/.test(pw);
                            };

                            if (!isStrong(newPassword)) {
                                toast.error("Password must be at least 8 chars long with 1 uppercase, 1 lowercase, 1 digit, and 1 special symbol.");
                                return;
                            }

                            setResetLoading(true);
                            try {
                              await axios.post('/api/patient/reset-password/verify', { 
                                email: formData.email,
                                otp: resetOtp,
                                new_password: newPassword
                              });
                              toast.success("Password reset successful!");
                              setShowResetModal(false);
                              setResetOtp('');
                              setNewPassword('');
                              setResetStep(1);
                            } catch (err: any) {
                              toast.error(err.response?.data?.error || "Verification failed.");
                            } finally {
                              setResetLoading(false);
                            }
                          }}
                          disabled={resetLoading}
                        >
                          {resetLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                          {resetLoading ? "Verifying..." : "Verify & Update Password"}
                        </Button>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10 flex flex-col items-center text-center space-y-3">
                 <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
                    <Shield className="w-6 h-6" />
                 </div>
                 <div className="space-y-1">
                    <h4 className="font-black text-sm uppercase tracking-tight">Privacy Guard</h4>
                    <p className="text-[10px] font-medium text-muted-foreground/60 leading-relaxed px-4">
                      Your medical records are encrypted and only accessible by authorized clinical staff and you.
                    </p>
                 </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </PatientLayout>
  );
};

export default PatientManageAccountPage;
