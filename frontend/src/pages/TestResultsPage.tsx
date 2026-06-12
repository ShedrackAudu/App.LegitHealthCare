import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Activity01Icon, 
  FloppyDiskIcon, 
  Loading03Icon, 
  FavouriteIcon, 
  FastWindIcon, 
  ArrowRight01Icon,
  Chemistry02Icon,
  Brain02Icon,
  ClipboardIcon,
  VolumeHighIcon,
  ArrowLeft01Icon,
  Search01Icon,
  UserGroupIcon,
  UserIcon,
  Clock01Icon,
  Download01Icon,
  CloudUploadIcon,
  Xls01Icon,
  InformationCircleIcon,
  CheckmarkCircle02Icon,
  CancelCircleIcon,
  AlertCircleIcon,
  Delete02Icon
} from '@hugeicons/core-free-icons';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileAttachmentSection } from '@/components/FileAttachmentSection';
import { toast } from 'react-hot-toast';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppContext } from '@/context/AppContext';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { toast as hotToast } from 'react-hot-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { ActionConfirmModal } from '@/components/ActionConfirmModal';

const toTitleCase = (str: string): string => {
    if (!str) return '';
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
};

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
            <HugeiconsIcon icon={Clock01Icon} className="h-3 w-3" />
            Temporary Access: {mins}:{secs < 10 ? `0${secs}` : secs} Remaining
        </div>
    );
};

type TestType = 'fbc' | 'kft' | 'lipid' | 'lft' | 'ecg' | 'spirometry' | 'audiometry' | 'routine' | null;

