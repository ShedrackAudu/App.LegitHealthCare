import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
    User, 
    Lock, 
    ShieldAlert, 
    ShieldCheck, 
    CheckCircle2, 
    X, 
    Plus, 
    Trash2, 
    Mail as MailIcon, 
    Phone as PhoneIcon, 
    Globe, 
    MessageCircle 
} from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { PasswordStrength } from '@/components/ui/PasswordStrength';

const ManageAccountPage = () => {
    const { user, setUser } = useAppContext();
    const navigate = useNavigate();

    // Personal Info state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

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
            const resp = await axios.get('http://localhost:5000/api/account/contacts', {
                headers: { 'X-User-ID': user?.id }
            });
            setContacts(resp.data);
        } catch (err) {
            console.error("Failed to fetch contacts", err);
        }
    };

    const handleUpdateInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const resp = await axios.put(`http://localhost:5000/api/account/profile`, {
                first_name: firstName,
                last_name: lastName,
                phone,
                email
            }, { headers: { 'X-User-ID': user?.id } });
            
            toast.success(resp.data.message || 'Profile updated successfully!');
            setUser({ ...user, first_name: firstName, last_name: lastName, phone, email });
            localStorage.setItem('user', JSON.stringify({ ...user, first_name: firstName, last_name: lastName, phone, email }));
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to update profile.');
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match.");
            return;
        }

        try {
            const resp = await axios.put(`http://localhost:5000/api/account/password`, {
                current_password: currentPassword,
                new_password: newPassword
            }, { headers: { 'X-User-ID': user?.id } });

            toast.success(resp.data.message || 'Password updated successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Failed to update password.');
        }
    };

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLabel || !newValue) return;
        try {
            const resp = await axios.post('http://localhost:5000/api/account/contacts/save', {
                label: newLabel,
                value: newValue,
                contact_type: newValue.includes('http') ? 'link' : (newValue.includes('@') ? 'email' : 'phone')
            }, { headers: { 'X-User-ID': user?.id } });
            
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
            await axios.delete(`http://localhost:5000/api/account/contacts/${id}`, {
                headers: { 'X-User-ID': user?.id }
            });
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
                    <User className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold tracking-tight">Manage Account</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-2 shadow-sm">
                        <CardHeader>
                            <CardTitle>Personal Information</CardTitle>
                            <CardDescription>Update your contact details and name.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handleUpdateInfo}>
                            <CardContent className="space-y-4">
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
                                <Button type="submit" className="w-full">Update Info</Button>
                            </CardFooter>
                        </form>
                    </Card>

                    <div className="space-y-6">
                        <Card className="border-2 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Lock className="h-5 w-5 text-primary" /> Change Password
                                </CardTitle>
                                <CardDescription>
                                    Password must be at least 8 characters long, include an uppercase letter, a lowercase letter, a digit, and a special symbol.
                                </CardDescription>
                            </CardHeader>
                            <form onSubmit={handleUpdatePassword}>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Current Password</Label>
                                        <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>New Password</Label>
                                        <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                                        <PasswordStrength password={newPassword} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Confirm New Password</Label>
                                        <div className="relative">
                                            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                                            <div className="absolute right-3 top-2.5">
                                                {confirmPassword && (
                                                    newPassword === confirmPassword ? 
                                                    <CheckCircle2 className="h-5 w-5 text-emerald-500 animate-in zoom-in duration-300" /> : 
                                                    <X className="h-5 w-5 text-rose-500 animate-in zoom-in duration-300" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button type="submit" variant="secondary" className="w-full border-2">Change Password</Button>
                                </CardFooter>
                            </form>
                        </Card>

                        <Card className={`border-2 shadow-sm ${user?.is_2fa_enabled ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-rose-500/50 bg-rose-500/5'}`}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    {user?.is_2fa_enabled ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <ShieldAlert className="h-5 w-5 text-rose-600" />}
                                    Two-Factor Authentication (2FA)
                                </CardTitle>
                                <CardDescription>
                                    {user?.is_2fa_enabled ? "2FA is currently active for your account." : "Enhance your account security with an authenticator app."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button 
                                    className={`w-full font-bold ${user?.is_2fa_enabled ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
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
