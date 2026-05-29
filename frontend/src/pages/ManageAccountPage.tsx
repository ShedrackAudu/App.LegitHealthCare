import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  UserIcon,
  LockIcon,
  Shield01Icon
} from '@hugeicons/core-free-icons';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { PasswordMatchIndicator } from '@/components/ui/PasswordMatchIndicator';

const ManageAccountPage = () => {
    const { user, setUser } = useAppContext();
    const navigate = useNavigate();

    // Personal Info state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [updatingInfo, setUpdatingInfo] = useState(false);
    const [updatingPassword, setUpdatingPassword] = useState(false);

    // Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Contacts State
    const [contacts, setContacts] = useState<any[]>([]);
    const [newLabel, setNewLabel] = useState('');
    const [newValue, setNewValue] = useState('');

    useEffect(() => {
        if (user) {
            setFirstName(user.first_name || '');
            setLastName(user.last_name || '');
            setPhone(user.phone || '');
            setEmail(user.email || '');
            fetchContacts();
        }
    }, [user]);

    const fetchContacts = async () => {
        try {
            const resp = await axios.get('/api/account/contacts');
            setContacts(resp.data);
        } catch (err) {
            console.error("Failed to fetch contacts", err);
        }
    };

    const handleUpdateInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdatingInfo(true);
        try {
            const resp = await axios.put(`/api/account/profile`, {
                first_name: firstName,
                last_name: lastName,
                phone,
                email
            }, {});
            
            toast.success(resp.data.message || 'Profile updated successfully!');
            setUser({ ...user, first_name: firstName, last_name: lastName, phone, email });
            localStorage.setItem('user', JSON.stringify({ ...user, first_name: firstName, last_name: lastName, phone, email }));
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to update profile.');
        } finally {
            setUpdatingInfo(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        const isStrong = (pw: string) => {
            return pw.length >= 8 && 
                   /[A-Z]/.test(pw) && 
                   /[a-z]/.test(pw) && 
                   /[0-9]/.test(pw) && 
                   /[^A-Za-z0-9]/.test(pw);
        };

        if (!isStrong(newPassword)) {
            toast.error("New password must be at least 8 chars long with 1 uppercase, 1 lowercase, 1 digit, and 1 special symbol.");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match.");
            return;
        }

        setUpdatingPassword(true);
        try {
            const resp = await axios.put(`/api/account/password`, {
                current_password: currentPassword,
                new_password: newPassword
            }, {});

            toast.success(resp.data.message || 'Password updated successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to update password.');
        } finally {
            setUpdatingPassword(false);
        }
    };

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLabel || !newValue) return;
        try {
            const resp = await axios.post('/api/account/contacts/save', {
                label: newLabel,
                value: newValue,
                contact_type: newValue.includes('http') ? 'link' : (newValue.includes('@') ? 'email' : 'phone')
            }, {});
            
            setContacts([...contacts, resp.data]);
            setNewLabel('');
            setNewValue('');
            toast.success("Contact added!");
        } catch (err: any) {
            toast.error("Failed to add contact.");
        }
    };

    const handleDeleteContact = async (id: number) => {
        try {
            await axios.delete(`/api/account/contacts/${id}`);
            setContacts(contacts.filter(c => c.id !== id));
            toast.success("Contact removed.");
        } catch (err) {
            toast.error("Failed to delete contact.");
        }
    };

    return (
        <MainLayout>
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center gap-3 mb-6">
                    <HugeiconsIcon icon={UserIcon} className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold tracking-tight">Manage Account</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-2 shadow-sm">
                        <CardHeader className="p-5 border-b bg-muted/5">
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                        <HugeiconsIcon icon={UserIcon} className="w-5 h-5" />
                                    </div>
                                    <CardTitle className="text-lg font-black tracking-tight whitespace-nowrap">Personal Information</CardTitle>
                                </div>
                                <CardDescription className="text-xs font-medium pl-4 border-l-4 border-primary/20 ml-1 py-1">
                                    Update your contact details and name.
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <form onSubmit={handleUpdateInfo}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2 opacity-70">
                                    <Label>Username</Label>
                                    <Input value={user?.username || ''} disabled className="bg-muted/50 cursor-not-allowed font-medium" />
                                </div>
                                <div className="space-y-2">
                                    <Label>First Name</Label>
                                    <Input value={firstName} onChange={e => setFirstName(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Last Name</Label>
                                    <Input value={lastName} onChange={e => setLastName(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <Input value={phone} onChange={e => setPhone(e.target.value)} required />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" loading={updatingInfo} className="w-full">Update Info</Button>
                            </CardFooter>
                        </form>
                    </Card>

                    <div className="space-y-6">
                        <Card className="border-2 shadow-sm">
                            <CardHeader className="p-5 border-b bg-muted/5">
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                            <HugeiconsIcon icon={LockIcon} className="w-5 h-5" />
                                        </div>
                                        <CardTitle className="text-lg font-black tracking-tight whitespace-nowrap">Change Password</CardTitle>
                                    </div>
                                    <CardDescription className="text-xs font-medium pl-4 border-l-4 border-primary/20 ml-1 py-1 leading-relaxed">
                                        Secure your account with a unique passcode.
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <form onSubmit={handleUpdatePassword}>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Current Password <span className="text-destructive">*</span></Label>
                                        <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center mb-1">
                                            <Label>New Password <span className="text-destructive">*</span></Label>
                                            <PasswordStrength password={newPassword} />
                                        </div>
                                        <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center mb-1">
                                            <Label>Confirm New Password <span className="text-destructive">*</span></Label>
                                            <PasswordMatchIndicator password={newPassword} confirmPassword={confirmPassword} />
                                        </div>
                                        <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button type="submit" variant="secondary" loading={updatingPassword} className="w-full border-2">Change Password</Button>
                                </CardFooter>
                            </form>
                        </Card>

                        <Card className={`border-2 shadow-sm ${user?.is_2fa_enabled ? 'border-primary/50 bg-primary/5' : 'border-rose-500/50 bg-rose-500/5'}`}>
                            <CardHeader className={`p-5 border-b ${user?.is_2fa_enabled ? 'bg-primary/5' : 'bg-rose-500/5'}`}>
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${user?.is_2fa_enabled ? 'bg-primary/10 text-primary' : 'bg-rose-500/10 text-rose-600'}`}>
                                            {user?.is_2fa_enabled ? <HugeiconsIcon icon={Shield01Icon} className="w-5 h-5" /> : <HugeiconsIcon icon={Shield01Icon} className="w-5 h-5" />}
                                        </div>
                                        <CardTitle className="text-lg font-black tracking-tight whitespace-nowrap">Two-Factor Auth</CardTitle>
                                    </div>
                                    <CardDescription className={`text-xs font-medium pl-4 border-l-4 ml-1 py-1 ${user?.is_2fa_enabled ? 'border-primary/20' : 'border-rose-500/20'}`}>
                                        {user?.is_2fa_enabled ? "2FA is currently active for your account." : "Enhance security with second-step verification."}
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Button 
                                    className={`w-full font-bold ${user?.is_2fa_enabled ? 'bg-primary hover:bg-primary0' : ''}`}
                                    onClick={() => navigate('/account/2fa')}
                                >
                                    {user?.is_2fa_enabled ? "Manage 2FA Settings" : "Set Up 2FA"}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default ManageAccountPage;
