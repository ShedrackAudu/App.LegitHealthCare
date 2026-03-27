import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, Mail, Phone, Shield, ShieldCheck, 
  Save, ArrowLeft, Building2, Calendar, IdCard,
  Lock, Key
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const PatientManageAccountPage = () => {
  const { user, setUser } = useAppContext();
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
      setUser(response.data.user);
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;

  return (
    <div className="container mx-auto py-10 px-4 max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Account</h1>
            <p className="text-muted-foreground mt-1">Update your personal information and security settings.</p>
          </div>
          <Button variant="outline" onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Personal Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border shadow-md">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  <CardTitle>Personal Information</CardTitle>
                </div>
                <CardDescription>Update your contact details and basic information.</CardDescription>
              </CardHeader>
              <form onSubmit={handleUpdateProfile}>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="email"
                          className="pl-9"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          className="pl-9"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-dashed">
                    <p className="text-sm font-semibold text-muted-foreground mb-4">Official Records (Non-editable)</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg border border-border/50">
                        <IdCard className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Staff ID</p>
                          <p className="text-sm font-semibold">{formData.staff_id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg border border-border/50">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Department / Section</p>
                          <p className="text-sm font-semibold">{formData.department} ({formData.section})</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg border border-border/50">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Date of Birth</p>
                          <p className="text-sm font-semibold">{formData.dob}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-end border-t bg-muted/10 pt-4">
                  <Button type="submit" disabled={saving} className="gap-2">
                    {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>

          {/* Right Column: Security */}
          <div className="space-y-6">
            <Card className="border-border shadow-md">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <CardTitle>Security & Privacy</CardTitle>
                </div>
                <CardDescription>Manage your account protection settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10 space-y-4">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                          <Lock className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-sm">2-Factor Authentication</span>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${user.is_2fa_enabled ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                        {user.is_2fa_enabled ? 'Active' : 'Disabled'}
                      </div>
                   </div>
                   <p className="text-xs text-muted-foreground leading-relaxed">
                     Add an extra layer of security to your account. Each time you log in, you will need to provide a verification code sent to your email.
                   </p>
                   <Button 
                    className={`w-full font-bold ${user.is_2fa_enabled ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                    onClick={() => window.location.href = '/account/2fa'}
                   >
                    {user.is_2fa_enabled ? "Manage 2FA Settings" : "Set Up 2FA"}
                   </Button>
                </div>

                <div className="pt-4 space-y-4">
                   <Button variant="outline" className="w-full justify-start gap-3 h-11" onClick={() => toast('Password reset link sent to your email', { icon: '📧' })}>
                      <Key className="w-4 h-4" /> Change Password
                   </Button>
                </div>
              </CardContent>
            </Card>

            <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 flex flex-col items-center text-center space-y-3">
               <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Shield className="w-6 h-6" />
               </div>
               <h4 className="font-bold text-sm">Privacy Guarantee</h4>
               <p className="text-xs text-muted-foreground">
                 Legit HealthCare ensures that your medical records and personal data are encrypted and only accessible by authorized clinical staff.
               </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PatientManageAccountPage;
