import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  MachineRobotIcon, 
  FloppyDiskIcon, 
  Loading03Icon, 
  LockKeyIcon, 
  File01Icon, 
  Activity01Icon, 
  Delete02Icon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  Wifi01Icon,
  SparklesIcon
} from '@hugeicons/core-free-icons';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useAppContext } from '@/context/AppContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Skeleton } from '@/components/ui/skeleton';

const PARAMETERS = [
    { id: 'FBC', label: 'Full Blood Count (FBC)' },
    { id: 'KFT', label: 'Kidney Function Test (KFT)' },
    { id: 'LFT', label: 'Liver Function Test (LFT)' },
    { id: 'Lipid Profile', label: 'Lipid Profile' },
    { id: 'Spirometry', label: 'Spirometry' },
    { id: 'Audiometry', label: 'Audiometry' },
    { id: 'ECG', label: 'ECG (Electrocardiogram)' },
    { id: 'Weight', label: 'Weight' },
    { id: 'Height', label: 'Height' },
];

const CONSULTATION_PARAMETERS = [
    { id: 'Consultation:luts', label: 'LUTS (Urinary Symptoms)' },
    { id: 'Consultation:chronic_cough', label: 'Chronic Cough' },
    { id: 'Consultation:chronic_chest_pain', label: 'Chronic Chest Pain' },
    { id: 'Consultation:chest_infection', label: 'Chest Infection' },
    { id: 'Consultation:heart_dx', label: 'Heart Disease History' },
    { id: 'Consultation:palor', label: 'Palor (Anemia)' },
    { id: 'Consultation:jaundice', label: 'Jaundice' },
    { id: 'Consultation:murmur', label: 'Heart Murmur' },
    { id: 'Consultation:chest_status', label: 'Chest Status' },
    { id: 'Consultation:psa', label: 'PSA Result & Remark' },
    { id: 'Consultation:sugar', label: 'Blood Sugar (FBS/RBS)' },
    { id: 'Consultation:urinalysis', label: 'Urinalysis Result' },
    { id: 'Consultation:ua_remark_others', label: 'U/A Remark Others' },
    { id: 'Consultation:dm_status', label: 'Diabetes Status' },
    { id: 'Consultation:htn_status', label: 'Hypertension Status' },
    { id: 'Consultation:bp', label: 'Blood Pressure' },
    { id: 'Consultation:pulse', label: 'Pulse Rate' },
    { id: 'Consultation:spo2', label: 'SPO2 (Saturation)' },
    { id: 'Consultation:hs_status', label: 'Heart Sounds (S3, S4)' },
    { id: 'Consultation:breast', label: 'Breast Exam' },
    { id: 'Consultation:breast_others', label: 'Breast Others' },
    { id: 'Consultation:abdomen', label: 'Abdominal Exam' },
    { id: 'Consultation:abdomen_others', label: 'Abdomen Others' },
    { id: 'Consultation:hx_pe', label: 'H&P Assessment' },
    { id: 'Consultation:other_assessments', label: 'Other Assessments' },
    { id: 'Consultation:overall_lab', label: 'Overall Lab Remark' },
    { id: 'Consultation:overall_assessment', label: 'Overall Assessment' },
    { id: 'Consultation:other_remarks', label: 'General Remarks' }
];

