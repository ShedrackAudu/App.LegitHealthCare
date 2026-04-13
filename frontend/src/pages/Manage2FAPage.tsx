import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, ShieldAlert, Copy, Check, Info } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const Manage2FAPage = () => {
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
            const resp = await axios.post(`/api/2fa/generate`, {}, {
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
            const resp = await axios.post(`/api/2fa/enable`, { code }, {
                headers: { 'X-User-ID': user?.id }
            });
            toast.success(resp.data.message || "2FA successfully enabled!");
            setBackupCodes(resp.data.backup_codes || []);
            setUser({ ...user, is_2fa_enabled: true });
            localStorage.setItem('user', JSON.stringify({ ...user, is_2fa_enabled: true }));
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
            const resp = await axios.post(`/api/2fa/disable`, { code: disableCode }, {
                headers: { 'X-User-ID': user?.id }
            });
            toast.success(resp.data.message || "2FA has been disabled.");
            setUser({ ...user, is_2fa_enabled: false });
            localStorage.setItem('user', JSON.stringify({ ...user, is_2fa_enabled: false }));
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
        <MainLayout>
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
                <Button variant="ghost" onClick={() => navigate('/account')} className="mb-4">
                    &larr; Back to Account
                </Button>

                <div className="flex items-center gap-3 mb-6">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold tracking-tight">Two-Factor Authentication</h1>
                </div>

                {user?.is_2fa_enabled ? (
                    <Card className="border-2 border-emerald-500/30">
                        <CardHeader>
                            <CardTitle className="text-emerald-600 flex items-center gap-2">
                                <Check className="h-5 w-5" /> 2FA is Active
                            </CardTitle>
                            <CardDescription>Your account is guarded by secondary verification.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-muted/50 rounded-lg text-sm border flex items-start gap-2">
                                <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                <p>To disable Two-Factor Authentication, you must provide a valid code from your authenticator app.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <Input 
                                    placeholder="Enter 6-digit code to disable" 
                                    value={disableCode} 
                                    onChange={e => setDisableCode(e.target.value)} 
                                    className="max-w-xs"
                                    maxLength={6}
                                />
                                <Button variant="destructive" onClick={verifyAndDisable}>Disable 2FA</Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-6">
                        {!qrUri && (
                            <Card className="border-2 border-primary/20">
                                <CardHeader>
                                    <CardTitle>Enhance Your Security</CardTitle>
                                    <CardDescription>
                                        Two-factor authentication adds an extra layer of security to your account by requiring more than just a password to log in.
                                    </CardDescription>
                                </CardHeader>
                                <CardFooter>
                                    <Button onClick={beginSetup} disabled={isGenerating} size="lg" className="font-bold">
                                        {isGenerating ? "Generating..." : "Set up Authenticator App"}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}

                        {qrUri && backupCodes.length === 0 && (
                            <Card className="border-2 shadow-lg animate-in slide-in-from-bottom-4">
                                <CardHeader>
                                    <CardTitle>Configure Authenticator</CardTitle>
                                    <CardDescription>1. Scan the QR code below with Google Authenticator or Authy.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center space-y-6">
                                    <div className="bg-white p-4 rounded-xl shadow-inner border">
                                        <QRCodeSVG value={qrUri} size={200} />
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center">
                                        Or manually enter this secret key into your app:<br/>
                                        <code className="font-mono font-bold text-primary text-base select-all bg-primary/10 px-2 py-1 rounded mt-1 inline-block">{secret}</code>
                                    </p>
                                    
                                    <div className="w-full max-w-sm space-y-2 border-t pt-6">
                                        <p className="text-sm font-semibold mb-2">2. Enter the 6-digit code to verify:</p>
                                        <div className="flex gap-2">
                                            <Input 
                                                value={code} 
                                                onChange={e => setCode(e.target.value)} 
                                                placeholder="000000" 
                                                className="text-center font-mono text-xl tracking-widest h-12"
                                                maxLength={6}
                                            />
                                            <Button onClick={verifyAndEnable} size="lg" className="h-12 px-8">Verify</Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {backupCodes.length > 0 && (
                            <Card className="border-2 border-emerald-500/50 bg-emerald-50 shadow-lg">
                                <CardHeader>
                                    <CardTitle className="text-emerald-700 flex items-center gap-2">
                                        <Check className="h-5 w-5" /> Setup Complete!
                                    </CardTitle>
                                    <CardDescription className="text-emerald-700/80">
                                        Two-Factor Authentication is now enabled. Please save these backup recovery codes in a secure place. You will need them if you lose access to your device.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-white/60 rounded-xl border border-emerald-200 font-mono text-center font-bold text-emerald-900 tracking-wider">
                                        {backupCodes.map((c, i) => (
                                            <div key={i} className="py-2 bg-white rounded shadow-sm">{c}</div>
                                        ))}
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button onClick={() => setBackupCodes([])} variant="outline" className="w-full bg-white">I have saved my backup codes</Button>
                                </CardFooter>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default Manage2FAPage;
