import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface PasswordMatchIndicatorProps {
    password?: string;
    confirmPassword?: string;
}

export const PasswordMatchIndicator: React.FC<PasswordMatchIndicatorProps> = ({ 
    password = '', 
    confirmPassword = '' 
}) => {
    if (!password && !confirmPassword) return null;

    const isMatch = password === confirmPassword && password.length > 0;

    return (
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all animate-in fade-in slide-in-from-right-2 duration-300 ${
            isMatch 
                ? 'bg-primary/5 border-primary/20 text-primary' 
                : 'bg-rose-500/5 border-rose-500/20 text-rose-500'
        }`}>
            {isMatch ? (
                <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Match</span>
                </>
            ) : (
                <>
                    <X className="w-3 h-3" />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Mismatch</span>
                </>
            )}
        </div>
    );
};
