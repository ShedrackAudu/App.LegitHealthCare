import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Lock, Loader2, CheckCircle2, X } from 'lucide-react';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { useAppContext } from '@/context/AppContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const ForcePasswordResetPage: React.FC = () => {
    const { user, setUser } = useAppContext();
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (!user.must_reset_password) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post('/api/account/force-reset-password', {
                new_password: newPassword
            });

            toast.success("Password updated successfully!");
            setUser(response.data.user);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            navigate('/dashboard');
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    if (!user || !user.must_reset_password) return null;

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8">
            <div className="w-full max-w-md">
                <Card className="border-2 shadow-2xl bg-card">
                    <CardHeader className="text-center space-y-2">
                        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                            <Lock className="w-8 h-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-black tracking-tight">Security Update Required</CardTitle>
                        <CardDescription className="text-sm font-medium italic">
                            Hello {user.first_name}, for your security, please replace your temporary password with a permanent one.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="new-password">New Permanent Password</Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="h-11"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                                <PasswordStrength password={newPassword} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirm Password</Label>
                                <div className="relative">
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="h-11 pr-10"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                    <div className="absolute right-3 top-3">
                                        {confirmPassword && (
                                            newPassword === confirmPassword ? 
                                            <CheckCircle2 className="h-5 w-5 text-primary animate-in zoom-in" /> : 
                                            <X className="h-5 w-5 text-rose-500 animate-in zoom-in" />
                                        )}
                                    </div>
                                </div>
                                {confirmPassword && newPassword !== confirmPassword && (
                                    <p className="text-[10px] text-rose-500 font-bold italic">Passwords do not match.</p>
                                )}
                            </div>

                            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
                                <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                                <p className="text-[10px] text-primary/80 leading-relaxed font-bold uppercase tracking-wider">
                                    Your new password should be strong and unique. Avoid using simple or common words.
                                </p>
                            </div>

                            <Button 
                                type="submit" 
                                className="w-full h-12 text-base font-black shadow-lg shadow-primary/20 gap-2"
                                disabled={loading || !newPassword || newPassword !== confirmPassword}
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                                Activate My Account
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="bg-muted/30 border-t py-4 text-center">
                        <p className="text-[10px] text-muted-foreground w-full font-bold uppercase tracking-widest">
                            © {new Date().getFullYear()} Legit HealthCare Services Ltd.
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
};

export default ForcePasswordResetPage;
