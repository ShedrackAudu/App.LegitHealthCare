import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldCheck, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAppContext } from '@/context/AppContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ActionConfirmModal } from '@/components/ActionConfirmModal';

const RolePermissionPage: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [creatingRole, setCreatingRole] = useState(false);
  const { user } = useAppContext();

  // New Role Form State
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, id: 0, name: '' });
  const [deleting, setDeleting] = useState(false);


  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesResp, permsResp] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/roles', {
            headers: { 'X-User-ID': user?.id?.toString() }
        }),
        axios.get('http://localhost:5000/api/admin/permissions', {
            headers: { 'X-User-ID': user?.id?.toString() }
        })
      ]);
      setRoles(rolesResp.data);
      setPermissions(permsResp.data);
    } catch (err) {
      toast.error("Failed to fetch administrative data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTogglePermission = (roleId: number, permName: string) => {
    setRoles(prevRoles => prevRoles.map(role => {
      if (role.id === roleId) {
        const hasPerm = role.permissions.includes(permName);
        const newPermissions = hasPerm 
          ? role.permissions.filter((p: string) => p !== permName)
          : [...role.permissions, permName];
        return { ...role, permissions: newPermissions };
      }
      return role;
    }));
  };

  const saveRolePermissions = async (role: any) => {
    setSaving(role.name);
    try {
      await axios.post(`http://localhost:5000/api/admin/roles/${role.id}/permissions`, {
        permissions: role.permissions
      }, {
        headers: { 'X-User-ID': user?.id?.toString() }
      });
      toast.success(`Permissions for ${role.name} updated.`);
      fetchData(); // Refresh to sync
    } catch (err) {
      toast.error(`Failed to update ${role.name}.`);
    } finally {
      setSaving(null);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingRole(true);
    try {
        await axios.post('http://localhost:5000/api/admin/roles', {
            name: newRoleName,
            description: newRoleDesc
        }, {
            headers: { 'X-User-ID': user?.id?.toString() }
        });
        toast.success("Role created successfully.");
        setNewRoleName('');
        setNewRoleDesc('');
        fetchData();
    } catch (err: any) {
        toast.error(err.response?.data?.error || "Failed to create role.");
    } finally {
        setCreatingRole(false);
    }
  };

  const handleDeleteRole = async () => {
    const { id: roleId, name: roleName } = deleteModal;
    if (!roleId) return;

    setDeleting(true);
    try {
        const headers = { 'X-User-ID': user?.id?.toString() };
        await axios.delete(`http://localhost:5000/api/admin/roles/${roleId}`, { headers });
        toast.success(`Role '${roleName}' deleted successfully.`);
        setDeleteModal({ open: false, id: 0, name: '' });
        fetchData(); // Refresh list
    } catch (err: any) {
        toast.error(err.response?.data?.error || "Failed to delete role.");
    } finally {
        setDeleting(false);
    }
  };


  if (loading) {
    return (
      <MainLayout>
        <div className="h-[60vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black tracking-tight">System Access Control</h1>
            <p className="text-muted-foreground font-medium italic mt-1">Manage roles, granular permissions, and security entrance keys.</p>
          </div>
          <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black uppercase text-primary tracking-widest">Security Override Enabled</span>
          </div>
        </div>

        <Tabs defaultValue="matrix" className="w-full">
          <TabsList className="grid grid-cols-2 w-full md:w-[400px] mb-8 bg-muted/20 p-1 border-2 rounded-2xl h-14">
            <TabsTrigger value="matrix" className="rounded-xl font-black text-xs gap-2 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all h-full">
               <ShieldCheck className="w-4 h-4" /> Role Matrix
            </TabsTrigger>
            <TabsTrigger value="create" className="rounded-xl font-black text-xs gap-2 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all h-full">
               <Plus className="w-4 h-4" /> Add Role
            </TabsTrigger>
          </TabsList>

          <TabsContent value="matrix" className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 gap-6">
              {roles.map(role => (
                <Card key={role.id} className="border-2 shadow-sm overflow-hidden group hover:border-primary/30 transition-all rounded-2xl">
                   <CardHeader className="bg-muted/5 border-b flex flex-row items-center justify-between py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div>
                          <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2 uppercase">
                            {role.name}
                          </CardTitle>
                          <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                            {role.description || "Administrative access profile"}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setSelectedRole(role)} // Assuming setSelectedRole is defined elsewhere if needed
                            className={`h-8 w-8 p-0 rounded-lg transition-all ${selectedRole?.id === role.id ? 'bg-primary/10 text-primary' : 'hover:bg-primary/5'}`}
                          >
                            <ShieldAlert className="h-4 w-4" />
                          </Button> */}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                                if (role.name.toLowerCase() === 'admin') {
                                    toast.error("The core Admin role cannot be deleted.");
                                    return;
                                }
                                setDeleteModal({ open: true, id: role.id, name: role.name });
                            }}
                            disabled={role.name.toLowerCase() === 'admin'}
                            className="h-8 w-8 p-0 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Button 
                        onClick={() => saveRolePermissions(role)}
                        disabled={saving === role.name}
                        className="rounded-xl font-black text-xs gap-2 shadow-lg shadow-emerald-500/20 bg-emerald-500 hover:bg-emerald-600 transition-all border-none"
                      >
                        {saving === role.name ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Assign Roles
                      </Button>
                   </CardHeader>
                   <CardContent className="p-6">
                      <div className="grid grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 gap-y-8 gap-x-6">
                        {permissions.map(perm => {
                          const isAssigned = role.permissions.includes(perm.name);
                          return (
                            <div key={perm.id} className="flex items-start space-x-3 group/item">
                              <Checkbox 
                                id={`role-${role.id}-perm-${perm.id}`}
                                checked={isAssigned}
                                onCheckedChange={() => handleTogglePermission(role.id, perm.name)}
                                className="mt-1 border-2 h-5 w-5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                              <div className="grid gap-1.5 leading-none pt-1">
                                <label
                                  htmlFor={`role-${role.id}-perm-${perm.id}`}
                                  className="text-[11px] font-black leading-tight cursor-pointer group-hover/item:text-primary transition-colors uppercase tracking-tight"
                                >
                                  {perm.name.replace(/_/g, ' ')}
                                </label>
                                <p className="text-[9px] text-muted-foreground font-medium italic opacity-70">
                                  {perm.description || 'System right.'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                   </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="create" className="animate-in slide-in-from-bottom-2 duration-300">
            <Card className="max-w-xl mx-auto border-2 shadow-xl rounded-2xl overflow-hidden mt-10">
                <CardHeader className="bg-muted/5 border-b pt-8 pb-6 text-center">
                    <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
                        <Plus className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-black uppercase tracking-tight">Create New Role</CardTitle>
                    <CardDescription className="text-xs font-bold font-medium italic">Define architectural access buckets for your team</CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                    <form onSubmit={handleCreateRole} className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Role Primary Tag</Label>
                            <Input 
                                placeholder="E.g. REGISTRAR, SURGEON..." 
                                value={newRoleName}
                                onChange={(e) => setNewRoleName(e.target.value.toUpperCase())}
                                className="rounded-xl border-2 font-black tracking-tight focus-visible:ring-primary/20 h-12"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Description</Label>
                            <Input 
                                placeholder="What can this role do?" 
                                value={newRoleDesc}
                                onChange={(e) => setNewRoleDesc(e.target.value)}
                                className="rounded-xl border-2 font-medium italic focus-visible:ring-primary/20 h-12 text-sm"
                            />
                        </div>
                        <Button className="w-full h-14 rounded-2xl font-black text-sm gap-2 mt-4 shadow-xl shadow-primary/20 transition-all border-none" disabled={creatingRole}>
                            {creatingRole ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Create & Finalize Role
                        </Button>
                    </form>
                </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        <ActionConfirmModal
            isOpen={deleteModal.open}
            onClose={() => setDeleteModal({ open: false, id: 0, name: '' })}
            onConfirm={handleDeleteRole}
            title="Delete System Role"
            description={`Are you sure you want to delete the role '${deleteModal.name}'? This action cannot be undone and may affect users assigned to this role.`}
            confirmText="Delete Role"
            variant="danger"
            loading={deleting}
        />
      </div>
    </MainLayout>
  );
};

export default RolePermissionPage;
