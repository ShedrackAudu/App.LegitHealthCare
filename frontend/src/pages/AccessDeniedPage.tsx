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
    const fromPath = location.state?.from?.pathname || '/dashboard';
    const featureName = fromPath.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

    const handleRequestAccess = async () => {
        setIsRequesting(true);
        try {
            await axios.post('http://localhost:5000/api/admin/request-access', {
                user_id: user?.id,
                path: fromPath
            }, {
                headers: { 'X-User-ID': user?.id?.toString() }
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
            const resp = await axios.post('http://localhost:5000/api/admin/verify-access-code', {
                code: accessCode,
                path: fromPath
            }, {
                headers: { 'X-User-ID': user?.id?.toString() }
            });
            
            toast.success("Access Granted! Welcome back.");
            
            // Temporary strategy: update local user permissions or just allow navigation
            // For now, if verification is successful, we let them proceed
            // A more robust way would be the backend returning updated user info
            if (resp.data.user) {
                setUser(resp.data.user);
                localStorage.setItem('user', JSON.stringify(resp.data.user));
            }
            
            navigate(fromPath);
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Invalid or expired access code.");
            setAccessCode('');
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <MainLayout>
            <div className="min-h-[70vh] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-sm"
                >
                    <Card className="border-2 shadow-2xl overflow-hidden bg-card border-rose-500/20 rounded-3xl transition-all">
                        <div className="h-1.5 bg-rose-600 w-full shadow-[0_0_15px_rgba(225,29,72,0.4)]" />
                        <CardHeader className="text-center pb-2 pt-8">
                            <div className="flex justify-center mb-4">
                                <motion.div 
                                    animate={{ rotate: [0, 5, -5, 0] }}
                                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                                    className="p-4 bg-rose-500/10 rounded-2xl shadow-inner border border-rose-500/20"
                                >
                                    <ShieldAlert className="w-10 h-10 text-rose-500" />
                                </motion.div>
                            </div>
                            <CardTitle className="text-3xl font-black tracking-tight text-foreground">
                                Access Denied
                            </CardTitle>
                            <CardDescription className="text-sm font-bold text-muted-foreground mt-2 px-6">
                                <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-[10px] font-black mr-1 uppercase shadow-lg shadow-rose-900/20">Restricted</span>
                                {featureName || 'Requested Portal'} is secured behind administrative clearance.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6 pt-6 px-8 pb-10">
                            <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 flex gap-4 items-start shadow-sm">
                                <p className="text-[11px] text-muted-foreground leading-relaxed font-semibold italic text-center w-full">
                                    "Professional medical access only. Every interaction is strictly monitored in the system audit trail."
                                </p>
                            </div>

                            <div className="space-y-5">
                               {!requestSent ? (
                                    <Button 
                                        onClick={handleRequestAccess}
                                        disabled={isRequesting}
                                        className="w-full h-14 text-sm font-black bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-500/20 rounded-2xl transition-all hover:-translate-y-1 active:scale-95 border-b-4 border-rose-800"
                                    >
                                        {isRequesting ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : (
                                            <span className="flex items-center gap-3">
                                                <Send className="w-5 h-5" />
                                                Request Entrance Key
                                            </span>
                                        )}
                                    </Button>
                               ) : (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-emerald-500/10 border-2 border-emerald-500/20 rounded-2xl p-4 text-center ring-1 ring-emerald-500/20"
                                    >
                                        <p className="text-emerald-500 text-xs font-black flex items-center justify-center gap-2 uppercase tracking-widest">
                                            <ShieldCheck className="w-4 h-4" /> Request Dispatched
                                        </p>
                                    </motion.div>
                               )}

                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-border" />
                                    </div>
                                    <div className="relative flex justify-center text-[9px] font-black uppercase tracking-[0.3em]">
                                        <span className="bg-card px-3 text-muted-foreground/50">Security Verification</span>
                                    </div>
                                </div>

                                <form onSubmit={handleVerifyCode} className="space-y-3">
                                    <div className="relative group">
                                        <Key className="absolute left-4 top-3.5 w-5 h-5 text-rose-500/50 group-focus-within:text-rose-500 transition-colors" />
                                        <Input 
                                            value={accessCode}
                                            onChange={e => setAccessCode(e.target.value.toUpperCase())}
                                            placeholder="ENTER ACCESS CODE"
                                            className="h-12 pl-12 font-mono text-sm tracking-[0.2em] font-black border-2 border-border focus-visible:ring-rose-500/20 focus-visible:border-rose-500 rounded-2xl bg-muted/50 text-foreground shadow-inner group-hover:border-rose-500/50 transition-all placeholder:text-muted-foreground/30"
                                            maxLength={15}
                                            disabled={isVerifying}
                                        />
                                    </div>
                                    <Button 
                                        type="submit" 
                                        disabled={isVerifying || accessCode.length < 4}
                                        className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-black rounded-2xl shadow-xl transition-all"
                                    >
                                        {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Unlock Access"}
                                    </Button>
                                </form>
                            </div>
                        </CardContent>

                        <CardFooter className="bg-muted/30 border-t border-border flex justify-center py-4">
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => navigate('/dashboard')}
                                className="text-muted-foreground hover:text-rose-500 font-bold text-[10px] gap-2 rounded-xl"
                            >
                                <ChevronLeft className="w-4 h-4" />
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
