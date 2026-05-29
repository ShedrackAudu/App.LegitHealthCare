import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  UserGroupIcon, 
  Edit02Icon, 
  Delete02Icon, 
  Loading03Icon,
  PlusSignIcon,
  EyeIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon
} from '@hugeicons/core-free-icons';
import { PatientSearch } from '@/components/PatientSearch';
import { ActionConfirmModal } from '@/components/ActionConfirmModal';
import { PatientDetailsModal } from '@/components/PatientDetailsModal';
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
import { Badge } from "@/components/ui/badge";
import { useAppContext } from '@/context/AppContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const ViewPatientsPage: React.FC = () => {
    const { user, activeSection, activeYear } = useAppContext();
    const navigate = useNavigate();
    const [patients, setPatients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [perPage] = useState(25);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [deleteModal, setDeleteModal] = useState({ open: false, staffId: '' });
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const fetchPatients = async (query = searchQuery, targetPage = page) => {
        setLoading(true);
        try {
            const url = query 
                ? `/api/patients/search?q=${query}&page=${targetPage}&per_page=${perPage}`
                : `/api/patients/all?page=${targetPage}&per_page=${perPage}`;
            
            const response = await axios.get(url, {
                headers: { 'X-Company-Context': activeSection }
            });

            // Handle paginated response
            if (response.data && response.data.results) {
                setPatients(response.data.results);
                setTotalPages(response.data.pages);
                setTotalItems(response.data.total);
                setPage(response.data.current_page);
            } else {
                // Fallback for old format
                setPatients(Array.isArray(response.data) ? response.data : []);
                setTotalPages(1);
                setTotalItems(Array.isArray(response.data) ? response.data.length : 0);
            }
        } catch (err) {
            console.error("Failed to fetch patients", err);
            toast.error("Failed to load directory");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatients(searchQuery, 1);
    }, [activeSection, activeYear, user]);

    const handlePatientClick = (patient: any) => {
        setSelectedPatient(patient);
        setDetailsModalOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteModal.staffId) return;
        setDeleting(true);
        try {
            await axios.delete(`/api/patients/${deleteModal.staffId}`, {
                headers: { 'X-Company-Context': activeSection }
            });
            setPatients(prev => prev.filter(p => p.staff_id !== deleteModal.staffId));
            toast.success("Patient deleted successfully");
            setDeleteModal({ open: false, staffId: '' });
        } catch (err) {
            toast.error("Failed to delete patient");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Unified Search Header style matching Director Review */}
                <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 sm:gap-6 bg-card p-4 sm:p-6 rounded-2xl border transition-all">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl">
                            <HugeiconsIcon icon={UserGroupIcon} className="text-primary h-5 w-5 sm:h-8 sm:w-8" />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-2xl font-black tracking-tight">Patient Directory</h1>
                            <p className="text-[9px] sm:text-sm text-muted-foreground font-medium">Session: {activeYear} • {activeSection}</p>
                        </div>
                    </div>
                    
                    <PatientSearch
                        activeSection={activeSection}
                        onSearch={(q) => {
                            setSearchQuery(q);
                            fetchPatients(q, 1);
                        }}
                        onSelect={(p) => {
                            setSearchQuery(p.staff_id);
                            fetchPatients(p.staff_id, 1);
                        }}
                        searching={loading}
                        themeColor="emerald"
                        placeholder="Search Staff ID or Name..."
                        initialValue={searchQuery}
                    />
                </div>

                <Card className="border-2 shadow-xl overflow-hidden bg-card">
                    <div className="bg-muted/30 border-b p-4 flex justify-between items-center">
                        <div className="flex gap-2">
                             <Badge variant="outline" className="h-10 px-4 text-xs font-bold uppercase tracking-widest border-2">
                                Total: {totalItems} Patients
                            </Badge>
                        </div>
                        <Button variant="outline" size="sm" className="hidden sm:flex font-bold gap-2" onClick={() => navigate('/registration')}>
                            <HugeiconsIcon icon={PlusSignIcon} className="h-4 w-4" /> Add Patient
                        </Button>
                    </div>
                    <CardContent className="p-0">
                        {loading && patients.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                                <HugeiconsIcon icon={Loading03Icon} className="h-12 w-12 animate-spin text-primary" />
                                <p className="text-muted-foreground font-bold animate-pulse uppercase tracking-[0.2em] text-xs">Loading Directory...</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow className="hover:bg-transparent border-b-2">
                                            <TableHead className="w-[100px] font-black uppercase tracking-tighter text-[10px]">Staff ID</TableHead>
                                            <TableHead className="font-black uppercase tracking-tighter text-[10px]">First Name</TableHead>
                                            <TableHead className="font-black uppercase tracking-tighter text-[10px]">Middle Name</TableHead>
                                            <TableHead className="font-black uppercase tracking-tighter text-[10px]">Last Name</TableHead>
                                            <TableHead className="font-black uppercase tracking-tighter text-[10px]">Dept</TableHead>
                                            <TableHead className="font-black uppercase tracking-tighter text-[10px]">Gender</TableHead>
                                            <TableHead className="font-black uppercase tracking-tighter text-[10px]">DOB</TableHead>
                                            <TableHead className="font-black uppercase tracking-tighter text-[10px]">Age</TableHead>
                                            <TableHead className="font-black uppercase tracking-tighter text-[10px]">Phone</TableHead>
                                            <TableHead className="font-black uppercase tracking-tighter text-[10px]">Email</TableHead>
                                            <TableHead className="font-black uppercase tracking-tighter text-[10px]">Race</TableHead>
                                            <TableHead className="font-black uppercase tracking-tighter text-[10px]">Nationality</TableHead>
                                            <TableHead className="text-right font-black uppercase tracking-tighter text-[10px]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {patients.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={13} className="h-[28rem] border-0">
                                                    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                                                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-2 transition-transform hover:scale-110 duration-500">
                                                            <HugeiconsIcon icon={UserGroupIcon} className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/30" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <h3 className="text-xl font-black tracking-tight text-foreground/70">Directory Empty</h3>
                                                            <p className="text-sm text-muted-foreground font-medium italic max-w-xs mx-auto">
                                                                No patients found matching your search. Try adjusting the Staff ID or searching by name.
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-col items-center gap-2 pt-4">
                                                            <div className="h-px w-12 bg-muted-foreground/20" />
                                                            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-black">
                                                                Context: {activeSection} Clinic • {activeYear}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            patients.map((p) => (
                                                <TableRow 
                                                    key={p.staff_id} 
                                                    className="group hover:bg-muted/30 transition-colors cursor-pointer"
                                                    onClick={() => handlePatientClick(p)}
                                                >
                                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                                        <code className="bg-primary/10 text-primary px-2 py-1 rounded-md font-bold text-xs whitespace-nowrap">
                                                            {p.staff_id}
                                                        </code>
                                                    </TableCell>
                                                    <TableCell className="font-bold text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full overflow-hidden border border-primary/20 bg-muted shrink-0 flex items-center justify-center">
                                                                {p.passport_image ? (
                                                                    <img 
                                                                        src={p.passport_image.startsWith('http') || p.passport_image.startsWith('blob') || p.passport_image.startsWith('data') ? p.passport_image : `${(window as any).API_BASE_URL}${p.passport_image}`} 
                                                                        alt="Avatar" 
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <span className="text-[10px] font-black text-primary/60 uppercase">
                                                                        {p.first_name?.[0]}{p.last_name?.[0]}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span>{p.first_name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">{p.middle_name || '-'}</TableCell>
                                                    <TableCell className="font-bold text-xs">{p.last_name}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className="font-medium text-[10px] whitespace-nowrap">{p.department}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                            p.gender === 'Male' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                                                        }`}>
                                                            {p.gender}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-[10px]">{p.dob || 'N/A'}</TableCell>
                                                    <TableCell className="font-mono text-xs font-bold">{p.age}y</TableCell>
                                                    <TableCell className="text-[10px] font-medium whitespace-nowrap">{p.phone}</TableCell>
                                                    <TableCell className="text-[10px] font-medium text-muted-foreground italic truncate max-w-[120px]">{p.email || '-'}</TableCell>
                                                    <TableCell className="text-[10px] font-medium text-muted-foreground">{p.race || '-'}</TableCell>
                                                    <TableCell className="text-[10px] font-medium text-muted-foreground">{p.nationality || '-'}</TableCell>
                                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex justify-end gap-1 transition-opacity">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/5"
                                                                onClick={() => handlePatientClick(p)}
                                                            >
                                                                <HugeiconsIcon icon={EyeIcon} className="h-4 w-4" />
                                                            </Button>
                                                            {user?.permissions?.includes('edit_patient') && (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                                                                    onClick={() => navigate(`/registration?edit=${p.staff_id}`)}
                                                                >
                                                                    <HugeiconsIcon icon={Edit02Icon} className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            {user?.permissions?.includes('delete_patient') && (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                    onClick={() => setDeleteModal({ open: true, staffId: p.staff_id })}
                                                                >
                                                                    <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                    
                    {/* Pagination Footer */}
                    <div className="bg-muted/30 border-t p-4 flex items-center justify-between">
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            Page {page} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={page <= 1 || loading}
                                onClick={() => fetchPatients(searchQuery, page - 1)}
                                className="font-bold border-2"
                            >
                                <HugeiconsIcon icon={ArrowLeft01Icon} className="mr-2 h-4 w-4" /> Prev
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={page >= totalPages || loading}
                                onClick={() => fetchPatients(searchQuery, page + 1)}
                                className="font-bold border-2"
                            >
                                Next <HugeiconsIcon icon={ArrowRight01Icon} className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </Card>

                <ActionConfirmModal
                    isOpen={deleteModal.open}
                    onClose={() => setDeleteModal({ open: false, staffId: '' })}
                    onConfirm={handleDelete}
                    title="Delete Patient Record"
                    description={`Are you sure you want to delete patient ${deleteModal.staffId}? This will permanently remove them from the database.`}
                    confirmText="Delete Record"
                    variant="danger"
                    loading={deleting}
                />

                <PatientDetailsModal 
                    isOpen={detailsModalOpen} 
                    onClose={() => setDetailsModalOpen(false)} 
                    patient={selectedPatient} 
                />
            </div>
        </MainLayout>
    );
};

export default ViewPatientsPage;
