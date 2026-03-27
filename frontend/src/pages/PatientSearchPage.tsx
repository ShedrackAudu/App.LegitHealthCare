import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, User, AlertCircle, Building2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const PatientSearchPage = () => {
  const [staffId, setStaffId] = useState('');
  const [loading, setLoading] = useState(false);
  const [patientData, setPatientData] = useState<any>(null);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

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
      const response = await axios.get(`http://localhost:5000/api/patient/search?staff_id=${staffId.trim()}`);
      setPatientData(response.data.data);
      toast.success('Record found successfully!');
    } catch (err: any) {
      console.error('Search error:', err);
      setError(true);
      if (err.response?.status === 404) {
        toast.error('Staff ID not found in our records.');
      } else {
        toast.error('An error occurred during search. Please try again.');
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
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 border-2 border-primary/20 mb-4 shadow-xl shadow-primary/10 group">
             <Building2 className="w-10 h-10 text-primary group-hover:scale-110 transition-transform duration-500" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Access Your Portal</h1>
          <p className="text-muted-foreground">Enter your Staff ID to claim your account and access your healthcare records.</p>
        </div>

        <form onSubmit={handleSearch} className="space-y-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-blue-500/30 rounded-2xl blur opacity-25 group-focus-within:opacity-100 transition duration-500" />
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
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
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Search className="w-6 h-6" />
                </motion.div>
                Searching...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Search Records <ArrowRight className="w-6 h-6" />
              </span>
            )}
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
              <Card className="border-2 border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Account Found
                  </CardTitle>
                  <CardDescription className="text-lg font-semibold pt-2 text-foreground">
                    {patientData.first_name} {patientData.last_name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" /> 
                    If these are not your records, kindly notify an admin or clinic personnel to rectify the issue.
                  </p>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button 
                    onClick={handleProceed}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20"
                  >
                    Proceed with Registration
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
                    <AlertCircle className="w-5 h-5" /> Record Not Found
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

const CheckCircle2 = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
)

export default PatientSearchPage;