const TestResultsPage: React.FC = () => {
    const { testType: paramTestType } = useParams<{ testType: string }>();
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { activeSection, activeYear } = useAppContext();
    const { hasPermission, isAdmin } = usePermissions();
    
    // Determine current test type from param or URL path fallback
    const currentType = (paramTestType || pathname.split('/').pop()) as TestType;
    const [selectedTest, setSelectedTest] = useState<TestType>(
        ['fbc', 'kft', 'lipid', 'lft', 'ecg', 'spirometry', 'audiometry', 'routine'].includes(currentType || '') ? currentType : null
    );
    
    useEffect(() => {
        const urlType = (paramTestType || pathname.split('/').pop()) as TestType;
        if (urlType && ['fbc', 'kft', 'lipid', 'lft', 'ecg', 'spirometry', 'audiometry', 'routine'].includes(urlType)) {
            setSelectedTest(urlType);
        } else if (pathname === '/tests') {
            setSelectedTest(null);
            setPatient(null);
        }
        const saved = localStorage.getItem(`searchByPid_${pathname}`);
        setSearchByPid(saved === 'true');
        setSearchId('');
        setSearchResults([]);
    }, [paramTestType, pathname]);
    const [patient, setPatient] = useState<any>(null);
    const [searchId, setSearchId] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchByPid, setSearchByPid] = useState(() => {
        const saved = localStorage.getItem(`searchByPid_${pathname}`);
        return saved === 'true';
    });
    const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
    const [loadingQueue, setLoadingQueue] = useState(false);
    const [queueEntries, setQueueEntries] = useState<any[]>([]);
    const [selectedQueueDept, setSelectedQueueDept] = useState<string>('');
    const [isSelecting, setIsSelecting] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deletePendingEntry, setDeletePendingEntry] = useState<{ dept: string; staffId: string } | null>(null);
    const handleDeleteQueueEntry = async (dept: string, staffId: string) => {
        setDeletePendingEntry({ dept, staffId });
        setDeleteConfirmOpen(true);
    };
    const handleConfirmDelete = async () => {
        if (!deletePendingEntry) return;
        const { dept, staffId } = deletePendingEntry;
        try {
            await axios.delete(`/api/queue/${dept.toLowerCase()}/${staffId}?year=${activeYear}`, {
                headers: { 'X-Company-Context': activeSection }
            });
            toast.success("Patient removed from queue");
            fetchQueueList(dept);
            fetchQueue();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.error || "Failed to remove patient from queue");
        } finally {
            setDeleteConfirmOpen(false);
            setDeletePendingEntry(null);
        }
    };
    useEffect(() => {
        if (searchId.length > 0) {
            if (isSelecting) {
                setIsSelecting(false);
                setSearchResults([]);
                return;
            }
            const fetchResults = async () => {
                try {
                    const res = await axios.get(`/api/patients/search?q=${searchId}&year=${activeYear}&strict=true${searchByPid ? '&search_type=pid' : ''}`, {
                        headers: { 'X-Company-Context': activeSection }
                    });
                    const rawResults = res.data.results || [];
                    // Sort by relevance: exact > prefix > contains
                    const q = searchId.toLowerCase().trim();
                    const sorted = [...rawResults].sort((a: any, b: any) => {
                        const scoreFields = (p: any) => {
                            const fields = [
                                (p.staff_id || '').toLowerCase(),
                                (p.first_name || '').toLowerCase(),
                                (p.last_name || '').toLowerCase(),
                                (p.patient_id || '').toLowerCase(),
                            ];
                            for (const f of fields) { if (f === q) return 0; }
                            for (const f of fields) { if (f.startsWith(q)) return 1; }
                            return 2;
                        };
                        return scoreFields(a) - scoreFields(b);
                    });
                    setSearchResults(sorted);
                } catch (err) {
                    console.error(err);
                }
            };
            const timer = setTimeout(fetchResults, 300);
            return () => clearTimeout(timer);
        } else {
            setSearchResults([]);
        }
    }, [searchId, activeSection, isSelecting, searchByPid]);

    const [queueData, setQueueData] = useState<any>({});
    const [seenStats, setSeenStats] = useState<any>({});
    
    const fetchQueue = async () => {
        try {
            const resp = await axios.get(`/api/queue/?year=${activeYear}`, {
                headers: { 'X-Company-Context': activeSection }
            });
            setQueueData(resp.data);
        } catch (err) {}
    };

    const fetchSeenStats = async () => {
        try {
            const resp = await axios.get(`/api/queue/seen-stats?year=${activeYear}`, {
                headers: { 'X-Company-Context': activeSection }
            });
            setSeenStats(resp.data);
        } catch (err) {}
    };

    const fetchQueueList = async (dept: string) => {
        setLoadingQueue(true);
        setSelectedQueueDept(dept);
        try {
            const resp = await axios.get(`/api/queue/${dept.toLowerCase()}/?year=${activeYear}`, {
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
        fetchSeenStats();
        const interval = setInterval(() => {
            fetchQueue();
            fetchSeenStats();
        }, 30000);
        return () => clearInterval(interval);
    }, [activeYear, activeSection]);

    const [activeSearchIndex, setActiveSearchIndex] = useState(-1);

    useEffect(() => {
        setActiveSearchIndex(-1);
    }, [searchId, searchResults]);

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (searchResults.length > 0) {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setActiveSearchIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setActiveSearchIndex(prev => (prev > 0 ? prev - 1 : 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (activeSearchIndex >= 0 && activeSearchIndex < searchResults.length) {
                        selectPatient(searchResults[activeSearchIndex]);
                    } else {
                        setSearchResults([]);
                        handleSearch();
                    }
                    break;
                case 'Escape':
                    setSearchResults([]);
                    break;
            }
        } else if (e.key === 'Enter') {
            setSearchResults([]);
            handleSearch();
        }
    };

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
        setSearchResults([]);
        try {
            const response = await axios.get(`/patient/${searchId}?year=${activeYear}&strict=true&search_type=${searchByPid ? 'pid' : 'general'}`, {
                headers: { 'X-Company-Context': activeSection }
            });
            setPatient(response.data);
            setSearchId('');
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
                    <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 sm:gap-6 bg-card p-4 sm:p-6 rounded-2xl border transition-all">
                        <div className="flex flex-col items-start sm:flex-row sm:items-center gap-2 sm:gap-3">
                            <div className="p-1.5 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl">
                                <HugeiconsIcon icon={Chemistry02Icon} className="text-primary h-5 w-5 sm:h-8 sm:w-8" />
                            </div>
                            <div>
                                <h1 className="text-base sm:text-2xl font-black tracking-tight">Diagnostic Test Results</h1>
                                <p className="text-[9px] sm:text-sm text-muted-foreground font-medium">Session: {activeYear} • {activeSection}</p>
                            </div>
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground font-bold flex items-center bg-muted/30 px-4 py-2 rounded-xl border-2 self-start xl:self-auto">
                            Select a test type below to record or view patient results.
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {[
                            { id: 'routine', title: 'Essential Diagnostics', icon: Activity01Icon, color: 'text-orange-500', bg: 'bg-orange-500/8 dark:bg-orange-500/10', hoverBg: 'group-hover:bg-orange-500/15', border: 'hover:border-orange-500/30' },
                            { id: 'fbc', title: 'Full Blood Count', icon: Chemistry02Icon, color: 'text-rose-500', bg: 'bg-rose-500/8 dark:bg-rose-500/10', hoverBg: 'group-hover:bg-rose-500/15', border: 'hover:border-rose-500/30' },
                            { id: 'kft', title: 'Kidney Function Test', icon: Activity01Icon, color: 'text-blue-500', bg: 'bg-blue-500/8 dark:bg-blue-500/10', hoverBg: 'group-hover:bg-blue-500/15', border: 'hover:border-blue-500/30' },
                            { id: 'lipid', title: 'Lipid Profile', icon: Brain02Icon, color: 'text-amber-500', bg: 'bg-amber-500/8 dark:bg-amber-500/10', hoverBg: 'group-hover:bg-amber-500/15', border: 'hover:border-amber-500/30' },
                            { id: 'lft', title: 'Liver Function Test', icon: ClipboardIcon, color: 'text-primary', bg: 'bg-primary/8 dark:bg-primary/10', hoverBg: 'group-hover:bg-primary/15', border: 'hover:border-primary/30' },
                            { id: 'ecg', title: 'ECG Analysis', icon: FavouriteIcon, color: 'text-red-500', bg: 'bg-red-500/8 dark:bg-red-500/10', hoverBg: 'group-hover:bg-red-500/15', border: 'hover:border-red-500/30' },
                            { id: 'spirometry', title: 'Spirometry', icon: FastWindIcon, color: 'text-sky-500', bg: 'bg-sky-500/8 dark:bg-sky-500/10', hoverBg: 'group-hover:bg-sky-500/15', border: 'hover:border-sky-500/30' },
                            { id: 'audiometry', title: 'Audiometry', icon: VolumeHighIcon, color: 'text-purple-500', bg: 'bg-purple-500/8 dark:bg-purple-500/10', hoverBg: 'group-hover:bg-purple-500/15', border: 'hover:border-purple-500/30' },
                        ].map((test) => (
                            <Card 
                                key={test.id} 
                                className={`group cursor-pointer hover:shadow-lg transition-all duration-300 border border-border/80 ${test.border} bg-card/65 backdrop-blur-sm relative overflow-hidden`}
                                onClick={() => navigate(`/tests/${test.id}`)}
                            >
                                <CardContent className="p-3.5 sm:p-4 flex items-center gap-3 relative z-10">
                                    <div className={`p-2.5 rounded-xl ${test.bg} ${test.color} ${test.hoverBg} transition-all duration-300 group-hover:scale-105 shrink-0`}>
                                        <HugeiconsIcon icon={test.icon} className="h-5.5 w-5.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm sm:text-base font-bold tracking-tight text-foreground truncate group-hover:text-primary transition-colors">{test.title}</h3>
                                        <p className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate mt-0.5">Record diagnostics</p>
                                    </div>
                                    <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-muted/40 group-hover:bg-primary/10 transition-colors shrink-0">
                                        <HugeiconsIcon icon={ArrowRight01Icon} className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                                    </div>
                                </CardContent>
                                <div className="absolute inset-0 -z-0 bg-gradient-to-tr from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                {patient ? (
                    <Button 
                        variant="outline" 
                        onClick={() => {
                            setPatient(null);
                            setSearchId('');
                            setSearchResults([]);
                        }} 
                        className="gap-2 border-2 rounded-xl font-bold"
                    >
                        <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" /> Back to search
                    </Button>
                ) : (
                    <Button 
                        variant="outline" 
                        onClick={() => navigate('/tests')} 
                        className="gap-2 border-2 rounded-xl font-bold"
                    >
                        <HugeiconsIcon icon={ArrowLeft01Icon} className="h-4 w-4" /> Back to Test Selection
                    </Button>
                )}

                {!patient ? (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Top Search Bar Style from Consultation */}
                        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 sm:gap-6 bg-card p-4 sm:p-6 rounded-2xl border transition-all">
                            <div className="flex flex-col items-start sm:flex-row sm:items-center gap-2 sm:gap-3">
                                <div className="p-1.5 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl">
                                    <HugeiconsIcon icon={Chemistry02Icon} className="text-primary h-5 w-5 sm:h-8 sm:w-8" />
                                </div>
                                <div>
                                    <h1 className="text-base sm:text-2xl font-black tracking-tight capitalize">{selectedTest?.replace('_', ' ')} Record</h1>
                                    <p className="text-[9px] sm:text-sm text-muted-foreground font-medium">Session: {activeYear} • {activeSection}</p>
                                    <TempAccessCountdown />
                                </div>
                            </div>
                            
                            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full xl:w-auto">
                                {(selectedTest === 'ecg' || selectedTest === 'spirometry' || selectedTest === 'audiometry') && (
                                <div className="flex flex-row items-center gap-3 w-full md:w-auto">
                                    {/* Queue Status Card */}
                                    <Card 
                                        className="flex-1 md:flex-none md:w-36 relative overflow-hidden cursor-pointer bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 hover:border-primary/40 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all duration-300 h-16 flex items-center rounded-xl shrink-0 group select-none"
                                        onClick={() => fetchQueueList(selectedTest || '')}
                                    >
                                        <CardContent className="p-0 px-3.5 flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-xl text-primary group-hover:bg-primary/20 transition-all shrink-0">
                                                <HugeiconsIcon icon={UserGroupIcon} className="h-4.5 w-4.5" />
                                            </div>
                                            <div className="flex flex-col justify-center text-left min-w-0 pr-1">
                                                 <span className="text-lg font-black tracking-tighter text-foreground leading-none">
                                                     {selectedTest === 'ecg' ? queueData.ecg || 0 : 
                                                     selectedTest === 'spirometry' ? queueData.spirometry || 0 : 
                                                     queueData.audiometry || 0}
                                                 </span>
                                                 <div className="flex items-center gap-1 mt-0">
                                                     <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/80 leading-none">Waiting</span>
                                                     <span className="relative flex h-1.5 w-1.5 shrink-0">
                                                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                         <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                                     </span>
                                                 </div>
                                             </div>
                                        </CardContent>
                                        {/* Subtle glass overlay shine */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                                    </Card>

                                    {/* Seen Status Card */}
                                    <Card 
                                        className="flex-1 md:flex-none md:w-36 relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-sm h-16 flex items-center rounded-xl shrink-0 group select-none"
                                    >
                                        <CardContent className="p-0 px-3.5 flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-xl text-primary shrink-0">
                                                <HugeiconsIcon icon={UserIcon} className="h-4.5 w-4.5" />
                                            </div>
                                            <div className="flex flex-col justify-center text-left min-w-0 pr-1">
                                                 <span className="text-lg font-black tracking-tighter text-foreground leading-none">
                                                     {selectedTest === 'ecg' ? seenStats.ecg || 0 : 
                                                     selectedTest === 'spirometry' ? seenStats.spirometry || 0 : 
                                                     seenStats.audiometry || 0}
                                                 </span>
                                                 <div className="flex items-center gap-1 mt-0">
                                                     <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/85 leading-none">Seen</span>
                                                 </div>
                                             </div>
                                        </CardContent>
                                        {/* Subtle glass overlay shine */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                                    </Card>
                                </div>
                                )}

                                {/* Search Section Redesign */}
                                <div className="flex-1 w-full lg:max-w-2xl relative">
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-muted/30 p-2 rounded-xl border-2 focus-within:border-primary/50 transition-all relative">
                                        <div className="flex items-center px-3 py-1.5 bg-background/60 dark:bg-background/20 rounded-lg border border-muted-foreground/10 shrink-0 ml-1 sm:ml-0 self-start sm:self-auto">
                                            <label className="relative inline-flex items-center cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={searchByPid}
                                                    onChange={(e) => {
                                                        const val = e.target.checked;
                                                        setSearchByPid(val);
                                                        localStorage.setItem(`searchByPid_${pathname}`, String(val));
                                                        setSearchId('');
                                                        setSearchResults([]);
                                                    }}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-8 h-4 bg-muted rounded-full peer peer-focus:ring-2 peer-focus:ring-primary/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-muted-foreground/20 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                                                <span className="ml-2 text-xs font-bold text-muted-foreground whitespace-nowrap">P.ID Search</span>
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-2 flex-1 px-2 h-11">
                                            <HugeiconsIcon icon={Search01Icon} className="h-5 w-5 text-muted-foreground shrink-0" />
                                            <Input
                                                placeholder={searchByPid ? "Search Patient ID (PID)..." : "Search Staff ID or Name..."}
                                                value={searchId}
                                                onChange={(e) => setSearchId(e.target.value)}
                                                onKeyDown={handleSearchKeyDown}
                                                className="border-0 bg-transparent focus-visible:ring-0 min-w-0 flex-1 text-base sm:text-lg font-bold h-full px-0"
                                            />
                                        </div>
                                        <Button 
                                            onClick={handleSearch}
                                            disabled={searching || !searchId.trim()}
                                            className="bg-primary hover:bg-primary/90 shadow-lg px-6 sm:px-8 whitespace-nowrap font-bold h-11 rounded-xl w-full sm:w-auto"
                                        >
                                            {searching ? <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin mr-2" /> : 'Load Profile'}
                                        </Button>

                                        {/* Search Results Card */}
                                        {searchResults.length > 0 && (
                                            <Card className="absolute top-full left-0 right-0 mt-2 z-[100] shadow-2xl border-2 border-primary/20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                                                <CardHeader className="py-3 bg-primary/5 border-b">
                                                    <CardTitle className="text-xs uppercase tracking-widest text-primary/70">Matching Profiles</CardTitle>
                                                </CardHeader>
                                                <ul className="max-h-[300px] overflow-auto divide-y">
                                                    {searchResults.map((p: any, index: number) => (
                                                        <li 
                                                            key={p.staff_id}
                                                            className={`p-4 cursor-pointer transition-colors group ${activeSearchIndex === index ? 'bg-primary/10' : 'hover:bg-primary/5'}`}
                                                            onClick={() => selectPatient(p)}
                                                            onMouseEnter={() => setActiveSearchIndex(index)}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center overflow-hidden font-black group-hover:scale-110 transition-transform ${activeSearchIndex === index ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                                                                        {p.passport_image ? (
                                                                            <img 
                                                                                src={p.passport_image.startsWith('http') || p.passport_image.startsWith('blob') || p.passport_image.startsWith('data') ? p.passport_image : `${(window as any).API_BASE_URL}${p.passport_image}`} 
                                                                                alt="Avatar" 
                                                                                className="w-full h-full object-cover" 
                                                                            />
                                                                        ) : (
                                                                            <>{p.first_name[0]}{p.last_name[0]}</>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <p className={`font-bold capitalize ${activeSearchIndex === index ? 'text-primary' : 'text-foreground'}`}>{p.first_name} {p.last_name}</p>
                                                                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                                                                            <span className="bg-muted px-1.5 py-0.5 rounded uppercase">{p.staff_id}</span>
                                                                            {p.patient_id && (
                                                                                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-semibold">PID: {p.patient_id}</span>
                                                                            )}
                                                                            • <span>{p.department}</span>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <Button size="sm" variant="ghost" className={`${activeSearchIndex === index ? 'opacity-100 bg-primary/20 text-primary' : 'opacity-0 group-hover:opacity-100'} h-8 px-2`}>
                                                                    Select <HugeiconsIcon icon={ArrowRight01Icon} className="ml-1 h-3 w-3" />
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
                                    <HugeiconsIcon icon={Activity01Icon} className="w-8 h-8 text-muted-foreground/50" />
                                </div>
                                <p className="text-muted-foreground font-bold text-lg italic tracking-tight">Enter a Patient ID to begin recording {selectedTest?.toUpperCase()} results.</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black">Context: {activeSection} Clinic • {activeYear}</p>
                            </div>
                        </Card>

                        <BulkAIRemarksSection 
                            testType={selectedTest} 
                            activeYear={activeYear} 
                            activeSection={activeSection} 
                        />
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
                            fetchQueue();
                            fetchSeenStats();
                        }}
                    />
                )}

                {/* Bulk Upload Feature shifted to bottom */}
                <div className="mt-12 mb-8">
                    <BulkUploadSection 
                        testType={selectedTest} 
                        activeYear={activeYear} 
                        activeSection={activeSection} 
                    />
                </div>
            </div>

            <Dialog open={isQueueModalOpen} onOpenChange={setIsQueueModalOpen}>
                <DialogContent className="max-w-2xl sm:max-w-[500px] border-primary/20 p-4 sm:p-6">
                    <DialogHeader className="text-left">
                        <div className="flex items-center gap-3 mb-2 text-left">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                <HugeiconsIcon icon={UserGroupIcon} className="w-6 h-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg sm:text-xl font-black tracking-tight uppercase">{selectedQueueDept} Queue</DialogTitle>
                                <DialogDescription className="text-[11px] sm:text-xs font-medium"> Patients waiting for diagnostic testing</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    
                    <div className="relative mt-2">
                        <ScrollArea className="h-[400px] px-1">
                            {loadingQueue ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl border bg-card/50 animate-pulse gap-3">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <Skeleton className="w-10 h-10 rounded-xl bg-muted/40 animate-pulse shrink-0" />
                                                <div className="space-y-2 flex-1">
                                                    <Skeleton className="h-4 w-32 bg-muted/40 animate-pulse" />
                                                    <Skeleton className="h-3.5 w-24 bg-muted/40 animate-pulse" />
                                                </div>
                                            </div>
                                            <Skeleton className="h-8 w-20 bg-muted/40 rounded-lg animate-pulse" />
                                        </div>
                                    ))}
                                </div>
                            ) : queueEntries.length > 0 ? (
                                <div className="space-y-3">
                                    {queueEntries.map((entry) => (
                                        <div key={entry.staff_id} className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl border bg-card hover:bg-muted/10 transition-all duration-300 gap-3 group">
                                            {/* Left Block (Avatar + Info) */}
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="relative shrink-0">
                                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-black text-primary border border-primary/20">
                                                        {entry.first_name?.[0]}{entry.last_name?.[0]}
                                                    </div>
                                                    <Badge className="absolute -top-2 -left-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-black text-[9px] px-1.5 py-0.5 border border-background h-5 min-w-[20px] flex items-center justify-center shadow-md">
                                                        #{entry.queue_number || '--'}
                                                    </Badge>
                                                </div>

                                                <div className="min-w-0 flex-1 flex flex-col justify-center gap-0">
                                                    <p className="font-bold text-sm text-foreground tracking-tight truncate whitespace-nowrap leading-tight">{entry.first_name} {entry.last_name}</p>
                                                    
                                                    <div className="flex items-center justify-between gap-3 mt-0.5 w-full">
                                                        {/* ID & Time: stacked on mobile, row on desktop */}
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 text-muted-foreground text-[10px] leading-none shrink-0">
                                                            <span className="font-bold uppercase tracking-wider">ID: {entry.staff_id}</span>
                                                            <span className="hidden sm:inline text-muted-foreground/60">•</span>
                                                            <span className="font-medium flex items-center gap-1">
                                                                <HugeiconsIcon icon={Clock01Icon} className="w-3 h-3 text-muted-foreground/60" />
                                                                {getRelativeTime(entry.created_at)}
                                                            </span>
                                                        </div>

                                                        {/* Mobile-only action buttons beside stacked ID/time */}
                                                        <div className="flex sm:hidden items-center gap-1.5 shrink-0">
                                                            <Button 
                                                                size="sm" 
                                                                variant="ghost" 
                                                                className="h-7 px-2.5 text-[9px] font-black uppercase tracking-widest bg-primary text-white hover:bg-primary/95 rounded-lg group/btn shadow-md shadow-primary/10"
                                                                onClick={() => {
                                                                    selectPatient(entry);
                                                                    setIsQueueModalOpen(false);
                                                                }}
                                                            >
                                                                Proceed <HugeiconsIcon icon={ArrowRight01Icon} className="w-2.5 h-2.5 ml-0.5 group-hover/btn:translate-x-0.5 transition-transform" />
                                                            </Button>
                                                            {hasPermission('delete_from_queue') && (
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="ghost" 
                                                                    className="h-7 w-7 p-0 text-rose-500 hover:text-white hover:bg-rose-500 border border-rose-500/20 hover:border-transparent rounded-lg flex items-center justify-center transition-colors shrink-0"
                                                                    onClick={() => handleDeleteQueueEntry(selectedQueueDept, entry.staff_id)}
                                                                    title="Remove from queue"
                                                                >
                                                                    <HugeiconsIcon icon={Delete02Icon} className="w-3 h-3" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Desktop-only action buttons centered vertically inside the card */}
                                            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    className="h-8 px-3 text-[10px] font-black uppercase tracking-widest bg-primary text-white hover:bg-primary/95 rounded-lg group/btn shadow-md shadow-primary/10"
                                                    onClick={() => {
                                                        selectPatient(entry);
                                                        setIsQueueModalOpen(false);
                                                    }}
                                                >
                                                    Proceed <HugeiconsIcon icon={ArrowRight01Icon} className="w-3 h-3 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                                                </Button>
                                                {hasPermission('delete_from_queue') && (
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        className="h-8 w-8 p-0 text-rose-500 hover:text-white hover:bg-rose-500 border border-rose-500/20 hover:border-transparent rounded-lg flex items-center justify-center transition-colors shrink-0"
                                                        onClick={() => handleDeleteQueueEntry(selectedQueueDept, entry.staff_id)}
                                                        title="Remove from queue"
                                                    >
                                                        <HugeiconsIcon icon={Delete02Icon} className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
                                    <HugeiconsIcon icon={UserGroupIcon} className="h-12 w-12 mb-4 text-muted-foreground" />
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

            <ActionConfirmModal 
                isOpen={deleteConfirmOpen}
                onClose={() => {
                    setDeleteConfirmOpen(false);
                    setDeletePendingEntry(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Remove from Queue"
                description="Are you sure you want to remove this patient from the queue? This will only remove them from this department's queue."
                confirmText="Remove"
                cancelText="Cancel"
                variant="danger"
            />
        </MainLayout>
    );
};

const BulkUploadSection = ({ testType, activeYear, activeSection }: any) => {
    const { user } = useAppContext();
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<any>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Only show for specific test types and if user has permission
    const supportedTests = ['fbc', 'kft', 'lft', 'lipid'];
    if (!testType || !supportedTests.includes(testType)) return null;
    
    const permissionName = `upload_bulk_${testType}`;
    const hasPermission = user?.permissions?.includes(permissionName) || user?.username === 'admin';
    if (!hasPermission) return null;

    const testMetadata: Record<string, { title: string, columns: string[] }> = {
        fbc: {
            title: "Full Blood Count",
            columns: ["PatientID", "PCV", "WBC", "PLT", "LYMPH_PERCENT", "LYMPH_ABS", "GRA_PERCENT", "GRA_ABS", "MID_PERCENT", "MID_ABS", "RBC", "MCV", "MCH", "MCHC", "RDW", "PDW", "HGB", "REMARK"]
        },
        kft: {
            title: "Kidney Function Test",
            columns: ["PatientID", "Potassium", "Sodium", "Chloride", "Bicarbonate", "REMARK"]
        },
        lft: {
            title: "Liver Function Test",
            columns: ["PatientID", "AST", "ALT", "ALP", "TB", "CB", "Urea", "Creatinine", "REMARK"]
        },
        lipid: {
            title: "Lipid Profile",
            columns: ["PatientID", "TotalCholesterol", "Triglycerides", "REMARK"]
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const response = await axios.get(`/api/tests/download-template/${testType}`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${testType.toUpperCase()}_Bulk_Upload_Template.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            toast.error("Failed to download template");
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('year', activeYear);

        setUploading(true);
        setUploadResult(null);
        try {
            const resp = await axios.post(`/api/tests/bulk-upload/${testType}`, formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    'X-Company-Context': activeSection
                }
            });
            setUploadResult(resp.data);
            toast.success("Bulk upload processed!");
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Bulk upload failed");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <Card className="border-2 border-primary/20 shadow-lg bg-primary/5 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
            <CardHeader className="bg-primary/10 border-b py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-xl shrink-0">
                            <HugeiconsIcon icon={CloudUploadIcon} className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-black tracking-tight uppercase leading-none">Bulk Result Upload</CardTitle>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Excel Batch Processor</p>
                        </div>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDownloadTemplate}
                        className="w-full sm:w-auto gap-2 font-black text-[10px] uppercase border-primary/30 hover:bg-primary/10 transition-colors h-9"
                    >
                        <HugeiconsIcon icon={Download01Icon} className="h-3.5 w-3.5" /> Download Template
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/50 border-2 border-dashed border-primary/20">
                            <div className="p-2 bg-amber-500/10 rounded-xl">
                                <HugeiconsIcon icon={InformationCircleIcon} className="h-5 w-5 text-amber-600" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-black text-sm uppercase tracking-tight">Instructions</h4>
                                <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4 font-medium">
                                    <li>Use the **official .xlsx template** for the best results.</li>
                                    <li>**PatientID** must exactly match the IDs in the screening matrix.</li>
                                    <li>Do not change the column order or naming as defined in the template.</li>
                                    <li>System will **auto-recalculate** dependent parameters (e.g. LDL, HCO3).</li>
                                    <li>Only existing patient records for **{activeYear}** will be updated.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="relative group">
                            <input 
                                type="file" 
                                accept=".xlsx" 
                                onChange={handleFileUpload}
                                ref={fileInputRef}
                                className="hidden"
                                id="bulk-file-upload"
                                disabled={uploading}
                            />
                            <label 
                                htmlFor="bulk-file-upload"
                                className={`flex flex-col items-center justify-center h-32 rounded-2xl border-2 border-dashed transition-all cursor-pointer bg-card group-hover:border-primary/50 group-hover:bg-primary/5 ${uploading ? 'opacity-50 cursor-wait' : 'border-muted-foreground/20'}`}
                            >
                                {uploading ? (
                                    <>
                                        <HugeiconsIcon icon={Loading03Icon} className="h-8 w-8 animate-spin text-primary mb-2" />
                                        <p className="text-sm font-bold animate-pulse">Processing Batch Data...</p>
                                    </>
                                ) : (
                                    <>
                                        <HugeiconsIcon icon={Xls01Icon} className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors mb-2" />
                                        <p className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors">Click to Select Excel File</p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-black mt-1">Only .xlsx supported</p>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="h-full rounded-2xl bg-muted/30 p-4 border border-muted-foreground/10">
                            <h4 className="font-black text-xs uppercase tracking-widest text-muted-foreground mb-4">Upload Summary</h4>
                            
                            {uploadResult ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                                            <div className="flex items-center gap-2 text-primary mb-1">
                                                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4" />
                                                <span className="text-[10px] font-black uppercase">Success</span>
                                            </div>
                                            <p className="text-2xl font-black text-primary">{uploadResult.success_count}</p>
                                        </div>
                                        <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                                            <div className="flex items-center gap-2 text-rose-600 mb-1">
                                                <HugeiconsIcon icon={CancelCircleIcon} className="h-4 w-4" />
                                                <span className="text-[10px] font-black uppercase">Skipped</span>
                                            </div>
                                            <p className="text-2xl font-black text-rose-700">{uploadResult.skip_count}</p>
                                        </div>
                                    </div>

                                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-amber-600">
                                                <HugeiconsIcon icon={AlertCircleIcon} className="h-3 w-3" />
                                                <span className="text-[9px] font-black uppercase italic">Processing Notes</span>
                                            </div>
                                            <ScrollArea className="h-[120px] rounded-lg bg-muted/50 p-2 border">
                                                <ul className="space-y-1.5">
                                                    {uploadResult.errors.map((err: string, i: number) => (
                                                        <li key={i} className="text-[10px] text-muted-foreground font-medium flex gap-2">
                                                            <span className="text-primary font-bold">•</span> {err}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </ScrollArea>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                                    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                                        <HugeiconsIcon icon={Search01Icon} className="h-6 w-6 text-muted-foreground/30" />
                                    </div>
                                    <p className="text-xs font-bold text-muted-foreground/50 italic">No upload data available. Upload a file to view a detailed summary of the processed results.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
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
                const resp = await axios.get(`/api/tests/get-test/${type}/${patient.staff_id}?year=${activeYear}`, {
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
            
            let payload = { ...data };
            if (testType === 'audiometry') {
                if (payload.audiometry_result) {
                    payload.audiometry_result = toTitleCase(payload.audiometry_result);
                }
                if (payload.audiometry_remark) {
                    payload.audiometry_remark = toTitleCase(payload.audiometry_remark);
                }
            }

            await axios.post(`/api/tests/save-test/${type}`, {
                ...payload,
                staff_id: patient.staff_id,
                screening_year: activeYear,
                current_test_type: testType
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
            <div className="space-y-6 animate-in fade-in duration-500">
                <Card className="border-2 border-primary/10 shadow-lg bg-muted/5">
                    <CardContent className="p-4 md:p-6 flex flex-col sm:flex-row items-center gap-6">
                        <Skeleton className="w-16 h-16 rounded-xl bg-muted/40 animate-pulse shrink-0" />
                        <div className="flex-1 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-x-3 gap-y-4 md:gap-x-4 lg:gap-4 w-full">
                            <div className="lg:col-span-2 space-y-2">
                                <Skeleton className="h-3 w-16 bg-muted/30 rounded" />
                                <Skeleton className="h-5 w-full bg-muted/40 rounded animate-pulse" />
                            </div>
                            {Array.from({ length: 6 }).map((_, idx) => (
                                <div key={idx} className="space-y-2">
                                    <Skeleton className="h-3 w-12 bg-muted/30 rounded" />
                                    <Skeleton className="h-5 w-16 bg-muted/40 rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-2 shadow-2xl relative overflow-hidden">
                    <CardHeader className="border-b bg-muted/5 py-4">
                        <Skeleton className="h-6 w-48 bg-muted/40 rounded animate-pulse" />
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {Array.from({ length: 6 }).map((_, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <Skeleton className="h-4 w-28 bg-muted/30 rounded" />
                                        <Skeleton className="h-12 w-full bg-muted/40 rounded-xl animate-pulse" />
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end pt-4 border-t">
                                <Skeleton className="h-11 w-32 bg-muted/40 rounded-xl animate-pulse" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="border-2 border-primary/20 shadow-lg bg-primary/[0.02] overflow-hidden">
                <CardContent className="p-4 md:p-6 flex flex-col sm:flex-row items-center gap-6">
                    {/* Passport Avatar */}
                    <div className="w-16 h-16 rounded-xl border border-primary/20 overflow-hidden bg-card shrink-0 shadow-sm flex items-center justify-center">
                        {patient.passport_image ? (
                            <img 
                                src={patient.passport_image.startsWith('http') || patient.passport_image.startsWith('blob') || patient.passport_image.startsWith('data') ? patient.passport_image : `${(window as any).API_BASE_URL}${patient.passport_image}`} 
                                alt="Passport" 
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <HugeiconsIcon icon={UserIcon} className="h-8 w-8 text-primary/40" />
                        )}
                    </div>

                    <div className="flex-1 grid grid-cols-2 lg:grid-cols-7 gap-4 w-full">
                        <div className="lg:col-span-2">
                            <BioItem label="NAME" value={`${patient.first_name} ${patient.last_name}`} />
                        </div>
                        <BioItem label="STAFF ID" value={patient.staff_id} />
                        <BioItem label="PATIENT ID" value={patient.patient_id || 'N/A'} />
                        <BioItem label="AGE" value={`${patient.age} Yrs`} />
                        <BioItem label="GENDER" value={patient.gender || 'N/A'} />
                        <BioItem label="DEPARTMENT" value={patient.department} />
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
                    {testType === 'ecg' && <SimpleTestForm onSubmit={onSubmit} loading={loading} test="ECG" initialData={initialData} staffId={patient?.staff_id} year={activeYear} />}
                    {testType === 'spirometry' && <SpirometryForm onSubmit={onSubmit} loading={loading} initialData={initialData} staffId={patient?.staff_id} year={activeYear} />}
                    {testType === 'audiometry' && <SimpleTestForm onSubmit={onSubmit} loading={loading} test="Audiometry" initialData={initialData} staffId={patient?.staff_id} year={activeYear} />}
                    {testType === 'routine' && <RoutineForm onSubmit={onSubmit} loading={loading} initialData={initialData} />}
                </CardContent>
            </Card>
        </div>
    );
};

const BioItem = ({ label, value, className }: any) => (
    <div className="space-y-0.5 sm:space-y-1">
        <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 leading-none">{label}</p>
        <p className={`font-black text-base sm:text-lg text-primary tracking-tight truncate leading-tight ${className || ''}`}>{value}</p>
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
        'wbc', 'lymp_abs', 'mid_abs', 'gra_abs', 'lymp_percent', 'mid_percent', 'gra_percent',
        'rbc', 'hgb', 'pcv', 'mcv', 'mch', 'mchc', 'rdw', 'plt', 'pdw'
    ];
    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {fields.map(f => (
                    <div key={f} className="space-y-2">
                        <Label className="whitespace-nowrap truncate block">{f.toUpperCase().replace('_ABS', '').replace('_PERCENT', ' %').replace('_', ' ')} <span className="text-rose-500">*</span></Label>
                        <Input {...register(f, { required: true })} type="number" step="any" placeholder="0.00" required />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                    <Label>FBC Remark</Label>
                    <Input {...register('fbc_remark')} placeholder="Remarks..." />
                </div>
            </div>
            <div className="flex justify-center sm:justify-end pt-6">
                <Button type="submit" className="w-full sm:w-auto h-11 px-6 sm:px-12 font-bold shadow-lg" loading={loading}>
                    {!loading && <><HugeiconsIcon icon={FloppyDiskIcon} className="mr-2 h-5 w-5 shrink-0" /> Save FBC Results</>}
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
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2"><Label className="whitespace-nowrap truncate block">POTASSIUM - K <span className="text-rose-500">*</span></Label><Input {...register('potassium', { required: true })} type="number" step="any" placeholder="0.00" required /></div>
                <div className="space-y-2"><Label className="whitespace-nowrap truncate block">SODIUM - NA <span className="text-rose-500">*</span></Label><Input {...register('sodium', { required: true })} type="number" step="any" placeholder="0.00" required /></div>
                <div className="space-y-2"><Label className="whitespace-nowrap truncate block">CHLORIDE - CL <span className="text-rose-500">*</span></Label><Input {...register('chloride', { required: true })} type="number" step="any" placeholder="0.00" required /></div>
                <div className="space-y-2"><Label className="whitespace-nowrap truncate block">HCO3 (Auto) <span className="text-rose-500">*</span></Label><Input {...register('hco3', { required: true })} type="number" step="any" className="font-bold text-primary" required /></div>
                <div className="space-y-2"><Label className="whitespace-nowrap truncate block">CALCIUM - CA</Label><Input {...register('bicarbonate_ca')} type="number" step="any" placeholder="0.00" /></div>
            </div>
            <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2"><Label>KFT Remark</Label><Input {...register('kft_remark')} /></div>
            </div>
            <div className="flex justify-center sm:justify-end pt-6">
                <Button type="submit" className="w-full sm:w-auto h-11 px-6 sm:px-12 font-bold shadow-lg" loading={loading}>
                    {!loading && <><HugeiconsIcon icon={FloppyDiskIcon} className="mr-2 h-5 w-5 shrink-0" /> Save KFT Results</>}
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
        const ldl = tv - ((tgv / 5) + hdl);
        setValue('hdl', hdl.toFixed(2));
        setValue('ldl', ldl.toFixed(2));
    }, [tcho, tg, setValue]);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2"><Label className="whitespace-nowrap truncate block">TOTAL CHOLESTEROL - TCHO <span className="text-rose-500">*</span></Label><Input {...register('total_cholesterol', { required: true })} type="number" step="any" placeholder="0.00" required /></div>
                <div className="space-y-2"><Label className="whitespace-nowrap truncate block">TRIGLYCERIDES - TG <span className="text-rose-500">*</span></Label><Input {...register('triglycerides', { required: true })} type="number" step="any" placeholder="0.00" required /></div>
                <div className="space-y-2"><Label className="whitespace-nowrap truncate block">HDL (Auto)</Label><Input {...register('hdl')} type="number" step="any" className="font-bold" /></div>
                <div className="space-y-2"><Label className="whitespace-nowrap truncate block">LDL (Auto)</Label><Input {...register('ldl')} type="number" step="any" className="font-bold" /></div>
            </div>
            <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2"><Label>LP Remark</Label><Input {...register('lp_remark')} /></div>
            </div>
            <div className="flex justify-center sm:justify-end pt-6">
                <Button type="submit" className="w-full sm:w-auto h-11 px-6 sm:px-12 font-bold shadow-lg" loading={loading}>
                    {!loading && <><HugeiconsIcon icon={FloppyDiskIcon} className="mr-2 h-5 w-5 shrink-0" /> Save Lipid Results</>}
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
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2"><Label>AST</Label><Input {...register('ast')} type="number" step="any" placeholder="0.00" /></div>
                <div className="space-y-2"><Label>ALT <span className="text-rose-500">*</span></Label><Input {...register('alt', { required: true })} type="number" step="any" placeholder="0.00" required /></div>
                <div className="space-y-2"><Label>ALP</Label><Input {...register('alp')} type="number" step="any" placeholder="0.00" /></div>
                <div className="space-y-2"><Label>TB</Label><Input {...register('tb')} type="number" step="any" placeholder="0.00" /></div>
                <div className="space-y-2"><Label>CB</Label><Input {...register('cb')} type="number" step="any" placeholder="0.00" /></div>
                <div className="space-y-2"><Label className="whitespace-nowrap truncate block">UREA</Label><Input {...register('urea')} type="number" step="any" placeholder="0.00" /></div>
                <div className="space-y-2"><Label className="whitespace-nowrap truncate block">CREATININE - CRE</Label><Input {...register('creatinine')} type="number" step="any" placeholder="0.00" /></div>
            </div>
            <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2"><Label>LFT Remark</Label><Input {...register('lft_remark')} /></div>
            </div>
            <div className="flex justify-center sm:justify-end pt-6">
                <Button type="submit" className="w-full sm:w-auto h-11 px-6 sm:px-12 font-bold shadow-lg" loading={loading}>
                    {!loading && <><HugeiconsIcon icon={FloppyDiskIcon} className="mr-2 h-5 w-5 shrink-0" /> Save LFT Results</>}
                </Button>
            </div>
        </form>
    );
};

const SpirometryForm = ({ onSubmit, loading, initialData, staffId, year }: any) => {
    const { register, handleSubmit, reset } = useForm({
        defaultValues: initialData
    });

    useEffect(() => {
        if (initialData) reset(initialData);
    }, [initialData, reset]);
    return (
        <div className="space-y-12">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Result <span className="text-rose-500">*</span></Label><Input {...register('spirometry_result', { required: true })} required /></div>
                    <div className="space-y-2"><Label>Remark <span className="text-rose-500">*</span></Label><Input {...register('spirometry_remark', { required: true })} required /></div>
                    <div className="space-y-2"><Label>Weight (kg) <span className="text-rose-500">*</span></Label><Input {...register('weight', { required: true })} type="number" step="any" placeholder="0.00" required /></div>
                    <div className="space-y-2"><Label>Height (cm) <span className="text-rose-500">*</span></Label><Input {...register('height', { required: true })} type="number" step="any" placeholder="0.00" required /></div>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-6">
                    <div className="w-full sm:w-[320px] shrink-0">
                        <FileAttachmentSection staffId={staffId} year={year} department="Spirometry" compact={true} allowDownload={false} />
                    </div>
                    <Button type="submit" className="w-full sm:w-auto h-11 px-6 sm:px-12 font-bold shadow-lg" loading={loading}>
                        {!loading && <><HugeiconsIcon icon={FloppyDiskIcon} className="mr-2 h-5 w-5 shrink-0" /> Save Spirometry Results</>}
                    </Button>
                </div>
            </form>
        </div>
    );
};

const SimpleTestForm = ({ onSubmit, loading, test, initialData, staffId, year }: any) => {
    const { register, handleSubmit, reset, setValue } = useForm({
        defaultValues: initialData
    });

    useEffect(() => {
        if (initialData) reset(initialData);
    }, [initialData, reset]);

    const resultKey = `${test.toLowerCase()}_result`;
    const remarkKey = `${test.toLowerCase()}_remark`;
    return (
        <div className="space-y-12">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Result <span className="text-rose-500">*</span></Label>
                        <Input 
                            {...register(resultKey, { 
                                required: true,
                                onBlur: (e) => {
                                    if (test === 'Audiometry') {
                                        setValue(resultKey, toTitleCase(e.target.value));
                                    }
                                }
                            })} 
                            required 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Remark <span className="text-rose-500">*</span></Label>
                        <Input 
                            {...register(remarkKey, { 
                                required: true,
                                onBlur: (e) => {
                                    if (test === 'Audiometry') {
                                        setValue(remarkKey, toTitleCase(e.target.value));
                                    }
                                }
                            })} 
                            required 
                        />
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-6">
                    <div className="w-full sm:w-[320px] shrink-0">
                        {(test === 'Spirometry' || test === 'Audiometry' || test === 'ECG') && (
                            <FileAttachmentSection staffId={staffId} year={year} department={test} compact={true} allowDownload={false} />
                        )}
                    </div>
                    <Button type="submit" className="w-full sm:w-auto h-11 px-6 sm:px-12 font-bold shadow-lg" loading={loading}>
                        {!loading && <><HugeiconsIcon icon={FloppyDiskIcon} className="mr-2 h-5 w-5 shrink-0" /> Save {test} Results</>}
                    </Button>
                </div>
            </form>
        </div>
    );
};

const RoutineForm = ({ onSubmit, loading, initialData }: any) => {
    const { register, handleSubmit, watch, setValue, reset } = useForm({
        defaultValues: initialData || {
            psa: '',
            psa_remark: '',
            fbs: '',
            rbs: '',
            sugar_remark: '',
            ua_result: '',
            ua_remark: '',
            ua_remark_others: ''
        }
    });

    useEffect(() => {
        if (initialData) {
            const safeData: any = { ...initialData };
            Object.keys(safeData).forEach(key => {
                if (safeData[key] === null) safeData[key] = '';
            });
            reset(safeData);
        }
    }, [initialData, reset]);

    const fbs = watch('fbs');
    const rbs = watch('rbs');

    // Mutual exclusivity logic for FBS and RBS
    useEffect(() => {
        if (fbs && !isNaN(parseFloat(fbs)) && fbs !== 'Not Applicable' && rbs !== 'Not Applicable') {
            setValue('rbs', 'Not Applicable');
        }
    }, [fbs, setValue, rbs]);

    useEffect(() => {
        if (rbs && !isNaN(parseFloat(rbs)) && rbs !== 'Not Applicable' && fbs !== 'Not Applicable') {
            setValue('fbs', 'Not Applicable');
        }
    }, [rbs, setValue, fbs]);

    const psa = watch('psa');
    const psa_remark = watch('psa_remark');
    // Bidirectional auto-set to Not Applicable for PSA Result/Remark
    useEffect(() => {
        if (psa === 'Not Applicable' && psa_remark !== 'Not Applicable') {
            setValue('psa_remark', 'Not Applicable');
        }
    }, [psa, setValue]);

    useEffect(() => {
        if (psa_remark === 'Not Applicable' && psa !== 'Not Applicable') {
            setValue('psa', 'Not Applicable');
        }
    }, [psa_remark, setValue]);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary border-b pb-2 flex items-center gap-2">
                    <HugeiconsIcon icon={Activity01Icon} className="h-4 w-4" /> Prostate-Specific Antigen (PSA)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>PSA Result <span className="text-rose-500">*</span></Label>
                        <Select onValueChange={(v) => setValue('psa', v)} value={watch('psa')} required>
                            <SelectTrigger className="h-12 border-2 rounded-xl">
                                <SelectValue placeholder="Select PSA result..." />
                            </SelectTrigger>
                            <SelectContent>
                                {['Negative', 'Not Applicable', 'Positive'].map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>PSA Remark <span className="text-rose-500">*</span></Label>
                        <Select onValueChange={(v) => setValue('psa_remark', v)} value={watch('psa_remark')}>
                            <SelectTrigger className="h-12 border-2 rounded-xl">
                                <SelectValue placeholder="Select PSA remark..." />
                            </SelectTrigger>
                            <SelectContent>
                                {['Normal', 'Abnormal', 'Not Applicable'].map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary border-b pb-2 flex items-center gap-2">
                    <HugeiconsIcon icon={Activity01Icon} className="h-4 w-4" /> Glucose (FBS/RBS)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label>FBS (mg/dL) <span className="text-rose-500">*</span></Label>
                        <Input {...register('fbs', { required: true })} placeholder="Enter value..." className="h-12 border-2 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <Label>RBS (mg/dL) <span className="text-rose-500">*</span></Label>
                        <Input {...register('rbs', { required: true })} placeholder="Enter value..." className="h-12 border-2 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <Label>FBS/RBS Remark <span className="text-rose-500">*</span></Label>
                        <Select onValueChange={(v) => setValue('sugar_remark', v)} value={watch('sugar_remark')}>
                            <SelectTrigger className="h-12 border-2 rounded-xl">
                                <SelectValue placeholder="Select remark..." />
                            </SelectTrigger>
                            <SelectContent>
                                {['Normal', 'Abnormal', 'Maybe Abnormal'].map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

            </div>

            <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary border-b pb-2 flex items-center gap-2">
                    <HugeiconsIcon icon={Activity01Icon} className="h-4 w-4" /> Urine Analysis (U/A)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label>U/A Result <span className="text-rose-500">*</span></Label>
                        <Select onValueChange={(v) => setValue('ua_result', v)} value={watch('ua_result')}>
                            <SelectTrigger className="h-12 border-2 rounded-xl">
                                <SelectValue placeholder="Select U/A result..." />
                            </SelectTrigger>
                            <SelectContent>
                                {['No Abnormality', 'Glycosuria', 'Glycosuria+', 'Glycosuria >+', 'Proteinuria', 'Proteinuria+', 'Proteinuria >+', 'Proteinuria/Glycosuria'].map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>U/A Remark <span className="text-rose-500">*</span></Label>
                        <Select onValueChange={(v) => setValue('ua_remark', v)} value={watch('ua_remark')}>
                            <SelectTrigger className="h-12 border-2 rounded-xl">
                                <SelectValue placeholder="Select U/A remark..." />
                            </SelectTrigger>
                            <SelectContent>
                                {['Normal', 'Abnormal', 'Maybe Abnormal'].map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>U/A Remark Others</Label>
                        <Input {...register('ua_remark_others')} placeholder="Specify if others..." className="h-12 border-2 rounded-xl" />
                    </div>
                </div>
            </div>

            <div className="flex justify-center sm:justify-end pt-8">
                <Button type="submit" className="w-full sm:w-auto h-12 px-12 font-black text-base shadow-xl shadow-primary/20" loading={loading}>
                    {!loading && <><HugeiconsIcon icon={FloppyDiskIcon} className="mr-2 h-5 w-5 shrink-0" /> Save Essential Results</>}
                </Button>
            </div>
        </form>
    );
};

const BulkAIRemarksSection = ({ testType, activeYear, activeSection }: any) => {
    const [range, setRange] = useState('');
    const [override, setOverride] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!range.trim()) {
            toast.error("Please enter a Patient ID range (e.g. 1-50)");
            return;
        }
        setLoading(true);
        setResult(null);
        try {
            const resp = await axios.post(`/api/tests/bulk-ai-remarks/${testType}`, 
                { range: range.trim(), screening_year: activeYear, override },
                { headers: { 'X-Company-Context': activeSection } }
            );
            setResult(resp.data);
            toast.success("Bulk AI remarks generation completed!");
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.error || "Failed to generate bulk AI remarks");
        } finally {
            setLoading(false);
        }
    };

    if (!['fbc', 'kft', 'lipid', 'lft'].includes(testType || '')) return null;

    return (
        <Card className="border shadow-lg rounded-2xl overflow-hidden bg-card/50 backdrop-blur-md mt-6">
            <CardHeader className="p-6 pb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500 self-start">
                        <HugeiconsIcon icon={Brain02Icon} className="h-6 w-6" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-black tracking-tight text-left">Bulk AI Remarks Generator</CardTitle>
                        <p className="text-xs text-muted-foreground text-left">Generate AI remarks for a serial range of patient IDs concurrently.</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="bulk-range" className="text-xs font-bold uppercase tracking-wider text-slate-500">Patient ID Range</Label>
                            <Input 
                                id="bulk-range"
                                placeholder="e.g. 1-50 or LHCSL2026DCP001-LHCSL2026DCP050"
                                value={range}
                                onChange={(e) => setRange(e.target.value)}
                                disabled={loading}
                                className="h-11 rounded-xl font-semibold border-2"
                            />
                        </div>
                        <Button 
                            type="submit" 
                            disabled={loading || !range.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg px-8 whitespace-nowrap font-bold h-11 rounded-xl w-full sm:w-auto"
                        >
                            {loading ? (
                                <>
                                    <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin mr-2" />
                                    Processing AI...
                                </>
                            ) : 'Generate Remarks'}
                        </Button>
                    </div>
                    <div className="flex items-center space-x-2 pt-1">
                        <Checkbox 
                            id="override-remarks" 
                            checked={override} 
                            onCheckedChange={(checked: boolean) => setOverride(checked)}
                            disabled={loading}
                        />
                        <Label htmlFor="override-remarks" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                            Override existing remarks
                        </Label>
                    </div>
                </form>

                {result && (
                    <div className="p-4 bg-muted/30 border rounded-xl space-y-2 text-sm animate-in fade-in duration-300">
                        <div className="flex flex-wrap items-center gap-4 text-xs font-black uppercase tracking-wider">
                            <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">Succeeded: {result.processed_count}</span>
                            <span className="text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">Failed: {result.error_count}</span>
                        </div>
                        {result.errors && result.errors.length > 0 && (
                            <div className="space-y-1.5 pt-2">
                                <p className="font-bold text-xs text-rose-500 uppercase tracking-widest">Failed IDs details:</p>
                                <div className="max-h-28 overflow-y-auto divide-y border rounded-lg bg-background text-xs font-medium">
                                    {result.errors.map((err: any, idx: number) => (
                                        <div key={idx} className="p-2 flex justify-between gap-4">
                                            <span className="font-bold uppercase text-slate-600 shrink-0">{err.patient_id}</span>
                                            <span className="text-slate-500 italic text-right truncate">{err.error}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default TestResultsPage;
