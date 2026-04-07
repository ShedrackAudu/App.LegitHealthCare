import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAppContext } from '@/context/AppContext';

const PatientOTPPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser, branding } = useAppContext();
  const { patientData, claimData } = location.state || {};
  const email = claimData?.email || patientData?.email;
  const firstName = patientData?.first_name || 'Patient';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!patientData || !claimData) {
      navigate('/signup');
    }
  }, [patientData, claimData, navigate]);

  useEffect(() => {
    let interval: any;
    if (timer > 0 && !canResend) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer, canResend]);

  const handleResendOTP = async () => {
    if (!canResend) return;
    
    setResending(true);
    try {
      await axios.post('http://localhost:5000/api/patient/resend-otp', {
        email,
        first_name: firstName
      });
      toast.success('A new verification code has been sent!');
      setTimer(60);
      setCanResend(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otp.length < 6) {
      toast.error('Please enter the full 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const resp = await axios.post('http://localhost:5000/api/patient/verify-otp', {
        ...patientData,
        ...claimData,
        otp
      });
      
      setSuccess(true);
      toast.success('Verification successful!');
      
      setTimeout(() => {
        setUser(resp.data.user);
        navigate('/patient/dashboard');
      }, 2000);
      
    } catch (err: any) {
      console.error('OTP Error:', err);
      toast.error(err.response?.data?.error || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full -z-10 bg-grid-white/[0.02]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <Card className="border-border shadow-xl bg-card">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              {branding?.logo_light ? (
                <img 
                  src={`http://localhost:5000${branding.logo_light}`} 
                  alt="Logo" 
                  className="h-16 w-auto object-contain" 
                />
              ) : (
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <Mail className="w-8 h-8" />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
            <CardDescription>
              We've sent a 6-digit code to <br />
              <strong className="text-foreground">{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <AnimatePresence mode="wait">
              {!success ? (
                <motion.form
                  key="form"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onSubmit={handleVerify}
                  className="space-y-6"
                >
                  <div className="space-y-4 text-center">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      className="h-16 text-center text-3xl font-black tracking-[1rem] border-2 focus:border-primary rounded-xl"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      maxLength={6}
                      autoFocus
                    />
                  </div>

                  <Button 
                    className="w-full h-12 text-lg font-bold rounded-xl shadow-lg"
                    disabled={loading || otp.length < 6}
                  >
                    {loading ? 'Verifying...' : 'Verify Code'}
                  </Button>
                </motion.form>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center py-6 space-y-4"
                >
                  <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-emerald-600">Verification Successful!</h3>
                    <p className="text-sm text-muted-foreground mt-1">Redirecting to your portal...</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
          {!success && (
            <CardFooter className="flex flex-col gap-4 border-t pt-4">
              <div className="w-full text-center">
                <Button 
                  variant="link" 
                  className="text-primary font-bold h-auto p-0"
                  disabled={!canResend || resending}
                  onClick={handleResendOTP}
                >
                  {resending ? 'Sending...' : canResend ? 'Resend Code' : `Resend code in ${timer}s`}
                </Button>
              </div>
              <Button 
                variant="ghost" 
                className="w-full gap-2 text-muted-foreground hover:text-foreground h-10"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </CardFooter>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default PatientOTPPage;
