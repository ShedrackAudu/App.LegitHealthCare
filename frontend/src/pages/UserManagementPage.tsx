import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import {
  Users,
  Search,
  UserCog,
  Shield,
  Mail,
  Phone,
  MoreVertical,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Key,
  Calendar,
  RefreshCw,
  X,
  Loader2,
  Lock
} from 'lucide-react';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/context/AppContext';
import { ActionConfirmModal } from '@/components/ActionConfirmModal';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone: string;
  is_verified: boolean;
  roles: string[];
  permissions: string[];
  created_at: string;
  last_seen_at?: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
}

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAppContext();
  const navigate = useNavigate();
  const [userRolesInput, setUserRolesInput] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone: '',
    roles: [] as string[]
  });
  const [confirmDeactivation, setConfirmDeactivation] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null
  });
  const [deactivating, setDeactivating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'X-User-ID': user?.id?.toString() || '' };
      const [usersRes, rolesRes] = await Promise.all([
        axios.get('/api/admin/users', { headers }),
        axios.get('/api/admin/roles', { headers })
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (err) {
      console.error("Fetch failed:", err);
      toast.error("Failed to load users or roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(u =>
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    setIsSubmitting(true);
    try {
      const headers = { 'X-User-ID': user?.id?.toString() || '' };
      await axios.post(`/api/admin/users/${selectedUser.id}/reset-password`, {
        password: newPassword
      }, { headers });
      toast.success(`Password for @${selectedUser.username} reset successfully.`);
      setIsResetModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = (action: string, u: User) => {
    setSelectedUser(u);
    if (action === 'roles') {
      setUserRolesInput(u.roles);
      setIsEditModalOpen(true);
    } else if (action === 'reset') {
      setNewPassword(''); // Clear previous password
      setConfirmPassword('');
      setIsResetModalOpen(true);
    } else if (action === 'deactivate') {
      setConfirmDeactivation({ open: true, user: u });
    }
  };

  const handleToggleRole = (roleName: string) => {
    setUserRolesInput(prev =>
      prev.includes(roleName)
        ? prev.filter(r => r !== roleName)
        : [...prev, roleName]
    );
  };

  const handleSaveRoles = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const headers = { 'X-User-ID': user?.id?.toString() || '' };
      await axios.post(`/api/admin/users/${selectedUser.id}/roles`, {
        roles: userRolesInput
      }, { headers });
      toast.success("User roles updated successfully");
      setIsEditModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Update failed:", err);
      toast.error("Failed to update roles");
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.first_name || !newUser.last_name || !newUser.username || !newUser.email || !newUser.phone) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      const headers = { 'X-User-ID': user?.id?.toString() || '' };
      await axios.post('/api/admin/users', newUser, { headers });
      toast.success(`User @${newUser.username} created and welcome email sent!`);
      setIsAddModalOpen(false);
      setNewUser({ first_name: '', last_name: '', username: '', email: '', phone: '', roles: [] });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivateUser = async () => {
    const targetUser = confirmDeactivation.user;
    if (!targetUser) return;

    if (targetUser.username === 'admin') {
      toast.error("Security Lock: Primary Administrator cannot be deactivated.");
      setConfirmDeactivation({ open: false, user: null });
      return;
    }

    setDeactivating(true);
    try {
      const headers = { 'X-User-ID': user?.id?.toString() || '' };
      await axios.delete(`/api/admin/users/${targetUser.id}`, { headers });
      toast.success(`Account @${targetUser.username} deactivated.`);
      setConfirmDeactivation({ open: false, user: null });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to deactivate account.");
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">User Management</h1>
            <p className="text-muted-foreground italic">Comprehensive directory of clinical personnel and registered patients.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Reload
            </Button>
            <Button size="sm" className="gap-2 shadow-lg shadow-primary/20" onClick={() => setIsAddModalOpen(true)}>
              <UserCog className="h-4 w-4" />
              Add User
            </Button>
          </div>
        </div>

        <Tabs defaultValue="staff" className="w-full">
          <TabsList className="flex flex-wrap bg-muted/50 p-1 mb-6 border-2 border-border/50 rounded-2xl h-auto min-h-[56px] w-fit mx-auto md:mx-0 overflow-hidden">
            <TabsTrigger value="staff" className="flex-1 md:flex-none rounded-xl px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg font-bold transition-all whitespace-nowrap">
              Clinical Staff
            </TabsTrigger>
            <TabsTrigger value="patient" className="flex-1 md:flex-none rounded-xl px-8 h-11 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg font-bold transition-all whitespace-nowrap">
              Patient Directory
            </TabsTrigger>
          </TabsList>

          <TabsContent value="staff">
            <Card className="border-2 shadow-xl overflow-hidden bg-card/50 backdrop-blur-sm">
              <CardHeader className="bg-muted/30 border-b">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <Users className="h-5 w-5" />
                      Staff Directory
                    </CardTitle>
                    <CardDescription>Filtering {filteredUsers.filter(u => !u.roles.includes('Patient')).length} of {users.filter(u => !u.roles.includes('Patient')).length} total personnel.</CardDescription>
                  </div>
                  <div className="flex w-full md:w-auto items-center gap-3 bg-muted/30 p-2 rounded-xl border-2 focus-within:border-primary/50 transition-all relative">
                    <Search className="ml-2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Search staff..."
                      className="border-0 bg-transparent focus-visible:ring-0 min-w-[300px] text-lg font-bold"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <UserTable
                  users={filteredUsers.filter(u => !u.roles.includes('Patient'))}
                  loading={loading}
                  handleAction={handleAction}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patient">
            <Card className="border-2 shadow-xl overflow-hidden bg-card/50 backdrop-blur-sm">
              <CardHeader className="bg-muted/30 border-b">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <Users className="h-5 w-5" />
                      Patient Registry
                    </CardTitle>
                    <CardDescription>Filtering {filteredUsers.filter(u => u.roles.includes('Patient')).length} of {users.filter(u => u.roles.includes('Patient')).length} total patients.</CardDescription>
                  </div>
                  <div className="flex w-full md:w-auto items-center gap-3 bg-muted/30 p-2 rounded-xl border-2 focus-within:border-primary/50 transition-all relative">
                    <Search className="ml-2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Search patients..."
                      className="border-0 bg-transparent focus-visible:ring-0 min-w-[300px] text-lg font-bold"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <UserTable
                  users={filteredUsers.filter(u => u.roles.includes('Patient'))}
                  loading={loading}
                  handleAction={handleAction}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AnimatePresence>
        {isEditModalOpen && selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-card border-2 shadow-2xl rounded-2xl overflow-hidden"
            >
              <div className="p-6 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                      <Shield className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">Configure User Roles</h2>
                      <p className="text-sm text-muted-foreground font-medium italic">Adjusting access for {selectedUser.first_name} {selectedUser.last_name}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(false)} className="rounded-full">
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Available Roles & Permissions</label>
                  <div className="grid grid-cols-1 gap-2">
                    {roles.map((role) => (
                      <div
                        key={role.id}
                        onClick={() => handleToggleRole(role.name)}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer group ${userRolesInput.includes(role.name)
                          ? "bg-primary/[0.03] border-primary/40 shadow-sm"
                          : "hover:bg-muted/50 border-transparent bg-muted/20"
                          }`}
                      >
                        <div className="flex gap-3 items-center">
                          <Checkbox
                            checked={userRolesInput.includes(role.name)}
                            onCheckedChange={() => handleToggleRole(role.name)}
                            disabled={selectedUser?.username === 'admin' && role.name === 'Admin'}
                            className="h-5 w-5"
                          />
                          <div>
                            <p className={`font-bold text-sm ${userRolesInput.includes(role.name) ? "text-primary" : ""} ${(selectedUser?.username === 'admin' && role.name === 'Admin') ? "opacity-50" : ""}`}>
                              {role.name}
                              {selectedUser?.username === 'admin' && role.name === 'Admin' && (
                                <span className="ml-2 text-[8px] bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded-full border border-rose-500/20">SYSTEM LOCKED</span>
                              )}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-medium mt-0.5 italic">{role.description}</p>
                          </div>
                        </div>
                        {userRolesInput.includes(role.name) && (
                          <ShieldCheck className="h-5 w-5 text-primary animate-in zoom-in" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                  <Shield className="h-5 w-5 text-amber-500 shrink-0" />
                  <p className="text-[10px] text-amber-700 leading-relaxed font-bold italic uppercase tracking-wider">
                    Warning: Changing roles will immediately affect the user's permissions and system access level. Use caution when assigning administrative roles.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-muted/30 border-t flex items-center justify-end gap-3">
                <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} className="font-bold">Cancel</Button>
                <Button
                  onClick={handleSaveRoles}
                  disabled={saving}
                  className="gap-2 px-8 font-black shadow-lg shadow-primary/20"
                >
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Apply Access Rules
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Administrative Password Reset
            </DialogTitle>
            <DialogDescription>
              Set a new password for <strong>@{selectedUser?.username}</strong>.
              The user will not be prompted for their current password.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <PasswordStrength password={newPassword} />
              <p className="text-[10px] text-muted-foreground">
                Minimum 8 characters. Ensure it contains numbers and special characters for higher security.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                />
                <div className="absolute right-3 top-2.5">
                  {confirmPassword && (
                    newPassword === confirmPassword ?
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 animate-in zoom-in duration-300" /> :
                      <X className="h-5 w-5 text-rose-500 animate-in zoom-in duration-300" />
                  )}
                </div>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[10px] text-rose-500 font-bold italic">Passwords do not match.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleResetPassword}
              className="font-bold"
              disabled={isSubmitting || !newPassword || newPassword !== confirmPassword}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Apply New Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Onboard New Staff
            </DialogTitle>
            <DialogDescription>
              Create a new clinical account. A temporary password will be emailed to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  placeholder="John"
                  value={newUser.first_name}
                  onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  placeholder="Doe"
                  value={newUser.last_name}
                  onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="jdoe"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@legit-healthcare.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+234..."
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Assign Roles</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {roles.map((role) => (
                  <div key={role.id} className="flex items-center space-x-2 bg-muted/30 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer"
                    onClick={() => {
                      const currentRoles = newUser.roles;
                      if (currentRoles.includes(role.name)) {
                        setNewUser({ ...newUser, roles: currentRoles.filter(r => r !== role.name) });
                      } else {
                        setNewUser({ ...newUser, roles: [...currentRoles, role.name] });
                      }
                    }}>
                    <Checkbox checked={newUser.roles.includes(role.name)} />
                    <span className="text-sm font-medium">{role.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddUser}
              className="font-bold gap-2"
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Create & Send Credentials
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ActionConfirmModal
        isOpen={confirmDeactivation.open}
        onClose={() => setConfirmDeactivation({ open: false, user: null })}
        onConfirm={handleDeactivateUser}
        loading={deactivating}
        title="Confirm Deactivation"
        description={confirmDeactivation.user ? `Are you absolutely sure you want to DEACTIVATE the account for @${confirmDeactivation.user.username}? This action is permanent and will remove all their clinical access.` : ''}
        confirmText="Deactivate Account"
        variant="danger"
      />
    </MainLayout>
  );
};

const UserTable: React.FC<{ users: User[], loading: boolean, handleAction: (action: string, u: User) => void }> = ({ users, loading, handleAction }) => (
  <div className="overflow-x-auto">
    <Table>
      <TableHeader className="bg-muted/50">
        <TableRow>
          <TableHead className="font-bold py-4">User Details</TableHead>
          <TableHead className="font-bold">Contact Info</TableHead>
          <TableHead className="font-bold">Assigned Roles</TableHead>
          <TableHead className="font-bold">Status</TableHead>
          <TableHead className="font-bold text-right pr-6">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={5} className="h-64 text-center">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-8 w-8 animate-spin text-primary/40" />
                <p className="text-muted-foreground animate-pulse font-medium">Synchronizing Secure Directory...</p>
              </div>
            </TableCell>
          </TableRow>
        ) : users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="h-64 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Search className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground font-medium italic">No personnel found matching your criteria.</p>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          users.map((user) => (
            <TableRow key={user.id} className="group hover:bg-muted/30 transition-colors">
              <TableCell className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center font-black text-primary group-hover:bg-primary group-hover:text-white transition-all transform group-hover:scale-105">
                    {user.first_name?.[0]}{user.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-bold text-sm leading-none mb-1">{user.first_name} {user.last_name}</p>
                    <p className="text-xs text-muted-foreground font-medium">@{user.username}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate max-w-[150px]">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span>{user.phone}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {user.roles.length > 0 ? (
                    user.roles.map(role => (
                      <Badge key={role} variant="outline" className="text-[10px] font-bold bg-primary/5 text-primary border-primary/20 py-0 px-2 h-5">
                        {role}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic font-medium">No roles assigned</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {user.is_verified ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-1 pr-2 py-0.5">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-200 gap-1 pr-2 py-0.5">
                      <XCircle className="h-3 w-3" />
                      Pending
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right pr-6">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="group-hover:bg-background">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 border-2 shadow-2xl">
                    <DropdownMenuLabel>Actions for @{user.username}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleAction('roles', user)} className="cursor-pointer gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Edit Roles
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAction('reset', user)} className="cursor-pointer gap-2">
                      <Key className="h-4 w-4" />
                      Reset Password
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer gap-2">
                      <Calendar className="h-4 w-4" />
                      View Timeline
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleAction('deactivate', user)}
                      disabled={user.username === 'admin'}
                      className={`cursor-pointer gap-2 text-rose-500 focus:text-rose-500 focus:bg-rose-50 ${user.username === 'admin' ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}
                    >
                      <XCircle className="h-4 w-4" />
                      {user.username === 'admin' ? 'System Protected' : 'Deactivate Account'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </div>
);

export default UserManagementPage;
