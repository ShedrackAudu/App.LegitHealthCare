import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Edit, 
  Trash2, 
  Loader2,
  Plus
} from 'lucide-react';
import { PatientSearch } from '@/components/PatientSearch';
import { ActionConfirmModal } from '@/components/ActionConfirmModal';
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
    const [deleteModal, setDeleteModal] = useState({ open: false, staffId: '' });
    const [deleting, setDeleting] = useState(false);

    const fetchPatients = async (query = '') => {
        setLoading(true);
        try {
            const url = query 
                ? `http://localhost:5000/api/patients/all?q=${query}`
                : 'http://localhost:5000/api/patients/all';
            const response = await axios.get(url, {
                headers: { 'X-Company-Context': activeSection }
            });
            setPatients(response.data);
        } catch (err) {
            console.error("Failed to fetch patients", err);
            toast.error("Failed to load directory");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPatients();
    }, [activeSection, activeYear]);

    // REMOVED deprecated ad-hoc search logic




    const handleDelete = async () => {
        if (!deleteModal.staffId) return;
        setDeleting(true);
        try {
            await axios.delete(`http://localhost:5000/api/patients/${deleteModal.staffId}`, {
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
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card p-6 rounded-2xl border-2 shadow-xl border-emerald-500/10 transition-all">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl">
                            <Users className="text-emerald-600 h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight">Patient Directory</h1>
                            <p className="text-sm text-muted-foreground font-medium">Session: {activeYear} • {activeSection}</p>
                        </div>
                    </div>
                    
                    <PatientSearch
                        activeSection={activeSection}
                        onSearch={fetchPatients}
                        onSelect={(p) => fetchPatients(p.staff_id)}
                        searching={loading}
                        themeColor="emerald"
                        placeholder="Search Staff ID or Name..."
                        initialValue=""
                    />
                </div>

                <Card className="border-2 shadow-xl overflow-hidden bg-card">
                    <div className="bg-muted/30 border-b p-4 flex justify-between items-center">
                        <div className="flex gap-2">
                            <Badge variant="outline" className="h-10 px-4 text-xs font-bold uppercase tracking-widest border-2">
                                Total: {patients.length} Patients
                            </Badge>
                        </div>
                        <Button variant="outline" size="sm" className="font-bold gap-2" onClick={() => navigate('/registration')}>
                            <Plus className="h-4 w-4" /> Add Patient
                        </Button>
                    </div>
                    <CardContent className="p-0">
                        {loading && patients.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
                                                <TableCell colSpan={13} className="h-32 text-center text-muted-foreground italic">
                                                    No patients found matching your search.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            patients.map((p) => (
                                                <TableRow key={p.staff_id} className="group hover:bg-muted/30 transition-colors">
                                                    <TableCell>
                                                        <code className="bg-primary/10 text-primary px-2 py-1 rounded-md font-bold text-xs whitespace-nowrap">
                                                            {p.staff_id}
                                                        </code>
                                                    </TableCell>
                                                    <TableCell className="font-bold text-xs">{p.first_name}</TableCell>
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
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1 transition-opacity">
                                                            {user?.permissions?.includes('edit_patient') && (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                                                                    onClick={() => navigate(`/registration?edit=${p.staff_id}`)}
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            {user?.permissions?.includes('delete_patient') && (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                    onClick={() => setDeleteModal({ open: true, staffId: p.staff_id })}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
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
            </div>
        </MainLayout>
    );
};

export default ViewPatientsPage;
