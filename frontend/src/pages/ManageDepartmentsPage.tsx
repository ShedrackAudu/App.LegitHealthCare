import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Building2, Plus, Loader2 } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { ActionConfirmModal } from '@/components/ActionConfirmModal';
import { toast } from 'react-hot-toast';
import axios from 'axios';

interface Department {
    id: number;
    name: string;
}

const ManageDepartmentsPage: React.FC = () => {
    const { activeSection } = useAppContext();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [newDept, setNewDept] = useState('');
    const [deleteModal, setDeleteModal] = useState({ open: false, id: 0, name: '' });
    const [deleting, setDeleting] = useState(false);

    const fetchDepartments = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/departments`, {
                headers: { 'X-Company-Context': activeSection }
            });
            setDepartments(response.data);
        } catch (err) {
            toast.error("Failed to load departments");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeSection) {
            fetchDepartments();
        }
    }, [activeSection]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = newDept.trim();
        if (!trimmedName) return;

        setAdding(true);
        try {
            const resp = await axios.post(`/api/departments`,
                { name: trimmedName },
                { headers: { 'X-Company-Context': activeSection } }
            );
            toast.success("Department added successfully");
            setDepartments([...departments, { id: resp.data.id, name: resp.data.name }].sort((a,b) => a.name.localeCompare(b.name)));
            setNewDept('');
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to add department");
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async () => {
        const { id, name } = deleteModal;
        if (!id) return;
        setDeleting(true);
        try {
            await axios.delete(`/api/departments/${id}`, {
                headers: { 'X-Company-Context': activeSection }
            });
            toast.success("Department deleted");
            setDepartments(departments.filter(d => d.id !== id));
            setDeleteModal({ open: false, id: 0, name: '' });
        } catch (err) {
            toast.error("Failed to delete department");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <MainLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                        <Building2 className="text-primary h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Manage Departments</h1>
                        <p className="text-sm text-muted-foreground font-medium">Configure registration dropdowns for {activeSection} Clinic.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="col-span-1 border-2 shadow-lg h-fit">
                        <CardHeader className="bg-muted/30 border-b pb-4">
                            <CardTitle className="text-lg">Add New Department</CardTitle>
                            <CardDescription>Enter a new department name to add it to the system.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={handleAdd} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Department Name</Label>
                                    <Input 
                                        placeholder="e.g. Neurology" 
                                        value={newDept}
                                        onChange={(e) => setNewDept(e.target.value)}
                                        className="h-11 font-semibold"
                                    />
                                </div>
                                <Button type="submit" className="w-full h-11 font-bold shadow-md" disabled={adding || !newDept.trim()}>
                                    {adding ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Plus className="mr-2 h-5 w-5" /> Add Department</>}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="col-span-1 md:col-span-2 border-2 shadow-lg">
                        <CardHeader className="bg-primary/5 border-b pb-4 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">Existing Departments</CardTitle>
                                <CardDescription>Managing lists for {activeSection}</CardDescription>
                            </div>
                            <div className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-sm">
                                {departments.length}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="h-64 flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                                </div>
                            ) : departments.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-4">
                                    <Building2 className="h-16 w-16" />
                                    <p className="text-xl font-bold">No Departments Found</p>
                                </div>
                            ) : (
                                <div className="max-h-[600px] overflow-y-auto w-full">
                                    {departments.map(dept => (
                                        <div key={dept.id} className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-muted/50 transition-colors">
                                            <span className="font-semibold text-lg">{dept.name}</span>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteModal({ open: true, id: dept.id, name: dept.name })}>
                                                <Trash2 className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <ActionConfirmModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, id: 0, name: '' })}
                onConfirm={handleDelete}
                title="Delete Department"
                description={`Are you sure you want to delete the department '${deleteModal.name}'? This may affect historical records linked to this department.`}
                confirmText="Delete Department"
                variant="danger"
                loading={deleting}
            />
        </MainLayout>
    );
};

export default ManageDepartmentsPage;
