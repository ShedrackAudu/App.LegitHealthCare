import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Bot, Save, Loader2, Key, Settings2, FileText, Activity, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useAppContext } from '@/context/AppContext';

const PARAMETERS = [
    { id: 'FBC', label: 'Full Blood Count (FBC)' },
    { id: 'KFT', label: 'Kidney Function Test (KFT)' },
    { id: 'LFT', label: 'Liver Function Test (LFT)' },
    { id: 'Lipid Profile', label: 'Lipid Profile' },
    { id: 'Spirometry', label: 'Spirometry' },
    { id: 'Audiometry', label: 'Audiometry' },
    { id: 'ECG', label: 'ECG (Electrocardiogram)' },
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
    { id: 'Consultation:dm_status', label: 'Diabetes Status' },
    { id: 'Consultation:htn_status', label: 'Hypertension Status' },
    { id: 'Consultation:bp', label: 'Blood Pressure' },
    { id: 'Consultation:pulse', label: 'Pulse Rate' },
    { id: 'Consultation:spo2', label: 'SPO2 (Saturation)' },
    { id: 'Consultation:hs_status', label: 'Heart Sounds (S3, S4)' },
    { id: 'Consultation:breast', label: 'Breast Exam' },
    { id: 'Consultation:abdomen', label: 'Abdominal Exam' },
    { id: 'Consultation:hx_pe', label: 'H&P Assessment' },
    { id: 'Consultation:other_assessments', label: 'Other Assessments' },
    { id: 'Consultation:overall_lab', label: 'Overall Lab Remark' },
    { id: 'Consultation:overall_assessment', label: 'Overall Assessment' },
    { id: 'Consultation:other_remarks', label: 'General Remarks' }
];

const AI_MODELS = [
    { id: 'gpt-4o', label: 'GPT-4o (Omni - Latest & Smartest)' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cost-Efficient)' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { id: 'gpt-4', label: 'GPT-4 (Standard)' },
    { id: 'o1-preview', label: 'OpenAI o1-preview (Advanced Reasoning)' },
    { id: 'o1-mini', label: 'OpenAI o1-mini (Faster Reasoning)' },
    { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Legacy)' }
];