const AI_MODELS = [
    { id: 'gpt-4o', label: 'GPT-4o (Omni - Latest & Smartest)' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cost-Efficient)' },
    { id: 'o1', label: 'OpenAI o1 (Advanced Reasoning)' },
    { id: 'o1-mini', label: 'OpenAI o1-mini (Faster Reasoning)' },
    { id: 'o3-mini', label: 'OpenAI o3-mini (Latest Reasoning & Fast)' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { id: 'gpt-4', label: 'GPT-4 (Standard)' }
];

export const AISettingsPage = () => {
    const { activeSection, user } = useAppContext();
    const { hasPermission } = usePermissions();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [configSaving, setConfigSaving] = useState(false);
    const [aiFbcRemarksEnabled, setAiFbcRemarksEnabled] = useState(true);
    const [bulkAiReviewEnabled, setBulkAiReviewEnabled] = useState(true);
    const canManageMaintenance = hasPermission('system_maintenance');
    
    const [settings, setSettings] = useState({
        api_key: '',
        model_selection: 'gpt-4o',
        response_format: 'Bullet Points',
        system_prompt: 'You are a highly experienced occupational health physician. Analyze the provided clinical findings, lab results, and patient history to generate a concise, professional, and actionable overview. Point out any critical abnormalities, suggest follow-up actions if necessary, and summarize the overall health status of the staff member.',
        medical_parameters: ['Consultation:bp', 'Consultation:pulse'] as string[],
        sample_comments: [] as string[],
        prompt_fbc: '',
        prompt_lipid: '',
        prompt_lft: '',
        prompt_kft: ''
    });
    
    const [newSample, setNewSample] = useState('');
    const [testingConnection, setTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<{
        tested: boolean;
        success: boolean;
        message: string;
    } | null>(null);

    const handleTestConnection = async () => {
        if (!settings.api_key || !settings.api_key.trim()) {
            toast.error("Please enter an OpenAI API Key first.");
            return;
        }
        setTestingConnection(true);
        setConnectionStatus(null);
        try {
            const res = await axios.post('/api/ai/test-connection', {
                api_key: settings.api_key.trim(),
                model_selection: settings.model_selection
            }, {
                headers: { 'X-Company-Context': activeSection }
            });
            setConnectionStatus({
                tested: true,
                success: true,
                message: res.data.message || "Connection verified successfully!"
            });
            toast.success("AI Connection verified successfully!");
        } catch (err: any) {
            const errMsg = err.response?.data?.error || err.message || "Failed to reach OpenAI API";
            setConnectionStatus({
                tested: true,
                success: false,
                message: errMsg
            });
            toast.error(errMsg);
        } finally {
            setTestingConnection(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, [activeSection]);

    const fetchSettings = async () => {
        try {
            // First fetch the main AI settings
            const res = await axios.get('/api/ai/settings', {
                headers: { 'X-Company-Context': activeSection }
            });
            setSettings({
                api_key: res.data.api_key || '',
                model_selection: res.data.model_selection || 'gpt-4o',
                response_format: res.data.response_format || 'Bullet Points',
                system_prompt: res.data.system_prompt || 'You are a highly experienced occupational health physician. Analyze the provided clinical findings, lab results, and patient history to generate a concise, professional, and actionable overview. Point out any critical abnormalities, suggest follow-up actions if necessary, and summarize the overall health status of the staff member.',
                medical_parameters: res.data.medical_parameters || [],
                sample_comments: res.data.sample_comments || [],
                prompt_fbc: res.data.prompt_fbc || '',
                prompt_lipid: res.data.prompt_lipid || '',
                prompt_lft: res.data.prompt_lft || '',
                prompt_kft: res.data.prompt_kft || ''
            });

            // Separately fetch the system config to prevent entire page loading failures
            try {
                const configRes = await axios.get('/api/admin/config', {
                    headers: { 'X-Company-Context': activeSection }
                });
                if (configRes.data.ai_fbc_remarks_enabled !== undefined) {
                    setAiFbcRemarksEnabled(configRes.data.ai_fbc_remarks_enabled === 'true');
                }
                if (configRes.data.bulk_ai_review_enabled !== undefined) {
                    setBulkAiReviewEnabled(configRes.data.bulk_ai_review_enabled === 'true');
                }
            } catch (configErr) {
                console.error("Failed to load system config values:", configErr);
            }
        } catch (err) {
            toast.error("Failed to load AI Settings");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axios.post('/api/ai/settings', settings, {
                headers: { 'X-Company-Context': activeSection }
            });
            toast.success("AI Integration Settings saved successfully!");
        } catch (err) {
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleAiFbcRemarks = async () => {
        setConfigSaving(true);
        try {
            const newValue = !aiFbcRemarksEnabled;
            await axios.post('/api/admin/config', 
                { ai_fbc_remarks_enabled: newValue.toString() },
                { 
                    headers: { 
                        'X-Company-Context': activeSection,
                        'X-User-ID': user?.id?.toString()
                    } 
                }
            );
            setAiFbcRemarksEnabled(newValue);
            toast.success(`Lab tests AI remarks have been ${newValue ? 'enabled' : 'disabled'}.`);
        } catch (err) {
            toast.error("Failed to update Lab tests AI remarks setting.");
        } finally {
            setConfigSaving(false);
        }
    };

    const handleToggleBulkAiReview = async () => {
        setConfigSaving(true);
        try {
            const newValue = !bulkAiReviewEnabled;
            await axios.post('/api/admin/config', 
                { bulk_ai_review_enabled: newValue.toString() },
                { 
                    headers: { 
                        'X-Company-Context': activeSection,
                        'X-User-ID': user?.id?.toString()
                    } 
                }
            );
            setBulkAiReviewEnabled(newValue);
            toast.success(`Bulk AI review generator has been ${newValue ? 'enabled' : 'disabled'}.`);
        } catch (err) {
            toast.error("Failed to update Bulk AI review generator setting.");
        } finally {
            setConfigSaving(false);
        }
    };

    const handleParamToggle = (paramId: string) => {
        setSettings(prev => ({
            ...prev,
            medical_parameters: (prev.medical_parameters || []).includes(paramId)
                ? (prev.medical_parameters || []).filter(p => p !== paramId)
                : [...(prev.medical_parameters || []), paramId]
        }));
    };

    if (loading) {
        return (
            <MainLayout>
                <div className="w-full space-y-6 animate-pulse">
                    {/* Header Skeleton */}
                    <div className="flex flex-col justify-between items-stretch gap-4 sm:gap-6 bg-card p-4 sm:p-6 rounded-2xl border mb-8 border-primary/5">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
                            <Skeleton className="h-12 w-12 rounded-xl sm:rounded-2xl bg-muted/40 shrink-0" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-6 w-48 rounded bg-muted/40 animate-pulse" />
                                <Skeleton className="h-3.5 w-80 rounded bg-muted/40 animate-pulse" />
                            </div>
                        </div>
                    </div>

                    {/* Main Config Cards Skeletons */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="border-2 shadow-lg">
                                <div className="bg-muted/10 p-6 border-b space-y-2">
                                    <Skeleton className="h-5 w-32 rounded bg-muted/40 animate-pulse" />
                                    <Skeleton className="h-3 w-72 rounded bg-muted/40 animate-pulse" />
                                </div>
                                <CardContent className="pt-6 space-y-4">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="space-y-2">
                                            <Skeleton className="h-4 w-28 rounded bg-muted/40 animate-pulse" />
                                            <Skeleton className="h-10 w-full rounded bg-muted/40 animate-pulse" />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                        <div className="col-span-1 space-y-6">
                            <Card className="border-2 shadow-lg">
                                <div className="bg-muted/10 p-6 border-b space-y-2">
                                    <Skeleton className="h-5 w-32 rounded bg-muted/40 animate-pulse" />
                                    <Skeleton className="h-3 w-48 rounded bg-muted/40 animate-pulse" />
                                </div>
                                <CardContent className="pt-6 space-y-4">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <Skeleton className="h-5 w-5 rounded bg-muted/40 animate-pulse" />
                                            <Skeleton className="h-4 w-36 rounded bg-muted/40 animate-pulse" />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col justify-between items-stretch gap-4 sm:gap-6 bg-card p-4 sm:p-6 rounded-2xl border mb-8 transition-all">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="p-1.5 sm:p-3 bg-blue-500/10 rounded-xl sm:rounded-2xl shrink-0">
                            <HugeiconsIcon icon={MachineRobotIcon} className="text-blue-600 h-5 w-5 sm:h-8 sm:w-8" />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-2xl font-black tracking-tight text-foreground">AI Director Insights</h1>
                            <p className="text-[9px] sm:text-sm text-muted-foreground font-medium">
                                Configure OpenAI ChatGPT behavior for automated result overviews and recommendations.
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6 pb-20">
                    
                    {/* AI Automation Features */}
                    <Card className="border-2 shadow-xl relative overflow-hidden">
                        <CardHeader className="border-b bg-muted/5 p-6">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <HugeiconsIcon icon={Activity01Icon} className="h-6 w-6 text-primary" />
                                AI Automation Features
                            </CardTitle>
                            <CardDescription>
                                Enable or disable specific background AI analysis features.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-4 sm:p-6 rounded-2xl border bg-muted/5">
                                <div className="space-y-1">
                                    <h4 className="font-bold text-lg text-foreground">Lab Tests AI Remarks Generation</h4>
                                    <p className="text-sm text-muted-foreground w-full max-w-lg">
                                        When enabled, the system automatically analyzes submitted Full Blood Count (FBC) and Lipid Profile results using AI in the background and writes a brief summary to the remark fields.
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 bg-background p-2 px-4 rounded-xl border-2 shadow-sm">
                                    <span className={`text-xs font-black uppercase tracking-widest ${aiFbcRemarksEnabled ? 'text-primary' : 'text-rose-500'}`}>
                                        {aiFbcRemarksEnabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={configSaving || !canManageMaintenance}
                                        onClick={handleToggleAiFbcRemarks}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                                            aiFbcRemarksEnabled ? "bg-primary" : "bg-zinc-200 dark:bg-zinc-700"
                                        }`}
                                    >
                                        {configSaving ? (
                                            <span className={`pointer-events-none flex items-center justify-center h-5 w-5 rounded-full bg-white shadow-lg transition-all duration-200 ${
                                                aiFbcRemarksEnabled ? "translate-x-5" : "translate-x-1"
                                            }`}>
                                                <HugeiconsIcon icon={Loading03Icon} className="h-3 w-3 animate-spin text-primary" />
                                            </span>
                                        ) : (
                                            <span
                                                className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-all duration-200 ${
                                                    aiFbcRemarksEnabled ? "translate-x-5" : "translate-x-1"
                                                }`}
                                            />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-4 sm:p-6 rounded-2xl border bg-muted/5">
                                <div className="space-y-1">
                                    <h4 className="font-bold text-lg text-foreground">Bulk AI Review Generator</h4>
                                    <p className="text-sm text-muted-foreground w-full max-w-lg">
                                        Enable or disable the Bulk AI Review Generator feature on the Director Review landing page.
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 bg-background p-2 px-4 rounded-xl border-2 shadow-sm">
                                    <span className={`text-xs font-black uppercase tracking-widest ${bulkAiReviewEnabled ? 'text-primary' : 'text-rose-500'}`}>
                                        {bulkAiReviewEnabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={configSaving || !canManageMaintenance}
                                        onClick={handleToggleBulkAiReview}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                                            bulkAiReviewEnabled ? "bg-primary" : "bg-zinc-200 dark:bg-zinc-700"
                                        }`}
                                    >
                                        {configSaving ? (
                                            <span className={`pointer-events-none flex items-center justify-center h-5 w-5 rounded-full bg-white shadow-lg transition-all duration-200 ${
                                                bulkAiReviewEnabled ? "translate-x-5" : "translate-x-1"
                                            }`}>
                                                <HugeiconsIcon icon={Loading03Icon} className="h-3 w-3 animate-spin text-primary" />
                                            </span>
                                        ) : (
                                            <span
                                                className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-all duration-200 ${
                                                    bulkAiReviewEnabled ? "translate-x-5" : "translate-x-1"
                                                }`}
                                            />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* API Configuration */}
                    <Card className="border-2 shadow-xl shadow-blue-500/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -z-10 pointer-events-none"></div>
                        <CardHeader className="border-b bg-muted/5 p-6 flex flex-row items-center justify-between">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <HugeiconsIcon icon={LockKeyIcon} className="h-6 w-6 text-blue-500" />
                                Connection Details
                            </CardTitle>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={testingConnection || !settings.api_key}
                                onClick={handleTestConnection}
                                className="h-9 px-3.5 text-xs font-bold gap-2 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 active:scale-95 transition-all shadow-xs"
                            >
                                {testingConnection ? (
                                    <>
                                        <HugeiconsIcon icon={Loading03Icon} className="h-3.5 w-3.5 animate-spin" />
                                        <span>Testing...</span>
                                    </>
                                ) : (
                                    <>
                                        <HugeiconsIcon icon={Wifi01Icon} className="h-3.5 w-3.5" />
                                        <span>Test Connection</span>
                                    </>
                                )}
                            </Button>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-3">
                                <Label className="font-bold text-sm">OpenAI API Key <span className="text-destructive">*</span></Label>
                                <Input 
                                    type="password"
                                    value={settings.api_key}
                                    placeholder="sk-proj-..." 
                                    onChange={e => {
                                        setSettings({...settings, api_key: e.target.value});
                                        setConnectionStatus(null);
                                    }}
                                    className="h-12 border-2 text-lg font-mono tracking-widest bg-muted/20"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">Your API key is stored securely and used exclusively for generating clinical overviews and remarks.</p>
                            </div>
                            
                            <div className="space-y-3">
                                <Label className="font-bold text-sm">AI Model Selection</Label>
                                <Select value={settings.model_selection} onValueChange={(val) => {
                                    setSettings({...settings, model_selection: val});
                                    setConnectionStatus(null);
                                }}>
                                    <SelectTrigger className="h-12 border-2 font-bold bg-muted/20 text-md">
                                        <SelectValue placeholder="Select a model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {AI_MODELS.map(m => (
                                            <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Connection Diagnostic Result */}
                            {connectionStatus && (
                                <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed transition-all ${
                                    connectionStatus.success 
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' 
                                        : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                                }`}>
                                    <HugeiconsIcon 
                                        icon={connectionStatus.success ? CheckmarkCircle02Icon : AlertCircleIcon} 
                                        className={`h-5 w-5 shrink-0 mt-0.5 ${connectionStatus.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} 
                                    />
                                    <div className="space-y-1">
                                        <p className="font-bold text-sm">
                                            {connectionStatus.success ? "Connection Verified" : "Connection Failed"}
                                        </p>
                                        <p>{connectionStatus.message}</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Medical Parameters */}
                    <Card className="border-2 shadow-xl shadow-primary/5 relative overflow-hidden">
                        <CardHeader className="border-b bg-muted/5 p-6">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <HugeiconsIcon icon={Activity01Icon} className="h-6 w-6 text-primary" />
                                Medical Parameters Context
                            </CardTitle>
                            <CardDescription className="text-md">
                                Select which clinical test results and paramaters should be sent to the AI as context when generating an overview. Data will only be sent if it exists for the patient.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">Laboratory & Diagnostics</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {PARAMETERS.map((param) => (
                                        <div 
                                            key={param.id} 
                                            className={`flex items-center space-x-3 p-3 border rounded-lg h-11 transition-colors ${
                                                (settings.medical_parameters || []).includes(param.id) 
                                                ? 'border-primary bg-primary/5' 
                                                : 'hover:bg-muted/50'
                                            }`}
                                        >
                                            <Checkbox 
                                                id={param.id} 
                                                checked={(settings.medical_parameters || []).includes(param.id)}
                                                onCheckedChange={() => handleParamToggle(param.id)}
                                                className="data-[state=checked]:bg-primary data-[state=checked]:text-white h-5 w-5 shrink-0"
                                            />
                                            <Label htmlFor={param.id} className="font-bold cursor-pointer flex-1 leading-tight text-xs line-clamp-2 select-none" title={param.label}>{param.label}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">Granular Consultation Details</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {CONSULTATION_PARAMETERS.map((param) => (
                                        <div 
                                            key={param.id} 
                                            className={`flex items-center space-x-3 p-3 border rounded-lg h-11 transition-colors ${
                                                (settings.medical_parameters || []).includes(param.id) 
                                                ? 'border-primary bg-primary/5' 
                                                : 'hover:bg-muted/50'
                                            }`}
                                        >
                                            <Checkbox 
                                                id={param.id} 
                                                checked={(settings.medical_parameters || []).includes(param.id)}
                                                onCheckedChange={() => handleParamToggle(param.id)}
                                                className="data-[state=checked]:bg-primary data-[state=checked]:text-white h-5 w-5 shrink-0"
                                            />
                                            <Label htmlFor={param.id} className="font-bold cursor-pointer flex-1 leading-tight text-xs line-clamp-2 select-none" title={param.label}>{param.label}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Prompt Customization */}
                    <Card className="border-2 shadow-xl shadow-purple-500/5 relative overflow-hidden">
                        <CardHeader className="border-b bg-muted/5 p-6">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <HugeiconsIcon icon={File01Icon} className="h-6 w-6 text-purple-500" />
                                Prompt Formatting & Instructions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="space-y-3">
                                <Label className="font-bold text-sm">Response Format Pattern</Label>
                                <Select value={settings.response_format} onValueChange={(val) => setSettings({...settings, response_format: val})}>
                                    <SelectTrigger className="h-12 border-2 font-bold bg-muted/20 text-md">
                                        <SelectValue placeholder="Format" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Bullet Points">Bullet Points (Recommended)</SelectItem>
                                        <SelectItem value="Paragraph">Detailed Paragraphs</SelectItem>
                                        <SelectItem value="Short Summary">Concise Summary (2-3 Sentences)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <Label className="font-bold text-sm">System Prompt Instruction</Label>
                                <p className="text-xs text-muted-foreground mb-2">This is the core behavior instruction given to the AI. Modify this to change the tone or specific focus of its analysis.</p>
                                <textarea 
                                    className="w-full min-h-[150px] border-2 rounded-xl p-4 text-sm focus:ring-4 ring-purple-500/20 bg-muted/10 outline-none leading-relaxed"
                                    value={settings.system_prompt}
                                    onChange={(e) => setSettings({...settings, system_prompt: e.target.value})}
                                    placeholder="You are an AI assistant..."
                                />
                            </div>

                            <div className="space-y-3 pt-4 border-t border-dashed">
                                <Label className="font-bold text-sm">Full Blood Count (FBC) Prompt Instruction</Label>
                                <p className="text-xs text-muted-foreground mb-2">Used specifically to generate remarks for FBC results.</p>
                                <textarea 
                                    className="w-full min-h-[100px] border-2 rounded-xl p-4 text-sm focus:ring-4 ring-purple-500/20 bg-muted/10 outline-none leading-relaxed"
                                    value={settings.prompt_fbc}
                                    onChange={(e) => setSettings({...settings, prompt_fbc: e.target.value})}
                                    placeholder="Enter FBC custom prompt instruction..."
                                />
                            </div>

                            <div className="space-y-3 pt-4 border-t border-dashed">
                                <Label className="font-bold text-sm">Lipid Profile Prompt Instruction</Label>
                                <p className="text-xs text-muted-foreground mb-2">Used specifically to generate remarks for Lipid Profile results.</p>
                                <textarea 
                                    className="w-full min-h-[100px] border-2 rounded-xl p-4 text-sm focus:ring-4 ring-purple-500/20 bg-muted/10 outline-none leading-relaxed"
                                    value={settings.prompt_lipid}
                                    onChange={(e) => setSettings({...settings, prompt_lipid: e.target.value})}
                                    placeholder="Enter Lipid Profile custom prompt instruction..."
                                />
                            </div>

                            <div className="space-y-3 pt-4 border-t border-dashed">
                                <Label className="font-bold text-sm">Liver Function Test (LFT) Prompt Instruction</Label>
                                <p className="text-xs text-muted-foreground mb-2">Used specifically to generate remarks for LFT results.</p>
                                <textarea 
                                    className="w-full min-h-[100px] border-2 rounded-xl p-4 text-sm focus:ring-4 ring-purple-500/20 bg-muted/10 outline-none leading-relaxed"
                                    value={settings.prompt_lft}
                                    onChange={(e) => setSettings({...settings, prompt_lft: e.target.value})}
                                    placeholder="Enter LFT custom prompt instruction..."
                                />
                            </div>

                            <div className="space-y-3 pt-4 border-t border-dashed">
                                <Label className="font-bold text-sm">Kidney Function Test (KFT) Prompt Instruction</Label>
                                <p className="text-xs text-muted-foreground mb-2">Used specifically to generate remarks for KFT results.</p>
                                <textarea 
                                    className="w-full min-h-[100px] border-2 rounded-xl p-4 text-sm focus:ring-4 ring-purple-500/20 bg-muted/10 outline-none leading-relaxed"
                                    value={settings.prompt_kft}
                                    onChange={(e) => setSettings({...settings, prompt_kft: e.target.value})}
                                    placeholder="Enter KFT custom prompt instruction..."
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sample Comments (Few-Shot Prompting) */}
                    <Card className="border-2 shadow-xl shadow-amber-500/5 relative overflow-hidden">
                        <CardHeader className="border-b bg-muted/5 p-6">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <HugeiconsIcon icon={MachineRobotIcon} className="h-6 w-6 text-amber-500" />
                                Sample Expert Comments
                            </CardTitle>
                            <CardDescription>
                                Provide examples of how a doctor typically writes comments. The AI will learn from these samples to better match your preferred style and tone.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="flex gap-2">
                                <Input 
                                    placeholder="Add a sample comment (e.g., Patient is clinically fit for work...)" 
                                    value={newSample}
                                    onChange={(e) => setNewSample(e.target.value)}
                                    className="border-2 rounded-xl"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (newSample.trim()) {
                                                setSettings(prev => ({...prev, sample_comments: [...(prev.sample_comments || []), newSample.trim()]}));
                                                setNewSample('');
                                            }
                                        }
                                    }}
                                />
                                <Button 
                                    type="button" 
                                    variant="secondary" 
                                    className="font-bold rounded-xl whitespace-nowrap min-w-max px-6"
                                    onClick={() => {
                                        if (newSample.trim()) {
                                            setSettings(prev => ({...prev, sample_comments: [...prev.sample_comments, newSample.trim()]}));
                                            setNewSample('');
                                        }
                                    }}
                                >
                                    Add Sample
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {settings.sample_comments.map((comment, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-muted/20 border-2 border-dashed rounded-2xl group hover:border-amber-500/30 transition-all">
                                        <p className="text-xs font-bold italic line-clamp-3">"{comment}"</p>
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 w-8 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                            onClick={() => setSettings(prev => ({...prev, sample_comments: prev.sample_comments.filter((_, i) => i !== idx)}))}
                                        >
                                            <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {settings.sample_comments.length === 0 && (
                                    <div className="md:col-span-2">
                                        <p className="text-center text-muted-foreground text-sm italic py-4">No samples added yet. AI will use its default clinical style.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end pt-6">
                        <Button 
                            type="submit" 
                            size="lg" 
                            loading={saving}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 px-12 shadow-xl shadow-blue-500/20 rounded-xl text-lg w-full md:w-auto"
                        >
                            {!saving && <HugeiconsIcon icon={FloppyDiskIcon} className="mr-3 h-6 w-6" />}
                            Save AI Configuration
                        </Button>
                    </div>
                </form>
            </div>
        </MainLayout>
    );
};

export default AISettingsPage;
