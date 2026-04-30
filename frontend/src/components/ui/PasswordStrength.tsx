import React from 'react';
import { motion } from 'framer-motion';

interface PasswordStrengthProps {
    password: string;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password }) => {
    const calculateStrength = (pwd: string) => {
        let strength = 0;
        if (pwd.length >= 8) strength++;
        if (/[A-Z]/.test(pwd)) strength++;
        if (/[a-z]/.test(pwd)) strength++;
        if (/[0-9]/.test(pwd)) strength++;
        if (/[^A-Za-z0-9]/.test(pwd)) strength++;
        return strength;
    };

    const strength = calculateStrength(password);
    
    const getLabel = (s: number) => {
        if (password.length === 0) return '';
        if (s <= 2) return 'Weak';
        if (s === 3) return 'Fair';
        if (s === 4) return 'Good';
        return 'Strong';
    };

    const getColor = (s: number) => {
        if (s <= 2) return 'bg-rose-500';
        if (s === 3) return 'bg-amber-500';
        if (s === 4) return 'bg-blue-500';
        return 'bg-primary';
    };

    const label = getLabel(strength);
    const color = getColor(strength);

    if (!password) return null;

    return (
        <div className="space-y-2 mt-2 animate-in fade-in duration-300">
            <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                    Security Level
                </span>
                <span className={`text-[10px] font-black uppercase tracking-widest ${label === 'Weak' ? 'text-rose-500' : label === 'Fair' ? 'text-amber-500' : label === 'Good' ? 'text-blue-500' : 'text-primary'}`}>
                    {label}
                </span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex gap-0.5">
                {[1, 2, 3, 4, 5].map((level) => (
                    <motion.div
                        key={level}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        className={`h-full flex-1 transition-all duration-500 ${
                            level <= strength ? color : 'bg-muted-foreground/10'
                        }`}
                    />
                ))}
            </div>
        </div>
    );
};
