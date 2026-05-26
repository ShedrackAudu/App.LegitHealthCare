import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ShieldCheck, Save, Loader2, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAppContext } from '@/context/AppContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ActionConfirmModal } from '@/components/ActionConfirmModal';

const AccordionRole = ({ role, permissions, isAdminRole, onTogglePermission, onSave, onDelete, saving }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Card className={`border-2 shadow-sm overflow-hidden transition-all duration-300 rounded-2xl group ${isOpen ? 'border-primary/30 ring-4 ring-primary/5' : 'hover:border-primary/20'}`}>
      <div 
        className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${isOpen ? 'bg-primary/[0.03] border-b-2 border-primary/10' : 'hover:bg-muted/30'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-xl transition-all duration-300 ${isOpen ? 'bg-primary text-primary-foreground rotate-0' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
            {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
              {role.name}
              {isAdminRole && <ShieldCheck className="h-4 w-4 text-rose-500" />}
            </h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
              {role.description || "Administrative access profile"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
           <div className="hidden sm:flex flex-col items-end mr-4">
              <span className="text-[9px] font-black uppercase text-muted-foreground/50 tracking-tighter">Active Permissions</span>
              <span className="text-xs font-black text-primary">{role.permissions.length}</span>
           </div>
           <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={isAdminRole}
            className="h-9 w-9 p-0 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-20 transition-all"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
        <CardContent className="p-6 bg-background">
          <div className="grid grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5 gap-y-8 gap-x-6 max-h-[400px] overflow-y-auto lg:max-h-none lg:overflow-visible pr-2 custom-scrollbar">
            {isAdminRole && (
              <div className="col-span-full bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 flex gap-3 mb-2">
                <ShieldCheck className="h-5 w-5 text-rose-500 shrink-0" />
                <p className="text-[10px] text-rose-700 leading-relaxed font-black uppercase tracking-wider">
                  Architectural Safeguard Active: The core Admin role's access tokens are immutable to ensure system-wide operational stability.
                </p>
              </div>
            )}
            {permissions.map((perm: any) => {
              const isAssigned = role.permissions.includes(perm.name);
              return (
                <div key={perm.id} className={`flex items-start space-x-3 group/item ${isAdminRole ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  <Checkbox
                    id={`role-${role.id}-perm-${perm.id}`}
                    checked={isAssigned}
                    onCheckedChange={() => !isAdminRole && onTogglePermission(role.id, perm.name)}
                    disabled={isAdminRole}
                    className="mt-1 border-2 h-5 w-5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <div className="grid gap-1.5 leading-none pt-1">
                    <label
                      htmlFor={`role-${role.id}-perm-${perm.id}`}
                      className={`text-[11px] font-black leading-tight uppercase tracking-tight ${isAdminRole ? 'cursor-not-allowed' : 'cursor-pointer group-hover/item:text-primary transition-colors'}`}
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

          {!isAdminRole && (
            <div className="mt-8 pt-6 border-t flex justify-end">
              <Button
                onClick={onSave}
                disabled={saving}
                className="h-12 px-8 rounded-xl font-black text-xs gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary transition-all border-none disabled:opacity-30 disabled:grayscale"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Assign Roles
              </Button>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
};

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
        axios.get('/api/admin/roles'),
        axios.get('/api/admin/permissions')
      ]);
      setRoles(rolesResp.data);
      setPermissions(permsResp.data.sort((a: any, b: any) => a.name.localeCompare(b.name)));
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
      await axios.post(`/api/admin/roles/${role.id}/permissions`, {
        permissions: role.permissions
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
      await axios.post('/api/admin/roles', {
        name: newRoleName,
        description: newRoleDesc
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
      await axios.delete(`/api/admin/roles/${roleId}`);
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
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 sm:gap-6 bg-card p-4 sm:p-6 rounded-2xl border-2 shadow-xl border-primary/10 transition-all">
          <div className="flex items-center gap-3">
            <div className="p-1.5 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl text-primary">
              <ShieldCheck className="h-5 w-5 sm:h-8 sm:w-8" />
            </div>
            <div>
              <h1 className="text-base sm:text-2xl font-black tracking-tight text-foreground uppercase">System Access Control</h1>
              <p className="text-[9px] sm:text-sm text-muted-foreground font-medium">Manage roles, granular permissions, and security entrance keys.</p>
            </div>
          </div>
          <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start lg:w-fit shrink-0 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-[9px] sm:text-[11px] font-black uppercase text-primary tracking-[0.15em] leading-none">Security Override Enabled</span>
          </div>
        </div>

        <Tabs defaultValue="matrix" className="w-full">
          <TabsList className="grid grid-cols-2 w-full md:w-[450px] mb-8 bg-muted/20 p-1.5 border-2 rounded-2xl h-auto min-h-[64px]">
            <TabsTrigger value="matrix" className="rounded-xl font-black text-xs gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all h-full">
              <ShieldCheck className="w-4 h-4" /> Role Matrix
            </TabsTrigger>
            <TabsTrigger value="create" className="rounded-xl font-black text-xs gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all h-full">
              <Plus className="w-4 h-4" /> Add Role
            </TabsTrigger>
          </TabsList>

          <TabsContent value="matrix" className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-4">
              {roles.map(role => {
                const isAdminRole = role.name.toLowerCase() === 'admin';
                return (
                  <AccordionRole 
                    key={role.id}
                    role={role}
                    permissions={permissions}
                    isAdminRole={isAdminRole}
                    onTogglePermission={handleTogglePermission}
                    onSave={() => saveRolePermissions(role)}
                    onDelete={() => setDeleteModal({ open: true, id: role.id, name: role.name })}
                    saving={saving === role.name}
                  />
                );
              })}
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
