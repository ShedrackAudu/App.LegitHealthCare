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
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
                <Button variant="ghost" onClick={() => navigate('/patient/account')} className="mb-2 gap-2 font-bold group rounded-xl">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Account Settings
                </Button>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-600">
                           <ShieldCheck className="h-8 w-8" />
                        </div>
                        <div>
                           <h1 className="text-3xl font-black tracking-tight">Email/Two-Factor Security</h1>
                           <p className="text-muted-foreground font-medium">Protect your medical data with an extra layer of verification.</p>
                        </div>
                    </div>
                    {user?.is_2fa_enabled && (
                        <div className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                           <Check className="w-4 h-4" /> 2FA Active
                        </div>
                    )}
                </div>

                {user?.is_2fa_enabled ? (
                    <Card className="border-2 border-emerald-500/20 shadow-xl rounded-[2.5rem] overflow-hidden">
                        <CardHeader className="bg-emerald-500/5 p-8 border-b">
                            <CardTitle className="text-2xl font-black text-emerald-700">Multi-Factor Authentication is Enabled</CardTitle>
                            <CardDescription className="text-base font-medium">Your account is currently protected. To disable this feature, confirm your identity below.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="p-6 bg-muted/40 rounded-2xl text-sm border-2 border-dashed flex items-start gap-4">
                                <Info className="h-6 w-6 text-emerald-600 shrink-0" />
                                <div className="space-y-1">
                                    <p className="font-bold text-base text-foreground">Need to turn off 2FA?</p>
                                    <p className="text-muted-foreground">If you switch devices or no longer wish to use an authenticator app, enter your 6-digit verification code to disable protection.</p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <Input 
                                    placeholder="Enter 6-digit verification code" 
                                    value={disableCode} 
                                    onChange={e => setDisableCode(e.target.value)} 
                                    className="h-14 rounded-xl border-2 font-black text-lg max-w-sm text-center tracking-[0.2em]"
                                    maxLength={6}
                                />
                                <Button variant="destructive" onClick={verifyAndDisable} className="h-14 px-8 rounded-xl font-black text-lg shadow-xl shadow-red-500/20 transition-transform active:scale-95 w-full sm:w-auto">
                                   Disable Security
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {!qrUri && (
                            <Card className="border-2 border-primary/10 shadow-2xl rounded-[3rem] overflow-hidden">
                                <CardHeader className="p-10 text-center space-y-4">
                                    <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto text-primary">
                                       <ShieldAlert className="w-10 h-10" />
                                    </div>
                                    <CardTitle className="text-4xl font-black">Secure Your Patient Portal</CardTitle>
                                    <CardDescription className="text-lg font-medium max-w-xl mx-auto">
                                        Take the lead in your data privacy. Enabling 2FA ensures that only you can access your clinical results and medical transcripts.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-10 pb-0 flex flex-col items-center">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-center mb-10">
                                        <div className="space-y-2">
                                            <p className="text-primary font-black uppercase text-[10px] tracking-widest">Step 1</p>
                                            <p className="text-sm font-bold">Install Authenticator App</p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-primary font-black uppercase text-[10px] tracking-widest">Step 2</p>
                                            <p className="text-sm font-bold">Scan Private QR Code</p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-primary font-black uppercase text-[10px] tracking-widest">Step 3</p>
                                            <p className="text-sm font-bold">Confirm Verification</p>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-10 pt-0 bg-muted/20 flex justify-center border-t">
                                    <Button onClick={beginSetup} disabled={isGenerating} size="lg" className="h-16 px-12 rounded-[2rem] text-xl font-black shadow-2xl shadow-primary/30 transition-all hover:scale-105 active:scale-95">
                                        {isGenerating ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <ShieldCheck className="mr-2 h-6 w-6" />}
                                        {isGenerating ? "Preparing Security Token..." : "Start Setup Now"}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}

                        {qrUri && backupCodes.length === 0 && (
                            <Card className="border-2 shadow-2xl rounded-[3rem] overflow-hidden border-primary/20 animate-in slide-in-from-bottom-8 duration-700">
                                <CardHeader className="p-10 md:p-12 border-b bg-primary/5">
                                    <CardTitle className="text-3xl font-black">Configure Your App</CardTitle>
                                    <CardDescription className="text-base font-medium">Follow the instructions below to link your device.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-10 md:p-12 space-y-12">
                                    <div className="flex flex-col lg:flex-row items-center gap-12">
                                        <div className="space-y-6 flex-1">
                                            <div className="flex gap-4">
                                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black shrink-0">1</div>
                                                <p className="font-bold text-lg leading-relaxed text-muted-foreground">Scan this QR code with <span className="text-foreground">Google Authenticator</span>, <span className="text-foreground">Authy</span>, or any TOTP app.</p>
                                            </div>
                                            <div className="p-6 bg-muted/30 rounded-3xl border-2 border-dashed flex flex-col items-center">
                                                <div className="bg-white p-6 rounded-[2rem] shadow-2xl border-4 border-white mb-6">
                                                    <QRCodeSVG value={qrUri} size={240} />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Can't scan the code?</p>
                                                    <code className="text-sm font-mono font-black bg-primary/10 text-primary px-4 py-2 rounded-xl border border-primary/20 select-all tracking-wider block">{secret}</code>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="w-px h-full bg-border hidden lg:block" />

                                        <div className="space-y-6 flex-1 w-full">
                                            <div className="flex gap-4">
                                                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black shrink-0">2</div>
                                                <p className="font-bold text-lg leading-relaxed text-muted-foreground">Confirm by entering the <span className="text-foreground">6-digit verification code</span> generated by your app.</p>
                                            </div>
                                            <div className="p-8 bg-card rounded-[2.5rem] border-2 shadow-inner space-y-8 flex flex-col justify-center h-full min-h-[300px]">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground text-center block">Verification Code</Label>
                                                    <Input 
                                                        value={code} 
                                                        onChange={e => setCode(e.target.value)} 
                                                        placeholder="000 000" 
                                                        className="text-center font-black text-5xl tracking-[0.3em] h-28 rounded-2xl border-2 border-primary/20 focus:border-primary transition-all shadow-sm"
                                                        maxLength={6}
                                                    />
                                                </div>
                                                <Button onClick={verifyAndEnable} size="lg" className="w-full h-16 rounded-2xl font-black text-xl shadow-xl shadow-primary/30 active:scale-95 transition-all">
                                                   Enable Secure Access
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {backupCodes.length > 0 && (
                            <Card className="border-4 border-emerald-500 rounded-[3rem] bg-emerald-50/50 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
                                <CardHeader className="p-10 md:p-12 bg-emerald-500 text-white">
                                    <CardTitle className="text-4xl font-black flex items-center gap-4">
                                        <CheckCircle2 className="h-10 w-10" /> Security Activated!
                                    </CardTitle>
                                    <CardDescription className="text-emerald-100 text-lg font-medium">
                                        Your account is now fully protected. You must save these backup codes in a safe place.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-10 md:p-12 space-y-8">
                                    <div className="p-8 bg-white/80 backdrop-blur-xl rounded-[2rem] border-2 border-emerald-200 shadow-xl">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-center font-black text-2xl text-emerald-900 tracking-wider">
                                            {backupCodes.map((c, i) => (
                                                <div key={i} className="py-4 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm">{c}</div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-emerald-500/10 p-6 rounded-[2rem] border-2 border-dashed border-emerald-500/30 flex items-start gap-4">
                                        <Info className="w-6 h-6 text-emerald-600 shrink-0 mt-1" />
                                        <p className="text-sm font-bold text-emerald-800 leading-relaxed">
                                            These codes can be used to log in if you lose your phone or delete the authenticator app. 
                                            Each code can only be used once. Keep them offline or in a secure password manager.
                                        </p>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-10 pt-0">
                                    <Button onClick={() => navigate('/patient/account')} variant="outline" className="w-full h-16 rounded-2xl font-black text-xl border-emerald-200 text-emerald-700 bg-white hover:bg-emerald-50 transition-all">
                                        I Have Safely Stored These Codes
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
