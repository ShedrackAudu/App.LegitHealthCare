import React, { useState, useEffect } from 'react';
import { 
  Database,
  Search,
  Trash2, 
  Loader2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { PatientSearch } from '@/components/PatientSearch';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    const [deleteModal, setDeleteModal] = useState({ open: false, id: 0 });
    const [deleting, setDeleting] = useState(false);

    const fetchRecords = async (page = 1, query = '') => {
        setLoading(true);
        try {
            const url = `/api/records/screening/${activeYear}?page=${page}&per_page=25&q=${query}`;
            
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
        fetchRecords(1, searchTerm);
    }, [activeSection, activeYear]);

    // REMOVED deprecated ad-hoc search logic




    const handlePageChange = (newPage: number) => {
        fetchRecords(newPage, searchTerm);
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

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-10">
                {/* Unified Search Header style matching Director Review */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card p-6 rounded-2xl border-2 shadow-xl border-primary/10 transition-all">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                            <Database className="text-primary h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight">Screening Records Matrix</h1>
                            <p className="text-sm text-muted-foreground font-medium">Session: {activeYear} • {activeSection}</p>
                        </div>
                    </div>
                    
                    <PatientSearch
                        activeSection={activeSection}
                        onSearch={(query) => {
                            setSearchTerm(query);
                            fetchRecords(1, query);
                        }}
                        onSelect={(p) => {
                            setSearchTerm(p.staff_id);
                            fetchRecords(1, p.staff_id);
                        }}
                        searching={loading}
                        themeColor="primary"
                        placeholder="Search Staff ID or Name..."
                    />
                </div>

                <Card className="border-2 shadow-xl bg-card overflow-hidden">
                    <CardContent className="p-0">
                        {loading && recordsData.records.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-20 gap-4">
                                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                                <p className="font-bold text-muted-foreground animate-pulse">Gathering diagnostic data...</p>
                            </div>
                        ) : recordsData.records.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-20 text-center">
                                <Search className="h-16 w-16 text-muted-foreground/20 mb-4" />
                                <h3 className="text-xl font-bold">No screening records found</h3>
                                <p className="text-muted-foreground">Try adjusting your search or switching the academic year.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full">
                                <ScrollArea className="w-full whitespace-nowrap border rounded-md">
                                    <div className="p-1">
                                        <Table>
                                            <TableHeader className="bg-muted/80 backdrop-blur-sm sticky top-0 z-10">
                                                <TableRow className="hover:bg-transparent border-b-2 font-black uppercase text-[12px]">
                                                    <TableHead className="min-w-[1400px] bg-muted/90 border-r" colSpan={14}>Patient Profile</TableHead>
                                                    <TableHead className="min-w-[1500px] bg-primary/10 text-primary border-r text-center" colSpan={21}>Consultation & Vitals</TableHead>
                                                    <TableHead className="min-w-[1500px] bg-rose-50 text-rose-600 border-r text-center" colSpan={18}>Hematology (FBC)</TableHead>
                                                    <TableHead className="min-w-[800px] bg-blue-50 text-blue-600 border-r text-center" colSpan={9}>Kidney Function (KFT)</TableHead>
                                                    <TableHead className="min-w-[600px] bg-amber-50 text-amber-600 border-r text-center" colSpan={6}>Lipid Profile</TableHead>
                                                    <TableHead className="min-w-[800px] bg-emerald-50 text-emerald-600 border-r text-center" colSpan={7}>Liver Function (LFT)</TableHead>
                                                    <TableHead className="min-w-[800px] bg-red-50 text-red-600 border-r text-center" colSpan={8}>Special Tests</TableHead>
                                                    <TableHead className="min-w-[600px] bg-indigo-50 text-indigo-600 border-r text-center" colSpan={4}>Director's Review</TableHead>
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
                                                    
                                                    {/* Consultation */}
                                                    <TableHead className="min-w-[100px] text-center">Blood Pressure</TableHead>
                                                    <TableHead className="min-w-[80px] text-center">Pulse Rate</TableHead>
                                                    <TableHead className="min-w-[80px] text-center">SPO2 Level</TableHead>
                                                    <TableHead className="min-w-[100px] text-center">LUTS (Y/N)</TableHead>
                                                    <TableHead className="min-w-[100px] text-center">Chronic Cough</TableHead>
                                                    <TableHead className="min-w-[100px] text-center">Chest Pain</TableHead>
                                                    <TableHead className="min-w-[100px] text-center">Chest Infect.</TableHead>
                                                    <TableHead className="min-w-[100px] text-center">Heart Disease</TableHead>
                                                    <TableHead className="min-w-[80px] text-center">Palor</TableHead>
                                                    <TableHead className="min-w-[80px] text-center">Jaundice</TableHead>
                                                    <TableHead className="min-w-[80px] text-center">Murmur</TableHead>
                                                    <TableHead className="min-w-[100px] text-center">PSA Level</TableHead>
                                                    <TableHead className="min-w-[120px] text-center">PSA Remark</TableHead>
                                                    <TableHead className="min-w-[100px] text-center">Sugar Level</TableHead>
                                                    <TableHead className="min-w-[120px] text-center">Sugar Remark</TableHead>
                                                    <TableHead className="min-w-[100px] text-center">Urinalysis Res</TableHead>
                                                    <TableHead className="min-w-[120px] text-center">Urinalysis Rem</TableHead>
                                                    <TableHead className="min-w-[100px] text-center">Chest Status</TableHead>
                                                    <TableHead className="min-w-[120px] text-center font-black">Assessment</TableHead>
                                                    <TableHead className="min-w-[150px] text-center italic">Hist/Physical</TableHead>
                                                    <TableHead className="min-w-[150px] text-center border-r">General Comments</TableHead>
                                                    
                                                    {/* FBC */}
                                                    <TableHead className="min-w-[70px] text-center">PCV</TableHead>
                                                    <TableHead className="min-w-[70px] text-center">HGB</TableHead>
                                                    <TableHead className="min-w-[70px] text-center">WBC</TableHead>
                                                    <TableHead className="min-w-[70px] text-center">RBC</TableHead>
                                                    <TableHead className="min-w-[70px] text-center">PLT</TableHead>
                                                    <TableHead className="min-w-[70px] text-center">LYMP%</TableHead>
                                                    <TableHead className="min-w-[70px] text-center">LYMP#</TableHead>
                                                    <TableHead className="min-w-[70px] text-center">GRA%</TableHead>
                                                    <TableHead className="min-w-[70px] text-center">GRA#</TableHead>
                                                    <TableHead className="min-w-[70px] text-center">MID%</TableHead>
                                                    <TableHead className="min-w-[70px] text-center">MID#</TableHead>
                                                    <TableHead className="min-w-[70px] text-center">MCV</TableHead>
                                                    <TableHead className="min-w-[70px] text-center">MCH</TableHead>
                                                    <TableHead className="min-w-[70px] text-center">MCHC</TableHead>
                                                    <TableHead className="min-w-[70px] text-center">RDW</TableHead>
                                                    <TableHead className="min-w-[70px] text-center">PDW</TableHead>
                                                    <TableHead className="min-w-[150px] text-center">FBC Remark</TableHead>
                                                    <TableHead className="min-w-[150px] text-center border-r">Other Remarks</TableHead>
                                                    
                                                    {/* KFT */}
                                                    <TableHead className="min-w-[70px] text-center">K+</TableHead>
                                                    <TableHead className="min-w-[70px] text-center">Na+</TableHead>
                                                    <TableHead className="min-w-[70px] text-center">Cl-</TableHead>
                                                    <TableHead className="min-w-[100px] text-center">Urea</TableHead>
                                                    <TableHead className="min-w-[100px] text-center">Creatinine</TableHead>
                                                    <TableHead className="min-w-[70px] text-center">HCO3</TableHead>
                                                    <TableHead className="min-w-[100px] text-center">Bicarbonate</TableHead>
                                                    <TableHead className="min-w-[150px] text-center">KFT Remark</TableHead>
                                                    <TableHead className="min-w-[150px] text-center border-r">Other Remarks</TableHead>
                                                    
                                                    {/* Lipid */}
                                                    <TableHead className="min-w-[100px] text-center">Cholesterol</TableHead>
                                                    <TableHead className="min-w-[100px] text-center">TG</TableHead>
                                                    <TableHead className="min-w-[100px] text-center">HDL</TableHead>
                                                    <TableHead className="min-w-[100px] text-center">LDL</TableHead>
                                                    <TableHead className="min-w-[150px] text-center">Lipid Remark</TableHead>
                                                    <TableHead className="min-w-[150px] text-center border-r">Other Remarks</TableHead>
                                                    
                                                    {/* LFT */}
                                                    <TableHead className="min-w-[80px] text-center">AST</TableHead>
                                                    <TableHead className="min-w-[80px] text-center">ALT</TableHead>
                                                    <TableHead className="min-w-[80px] text-center">ALP</TableHead>
                                                    <TableHead className="min-w-[80px] text-center">T.BIL</TableHead>
                                                    <TableHead className="min-w-[80px] text-center">C.BIL</TableHead>
                                                    <TableHead className="min-w-[150px] text-center">LFT Remark</TableHead>
                                                    <TableHead className="min-w-[150px] text-center border-r">Other Remarks</TableHead>
                                                    
                                                    {/* Special */}
                                                    <TableHead className="min-w-[120px] text-center">ECG Result</TableHead>
                                                    <TableHead className="min-w-[150px] text-center">ECG Remark</TableHead>
                                                    <TableHead className="min-w-[120px] text-center">Spirometry</TableHead>
                                                    <TableHead className="min-w-[150px] text-center">Spiro Remark</TableHead>
                                                    <TableHead className="min-w-[120px] text-center">Audiometry</TableHead>
                                                    <TableHead className="min-w-[150px] text-center">Audio Remark</TableHead>
                                                    <TableHead className="min-w-[80px] text-center">Weight</TableHead>
                                                    <TableHead className="min-w-[80px] text-center border-r">Height</TableHead>
                                                    
                                                    {/* Director Review */}
                                                    <TableHead className="min-w-[150px] text-center">Comment 1</TableHead>
                                                    <TableHead className="min-w-[150px] text-center">Comment 2</TableHead>
                                                    <TableHead className="min-w-[150px] text-center">Comment 3</TableHead>
                                                    <TableHead className="min-w-[150px] text-center border-r">Comment 4</TableHead>
                                                    
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {recordsData.records.map((r: any) => (
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
                                                        
                                                        {/* Consultation */}
                                                        <TableCell className="text-center font-bold bg-primary/5 text-[11px]">{r.consultation?.bp || '-'}</TableCell>
                                                        <TableCell className="text-center bg-primary/5 text-[11px]">{r.consultation?.pulse || '-'}</TableCell>
                                                        <TableCell className="text-center bg-primary/5 text-[11px]">{r.consultation?.spo2 || '-'}</TableCell>
                                                        <TableCell className="text-center bg-primary/5 font-black text-[11px]">{r.consultation?.luts || '-'}</TableCell>
                                                        <TableCell className="text-center bg-primary/5 text-[11px]">{r.consultation?.chronic_cough || '-'}</TableCell>
                                                        <TableCell className="text-center bg-primary/5 text-[11px]">{r.consultation?.chronic_chest_pain || '-'}</TableCell>
                                                        <TableCell className="text-center bg-primary/5 text-[11px]">{r.consultation?.chest_infection || '-'}</TableCell>
                                                        <TableCell className="text-center bg-primary/5 text-[11px]">{r.consultation?.heart_dx || '-'}</TableCell>
                                                        <TableCell className="text-center bg-primary/5 text-[11px]">{r.consultation?.palor || '-'}</TableCell>
                                                        <TableCell className="text-center bg-primary/5 text-[11px]">{r.consultation?.jaundice || '-'}</TableCell>
                                                        <TableCell className="text-center bg-primary/5 text-[11px]">{r.consultation?.murmur || '-'}</TableCell>
                                                        <TableCell className="text-center bg-primary/5 font-bold text-[11px]">{r.consultation?.psa || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px] italic truncate max-w-[120px]" title={r.consultation?.psa_remark || ''}>{r.consultation?.psa_remark || '-'}</TableCell>
                                                        <TableCell className="text-center bg-primary/5 font-bold text-[11px]">{r.consultation?.fbs || r.consultation?.rbs || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px] italic truncate max-w-[120px]" title={r.consultation?.sugar_remark || ''}>{r.consultation?.sugar_remark || '-'}</TableCell>
                                                        <TableCell className="text-center bg-primary/5 font-bold text-[11px]">{r.consultation?.ua_result || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px] italic truncate max-w-[120px]" title={r.consultation?.ua_remark || ''}>{r.consultation?.ua_remark || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px]">{r.consultation?.chest_status || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 font-bold text-[11px]">{r.consultation?.assessment || '-'}</TableCell>
                                                        <TableCell className="bg-primary/5 text-[11px] italic truncate max-w-[150px]" title={r.consultation?.hx_pe || ''}>{r.consultation?.hx_pe || '-'}</TableCell>
                                                        <TableCell className="border-r bg-primary/5 text-[11px] truncate max-w-[150px]" title={r.consultation?.remarks || ''}>{r.consultation?.remarks || '-'}</TableCell>
                                                        
                                                        {/* FBC */}
                                                        <TableCell className="text-center bg-rose-50/30 text-[11px]">{r.fbc?.pcv || '-'}</TableCell>
                                                        <TableCell className="text-center bg-rose-50/30 font-bold text-[11px]">{r.fbc?.hgb || '-'}</TableCell>
                                                        <TableCell className="text-center bg-rose-50/30 text-[11px]">{r.fbc?.wbc || '-'}</TableCell>
                                                        <TableCell className="text-center bg-rose-50/30 text-[11px]">{r.fbc?.rbc || '-'}</TableCell>
                                                        <TableCell className="text-center bg-rose-50/30 text-[11px]">{r.fbc?.plt || '-'}</TableCell>
                                                        <TableCell className="text-center bg-rose-50/30 text-[11px]">{r.fbc?.lymp_percent || '-'}</TableCell>
                                                        <TableCell className="text-center bg-rose-50/30 text-[11px]">{r.fbc?.lymp_abs || '-'}</TableCell>
                                                        <TableCell className="text-center bg-rose-50/30 text-[11px]">{r.fbc?.gra_percent || '-'}</TableCell>
                                                        <TableCell className="text-center bg-rose-50/30 text-[11px]">{r.fbc?.gra_abs || '-'}</TableCell>
                                                        <TableCell className="text-center bg-rose-50/30 text-[11px]">{r.fbc?.mid_percent || '-'}</TableCell>
                                                        <TableCell className="text-center bg-rose-50/30 text-[11px]">{r.fbc?.mid_abs || '-'}</TableCell>
                                                        <TableCell className="text-center bg-rose-50/30 text-[11px]">{r.fbc?.mcv || '-'}</TableCell>
                                                        <TableCell className="text-center bg-rose-50/30 text-[11px]">{r.fbc?.mch || '-'}</TableCell>
                                                        <TableCell className="text-center bg-rose-50/30 text-[11px]">{r.fbc?.mchc || '-'}</TableCell>
                                                        <TableCell className="text-center bg-rose-50/30 text-[11px]">{r.fbc?.rdw || '-'}</TableCell>
                                                        <TableCell className="text-center bg-rose-50/30 text-[11px]">{r.fbc?.pdw || '-'}</TableCell>
                                                        <TableCell className="bg-rose-50/30 text-[11px] truncate max-w-[150px]" title={r.fbc?.remark || ''}>{r.fbc?.remark || '-'}</TableCell>
                                                        <TableCell className="border-r bg-rose-50/30 text-[11px] truncate max-w-[150px]" title={r.fbc?.other_remarks || ''}>{r.fbc?.other_remarks || '-'}</TableCell>
                                                        
                                                        {/* KFT */}
                                                        <TableCell className="text-[11px] text-center bg-blue-50/30">{r.kft?.potassium || '-'}</TableCell>
                                                        <TableCell className="text-[11px] text-center bg-blue-50/30">{r.kft?.sodium || '-'}</TableCell>
                                                        <TableCell className="text-[11px] text-center bg-blue-50/30">{r.kft?.chloride || '-'}</TableCell>
                                                        <TableCell className="text-[11px] text-center bg-blue-50/30 font-bold">{r.kft?.urea || '-'}</TableCell>
                                                        <TableCell className="text-[11px] text-center bg-blue-50/30 font-bold">{r.kft?.creatinine || '-'}</TableCell>
                                                        <TableCell className="text-[11px] text-center bg-blue-50/30">{r.kft?.hco3 || '-'}</TableCell>
                                                        <TableCell className="text-[11px] text-center bg-blue-50/30">{r.kft?.bicarbonate || '-'}</TableCell>
                                                        <TableCell className="bg-blue-50/30 text-[11px] truncate max-w-[150px]" title={r.kft?.remark || ''}>{r.kft?.remark || '-'}</TableCell>
                                                        <TableCell className="border-r bg-blue-50/30 text-[11px] truncate max-w-[150px]" title={r.kft?.other_remarks || ''}>{r.kft?.other_remarks || '-'}</TableCell>
                                                        
                                                        {/* Lipid */}
                                                        <TableCell className="text-[11px] text-center bg-amber-50/30 font-bold">{r.lipid?.tcho || '-'}</TableCell>
                                                        <TableCell className="text-[11px] text-center bg-amber-50/30">{r.lipid?.tg || '-'}</TableCell>
                                                        <TableCell className="text-[11px] text-center bg-amber-50/30">{r.lipid?.hdl || '-'}</TableCell>
                                                        <TableCell className="text-[11px] text-center bg-amber-50/30">{r.lipid?.ldl || '-'}</TableCell>
                                                        <TableCell className="bg-amber-50/30 text-[11px] truncate max-w-[150px]" title={r.lipid?.remark || ''}>{r.lipid?.remark || '-'}</TableCell>
                                                        <TableCell className="border-r bg-amber-50/30 text-[11px] truncate max-w-[150px]" title={r.lipid?.other_remarks || ''}>{r.lipid?.other_remarks || '-'}</TableCell>
                                                        
                                                        {/* LFT */}
                                                        <TableCell className="text-[11px] text-center bg-emerald-50/30">{r.lft?.ast || '-'}</TableCell>
                                                        <TableCell className="text-[11px] text-center bg-emerald-50/30">{r.lft?.alt || '-'}</TableCell>
                                                        <TableCell className="text-[11px] text-center bg-emerald-50/30">{r.lft?.alp || '-'}</TableCell>
                                                        <TableCell className="text-[11px] text-center bg-emerald-50/30">{r.lft?.tb || '-'}</TableCell>
                                                        <TableCell className="text-[11px] text-center bg-emerald-50/30">{r.lft?.cb || '-'}</TableCell>
                                                        <TableCell className="bg-emerald-50/30 text-[11px] truncate max-w-[150px]" title={r.lft?.remark || ''}>{r.lft?.remark || '-'}</TableCell>
                                                        <TableCell className="border-r bg-emerald-50/30 text-[11px] truncate max-w-[150px]" title={r.lft?.other_remarks || ''}>{r.lft?.other_remarks || '-'}</TableCell>
                                                        
                                                        {/* Special */}
                                                        <TableCell className="text-[11px] text-center bg-red-50/30 font-bold">{r.special?.ecg || '-'}</TableCell>
                                                        <TableCell className="bg-red-50/30 text-[11px] truncate max-w-[150px]" title={r.special?.ecg_remark || ''}>{r.special?.ecg_remark || '-'}</TableCell>
                                                        <TableCell className="text-[11px] text-center bg-red-50/30 font-bold">{r.special?.spirometry || '-'}</TableCell>
                                                        <TableCell className="bg-red-50/30 text-[11px] truncate max-w-[150px]" title={r.special?.spirometry_remark || ''}>{r.special?.spirometry_remark || '-'}</TableCell>
                                                        <TableCell className="text-[11px] text-center bg-red-50/30 font-bold">{r.special?.audiometry || '-'}</TableCell>
                                                        <TableCell className="bg-red-50/30 text-[11px] truncate max-w-[150px]" title={r.special?.audiometry_remark || ''}>{r.special?.audiometry_remark || '-'}</TableCell>
                                                        <TableCell className="text-[11px] text-center bg-red-50/30">{r.special?.weight || '-'}</TableCell>
                                                        <TableCell className="border-r text-[11px] text-center bg-red-50/30">{r.special?.height || '-'}</TableCell>
                                                        
                                                        {/* Director Review */}
                                                        <TableCell className="bg-indigo-50/30 text-[11px] italic truncate max-w-[150px]" title={r.director_review?.comment_one || ''}>{r.director_review?.comment_one || '-'}</TableCell>
                                                        <TableCell className="bg-indigo-50/30 text-[11px] italic truncate max-w-[150px]" title={r.director_review?.comment_two || ''}>{r.director_review?.comment_two || '-'}</TableCell>
                                                        <TableCell className="bg-indigo-50/30 text-[11px] italic truncate max-w-[150px]" title={r.director_review?.comment_three || ''}>{r.director_review?.comment_three || '-'}</TableCell>
                                                        <TableCell className="border-r bg-indigo-50/30 text-[11px] italic truncate max-w-[150px]" title={r.director_review?.comment_four || ''}>{r.director_review?.comment_four || '-'}</TableCell>
                                                        
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1 transition-opacity">
                                                                {user?.permissions?.includes('delete_record') && (
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm" 
                                                                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                                                        onClick={() => setDeleteModal({ open: true, id: r.id })}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <ScrollBar orientation="horizontal" className="h-4 bg-muted border-t" />
                                </ScrollArea>

                                {/* Pagination Controls */}
                                <div className="p-4 bg-muted/20 border-t flex items-center justify-between no-print">
                                    <div className="flex items-center gap-4">
                                        <p className="text-sm font-bold text-muted-foreground">
                                            Total Results: <span className="text-foreground">{recordsData.total}</span>
                                        </p>
                                        <div className="h-4 w-px bg-border" />
                                        <p className="text-sm font-bold text-muted-foreground">
                                            Page <span className="text-foreground">{recordsData.current_page}</span> of <span className="text-foreground">{recordsData.pages}</span>
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="rounded-xl border-2 font-bold px-4"
                                            disabled={currentPage === 1 || loading}
                                            onClick={() => handlePageChange(currentPage - 1)}
                                        >
                                            <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="rounded-xl border-2 font-bold px-4"
                                            disabled={currentPage === recordsData.pages || loading}
                                            onClick={() => handlePageChange(currentPage + 1)}
                                        >
                                            Next <ChevronRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
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
        </MainLayout>
    );
};

export default ViewRecordsPage;
