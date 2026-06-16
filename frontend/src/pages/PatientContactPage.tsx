import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  WhatsappIcon, 
  CallIcon, 
  Mail01Icon, 
  ArrowUpRight01Icon, 
  SentIcon, 
  ArrowLeft01Icon, 
  Building02Icon, 
  LicenseIcon 
} from '@hugeicons/core-free-icons';
import { PatientLayout } from '@/components/layout/PatientLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import api from '@/lib/api';
import axios from 'axios';

const PatientContactPage: React.FC = () => {
    const { user, activeSection } = useAppContext();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    const [contactInfo, setContactInfo] = useState({
        email: '',
        phone: '',
        whatsapp: '',
        clinic_name: 'Legit HealthCare'
    });

    const [patientMeta, setPatientMeta] = useState({
        staff_id: '',
        full_name: '',
        department: '',
        section: ''
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch branding/contact info
            const brandingRes = await axios.get('/api/branding', {
                headers: { 'X-Company-Context': activeSection }
            });
            setContactInfo({
                email: brandingRes.data.email || '',
                phone: brandingRes.data.phone || '',
                whatsapp: brandingRes.data.whatsapp || '',
                clinic_name: brandingRes.data.clinic_name || 'Legit HealthCare'
            });

            // Fetch patient profile for identity info
            if (user?.username) {
                const profileRes = await api.get('/api/patient/profile', {
                    headers: { 'X-Staff-ID': user.username }
                });
                const p = profileRes.data;
                const fullName = [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ');
                setPatientMeta({
                    staff_id: p.staff_id || user.username || '',
                    full_name: fullName || user.first_name || '',
                    department: p.department || '',
                    section: p.section || ''
                });
            }
        } catch (err) {
            console.error("Failed to load contact data:", err);
        } finally {
            setLoading(false);
        }
    }, [activeSection, user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const buildWhatsAppUrl = (userMessage: string) => {
        const cleanNumber = contactInfo.whatsapp.replace(/\D/g, '');
        // Auto-append patient identity
        const identityBlock = `\n\n---\nName: ${patientMeta.full_name}\nStaff ID: ${patientMeta.staff_id}\nDepartment: ${patientMeta.department}\nSection: ${patientMeta.section}`;
        const fullMessage = userMessage.trim() + identityBlock;
        return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(fullMessage)}`;
    };

    const handleWhatsAppSend = () => {
        if (!contactInfo.whatsapp) {
            toast.error("WhatsApp contact is not configured.");
            return;
        }
        if (!message.trim()) {
            toast.error("Please type a message first.");
            return;
        }
        window.open(buildWhatsAppUrl(message), '_blank');
    };

    const handleDirectWhatsApp = () => {
        if (!contactInfo.whatsapp) {
            toast.error("WhatsApp contact is not configured.");
            return;
        }
        const cleanNumber = contactInfo.whatsapp.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanNumber}`, '_blank');
    };

    if (loading) {
        return (
            <PatientLayout>
                <div className="space-y-5">
                    {/* Header Skeleton */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                            <Skeleton className="h-6 w-32 bg-muted/40 rounded animate-pulse" />
                            <Skeleton className="h-4 w-64 bg-muted/40 rounded mt-1 animate-pulse" />
                        </div>
                        <Skeleton className="h-9 w-24 bg-muted/40 rounded-xl animate-pulse" />
                    </div>

                    {/* Quick Contact Row Skeleton */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Card className="border shadow-md rounded-xl overflow-hidden bg-card/40">
                            <CardContent className="p-4 flex items-center gap-3">
                                <Skeleton className="h-8 w-8 bg-muted/40 rounded-xl shrink-0 animate-pulse" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-2.5 w-16 bg-muted/30 rounded animate-pulse" />
                                    <Skeleton className="h-4 w-28 bg-muted/40 rounded animate-pulse" />
                                </div>
                                <Skeleton className="h-8 w-16 bg-muted/40 rounded-lg shrink-0 animate-pulse" />
                            </CardContent>
                        </Card>
                        <Card className="border shadow-md rounded-xl overflow-hidden bg-card/40">
                            <CardContent className="p-4 flex items-center gap-3">
                                <Skeleton className="h-8 w-8 bg-muted/40 rounded-xl shrink-0 animate-pulse" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-2.5 w-16 bg-muted/30 rounded animate-pulse" />
                                    <Skeleton className="h-4 w-28 bg-muted/40 rounded animate-pulse" />
                                </div>
                                <Skeleton className="h-8 w-16 bg-muted/40 rounded-lg shrink-0 animate-pulse" />
                            </CardContent>
                        </Card>
                    </div>

                    {/* WhatsApp Section Skeleton */}
                    <Card className="border shadow-lg rounded-xl overflow-hidden">
                        <CardHeader className="p-5 border-b bg-muted/5 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-8 w-8 bg-muted/40 rounded-xl shrink-0 animate-pulse" />
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-20 bg-muted/40 rounded animate-pulse" />
                                    <Skeleton className="h-3 w-36 bg-muted/40 rounded animate-pulse" />
                                </div>
                            </div>
                            <Skeleton className="h-5 w-12 bg-muted/30 rounded-full animate-pulse" />
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <Skeleton className="h-6 w-20 bg-muted/30 rounded-lg animate-pulse" />
                                <Skeleton className="h-6 w-32 bg-muted/30 rounded-lg animate-pulse" />
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Skeleton className="h-3 w-20 bg-muted/30 rounded animate-pulse" />
                                    <Skeleton className="h-2.5 w-10 bg-muted/30 rounded animate-pulse" />
                                </div>
                                <Skeleton className="h-[120px] w-full bg-muted/40 rounded-xl animate-pulse" />
                                <Skeleton className="h-3 w-64 bg-muted/30 rounded animate-pulse" />
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <Skeleton className="h-10 w-full bg-muted/40 rounded-xl animate-pulse" />
                                <Skeleton className="h-10 w-full bg-muted/40 rounded-xl animate-pulse" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </PatientLayout>
        );
    }

    return (
        <PatientLayout>
            <div className="space-y-5 animate-in fade-in duration-700">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight">Contact Us</h1>
                        <p className="text-[10px] md:text-xs text-muted-foreground font-medium mt-0.5">
                            Reach out to {contactInfo.clinic_name} support.
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => navigate('/patient/dashboard')} className="gap-2 font-bold rounded-xl border h-9 text-[10px]">
                        <HugeiconsIcon icon={ArrowLeft01Icon} className="w-3 h-3" /> Dashboard
                    </Button>
                </div>

                {/* Quick Contact Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Call */}
                    <Card className="border shadow-md rounded-xl overflow-hidden bg-card/40">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-xl text-primary shrink-0">
                                    <HugeiconsIcon icon={CallIcon} className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Call Support</p>
                                    <p className="text-sm font-black truncate">{contactInfo.phone || 'Not Available'}</p>
                                </div>
                                <Button 
                                    size="sm"
                                    className="h-8 rounded-lg font-black text-[9px] px-4 shadow-md shadow-primary/10 active:scale-95 transition-all shrink-0"
                                    asChild
                                    disabled={!contactInfo.phone}
                                >
                                    <a href={`tel:${contactInfo.phone?.replace(/\D/g, '')}`}>
                                        <HugeiconsIcon icon={CallIcon} className="mr-1.5 h-3 w-3" /> Call
                                    </a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Email */}
                    <Card className="border shadow-md rounded-xl overflow-hidden bg-card/40">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600 shrink-0">
                                    <HugeiconsIcon icon={Mail01Icon} className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Email Support</p>
                                    <p className="text-sm font-black truncate">{contactInfo.email || 'Not Available'}</p>
                                </div>
                                <Button 
                                    size="sm"
                                    variant="outline"
                                    className="h-8 rounded-lg font-black text-[9px] px-4 border hover:bg-blue-500 hover:text-white transition-all active:scale-95 shrink-0"
                                    asChild
                                    disabled={!contactInfo.email}
                                >
                                    <a href={`mailto:${contactInfo.email}`}>
                                        <HugeiconsIcon icon={SentIcon} className="mr-1.5 h-3 w-3" /> Email
                                    </a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* WhatsApp Section */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="border shadow-lg rounded-xl overflow-hidden">
                        <CardHeader className="p-5 border-b bg-muted/5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                                        <HugeiconsIcon icon={WhatsappIcon} className="w-4.5 h-4.5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-black tracking-tight">WhatsApp</CardTitle>
                                        <CardDescription className="text-[10px] font-medium">Send a message directly.</CardDescription>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                    <span className="text-[8px] font-black text-emerald-700 uppercase tracking-tighter">Online</span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            {/* Identity Badge */}
                            <div className="flex flex-wrap gap-2">
                                <div className="flex items-center gap-1.5 bg-muted/30 px-2.5 py-1 rounded-lg border text-[9px] font-black text-muted-foreground">
                                    <HugeiconsIcon icon={LicenseIcon} className="w-3 h-3 text-primary" />
                                    {patientMeta.staff_id || 'N/A'}
                                </div>
                                <div className="flex items-center gap-1.5 bg-muted/30 px-2.5 py-1 rounded-lg border text-[9px] font-black text-muted-foreground">
                                    <HugeiconsIcon icon={Building02Icon} className="w-3 h-3 text-primary" />
                                    {patientMeta.department || 'N/A'} · {patientMeta.section || 'N/A'}
                                </div>
                            </div>

                            {/* Message Area */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Your Message</label>
                                    <span className="text-[8px] font-bold text-muted-foreground/50">{message.length}/500</span>
                                </div>
                                <Textarea 
                                    placeholder="Describe your inquiry (e.g. I need help with my medical report...)"
                                    className="min-h-[120px] text-sm font-semibold border rounded-xl p-4 focus-visible:ring-emerald-500 resize-none"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                                />
                                <p className="text-[9px] text-muted-foreground/60 font-medium">
                                    Your Staff ID and department will be appended automatically.
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-2.5">
                                <Button 
                                    className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black text-[10px] active:scale-95 transition-all"
                                    onClick={handleWhatsAppSend}
                                >
                                    <HugeiconsIcon icon={SentIcon} className="mr-1.5 h-3.5 w-3.5" /> Send Message
                                </Button>
                                <Button 
                                    variant="outline"
                                    className="h-10 rounded-xl border font-black text-[10px] text-emerald-700 hover:bg-emerald-50 active:scale-95 transition-all"
                                    onClick={handleDirectWhatsApp}
                                >
                                    <HugeiconsIcon icon={ArrowUpRight01Icon} className="mr-1.5 h-3.5 w-3.5" /> Direct Chat
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </PatientLayout>
    );
};

export default PatientContactPage;
