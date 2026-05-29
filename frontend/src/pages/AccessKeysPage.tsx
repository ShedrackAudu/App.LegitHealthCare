import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  KeyIcon, 
  PlusSignIcon, 
  History, 
  Loading03Icon, 
  UserIcon, 
  ShieldCheck, 
  ZapIcon,
  ShieldAlert,
  Delete02Icon
} from '@hugeicons/core-free-icons';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { useAppContext } from '@/context/AppContext';
import { ActionConfirmModal } from '@/components/ActionConfirmModal';

interface User {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    roles: string[];
}

interface Permission {
    id: number;
    name: string;
}

interface AccessCode {
    id: number;
    code: string;
    permission_name: string;
    generated_by_name: string;
    target_user_name: string | null;
    expires_at: string;
    is_revoked: boolean;
    is_multi_use: boolean;
}

const AccessKeysPage = () => {
    const { user } = useAppContext();
    const [users, setUsers] = useState<User[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteModal, setDeleteModal] = useState({ open: false, id: 0 });
    const [deleting, setDeleting] = useState(false);

    // Generation State
    const [targetPerm, setTargetPerm] = useState('');
    const [targetUser, setTargetUser] = useState<string>('all');
    const [targetDuration, setTargetDuration] = useState('60');
    const [isMultiUse, setIsMultiUse] = useState(false);
    const [generatingCode, setGeneratingCode] = useState(false);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const userId = searchParams.get('user_id');
        const perm = searchParams.get('permission');
        if (userId) setTargetUser(userId);
        if (perm) setTargetPerm(perm);
    }, [searchParams]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, permsRes, codesRes] = await Promise.all([
                axios.get('/api/admin/users'),
                axios.get('/api/admin/permissions'),
                axios.get('/api/admin/access-codes')
            ]);
            setUsers(usersRes.data);
            setPermissions(permsRes.data);
            setAccessCodes(codesRes.data);
        } catch (err) {
            console.error("Failed to fetch data:", err);
            toast.error("Failed to load security infrastructure data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleGenerateCode = async () => {
        if (!targetPerm) {
            toast.error("Please select a permission layer.");
            return;
        }

        setGeneratingCode(true);
        try {
            await axios.post('/api/admin/access-codes/generate', {
                permission_name: targetPerm,
                user_id: targetUser === 'all' ? null : targetUser,
                duration_minutes: parseInt(targetDuration),
                is_multi_use: isMultiUse
            });

            toast.success("Security Access Key generated successfully.");
            fetchData();
            // Reset state
            setTargetPerm('');
            setTargetUser('all');
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to generate access key.");
        } finally {
            setGeneratingCode(false);
        }
    };

    const handleRevokeCode = async (id: number) => {
        try {
            await axios.put(`/api/admin/access-codes/${id}/revoke`, {});
            toast.success("Access Key successfully revoked.");
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to revoke key.");
        }
    };

    const handleDeleteCode = async () => {
        const id = deleteModal.id;
        if (!id) return;
        setDeleting(true);
        try {
            await axios.delete(`/api/admin/access-codes/${id}`);
            toast.success("Access Key record deleted.");
            setDeleteModal({ open: false, id: 0 });
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to delete key.");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 sm:gap-6 bg-card p-4 sm:p-6 rounded-2xl border transition-all">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="p-1.5 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl text-primary shrink-0">
                            <HugeiconsIcon icon={KeyIcon} className="h-5 w-5 sm:h-8 sm:w-8 font-black" />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-2xl font-black tracking-tight text-primary uppercase leading-tight">Security Access Keys</h1>
                            <p className="text-[9px] sm:text-sm text-muted-foreground font-medium">
                                Temporary authentication overrides for clinical and administrative staff.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Generator Card */}
                    <Card className="lg:col-span-1 border-2 shadow-xl rounded-2xl h-fit border-primary/10 overflow-hidden">
                        <CardHeader className="bg-primary/[0.03] border-b pb-4">
                            <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                                <HugeiconsIcon icon={ZapIcon} className="w-5 h-5 text-primary" /> Generate New Token
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Permission Scope</Label>
                                <Select onValueChange={setTargetPerm} value={targetPerm}>
                                    <SelectTrigger className="rounded-xl border-2 h-12 text-xs font-black uppercase tracking-tight focus:ring-primary/20">
                                        <SelectValue placeholder="Select Required Permission" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-2 shadow-2xl max-h-[300px] overflow-y-auto">
                                        {permissions.map(p => (
                                            <SelectItem key={p.id} value={p.name} className="text-[10px] font-black uppercase tracking-widest py-3">
                                                {p.name.replace(/_/g, ' ')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Target Personnel (Restriction)</Label>
                                <Select onValueChange={setTargetUser} value={targetUser}>
                                    <SelectTrigger className="rounded-xl border-2 h-12 text-xs font-black uppercase tracking-tight focus:ring-primary/20">
                                        <SelectValue placeholder="Any Authorized User" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-2 shadow-2xl">
                                        <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest py-3 text-primary">Public (Any Unit)</SelectItem>
                                        {users.filter(u => !u.roles.includes('Patient')).map(u => (
                                            <SelectItem key={u.id} value={u.id.toString()} className="text-[10px] font-black uppercase tracking-widest py-3">
                                                @{u.username} ({u.first_name} {u.last_name[0]}.)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Duration (Min)</Label>
                                    <Input 
                                        type="number" 
                                        value={targetDuration}
                                        onChange={(e) => setTargetDuration(e.target.value)}
                                        className="rounded-xl border-2 h-12 text-sm font-black focus-visible:ring-primary/20"
                                    />
                                </div>
                                <div className="space-y-2 flex flex-col justify-end">
                                    <div className="flex items-center space-x-2 pb-3">
                                        <Checkbox id="multi-use-pg" checked={isMultiUse} onCheckedChange={(val: boolean) => setIsMultiUse(val)} className="rounded-md border-2" />
                                        <Label htmlFor="multi-use-pg" className="text-[10px] font-black uppercase tracking-tight cursor-pointer">Multi-Use</Label>
                                    </div>
                                </div>
                            </div>

                            <Button 
                                onClick={handleGenerateCode} 
                                disabled={generatingCode} 
                                className="w-full rounded-2xl font-black text-xs h-14 shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
                            >
                                {generatingCode ? <HugeiconsIcon icon={Loading03Icon} className="w-5 h-5 animate-spin" /> : <HugeiconsIcon icon={PlusSignIcon} className="w-5 h-5" />}
                                SECURE GENERATE
                            </Button>
                        </CardContent>
                    </Card>

                    {/* History Table */}
                    <Card className="lg:col-span-2 border-2 shadow-xl rounded-2xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 gap-3">
                            <CardTitle className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2 shrink-0">
                                <HugeiconsIcon icon={History} className="w-5 h-5 text-primary shrink-0" /> Active & Historical Keys
                            </CardTitle>
                            <Badge variant="outline" className="font-black text-[9px] sm:text-[10px] bg-primary/5 text-primary border-primary/20 py-1.5 px-3">
                                {accessCodes.length} KEYS LOGGED
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/10">
                                        <TableRow className="border-b-2 hover:bg-transparent">
                                            <TableHead className="font-black text-[10px] uppercase text-muted-foreground/60 py-5 pl-6">Access Code</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase text-muted-foreground/60 py-5">Clearance Level</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase text-muted-foreground/60 py-5">Target User</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase text-muted-foreground/60 py-5 text-center">Usage Type</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase text-muted-foreground/60 py-5 text-center">Security Status</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase text-muted-foreground/60 py-5 text-right pr-6">Management</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-64 text-center">
                                                    <HugeiconsIcon icon={Loading03Icon} className="w-8 h-8 animate-spin mx-auto text-primary/20" />
                                                </TableCell>
                                            </TableRow>
                                        ) : accessCodes.map(code => (
                                            <TableRow key={code.id} className="border-b group hover:bg-muted/5 transition-colors">
                                                <TableCell className="py-5 pl-6">
                                                    <div className="flex flex-col">
                                                        <span className="font-mono font-black text-primary text-base tracking-tighter">{code.code}</span>
                                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Expires: {code.expires_at ? format(new Date(code.expires_at), 'MM/dd HH:mm') : 'N/A'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black uppercase tracking-tight text-foreground">{code.permission_name.replace(/_/g, ' ')}</span>
                                                        <span className="text-[9px] font-bold text-muted-foreground italic">By {code.generated_by_name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-5">
                                                    <div className="flex items-center gap-2">
                                                        {code.target_user_name && code.target_user_name !== 'Universal' ? (
                                                            <Badge variant="outline" className="font-black text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20 py-0.5">
                                                                <HugeiconsIcon icon={UserIcon} className="w-3 h-3 mr-1" />
                                                                {code.target_user_name}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="font-black text-[9px] bg-primary/10 text-primary border-primary/20 py-0.5">
                                                                <HugeiconsIcon icon={ShieldCheck} className="w-3 h-3 mr-1" />
                                                                Universal
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center py-5">
                                                    {code.is_multi_use ? (
                                                        <Badge variant="outline" className="font-black text-[9px] bg-indigo-500/10 text-indigo-600 border-indigo-500/20 py-0.5">
                                                            <HugeiconsIcon icon={ZapIcon} className="w-3 h-3 mr-1" />
                                                            Multi-Use
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="font-black text-[9px] bg-slate-500/10 text-slate-600 border-slate-500/20 py-0.5">
                                                            <HugeiconsIcon icon={ShieldAlert} className="w-3 h-3 mr-1" />
                                                            Single-Use
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center py-5">
                                                    {(() => {
                                                        const isExpired = code.expires_at && new Date(code.expires_at) < new Date();
                                                        if (code.is_revoked) {
                                                            return (
                                                                <Badge variant="destructive" className="font-black text-[9px] px-3 py-1 rounded-full border shadow-sm bg-rose-500 text-white">
                                                                    REVOKED
                                                                </Badge>
                                                            );
                                                        } else if (isExpired) {
                                                            return (
                                                                <Badge variant="outline" className="font-black text-[9px] px-3 py-1 rounded-full border shadow-sm bg-slate-500/10 text-slate-500 border-slate-500/20">
                                                                    EXPIRED
                                                                </Badge>
                                                            );
                                                        } else {
                                                            return (
                                                                <Badge variant="outline" className="font-black text-[9px] px-3 py-1 rounded-full border shadow-sm bg-primary/10 text-primary border-primary/20">
                                                                    ACTIVE
                                                                </Badge>
                                                            );
                                                        }
                                                    })()}
                                                </TableCell>
                                                <TableCell className="text-right py-5 pr-6">
                                                    <div className="flex justify-end gap-2">
                                                        {!code.is_revoked && (
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                onClick={() => handleRevokeCode(code.id)}
                                                                className="h-8 text-[9px] font-black border-rose-500/20 text-rose-600 hover:bg-rose-500 hover:text-white rounded-lg transition-all"
                                                            >
                                                                REVOKE
                                                            </Button>
                                                        )}
                                                        <Button 
                                                            type="button" 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            onClick={() => setDeleteModal({ open: true, id: code.id })}
                                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive rounded-lg"
                                                        >
                                                            <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {accessCodes.length === 0 && !loading && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-64 text-center">
                                                    <div className="flex flex-col items-center gap-3 opacity-20">
                                                        <HugeiconsIcon icon={ShieldAlert} className="w-12 h-12" />
                                                        <p className="font-black uppercase tracking-widest text-xs">No active access overrides found.</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <ActionConfirmModal
                    isOpen={deleteModal.open}
                    onClose={() => setDeleteModal({ open: false, id: 0 })}
                    onConfirm={handleDeleteCode}
                    title="Delete Access Key"
                    description="Are you sure you want to permanently remove this access key record? This action cannot be undone."
                    confirmText="Delete Record"
                    variant="danger"
                    loading={deleting}
                />
            </div>
        </MainLayout>
    );
};

export default AccessKeysPage;
