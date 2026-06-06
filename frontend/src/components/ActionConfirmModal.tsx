import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HugeiconsIcon } from '@hugeicons/react';
import { Alert01Icon, HelpCircleIcon, InformationCircleIcon } from '@hugeicons/core-free-icons';
import { cn } from "@/lib/utils";

interface ActionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
  verificationText?: string;
}

export const ActionConfirmModal: React.FC<ActionConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = 'danger',
  loading = false,
  verificationText,
}) => {
  const [typedVerification, setTypedVerification] = React.useState("");

  React.useEffect(() => {
    if (isOpen) {
      setTypedVerification("");
    }
  }, [isOpen]);

  const iconName = variant === 'danger' ? Alert01Icon : variant === 'warning' ? HelpCircleIcon : InformationCircleIcon;
  const variantStyles = {
    danger: "bg-destructive/10 text-destructive border-destructive/20",
    warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    info: "bg-primary/10 text-primary border-primary/20",
  };

  const buttonStyles = {
    danger: "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/20",
    warning: "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20",
    info: "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-[2rem] border-2 border-primary/5 shadow-2xl p-0 overflow-hidden">
        <div className="p-8 space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
                <div className={cn("p-4 rounded-2xl border-2 transition-all animate-in zoom-in-50 duration-300", variantStyles[variant])}>
                    <HugeiconsIcon icon={iconName} className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                    <DialogTitle className="text-2xl font-black tracking-tight">{title}</DialogTitle>
                    <DialogDescription className="text-muted-foreground font-medium text-sm leading-relaxed max-w-[280px] mx-auto">
                        {description}
                    </DialogDescription>
                </div>
                {verificationText && (
                    <div className="space-y-3 mt-4 text-left w-full px-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center block">
                            Type <span className="text-destructive bg-destructive/10 px-2 py-0.5 rounded-md select-all">{verificationText}</span> to confirm
                        </label>
                        <Input 
                            value={typedVerification}
                            onChange={(e) => setTypedVerification(e.target.value)}
                            placeholder={verificationText}
                            className="h-12 border-2 focus-visible:ring-destructive text-center font-bold tracking-widest uppercase"
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck="false"
                        />
                    </div>
                )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                    variant="ghost"
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 h-14 rounded-2xl font-bold text-muted-foreground hover:bg-muted active:scale-95 transition-all order-2 sm:order-1"
                >
                    {cancelText}
                </Button>
                <Button
                    onClick={() => {
                        onConfirm();
                    }}
                    disabled={loading || (!!verificationText && typedVerification !== verificationText)}
                    className={cn("flex-1 h-14 rounded-2xl font-black text-lg active:scale-95 transition-all order-1 sm:order-2", buttonStyles[variant])}
                >
                    {loading ? "Processing..." : confirmText}
                </Button>
            </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
