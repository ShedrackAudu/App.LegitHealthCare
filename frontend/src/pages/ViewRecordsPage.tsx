import React, { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Database02Icon,
  Search01Icon,
  Delete02Icon, 
  Loading03Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  FilterIcon
} from '@hugeicons/core-free-icons';
import { PatientSearch } from '@/components/PatientSearch';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { 
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow 
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useAppContext } from '@/context/AppContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ActionConfirmModal } from '@/components/ActionConfirmModal';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle 
} from '@/components/ui/dialog';

const ViewRecordsPage: React.FC = () => {
    const { user, activeSection, activeYear } = useAppContext();
    const [recordsData, setRecordsData] = useState<any>({
        records: [],
        total: 0,
        pages: 0,
        current_page: 1
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [deleteModal, setDeleteModal] = useState({ open: false, id: 0 });
    const [deleting, setDeleting] = useState(false);
    const [pendingModal, setPendingModal] = useState<{
        open: boolean;
        patientName: string;
        missing: Array<{ label: string; category: string }>;
    }>({ open: false, patientName: '', missing: [] });

    // Advanced Filters State
    const [genderFilter, setGenderFilter] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [minAge, setMinAge] = useState('');
    const [maxAge, setMaxAge] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const activeFiltersCount = [
        genderFilter,
        deptFilter,
        minAge,
        maxAge
    ].filter(Boolean).length;

    const fetchRecords = async (page = 1, query = '', searchType?: 'pid' | 'general', pageSize = perPage, filters = { gender: genderFilter, dept: deptFilter, minA: minAge, maxA: maxAge }) => {
        setLoading(true);
        try {
            let url = `/api/records/screening/${activeYear}?page=${page}&per_page=${pageSize}&q=${query}${searchType ? `&search_type=${searchType}` : ''}`;
            
            if (filters.gender) url += `&gender=${filters.gender}`;
            if (filters.dept) url += `&department=${filters.dept}`;
            if (filters.minA) url += `&min_age=${filters.minA}`;
            if (filters.maxA) url += `&max_age=${filters.maxA}`;

            const response = await axios.get(url, {
                headers: { 'X-Company-Context': activeSection }
            });
            setRecordsData(response.data);
            setCurrentPage(response.data.current_page);
        } catch (err) {
            console.error("Failed to fetch records", err);
            toast.error("Failed to load records");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords(1, searchTerm, undefined, perPage, { gender: genderFilter, dept: deptFilter, minA: minAge, maxA: maxAge });
    }, [activeSection, activeYear, user, genderFilter, deptFilter, minAge, maxAge]);

    // REMOVED deprecated ad-hoc search logic

    const handlePageChange = (newPage: number) => {
        fetchRecords(newPage, searchTerm, undefined, perPage, { gender: genderFilter, dept: deptFilter, minA: minAge, maxA: maxAge });
    };

    const handlePerPageChange = (newPerPage: number) => {
        setPerPage(newPerPage);
        setCurrentPage(1);
        fetchRecords(1, searchTerm, undefined, newPerPage, { gender: genderFilter, dept: deptFilter, minA: minAge, maxA: maxAge });
    };

    const handleDelete = async () => {
        const id = deleteModal.id;
        if (!id) return;
        setDeleting(true);
        try {
            await axios.delete(`/api/records/screening/${id}`, {
                headers: { 'X-Company-Context': activeSection }
            });
            setRecordsData((prev: any) => ({
                ...prev,
                records: prev.records.filter((r: any) => r.id !== id),
                total: prev.total - 1
            }));
            toast.success("Record deleted successfully");
            setDeleteModal({ open: false, id: 0 });
        } catch (err) {
            toast.error("Failed to delete record");
        } finally {
            setDeleting(false);
        }
    };

    const clearFilters = () => {
        setGenderFilter('');
        setDeptFilter('');
        setMinAge('');
        setMaxAge('');
        setSearchTerm('');
        fetchRecords(1, '', undefined, perPage, { gender: '', dept: '', minA: '', maxA: '' });
    };

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-10">
                {/* Unified Search Header style matching Director Review */}
                <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 sm:gap-6 bg-card p-4 sm:p-6 rounded-2xl border transition-all">
                    <div className="flex flex-col items-start sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl">
                            <HugeiconsIcon icon={Database02Icon} className="text-primary h-5 w-5 sm:h-8 sm:w-8" />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-2xl font-black tracking-tight">Screening Records Matrix</h1>
                            <p className="text-[9px] sm:text-sm text-muted-foreground font-medium">Session: {activeYear} • {activeSection}</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 lg:w-auto w-full">
                        <div className="flex-1 min-w-[280px]">
                            <PatientSearch
                                activeSection={activeSection}
                                onSearch={(query, searchType) => {
                                    setSearchTerm(query);
                                    fetchRecords(1, query, searchType, perPage, { gender: genderFilter, dept: deptFilter, minA: minAge, maxA: maxAge });
                                }}
                                onSelect={(p) => {
                                    setSearchTerm(p.staff_id);
                                    fetchRecords(1, p.staff_id, 'general', perPage, { gender: genderFilter, dept: deptFilter, minA: minAge, maxA: maxAge });
                                }}
                                searching={loading}
                                themeColor="primary"
                                placeholder="Search Staff ID or Name..."
                                year={activeYear}
                                strict={true}
                                showPidToggle={true}
                            />
                        </div>
                        <Button
                            variant={showFilters || activeFiltersCount > 0 ? "default" : "outline"}
                            onClick={() => setShowFilters(!showFilters)}
                            className="h-11 sm:h-16 px-4 rounded-xl font-bold flex items-center gap-2 transition-all duration-300 shadow-sm"
                        >
                            <HugeiconsIcon icon={FilterIcon} className="w-4 h-4" />
                            <span>Filters</span>
                            {activeFiltersCount > 0 && (
                                <Badge variant="secondary" className="bg-white/20 text-white border-none text-[10px] px-1.5 py-0.5 rounded-full font-black">
                                    {activeFiltersCount}
                                </Badge>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Collapsible Filters Panel */}
                {showFilters && (
                    <div className="bg-card/45 backdrop-blur-md p-6 rounded-2xl border border-slate-500/10 shadow-lg animate-in slide-in-from-top-4 duration-300 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Gender</label>
                                <select 
                                    value={genderFilter} 
                                    onChange={(e) => setGenderFilter(e.target.value)}
                                    className="bg-background/80 border border-slate-500/15 rounded-xl px-3 py-1.5 text-xs font-bold outline-none h-10 text-foreground hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer"
                                >
                                    <option value="">All Genders</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                            
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Department</label>
                                <select 
                                    value={deptFilter} 
                                    onChange={(e) => setDeptFilter(e.target.value)}
                                    className="bg-background/80 border border-slate-500/15 rounded-xl px-3 py-1.5 text-xs font-bold outline-none h-10 text-foreground hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer"
                                >
                                    <option value="">All Departments</option>
                                    <option value="Admin">Admin</option>
                                    <option value="Accounts">Accounts</option>
                                    <option value="Human Resources">Human Resources</option>
                                    <option value="Engineering">Engineering</option>
                                    <option value="Operations">Operations</option>
                                    <option value="Security">Security</option>
                                    <option value="HSE">HSE</option>
                                    <option value="Medical">Medical</option>
                                    <option value="IT">IT</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Min Age</label>
                                <input 
                                    type="number" 
                                    placeholder="Min Age" 
                                    value={minAge} 
                                    onChange={(e) => setMinAge(e.target.value)}
                                    className="bg-background/80 border border-slate-500/15 rounded-xl px-3 py-1.5 text-xs font-bold outline-none h-10 text-foreground hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Max Age</label>
                                <input 
                                    type="number" 
                                    placeholder="Max Age" 
                                    value={maxAge} 
                                    onChange={(e) => setMaxAge(e.target.value)}
                                    className="bg-background/80 border border-slate-500/15 rounded-xl px-3 py-1.5 text-xs font-bold outline-none h-10 text-foreground hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t pt-4 border-dashed border-slate-500/15">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={clearFilters}
                                className="h-9 px-4 text-xs font-bold rounded-xl"
                            >
                                Reset All
                            </Button>
                        </div>
                    </div>
                )}

                {/* Active Filter Badges */}
                {activeFiltersCount > 0 && (
                    <div className="flex flex-wrap gap-2 items-center bg-muted/20 p-3 rounded-xl border border-dashed border-slate-500/10">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mr-1">Active Filters:</span>
                        {genderFilter && (
                            <Badge variant="secondary" className="px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-bold border bg-background text-foreground shadow-sm">
                                <span>Gender: {genderFilter}</span>
                                <button onClick={() => setGenderFilter('')} className="hover:text-red-500 transition-colors">✕</button>
                            </Badge>
                        )}
                        {deptFilter && (
                            <Badge variant="secondary" className="px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-bold border bg-background text-foreground shadow-sm">
                                <span>Dept: {deptFilter}</span>
                                <button onClick={() => setDeptFilter('')} className="hover:text-red-500 transition-colors">✕</button>
                            </Badge>
                        )}
                        {minAge && (
                            <Badge variant="secondary" className="px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-bold border bg-background text-foreground shadow-sm">
                                <span>Min Age: {minAge}</span>
                                <button onClick={() => setMinAge('')} className="hover:text-red-500 transition-colors">✕</button>
                            </Badge>
                        )}
                        {maxAge && (
                            <Badge variant="secondary" className="px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-bold border bg-background text-foreground shadow-sm">
                                <span>Max Age: {maxAge}</span>
                                <button onClick={() => setMaxAge('')} className="hover:text-red-500 transition-colors">✕</button>
                            </Badge>
                        )}
                        <button onClick={clearFilters} className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors underline ml-auto">
                            Clear all
                        </button>
                    </div>
                )}

                <Card className="border-2 shadow-xl bg-card overflow-hidden">
                    <CardContent className="p-0">
                        {recordsData.records.length === 0 && !loading ? (
                            <div className="flex flex-col items-center justify-center min-h-[24rem] p-8 text-center space-y-4">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-2 transition-transform hover:scale-110 duration-500">
                                    <HugeiconsIcon icon={Search01Icon} className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/30" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black tracking-tight text-foreground/70">No screening records found</h3>
                                    <p className="text-sm text-muted-foreground font-medium italic max-w-xs mx-auto">
                                        Try adjusting your search query or switching the academic session from the system settings.
                                    </p>
                                </div>
                                <div className="flex flex-col items-center gap-2 pt-4">
                                    <div className="h-px w-12 bg-muted-foreground/20" />
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-black">
                                        Context: {activeSection} Clinic • {activeYear}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full">
                                <ScrollArea className="w-full whitespace-nowrap border rounded-md">
                                    <div className="p-1">
                                        <Table>
                                            <TableHeader className="bg-muted/80 backdrop-blur-sm sticky top-0 z-10">
                                                <TableRow className="hover:bg-transparent border-b-2 font-black uppercase text-[12px]">
                                                    <TableHead className="min-w-[1400px] bg-muted/90 border-r text-center" colSpan={14}>Patient Profile</TableHead>
                                                    <TableHead className="min-w-[2500px] bg-primary/10 text-primary border-r text-center" colSpan={31}>Consultation & Vitals</TableHead>
                                                    <TableHead className="min-w-[1500px] bg-rose-50 text-rose-600 border-r text-center" colSpan={17}>Hematology (FBC)</TableHead>
                                                    <TableHead className="min-w-[800px] bg-blue-50 text-blue-600 border-r text-center" colSpan={8}>Kidney Function (KFT)</TableHead>
                                                    <TableHead className="min-w-[600px] bg-amber-50 text-amber-600 border-r text-center" colSpan={5}>Lipid Profile</TableHead>
                                                    <TableHead className="min-w-[800px] bg-primary/5 text-primary border-r text-center" colSpan={6}>Liver Function (LFT)</TableHead>
                                                    <TableHead className="min-w-[800px] bg-red-50 text-red-600 border-r text-center" colSpan={8}>Special Tests</TableHead>
                                                    <TableHead className="min-w-[1200px] bg-indigo-50 text-indigo-600 border-r text-center" colSpan={9}>Director's Review</TableHead>
                                                    <TableHead className="min-w-[100px] text-right bg-muted/90">Actions</TableHead>
                                                </TableRow>
                                                <TableRow className="hover:bg-transparent border-b text-[11px] font-bold">
                                                    {/* Bio */}
                                                    <TableHead className="min-w-[100px]">Patient ID</TableHead>
                                                    <TableHead className="min-w-[100px]">Staff ID</TableHead>
                                                    <TableHead className="min-w-[140px]">First Name</TableHead>
                                                    <TableHead className="min-w-[140px]">Middle Name</TableHead>
                                                    <TableHead className="min-w-[140px]">Last Name</TableHead>
                                                    <TableHead className="min-w-[80px]">Sex</TableHead>
                                                    <TableHead className="min-w-[80px]">Age</TableHead>
                                                    <TableHead className="min-w-[120px]">DOB</TableHead>
                                                    <TableHead className="min-w-[120px]">Phone</TableHead>
                                                    <TableHead className="min-w-[150px]">Email</TableHead>
                                                    <TableHead className="min-w-[120px]">Nationality</TableHead>
                                                    <TableHead className="min-w-[120px]">Department</TableHead>
                                                    <TableHead className="min-w-[120px]">Race / Continent</TableHead>
                                                    <TableHead className="min-w-[120px] border-r">Reg. Date</TableHead>
                                                    <TableHead className="min-w-[140px] border-r text-center">Completion</TableHead>
                                                    
                                                    {/* Consultation */}
                                                    <TableHead className="min-w-[100px]">Blood Pressure</TableHead>
                                                    <TableHead className="min-w-[80px]">Pulse Rate</TableHead>
                                                    <TableHead className="min-w-[80px]">SPO2 Level</TableHead>
                                                    <TableHead className="min-w-[120px]">DM Status</TableHead>
                                                    <TableHead className="min-w-[120px]">HTN Status</TableHead>
                                                    <TableHead className="min-w-[100px]">LUTS (Y/N)</TableHead>
                                                    <TableHead className="min-w-[100px]">Chronic Cough</TableHead>
                                                    <TableHead className="min-w-[100px]">Chest Pain</TableHead>
                                                    <TableHead className="min-w-[100px]">Chest Infect.</TableHead>
                                                    <TableHead className="min-w-[100px]">Heart Disease</TableHead>
                                                    <TableHead className="min-w-[80px]">Palor</TableHead>
                                                    <TableHead className="min-w-[80px]">Jaundice</TableHead>
                                                    <TableHead className="min-w-[80px]">Murmur</TableHead>
                                                    <TableHead className="min-w-[100px]">HS Status</TableHead>
                                                    <TableHead className="min-w-[120px]">Abdomen Status</TableHead>
                                                    <TableHead className="min-w-[140px]">Abdomen Others</TableHead>
                                                    <TableHead className="min-w-[100px]">PSA Level</TableHead>
                                                    <TableHead className="min-w-[120px]">PSA Remark</TableHead>
                                                    <TableHead className="min-w-[100px]">FBS</TableHead>
                                                    <TableHead className="min-w-[100px]">RBS</TableHead>
                                                    <TableHead className="min-w-[120px]">Sugar Remark</TableHead>
                                                    <TableHead className="min-w-[100px]">U/A Result</TableHead>
                                                    <TableHead className="min-w-[120px]">U/A Remark</TableHead>
                                                    <TableHead className="min-w-[140px]">U/A Remark Others</TableHead>
                                                    <TableHead className="min-w-[120px]">Breast Exam</TableHead>
                                                    <TableHead className="min-w-[120px]">Breast Remark</TableHead>
                                                    <TableHead className="min-w-[140px]">Breast Others</TableHead>
                                                    <TableHead className="min-w-[100px]">Chest Status</TableHead>
                                                    <TableHead className="min-w-[120px] font-black">Assessment</TableHead>
                                                    <TableHead className="min-w-[150px] italic">Assess. Hx/PE</TableHead>
                                                    <TableHead className="min-w-[150px]">Other Assess.</TableHead>
                                                    <TableHead className="min-w-[150px]">Overall Lab Remark</TableHead>
                                                    <TableHead className="min-w-[150px] border-r">General Remarks</TableHead>
                                                    
                                                    {/* FBC */}
                                                    <TableHead className="min-w-[70px]">PCV</TableHead>
                                                    <TableHead className="min-w-[70px]">HGB</TableHead>
                                                    <TableHead className="min-w-[70px]">WBC</TableHead>
                                                    <TableHead className="min-w-[70px]">RBC</TableHead>
                                                    <TableHead className="min-w-[70px]">PLT</TableHead>
                                                    <TableHead className="min-w-[70px]">LYMP%</TableHead>
                                                    <TableHead className="min-w-[70px]">LYMP#</TableHead>
                                                    <TableHead className="min-w-[70px]">GRA%</TableHead>
                                                    <TableHead className="min-w-[70px]">GRA#</TableHead>
                                                    <TableHead className="min-w-[70px]">MID%</TableHead>
                                                    <TableHead className="min-w-[70px]">MID#</TableHead>
                                                    <TableHead className="min-w-[70px]">MCV</TableHead>
                                                    <TableHead className="min-w-[70px]">MCH</TableHead>
                                                    <TableHead className="min-w-[70px]">MCHC</TableHead>
                                                    <TableHead className="min-w-[70px]">RDW</TableHead>
                                                    <TableHead className="min-w-[70px]">PDW</TableHead>
                                                    <TableHead className="min-w-[150px] border-r">FBC Remark</TableHead>
                                                    
                                                    {/* KFT */}
                                                    <TableHead className="min-w-[70px]">K+</TableHead>
                                                    <TableHead className="min-w-[70px]">Na+</TableHead>
                                                    <TableHead className="min-w-[70px]">Cl-</TableHead>
                                                    <TableHead className="min-w-[70px]">HCO3</TableHead>
                                                    <TableHead className="min-w-[100px]">Calcium</TableHead>
                                                    <TableHead className="min-w-[150px] border-r">KFT Remark</TableHead>
                                                    
                                                    {/* Lipid */}
                                                    <TableHead className="min-w-[100px]">Cholesterol</TableHead>
                                                    <TableHead className="min-w-[100px]">TG</TableHead>
                                                    <TableHead className="min-w-[100px]">HDL</TableHead>
                                                    <TableHead className="min-w-[100px]">LDL</TableHead>
                                                    <TableHead className="min-w-[150px] border-r">Lipid Remark</TableHead>
                                                    
                                                    {/* LFT */}
                                                    <TableHead className="min-w-[80px]">AST</TableHead>
                                                    <TableHead className="min-w-[80px]">ALT</TableHead>
                                                    <TableHead className="min-w-[80px]">ALP</TableHead>
                                                    <TableHead className="min-w-[80px]">T.BIL</TableHead>
                                                    <TableHead className="min-w-[80px]">C.BIL</TableHead>
                                                    <TableHead className="min-w-[100px]">Urea</TableHead>
                                                    <TableHead className="min-w-[100px]">Creatinine</TableHead>
                                                    <TableHead className="min-w-[150px] border-r">LFT Remark</TableHead>
                                                    
                                                    {/* Special */}
                                                    <TableHead className="min-w-[120px]">ECG Result</TableHead>
                                                    <TableHead className="min-w-[150px]">ECG Remark</TableHead>
                                                    <TableHead className="min-w-[120px]">Spirometry</TableHead>
                                                    <TableHead className="min-w-[150px]">Spiro Remark</TableHead>
                                                    <TableHead className="min-w-[120px]">Audiometry</TableHead>
                                                    <TableHead className="min-w-[150px]">Audio Remark</TableHead>
                                                    <TableHead className="min-w-[80px]">Weight</TableHead>
                                                    <TableHead className="min-w-[80px] border-r">Height</TableHead>
                                                    
                                                    {/* Director Review */}
                                                    <TableHead className="min-w-[150px]">Comment 1</TableHead>
                                                    <TableHead className="min-w-[150px]">Comment 2</TableHead>
                                                    <TableHead className="min-w-[150px]">Comment 3</TableHead>
                                                    <TableHead className="min-w-[150px]">Comment 4</TableHead>
                                                    <TableHead className="min-w-[150px] font-black italic">Director Hx/PE</TableHead>
                                                    <TableHead className="min-w-[150px]">Director Lab Remark</TableHead>
                                                    <TableHead className="min-w-[150px]">Other Assessments</TableHead>
                                                    <TableHead className="min-w-[150px]">Other Remarks</TableHead>
                                                    <TableHead className="min-w-[200px] border-r font-bold">Overall Assessment</TableHead>
                                                    
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loading && recordsData.records.length === 0 ? (
                                                    Array.from({ length: 5 }).map((_, rowIndex) => (
                                                        <TableRow key={rowIndex} className="animate-pulse">
                                                            {Array.from({ length: 100 }).map((_, colIndex) => (
                                                                <TableCell 
                                                                    key={colIndex} 
                                                                    className={`py-3 ${colIndex === 14 || colIndex === 45 || colIndex === 62 || colIndex === 70 || colIndex === 75 || colIndex === 81 || colIndex === 89 || colIndex === 98 ? "border-r" : ""} ${colIndex === 99 ? "text-right" : ""}`}
                                                                >
                                                                    <Skeleton className={`h-4 bg-muted/40 rounded animate-pulse ${colIndex === 0 || colIndex === 1 ? "w-16" : colIndex === 2 || colIndex === 4 ? "w-24" : "w-12"}`} />
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    recordsData.records.map((r: any) => (
                                                        <TableRow key={r.id} className="group hover:bg-muted/30 transition-colors border-b text-xs">
                                                        <TableCell className="uppercase font-bold text-[11px]">{r.patient_id || '-'}</TableCell>
                                                        <TableCell><code className="font-black text-primary text-[11px]">{r.staff_id}</code></TableCell>
                                                        <TableCell className="font-bold text-[11px]">{r.first_name}</TableCell>
                                                        <TableCell className="text-[11px] font-medium">{r.middle_name || '-'}</TableCell>
                                                        <TableCell className="font-bold text-[11px]">{r.last_name}</TableCell>
                                                        <TableCell className="uppercase font-black text-[11px]">{r.gender}</TableCell>
                                                        <TableCell className="font-bold text-[11px]">{r.age || '-'}</TableCell>
                                                        <TableCell className="text-[11px]">{r.dob || '-'}</TableCell>
                                                        <TableCell className="text-[11px]">{r.phone || '-'}</TableCell>
                                                        <TableCell className="text-[11px] lowercase italic">{r.email || '-'}</TableCell>
                                                        <TableCell className="text-[11px]">{r.nationality || '-'}</TableCell>
                                                        <TableCell className="text-[11px]">{r.department}</TableCell>
                                                        <TableCell className="text-[11px] uppercase">{r.race || '-'}</TableCell>
                                                        <TableCell className="border-r text-[11px] font-mono">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}</TableCell>
                                                        <TableCell className="border-r text-center font-bold bg-muted/5">
                                                            <div className="flex flex-col items-center gap-1 py-0.5">
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                                                                    (r.progress?.percentage || 0) === 100 
                                                                    ? 'bg-emerald-500/10 text-emerald-500' 
                                                                    : (r.progress?.percentage || 0) > 50 
                                                                    ? 'bg-amber-500/10 text-amber-500' 
                                                                    : 'bg-rose-500/10 text-rose-500'
                                                                }`}>
                                                                    {r.progress?.percentage || 0}%
                                                                </span>
                                                                <div className="w-16 bg-muted dark:bg-muted/40 rounded-full h-1 overflow-hidden">
                                                                    <div 
                                                                        className={`h-full transition-all duration-500 ${
                                                                            (r.progress?.percentage || 0) === 100 ? 'bg-emerald-500' :
                                                                            (r.progress?.percentage || 0) > 50 ? 'bg-amber-500' : 'bg-rose-500'
                                                                        }`}
                                                                        style={{ width: `${r.progress?.percentage || 0}%` }}
                                                                    />
                                                                </div>
                                                                {(r.progress?.percentage || 0) < 100 && (
                                                                    <button 
                                                                        onClick={() => setPendingModal({ open: true, patientName: `${r.first_name} ${r.last_name}`, missing: r.progress?.missing_fields || [] })}
                                                                        className="text-[9px] text-primary hover:underline font-bold mt-0.5 cursor-pointer"
                                                                    >
                                                                        View Pending
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        
                                                        {/* Consultation */}
                                                        <TableCell className="font-bold bg-primary/5 text-[11px]">{r.consultation?.bp || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px]">{r.consultation?.pulse || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px]">{r.consultation?.spo2 || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px]">{r.consultation?.dm || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px]">{r.consultation?.htn || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 font-black text-[11px]">{r.consultation?.luts || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px]">{r.consultation?.chronic_cough || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px]">{r.consultation?.chronic_chest_pain || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px]">{r.consultation?.chest_infection || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px]">{r.consultation?.heart_dx || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px]">{r.consultation?.palor || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px]">{r.consultation?.jaundice || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px]">{r.consultation?.murmur || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px]">{r.consultation?.hs || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px]">{r.consultation?.abdomen || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px] italic truncate max-w-[140px]" title={r.consultation?.abdomen_others || ''}>{r.consultation?.abdomen_others || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 font-bold text-[11px]">{r.consultation?.psa || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px] italic truncate max-w-[120px]" title={r.consultation?.psa_remark || ''}>{r.consultation?.psa_remark || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px]">{r.consultation?.fbs || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px]">{r.consultation?.rbs || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px] italic truncate max-w-[120px]" title={r.consultation?.sugar_remark || ''}>{r.consultation?.sugar_remark || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 font-bold text-[11px]">{r.consultation?.ua_result || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px] italic truncate max-w-[120px]" title={r.consultation?.ua_remark || ''}>{r.consultation?.ua_remark || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px] italic truncate max-w-[140px]" title={r.consultation?.ua_remark_others || ''}>{r.consultation?.ua_remark_others || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px]">{r.consultation?.breast || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px] italic truncate max-w-[120px]" title={r.consultation?.breast_remark || ''}>{r.consultation?.breast_remark || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px] italic truncate max-w-[140px]" title={r.consultation?.breast_others || ''}>{r.consultation?.breast_others || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px]">{r.consultation?.chest_status || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 font-bold text-[11px]">{r.director_review?.assessment || r.consultation?.assessment || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px] italic truncate max-w-[150px]" title={r.director_review?.hx_pe || r.consultation?.hx_pe || ''}>{r.director_review?.hx_pe || r.consultation?.hx_pe || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px] truncate max-w-[150px]" title={r.director_review?.other_assessments || r.consultation?.other_assessments || ''}>{r.director_review?.other_assessments || r.consultation?.other_assessments || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px] truncate max-w-[150px]" title={r.director_review?.lab_remark || r.consultation?.lab_remark || ''}>{r.director_review?.lab_remark || r.consultation?.lab_remark || '-'}</TableCell>
                                                        <TableCell className="border-r bg-primary/5 text-[11px] truncate max-w-[150px]" title={r.director_review?.other_remarks || r.consultation?.remarks || ''}>{r.director_review?.other_remarks || r.consultation?.remarks || '-'}</TableCell>
                                                        
                                                        {/* FBC */}
                                                        <TableCell className="bg-rose-50/30 text-[11px]">{r.fbc?.pcv || '-'}</TableCell>
                                                        <TableCell className="bg-rose-50/30 font-bold text-[11px]">{r.fbc?.hgb || '-'}</TableCell>
                                                        <TableCell className="bg-rose-50/30 text-[11px]">{r.fbc?.wbc || '-'}</TableCell>
                                                        <TableCell className="bg-rose-50/30 text-[11px]">{r.fbc?.rbc || '-'}</TableCell>
                                                        <TableCell className="bg-rose-50/30 text-[11px]">{r.fbc?.plt || '-'}</TableCell>
                                                        <TableCell className="bg-rose-50/30 text-[11px]">{r.fbc?.lymp_percent || '-'}</TableCell>
                                                        <TableCell className="bg-rose-50/30 text-[11px]">{r.fbc?.lymp_abs || '-'}</TableCell>
                                                        <TableCell className="bg-rose-50/30 text-[11px]">{r.fbc?.gra_percent || '-'}</TableCell>
                                                        <TableCell className="bg-rose-50/30 text-[11px]">{r.fbc?.gra_abs || '-'}</TableCell>
                                                        <TableCell className="bg-rose-50/30 text-[11px]">{r.fbc?.mid_percent || '-'}</TableCell>
                                                        <TableCell className="bg-rose-50/30 text-[11px]">{r.fbc?.mid_abs || '-'}</TableCell>
                                                        <TableCell className="bg-rose-50/30 text-[11px]">{r.fbc?.mcv || '-'}</TableCell>
                                                        <TableCell className="bg-rose-50/30 text-[11px]">{r.fbc?.mch || '-'}</TableCell>
                                                        <TableCell className="bg-rose-50/30 text-[11px]">{r.fbc?.mchc || '-'}</TableCell>
                                                        <TableCell className="bg-rose-50/30 text-[11px]">{r.fbc?.rdw || '-'}</TableCell>
                                                        <TableCell className="bg-rose-50/30 text-[11px]">{r.fbc?.pdw || '-'}</TableCell>
                                                        <TableCell className="bg-rose-50/30 text-[11px] truncate max-w-[150px] border-r" title={r.fbc?.remark || ''}>{r.fbc?.remark || '-'}</TableCell>
                                                        
                                                        {/* KFT */}
                                                        <TableCell className="text-[11px] bg-blue-50/30">{r.kft?.potassium || '-'}</TableCell>
                                                        <TableCell className="text-[11px] bg-blue-50/30">{r.kft?.sodium || '-'}</TableCell>
                                                        <TableCell className="text-[11px] bg-blue-50/30">{r.kft?.chloride || '-'}</TableCell>
                                                        <TableCell className="text-[11px] bg-blue-50/30">{r.kft?.hco3 || '-'}</TableCell>
                                                        <TableCell className="text-[11px] bg-blue-50/30">{r.kft?.bicarbonate || '-'}</TableCell>
                                                        <TableCell className="bg-blue-50/30 text-[11px] truncate max-w-[150px] border-r" title={r.kft?.remark || ''}>{r.kft?.remark || '-'}</TableCell>
                                                        
                                                        {/* Lipid */}
                                                        <TableCell className="text-[11px] bg-amber-50/30 font-bold">{r.lipid?.tcho || '-'}</TableCell>
                                                        <TableCell className="text-[11px] bg-amber-50/30">{r.lipid?.tg || '-'}</TableCell>
                                                        <TableCell className="text-[11px] bg-amber-50/30">{r.lipid?.hdl || '-'}</TableCell>
                                                        <TableCell className="text-[11px] bg-amber-50/30">{r.lipid?.ldl || '-'}</TableCell>
                                                        <TableCell className="bg-amber-50/30 text-[11px] truncate max-w-[150px] border-r" title={r.lipid?.remark || ''}>{r.lipid?.remark || '-'}</TableCell>
                                                        
                                                        {/* LFT */}
                                                        <TableCell className="text-[11px] bg-primary/5/30">{r.lft?.ast || '-'}</TableCell>
                                                        <TableCell className="text-[11px] bg-primary/5/30">{r.lft?.alt || '-'}</TableCell>
                                                        <TableCell className="text-[11px] bg-primary/5/30">{r.lft?.alp || '-'}</TableCell>
                                                        <TableCell className="text-[11px] bg-primary/5/30">{r.lft?.tb || '-'}</TableCell>
                                                        <TableCell className="text-[11px] bg-primary/5/30">{r.lft?.cb || '-'}</TableCell>
                                                        <TableCell className="text-[11px] bg-primary/5/30 font-bold">{r.lft?.urea || '-'}</TableCell>
                                                        <TableCell className="text-[11px] bg-primary/5/30 font-bold">{r.lft?.creatinine || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5/30 text-[11px] truncate max-w-[150px] border-r" title={r.lft?.remark || ''}>{r.lft?.remark || '-'}</TableCell>
                                                        
                                                        {/* Special */}
                                                        <TableCell className="text-[11px] bg-red-50/30 font-bold">{r.special?.ecg || '-'}</TableCell>
                                                        <TableCell className="bg-red-50/30 text-[11px] truncate max-w-[150px]" title={r.special?.ecg_remark || ''}>{r.special?.ecg_remark || '-'}</TableCell>
                                                        <TableCell className="text-[11px] bg-red-50/30 font-bold">{r.special?.spirometry || '-'}</TableCell>
                                                        <TableCell className="bg-red-50/30 text-[11px] truncate max-w-[150px]" title={r.special?.spirometry_remark || ''}>{r.special?.spirometry_remark || '-'}</TableCell>
                                                        <TableCell className="text-[11px] bg-red-50/30 font-bold">{r.special?.audiometry || '-'}</TableCell>
                                                        <TableCell className="bg-red-50/30 text-[11px] truncate max-w-[150px]" title={r.special?.audiometry_remark || ''}>{r.special?.audiometry_remark || '-'}</TableCell>
                                                        <TableCell className="text-[11px] bg-red-50/30">{r.special?.weight || '-'}</TableCell>
                                                        <TableCell className="border-r text-[11px] bg-red-50/30">{r.special?.height || '-'}</TableCell>
                                                        
                                                        {/* Director Review */}
                                                        <TableCell className="bg-indigo-50/30 text-[11px] italic truncate max-w-[150px]" title={r.director_review?.comment_one || ''}>{r.director_review?.comment_one || '-'}</TableCell>
                                                        <TableCell className="bg-indigo-50/30 text-[11px] italic truncate max-w-[150px]" title={r.director_review?.comment_two || ''}>{r.director_review?.comment_two || '-'}</TableCell>
                                                        <TableCell className="bg-indigo-50/30 text-[11px] italic truncate max-w-[150px]" title={r.director_review?.comment_three || ''}>{r.director_review?.comment_three || '-'}</TableCell>
                                                        <TableCell className="bg-indigo-50/30 text-[11px] italic truncate max-w-[150px]" title={r.director_review?.comment_four || ''}>{r.director_review?.comment_four || '-'}</TableCell>
                                                        <TableCell className="bg-indigo-50/30 text-[11px] italic truncate max-w-[150px]" title={r.director_review?.hx_pe || ''}>{r.director_review?.hx_pe || '-'}</TableCell>
                                                        <TableCell className="bg-indigo-50/30 text-[11px] truncate max-w-[150px]" title={r.director_review?.lab_remark || ''}>{r.director_review?.lab_remark || '-'}</TableCell>
                                                        <TableCell className="bg-indigo-50/30 text-[11px] truncate max-w-[150px]" title={r.director_review?.other_assessments || ''}>{r.director_review?.other_assessments || '-'}</TableCell>
                                                        <TableCell className="bg-indigo-50/30 text-[11px] truncate max-w-[150px]" title={r.director_review?.other_remarks || ''}>{r.director_review?.other_remarks || '-'}</TableCell>
                                                        <TableCell className="border-r bg-indigo-50/10 text-[11px] font-bold truncate max-w-[200px]" title={r.director_review?.assessment || ''}>{r.director_review?.assessment || '-'}</TableCell>
                                                        
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1 transition-opacity">
                                                                {user?.permissions?.includes('delete_record') && (
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm" 
                                                                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                                                        onClick={() => setDeleteModal({ open: true, id: r.id })}
                                                                    >
                                                                        <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <ScrollBar orientation="horizontal" className="h-4 bg-muted border-t" />
                                </ScrollArea>

                                {/* Pagination Controls */}
                                <div className="bg-muted/20 border-t px-8 py-2 no-print">
                                    <Pagination
                                        currentPage={currentPage}
                                        totalItems={recordsData.total}
                                        perPage={perPage}
                                        onPageChange={handlePageChange}
                                        onPerPageChange={handlePerPageChange}
                                        loading={loading}
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <ActionConfirmModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, id: 0 })}
                onConfirm={handleDelete}
                title="Delete Screening Record"
                description="Are you sure you want to delete this screening record? This will permanently remove it from the database for the current academic year."
                confirmText="Delete Record"
                variant="danger"
                loading={deleting}
            />

            <Dialog open={pendingModal.open} onOpenChange={(open) => setPendingModal(prev => ({ ...prev, open }))}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black tracking-tight">Pending Parameters</DialogTitle>
                        <DialogDescription className="text-xs font-bold text-muted-foreground">
                            Screening report checklist for <span className="text-foreground">{pendingModal.patientName}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[350px] overflow-auto py-2">
                        {pendingModal.missing.length === 0 ? (
                            <p className="text-xs text-muted-foreground font-bold text-center py-4">No pending parameters found.</p>
                        ) : (
                            Object.entries(
                                pendingModal.missing.reduce((acc: Record<string, string[]>, curr: { label: string; category: string }) => {
                                    if (!acc[curr.category]) acc[curr.category] = [];
                                    acc[curr.category].push(curr.label);
                                    return acc;
                                }, {})
                            ).map(([category, labels]) => (
                                <div key={category} className="space-y-2 bg-muted/40 p-3 rounded-xl border border-dashed">
                                    <h3 className="text-[10px] font-black uppercase tracking-wider text-primary">{category}</h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {labels.map((label: string) => (
                                            <Badge key={label} variant="outline" className="bg-background text-[11px] font-black text-rose-500 border-rose-500/20 py-0.5 px-2 rounded-md">
                                                {label}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
};

export default ViewRecordsPage;
