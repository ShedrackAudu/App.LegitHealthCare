import React, { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Building2, Globe, Users, Plus, Loader2, Settings2, Mail, Save, Server, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
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
    handleDelete: (type: 'departments' | 'races' | 'nationalities', id: number) => void;
    loading: boolean;
    adding: boolean;
}

const ConfigSection: React.FC<ConfigSectionProps> = ({ 
    title, description, items, type, icon: Icon, 
    newItemName, setNewItemName, handleAdd, handleDelete, 
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
                        {adding ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Plus className="mr-2 h-5 w-5" /> Add {title.slice(0,-1)}</>}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-muted">
                        {items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-background hover:bg-primary/5 transition-colors group">
                                <span className="font-bold text-base tracking-tight">{item.name}</span>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200" 
                                    onClick={() => handleDelete(type, item.id)}
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
    const { activeSection } = useAppContext();
    const [departments, setDepartments] = useState<ConfigItem[]>([]);
    const [races, setRaces] = useState<ConfigItem[]>([]);
    const [nationalities, setNationalities] = useState<ConfigItem[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [newItemName, setNewItemName] = useState('');
    const [adding, setAdding] = useState(false);

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

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [deptRes, raceRes, natRes] = await Promise.all([
                axios.get(`http://localhost:5000/api/config/departments`),
                axios.get(`http://localhost:5000/api/config/races`),
                axios.get(`http://localhost:5000/api/config/nationalities`)
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
            const response = await axios.get('http://localhost:5000/api/email/settings');
            setEmailSettings({ ...response.data, MAIL_PASSWORD: '' });
        } catch (err) {
            toast.error("Failed to load email settings");
        } finally {
            setEmailLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        fetchEmailSettings();
    }, [activeSection, fetchData, fetchEmailSettings]);

    const handleAdd = async (type: 'departments' | 'races' | 'nationalities') => {
        const trimmedName = newItemName.trim();
        if (!trimmedName) return;

        setAdding(true);
        try {
            const resp = await axios.post(`http://localhost:5000/api/config/${type}`, 
                { name: trimmedName }
            );
            toast.success(`${type.slice(0, -1)} added successfully`);
            
            if (type === 'departments') setDepartments([...departments, resp.data].sort((a,b) => a.name.localeCompare(b.name)));
            if (type === 'races') setRaces([...races, resp.data].sort((a,b) => a.name.localeCompare(b.name)));
            if (type === 'nationalities') setNationalities([...nationalities, resp.data].sort((a,b) => a.name.localeCompare(b.name)));
            
            setNewItemName('');
        } catch (err: any) {
            toast.error(err.response?.data?.error || `Failed to add ${type.slice(0, -1)}`);
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (type: 'departments' | 'races' | 'nationalities', id: number) => {
        if (!window.confirm(`Are you sure you want to delete this ${type.slice(0, -1)}?`)) return;
        try {
            await axios.delete(`http://localhost:5000/api/config/${type}/${id}`);
            toast.success("Item deleted");
            
            if (type === 'departments') setDepartments(departments.filter(d => d.id !== id));
            if (type === 'races') setRaces(races.filter(r => r.id !== id));
            if (type === 'nationalities') setNationalities(nationalities.filter(n => n.id !== id));
        } catch (err) {
            toast.error("Failed to delete item");
        }
    };

    const handleSaveEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailSaving(true);
        try {
            await axios.post('http://localhost:5000/api/email/settings', emailSettings);
            toast.success("Email configuration saved successfully!");
            fetchEmailSettings();
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
            const response = await axios.post('http://localhost:5000/api/email/test', {
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

    return (
        <MainLayout>
            <div className="max-w-6xl mx-auto space-y-8 pb-10">
                <div className="flex items-center justify-between border-b pb-6">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-gradient-to-br from-primary to-primary/60 rounded-3xl shadow-lg shadow-primary/20">
                            <Settings2 className="text-white h-9 w-9" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-foreground">System Configuration</h1>
                            <p className="text-base text-muted-foreground font-medium flex items-center gap-2">
                                Manage registration dropdowns and system settings
                            </p>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="departments" className="w-full space-y-6">
                    <TabsList className="grid w-full grid-cols-4 h-16 p-2 bg-muted/50 rounded-2xl border-2 shadow-sm border-muted">
                        <TabsTrigger value="departments" className="rounded-xl font-black data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all gap-2 h-full">
                            <Building2 className="h-5 w-5" />
                            Departments
                        </TabsTrigger>
                        <TabsTrigger value="races" className="rounded-xl font-black data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all gap-2 h-full">
                            <Users className="h-5 w-5" />
                            Races / Continents
                        </TabsTrigger>
                        <TabsTrigger value="nationalities" className="rounded-xl font-black data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all gap-2 h-full">
                            <Globe className="h-5 w-5" />
                            Nationalities
                        </TabsTrigger>
                        <TabsTrigger value="email" className="rounded-xl font-black data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all gap-2 h-full">
                            <Mail className="h-5 w-5" />
                            Email Settings
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
                            handleDelete={handleDelete}
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
                            handleDelete={handleDelete}
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
                            handleDelete={handleDelete}
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
                                                            onChange={e => setEmailSettings({...emailSettings, MAIL_SERVER: e.target.value})}
                                                            placeholder="e.g. smtp.gmail.com"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">SMTP Port</Label>
                                                        <Input 
                                                            className="h-11 font-bold border-2 focus-visible:ring-primary" 
                                                            type="number"
                                                            value={emailSettings.MAIL_PORT} 
                                                            onChange={e => setEmailSettings({...emailSettings, MAIL_PORT: e.target.value})}
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
                                                            onChange={e => setEmailSettings({...emailSettings, MAIL_DISPLAY_NAME: e.target.value})}
                                                            placeholder="e.g. Legit HealthCare"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Gmail Address</Label>
                                                        <Input 
                                                            className="h-11 font-bold border-2 focus-visible:ring-primary" 
                                                            value={emailSettings.MAIL_USERNAME} 
                                                            onChange={e => setEmailSettings({...emailSettings, MAIL_USERNAME: e.target.value})}
                                                            placeholder="e.g. noreply@gmail.com"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2 relative">
                                                    <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center justify-between">
                                                        <span>Sender Password / App Password</span>
                                                        {emailSettings.HAS_PASSWORD && <span className="text-[10px] text-emerald-500 font-black">● Currently Set</span>}
                                                    </Label>
                                                    <div className="relative">
                                                        <Input 
                                                            className="h-11 font-bold pr-12 border-2 focus-visible:ring-primary" 
                                                            type={showPassword ? "text" : "password"}
                                                            value={emailSettings.MAIL_PASSWORD} 
                                                            onChange={e => setEmailSettings({...emailSettings, MAIL_PASSWORD: e.target.value})}
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
                                                        onChange={e => setEmailSettings({...emailSettings, HEAD_DOCTOR_EMAIL: e.target.value})}
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
                                    <Card className="border-2 shadow-lg h-fit border-emerald-500/10">
                                        <CardHeader className="bg-emerald-500/5 border-b pb-4">
                                            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-emerald-600">
                                                <Mail className="h-4 w-4" />
                                                Test Connection
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-6 space-y-4">
                                            <p className="text-xs text-muted-foreground font-medium">Verify your configuration by sending a test email before saving.</p>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Recipient Email</Label>
                                                <Input 
                                                    className="h-10 text-sm font-bold border-2 focus-visible:ring-emerald-500" 
                                                    placeholder="test@example.com"
                                                    value={testEmail}
                                                    onChange={e => setTestEmail(e.target.value)}
                                                />
                                            </div>
                                            <Button 
                                                variant="secondary" 
                                                className="w-full font-bold h-10 border-2 hover:bg-emerald-500 hover:text-white transition-all" 
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
                </Tabs>
            </div>
        </MainLayout>
    );
};

export default SystemConfigPage;
