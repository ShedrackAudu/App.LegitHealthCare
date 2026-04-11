import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Activity, 
  Save, 
  Loader2, 
  Heart, 
  Wind, 
  ChevronRight,
  FlaskConical,
  Brain,
  ClipboardList,
  Volume2,
  ArrowLeft,
  Search,
  Users,
  Clock3
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'react-hot-toast';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { toast as hotToast } from 'react-hot-toast';

const TempAccessCountdown = () => {
    const { user } = useAppContext();
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        if (!user || !user.temp_access || user.temp_access.length === 0) return;
        
        const sorted = [...user.temp_access].sort((a, b) => a.remaining_seconds - b.remaining_seconds);
        const soonest = sorted[0];

        if (soonest) {
            setTimeLeft(soonest.remaining_seconds);
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev === null || prev <= 0) {
                    clearInterval(timer);
                    if (prev === 0) {
                        hotToast.error("Your temporary access has expired.");
                        window.location.reload();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [user]);

    if (timeLeft === null || timeLeft <= 0) return null;

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;

    return (
        <div className="mt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-600 animate-pulse bg-orange-100/50 px-3 py-1 rounded-full w-fit">
            <Clock3 className="h-3 w-3" />
            Temporary Access: {mins}:{secs < 10 ? `0${secs}` : secs} Remaining
        </div>
    );
};

type TestType = 'fbc' | 'kft' | 'lipid' | 'lft' | 'ecg' | 'spirometry' | 'audiometry' | null;

const TestResultsPage: React.FC = () => {
    const { testType: paramTestType } = useParams<{ testType: string }>();
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { activeSection, activeYear } = useAppContext();
    
    // Determine current test type from param or URL path fallback
    const currentType = (paramTestType || pathname.split('/').pop()) as TestType;
    const [selectedTest, setSelectedTest] = useState<TestType>(
        ['fbc', 'kft', 'lipid', 'lft', 'ecg', 'spirometry', 'audiometry'].includes(currentType || '') ? currentType : null
    );
    
    useEffect(() => {
        const urlType = (paramTestType || pathname.split('/').pop()) as TestType;
        if (urlType && ['fbc', 'kft', 'lipid', 'lft', 'ecg', 'spirometry', 'audiometry'].includes(urlType)) {
            setSelectedTest(urlType);
        } else if (pathname === '/tests') {
            setSelectedTest(null);
            setPatient(null);
        }
    }, [paramTestType, pathname]);
    const [patient, setPatient] = useState<any>(null);
    const [searchId, setSearchId] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
    const [loadingQueue, setLoadingQueue] = useState(false);
    const [queueEntries, setQueueEntries] = useState<any[]>([]);
    const [selectedQueueDept, setSelectedQueueDept] = useState<string>('');
    const [isSelecting, setIsSelecting] = useState(false);
    useEffect(() => {
        if (searchId.length > 0) {
            if (isSelecting) {
                setIsSelecting(false);
                setSearchResults([]);
                return;
            }
            const fetchResults = async () => {
                try {
                    const res = await axios.get(`http://localhost:5000/api/patients/search?q=${searchId}`, {
                        headers: { 'X-Company-Context': activeSection }
                    });
                    setSearchResults(res.data);
                } catch (err) {
                    console.error(err);
                }
            };
            const timer = setTimeout(fetchResults, 300);
            return () => clearTimeout(timer);
        } else {
            setSearchResults([]);
        }
    }, [searchId, activeSection, isSelecting]);

    const [queueData, setQueueData] = useState<any>({});
    const fetchQueue = async () => {
        try {
            const resp = await axios.get(`http://localhost:5000/api/queue/?year=${activeYear}`, {
                headers: { 'X-Company-Context': activeSection }
            });
            setQueueData(resp.data);
        } catch (err) {}
    };

    const fetchQueueList = async (dept: string) => {
        setLoadingQueue(true);
        setSelectedQueueDept(dept);
        try {
            const resp = await axios.get(`http://localhost:5000/api/queue/${dept.toLowerCase()}/?year=${activeYear}`, {
                headers: { 'X-Company-Context': activeSection }
            });
            setQueueEntries(resp.data);
            setIsQueueModalOpen(true);
        } catch (err) {
            console.error("Queue list fetch failed:", err);
            toast.error("Failed to load patient queue");
        } finally {
            setLoadingQueue(false);
        }
    };

    const getRelativeTime = (isoString: string) => {
        if (!isoString) return 'recently';
        const dateStr = isoString.endsWith('Z') || isoString.includes('+') ? isoString : `${isoString}Z`;
        const date = new Date(dateStr);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        if (diffInMs < 0) return 'Just now';
        const diffInMins = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        if (diffInMins < 1) return 'Just now';
        if (diffInMins < 60) return `${diffInMins} mins ago`;
        if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    };

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(fetchQueue, 30000);
        return () => clearInterval(interval);
    }, [activeYear, activeSection]);

    const selectPatient = (p: any) => {
        setIsSelecting(true);
        setPatient(p);
        setSearchId(''); // Clear the search field
        setSearchResults([]);
        toast.success(`Loaded ${p.first_name}'s record`);
    };

    const handleSearch = async () => {
        if (!searchId) return;
        setSearching(true);
        try {
            const response = await axios.get(`http://localhost:5000/patient/${searchId}`, {
                headers: { 'X-Company-Context': activeSection }
            });
            setPatient(response.data);
        } catch (err) {
            alert("Patient not found");
        } finally {
            setSearching(false);
        }
    };

    if (!selectedTest) {
        return (
            <MainLayout>
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="text-center space-y-2">
                        <h1 className="text-4xl font-black tracking-tight text-primary">Diagnostic Test Results</h1>
                        <p className="text-muted-foreground text-lg">Select a test type to record or view patient results.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { id: 'fbc', title: 'Full Blood Count', icon: FlaskConical, color: 'text-rose-500', bg: 'bg-rose-500/10', permission: 'lab_fbc' },
                            { id: 'kft', title: 'Kidney Function Test', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10', permission: 'lab_kft' },
                            { id: 'lipid', title: 'Lipid Profile', icon: Brain, color: 'text-amber-500', bg: 'bg-amber-500/10', permission: 'lab_lipid' },
                            { id: 'lft', title: 'Liver Function Test', icon: ClipboardList, color: 'text-emerald-500', bg: 'bg-emerald-500/10', permission: 'lab_lft' },
                            { id: 'ecg', title: 'ECG Analysis', icon: Heart, color: 'text-red-500', bg: 'bg-red-500/10', permission: 'lab_ecg' },
                            { id: 'spirometry', title: 'Spirometry', icon: Wind, color: 'text-sky-500', bg: 'bg-sky-500/10', permission: 'lab_spirometry' },
                            { id: 'audiometry', title: 'Audiometry', icon: Volume2, color: 'text-purple-500', bg: 'bg-purple-500/10', permission: 'lab_audiometry' },
                        ].map((test) => (
                            <Card 
                                key={test.id} 
                                className="group cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/50"
                                onClick={() => navigate(`/tests/${test.id}`)}
                            >
                                <CardContent className="p-6 flex items-center gap-4">
                                    <div className={`p-4 rounded-2xl ${test.bg} ${test.color} transition-transform group-hover:scale-110`}>
                                        <test.icon className="h-8 w-8" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold">{test.title}</h3>
                                        <p className="text-sm text-muted-foreground">Record diagnostic findings</p>
                                    </div>
                                    <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <Button variant="ghost" onClick={() => navigate('/tests')} className="gap-2 -ml-2">
                    <ArrowLeft className="h-4 w-4" /> Back to Test Selection
                </Button>

                {!patient ? (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Top Search Bar Style from Consultation */}
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card p-6 rounded-2xl border-2 shadow-xl border-primary/10 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary/10 rounded-2xl">
                                    <FlaskConical className="text-primary h-8 w-8" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black tracking-tight capitalize">{selectedTest?.replace('_', ' ')} Record</h1>
                                    <p className="text-sm text-muted-foreground font-medium">Session: {activeYear} • {activeSection}</p>
                                    <TempAccessCountdown />
                                </div>
                            </div>
                            
                            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full xl:w-auto">
                                {(selectedTest === 'ecg' || selectedTest === 'spirometry' || selectedTest === 'audiometry') && (
                                    <Card 
                                        className="bg-primary/5 border-primary/20 cursor-pointer hover:bg-primary/10 transition-colors group shrink-0 hidden sm:block shadow-sm"
                                        onClick={() => fetchQueueList(selectedTest || '')}
                                    >
                                        <CardContent className="p-2.5 px-4 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                                    <Users className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-tight">Waiting</p>
                                                    <h3 className="text-lg font-black tracking-tighter leading-none">
                                                        {selectedTest === 'ecg' ? queueData.ecg || 0 : 
                                                        selectedTest === 'spirometry' ? queueData.spirometry || 0 : 
                                                        queueData.audiometry || 0}
                                                    </h3>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-0.5 text-[9px] font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                                VIEW <ChevronRight className="h-3 w-3" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Search Section Redesign */}
                                <div className="flex-1 w-full lg:max-w-2xl relative">
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-muted/30 p-2 rounded-xl border-2 focus-within:border-primary/50 transition-all relative">
                                        <div className="flex items-center gap-2 flex-1 px-2 h-11">
                                            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                                            <Input
                                                placeholder="Search Staff ID or Name..."
                                                value={searchId}
                                                onChange={(e) => setSearchId(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                                className="border-0 bg-transparent focus-visible:ring-0 min-w-0 flex-1 text-base sm:text-lg font-bold h-full px-0"
                                            />
                                        </div>
                                        <Button 
                                            onClick={handleSearch}
                                            disabled={searching || !searchId.trim()}
                                            className="bg-primary hover:bg-primary/90 shadow-lg px-6 sm:px-8 whitespace-nowrap font-bold h-11 rounded-xl w-full sm:w-auto"
                                        >
                                            {searching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Load Profile'}
                                        </Button>

                                        {/* Search Results Card */}
                                        {searchResults.length > 0 && (
                                            <Card className="absolute top-full left-0 right-0 mt-2 z-[100] shadow-2xl border-2 border-primary/20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                                                <CardHeader className="py-3 bg-primary/5 border-b">
                                                    <CardTitle className="text-xs uppercase tracking-widest text-primary/70">Matching Profiles</CardTitle>
                                                </CardHeader>
                                                <ul className="max-h-[300px] overflow-auto divide-y">
                                                    {searchResults.map((p: any) => (
                                                        <li 
                                                            key={p.staff_id}
                                                            className="p-4 hover:bg-primary/5 cursor-pointer transition-colors group"
                                                            onClick={() => selectPatient(p)}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black group-hover:scale-110 transition-transform">
                                                                        {p.first_name[0]}{p.last_name[0]}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-bold text-foreground capitalize">{p.first_name} {p.last_name}</p>
                                                                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                                                                            <span className="bg-muted px-1.5 py-0.5 rounded uppercase">{p.staff_id}</span>
                                                                            • <span>{p.department}</span>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 h-8 px-2">
                                                                    Select <ChevronRight className="ml-1 h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </Card>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <Card className="border-2 border-dashed flex items-center justify-center h-64 bg-muted/5">
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Activity className="w-8 h-8 text-muted-foreground/50" />
                                </div>
                                <p className="text-muted-foreground font-bold text-lg italic tracking-tight">Enter a Patient ID to begin recording {selectedTest?.toUpperCase()} results.</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black">Context: {activeSection} Clinic • {activeYear}</p>
                            </div>
                        </Card>
                    </div>
                ) : (
                    <TestFormContainer 
                        testType={selectedTest} 
                        patient={patient} 
                        activeYear={activeYear} 
                        activeSection={activeSection}
                        onSuccess={() => {
                            toast.success("Tests saved successfully!");
                            setPatient(null);
                            setSearchId('');
                        }}
                    />
                )}
            </div>

            <Dialog open={isQueueModalOpen} onOpenChange={setIsQueueModalOpen}>
                <DialogContent className="max-w-2xl sm:max-w-[500px] border-primary/20">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black tracking-tight uppercase tracking-tight">{selectedQueueDept} Queue</DialogTitle>
                                <DialogDescription className="text-xs font-medium"> Patients waiting for diagnostic testing</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    
                    <div className="relative mt-2">
                        <ScrollArea className="h-[400px] pr-4">
                            {loadingQueue ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                                </div>
                            ) : queueEntries.length > 0 ? (
                                <div className="space-y-3">
                                    {queueEntries.map((entry) => (
                                        <div key={entry.staff_id} className="flex items-center justify-between p-4 rounded-xl border-2 bg-muted/5 hover:bg-muted/10 transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-black text-primary border border-primary/20 transition-transform group-hover:scale-110">
                                                    {entry.first_name?.[0]}{entry.last_name?.[0]}
                                                </div>
                                                <div>
                                                    <p className="font-black text-sm tracking-tight">{entry.first_name} {entry.last_name}</p>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">ID: {entry.staff_id}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    className="h-8 px-3 text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white border border-primary/20 rounded-lg group/btn"
                                                    onClick={() => {
                                                        selectPatient(entry);
                                                        setIsQueueModalOpen(false);
                                                    }}
                                                >
                                                    Proceed <ChevronRight className="w-3 h-3 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                                                </Button>
                                                <div className="text-right">
                                                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                                                        <Clock3 className="w-3 h-3" />
                                                        <span className="text-[10px] font-bold">{getRelativeTime(entry.created_at)}</span>
                                                    </div>
                                                    <Badge variant="outline" className="text-[8px] font-black tracking-tighter text-primary border-primary/20">
                                                        WAITING
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
                                    <Users className="h-12 w-12 mb-4 text-muted-foreground" />
                                    <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Queue is Empty</p>
                                    <p className="text-xs text-muted-foreground mt-1">No patients are waiting for this test.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <Button 
                            variant="ghost" 
                            onClick={() => setIsQueueModalOpen(false)}
                            className="font-black text-xs uppercase tracking-widest hover:bg-primary/5"
                        >
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
};

const TestFormContainer = ({ testType, patient, activeYear, activeSection, onSuccess }: any) => {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [initialData, setInitialData] = useState<any>(null);
    
    useEffect(() => {
        const fetchExisting = async () => {
            setFetching(true);
            try {
                const type = testType === 'ecg' || testType === 'spirometry' || testType === 'audiometry' ? 'special' : testType;
                const resp = await axios.get(`http://localhost:5000/api/tests/get-test/${type}/${patient.staff_id}?year=${activeYear}`, {
                    headers: { 'X-Company-Context': activeSection }
                });
                setInitialData(resp.data);
            } catch (err) {
                setInitialData({}); // Clear if not found
            } finally {
                setFetching(false);
            }
        };
        fetchExisting();
    }, [testType, patient.staff_id, activeYear, activeSection]);

    const onSubmit = async (data: any) => {
        setLoading(true);
        try {
            const type = testType === 'ecg' || testType === 'spirometry' || testType === 'audiometry' ? 'special' : testType;
            await axios.post(`http://localhost:5000/api/tests/save-test/${type}`, {
                ...data,
                staff_id: patient.staff_id,
                screening_year: activeYear
            }, {
                headers: { 'X-Company-Context': activeSection }
            });
            onSuccess();
        } catch (err) {
            alert("Failed to save results");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <Card className="border-2 border-dashed flex items-center justify-center h-64 bg-muted/5">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-bold text-muted-foreground animate-pulse">Fetching existing records...</p>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* BioData Header */}
            <Card className="border-2 border-primary/20 shadow-md bg-primary/5 overflow-hidden">
                <CardContent className="p-6">
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <BioItem label="Staff ID" value={patient.staff_id} className="font-bold text-primary" />
                        <BioItem label="First Name" value={patient.first_name} />
                        <BioItem label="Last Name" value={patient.last_name} />
                        <BioItem label="Age" value={patient.age} />
                        <BioItem label="Department" value={patient.department} />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-2 shadow-xl">
                <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="capitalize">{testType?.replace('_', ' ')} Results Record</CardTitle>
                    <p className="text-xs text-muted-foreground font-medium ml-1">Recording for {activeYear} Screening Program</p>
                </CardHeader>
                <CardContent className="p-6">
                    {testType === 'fbc' && <FBCForm onSubmit={onSubmit} loading={loading} initialData={initialData} />}
                    {testType === 'kft' && <KFTForm onSubmit={onSubmit} loading={loading} initialData={initialData} />}
                    {testType === 'lipid' && <LipidForm onSubmit={onSubmit} loading={loading} initialData={initialData} />}
                    {testType === 'lft' && <LFTForm onSubmit={onSubmit} loading={loading} initialData={initialData} />}
                    {testType === 'ecg' && <SimpleTestForm onSubmit={onSubmit} loading={loading} test="ECG" initialData={initialData} />}
                    {testType === 'spirometry' && <SpirometryForm onSubmit={onSubmit} loading={loading} initialData={initialData} />}
                    {testType === 'audiometry' && <SimpleTestForm onSubmit={onSubmit} loading={loading} test="Audiometry" initialData={initialData} />}
                </CardContent>
            </Card>
        </div>
    );
};

const BioItem = ({ label, value, className }: any) => (
    <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{label}</p>
        <p className={`text-base truncate ${className}`}>{value}</p>
    </div>
);

// Form Components
const FBCForm = ({ onSubmit, loading, initialData }: any) => {
    const { register, handleSubmit, reset } = useForm({
        defaultValues: initialData
    });

    useEffect(() => {
        if (initialData) reset(initialData);
    }, [initialData, reset]);

    const fields = [
        'pcv', 'wbc', 'plt', 'lymp_percent', 'lymp_abs', 'gra_percent', 'gra_abs', 
        'mid_percent', 'mid_abs', 'rbc', 'mcv', 'mch', 'mchc', 'rdw', 'pdw', 'hgb'
    ];
    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {fields.map(f => (
                    <div key={f} className="space-y-2">
                        <Label>{f.toUpperCase().replace('_', ' ')} <span className="text-rose-500">*</span></Label>
                        <Input {...register(f, { required: true })} type="number" step="any" placeholder="0.00" required />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>FBC Remark</Label>
                    <Input {...register('fbc_remark')} placeholder="Remarks..." />
                </div>
                <div className="space-y-2">
                    <Label>Other Remarks</Label>
                    <Input {...register('other_remarks')} placeholder="General notes..." />
                </div>
            </div>
            <div className="flex justify-end pt-4">
                <Button type="submit" className="h-11 px-12 font-bold shadow-lg" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="mr-2 h-5 w-5" /> Save FBC Results</>}
                </Button>
            </div>
        </form>
    );
};

const KFTForm = ({ onSubmit, loading, initialData }: any) => {
    const { register, handleSubmit, watch, setValue, reset } = useForm({
        defaultValues: initialData
    });

    useEffect(() => {
        if (initialData) reset(initialData);
    }, [initialData, reset]);

    const k = watch('potassium');
    const na = watch('sodium');
    const cl = watch('chloride');

    useEffect(() => {
        const kv = parseFloat(k) || 0;
        const nav = parseFloat(na) || 0;
        const clv = parseFloat(cl) || 0;
        const hco3 = kv + nav - clv - 16;
        setValue('hco3', hco3.toFixed(2));
    }, [k, na, cl, setValue]);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2"><Label>POTASSIUM - K <span className="text-rose-500">*</span></Label><Input {...register('potassium', { required: true })} type="number" step="any" placeholder="0.00" required /></div>
                <div className="space-y-2"><Label>SODIUM - NA <span className="text-rose-500">*</span></Label><Input {...register('sodium', { required: true })} type="number" step="any" placeholder="0.00" required /></div>
                <div className="space-y-2"><Label>CHLORIDE - CL <span className="text-rose-500">*</span></Label><Input {...register('chloride', { required: true })} type="number" step="any" placeholder="0.00" required /></div>
                <div className="space-y-2"><Label>BICARBONATE - CA <span className="text-rose-500">*</span></Label><Input {...register('bicarbonate_ca', { required: true })} type="number" step="any" placeholder="0.00" required /></div>
                <div className="space-y-2"><Label>HCO3 (Auto)</Label><Input {...register('hco3')} type="number" step="any" className="font-bold text-primary" /></div>
                <div className="space-y-2"><Label>UREA <span className="text-rose-500">*</span></Label><Input {...register('urea', { required: true })} type="number" step="any" placeholder="0.00" required /></div>
                <div className="space-y-2"><Label>CREATININE - CRE <span className="text-rose-500">*</span></Label><Input {...register('creatinine', { required: true })} type="number" step="any" placeholder="0.00" required /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>KFT Remark</Label><Input {...register('kft_remark')} /></div>
                <div className="space-y-2"><Label>Other Remarks</Label><Input {...register('other_remarks')} /></div>
            </div>
            <div className="flex justify-end pt-4">
                <Button type="submit" className="h-11 px-12 font-bold shadow-lg" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="mr-2 h-5 w-5" /> Save KFT Results</>}
                </Button>
            </div>
        </form>
    );
};

const LipidForm = ({ onSubmit, loading, initialData }: any) => {
    const { register, handleSubmit, watch, setValue, reset } = useForm({
        defaultValues: initialData
    });

    useEffect(() => {
        if (initialData) reset(initialData);
    }, [initialData, reset]);

    const tcho = watch('total_cholesterol');
    const tg = watch('triglycerides');

    useEffect(() => {
        const tv = parseFloat(tcho) || 0;
        const tgv = parseFloat(tg) || 0;
        const hdl = tv * 0.35;
        const ldl = tv + (tgv / 5) + hdl; // Following literal user instruction: TCHO+TG/5,+HDL
        setValue('hdl', hdl.toFixed(2));
        setValue('ldl', ldl.toFixed(2));
    }, [tcho, tg, setValue]);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2"><Label>TOTAL CHOLESTEROL - TCHO <span className="text-rose-500">*</span></Label><Input {...register('total_cholesterol', { required: true })} type="number" step="any" placeholder="0.00" required /></div>
                <div className="space-y-2"><Label>TRIGLYCERIDES - TG <span className="text-rose-500">*</span></Label><Input {...register('triglycerides', { required: true })} type="number" step="any" placeholder="0.00" required /></div>
                <div className="space-y-2"><Label>HDL (Auto)</Label><Input {...register('hdl')} type="number" step="any" className="font-bold" /></div>
                <div className="space-y-2"><Label>LDL (Auto)</Label><Input {...register('ldl')} type="number" step="any" className="font-bold" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>LP Remark</Label><Input {...register('lp_remark')} /></div>
                <div className="space-y-2"><Label>Other Remarks</Label><Input {...register('other_remarks')} /></div>
            </div>
            <div className="flex justify-end pt-4">
                <Button type="submit" className="h-11 px-12 font-bold shadow-lg" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="mr-2 h-5 w-5" /> Save Lipid Results</>}
                </Button>
            </div>
        </form>
    );
};

const LFTForm = ({ onSubmit, loading, initialData }: any) => {
    const { register, handleSubmit, reset } = useForm({
        defaultValues: initialData
    });

    useEffect(() => {
        if (initialData) reset(initialData);
    }, [initialData, reset]);
    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2"><Label>AST <span className="text-rose-500">*</span></Label><Input {...register('ast', { required: true })} type="number" step="any" placeholder="0.00" required /></div>
                <div className="space-y-2"><Label>ALT <span className="text-rose-500">*</span></Label><Input {...register('alt', { required: true })} type="number" step="any" placeholder="0.00" required /></div>
                <div className="space-y-2"><Label>ALP <span className="text-rose-500">*</span></Label><Input {...register('alp', { required: true })} type="number" step="any" placeholder="0.00" required /></div>
                <div className="space-y-2"><Label>TB <span className="text-rose-500">*</span></Label><Input {...register('tb', { required: true })} type="number" step="any" placeholder="0.00" required /></div>
                <div className="space-y-2"><Label>CB <span className="text-rose-500">*</span></Label><Input {...register('cb', { required: true })} type="number" step="any" placeholder="0.00" required /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>LFT Remark</Label><Input {...register('lft_remark')} /></div>
                <div className="space-y-2"><Label>Other Remarks</Label><Input {...register('other_remarks')} /></div>
            </div>
            <div className="flex justify-end pt-4">
                <Button type="submit" className="h-11 px-12 font-bold shadow-lg" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="mr-2 h-5 w-5" /> Save LFT Results</>}
                </Button>
            </div>
        </form>
    );
};

const SpirometryForm = ({ onSubmit, loading, initialData }: any) => {
    const { register, handleSubmit, reset } = useForm({
        defaultValues: initialData
    });

    useEffect(() => {
        if (initialData) reset(initialData);
    }, [initialData, reset]);
    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Spirometry Result <span className="text-rose-500">*</span></Label><Input {...register('spirometry_result', { required: true })} required /></div>
                <div className="space-y-2"><Label>Spirometry Remark <span className="text-rose-500">*</span></Label><Input {...register('spirometry_remark', { required: true })} required /></div>
                <div className="space-y-2"><Label>Weight (kg) <span className="text-rose-500">*</span></Label><Input {...register('weight', { required: true })} type="number" step="any" placeholder="0.00" required /></div>
                <div className="space-y-2"><Label>Height (cm) <span className="text-rose-500">*</span></Label><Input {...register('height', { required: true })} type="number" step="any" placeholder="0.00" required /></div>
            </div>
            <div className="flex justify-end pt-4">
                <Button type="submit" className="h-11 px-12 font-bold shadow-lg" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="mr-2 h-5 w-5" /> Save Spirometry Results</>}
                </Button>
            </div>
        </form>
    );
};

const SimpleTestForm = ({ onSubmit, loading, test, initialData }: any) => {
    const { register, handleSubmit, reset } = useForm({
        defaultValues: initialData
    });

    useEffect(() => {
        if (initialData) reset(initialData);
    }, [initialData, reset]);

    const resultKey = `${test.toLowerCase()}_result`;
    const remarkKey = `${test.toLowerCase()}_remark`;
    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{test} Result <span className="text-rose-500">*</span></Label><Input {...register(resultKey, { required: true })} required /></div>
                <div className="space-y-2"><Label>Remark <span className="text-rose-500">*</span></Label><Input {...register(remarkKey, { required: true })} required /></div>
            </div>
            <div className="flex justify-end pt-4">
                <Button type="submit" className="h-11 px-12 font-bold shadow-lg" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="mr-2 h-5 w-5" /> Save {test} Results</>}
                </Button>
            </div>
        </form>
    );
};

export default TestResultsPage;
