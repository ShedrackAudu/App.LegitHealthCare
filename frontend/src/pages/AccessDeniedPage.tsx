import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShieldAlert, 
  Key, 
  Send, 
  ChevronLeft, 
  Loader2, 
  ShieldCheck
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAppContext } from '@/context/AppContext';

const AccessDeniedPage: React.FC = () => {
    const [isRequesting, setIsRequesting] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [accessCode, setAccessCode] = useState('');
    const [requestSent, setRequestSent] = useState(false);
    const { user, setUser } = useAppContext();
    const location = useLocation();
    const navigate = useNavigate();
    
    // The path the user tried to access
    const fromPath = location.state?.from?.pathname || location.pathname;
    const featureName = fromPath.split('/').filter(Boolean).pop()?.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

    const handleRequestAccess = async () => {
        setIsRequesting(true);
        try {
            await axios.post('/api/admin/request-access', {
                user_id: user?.id,
                path: fromPath
            });
            setRequestSent(true);
            toast.success("Access request sent to hospital administration.");
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to send request. Contact IT.");
        } finally {
            setIsRequesting(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (accessCode.length < 4) return;
        
        setIsVerifying(true);
        try {
            const resp = await axios.post('/api/admin/verify-access-code', {
                code: accessCode,
                path: fromPath
            });
            
            toast.success("Access Granted! Welcome back.");
            
            // Temporary strategy: update local user permissions or just allow navigation
            // For now, if verification is successful, we let them proceed
            // A more robust way would be the backend returning updated user info
            if (resp.data.user) {
                setUser(resp.data.user);
                localStorage.setItem('user', JSON.stringify(resp.data.user));
            }
            
            navigate(fromPath, { replace: true });
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Invalid or expired access code.");
            setAccessCode('');
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <MainLayout>
            <div className="min-h-[calc(100vh-12rem)] flex flex-col items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-sm"
                >
                    <Card className="border shadow-2xl overflow-hidden bg-card/40 backdrop-blur-xl border-rose-500/10 rounded-xl transition-all">
                        <div className="h-1 bg-rose-600 w-full shadow-[0_0_10px_rgba(225,29,72,0.3)]" />
                        <CardHeader className="text-center pb-2 pt-6">
                            <div className="flex justify-center mb-3">
                                <motion.div 
                                    animate={{ 
                                        opacity: [0.5, 1, 0.5],
                                        scale: [1, 1.05, 1]
                                    }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    className="p-3 bg-rose-500/5 rounded-xl border border-rose-500/10 shadow-lg shadow-rose-950/20"
                                >
                                    <ShieldAlert className="w-8 h-8 text-rose-500" />
                                </motion.div>
                            </div>
                            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                                Access Denied
                            </CardTitle>
                            <CardDescription className="flex flex-col items-center gap-2.5 mt-2.5 px-6">
                                <span className="bg-rose-600/90 text-white px-2 py-0.5 rounded-full text-[7.5px] font-bold uppercase tracking-[0.2em] shadow-sm ring-1 ring-white/10">Restricted</span>
                                <span className="text-[12.5px] font-medium text-muted-foreground/90 text-center leading-relaxed">
                                    {featureName || 'Requested Portal'} is secured behind administrative clearance.
                                </span>
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-5 pt-4 px-6 pb-8">
                            <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-3.5 flex gap-4 items-start">
                                <p className="text-[10px] text-muted-foreground/80 leading-relaxed font-medium italic text-center w-full">
                                    "Professional medical access only. Every interaction is strictly monitored in the system audit trail."
                                </p>
                            </div>

                            <div className="space-y-4">
                               {!requestSent ? (
                                    <Button 
                                        onClick={handleRequestAccess}
                                        disabled={isRequesting}
                                        className="w-full h-11 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/40 rounded-lg transition-all hover:scale-[1.01] active:scale-[0.98] border-none"
                                    >
                                        {isRequesting ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <span className="flex items-center gap-2.5">
                                                <Send className="w-4 h-4" />
                                                Request Entrance Key
                                            </span>
                                        )}
                                    </Button>
                               ) : (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3 text-center"
                                    >
                                        <p className="text-emerald-500 text-[10px] font-bold flex items-center justify-center gap-2 uppercase tracking-widest">
                                            <ShieldCheck className="w-3.5 h-3.5" /> Request Dispatched
                                        </p>
                                    </motion.div>
                               )}

                                <div className="relative py-1">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-border/50" />
                                    </div>
                                    <div className="relative flex justify-center text-[8px] font-bold uppercase tracking-[0.3em]">
                                        <span className="bg-card/0 px-3 text-muted-foreground/40 backdrop-blur-sm">Security Verification</span>
                                    </div>
                                </div>

                                <form onSubmit={handleVerifyCode} className="space-y-2.5">
                                    <div className="relative group">
                                        <Key className="absolute left-3.5 top-3 w-4.5 h-4.5 text-rose-500/40 group-focus-within:text-rose-500 transition-colors" />
                                        <Input 
                                            value={accessCode}
                                            onChange={e => setAccessCode(e.target.value.toUpperCase())}
                                            placeholder="ENTER ACCESS CODE"
                                            className="h-11 pl-11 font-mono text-xs tracking-[0.15em] font-bold border border-border/50 focus-visible:ring-rose-500/10 focus-visible:border-rose-500/50 rounded-lg bg-muted/20 text-foreground shadow-inner transition-all placeholder:text-muted-foreground/20"
                                            maxLength={15}
                                            disabled={isVerifying}
                                        />
                                    </div>
                                    <Button 
                                        type="submit" 
                                        disabled={isVerifying || accessCode.length < 4}
                                        className="w-full h-11 bg-primary/90 hover:bg-primary text-[11px] font-bold rounded-lg shadow-lg shadow-primary/10 transition-all border-none"
                                    >
                                        {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Unlock Access"}
                                    </Button>
                                </form>
                            </div>
                        </CardContent>

                        <CardFooter className="bg-muted/10 border-t border-border/50 flex justify-center py-3">
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => navigate('/dashboard')}
                                className="text-muted-foreground hover:text-rose-500 font-semibold text-[9px] gap-1.5 rounded-lg h-8"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                                Return to Dashboard
                            </Button>
                        </CardFooter>
                    </Card>
                </motion.div>
            </div>
        </MainLayout>
    );
};

export default AccessDeniedPage;
