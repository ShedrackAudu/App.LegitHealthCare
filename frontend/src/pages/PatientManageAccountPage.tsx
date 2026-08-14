import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  UserIcon,
  Mail01Icon,
  CallIcon,
  Shield01Icon,
  FloppyDiskIcon,
  ArrowLeft01Icon,
  Building02Icon,
  Calendar03Icon,
  LicenseIcon,
  LockIcon,
  LockKeyIcon,
  FingerPrintIcon,
  Flag02Icon,
  CompassIcon,
  GlobeIcon,
  Loading03Icon,
  EyeIcon,
  ViewOffIcon
} from '@hugeicons/core-free-icons';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { PasswordMatchIndicator } from '@/components/ui/PasswordMatchIndicator';
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
import api from '@/lib/api';

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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user?.username) return;
    try {
      const response = await api.get('/api/patient/profile', {
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
      const response = await api.put('/api/patient/profile', {
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
      <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Account Settings</h1>
            <p className="text-xs text-muted-foreground font-medium">Manage your personal credentials and communication preferences.</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/patient/dashboard')} className="gap-2 font-bold rounded-lg border border-border/70 bg-card/60 backdrop-blur-xs h-9 text-xs shadow-2xs">
            <HugeiconsIcon icon={ArrowLeft01Icon} className="w-3.5 h-3.5" /> Dashboard
          </Button>
        </div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Personal Info Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border border-border/60 shadow-xs rounded-xl overflow-hidden bg-card/60 dark:bg-card/45 backdrop-blur-md">
                <CardHeader className="p-5 border-b border-border/60 bg-muted/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg text-primary shadow-2xs">
                      <HugeiconsIcon icon={UserIcon} className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold tracking-tight">Profile Details</CardTitle>
                      <CardDescription className="text-xs font-medium">Personal contact info.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <form onSubmit={handleUpdateProfile}>
                  <CardContent className="p-5 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="first_name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">First Name</Label>
                        <Input
                          id="first_name"
                          className="h-9 rounded-lg border border-border/60 font-bold px-3 bg-muted/30 text-xs shadow-2xs"
                          value={formData.first_name}
                          readOnly
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="middle_name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Middle Name</Label>
                        <Input
                          id="middle_name"
                          className="h-9 rounded-lg border border-border/60 font-bold px-3 bg-muted/30 text-xs shadow-2xs"
                          value={formData.middle_name}
                          readOnly
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="last_name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Last Name</Label>
                        <Input
                          id="last_name"
                          className="h-9 rounded-lg border border-border/60 font-bold px-3 bg-muted/30 text-xs shadow-2xs"
                          value={formData.last_name}
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                        <div className="relative group">
                          <HugeiconsIcon icon={Mail01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                          <Input
                            id="email"
                            className="h-10 pl-9 rounded-lg border-input/80 bg-card/60 backdrop-blur-xs font-bold text-xs shadow-2xs focus:ring-4 focus:ring-primary/5 transition-all"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                        <div className="relative group">
                          <HugeiconsIcon icon={CallIcon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                          <Input
                            id="phone"
                            className="h-10 pl-9 rounded-lg border-input/80 bg-card/60 backdrop-blur-xs font-bold text-xs shadow-2xs focus:ring-4 focus:ring-primary/5 transition-all"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-5 border-t border-border/50 space-y-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-1">
                        <HugeiconsIcon icon={FingerPrintIcon} className="w-3.5 h-3.5 text-primary opacity-80" />
                        Verified Clinical Identity
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                        <div className="flex items-center gap-2.5 bg-card/50 backdrop-blur-xs p-2.5 rounded-xl border border-border/60 shadow-2xs">
                           <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0 shadow-2xs">
                              <HugeiconsIcon icon={LicenseIcon} className="w-3.5 h-3.5" />
                           </div>
                           <div className="min-w-0">
                              <p className="text-[8px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Staff ID</p>
                              <p className="text-xs font-bold truncate">{formData.staff_id}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2.5 bg-card/50 backdrop-blur-xs p-2.5 rounded-xl border border-border/60 shadow-2xs">
                           <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0 shadow-2xs">
                              <HugeiconsIcon icon={Calendar03Icon} className="w-3.5 h-3.5" />
                           </div>
                           <div className="min-w-0">
                              <p className="text-[8px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Birth</p>
                              <p className="text-xs font-bold truncate">{formData.dob}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2.5 bg-card/50 backdrop-blur-xs p-2.5 rounded-xl border border-border/60 shadow-2xs">
                           <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0 shadow-2xs">
                              <HugeiconsIcon icon={Shield01Icon} className="w-3.5 h-3.5" />
                           </div>
                           <div className="min-w-0">
                              <p className="text-[8px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Profile</p>
                              <p className="text-xs font-bold truncate">{formData.age}y / {formData.gender}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2.5 bg-card/50 backdrop-blur-xs p-2.5 rounded-xl border border-border/60 shadow-2xs">
                           <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0 shadow-2xs">
                              <HugeiconsIcon icon={Building02Icon} className="w-3.5 h-3.5" />
                           </div>
                           <div className="min-w-0">
                              <p className="text-[8px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Dept</p>
                              <p className="text-xs font-bold truncate">{formData.department}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2.5 bg-card/50 backdrop-blur-xs p-2.5 rounded-xl border border-border/60 shadow-2xs">
                           <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0 shadow-2xs">
                              <HugeiconsIcon icon={CompassIcon} className="w-3.5 h-3.5" />
                           </div>
                           <div className="min-w-0">
                              <p className="text-[8px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Section</p>
                              <p className="text-xs font-bold truncate">{formData.section}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2.5 bg-card/50 backdrop-blur-xs p-2.5 rounded-xl border border-border/60 shadow-2xs">
                           <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0 shadow-2xs">
                              <HugeiconsIcon icon={Flag02Icon} className="w-3.5 h-3.5" />
                           </div>
                           <div className="min-w-0">
                              <p className="text-[8px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Race</p>
                              <p className="text-xs font-bold truncate">{formData.race}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2.5 bg-card/50 backdrop-blur-xs p-2.5 rounded-xl border border-border/60 shadow-2xs md:col-span-2">
                           <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0 shadow-2xs">
                              <HugeiconsIcon icon={GlobeIcon} className="w-3.5 h-3.5" />
                           </div>
                           <div className="min-w-0">
                              <p className="text-[8px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Nationality</p>
                              <p className="text-xs font-bold truncate">{formData.nationality}</p>
                           </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="p-5 pt-0 bg-muted/5 flex justify-end">
                    <Button type="submit" loading={saving} className="h-10 px-6 rounded-lg font-bold text-xs shadow-xs active:scale-95 transition-all">
                      {!saving && <><HugeiconsIcon icon={FloppyDiskIcon} className="mr-2 h-3.5 w-3.5" /> Save Changes</>}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </div>

            {/* Right Column: Security */}
            <div className="space-y-6">
              <Card className="border border-border/60 shadow-xs rounded-xl overflow-hidden bg-card/60 dark:bg-card/45 backdrop-blur-md">
                <CardHeader className="p-5 border-b border-border/60 bg-muted/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg text-primary shadow-2xs">
                      <HugeiconsIcon icon={Shield01Icon} className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold tracking-tight">Security</CardTitle>
                      <CardDescription className="text-xs font-medium">Data protection.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-5">
                  <div className="space-y-2.5">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
                            <HugeiconsIcon icon={LockIcon} className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold text-xs uppercase tracking-wider">Two-Factor Auth</span>
                        </div>
                        <div className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${user.is_2fa_enabled ? 'bg-primary text-primary-foreground shadow-2xs' : 'bg-muted text-muted-foreground'}`}>
                          {user.is_2fa_enabled ? 'ON' : 'OFF'}
                        </div>
                     </div>
                     <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                       Add an extra layer of clinical data protection.
                     </p>
                     <Button 
                      className={`w-full h-9 rounded-lg font-bold shadow-2xs transition-all active:scale-95 text-xs ${user.is_2fa_enabled ? 'bg-primary hover:bg-primary/90' : ''}`}
                      onClick={() => navigate('/patient/account/2fa')}
                     >
                      {user.is_2fa_enabled ? "Manage 2FA" : "Enable Shield"}
                     </Button>
                  </div>

                  <div className="pt-3.5 border-t border-border/50 space-y-2.5">
                     <Button 
                        variant="outline" 
                        className="w-full justify-start gap-3 h-10 rounded-lg border border-border/70 bg-card/60 font-bold px-3 group transition-all hover:border-primary/40 text-xs shadow-2xs" 
                        onClick={() => {
                          setShowResetModal(true);
                          setResetStep(1);
                        }}
                      >
                        <div className="p-1 rounded-md bg-muted/60 group-hover:bg-primary/10 transition-colors">
                          <HugeiconsIcon icon={LockKeyIcon} className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                        </div>
                        <span>Reset Passcode</span>
                     </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Password Reset Modal */}
              <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
                <DialogContent className="sm:max-w-[400px] rounded-2xl border border-border/70 bg-card/95 backdrop-blur-xl shadow-2xl p-0 overflow-hidden gap-0">
                  <div className="p-6 space-y-4">
                    <DialogHeader className="space-y-3 items-center text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-2xs border border-primary/20">
                        <HugeiconsIcon icon={LockKeyIcon} className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <DialogTitle className="text-xl font-bold tracking-tight">Security Reset</DialogTitle>
                        <DialogDescription className="text-xs font-medium leading-relaxed">
                          {resetStep === 1 
                            ? "We will send an OTP code to your registered email to verify identity."
                            : "Enter the code and specify your new clinical passcode."
                          }
                        </DialogDescription>
                      </div>
                    </DialogHeader>

                    <div className="space-y-3.5 pt-2">
                      {resetStep === 1 ? (
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Registered Email</Label>
                          <Input 
                            value={formData.email} 
                            disabled 
                            className="h-10 rounded-lg border-border/60 bg-muted/30 font-bold text-xs shadow-2xs" 
                          />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">OTP Code (from Email)</Label>
                            <Input 
                              placeholder="6-digit code" 
                              value={resetOtp}
                              onChange={(e) => setResetOtp(e.target.value)}
                              className="h-10 text-center font-bold tracking-widest text-sm rounded-lg border-input/80 bg-card/60 shadow-2xs"
                              maxLength={6}
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">New Passcode</Label>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••" 
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="h-10 rounded-lg border-input/80 bg-card/60 shadow-2xs font-bold text-xs pr-10"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
                              >
                                <HugeiconsIcon icon={showPassword ? ViewOffIcon : EyeIcon} className="w-4 h-4" />
                              </button>
                            </div>
                            <PasswordStrength password={newPassword} />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Confirm Passcode</Label>
                            <div className="relative">
                              <Input 
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="••••••••" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="h-10 rounded-lg border-input/80 bg-card/60 shadow-2xs font-bold text-xs pr-10"
                              />
                              <button 
                                type="button" 
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
                              >
                                {showConfirmPassword ? <HugeiconsIcon icon={ViewOffIcon} className="w-4 h-4" /> : <HugeiconsIcon icon={EyeIcon} className="w-4 h-4" />}
                              </button>
                            </div>
                            <PasswordMatchIndicator password={newPassword} confirmPassword={confirmPassword} />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      {resetStep === 1 ? (
                        <Button 
                          className="h-11 w-full rounded-lg font-bold text-xs shadow-xs transition-all active:scale-95 bg-primary"
                          onClick={async () => {
                            setResetLoading(true);
                            try {
                              await api.post('/api/patient/reset-password/request', { email: formData.email });
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
                          {resetLoading ? <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin mr-2" /> : <HugeiconsIcon icon={FloppyDiskIcon} className="h-4 w-4 mr-2" />}
                          {resetLoading ? "Sending Code..." : "Send Verification Code"}
                        </Button>
                      ) : (
                        <Button 
                          className="h-11 w-full rounded-lg font-bold text-xs shadow-xs transition-all active:scale-95 bg-primary"
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
                              await api.post('/api/patient/reset-password/verify', { 
                                email: formData.email,
                                otp: resetOtp,
                                new_password: newPassword
                              });
                              toast.success("Password reset successful!");
                              setShowResetModal(false);
                              setResetOtp('');
                              setNewPassword('');
                              setConfirmPassword('');
                              setResetStep(1);
                            } catch (err: any) {
                              toast.error(err.response?.data?.error || "Verification failed.");
                            } finally {
                              setResetLoading(false);
                            }
                          }}
                          disabled={resetLoading}
                        >
                          {resetLoading ? <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin mr-2" /> : <HugeiconsIcon icon={Shield01Icon} className="h-4 w-4 mr-2" />}
                          {resetLoading ? "Verifying..." : "Verify & Update Password"}
                        </Button>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="p-5 bg-primary/[0.04] rounded-xl border border-primary/15 flex flex-col items-center text-center space-y-3 backdrop-blur-xs shadow-2xs">
                 <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-2xs border border-primary/20">
                    <HugeiconsIcon icon={Shield01Icon} className="w-5 h-5" />
                 </div>
                 <div className="space-y-1">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Privacy Guard</h4>
                    <p className="text-xs font-medium text-muted-foreground leading-relaxed px-4">
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
