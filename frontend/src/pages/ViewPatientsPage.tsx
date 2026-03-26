import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Edit, 
  Trash2, 
  Loader2,
  Filter,
  X,
  Plus,
  ChevronRight
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
    const { activeSection, activeYear } = useAppContext();
    const navigate = useNavigate();
    const [patients, setPatients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

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

    // Real-time search effect
    useEffect(() => {
        if (searchTerm.length > 1) {
            const fetchQuickResults = async () => {
                try {
                    const res = await axios.get(`http://localhost:5000/api/patients/search?q=${searchTerm}`, {
                        headers: { 'X-Company-Context': activeSection }
                    });
                    setSearchResults(res.data);
                } catch (err) {
                    console.error(err);
                }
            };
            const timer = setTimeout(fetchQuickResults, 300);
            return () => clearTimeout(timer);
        } else {
            setSearchResults([]);
        }
    }, [searchTerm, activeSection]);

    const handleSearch = () => {
        setSearchResults([]);
        fetchPatients(searchTerm);
    };

    const selectFromDropdown = (p: any) => {
        setSearchTerm(p.staff_id);
        setSearchResults([]);
        fetchPatients(p.staff_id);
    };

    const handleDelete = async (staffId: string) => {
        if (!window.confirm(`Are you sure you want to delete patient ${staffId}? This will remove them from the comprehensive database.`)) return;
        
        try {
            await axios.delete(`http://localhost:5000/api/patients/${staffId}`, {
                headers: { 'X-Company-Context': activeSection }
            });
            setPatients(prev => prev.filter(p => p.staff_id !== staffId));
            toast.success("Patient deleted successfully");
        } catch (err) {
            toast.error("Failed to delete patient");
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
                    
                    <div className="flex w-full lg:w-auto items-center gap-3 bg-muted/30 p-2 rounded-xl border-2 focus-within:border-emerald-500/50 transition-all relative">
                        <Search className="ml-2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            placeholder="Search Numeric Staff ID..." 
                            className="border-0 bg-transparent focus-visible:ring-0 min-w-[300px] text-lg font-bold"
                            value={searchTerm}
                            inputMode="numeric"
                            onChange={(e) => setSearchTerm(e.target.value.replace(/\D/g, ''))}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        {searchResults.length > 0 && (
                            <Card className="absolute top-full left-0 right-0 mt-2 bg-background border-2 shadow-2xl rounded-xl overflow-hidden z-[100] animate-in slide-in-from-top-2 duration-200">
                                {searchResults.map((p) => (
                                    <div 
                                        key={p.staff_id}
                                        onClick={() => selectFromDropdown(p)}
                                        className="p-3 hover:bg-emerald-50 cursor-pointer flex items-center justify-between group transition-colors border-b last:border-0"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-bold text-xs uppercase">
                                                {p.first_name[0]}{p.last_name[0]}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm tracking-tight">{p.first_name} {p.last_name}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase font-black">{p.staff_id}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                    </div>
                                ))}
                            </Card>
                        )}
                        <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 shadow-lg px-8 whitespace-nowrap font-bold h-11 rounded-xl" onClick={handleSearch} disabled={loading}>
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Retrieve Records'}
                        </Button>
                    </div>
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
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                                                                onClick={() => navigate(`/registration?edit=${p.staff_id}`)}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                onClick={() => handleDelete(p.staff_id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
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
            </div>
        </MainLayout>
    );
};

export default ViewPatientsPage;
