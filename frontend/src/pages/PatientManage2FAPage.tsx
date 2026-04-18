import { useState, useEffect } from 'react';
import { PatientLayout } from '@/components/layout/PatientLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, ShieldAlert, Check, Info, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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
            const resp = await axios.post(`/api/2fa/generate?portal=patient`, {}, {
                headers: { 'X-User-ID': user?.id }
            });
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
            const resp = await axios.post(`/api/2fa/enable`, { code, portal: 'patient' }, {
                headers: { 'X-User-ID': user?.id }
            });
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
            const resp = await axios.post(`/api/2fa/disable`, { code: disableCode, portal: 'patient' }, {
                headers: { 'X-User-ID': user?.id }
            });
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
            <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-700 pb-20">
                <Button variant="ghost" onClick={() => navigate('/patient/account')} className="mb-1 h-8 gap-2 font-black group rounded-xl text-[10px] text-muted-foreground hover:text-primary">
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Back
                </Button>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                           <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                           <h1 className="text-xl sm:text-2xl font-black tracking-tight">Two-Factor Security</h1>
                           <p className="text-[10px] text-muted-foreground font-medium">Protect your medical data with an extra layer.</p>
                        </div>
                    </div>
                    {user?.is_2fa_enabled && (
                        <div className="px-2.5 py-1.5 bg-primary text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-md">
                           <Check className="w-3 h-3" /> 2FA Active
                        </div>
                    )}
                </div>

                {user?.is_2fa_enabled ? (
                    <Card className="border border-primary/20 shadow-lg rounded-2xl overflow-hidden">
                        <CardHeader className="bg-primary/5 p-5 border-b">
                            <CardTitle className="text-lg font-black text-primary">Authentication is enabled</CardTitle>
                            <CardDescription className="text-[10px] font-medium">Your account is currently protected.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-5 space-y-5">
                            <div className="p-4 bg-muted/40 rounded-2xl text-[13px] border-2 border-dashed flex items-start gap-4">
                                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <p className="font-black text-sm text-foreground">Need to turn off 2FA?</p>
                                    <p className="text-muted-foreground leading-relaxed">Enter your 6-digit verification code to disable protection.</p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                <Input 
                                    placeholder="000 000" 
                                    value={disableCode} 
                                    onChange={e => setDisableCode(e.target.value)} 
                                    className="h-10 rounded-xl border font-black text-sm max-w-sm text-center tracking-[0.2em]"
                                    maxLength={6}
                                />
                                <Button variant="destructive" onClick={verifyAndDisable} className="h-10 px-6 rounded-xl font-black text-[11px] shadow-md transition-transform active:scale-95 w-full sm:w-auto">
                                   Disable Security
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {!qrUri && (
                            <Card className="border border-primary/10 shadow-lg rounded-2xl overflow-hidden">
                                <CardHeader className="p-5 text-center space-y-2">
                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto text-primary">
                                       <ShieldAlert className="w-6 h-6" />
                                    </div>
                                    <CardTitle className="text-lg font-black tracking-tight">Secure Your Portal</CardTitle>
                                    <CardDescription className="text-[11px] font-medium max-w-sm mx-auto leading-relaxed">
                                        Take the lead in your data privacy. Ensuring only you can access your results.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-5 pb-0 flex flex-col items-center">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-center mb-6">
                                        <div className="space-y-0.5">
                                            <p className="text-primary font-black uppercase text-[8px] tracking-[0.2em] opacity-60">Step 1</p>
                                            <p className="text-[11px] font-black">Install Authenticator App</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-primary font-black uppercase text-[8px] tracking-[0.2em] opacity-60">Step 2</p>
                                            <p className="text-[11px] font-black">Scan Private QR Code</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-primary font-black uppercase text-[8px] tracking-[0.2em] opacity-60">Step 3</p>
                                            <p className="text-[11px] font-black">Confirm Verification</p>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-4 bg-muted/10 flex justify-center border-t">
                                    <Button onClick={beginSetup} disabled={isGenerating} className="h-10 px-8 rounded-xl text-[11px] font-black shadow-lg shadow-primary/10 transition-all hover:scale-105 active:scale-95">
                                        {isGenerating ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="mr-2 h-3.5 w-3.5" />}
                                        {isGenerating ? "Preparing..." : "Start Setup"}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}

                        {qrUri && backupCodes.length === 0 && (
                            <Card className="border shadow-lg rounded-2xl overflow-hidden border-primary/20 animate-in slide-in-from-bottom-8 duration-700">
                                <CardHeader className="p-5 border-b bg-primary/5">
                                    <CardTitle className="text-base font-black">Configure App</CardTitle>
                                    <CardDescription className="text-[10px] font-medium">Link your device below.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-5 space-y-6">
                                    <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                                        <div className="space-y-4 flex-1 w-full max-w-sm lg:max-w-none">
                                            <div className="flex items-center justify-center lg:justify-start gap-2.5">
                                                <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                                                <p className="font-black text-[11px] leading-relaxed text-muted-foreground uppercase opacity-80">Scan QR Code</p>
                                            </div>
                                            <div className="p-4 bg-muted/10 rounded-xl border border-dashed flex flex-col items-center">
                                                <div className="bg-white p-3 rounded-xl shadow-lg border border-white mb-3">
                                                    <QRCodeSVG value={qrUri} size={150} />
                                                </div>
                                                <div className="text-center w-full px-2">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Manual Key:</p>
                                                    <code className="text-[8.5px] sm:text-[10px] font-mono font-black bg-primary/10 text-primary px-2 py-1.5 rounded-lg border border-primary/20 select-all tracking-wider block truncate">{secret}</code>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-px self-stretch bg-border hidden lg:block" />

                                        <div className="space-y-4 flex-1 w-full max-w-sm lg:max-w-none">
                                            <div className="flex items-center justify-center lg:justify-start gap-2.5">
                                                <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                                                <p className="font-black text-[11px] leading-relaxed text-muted-foreground uppercase opacity-80">Verify Code</p>
                                            </div>
                                            <div className="p-5 bg-card rounded-2xl border shadow-inner space-y-5 flex flex-col justify-center h-full min-h-[160px]">
                                                <div className="space-y-1">
                                                    <Label className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground text-center block opacity-60">Verification Code</Label>
                                                    <Input 
                                                        value={code} 
                                                        onChange={e => setCode(e.target.value)} 
                                                        placeholder="000 000" 
                                                        className="text-center font-black text-2xl tracking-[0.3em] h-12 rounded-xl border focus:border-primary transition-all shadow-sm"
                                                        maxLength={6}
                                                    />
                                                </div>
                                                <Button onClick={verifyAndEnable} className="w-full h-11 rounded-xl font-black text-[11px] shadow-lg shadow-primary/10 active:scale-95 transition-all">
                                                   Enable Secure Access
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {backupCodes.length > 0 && (
                            <Card className="border-4 border-primary rounded-2xl bg-primary/5/50 shadow-xl overflow-hidden animate-in zoom-in-95 duration-500">
                                <CardHeader className="p-8 bg-primary text-white">
                                    <CardTitle className="text-xl sm:text-2xl font-black flex items-center gap-3">
                                        <CheckCircle2 className="h-7 w-7" /> Activated!
                                    </CardTitle>
                                    <CardDescription className="text-emerald-100 text-sm font-medium">
                                        Save these backup codes in a safe place.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-8 space-y-6">
                                    <div className="p-6 bg-white/80 backdrop-blur-xl rounded-xl border border-primary/30 shadow-md">
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-center font-black text-lg text-emerald-900 tracking-wider">
                                            {backupCodes.map((c, i) => (
                                                <div key={i} className="py-3 bg-primary/5 rounded-lg border border-emerald-100 shadow-sm">{c}</div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-primary/10 p-5 rounded-xl border border-dashed border-primary/30 flex items-start gap-4">
                                        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                        <p className="text-xs font-bold text-emerald-800 leading-relaxed">
                                            Save these codes offline. Each code can only be used once. 
                                        </p>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-8 pt-0">
                                    <Button onClick={() => navigate('/patient/account')} variant="outline" className="w-full h-12 rounded-xl font-black text-sm border-primary/30 text-primary bg-white hover:bg-primary/5 transition-all">
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
