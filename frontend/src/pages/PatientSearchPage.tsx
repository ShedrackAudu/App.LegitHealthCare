import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Search01Icon, 
  ArrowRight01Icon, 
  UserIcon, 
  AlertCircleIcon, 
  Building02Icon, 
  HelpCircleIcon, 
  Shield01Icon,
  CheckmarkCircle02Icon
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { useAppContext } from '@/context/AppContext';

const PatientSearchPage = () => {
  const [staffId, setStaffId] = useState('');
  const [loading, setLoading] = useState(false);
  const [patientData, setPatientData] = useState<any>(null);
  const [error, setError] = useState(false);
  const [existingUser, setExistingUser] = useState(false);
  const navigate = useNavigate();
  const { branding } = useAppContext();

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!staffId.trim()) {
      toast.error('Please enter your Staff ID');
      return;
    }

    setLoading(true);
    setError(false);
    setPatientData(null);

    try {
      const response = await api.get(`/api/patient/search?staff_id=${staffId.trim()}`);
      setPatientData(response.data.data);
      toast.success('Record found successfully!');
    } catch (err: any) {
      console.error('Search error:', err);
      if (err.response?.status === 409 && err.response?.data?.already_exists) {
        setExistingUser(true);
        toast.error('Account already exists for this Staff ID.');
      } else {
        setError(true);
        if (err.response?.status === 404) {
          toast.error('Staff ID not found in our records.');
        } else {
          toast.error('An error occurred during search. Please try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    if (patientData) {
      // Navigate to claim page with patient data in state
      navigate('/patient/claim', { state: { patient: patientData } });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 bg-grid-white/[0.02] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10 animate-pulse" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10 space-y-4">
          <div className="flex justify-center mb-4">
            {branding?.logo_light ? (
              <img 
                src={`${branding.logo_light}`} 
                alt="Logo" 
                className="h-16 w-auto object-contain" 
              />
            ) : (
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 border-2 border-primary/20 shadow-xl shadow-primary/10 group">
                <HugeiconsIcon icon={Building02Icon} className="w-10 h-10 text-primary group-hover:scale-110 transition-transform duration-500" />
              </div>
            )}
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Access Your Portal</h1>
          <p className="text-muted-foreground">Enter your Staff ID to claim your account and access your healthcare records.</p>
        </div>

        <form onSubmit={handleSearch} className="space-y-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-blue-500/30 rounded-2xl blur opacity-25 group-focus-within:opacity-100 transition duration-500" />
            <div className="relative">
              <HugeiconsIcon icon={Search01Icon} className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Enter Staff ID (e.g., STF-001)"
                className="h-16 pl-12 pr-4 text-lg border-2 rounded-2xl focus-visible:ring-primary/20 focus-visible:border-primary transition-all bg-card/50 backdrop-blur-xl"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-16 text-xl font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
            loading={loading}
          >
            Search Records {!loading && <HugeiconsIcon icon={ArrowRight01Icon} className="w-6 h-6" />}
          </Button>
        </form>

        <AnimatePresence mode="wait">
          {patientData && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: "backOut" }}
              className="mt-8"
            >
              <Card className="border-2 border-primary/20 bg-primary/5 backdrop-blur-xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-4">
                    <div className={`px-3 py-1 rounded-md text-white font-black text-[10px] tracking-widest shadow-lg ${patientData.section?.toUpperCase() === 'DCP' ? 'bg-primary shadow-primary/10' : 'bg-blue-500 shadow-blue-500/10'}`}>
                        {patientData.section?.toUpperCase() || 'N/A'}
                    </div>
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <HugeiconsIcon icon={UserIcon} className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-primary dark:text-primary text-sm flex items-center gap-1.5 font-black uppercase tracking-wider">
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-4 h-4" /> Account Found
                      </CardTitle>
                      <CardDescription className="text-lg font-black text-foreground">
                        {patientData.first_name} {patientData.middle_name ? patientData.middle_name + ' ' : ''}{patientData.last_name}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-background/50 border border-border/50">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Staff ID</Label>
                        <p className="text-sm font-bold text-foreground">{patientData.staff_id}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-background/50 border border-border/50">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Department</Label>
                        <p className="text-sm font-bold text-foreground truncate">{patientData.department || 'N/A'}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-background/50 border border-border/50">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Gender</Label>
                        <p className="text-sm font-bold text-foreground">{patientData.gender || 'N/A'}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-background/50 border border-border/50">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Date of Birth</Label>
                        <p className="text-sm font-bold text-foreground">{patientData.dob || 'N/A'}</p>
                    </div>
                  </div>

                  <p className="text-muted-foreground text-[10px] flex items-center gap-2 italic">
                    <HugeiconsIcon icon={HelpCircleIcon} className="w-3 h-3" /> 
                    Not you? Please notify an IT admin to correct your records.
                  </p>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button 
                    onClick={handleProceed}
                    className="w-full h-14 bg-primary hover:bg-primary0 text-white font-bold rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]"
                  >
                    Proceed with Registration <HugeiconsIcon icon={ArrowRight01Icon} className="ml-2 w-5 h-5" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8"
            >
              <Card className="border-2 border-destructive/20 bg-destructive/5 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-destructive flex items-center gap-2">
                    <HugeiconsIcon icon={AlertCircleIcon} className="w-5 h-5" /> Record Not Found
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    We couldn't find any medical records matching Staff ID <strong>{staffId}</strong>. 
                  </p>
                  <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                     <p className="text-xs font-medium text-destructive-foreground">
                       <strong>Next Steps:</strong> Please contact the ICT department or a clinic administrator to ensure your data is correctly captured in the system.
                     </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {existingUser && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              className="mt-8"
            >
              <Card className="border-2 border-primary/20 bg-primary/5 backdrop-blur-xl">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2 text-primary">
                      <HugeiconsIcon icon={Shield01Icon} className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-xl font-bold">Account Already Exists</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    An account for Staff ID <strong>{staffId}</strong> is already registered in our system.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => navigate('/login')}
                    className="w-full h-12 font-bold rounded-xl"
                  >
                    Go to Patient Login
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Footer Info */}
      <div className="mt-20 text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-bold">
          Protected by Legit HealthCare Security System
        </p>
      </div>
    </div>
  );
};

export default PatientSearchPage;
