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

    const getColorClass = (s: number) => {
        if (s <= 2) return 'text-rose-500';
        if (s === 3) return 'text-amber-500';
        if (s === 4) return 'text-blue-500';
        return 'text-primary';
    };

    const getBgColorClass = (s: number) => {
        if (s <= 2) return 'bg-rose-500';
        if (s === 3) return 'bg-amber-500';
        if (s === 4) return 'bg-blue-500';
        return 'bg-primary';
    };

    const label = getLabel(strength);
    const colorClass = getColorClass(strength);

    if (!password) return null;

    return (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="flex gap-0.5 items-center">
                {[1, 2, 3, 4, 5].map((level) => (
                    <div
                        key={level}
                        className={`h-1 w-3 rounded-full transition-all duration-500 ${
                            level <= strength ? getBgColorClass(strength) : 'bg-muted-foreground/20'
                        }`}
                    />
                ))}
            </div>
            <span className={`text-[9px] font-black uppercase tracking-tighter ${colorClass}`}>
                {label}
            </span>
        </div>
    );
};

