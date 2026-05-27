import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Brush, Upload, Loader2, Image as ImageIcon, RotateCcw, Trash2, 
  Facebook, Twitter, Instagram, Linkedin, Youtube, Globe, Link as LinkIcon,
  MessageCircle, Music2
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { Badge } from "@/components/ui/badge";
import { ActionConfirmModal } from '@/components/ActionConfirmModal';
import { SafeImage } from '@/components/common/SafeImage';

const BrandingSettingsPage: React.FC = () => {
    const { activeSection, fetchBranding } = useAppContext();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Form States
    const [clinicName, setClinicName] = useState('Legit HealthCare');
    const [clinicSlogan, setClinicSlogan] = useState('Excellence.');
    const [address, setAddress] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [socialLinks, setSocialLinks] = useState<any[]>([]);
    const [newSocialLabel, setNewSocialLabel] = useState('');
    const [newSocialValue, setNewSocialValue] = useState('');

    const [logoLight, setLogoLight] = useState<File | null>(null);
    const [logoDark, setLogoDark] = useState<File | null>(null);
    const [favicon, setFavicon] = useState<File | null>(null);
    const [heroImage1, setHeroImage1] = useState<File | null>(null);
    const [heroImage2, setHeroImage2] = useState<File | null>(null);
    const [heroImageTeam, setHeroImageTeam] = useState<File | null>(null);

    const [headerImage, setHeaderImage] = useState<File | null>(null);
    const [footerImage, setFooterImage] = useState<File | null>(null);
    const [signatureImage, setSignatureImage] = useState<File | null>(null);
    const [authBrandingImage, setAuthBrandingImage] = useState<File | null>(null);
    const [authLogo, setAuthLogo] = useState<File | null>(null);

    // Current Values
    const [currentBranding, setCurrentBranding] = useState<any>(null);
    const [confirmModal, setConfirmModal] = useState({ 
        open: false,
        type: '' as 'clear_asset', 
        field: '',
        title: '',
        description: ''
    });

    useEffect(() => {
        const loadInitial = async () => {
            if (!activeSection) return;
            setLoading(true);
            try {
                // Using a relative URL or ensuring the base matches the dev server
                const response = await axios.get(`/api/branding/`, {
                    headers: { 'X-Company-Context': activeSection }
                });
                setCurrentBranding(response.data);
                setClinicName(response.data.clinic_name || 'Legit HealthCare');
                setClinicSlogan(response.data.clinic_slogan || 'Excellence.');
                setAddress(response.data.address || '');
                setEmail(response.data.email || '');
                setPhone(response.data.phone || '');
                setSocialLinks(response.data.social_links || []);
            } catch (err: any) {
                console.error("Branding load error:", err);
                toast.error(`Failed to load branding: ${err.message || 'Server error'}`);
            } finally {
                setLoading(false);
            }
        };
        loadInitial();
    }, [activeSection]);


    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('clinic_name', clinicName);
            formData.append('clinic_slogan', clinicSlogan);
            formData.append('address', address);
            formData.append('email', email);
            formData.append('phone', phone);
            formData.append('social_links', JSON.stringify(socialLinks));

            if (logoLight) formData.append('logo_light', logoLight);
            if (logoDark) formData.append('logo_dark', logoDark);
            if (favicon) formData.append('favicon', favicon);
            if (heroImage1) formData.append('hero_image_1', heroImage1);
            if (heroImage2) formData.append('hero_image_2', heroImage2);
            if (heroImageTeam) formData.append('hero_image_team', heroImageTeam);

            if (headerImage) formData.append('header_image', headerImage);
            if (footerImage) formData.append('footer_image', footerImage);
            if (signatureImage) formData.append('signature_image', signatureImage);
            if (authBrandingImage) formData.append('auth_branding_image', authBrandingImage);
            if (authLogo) formData.append('auth_logo', authLogo);

            await axios.post('/api/branding', formData, {
                headers: { 
                    'X-Company-Context': activeSection,
                    'Content-Type': 'multipart/form-data'
                }
            });
            toast.success("Branding updated successfully!");
            // Refresh global app context branding if available
            if (fetchBranding) await fetchBranding();
            
            // Reload local
            const response = await axios.get('/api/branding', {
                headers: { 'X-Company-Context': activeSection }
            });
            setCurrentBranding(response.data);
        } catch (err) {
            toast.error("Failed to save branding settings");
        } finally {
            setSaving(false);
        }
    };

    const handleClear = async () => {
        const field = confirmModal.field;
        if (!field) return;
        setSaving(true);
        try {
            await axios.post('/api/branding/clear', { field }, {
                headers: { 'X-Company-Context': activeSection }
            });
            toast.success("Asset removed successfully");
            setConfirmModal({ ...confirmModal, open: false });
            // Reload local
            const response = await axios.get('/api/branding', {
                headers: { 'X-Company-Context': activeSection }
            });
            setCurrentBranding(response.data);
            if (fetchBranding) await fetchBranding();
        } catch (err) {
            toast.error("Failed to remove asset");
        } finally {
            setSaving(false);
        }
    };

    const getSocialIcon = (label: string) => {
        const l = label.toLowerCase();
        if (l.includes('facebook')) return Facebook;
        if (l.includes('twitter') || l.includes('x')) return Twitter;
        if (l.includes('instagram')) return Instagram;
        if (l.includes('linkedin')) return Linkedin;
        if (l.includes('youtube')) return Youtube;
        if (l.includes('globe') || l.includes('web')) return Globe;
        if (l.includes('whatsapp')) return MessageCircle;
        if (l.includes('tiktok')) return Music2;
        return LinkIcon;
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="h-full w-full flex items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col justify-between items-stretch gap-4 sm:gap-6 bg-card p-4 sm:p-6 rounded-2xl border transition-all">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="p-1.5 sm:p-3 bg-purple-500/10 rounded-xl sm:rounded-2xl shrink-0">
                            <Brush className="text-purple-600 h-5 w-5 sm:h-8 sm:w-8" />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-2xl font-black tracking-tight leading-tight">Clinic Branding</h1>
                            <p className="text-[9px] sm:text-sm text-muted-foreground font-medium">
                                Customize the appearance of the {activeSection} system.
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <Card className="border-2 shadow-lg">
                        <CardHeader className="bg-muted/30 border-b pb-4">
                            <CardTitle className="text-lg">Clinic Identity</CardTitle>
                            <CardDescription>This name usually appears on printed reports and headers.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold uppercase text-muted-foreground">Clinic Name</Label>
                                    <Input 
                                        className="h-12 font-bold text-lg" 
                                        value={clinicName} 
                                        onChange={(e) => setClinicName(e.target.value)}
                                        placeholder="Enter clinic name..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold uppercase text-muted-foreground">Clinic Slogan</Label>
                                    <Input 
                                        className="h-12 font-medium" 
                                        value={clinicSlogan} 
                                        onChange={(e) => setClinicSlogan(e.target.value)}
                                        placeholder="Enter slogan (e.g. Excellence.)..."
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-2 shadow-lg">
                        <CardHeader className="bg-muted/30 border-b pb-4">
                            <CardTitle className="text-lg">Logos & Assets</CardTitle>
                            <CardDescription>Upload transparent PNGs or SVGs for best results. Dimensions: 500x150px.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Light Mode Logo */}
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Brandmark Logo</Label>
                                    <div className="border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center bg-muted/10 relative h-32 group/box">
                                        {currentBranding?.logo_light && !logoLight ? (
                                            <div className="relative group/img flex items-center justify-center h-full w-full">
                                                <SafeImage src={`${(window as any).API_BASE_URL}${currentBranding.logo_light}`} alt="Light Logo" className="max-h-16 object-contain" />
                                                <button 
                                                    type="button"
                                                    onClick={() => setConfirmModal({
                                                        open: true,
                                                        type: 'clear_asset',
                                                        field: 'logo_light',
                                                        title: 'Remove Logo',
                                                        description: 'Are you sure you want to remove the Brandmark logo? This change is immediate.'
                                                    })}
                                                    className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <ImageIcon className="h-6 w-6 text-muted-foreground/30 mb-2" />
                                                <span className="text-[10px] text-muted-foreground italic">No image selected</span>
                                            </div>
                                        )}
                                        <Label htmlFor="logo-light" className="absolute bottom-2 bg-primary text-primary-foreground px-3 py-1 rounded-lg font-bold text-[10px] hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1">
                                            <Upload className="h-3 w-3" />
                                            {logoLight ? 'Ready' : 'Upload'}
                                        </Label>
                                        <input id="logo-light" type="file" accept="image/*" className="hidden" onChange={(e) => setLogoLight(e.target.files?.[0] || null)} />
                                    </div>
                                </div>

                                {/* Dark Mode Logo */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Wordmark Logo</Label>
                                        <Badge variant="outline" className="text-[8px] uppercase tracking-tighter h-4 px-1 opacity-70">Preview Box</Badge>
                                    </div>
                                    <div className="border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center bg-slate-900 dark:bg-black shadow-inner relative h-32 group/box">
                                        {currentBranding?.logo_dark && !logoDark ? (
                                            <div className="relative group/img flex items-center justify-center h-full w-full">
                                                <SafeImage src={`${(window as any).API_BASE_URL}${currentBranding.logo_dark}`} alt="Dark Logo" className="max-h-16 object-contain" />
                                                <button 
                                                    type="button"
                                                    onClick={() => setConfirmModal({
                                                        open: true,
                                                        type: 'clear_asset',
                                                        field: 'logo_dark',
                                                        title: 'Remove Logo',
                                                        description: 'Are you sure you want to remove the Wordmark logo? This change is immediate.'
                                                    })}
                                                    className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <ImageIcon className="h-6 w-6 text-white/20 mb-2" />
                                                <span className="text-[10px] text-white/20 italic">No image selected</span>
                                            </div>
                                        )}
                                        <Label htmlFor="logo-dark" className="absolute bottom-2 bg-white text-black px-3 py-1 rounded-lg font-bold text-[10px] hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1">
                                            <Upload className="h-3 w-3" />
                                            {logoDark ? 'Ready' : 'Upload'}
                                        </Label>
                                        <input id="logo-dark" type="file" accept="image/*" className="hidden" onChange={(e) => setLogoDark(e.target.files?.[0] || null)} />
                                    </div>
                                </div>

                                {/* Favicon */}
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">App Favicon</Label>
                                    <div className="border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center bg-muted/10 relative h-32 group/box">
                                        {currentBranding?.favicon && !favicon ? (
                                            <div className="relative group/img flex items-center justify-center h-full w-full">
                                                <SafeImage src={`${(window as any).API_BASE_URL}${currentBranding.favicon}`} alt="Favicon" className="h-10 w-10 object-contain rounded-md shadow-sm" />
                                                <button 
                                                    type="button"
                                                    onClick={() => setConfirmModal({
                                                        open: true,
                                                        type: 'clear_asset',
                                                        field: 'favicon',
                                                        title: 'Remove Favicon',
                                                        description: 'Are you sure you want to remove the application favicon?'
                                                    })}
                                                    className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <ImageIcon className="h-6 w-6 text-muted-foreground/30 mb-2" />
                                                <span className="text-[10px] text-muted-foreground italic">No image selected</span>
                                            </div>
                                        )}
                                        <Label htmlFor="favicon" className="absolute bottom-2 border-2 shadow-sm px-3 py-1 rounded-lg font-bold text-[10px] hover:bg-muted transition-colors cursor-pointer flex items-center gap-1 bg-background">
                                            <Upload className="h-3 w-3" />
                                            {favicon ? 'Ready' : 'Upload'}
                                        </Label>
                                        <input id="favicon" type="file" accept=".ico,.png,.jpg,.svg" className="hidden" onChange={(e) => setFavicon(e.target.files?.[0] || null)} />
                                    </div>
                                </div>
                                 {/* Auth Background */}
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Auth Page Background</Label>
                                    <div className="border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center bg-muted/10 relative h-32 group/box">
                                        {currentBranding?.auth_branding_image && !authBrandingImage ? (
                                            <div className="relative group/img flex items-center justify-center h-full w-full">
                                                <SafeImage src={`${(window as any).API_BASE_URL}${currentBranding.auth_branding_image}`} alt="Auth BG" className="h-full w-full object-cover rounded-lg" />
                                                <button 
                                                    type="button"
                                                    onClick={() => setConfirmModal({
                                                        open: true,
                                                        type: 'clear_asset',
                                                        field: 'auth_branding_image',
                                                        title: 'Remove Auth Background',
                                                        description: 'Are you sure you want to remove the Authentication background image?'
                                                    })}
                                                    className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <ImageIcon className="h-6 w-6 text-muted-foreground/30 mb-2" />
                                                <span className="text-[10px] text-muted-foreground italic">No image selected</span>
                                            </div>
                                        )}
                                        <Label htmlFor="auth-bg" className="absolute bottom-2 bg-primary text-primary-foreground px-3 py-1 rounded-lg font-bold text-[10px] hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1">
                                            <Upload className="h-3 w-3" />
                                            {authBrandingImage ? 'Ready' : 'Upload'}
                                        </Label>
                                        <input id="auth-bg" type="file" accept="image/*" className="hidden" onChange={(e) => setAuthBrandingImage(e.target.files?.[0] || null)} />
                                    </div>
                                </div>
                                {/* Auth Logo */}
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Auth Page Overlay Logo</Label>
                                    <div className="border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center bg-muted/10 relative h-32 group/box">
                                        {currentBranding?.auth_logo && !authLogo ? (
                                            <div className="relative group/img flex items-center justify-center h-full w-full">
                                                <SafeImage src={`${(window as any).API_BASE_URL}${currentBranding.auth_logo}`} alt="Auth Logo" className="max-h-16 object-contain" />
                                                <button 
                                                    type="button"
                                                    onClick={() => setConfirmModal({
                                                        open: true,
                                                        type: 'clear_asset',
                                                        field: 'auth_logo',
                                                        title: 'Remove Auth Logo',
                                                        description: 'Are you sure you want to remove the Authentication overlay logo?'
                                                    })}
                                                    className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <ImageIcon className="h-6 w-6 text-muted-foreground/30 mb-2" />
                                                <span className="text-[10px] text-muted-foreground italic">No image selected</span>
                                            </div>
                                        )}
                                        <Label htmlFor="auth-logo" className="absolute bottom-2 bg-primary text-primary-foreground px-3 py-1 rounded-lg font-bold text-[10px] hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1">
                                            <Upload className="h-3 w-3" />
                                            {authLogo ? 'Ready' : 'Upload'}
                                        </Label>
                                        <input id="auth-logo" type="file" accept="image/*" className="hidden" onChange={(e) => setAuthLogo(e.target.files?.[0] || null)} />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-2 shadow-lg">
                            <CardHeader className="bg-muted/30 border-b pb-4">
                                <CardTitle className="text-lg">Contact Information</CardTitle>
                                <CardDescription>These details will appear in the landing page footer.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Physical Address</Label>
                                    <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Medical Way, Health City..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Public Email</Label>
                                        <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@clinic.com" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase text-muted-foreground">Public Phone</Label>
                                        <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 890" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-2 shadow-lg">
                            <CardHeader className="bg-muted/30 border-b pb-4">
                                <CardTitle className="text-lg">Social Media & Links</CardTitle>
                                <CardDescription>Add links to your social profiles or website.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex gap-2">
                                    <Input 
                                        className="h-10 text-sm" 
                                        placeholder="Label (e.g. Facebook)" 
                                        value={newSocialLabel} 
                                        onChange={e => setNewSocialLabel(e.target.value)} 
                                    />
                                    <Input 
                                        className="h-10 text-sm" 
                                        placeholder="URL / Link" 
                                        value={newSocialValue} 
                                        onChange={e => setNewSocialValue(e.target.value)} 
                                    />
                                    <Button 
                                        type="button" 
                                        onClick={() => {
                                            if (!newSocialLabel || !newSocialValue) return;
                                            setSocialLinks([...socialLinks, { label: newSocialLabel, value: newSocialValue }]);
                                            setNewSocialLabel('');
                                            setNewSocialValue('');
                                        }}
                                        className="h-10 px-4"
                                    >
                                        Add
                                    </Button>
                                </div>

                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                    {socialLinks.map((link, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border text-xs group">
                                            <div className="flex items-center gap-2">
                                                {React.createElement(getSocialIcon(link.label), { className: "h-3.5 w-3.5 text-primary" })}
                                                <span className="font-bold">{link.label}:</span>
                                                <span className="text-primary underline truncate max-w-[150px]">{link.value}</span>
                                            </div>
                                            <Button 
                                                type="button"
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => setSocialLinks(socialLinks.filter((_, i) => i !== idx))}
                                                className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                    {socialLinks.length === 0 && <p className="text-center text-[10px] text-muted-foreground py-4 italic">No social links added yet.</p>}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="border-2 shadow-lg">
                        <CardHeader className="bg-muted/30 border-b pb-4">
                            <CardTitle className="text-lg">Hero Illustration Assets</CardTitle>
                            <CardDescription>Customize the 3 images inside the Landing Page hero illustration.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Hero 1 */}
                            <div className="space-y-4">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Illustration Image 1</Label>
                                <div className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center bg-muted/10 aspect-video relative overflow-hidden group/box">
                                    {currentBranding?.hero_image_1 && !heroImage1 ? (
                                        <>
                                            <SafeImage src={`${(window as any).API_BASE_URL}${currentBranding.hero_image_1}`} alt="Hero 1" className="h-full w-full object-cover rounded-lg" />
                                            <button 
                                                type="button"
                                                onClick={() => setConfirmModal({
                                                    open: true,
                                                    type: 'clear_asset',
                                                    field: 'hero_image_1',
                                                    title: 'Remove Hero Image',
                                                    description: 'Are you sure you want to remove Hero Illustration Image 1?'
                                                })}
                                                className="absolute top-2 right-2 p-1.5 bg-destructive text-white rounded-lg opacity-0 group-hover/box:opacity-100 transition-opacity shadow-xl"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                                    )}
                                    <Label htmlFor="hero-1" className="absolute bottom-2 bg-primary text-primary-foreground px-2 py-1 rounded text-[10px] font-bold cursor-pointer">Change</Label>
                                    <input id="hero-1" type="file" className="hidden" onChange={e => setHeroImage1(e.target.files?.[0] || null)} />
                                </div>
                            </div>

                            {/* Hero 2 */}
                            <div className="space-y-4">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Illustration Image 2</Label>
                                <div className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center bg-muted/10 aspect-video relative overflow-hidden group/box">
                                    {currentBranding?.hero_image_2 && !heroImage2 ? (
                                        <>
                                            <SafeImage src={`${(window as any).API_BASE_URL}${currentBranding.hero_image_2}`} alt="Hero 2" className="h-full w-full object-cover rounded-lg" />
                                            <button 
                                                type="button"
                                                onClick={() => setConfirmModal({
                                                    open: true,
                                                    type: 'clear_asset',
                                                    field: 'hero_image_2',
                                                    title: 'Remove Hero Image',
                                                    description: 'Are you sure you want to remove Hero Illustration Image 2?'
                                                })}
                                                className="absolute top-2 right-2 p-1.5 bg-destructive text-white rounded-lg opacity-0 group-hover/box:opacity-100 transition-opacity shadow-xl"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                                    )}
                                    <Label htmlFor="hero-2" className="absolute bottom-2 bg-primary text-primary-foreground px-2 py-1 rounded text-[10px] font-bold cursor-pointer">Change</Label>
                                    <input id="hero-2" type="file" className="hidden" onChange={e => setHeroImage2(e.target.files?.[0] || null)} />
                                </div>
                            </div>

                            {/* Hero Team */}
                            <div className="space-y-4">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Main Team Image (Bottom)</Label>
                                <div className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center bg-muted/10 aspect-video relative overflow-hidden group/box">
                                    {currentBranding?.hero_image_team && !heroImageTeam ? (
                                        <>
                                            <SafeImage src={`${(window as any).API_BASE_URL}${currentBranding.hero_image_team}`} alt="Team" className="h-full w-full object-cover rounded-lg" />
                                            <button 
                                                type="button"
                                                onClick={() => setConfirmModal({
                                                    open: true,
                                                    type: 'clear_asset',
                                                    field: 'hero_image_team',
                                                    title: 'Remove Team Image',
                                                    description: 'Are you sure you want to remove the Hero Team Illustration?'
                                                })}
                                                className="absolute top-2 right-2 p-1.5 bg-destructive text-white rounded-lg opacity-0 group-hover/box:opacity-100 transition-opacity shadow-xl"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                                    )}
                                    <Label htmlFor="hero-team" className="absolute bottom-2 bg-primary text-primary-foreground px-2 py-1 rounded text-[10px] font-bold cursor-pointer">Change</Label>
                                    <input id="hero-team" type="file" className="hidden" onChange={e => setHeroImageTeam(e.target.files?.[0] || null)} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-2 shadow-lg">
                        <CardHeader className="bg-muted/30 border-b pb-4">
                            <CardTitle className="text-lg">Report Templates</CardTitle>
                            <CardDescription>Upload header, footer, and signature images to be dynamically stamped on Patient Medical Reports.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Header Image */}
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Report Header</Label>
                                    <div className="border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center bg-muted/10 relative h-32 group/box">
                                        {currentBranding?.header_image && !headerImage ? (
                                            <div className="relative group/img flex items-center justify-center h-full w-full">
                                                <SafeImage src={`${(window as any).API_BASE_URL}${currentBranding.header_image}`} alt="Header" className="max-h-24 object-contain" />
                                                <button 
                                                    type="button"
                                                    onClick={() => setConfirmModal({
                                                        open: true,
                                                        type: 'clear_asset',
                                                        field: 'header_image',
                                                        title: 'Remove Header',
                                                        description: 'Are you sure you want to remove the Report Header image?'
                                                    })}
                                                    className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <ImageIcon className="h-6 w-6 text-muted-foreground/30 mb-2" />
                                                <span className="text-[10px] text-muted-foreground italic">No image selected</span>
                                            </div>
                                        )}
                                        <Label htmlFor="header-image" className="absolute bottom-2 bg-primary text-primary-foreground px-3 py-1 rounded-lg font-bold text-[10px] hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1">
                                            <Upload className="h-3 w-3" />
                                            {headerImage ? 'Ready' : 'Upload'}
                                        </Label>
                                        <input id="header-image" type="file" accept="image/*" className="hidden" onChange={(e) => setHeaderImage(e.target.files?.[0] || null)} />
                                    </div>
                                </div>

                                {/* Footer Image */}
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Report Footer</Label>
                                    <div className="border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center bg-muted/10 relative h-32 group/box">
                                        {currentBranding?.footer_image && !footerImage ? (
                                            <div className="relative group/img flex items-center justify-center h-full w-full">
                                                <SafeImage src={`${(window as any).API_BASE_URL}${currentBranding.footer_image}`} alt="Footer" className="max-h-24 object-contain" />
                                                <button 
                                                    type="button"
                                                    onClick={() => setConfirmModal({
                                                        open: true,
                                                        type: 'clear_asset',
                                                        field: 'footer_image',
                                                        title: 'Remove Footer',
                                                        description: 'Are you sure you want to remove the Report Footer image?'
                                                    })}
                                                    className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <ImageIcon className="h-6 w-6 text-muted-foreground/30 mb-2" />
                                                <span className="text-[10px] text-muted-foreground italic">No image selected</span>
                                            </div>
                                        )}
                                        <Label htmlFor="footer-image" className="absolute bottom-2 bg-primary text-primary-foreground px-3 py-1 rounded-lg font-bold text-[10px] hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1">
                                            <Upload className="h-3 w-3" />
                                            {footerImage ? 'Ready' : 'Upload'}
                                        </Label>
                                        <input id="footer-image" type="file" accept="image/*" className="hidden" onChange={(e) => setFooterImage(e.target.files?.[0] || null)} />
                                    </div>
                                </div>

                                {/* Signature Image */}
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Doctor Signature</Label>
                                    <div className="border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center bg-muted/10 relative h-32 group/box">
                                        {currentBranding?.signature_image && !signatureImage ? (
                                            <div className="relative group/img flex items-center justify-center h-full w-full">
                                                <SafeImage src={`${(window as any).API_BASE_URL}${currentBranding.signature_image}`} alt="Signature" className="max-h-24 object-contain mix-blend-multiply" />
                                                <button 
                                                    type="button"
                                                    onClick={() => setConfirmModal({
                                                        open: true,
                                                        type: 'clear_asset',
                                                        field: 'signature_image',
                                                        title: 'Remove Signature',
                                                        description: 'Are you sure you want to remove the Doctor Signature image?'
                                                    })}
                                                    className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity shadow-lg"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <ImageIcon className="h-6 w-6 text-muted-foreground/30 mb-2" />
                                                <span className="text-[10px] text-muted-foreground italic">No image selected</span>
                                            </div>
                                        )}
                                        <Label htmlFor="signature-image" className="absolute bottom-2 bg-primary text-primary-foreground px-3 py-1 rounded-lg font-bold text-[10px] hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1">
                                            <Upload className="h-3 w-3" />
                                            {signatureImage ? 'Ready' : 'Upload'}
                                        </Label>
                                        <input id="signature-image" type="file" accept="image/*" className="hidden" onChange={(e) => setSignatureImage(e.target.files?.[0] || null)} />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>


                    <div className="flex justify-end pt-6 border-t mt-8">
                        <Button 
                            type="submit"
                            disabled={saving}
                            size="lg" 
                            className="bg-primary hover:bg-primary/90 text-white font-bold h-12 px-12 shadow-xl shadow-primary/20 rounded-xl"
                        >    {saving ? 'Saving Application Branding...' : 'Save Appearance Changes'}
                        </Button>
                    </div>
                </form>
            </div>

            <ActionConfirmModal
                isOpen={confirmModal.open}
                onClose={() => setConfirmModal({ ...confirmModal, open: false })}
                onConfirm={handleClear}
                loading={saving}
                title={confirmModal.title}
                description={confirmModal.description}
                confirmText="Remove Asset"
                variant="danger"
            />
        </MainLayout>
    );
};

export default BrandingSettingsPage;
