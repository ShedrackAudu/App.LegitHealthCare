import React, { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Building2, Globe, Users, Plus, Loader2, Settings2, Mail, Save, Server, Eye, EyeOff, ShieldCheck, Stethoscope, RotateCcw } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { ActionConfirmModal } from '@/components/ActionConfirmModal';
import { toast } from 'react-hot-toast';
import axios from 'axios';

interface ConfigItem {
    id: number;
    name: string;
}

interface ConfigSectionProps {
    title: string;
    description: string;
    items: ConfigItem[];
    type: 'departments' | 'races' | 'nationalities';
    icon: any;
    newItemName: string;
    setNewItemName: (val: string) => void;
    handleAdd: (type: 'departments' | 'races' | 'nationalities') => void;
    onDeleteRequest: (type: 'departments' | 'races' | 'nationalities', id: number, name: string) => void;
    loading: boolean;
    adding: boolean;
}

const ConfigSection: React.FC<ConfigSectionProps> = ({
    title, description, items, type, icon: Icon,
    newItemName, setNewItemName, handleAdd, onDeleteRequest,
    loading, adding
}) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="col-span-1 border-2 shadow-lg h-fit overflow-hidden border-primary/10">
            <CardHeader className="bg-primary/5 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    Add New
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                            placeholder="Enter value..."
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className="h-11 font-semibold border-2 focus-visible:ring-primary"
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd(type)}
                        />
                    </div>
                    <Button
                        onClick={() => handleAdd(type)}
                        className="w-full h-11 font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                        disabled={adding || !newItemName.trim()}
                    >
                        {adding ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Plus className="mr-2 h-5 w-5" /> Add {title.slice(0, -1)}</>}
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2 border-2 shadow-lg overflow-hidden border-primary/5">
            <CardHeader className="bg-muted/30 border-b pb-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">Existing {title}</CardTitle>
                        <CardDescription>Click delete icon to remove</CardDescription>
                    </div>
                </div>
                <div className="bg-primary font-black px-4 py-1.5 rounded-full text-white text-xs shadow-inner">
                    {items.length}
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-4">
                        <Icon className="h-16 w-16" />
                        <p className="text-xl font-bold">No items found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-muted">
                        {items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-background hover:bg-primary/5 transition-colors group">
                                <span className="font-bold text-base tracking-tight">{item.name}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200"
                                    onClick={() => onDeleteRequest(type, item.id, item.name)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
);

const SystemConfigPage: React.FC = () => {
    const { activeSection, user } = useAppContext();
    const [departments, setDepartments] = useState<ConfigItem[]>([]);
    const [races, setRaces] = useState<ConfigItem[]>([]);
    const [nationalities, setNationalities] = useState<ConfigItem[]>([]);

    const [loading, setLoading] = useState(true);
    const [newItemName, setNewItemName] = useState('');
    const [adding, setAdding] = useState(false);
    const [deleteModal, setDeleteModal] = useState({
        open: false,
        type: 'departments' as 'departments' | 'races' | 'nationalities',
        id: 0,
        name: ''
    });
    const [deleting, setDeleting] = useState(false);

    // Email Settings State
    const [emailLoading, setEmailLoading] = useState(false);
    const [emailSaving, setEmailSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testEmail, setTestEmail] = useState('');
    const [emailSettings, setEmailSettings] = useState({
        MAIL_SERVER: 'smtp.gmail.com',
        MAIL_PORT: '587',
        MAIL_USERNAME: '',
        MAIL_DISPLAY_NAME: 'Legit HealthCare',
        MAIL_PASSWORD: '',
        HEAD_DOCTOR_EMAIL: '',
        HAS_PASSWORD: false
    });

    const [contactSettings, setContactSettings] = useState({
        email: '',
        phone: '',
        whatsapp: ''
    });

    const [maintenanceSaving, setMaintenanceSaving] = useState(false);
    const [staffSignupEnabled, setStaffSignupEnabled] = useState(true);
    const [confirmMaintenanceModal, setConfirmMaintenanceModal] = useState({
        open: false,
        title: '',
        description: '',
        actionType: 'queue' as 'queue' | 'audit' | 'signup'
    });

    const [brandingLoading, setBrandingLoading] = useState(false);
    const [brandingSaving, setBrandingSaving] = useState(false);
    const [brandingData, setBrandingData] = useState({
        doctor_name: '',
        doctor_post: ''
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [deptRes, raceRes, natRes] = await Promise.all([
                axios.get(`/api/config/departments`),
                axios.get(`/api/config/races`),
                axios.get(`/api/config/nationalities`)
            ]);
            setDepartments(deptRes.data);
            setRaces(raceRes.data);
            setNationalities(natRes.data);
        } catch (err) {
            toast.error("Failed to load configuration data");
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchEmailSettings = useCallback(async () => {
        setEmailLoading(true);
        try {
            const response = await axios.get('/api/email/settings');
            setEmailSettings({ ...response.data, MAIL_PASSWORD: '' });
        } catch (err) {
            toast.error("Failed to load email settings");
        } finally {
            setEmailLoading(false);
        }
    }, []);

    const fetchBrandingSettings = useCallback(async () => {
        setBrandingLoading(true);
        try {
            const response = await axios.get('/api/branding', {
                headers: { 'X-Company-Context': activeSection }
            });
            setBrandingData({
                doctor_name: response.data.doctor_name || '',
                doctor_post: response.data.doctor_post || ''
            });
            setContactSettings({
                email: response.data.email || '',
                phone: response.data.phone || '',
                whatsapp: response.data.whatsapp || ''
            });
        } catch (err) {
            toast.error("Failed to load clinical identity settings");
        } finally {
            setBrandingLoading(false);
        }
    }, [activeSection]);

    const fetchSystemConfig = useCallback(async () => {
        try {
            const response = await axios.get('/api/admin/config', {
                headers: { 
                    'X-Company-Context': activeSection,
                    'X-User-ID': user?.id?.toString()
                }
            });
            if (response.data.staff_signup_enabled !== undefined) {
                setStaffSignupEnabled(response.data.staff_signup_enabled === 'true');
            }
        } catch (err) {
            console.error("Failed to load system configuration");
        }
    }, [activeSection, user]);

    useEffect(() => {
        fetchData();
        fetchEmailSettings();
        fetchBrandingSettings();
        fetchSystemConfig();
    }, [activeSection, fetchData, fetchEmailSettings, fetchBrandingSettings, fetchSystemConfig]);

    const handleAdd = async (type: 'departments' | 'races' | 'nationalities') => {
        const trimmedName = newItemName.trim();
        if (!trimmedName) return;

        setAdding(true);
        try {
            const resp = await axios.post(`/api/config/${type}`,
                { name: trimmedName }
            );
            toast.success(`${type.slice(0, -1)} added successfully`);

            if (type === 'departments') setDepartments([...departments, resp.data].sort((a, b) => a.name.localeCompare(b.name)));
            if (type === 'races') setRaces([...races, resp.data].sort((a, b) => a.name.localeCompare(b.name)));
            if (type === 'nationalities') setNationalities([...nationalities, resp.data].sort((a, b) => a.name.localeCompare(b.name)));

            setNewItemName('');
        } catch (err: any) {
            toast.error(err.response?.data?.error || `Failed to add ${type.slice(0, -1)}`);
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async () => {
        const { type, id } = deleteModal;
        if (!id) return;
        setDeleting(true);
        try {
            await axios.delete(`/api/config/${type}/${id}`);
            toast.success("Item deleted");
            setDeleteModal({ ...deleteModal, open: false });

            if (type === 'departments') setDepartments(departments.filter(d => d.id !== id));
            if (type === 'races') setRaces(races.filter(r => r.id !== id));
            if (type === 'nationalities') setNationalities(nationalities.filter(n => n.id !== id));
        } catch (err) {
            toast.error("Failed to delete item");
        } finally {
            setDeleting(false);
        }
    };

    const handleSaveEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailSaving(true);
        try {
            await axios.post('/api/email/settings', emailSettings);
            
            // Save contact branding as well (using JSON for text-only update)
            await axios.post('/api/branding', {
                email: contactSettings.email,
                phone: contactSettings.phone,
                whatsapp: contactSettings.whatsapp
            }, {
                headers: {
                    'X-Company-Context': activeSection
                }
            });

            toast.success("Configuration saved successfully!");
            fetchEmailSettings();
            fetchBrandingSettings();
        } catch (err) {
            toast.error("Failed to save email settings");
        } finally {
            setEmailSaving(false);
        }
    };

    const handleTestEmail = async () => {
        if (!testEmail) {
            toast.error("Please enter a recipient email for the test.");
            return;
        }
        setTesting(true);
        try {
            const response = await axios.post('/api/email/test', {
                ...emailSettings,
                test_email: testEmail
            });
            toast.success(response.data.message);
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to send test email");
        } finally {
            setTesting(false);
        }
    };

    const handleSaveBranding = async (e: React.FormEvent) => {
        e.preventDefault();
        setBrandingSaving(true);
        try {
            const formData = new FormData();
            formData.append('doctor_name', brandingData.doctor_name);
            formData.append('doctor_post', brandingData.doctor_post);

            await axios.post('/api/branding', formData, {
                headers: {
                    'X-Company-Context': activeSection
                }
            });
            toast.success("Clinical identity updated!");
            fetchBrandingSettings();
        } catch (err) {
            toast.error("Failed to save clinical identity");
        } finally {
            setBrandingSaving(false);
        }
    };

    const handleResetQueue = async () => {
        setMaintenanceSaving(true);
        try {
            await axios.post('/api/queue/reset', {}, {
                headers: { 'X-Company-Context': activeSection }
            });
            toast.success("Patient queues have been successfully reset to zero.");
            setConfirmMaintenanceModal((prev) => ({ ...prev, open: false }));
        } catch(err) {
            toast.error("Failed to reset queue counts.");
            console.error(err);
        } finally {
            setMaintenanceSaving(false);
        }
    };

    const handleClearAudit = async () => {
        setMaintenanceSaving(true);
        try {
            await axios.delete('/api/admin/audit-logs/clear', {
                headers: { 'X-User-ID': user?.id?.toString() }
            });
            toast.success("System audit logs have been permanently cleared.");
            setConfirmMaintenanceModal((prev) => ({ ...prev, open: false }));
        } catch(err: any) {
            toast.error(err.response?.data?.error || "Failed to clear audit logs.");
        } finally {
            setMaintenanceSaving(false);
        }
    };

    const handleToggleSignup = async () => {
        setMaintenanceSaving(true);
        try {
            const newValue = !staffSignupEnabled;
            await axios.post('/api/admin/config', 
                { staff_signup_enabled: newValue.toString() },
                { 
                    headers: { 
                        'X-Company-Context': activeSection,
                        'X-User-ID': user?.id?.toString()
                    } 
                }
            );
            setStaffSignupEnabled(newValue);
            toast.success(`Staff signup has been ${newValue ? 'enabled' : 'disabled'}.`);
        } catch (err) {
            toast.error("Failed to update signup setting.");
        } finally {
            setMaintenanceSaving(false);
        }
    };

    const handleMaintenanceConfirm = () => {
        if (confirmMaintenanceModal.actionType === 'queue') {
            handleResetQueue();
        } else if (confirmMaintenanceModal.actionType === 'audit') {
            handleClearAudit();
        }
    };
    return (
        <MainLayout>
            <div className="max-w-6xl mx-auto space-y-8 pb-10">
                <div className="flex flex-col gap-3 border-b pb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl text-primary">
                            <Settings2 className="h-6 w-6 sm:h-8 sm:w-8" />
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground leading-tight">System Configuration</h1>
                    </div>
                    <p className="text-muted-foreground font-medium text-xs sm:text-base pl-4 border-l-4 border-primary/20 ml-1 py-1">
                        Manage registration dropdowns and system settings
                    </p>
                </div>

                <Tabs defaultValue="departments" className="w-full space-y-6">
                    <TabsList className="flex flex-wrap w-full h-auto min-h-[64px] p-1.5 bg-muted/50 rounded-2xl border-2 shadow-sm border-muted overflow-hidden">
                        <TabsTrigger value="departments" className="flex-1 min-w-[120px] rounded-xl font-black data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all gap-1.5 h-11 text-[10px] uppercase tracking-tight">
                            <Building2 className="h-4 w-4" />
                            Departments
                        </TabsTrigger>
                        <TabsTrigger value="races" className="flex-1 min-w-[120px] rounded-xl font-black data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all gap-1.5 h-11 text-[10px] uppercase tracking-tight">
                            <Users className="h-4 w-4" />
                            Races / Cont.
                        </TabsTrigger>
                        <TabsTrigger value="nationalities" className="flex-1 min-w-[120px] rounded-xl font-black data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all gap-1.5 h-11 text-[10px] uppercase tracking-tight">
                            <Globe className="h-4 w-4" />
                            Nationalities
                        </TabsTrigger>
                        <TabsTrigger value="email" className="flex-1 min-w-[150px] rounded-xl font-black data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all gap-1.5 h-11 text-[10px] uppercase tracking-tight">
                            <Mail className="h-4 w-4" />
                            Email & Contacts
                        </TabsTrigger>
                        <TabsTrigger value="doctor" className="flex-1 min-w-[100px] rounded-xl font-black data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all gap-1.5 h-11 text-[10px] uppercase tracking-tight">
                            <Stethoscope className="h-4 w-4" />
                            Doctor
                        </TabsTrigger>
                        <TabsTrigger value="maintenance" className="flex-1 min-w-[120px] rounded-xl font-black data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all gap-1.5 h-11 text-[10px] uppercase tracking-tight">
                            <RotateCcw className="h-4 w-4" />
                            Maintenance
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="departments">
                        <ConfigSection
                            title="Departments"
                            description="Configure department options for patient registration."
                            items={departments}
                            type="departments"
                            icon={Building2}
                            newItemName={newItemName}
                            setNewItemName={setNewItemName}
                            handleAdd={handleAdd}
                            onDeleteRequest={(type, id, name) => setDeleteModal({ open: true, type, id, name })}
                            loading={loading}
                            adding={adding}
                        />
                    </TabsContent>

                    <TabsContent value="races">
                        <ConfigSection
                            title="Races / Continents"
                            description="Configure race/continent options for patient registration."
                            items={races}
                            type="races"
                            icon={Users}
                            newItemName={newItemName}
                            setNewItemName={setNewItemName}
                            handleAdd={handleAdd}
                            onDeleteRequest={(type, id, name) => setDeleteModal({ open: true, type, id, name })}
                            loading={loading}
                            adding={adding}
                        />
                    </TabsContent>

                    <TabsContent value="nationalities">
                        <ConfigSection
                            title="Nationalities"
                            description="Configure nationality options for patient registration."
                            items={nationalities}
                            type="nationalities"
                            icon={Globe}
                            newItemName={newItemName}
                            setNewItemName={setNewItemName}
                            handleAdd={handleAdd}
                            onDeleteRequest={(type, id, name) => setDeleteModal({ open: true, type, id, name })}
                            loading={loading}
                            adding={adding}
                        />
                    </TabsContent>

                    <TabsContent value="email">
                        {emailLoading ? (
                            <div className="h-64 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="lg:col-span-2">
                                    <form onSubmit={handleSaveEmail} className="space-y-6">
                                        <Card className="border-2 shadow-lg overflow-hidden border-primary/10">
                                            <CardHeader className="bg-primary/5 border-b pb-4">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Server className="h-5 w-5 text-primary" />
                                                    SMTP Server Settings
                                                </CardTitle>
                                                <CardDescription>Configure how the system connects to your email provider.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="pt-6 space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">SMTP Server</Label>
                                                        <Input
                                                            className="h-11 font-bold border-2 focus-visible:ring-primary"
                                                            value={emailSettings.MAIL_SERVER}
                                                            onChange={e => setEmailSettings({ ...emailSettings, MAIL_SERVER: e.target.value })}
                                                            placeholder="e.g. smtp.gmail.com"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">SMTP Port</Label>
                                                        <Input
                                                            className="h-11 font-bold border-2 focus-visible:ring-primary"
                                                            type="number"
                                                            value={emailSettings.MAIL_PORT}
                                                            onChange={e => setEmailSettings({ ...emailSettings, MAIL_PORT: e.target.value })}
                                                            placeholder="e.g. 587"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Sender Display Name</Label>
                                                        <Input
                                                            className="h-11 font-bold border-2 focus-visible:ring-primary"
                                                            value={emailSettings.MAIL_DISPLAY_NAME}
                                                            onChange={e => setEmailSettings({ ...emailSettings, MAIL_DISPLAY_NAME: e.target.value })}
                                                            placeholder="e.g. Legit HealthCare"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Gmail Address</Label>
                                                        <Input
                                                            className="h-11 font-bold border-2 focus-visible:ring-primary"
                                                            value={emailSettings.MAIL_USERNAME}
                                                            onChange={e => setEmailSettings({ ...emailSettings, MAIL_USERNAME: e.target.value })}
                                                            placeholder="e.g. noreply@gmail.com"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2 relative">
                                                    <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center justify-between">
                                                        <span>Sender Password / App Password</span>
                                                        {emailSettings.HAS_PASSWORD && <span className="text-[10px] text-primary font-black">● Currently Set</span>}
                                                    </Label>
                                                    <div className="relative">
                                                        <Input
                                                            className="h-11 font-bold pr-12 border-2 focus-visible:ring-primary"
                                                            type={showPassword ? "text" : "password"}
                                                            value={emailSettings.MAIL_PASSWORD}
                                                            onChange={e => setEmailSettings({ ...emailSettings, MAIL_PASSWORD: e.target.value })}
                                                            placeholder={emailSettings.HAS_PASSWORD ? "•••••••••••• (Unchanged)" : "Enter password..."}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="absolute right-3 top-3 text-muted-foreground hover:text-primary transition-colors"
                                                        >
                                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="border-2 shadow-lg overflow-hidden border-primary/10">
                                            <CardHeader className="bg-primary/5 border-b pb-4">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Mail className="h-5 w-5 text-primary" />
                                                    Patient Portal Contacts
                                                </CardTitle>
                                                <CardDescription>Configure contact details displayed on the Patient Portal 'Contact Us' page.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="pt-6 space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Public Contact Email</Label>
                                                        <Input
                                                            className="h-11 font-bold border-2 focus-visible:ring-primary"
                                                            value={contactSettings.email}
                                                            onChange={e => setContactSettings({ ...contactSettings, email: e.target.value })}
                                                            placeholder="e.g. contact@clinic.com"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Public Call Phone Number</Label>
                                                        <Input
                                                            className="h-11 font-bold border-2 focus-visible:ring-primary"
                                                            value={contactSettings.phone}
                                                            onChange={e => setContactSettings({ ...contactSettings, phone: e.target.value })}
                                                            placeholder="e.g. +234 800 000 0000"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">WhatsApp Number (For Direct Messaging)</Label>
                                                    <Input
                                                        className="h-11 font-bold border-2 focus-visible:ring-primary"
                                                        value={contactSettings.whatsapp}
                                                        onChange={e => setContactSettings({ ...contactSettings, whatsapp: e.target.value })}
                                                        placeholder="e.g. +234 800 000 0000"
                                                    />
                                                    <p className="text-[10px] text-muted-foreground italic">Enter the number in international format without spaces or symbols for best compatibility.</p>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="border-2 shadow-lg overflow-hidden border-primary/10">
                                            <CardHeader className="bg-primary/5 border-b pb-4">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <ShieldCheck className="h-5 w-5 text-primary" />
                                                    Clinical Administration
                                                </CardTitle>
                                                <CardDescription>Configure administrative roles and clinical oversight.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="pt-6 space-y-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Head Doctor's Email</Label>
                                                    <Input
                                                        className="h-11 font-bold border-2 focus-visible:ring-primary"
                                                        value={emailSettings.HEAD_DOCTOR_EMAIL}
                                                        onChange={e => setEmailSettings({ ...emailSettings, HEAD_DOCTOR_EMAIL: e.target.value })}
                                                        placeholder="e.g. head.doctor@gmail.com"
                                                    />
                                                    <p className="text-[10px] text-muted-foreground italic">This email is used for clinical oversight and urgent reports.</p>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <div className="flex justify-end gap-3 pt-4">
                                            <Button
                                                type="submit"
                                                disabled={emailSaving}
                                                size="lg"
                                                className="bg-primary hover:bg-primary/90 text-white font-bold h-12 px-12 shadow-xl shadow-primary/20 rounded-xl w-full sm:w-auto transition-all"
                                            >
                                                {emailSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                                                {emailSaving ? 'Saving...' : 'Save Configuration'}
                                            </Button>
                                        </div>
                                    </form>
                                </div>

                                <div className="space-y-6">
                                    <Card className="border-2 shadow-lg h-fit border-primary/10">
                                        <CardHeader className="bg-primary/5 border-b pb-4">
                                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                                                <Mail className="h-4 w-4" />
                                                Test Connection
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-6 space-y-4">
                                            <p className="text-xs text-muted-foreground font-medium">Verify your configuration by sending a test email before saving.</p>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Recipient Email</Label>
                                                <Input
                                                    className="h-10 text-sm font-bold border-2 focus-visible:ring-primary"
                                                    placeholder="test@example.com"
                                                    value={testEmail}
                                                    onChange={e => setTestEmail(e.target.value)}
                                                />
                                            </div>
                                            <Button
                                                variant="secondary"
                                                className="w-full font-bold h-10 border-2 hover:bg-primary hover:text-white transition-all"
                                                onClick={handleTestEmail}
                                                disabled={testing}
                                            >
                                                {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                                                {testing ? 'Sending...' : 'Send Test Email'}
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    <div className="bg-amber-500/10 border-2 border-amber-500/20 p-4 rounded-xl flex items-start gap-3">
                                        <div className="p-2 bg-amber-500/20 rounded-lg text-amber-600">
                                            <Server className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-amber-900 text-[10px] uppercase tracking-wider text-amber-600">Security Note</h4>
                                            <p className="text-[10px] text-amber-800 leading-relaxed font-medium mt-1">
                                                Credentials are saved to <code className="bg-amber-500/10 px-1 rounded font-black">.env</code>.
                                                Gmail requires an "App Password" if 2nd-factor authentication is enabled.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="doctor">
                        {brandingLoading ? (
                            <div className="h-64 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                            </div>
                        ) : (
                            <form onSubmit={handleSaveBranding} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card className="border-2 shadow-lg overflow-hidden border-primary/10">
                                        <CardHeader className="bg-primary/5 border-b pb-4">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Stethoscope className="h-5 w-5 text-primary" />
                                                Clinical Signature
                                            </CardTitle>
                                            <CardDescription>Configure the doctor's name and post for report signatures.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-6 space-y-6">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Full Doctor Name</Label>
                                                <Input
                                                    className="h-11 font-bold border-2 focus-visible:ring-primary"
                                                    value={brandingData.doctor_name}
                                                    onChange={e => setBrandingData({ ...brandingData, doctor_name: e.target.value })}
                                                    placeholder="e.g. Dr. Jane Smith FMCPath"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Post / Title</Label>
                                                <Input
                                                    className="h-11 font-bold border-2 focus-visible:ring-primary"
                                                    value={brandingData.doctor_post}
                                                    onChange={e => setBrandingData({ ...brandingData, doctor_post: e.target.value })}
                                                    placeholder="e.g. Consultant in Charge"
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-2 shadow-lg overflow-hidden border-blue-500/10">
                                        <CardHeader className="bg-blue-500/5 border-b pb-4">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Eye className="h-5 w-5 text-blue-500" />
                                                Live Preview
                                            </CardTitle>
                                            <CardDescription>How the signature will appear on patient reports.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[160px] bg-slate-50 shadow-inner rounded-b-2xl">
                                            <div className="border-2 border-dashed border-slate-200 p-6 rounded-2xl bg-white flex flex-col items-center gap-1 shadow-sm">
                                                <div className="h-12 w-48 mb-2 border-b-2 border-slate-900/10 flex items-center justify-center italic text-slate-300 select-none">
                                                    Signature Image
                                                </div>
                                                <div className="font-black text-slate-900 text-lg leading-tight">{brandingData.doctor_name || "Doctor Name"}</div>
                                                <div className="font-bold text-slate-500 text-sm">{brandingData.doctor_post || "Consultant in Charge"}</div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <Button
                                        type="submit"
                                        disabled={brandingSaving}
                                        size="lg"
                                        className="bg-primary hover:bg-primary/90 text-white font-bold h-12 px-12 shadow-xl shadow-primary/20 rounded-xl w-full sm:w-auto transition-all"
                                    >
                                        {brandingSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                                        {brandingSaving ? 'Saving...' : 'Update Clinical Identity'}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </TabsContent>

                    <TabsContent value="maintenance">
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Card className="border-2 shadow-xl border-destructive/20 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform"></div>
                                <CardHeader className="border-b bg-muted/5 p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-destructive/10 rounded-2xl">
                                            <RotateCcw className="h-6 w-6 text-destructive" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-xl text-destructive font-black">System Maintenance</CardTitle>
                                            <CardDescription>Critical administrative actions to manage system state.</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 space-y-6">
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-2xl border-2 border-primary/5 bg-primary/[0.02]">
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-lg text-foreground">Staff Portal Registration</h4>
                                            <p className="text-sm text-muted-foreground w-full max-w-lg">
                                                When disabled, new staff members will not be able to create accounts. This is useful during system-wide maintenance or locked recruitment periods.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4 bg-background p-2 pr-4 rounded-xl border-2 shadow-sm">
                                            <div className={`w-3 h-3 rounded-full ${staffSignupEnabled ? 'bg-primary animate-pulse' : 'bg-destructive'}`} />
                                            <span className="text-xs font-black uppercase tracking-widest min-w-[80px]">
                                                {staffSignupEnabled ? 'Enabled' : 'Disabled'}
                                            </span>
                                            <Button 
                                                onClick={handleToggleSignup}
                                                disabled={maintenanceSaving}
                                                variant={staffSignupEnabled ? "outline" : "default"}
                                                size="sm"
                                                className="font-bold"
                                            >
                                                {maintenanceSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : (staffSignupEnabled ? 'Disable Signup' : 'Enable Signup')}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-2xl border-2 border-primary/5 bg-primary/[0.02]">
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-lg text-foreground">Reset Daily Patient Queues</h4>
                                            <p className="text-sm text-muted-foreground w-full max-w-lg">
                                                This will immediately reset all queue counts across all departments (Consultation, Audiometry, Spirometry, ECG) to <strong className="text-foreground">Zero</strong>. This is typically done at the end of the day.
                                            </p>
                                        </div>
                                        <Button 
                                            onClick={() => setConfirmMaintenanceModal({
                                                open: true,
                                                title: 'Reset Patient Queues',
                                                description: 'Are you sure you want to reset all daily patient queue counts to zero? This action cannot be undone.',
                                                actionType: 'queue'
                                            })} 
                                            disabled={maintenanceSaving} 
                                            variant="destructive" 
                                            size="lg" 
                                            className="font-bold shadow-lg shadow-destructive/20 shrink-0 h-12 px-8"
                                        >
                                            {maintenanceSaving && confirmMaintenanceModal.actionType === 'queue' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <RotateCcw className="mr-2 h-5 w-5" />}
                                            Reset Queue Counts to 0
                                        </Button>
                                    </div>

                                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-2xl border-2 border-primary/5 bg-primary/[0.02]">
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-lg text-foreground">Clear System Audit Logs</h4>
                                            <p className="text-sm text-muted-foreground w-full max-w-lg">
                                                Permanently delete all system activity records. A single entry will be created to record this maintenance action. <strong className="text-destructive font-black">Warning: Use with caution.</strong>
                                            </p>
                                        </div>
                                        <Button 
                                            onClick={() => setConfirmMaintenanceModal({
                                                open: true,
                                                title: 'Clear Audit Trail',
                                                description: 'Are you sure you want to permanently delete all system audit logs? This action is irreversible.',
                                                actionType: 'audit'
                                            })} 
                                            disabled={maintenanceSaving} 
                                            variant="destructive" 
                                            size="lg" 
                                            className="font-bold shadow-lg shadow-destructive/20 shrink-0 h-12 px-8"
                                        >
                                            {maintenanceSaving && confirmMaintenanceModal.actionType === 'audit' ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Trash2 className="mr-2 h-5 w-5" />}
                                            Clear Audit Trail
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            <ActionConfirmModal
                isOpen={confirmMaintenanceModal.open}
                onClose={() => setConfirmMaintenanceModal({ ...confirmMaintenanceModal, open: false })}
                onConfirm={handleMaintenanceConfirm}
                loading={maintenanceSaving}
                title={confirmMaintenanceModal.title}
                description={confirmMaintenanceModal.description}
                confirmText="Reset Now"
                variant="danger"
            />

            <ActionConfirmModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ ...deleteModal, open: false })}
                onConfirm={handleDelete}
                title={`Delete ${deleteModal.type.slice(0, -1)}`}
                description={`Are you sure you want to delete '${deleteModal.name}'? This change will reflect in all registration dropdowns.`}
                confirmText="Delete Item"
                variant="danger"
                loading={deleting}
            />
        </MainLayout>
    );
};

export default SystemConfigPage;
