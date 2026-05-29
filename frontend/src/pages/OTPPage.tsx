import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { HugeiconsIcon } from '@hugeicons/react';
import { Activity01Icon, Loading03Icon, ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { ModeToggle } from '@/components/mode-toggle';
import { useAppContext } from '@/context/AppContext';

const OTPPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { branding } = useAppContext();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const userId = location.state?.userId;
  const email = location.state?.email;

  useEffect(() => {
    if (!userId) {
      navigate('/signup');
    }
  }, [userId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
        setError("Please enter a valid 6-digit OTP code");
        return;
    }

    setLoading(true);
    setError(null);
    try {
      await axios.post('/verify-otp', {
        user_id: userId,
        otp
      });
      setSuccess(true);
      // Redirect to login after 2 seconds
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8 transition-colors duration-500 selection:bg-primary/20 relative">
      <div className="absolute top-4 right-4 text-xs">
        <ModeToggle />
      </div>
      <div className="w-full max-w-sm">
        <Card className="border-border shadow-xl bg-card">
          <CardHeader className="py-4 text-left space-y-1">
            <Link to="/" className="flex items-center justify-start mb-3 hover:opacity-80 transition-opacity">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <HugeiconsIcon icon={Activity01Icon} className="w-8 h-8 text-primary" />
              </div>
            </Link>
            <CardTitle className="text-2xl font-bold tracking-tight">Verify Email</CardTitle>
            <CardDescription className="text-muted-foreground mt-0.5 text-sm">
              Enter the code sent to your email.
            </CardDescription>
          </CardHeader>
        <CardContent className="py-2">
          {success ? (
            <div className="bg-primary/10 border border-primary/20 text-primary p-3 rounded-md text-center text-sm font-medium animate-in fade-in zoom-in-95">
              Verification Successful!
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-2 rounded-md font-medium">
                  {error}
                </div>
              )}
              <div className="space-y-1 text-left">
                <Label htmlFor="otp" className="text-left block text-sm mb-1">Enter Verification Code</Label>
                <Input 
                  id="otp" 
                  placeholder="000000" 
                  maxLength={6}
                  className="text-center text-3xl font-black h-16 border-2 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 rounded-xl tracking-[1rem]"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full h-11 text-base font-bold shadow-sm" loading={loading}>
                Verify Account
              </Button>
            </form>
          )}
        </CardContent>
          <CardFooter className="flex flex-col space-y-3 py-4 border-t border-border mt-2">
            <Link to="/signup" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
              <HugeiconsIcon icon={ArrowLeft01Icon} className="mr-2 h-4 w-4" />
              Back to Signup
            </Link>
          </CardFooter>
        </Card>
      </div>
        <div className="fixed lg:absolute bottom-2 lg:bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 whitespace-nowrap z-50 px-4 py-2 bg-background/60 backdrop-blur-xl border border-border/40 rounded-full shadow-2xl">
          © 2026 {branding?.clinic_name || 'Legit HealthCare'} • v2.0
        </div>
    </div>
  );
};

export default OTPPage;
