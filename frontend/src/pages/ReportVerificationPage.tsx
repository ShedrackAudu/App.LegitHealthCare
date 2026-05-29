import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
    CheckmarkCircle02Icon, 
    CancelCircleIcon, 
    Loading03Icon, 
    File01Icon, 
    Calendar03Icon, 
    Building02Icon, 
    UserIcon, 
    Shield01Icon, 
    ArrowUpRight01Icon,
    Clock01Icon
} from '@hugeicons/core-free-icons';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { useAppContext } from '../context/AppContext';
import { API_BASE_URL } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ModeToggle } from '@/components/mode-toggle';

const ReportVerificationPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const { branding } = useAppContext();
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<'success' | 'failed' | null>(null);
    const [reportDetails, setReportDetails] = useState<any>(null);

    useEffect(() => {
        const verifyReport = async () => {
            if (!token) {
                setStatus('failed');
                setLoading(false);
                return;
            }

            try {
                const response = await axios.get(`/api/public/verify/${token}`);
                setReportDetails(response.data);
                setStatus('success');
            } catch (err) {
                setStatus('failed');
            } finally {
                setLoading(false);
            }
        };

        verifyReport();
    }, [token]);

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background text-foreground flex items-center justify-center p-4 relative">
            {/* Theme Switcher */}
            <div className="absolute top-6 right-6">
                <ModeToggle />
            </div>

            <div className="w-full max-w-lg">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div 
                            key="loading"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex flex-col items-center justify-center py-12"
                        >
                            <div className="relative">
                                <HugeiconsIcon icon={Loading03Icon} className="h-10 w-10 animate-spin text-primary" />
                                <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
                            </div>
                            <p className="mt-4 text-xs font-bold text-muted-foreground animate-pulse">
                                Validating Digital Signature...
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key={status || 'empty'}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        >
                            <Card className="border-border/50 overflow-hidden bg-card/50 backdrop-blur-xl">
                                {/* Integrated Brand Header */}
                                <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-border/10">
                                    {branding?.logo_light ? (
                                        <img 
                                            src={`${API_BASE_URL}${branding.logo_light}`} 
                                            alt="Clinic Logo" 
                                            className="h-9 w-auto object-contain"
                                        />
                                    ) : (
                                        <span className="font-black text-xs tracking-tighter">LEGIT HEALTHCARE</span>
                                    )}
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full">
                                        <HugeiconsIcon icon={Shield01Icon} className="h-2.5 w-2.5 text-primary" />
                                        <span className="text-[8px] font-black uppercase tracking-widest text-primary">Secure Portal</span>
                                    </div>
                                </div>

                                {/* Status Banner */}
                                <div className={`py-3 px-5 flex items-center justify-between ${
                                    status === 'success' ? 'bg-primary/5 border-b border-primary/10' : 'bg-destructive/5 border-b border-destructive/10'
                                }`}>
                                    <div className="flex items-center gap-2.5">
                                        <div className={`p-1.5 rounded-lg ${status === 'success' ? 'bg-primary/20' : 'bg-destructive/20'}`}>
                                            {status === 'success' ? (
                                                <HugeiconsIcon icon={CheckmarkCircle02Icon} className={`h-4 w-4 ${status === 'success' ? 'text-primary' : 'text-destructive'}`} />
                                            ) : (
                                                <HugeiconsIcon icon={CancelCircleIcon} className="h-4 w-4 text-destructive" />
                                            )}
                                        </div>
                                        <div>
                                            <h2 className="text-[11px] font-black uppercase tracking-tight leading-none mb-0.5">
                                                {status === 'success' ? 'Authenticity Verified' : 'Verification Failed'}
                                            </h2>
                                            <p className="text-[10px] font-medium text-muted-foreground leading-none">
                                                {status === 'success' ? 'Document integrity confirmed' : 'Invalid or tampered record'}
                                            </p>
                                        </div>
                                    </div>
                                    {status === 'success' && (
                                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-black text-[9px] px-1.5 py-0 uppercase">
                                            Original
                                        </Badge>
                                    )}
                                </div>

                                <CardContent className="p-4">
                                    {status === 'success' && reportDetails ? (
                                        <div className="space-y-4">
                                            {/* Patient Info Header */}
                                            <div className="flex items-center gap-4 pb-4 border-b border-dashed border-border/60">
                                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 shrink-0 shadow-sm">
                                                    <HugeiconsIcon icon={UserIcon} className="h-6 w-6 text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h3 className="text-xl font-black tracking-tight leading-none truncate pr-2">
                                                            {reportDetails.patient_name}
                                                        </h3>
                                                        <Badge variant="outline" className="text-[7px] font-black uppercase tracking-widest border-primary/20 text-primary h-4 px-1 shrink-0">
                                                            Patient
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[8px] font-black uppercase text-muted-foreground tracking-tighter">Ref No.</span>
                                                            <Badge variant="secondary" className="text-[9px] font-mono font-bold py-0 h-4 px-1.5 bg-muted/50">
                                                                {reportDetails.staff_id}
                                                            </Badge>
                                                        </div>
                                                        <div className="h-3 w-[1px] bg-border" />
                                                        <div className="flex items-center gap-1 text-primary">
                                                            <HugeiconsIcon icon={Shield01Icon} className="h-3 w-3" />
                                                            <span className="text-[9px] font-black uppercase tracking-wide">Identity Verified</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Compact Details Grid */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50 group hover:bg-muted/50 transition-colors">
                                                    <div className="flex items-center gap-1.5 mb-1 text-primary">
                                                        <HugeiconsIcon icon={Calendar03Icon} className="h-3 w-3" />
                                                        <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground">Period</span>
                                                    </div>
                                                    <p className="text-xs font-bold">{reportDetails.year} Screening</p>
                                                </div>
                                                <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50 group hover:bg-muted/50 transition-colors">
                                                    <div className="flex items-center gap-1.5 mb-1 text-primary">
                                                        <HugeiconsIcon icon={Building02Icon} className="h-3 w-3" />
                                                        <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground">Section</span>
                                                    </div>
                                                    <p className="text-xs font-bold">{reportDetails.section}</p>
                                                </div>
                                            </div>

                                            {/* Digital Fingerprint */}
                                            <div className="p-3 rounded-xl bg-primary/[0.03] border border-primary/10">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <HugeiconsIcon icon={Shield01Icon} className="h-3 w-3 text-primary" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">Digital Signature</span>
                                                    </div>
                                                    <Badge variant="outline" className="text-[7px] font-mono border-primary/20 text-primary/70 h-3.5 px-1">AES-256</Badge>
                                                </div>
                                                <div className="grid grid-cols-1 gap-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] font-bold text-muted-foreground">Generated On</span>
                                                        <span className="text-[9px] font-bold">{new Date(reportDetails.generated_at).toLocaleString('en-GB')}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] font-bold text-muted-foreground">Hash Digest</span>
                                                        <span className="text-[9px] font-mono text-muted-foreground truncate ml-4 max-w-[120px]">
                                                            {token?.substring(0, 16)}...
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-6 text-center">
                                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-3 ring-4 ring-destructive/5">
                                                <HugeiconsIcon icon={CancelCircleIcon} className="h-6 w-6 text-destructive" />
                                            </div>
                                            <h3 className="text-base font-black tracking-tight mb-1">Invalid Verification Code</h3>
                                            <p className="text-xs text-muted-foreground max-w-[240px] mx-auto leading-tight font-medium">
                                                Verification failed. Document may be altered or expired.
                                            </p>
                                            <div className="mt-6 pt-4 border-t border-dashed border-border/60">
                                                <p className="text-[9px] font-black text-destructive uppercase tracking-widest mb-0.5">Security Warning</p>
                                                <p className="text-[8px] font-medium text-muted-foreground italic leading-tight">
                                                    Forged documents are a serious legal offense.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Footer Branding */}
                                    <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[7px] font-black uppercase text-muted-foreground tracking-widest">Authorized By</span>
                                            <span className="text-[9px] font-black uppercase tracking-tighter text-foreground/80">
                                                {branding?.clinic_name || 'Legit HealthCare Systems'}
                                            </span>
                                        </div>
                                        <Link to="/" className="flex items-center gap-1 text-[9px] font-black text-primary hover:opacity-80 transition-opacity uppercase tracking-wider">
                                            Main Portal
                                            <HugeiconsIcon icon={ArrowUpRight01Icon} className="h-2.5 w-2.5" />
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="mt-6 text-center">
                    <p className="text-[8px] font-medium text-muted-foreground/60 uppercase tracking-[0.2em]">
                        &copy; {new Date().getFullYear()} LEGIT HEALTHCARE SYSTEMS • All Rights Reserved
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ReportVerificationPage;
