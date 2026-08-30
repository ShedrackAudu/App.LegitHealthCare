import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Settings02Icon,
  ReloadIcon,
  Clock01Icon,
  Shield01Icon,
  ArrowRight01Icon,
  ViewIcon,
  ViewOffIcon,
  Cancel01Icon,
  LockIcon,
  CheckmarkCircle01Icon,
  UserIcon,
  Hospital02Icon,
  Wifi01Icon
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { useAppContext } from '@/context/AppContext';

interface MaintenanceData {
  enabled: boolean;
  title: string;
  message: string;
  eta: string;
}

export const isUserAdmin = (u: any): boolean => {
  if (!u) return false;
  if (u.is_admin === true) return true;
  if (Array.isArray(u.roles)) {
    if (u.roles.some((r: string) => /admin/i.test(r) || /super/i.test(r) || /director/i.test(r))) {
      return true;
    }
  }
  if (typeof u.role === 'string' && (/admin/i.test(u.role) || /super/i.test(u.role))) {
    return true;
  }
  if (Array.isArray(u.permissions)) {
    if (u.permissions.some((p: string) => /admin/i.test(p) || /manage_system/i.test(p) || /system_config/i.test(p))) {
      return true;
    }
  }
  return false;
};

export const MaintenancePage: React.FC<{
  maintenanceData?: MaintenanceData | null;
  onRefreshStatus?: () => void;
}> = ({ maintenanceData: propData, onRefreshStatus }) => {
  const navigate = useNavigate();
  const { setUser } = useAppContext();
  const [data, setData] = useState<MaintenanceData>(
    propData || {
      enabled: true,
      title: 'System Under Scheduled Maintenance',
      message: 'We are currently performing routine upgrades and performance enhancements. Services will resume shortly.',
      eta: ''
    }
  );
  const [branding, setBranding] = useState<{ clinic_name?: string; logo_url?: string; clinic_slogan?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  // Admin login states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // 2FA modal state for admin bypass
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempUserId, setTempUserId] = useState<number | string>('');
  const [tempPortal, setTempPortal] = useState('staff');
  const [totpCode, setTotpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => {
    if (propData) {
      setData(propData);
    } else {
      fetchMaintenanceStatus();
    }
    fetchBranding();
  }, [propData]);

  const fetchBranding = async () => {
    try {
      const res = await axios.get('/api/branding');
      setBranding(res.data);
    } catch {
      // Fallback
    }
  };

  const fetchMaintenanceStatus = async () => {
    setChecking(true);
    try {
      const res = await axios.get('/api/config/maintenance');
      setData(res.data);
      if (!res.data.enabled) {
        toast.success("Maintenance complete! Welcome back.", { id: 'maint-done' });
        if (onRefreshStatus) {
          onRefreshStatus();
        } else {
          window.location.href = '/';
        }
      } else {
        toast("System is still undergoing scheduled maintenance.", {
          icon: '🔧',
          id: 'maint-active'
        });
      }
    } catch (err) {
      toast.error("Unable to reach server. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error("Please provide both username and password.");
      return;
    }

    setLoginLoading(true);
    try {
      const response = await axios.post('/login', {
        username: username.trim(),
        password,
        portal: 'staff'
      });
      
      if (response.data.requires_2fa) {
        setRequires2FA(true);
        setTempUserId(response.data.user_id);
        setTempPortal(response.data.portal || 'staff');
        toast.success("Credentials verified. Please enter your 2FA code.");
        return;
      }

      const userData = response.data.user;
      if (!isUserAdmin(userData)) {
        toast.error("Access restricted: Only System Administrators are authorized to bypass maintenance mode.");
        return;
      }

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      }

      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      toast.success(`Welcome back, ${userData.first_name || 'Admin'}! Bypassing maintenance.`);
      setAdminModalOpen(false);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.error || "Login failed. Please verify credentials.";
      toast.error(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode || totpCode.length < 6) {
      toast.error("Please enter a valid 6-digit code.");
      return;
    }

    setOtpLoading(true);
    try {
      const response = await axios.post('/login/2fa', {
        user_id: tempUserId,
        code: totpCode,
        portal: tempPortal || 'staff'
      });

      const userData = response.data.user;
      if (!isUserAdmin(userData)) {
        toast.error("Access restricted: Only System Administrators are authorized to bypass maintenance mode.");
        return;
      }

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      }

      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      toast.success(`Authenticated. Welcome back, ${userData.first_name || 'Admin'}!`);
      setAdminModalOpen(false);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.error || "Invalid 2FA code.";
      toast.error(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-background text-foreground overflow-x-hidden select-none antialiased">
      {/* Dynamic Ambient Background Glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[15%] left-[20%] w-[650px] h-[650px] rounded-full bg-amber-500/[0.06] dark:bg-amber-500/[0.09] blur-[150px]" />
        <div className="absolute top-[40%] -right-[10%] w-[600px] h-[600px] rounded-full bg-primary/[0.05] dark:bg-primary/[0.08] blur-[160px]" />
        <div className="absolute -bottom-[20%] left-[10%] w-[550px] h-[550px] rounded-full bg-teal-500/[0.04] dark:bg-teal-500/[0.06] blur-[140px]" />
      </div>

      {/* Main Content Showcase (Borderless & Cardless) */}
      <main className="relative z-10 w-full max-w-2xl text-center space-y-8 px-4 py-8">
        {/* Hero Centerpiece Icon - Interactive Admin Sign-in Button */}
        <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setAdminModalOpen(true)}
            className="group relative w-full h-full rounded-3xl bg-card/80 dark:bg-card/60 backdrop-blur-xl border-2 border-amber-500/30 dark:border-amber-500/25 hover:border-amber-500/60 dark:hover:border-amber-500/60 flex items-center justify-center shadow-lg hover:shadow-xl hover:shadow-amber-500/15 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-primary/10 to-teal-500/20 blur-lg group-hover:blur-xl transition-all opacity-70 group-hover:opacity-100" />
            <HugeiconsIcon
              icon={Settings02Icon}
              className="relative z-10 w-10 h-10 sm:w-12 sm:h-12 text-amber-500 dark:text-amber-400 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors animate-spin-slow"
            />
          </button>
        </div>

        {/* Title & Announcement Message */}
        <div className="space-y-3 max-w-xl mx-auto">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground leading-tight">
            {data.title || "Scheduled System Maintenance"}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground font-medium leading-relaxed max-w-lg mx-auto">
            {data.message || "We are currently performing routine upgrades and performance enhancements. Services will resume shortly."}
          </p>
        </div>

        {/* Estimated Completion ETA Box (if provided) */}
        {data.eta && (
          <div className="max-w-md mx-auto p-4 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/80 shadow-sm flex items-center justify-between gap-4 text-left">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0">
                <HugeiconsIcon icon={Clock01Icon} className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Estimated Restoration
                </span>
                <span className="text-sm font-extrabold text-foreground tracking-tight">
                  {data.eta}
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
              In Progress
            </span>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2 flex justify-center max-w-md mx-auto">
          <Button
            onClick={fetchMaintenanceStatus}
            disabled={checking}
            size="lg"
            className="w-full h-12 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md shadow-primary/15 gap-2 active:scale-[0.98] transition-all"
          >
            <HugeiconsIcon icon={ReloadIcon} className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking Server Status...' : 'Check Status / Refresh'}
          </Button>
        </div>
      </main>

      {/* Admin Login Dialog Modal */}
      {adminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-card/95 border border-border/90 shadow-2xl p-6 sm:p-8 space-y-5">
            {/* Close Button */}
            <button
              onClick={() => {
                setAdminModalOpen(false);
                setRequires2FA(false);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                  <HugeiconsIcon icon={Shield01Icon} className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-foreground">
                    {requires2FA ? "Two-Factor Verification" : "System Administrator Access"}
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium">
                    {requires2FA
                      ? "Enter your 6-digit authenticator code to proceed."
                      : "Only authorized System Administrators are permitted to bypass maintenance."}
                  </p>
                </div>
              </div>
            </div>

            {/* Login Form or 2FA Form */}
            {!requires2FA ? (
              <form onSubmit={handleAdminLogin} className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Admin Username</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="e.g. admin"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-11 pl-10 rounded-xl font-medium"
                      autoFocus
                    />
                    <HugeiconsIcon icon={UserIcon} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pl-10 pr-10 rounded-xl font-medium"
                    />
                    <HugeiconsIcon icon={LockIcon} className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <HugeiconsIcon icon={showPassword ? ViewOffIcon : ViewIcon} className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm gap-2 mt-2"
                >
                  {loginLoading ? 'Authenticating...' : 'Sign In as Administrator'}
                  <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" />
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerify2FA} className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">6-Digit Code</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    className="h-12 text-center text-2xl font-mono tracking-widest rounded-xl font-black"
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  disabled={otpLoading || totpCode.length < 6}
                  className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm gap-2"
                >
                  {otpLoading ? 'Verifying...' : 'Verify Code & Enter'}
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4" />
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenancePage;
