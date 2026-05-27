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
  Lock,
  Building2,
  Copy,
  Check
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
import { usePermissions } from '@/hooks/usePermissions';
import { ActionConfirmModal } from '@/components/ActionConfirmModal';
import { UserProfileDialog } from '@/components/UserProfileDialog';
import { UserTimelineDialog } from '@/components/UserTimelineDialog';

interface User {
  id: number | string;
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
  section?: string;
  department?: string;
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
  const [isEditInfoModalOpen, setIsEditInfoModalOpen] = useState(false);
  const [editUserInfo, setEditUserInfo] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    phone: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAppContext();
  const { hasPermission } = usePermissions();
  const canManageStaff = hasPermission('manage_staff_accounts');
  const canManagePatients = hasPermission('manage_patient_accounts');
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
  const [activeTab, setActiveTab] = useState<'staff' | 'patient'>('staff');
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [onboardPatientStep, setOnboardPatientStep] = useState<'search' | 'form' | 'result'>('search');
  const [searchStaffId, setSearchStaffId] = useState('');
  const [onboardPatientData, setOnboardPatientData] = useState<any>(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [addStaffStep, setAddStaffStep] = useState<'form' | 'result'>('form');
  const [createdStaffData, setCreatedStaffData] = useState<any>(null);
  const [confirmDeactivation, setConfirmDeactivation] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null
  });
  const [deactivating, setDeactivating] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [selectedUserForTimeline, setSelectedUserForTimeline] = useState<User | null>(null);

  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handlePatientSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchStaffId.trim()) {
      toast.error('Please enter a Staff ID');
      return;
    }

    setOnboardLoading(true);
    try {
      const response = await axios.get(`/api/patient/search?staff_id=${searchStaffId.trim()}`);
      setOnboardPatientData(response.data);
      setOnboardPatientStep('form');
      toast.success('Patient record found!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Staff ID not found.');
    } finally {
      setOnboardLoading(false);
    }
  };

  const handleOnboardPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardLoading(true);
    try {
      const headers = { 'X-User-ID': user?.id?.toString() || '' };
      const response = await axios.post('/api/admin/patients/onboard', {
        staff_id: onboardPatientData.staff_id,
        first_name: onboardPatientData.first_name,
        last_name: onboardPatientData.last_name,
        email: onboardPatientData.email,
        phone: onboardPatientData.phone
      }, { headers });
      setGeneratedPassword(response.data.password);
      setOnboardPatientStep('result');
      toast.success('Account created successfully!');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to onboard patient.');
    } finally {
      setOnboardLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

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
    } else if (action === 'edit_info') {
      setEditUserInfo({
        first_name: u.first_name,
        last_name: u.last_name,
        username: u.username,
        email: u.email,
        phone: u.phone
      });
      setIsEditInfoModalOpen(true);
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

  const handleSaveInfo = async () => {
    if (!selectedUser) return;
    if (!editUserInfo.first_name || !editUserInfo.last_name || !editUserInfo.username || !editUserInfo.email) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      const headers = { 'X-User-ID': user?.id?.toString() || '' };
      await axios.put(`/api/admin/users/${selectedUser.id}`, editUserInfo, { headers });
      toast.success("User account information updated successfully");
      setIsEditInfoModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update account information");
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
      const response = await axios.post('/api/admin/users', newUser, { headers });
      setGeneratedPassword(response.data.password);
      setCreatedStaffData(newUser);
      setAddStaffStep('result');
      toast.success(`User @${newUser.username} created and welcome email sent!`);
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

  const viewProfile = async (uId: number | string) => {
    try {
      const headers = { 'X-User-ID': user?.id?.toString() || '' };
      const response = await axios.get(`/api/users/${uId}/profile`, { headers });
      setSelectedUserProfile(response.data);
      setIsUserProfileOpen(true);
    } catch (err) {
      toast.error("Failed to load user profile");
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 sm:gap-6 bg-card p-4 sm:p-6 rounded-2xl border transition-all">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="p-1.5 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl text-primary">
              <Users className="text-primary h-5 w-5 sm:h-8 sm:w-8" />
            </div>
            <div>
              <h1 className="text-base sm:text-2xl font-black tracking-tight text-foreground">User Management</h1>
              <p className="text-[9px] sm:text-sm text-muted-foreground font-medium">
                Comprehensive directory of clinical personnel and registered patients.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <Button variant="outline" size="sm" onClick={fetchData} className="flex-1 lg:flex-none gap-2 h-10 rounded-xl border-2 font-bold transition-all hover:bg-primary/5">
              <RefreshCw className={loading ? "h-4 w-4 animate-spin text-primary" : "h-4 w-4 text-primary"} />
              Reload
            </Button>
            {((activeTab === 'staff' && canManageStaff) || (activeTab === 'patient' && canManagePatients)) && (
              <Button 
                size="sm" 
                className="flex-1 lg:flex-none gap-2 h-10 rounded-xl font-black shadow-lg shadow-primary/20 px-6" 
                onClick={() => activeTab === 'staff' ? setIsAddModalOpen(true) : setIsAddPatientModalOpen(true)}
              >
                {activeTab === 'staff' ? <UserCog className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                {activeTab === 'staff' ? 'Add User' : 'Add Patient'}
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'staff' | 'patient')} className="w-full">
          <TabsList className="flex bg-muted/50 p-1.5 mb-6 border-2 border-border/50 rounded-2xl h-14 w-full md:w-fit">
            <TabsTrigger value="staff" className="flex-1 md:flex-none rounded-xl px-4 md:px-12 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg font-black transition-all whitespace-nowrap text-xs md:text-sm">
              Clinical Staff
            </TabsTrigger>
            <TabsTrigger value="patient" className="flex-1 md:flex-none rounded-xl px-4 md:px-12 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg font-black transition-all whitespace-nowrap text-xs md:text-sm">
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
                  <div className="flex w-full md:w-80 items-center gap-2 bg-muted/30 p-2 rounded-xl border-2 focus-within:border-primary/50 transition-all relative">
                    <Search className="ml-1 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search staff..."
                      className="border-0 bg-transparent focus-visible:ring-0 w-full text-sm font-bold h-8"
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
                  onViewProfile={viewProfile}
                  setSelectedUserForTimeline={setSelectedUserForTimeline}
                  setIsTimelineOpen={setIsTimelineOpen}
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
                  <div className="flex w-full md:w-80 items-center gap-2 bg-muted/30 p-2 rounded-xl border-2 focus-within:border-primary/50 transition-all relative">
                    <Search className="ml-1 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search patients..."
                      className="border-0 bg-transparent focus-visible:ring-0 w-full text-sm font-bold h-8"
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
                  onViewProfile={viewProfile}
                  setSelectedUserForTimeline={setSelectedUserForTimeline}
                  setIsTimelineOpen={setIsTimelineOpen}
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
              className="relative w-full max-w-lg bg-card border-2 shadow-2xl rounded-2xl overflow-y-auto max-h-[90vh]"
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
                        onClick={() => {
                          if (role.name === 'Admin') return; // SYSTEM LOCKED - Admin role cannot be manually assigned
                          handleToggleRole(role.name);
                        }}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all group ${
                          userRolesInput.includes(role.name)
                            ? "bg-primary/[0.03] border-primary/40 shadow-sm"
                            : "hover:bg-muted/50 border-transparent bg-muted/20"
                          } ${role.name === 'Admin' ? "opacity-60 cursor-not-allowed grayscale" : "cursor-pointer"}`}
                      >
                        <div className="flex gap-3 items-center">
                          <Checkbox
                            checked={userRolesInput.includes(role.name)}
                            onCheckedChange={() => {
                              if (role.name === 'Admin') return;
                              handleToggleRole(role.name);
                            }}
                            disabled={role.name === 'Admin'}
                            className="h-5 w-5"
                          />
                          <div>
                            <p className={`font-bold text-sm ${userRolesInput.includes(role.name) ? "text-primary" : ""} ${role.name === 'Admin' ? "text-rose-600" : ""}`}>
                              {role.name}
                              {role.name === 'Admin' && (
                                <span className="ml-2 text-[8px] bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded-full border border-rose-500/20 uppercase tracking-tighter">System Locked</span>
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
                      <CheckCircle2 className="h-5 w-5 text-primary animate-in zoom-in duration-300" /> :
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

      <Dialog open={isEditInfoModalOpen} onOpenChange={setIsEditInfoModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Edit Account Information
            </DialogTitle>
            <DialogDescription>
              Update the account profile information for <strong>@{selectedUser?.username}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-first-name">First Name</Label>
                <Input
                  id="edit-first-name"
                  placeholder="John"
                  value={editUserInfo.first_name}
                  onChange={(e) => setEditUserInfo({ ...editUserInfo, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-last-name">Last Name</Label>
                <Input
                  id="edit-last-name"
                  placeholder="Doe"
                  value={editUserInfo.last_name}
                  onChange={(e) => setEditUserInfo({ ...editUserInfo, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                placeholder="jdoe"
                value={editUserInfo.username}
                onChange={(e) => setEditUserInfo({ ...editUserInfo, username: e.target.value })}
                disabled={selectedUser?.username === 'admin'}
              />
              {selectedUser?.username === 'admin' && (
                <p className="text-[10px] text-rose-500 font-bold italic">The default system administrator username cannot be renamed.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email Address</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="john.doe@legit-healthcare.com"
                value={editUserInfo.email}
                onChange={(e) => setEditUserInfo({ ...editUserInfo, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                placeholder="+234..."
                value={editUserInfo.phone}
                onChange={(e) => setEditUserInfo({ ...editUserInfo, phone: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditInfoModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveInfo}
              className="font-bold"
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddModalOpen} onOpenChange={(open) => {
        setIsAddModalOpen(open);
        if (!open) {
          setAddStaffStep('form');
          setCreatedStaffData(null);
          setGeneratedPassword('');
        }
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Onboard New Staff
            </DialogTitle>
            <DialogDescription>
              {addStaffStep === 'form' 
                ? "Create a new clinical account. A temporary password will be emailed to the user."
                : "Staff account created successfully."}
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {addStaffStep === 'form' ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid gap-4 py-4"
              >
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
                      <div key={role.id} 
                        className={`flex items-center space-x-2 bg-muted/30 p-2 rounded-lg border transition-all ${
                          role.name === 'Admin' 
                            ? "opacity-50 cursor-not-allowed grayscale bg-rose-500/5 border-rose-500/20" 
                            : "hover:bg-muted/50 cursor-pointer"
                        }`}
                        onClick={() => {
                          if (role.name === 'Admin') return;
                          const currentRoles = newUser.roles;
                          if (currentRoles.includes(role.name)) {
                            setNewUser({ ...newUser, roles: currentRoles.filter(r => r !== role.name) });
                          } else {
                            setNewUser({ ...newUser, roles: [...currentRoles, role.name] });
                          }
                        }}>
                        <Checkbox 
                          checked={newUser.roles.includes(role.name)} 
                          disabled={role.name === 'Admin'}
                        />
                        <span className={`text-sm font-medium ${role.name === 'Admin' ? "text-rose-600" : ""}`}>
                          {role.name}
                          {role.name === 'Admin' && <span className="ml-1 text-[8px] font-black uppercase">Locked</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                  <Button
                    onClick={handleAddUser}
                    className="font-bold gap-2 shadow-lg shadow-primary/20"
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Create Account
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 py-6"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-primary/30">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Staff Account Ready!</h3>
                    <p className="text-sm text-muted-foreground font-medium italic">Account created for {createdStaffData?.first_name} {createdStaffData?.last_name}</p>
                  </div>
                </div>

                <div className="bg-muted/50 border-2 border-dashed rounded-2xl p-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Staff Username</Label>
                    <div className="bg-card p-4 rounded-xl border-2 flex items-center justify-between group">
                      <span className="font-black text-lg tracking-tight">{createdStaffData?.username}</span>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(createdStaffData?.username)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Temporary Password</Label>
                    <div className="bg-primary/5 p-4 rounded-xl border-2 border-primary/20 flex items-center justify-between group">
                      <span className="font-black text-2xl tracking-[0.2em] text-primary">{generatedPassword}</span>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(generatedPassword)} className="text-primary hover:bg-primary/10">
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex gap-3">
                  <Mail className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground font-bold leading-relaxed">
                    Credentials have been sent to <strong>{createdStaffData?.email}</strong>. The user must change their password on first login.
                  </p>
                </div>

                <Button onClick={() => setIsAddModalOpen(false)} className="w-full h-12 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                  Finish & Close
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddPatientModalOpen} onOpenChange={(open) => {
        setIsAddPatientModalOpen(open);
        if (!open) {
          setOnboardPatientStep('search');
          setSearchStaffId('');
          setOnboardPatientData(null);
          setGeneratedPassword('');
        }
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Onboard Patient Portal
            </DialogTitle>
            <DialogDescription>
              Create a secure portal account for an existing patient.
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {onboardPatientStep === 'search' && (
              <motion.div
                key="search"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 py-4"
              >
                <div className="bg-primary/5 border-2 border-primary/10 p-4 rounded-2xl flex items-start gap-3">
                  <Search className="h-5 w-5 text-primary mt-0.5" />
                  <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                    Enter the patient's company issued <strong>Staff ID</strong> to locate their records and begin the onboarding process.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Staff ID Number</Label>
                  <div className="relative group">
                    <Input 
                      placeholder="e.g. 123456" 
                      className="h-14 pl-12 text-xl font-black rounded-2xl border-2 focus:border-primary transition-all bg-muted/20" 
                      value={searchStaffId}
                      onChange={(e) => setSearchStaffId(e.target.value.replace(/\D/g, ''))}
                      onKeyDown={(e) => e.key === 'Enter' && handlePatientSearch()}
                      autoFocus
                    />
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  </div>
                </div>
                <Button 
                  onClick={handlePatientSearch} 
                  className="w-full h-12 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                  disabled={onboardLoading || !searchStaffId.trim()}
                >
                  {onboardLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Locate Records"}
                </Button>
              </motion.div>
            )}

            {onboardPatientStep === 'form' && onboardPatientData && (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 py-4"
              >
                <div className="bg-muted/30 border-2 rounded-2xl overflow-hidden">
                  <div className="p-4 flex items-center gap-3 border-b bg-card">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary">
                      {onboardPatientData.first_name?.[0]}{onboardPatientData.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-bold text-sm leading-none">
                        {onboardPatientData.first_name} {onboardPatientData.middle_name ? `${onboardPatientData.middle_name} ` : ''}{onboardPatientData.last_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium mt-1">Record Sync Verified • ID: {onboardPatientData.staff_id}</p>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-y-5 gap-x-4">
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Department</Label>
                      <p className="text-xs font-bold truncate">{onboardPatientData.department || 'General'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Gender</Label>
                      <p className="text-xs font-bold">{onboardPatientData.gender || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Date of Birth</Label>
                      <p className="text-xs font-bold">{onboardPatientData.dob || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Age</Label>
                      <p className="text-xs font-bold">{onboardPatientData.age || 'N/A'} Years</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Nationality</Label>
                      <p className="text-xs font-bold truncate">{onboardPatientData.nationality || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Race</Label>
                      <p className="text-xs font-bold">{onboardPatientData.race || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleOnboardPatient} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Contact Email</Label>
                      <div className="relative group">
                        <Input 
                          value={onboardPatientData.email} 
                          onChange={(e) => setOnboardPatientData({...onboardPatientData, email: e.target.value})}
                          className="h-12 pl-10 rounded-xl border-2 bg-muted/20 text-sm font-bold"
                          placeholder="email@example.com"
                        />
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</Label>
                      <div className="relative group">
                        <Input 
                          value={onboardPatientData.phone} 
                          onChange={(e) => setOnboardPatientData({...onboardPatientData, phone: e.target.value})}
                          className="h-12 pl-10 rounded-xl border-2 bg-muted/20 text-sm font-bold"
                          placeholder="080..."
                        />
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-xl flex gap-3">
                    <Shield className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-amber-700 font-bold italic uppercase tracking-wider leading-relaxed">
                      Administrative Action: A temporary password will be generated. The patient will be required to change it upon first login.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => setOnboardPatientStep('search')}
                      className="flex-1 rounded-xl font-bold"
                    >
                      ← Back
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-[2] rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                      disabled={onboardLoading}
                    >
                      {onboardLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Account"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {onboardPatientStep === 'result' && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 py-6"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-primary/30">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Onboarding Successful!</h3>
                    <p className="text-sm text-muted-foreground font-medium italic">The account has been created and verified.</p>
                  </div>
                </div>

                <div className="bg-muted/50 border-2 border-dashed rounded-2xl p-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Portal Username (Staff ID)</Label>
                    <div className="bg-card p-4 rounded-xl border-2 flex items-center justify-between group">
                      <span className="font-black text-lg tracking-tight">{onboardPatientData?.staff_id}</span>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(onboardPatientData?.staff_id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Temporary Password</Label>
                    <div className="bg-primary/5 p-4 rounded-xl border-2 border-primary/20 flex items-center justify-between group">
                      <span className="font-black text-2xl tracking-[0.2em] text-primary">{generatedPassword}</span>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(generatedPassword)} className="text-primary hover:bg-primary/10">
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex gap-3">
                  <Mail className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground font-bold leading-relaxed">
                    Credentials have been sent to <strong>{onboardPatientData?.email}</strong>. Please advise the patient to change their password immediately after login.
                  </p>
                </div>

                <Button onClick={() => setIsAddPatientModalOpen(false)} className="w-full h-12 rounded-xl font-black uppercase tracking-widest">
                  Finish & Close
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      <ActionConfirmModal
        isOpen={confirmDeactivation.open}
        onClose={() => setConfirmDeactivation({ open: false, user: null })}
        onConfirm={handleDeactivateUser}
        title="Confirm Account Deactivation"
        description={`Are you sure you want to deactivate @${confirmDeactivation.user?.username}? This will immediately revoke all system access for this personnel.`}
        confirmText="Deactivate Account"
        loading={deactivating}
        variant="danger"
      />

      <UserProfileDialog 
        userProfile={selectedUserProfile} 
        isOpen={isUserProfileOpen} 
        onOpenChange={setIsUserProfileOpen} 
      />
      <UserTimelineDialog 
        isOpen={isTimelineOpen}
        onClose={() => {
          setIsTimelineOpen(false);
          setSelectedUserForTimeline(null);
        }}
        user={selectedUserForTimeline}
      />
    </MainLayout>
  );
};

const UserTable: React.FC<{ 
  users: User[], 
  loading: boolean, 
  handleAction: (action: string, u: User) => void, 
  onViewProfile: (id: number | string) => void,
  setSelectedUserForTimeline: (user: User) => void,
  setIsTimelineOpen: (open: boolean) => void
}> = ({ users, loading, handleAction, onViewProfile, setSelectedUserForTimeline, setIsTimelineOpen }) => (
  <div className="overflow-x-auto">
    <Table>
      <TableHeader className="bg-muted/50">
        <TableRow>
          <TableHead className="font-bold py-4">User Details</TableHead>
          <TableHead className="font-bold">Contact Info</TableHead>
          <TableHead className="font-bold">Assigned Roles</TableHead>
          <TableHead className="font-bold">Section</TableHead>
          <TableHead className="font-bold">Status</TableHead>
          <TableHead className="font-bold text-right pr-6">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={6} className="h-64 text-center">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-8 w-8 animate-spin text-primary/40" />
                <p className="text-muted-foreground animate-pulse font-medium">Synchronizing Secure Directory...</p>
              </div>
            </TableCell>
          </TableRow>
        ) : users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="h-96 border-0">
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-2 transition-transform hover:scale-110 duration-500">
                  <Search className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/30" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black tracking-tight text-foreground/70">No Personnel Found</h3>
                  <p className="text-sm text-muted-foreground font-medium italic max-w-xs mx-auto">
                    No users matching your criteria were found in the directory. Try searching by username or email.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2 pt-4">
                  <div className="h-px w-12 bg-muted-foreground/20" />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-black">
                    Secure Directory Services
                  </p>
                </div>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          users.map((user) => (
            <TableRow 
              key={user.id} 
              className="group hover:bg-muted/10 transition-colors cursor-pointer"
              onClick={() => onViewProfile(user.id)}
            >
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
                {user.roles.includes('Patient') ? (
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold uppercase text-[10px]">
                    {user.section || 'N/A'}
                  </Badge>
                ) : (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{user.section || 'HQ'}</span>
                    <span className="text-[10px] text-muted-foreground italic truncate max-w-[100px]">{user.department || 'Clinical'}</span>
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {user.is_verified ? (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1 pr-2 py-0.5">
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
                <div onClick={(e) => e.stopPropagation()}>
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
                    <DropdownMenuItem onClick={() => handleAction('edit_info', user)} className="cursor-pointer gap-2">
                      <UserCog className="h-4 w-4" />
                      Edit Info
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAction('reset', user)} className="cursor-pointer gap-2">
                      <Key className="h-4 w-4" />
                      Reset Password
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer gap-2"
                      onClick={() => {
                        setSelectedUserForTimeline(user);
                        setIsTimelineOpen(true);
                      }}
                    >
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
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </div>
);

export default UserManagementPage;