export const AISettingsPage = () => {
    const { activeSection } = useAppContext();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [settings, setSettings] = useState({
        api_key: '',
        model_selection: 'gpt-4o',
        response_format: 'Bullet Points',
        system_prompt: 'You are a highly experienced occupational health physician. Analyze the provided clinical findings, lab results, and patient history to generate a concise, professional, and actionable overview. Point out any critical abnormalities, suggest follow-up actions if necessary, and summarize the overall health status of the staff member.',
        medical_parameters: ['Consultation:bp', 'Consultation:pulse'] as string[],
        sample_comments: [] as string[]
    });
    
    const [newSample, setNewSample] = useState('');

    useEffect(() => {
        fetchSettings();
    }, [activeSection]);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/ai/settings', {
                headers: { 'X-Company-Context': activeSection }
            });
            setSettings({
                api_key: res.data.api_key || '',
                model_selection: res.data.model_selection || 'gpt-4o',
                response_format: res.data.response_format || 'Bullet Points',
                system_prompt: res.data.system_prompt || 'You are a highly experienced occupational health physician. Analyze the provided clinical findings, lab results, and patient history to generate a concise, professional, and actionable overview. Point out any critical abnormalities, suggest follow-up actions if necessary, and summarize the overall health status of the staff member.',
                medical_parameters: res.data.medical_parameters || [],
                sample_comments: res.data.sample_comments || []
            });
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
            await axios.post('http://localhost:5000/api/ai/settings', settings, {
                headers: { 'X-Company-Context': activeSection }
            });
            toast.success("AI Integration Settings saved successfully!");
        } catch (err) {
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
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

    if (loading) return <MainLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></MainLayout>;

    return (
        <MainLayout>
            <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4 bg-card p-6 rounded-2xl border-2 shadow-xl border-blue-500/10 mb-8">
                    <div className="p-4 bg-blue-500/10 rounded-2xl">
                        <Bot className="text-blue-600 h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-foreground">AI Director Insights</h1>
                        <p className="text-muted-foreground font-medium mt-1">Configure OpenAI ChatGPT behavior for automated result overviews and recommendations.</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6 pb-20">
                    
                    {/* API Configuration */}
                    <Card className="border-2 shadow-xl shadow-blue-500/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -z-10 pointer-events-none"></div>
                        <CardHeader className="border-b bg-muted/5 p-6">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Key className="h-6 w-6 text-blue-500" />
                                Connection Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="space-y-3">
                                <Label className="font-bold text-sm">OpenAI API Key <span className="text-destructive">*</span></Label>
                                <Input 
                                    type="password"
                                    value={settings.api_key}
                                    placeholder="sk-..." 
                                    onChange={e => setSettings({...settings, api_key: e.target.value})}
                                    className="h-12 border-2 text-lg font-mono tracking-widest bg-muted/20"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">Your API key is stored securely and used exclusively for generating patient overviews.</p>
                            </div>
                            
                            <div className="space-y-3">
                                <Label className="font-bold text-sm">AI Model Selection</Label>
                                <Select value={settings.model_selection} onValueChange={(val) => setSettings({...settings, model_selection: val})}>
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
                        </CardContent>
                    </Card>

                    {/* Medical Parameters */}
                    <Card className="border-2 shadow-xl shadow-emerald-500/5 relative overflow-hidden">
                        <CardHeader className="border-b bg-muted/5 p-6">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Activity className="h-6 w-6 text-emerald-500" />
                                Medical Parameters Context
                            </CardTitle>
                            <CardDescription className="text-md">
                                Select which clinical test results and paramaters should be sent to the AI as context when generating an overview. Data will only be sent if it exists for the patient.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">Laboratory & Diagnostics</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {PARAMETERS.map((param) => (
                                        <div 
                                            key={param.id} 
                                            className={`flex items-center space-x-3 p-4 border-2 rounded-xl transition-colors ${
                                                (settings.medical_parameters || []).includes(param.id) 
                                                ? 'border-emerald-500 bg-emerald-500/5' 
                                                : 'hover:bg-muted/50'
                                            }`}
                                        >
                                            <Checkbox 
                                                id={param.id} 
                                                checked={(settings.medical_parameters || []).includes(param.id)}
                                                onCheckedChange={() => handleParamToggle(param.id)}
                                                className="data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white h-5 w-5"
                                            />
                                            <Label htmlFor={param.id} className="font-bold cursor-pointer flex-1 leading-none">{param.label}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">Granular Consultation Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {CONSULTATION_PARAMETERS.map((param) => (
                                        <div 
                                            key={param.id} 
                                            className={`flex items-center space-x-2 p-3 border rounded-lg transition-colors ${
                                                (settings.medical_parameters || []).includes(param.id) 
                                                ? 'border-emerald-500/50 bg-emerald-500/5' 
                                                : 'hover:bg-muted/30'
                                            }`}
                                        >
                                            <Checkbox 
                                                id={param.id} 
                                                checked={(settings.medical_parameters || []).includes(param.id)}
                                                onCheckedChange={() => handleParamToggle(param.id)}
                                                className="h-4 w-4"
                                            />
                                            <Label htmlFor={param.id} className="text-xs font-bold cursor-pointer flex-1 leading-tight">{param.label}</Label>
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
                                <FileText className="h-6 w-6 text-purple-500" />
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
                        </CardContent>
                    </Card>

                    {/* Sample Comments (Few-Shot Prompting) */}
                    <Card className="border-2 shadow-xl shadow-amber-500/5 relative overflow-hidden">
                        <CardHeader className="border-b bg-muted/5 p-6">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Bot className="h-6 w-6 text-amber-500" />
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
                                            <Trash2 className="h-4 w-4" />
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
                            disabled={saving}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 px-12 shadow-xl shadow-blue-500/20 rounded-xl text-lg w-full md:w-auto"
                        >
                            {saving ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : <Save className="mr-3 h-6 w-6" />}
                            Save AI Configuration
                        </Button>
                    </div>
                </form>
            </div>
        </MainLayout>
    );
};

export default AISettingsPage;
