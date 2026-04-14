import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
    User, 
    Phone, 
    Mail, 
    Calendar, 
    MapPin, 
    Briefcase, 
    Hash, 
    Flag, 
    Globe,
    CheckCircle2
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface PatientDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: any;
}

export const PatientDetailsModal: React.FC<PatientDetailsModalProps> = ({
  isOpen,
  onClose,
  patient,
}) => {
  if (!patient) return null;

  const DetailItem = ({ icon: Icon, label, value, colorClass = "text-muted-foreground" }: any) => (
    <div className="flex items-start gap-2 p-2 rounded-xl bg-muted/30 border-2 border-transparent hover:border-emerald-500/10 hover:bg-emerald-500/5 transition-all group overflow-hidden">
      <div className={`p-1.5 rounded-lg bg-background border shadow-sm group-hover:shadow-emerald-500/10 transition-all shrink-0 ${colorClass}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="space-y-0.5 overflow-hidden">
        <p className="text-[8px] font-black uppercase tracking-[0.1rem] text-muted-foreground/70 truncate">
          {label}
        </p>
        <p className="text-[11px] font-bold tracking-tight text-foreground truncate">
          {value || 'N/A'}
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl rounded-[2rem] border-2 border-primary/5 shadow-2xl p-0 overflow-hidden bg-background">
        <div className="relative">
            {/* Header / Banner Area */}
            <div className="h-24 bg-gradient-to-r from-emerald-600 to-teal-600 flex items-end px-6 pb-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                    <User className="w-24 h-24 text-white" />
                </div>
                <div className="flex items-center gap-3 relative z-10">
                    <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-xl border border-white/30 shadow-2xl">
                        <User className="w-8 h-8 text-white" />
                    </div>
                    <div className="space-y-0.5">
                        <h2 className="text-xl font-black text-white tracking-tight leading-tight">
                            {patient.first_name} {patient.last_name}
                        </h2>
                        <div className="flex items-center gap-2">
                             <Badge className="bg-white/20 hover:bg-white/30 text-white border-transparent backdrop-blur-md font-bold uppercase tracking-wider text-[9px] px-1.5 py-0">
                                {patient.staff_id}
                             </Badge>
                             <Badge className="bg-emerald-400 text-emerald-950 border-transparent font-black uppercase tracking-wider text-[9px] px-1.5 py-0">
                                Active Patient
                             </Badge>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 sm:p-6 pb-4 space-y-6">
                {/* Section 1: Basic Bio */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-5 w-1 bg-emerald-500 rounded-full" />
                        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600">Personal Information</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <DetailItem icon={User} label="Full Names" value={`${patient.first_name} ${patient.middle_name || ''} ${patient.last_name}`} colorClass="text-emerald-600" />
                        <DetailItem icon={Calendar} label="Date of Birth" value={patient.dob} colorClass="text-teal-600" />
                        <DetailItem icon={Hash} label="Age" value={`${patient.age} Years`} colorClass="text-blue-600" />
                        <DetailItem icon={CheckCircle2} label="Gender" value={patient.gender} colorClass="text-rose-600" />
                        <DetailItem icon={Flag} label="Race / Tribe" value={patient.race} colorClass="text-amber-600" />
                        <DetailItem icon={Globe} label="Nationality" value={patient.nationality} colorClass="text-indigo-600" />
                    </div>
                </div>

                <Separator className="bg-primary/5" />

                <div className="space-y-6">
                    {/* Section 2: Institutional */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-5 w-1 bg-blue-500 rounded-full" />
                            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600">Institutional Details</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <DetailItem icon={Briefcase} label="Department" value={patient.department} colorClass="text-blue-600" />
                            <DetailItem icon={Hash} label="Staff Identification" value={patient.staff_id} colorClass="text-blue-500" />
                        </div>
                    </div>

                    <Separator className="bg-primary/5" />

                    {/* Section 3: Contact */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="h-5 w-1 bg-purple-500 rounded-full" />
                            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-600">Contact Channels</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <DetailItem icon={Phone} label="Primary Phone" value={patient.phone} colorClass="text-purple-600" />
                            <DetailItem icon={Mail} label="Official Email" value={patient.email} colorClass="text-purple-500" />
                        </div>
                    </div>
                </div>

                {/* Account Metadata */}
                <div className="pt-2 flex justify-between items-center bg-muted/20 p-4 rounded-[1.5rem] border-2 border-dashed">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <p className="text-[9px] font-bold text-muted-foreground">Digital Profile Verified & Audited</p>
                    </div>
                    <p className="text-[9px] font-mono font-bold text-muted-foreground/50 italic capitalize">
                       Registry Context
                    </p>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
