import { useState, useEffect } from 'react';
import { PatientLayout } from '@/components/layout/PatientLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Shield01Icon, 
  CheckmarkCircle02Icon, 
  InformationCircleIcon, 
  ArrowLeft01Icon, 
  Loading03Icon 
} from '@hugeicons/core-free-icons';
import { QRCodeSVG } from 'qrcode.react';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

const PatientManage2FAPage = () => {
    const { user, setUser } = useAppContext();
    const navigate = useNavigate();

    const [isGenerating, setIsGenerating] = useState(false);
    const [qrUri, setQrUri] = useState('');
    const [secret, setSecret] = useState('');
    const [code, setCode] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    
    // For disabling
    const [disableCode, setDisableCode] = useState('');

    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    const beginSetup = async () => {
        setIsGenerating(true);
        try {
            const resp = await api.post(`/api/2fa/generate?portal=patient`, {});
            setQrUri(resp.data.uri);
            setSecret(resp.data.secret);
        } catch (err) {
            toast.error("Failed to generate 2FA credentials.");
        } finally {
            setIsGenerating(false);
        }
    };

    const verifyAndEnable = async () => {
        if (!code || code.length !== 6) {
            toast.error("Please enter a valid 6-digit code.");
            return;
        }
        try {
            const resp = await api.post(`/api/2fa/enable`, { code, portal: 'patient' });
            toast.success(resp.data.message || "2FA successfully enabled!");
            setBackupCodes(resp.data.backup_codes || []);
            const updatedUser = { ...user, is_2fa_enabled: true };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to verify code. Please try again.");
        }
    };

    const verifyAndDisable = async () => {
        if (!disableCode) {
            toast.error("Please enter your current TOTP code to disable 2FA.");
            return;
        }
        try {
            const resp = await api.post(`/api/2fa/disable`, { code: disableCode, portal: 'patient' });
            toast.success(resp.data.message || "2FA has been disabled.");
            const updatedUser = { ...user, is_2fa_enabled: false };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setDisableCode('');
            // Reset setup state
            setQrUri('');
            setSecret('');
            setBackupCodes([]);
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to disable 2FA.");
        }
    };

    return (
        <PatientLayout>
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-700 pb-20">
                <Button variant="ghost" onClick={() => navigate('/patient/account')} className="mb-1 h-8 gap-2 font-bold group rounded-lg text-xs text-muted-foreground hover:text-foreground">
                    <HugeiconsIcon icon={ArrowLeft01Icon} className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Back
                </Button>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary shadow-2xs">
                           <HugeiconsIcon icon={Shield01Icon} className="h-5 w-5" />
                        </div>
                        <div>
                           <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Two-Factor Security</h1>
                           <p className="text-xs text-muted-foreground font-medium">Protect your medical data with an extra layer.</p>
                        </div>
                    </div>
                    {user?.is_2fa_enabled && (
                        <div className="px-2.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
                           <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-3 h-3" /> 2FA Active
                        </div>
                    )}
                </div>

                {user?.is_2fa_enabled ? (
                    <Card className="border border-primary/20 shadow-xs rounded-xl overflow-hidden bg-card/60 dark:bg-card/45 backdrop-blur-md">
                        <CardHeader className="bg-primary/5 p-5 border-b border-primary/10">
                            <CardTitle className="text-base font-bold text-primary">Authentication is enabled</CardTitle>
                            <CardDescription className="text-xs font-medium">Your account is currently protected.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-5 space-y-5">
                            <div className="p-4 bg-card/60 rounded-xl text-xs border border-dashed border-border/60 flex items-start gap-3.5 backdrop-blur-xs shadow-2xs">
                                <HugeiconsIcon icon={InformationCircleIcon} className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <p className="font-bold text-sm text-foreground">Need to turn off 2FA?</p>
                                    <p className="text-muted-foreground leading-relaxed">Enter your 6-digit verification code to disable protection.</p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                <Input 
                                    placeholder="000 000" 
                                    value={disableCode} 
                                    onChange={e => setDisableCode(e.target.value)} 
                                    className="h-10 rounded-lg border border-input/80 bg-card/60 font-bold text-sm max-w-sm text-center tracking-[0.2em] shadow-2xs"
                                    maxLength={6}
                                />
                                <Button variant="destructive" onClick={verifyAndDisable} className="h-10 px-5 rounded-lg font-bold text-xs shadow-2xs transition-transform active:scale-95 w-full sm:w-auto">
                                   Disable Security
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {!qrUri && (
                            <Card className="border border-border/60 shadow-xs rounded-xl overflow-hidden bg-card/60 dark:bg-card/45 backdrop-blur-md">
                                <CardHeader className="p-5 text-center space-y-2">
                                    <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center mx-auto text-primary shadow-2xs">
                                       <HugeiconsIcon icon={Shield01Icon} className="w-6 h-6" />
                                    </div>
                                    <CardTitle className="text-lg font-bold tracking-tight">Secure Your Portal</CardTitle>
                                    <CardDescription className="text-xs font-medium max-w-sm mx-auto leading-relaxed">
                                        Take the lead in your data privacy. Ensuring only you can access your results.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-5 pb-0 flex flex-col items-center">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-center mb-6">
                                        <div className="space-y-0.5">
                                            <p className="text-primary font-bold uppercase text-[9px] tracking-wider opacity-70">Step 1</p>
                                            <p className="text-xs font-bold">Install Authenticator App</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-primary font-bold uppercase text-[9px] tracking-wider opacity-70">Step 2</p>
                                            <p className="text-xs font-bold">Scan Private QR Code</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-primary font-bold uppercase text-[9px] tracking-wider opacity-70">Step 3</p>
                                            <p className="text-xs font-bold">Confirm Verification</p>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-4 bg-muted/5 flex justify-center border-t border-border/50">
                                    <Button onClick={beginSetup} loading={isGenerating} className="h-10 px-8 rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95">
                                        {!isGenerating && <HugeiconsIcon icon={Shield01Icon} className="mr-2 h-3.5 w-3.5" />}
                                        Start Setup
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}

                        {qrUri && backupCodes.length === 0 && (
                            <Card className="border border-border/60 shadow-xs rounded-xl overflow-hidden bg-card/60 dark:bg-card/45 backdrop-blur-md animate-in slide-in-from-bottom-8 duration-700">
                                <CardHeader className="p-5 border-b border-border/60 bg-primary/5">
                                    <CardTitle className="text-base font-bold">Configure App</CardTitle>
                                    <CardDescription className="text-xs font-medium">Link your device below.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-5 space-y-6">
                                    <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                                        <div className="space-y-4 flex-1 w-full max-w-sm lg:max-w-none">
                                            <div className="flex items-center justify-center lg:justify-start gap-2.5">
                                                <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                                                <p className="font-bold text-xs leading-relaxed text-muted-foreground uppercase">Scan QR Code</p>
                                            </div>
                                            <div className="p-4 bg-muted/10 rounded-xl border border-dashed border-border/60 flex flex-col items-center">
                                                <div className="bg-white p-3 rounded-lg shadow-2xs border border-white mb-3">
                                                    <QRCodeSVG value={qrUri} size={150} />
                                                </div>
                                                <div className="text-center w-full px-2">
                                                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Manual Key:</p>
                                                    <code className="text-xs font-mono font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-md border border-primary/20 select-all tracking-wider block truncate">{secret}</code>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-px self-stretch bg-border/60 hidden lg:block" />

                                        <div className="space-y-4 flex-1 w-full max-w-sm lg:max-w-none">
                                            <div className="flex items-center justify-center lg:justify-start gap-2.5">
                                                <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                                                <p className="font-bold text-xs leading-relaxed text-muted-foreground uppercase">Verify Code</p>
                                            </div>
                                            <div className="p-5 bg-card/60 backdrop-blur-xs rounded-xl border border-border/60 shadow-2xs space-y-4 flex flex-col justify-center h-full min-h-[160px]">
                                                <div className="space-y-1">
                                                    <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground text-center block">Verification Code</Label>
                                                    <Input 
                                                        value={code} 
                                                        onChange={e => setCode(e.target.value)} 
                                                        placeholder="000 000" 
                                                        className="text-center font-bold text-xl tracking-[0.3em] h-11 rounded-lg border-input/80 bg-card/60 shadow-2xs focus:border-primary transition-all"
                                                        maxLength={6}
                                                    />
                                                </div>
                                                <Button onClick={verifyAndEnable} className="w-full h-10 rounded-lg font-bold text-xs shadow-xs active:scale-95 transition-all">
                                                   Enable Secure Access
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {backupCodes.length > 0 && (
                            <Card className="border-2 border-primary rounded-xl bg-card/70 backdrop-blur-md shadow-xs overflow-hidden animate-in zoom-in-95 duration-500">
                                <CardHeader className="p-6 bg-primary text-primary-foreground">
                                    <CardTitle className="text-xl font-bold flex items-center gap-2.5">
                                        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-6 w-6" /> Activated!
                                    </CardTitle>
                                    <CardDescription className="text-primary-foreground/80 text-xs font-medium">
                                        Save these backup codes in a safe place.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 space-y-5">
                                    <div className="p-4 bg-card/80 backdrop-blur-md rounded-lg border border-border/70 shadow-2xs">
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono text-center font-bold text-sm text-foreground tracking-wider">
                                            {backupCodes.map((c, i) => (
                                                <div key={i} className="py-2.5 bg-primary/5 rounded-md border border-primary/20 shadow-2xs">{c}</div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-primary/5 p-4 rounded-lg border border-dashed border-primary/20 flex items-start gap-3">
                                        <HugeiconsIcon icon={InformationCircleIcon} className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                        <p className="text-xs font-medium text-foreground leading-relaxed">
                                            Save these codes offline. Each code can only be used once. 
                                        </p>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-6 pt-0">
                                    <Button onClick={() => navigate('/patient/account')} variant="outline" className="w-full h-10 rounded-lg font-bold text-xs border-primary/30 text-primary bg-card hover:bg-primary/5 transition-all shadow-2xs">
                                        Saved Safely
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </PatientLayout>
    );
};

export default PatientManage2FAPage;
