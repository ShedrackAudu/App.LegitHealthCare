import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Brush, Upload, Loader2, Image as ImageIcon, RotateCcw, Trash2 } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { Badge } from "@/components/ui/badge";

const BrandingSettingsPage: React.FC = () => {
    const { activeSection, fetchBranding } = useAppContext();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Form States
    const [clinicName, setClinicName] = useState('Legit HealthCare');
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

    // Current Values
    const [currentBranding, setCurrentBranding] = useState<any>(null);

    useEffect(() => {
        const loadInitial = async () => {
            setLoading(true);
            try {
                const response = await axios.get('http://localhost:5000/api/branding', {
                    headers: { 'X-Company-Context': activeSection }
                });
                setCurrentBranding(response.data);
                setClinicName(response.data.clinic_name || 'Legit HealthCare');
                setAddress(response.data.address || '');
                setEmail(response.data.email || '');
                setPhone(response.data.phone || '');
                setSocialLinks(response.data.social_links || []);
            } catch (err) {
                toast.error("Failed to load branding information");
            } finally {
                setLoading(false);
            }
        };
        if (activeSection) {
            loadInitial();
        }
    }, [activeSection]);

    const handleResetQueue = async () => {
        if (!confirm("Are you sure you want to reset all daily patient queue counts to zero? This action cannot be undone.")) return;
        setSaving(true);
        try {
            await axios.post('http://localhost:5000/api/queue', {}, {
                headers: { 'X-Company-Context': activeSection }
            });
            toast.success("Patient queues have been successfully reset to zero.");
        } catch(err) {
            toast.error("Failed to reset queue counts.");
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('clinic_name', clinicName);
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

            await axios.post('http://localhost:5000/api/branding', formData, {
                headers: { 
                    'X-Company-Context': activeSection,
                    'Content-Type': 'multipart/form-data'
                }
            });
            toast.success("Branding updated successfully!");
            // Refresh global app context branding if available
            if (fetchBranding) await fetchBranding();
            
            // Reload local
            const response = await axios.get('http://localhost:5000/api/branding', {
                headers: { 'X-Company-Context': activeSection }
            });
            setCurrentBranding(response.data);
        } catch (err) {
            toast.error("Failed to save branding settings");
        } finally {
            setSaving(false);
        }
    };

    const handleClear = async (field: string) => {
        if (!confirm(`Are you sure you want to remove this ${field.replace('_', ' ')}?`)) return;
        setSaving(true);
        try {
            await axios.post('http://localhost:5000/api/branding/clear', { field }, {
                headers: { 'X-Company-Context': activeSection }
            });
            toast.success("Asset removed successfully");
            // Reload local
            const response = await axios.get('http://localhost:5000/api/branding', {
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
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-500/10 rounded-2xl">
                        <Brush className="text-purple-600 h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Clinic Branding</h1>
                        <p className="text-sm text-muted-foreground font-medium">Customize the appearance of the {activeSection} system.</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <Card className="border-2 shadow-lg">
                        <CardHeader className="bg-muted/30 border-b pb-4">
                            <CardTitle className="text-lg">Clinic Identity</CardTitle>
                            <CardDescription>This name usually appears on printed reports and headers.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-4 max-w-xl">
                                <Label className="text-sm font-bold uppercase text-muted-foreground">Clinic Name</Label>
                                <Input 
                                    className="h-12 font-bold text-lg" 
                                    value={clinicName} 
                                    onChange={(e) => setClinicName(e.target.value)}
                                    placeholder="Enter clinic name..."
                                />
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
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Light Theme Logo</Label>
                                    <div className="border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center bg-muted/10 relative h-32 group/box">
                                        {currentBranding?.logo_light && !logoLight ? (
                                            <div className="relative group/img flex items-center justify-center h-full w-full">
                                                <img src={`http://localhost:5000${currentBranding.logo_light}`} alt="Light Logo" className="max-h-16 object-contain" />
                                                <button 
                                                    type="button"
                                                    onClick={() => handleClear('logo_light')}
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
                                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Dark Theme Logo</Label>
                                        <Badge variant="outline" className="text-[8px] uppercase tracking-tighter h-4 px-1 opacity-70">Preview Box</Badge>
                                    </div>
                                    <div className="border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center bg-slate-900 shadow-inner relative h-32 group/box">
                                        {currentBranding?.logo_dark && !logoDark ? (
                                            <div className="relative group/img flex items-center justify-center h-full w-full">
                                                <img src={`http://localhost:5000${currentBranding.logo_dark}`} alt="Dark Logo" className="max-h-16 object-contain" />
                                                <button 
                                                    type="button"
                                                    onClick={() => handleClear('logo_dark')}
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
                                                <img src={`http://localhost:5000${currentBranding.favicon}`} alt="Favicon" className="h-10 w-10 object-contain rounded-md shadow-sm" />
                                                <button 
                                                    type="button"
                                                    onClick={() => handleClear('favicon')}
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
                                            <img src={`http://localhost:5000${currentBranding.hero_image_1}`} alt="Hero 1" className="h-full w-full object-cover rounded-lg" />
                                            <button 
                                                type="button"
                                                onClick={() => handleClear('hero_image_1')}
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
                                            <img src={`http://localhost:5000${currentBranding.hero_image_2}`} alt="Hero 2" className="h-full w-full object-cover rounded-lg" />
                                            <button 
                                                type="button"
                                                onClick={() => handleClear('hero_image_2')}
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
                                            <img src={`http://localhost:5000${currentBranding.hero_image_team}`} alt="Team" className="h-full w-full object-cover rounded-lg" />
                                            <button 
                                                type="button"
                                                onClick={() => handleClear('hero_image_team')}
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

                    <Card className="border-2 shadow-xl border-destructive/20 mt-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
                        <CardHeader className="border-b bg-muted/5 p-6">
                            <CardTitle className="text-xl flex items-center gap-2 text-destructive">
                                <RotateCcw className="h-6 w-6" />
                                System Maintenance
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="space-y-1">
                                    <h4 className="font-bold text-lg">Reset Daily Patient Queues</h4>
                                    <p className="text-sm text-muted-foreground w-full max-w-lg">
                                        This will immediately reset all queue counts across all departments (Consultation, Audiometry, Spirometry, ECG) to <strong className="text-foreground">Zero</strong>. This is typically done at the end of the day.
                                    </p>
                                </div>
                                <Button 
                                    onClick={handleResetQueue} 
                                    disabled={saving} 
                                    variant="destructive" 
                                    size="lg" 
                                    className="font-bold shadow-lg shadow-destructive/20 shrink-0"
                                >
                                    {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <RotateCcw className="mr-2 h-5 w-5" />}
                                    Reset Queue Counts to 0
                                </Button>
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
        </MainLayout>
    );
};

export default BrandingSettingsPage;
