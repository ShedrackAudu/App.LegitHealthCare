import React from 'react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
    User, 
    Phone, 
    Mail, 
    Calendar, 
    Briefcase, 
    Hash, 
    CheckCircle2,
    X
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from '@/context/AppContext';

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
  const { branding } = useAppContext();
  if (!patient) return null;

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { 
        duration: 0.4, 
        ease: [0.16, 1, 0.3, 1],
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  const DetailItem = ({ icon: Icon, label, value, colorClass = "text-primary" }: any) => (
    <motion.div 
      variants={itemVariants}
      whileHover={{ y: -1, scale: 1.01 }}
      className="relative flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-muted/20 border border-transparent hover:border-primary/20 hover:bg-primary/[0.02] transition-all group overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className={`relative p-1.5 sm:p-2 rounded-xl bg-background border shadow-inner transition-all shrink-0 ${colorClass}`}>
        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </div>
      <div className="relative space-y-0.5 overflow-hidden">
        <p className="text-[7px] sm:text-[9px] font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] text-muted-foreground/60 truncate">
          {label}
        </p>
        <p className="text-[10px] sm:text-xs font-bold tracking-tight text-foreground truncate">
          {value || 'N/A'}
        </p>
      </div>
    </motion.div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideClose={true} className="w-[95%] max-w-xl border-0 shadow-none p-0 bg-transparent flex items-center justify-center overflow-visible">
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div 
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={containerVariants}
              className="w-full bg-background rounded-[1.5rem] border shadow-2xl overflow-hidden relative"
            >
              {/* Top Banner (Clinic Colors) */}
              <div className="h-28 sm:h-32 bg-gradient-to-br from-primary/80 to-primary/40 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                
                {/* Close Button */}
                <button 
                  onClick={onClose}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 p-1.5 rounded-full bg-black/10 hover:bg-black/20 text-white transition-all backdrop-blur-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Profile Avatar (Overlapping) */}
              <div className="relative -mt-12 sm:-mt-16 flex justify-center px-4 sm:px-8">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-background rounded-full shadow-lg" />
                    <div className="relative h-24 w-24 sm:h-32 sm:w-32 rounded-full bg-secondary flex items-center justify-center border-4 border-background overflow-hidden shadow-2xl">
                        {branding?.logo_light ? (
                            <img 
                                src={branding.logo_light} 
                                alt="Clinic" 
                                className="w-16 h-16 sm:w-20 sm:h-20 object-contain p-2" 
                            />
                        ) : (
                            <div className="text-3xl sm:text-4xl font-black text-primary uppercase">
                                {patient.first_name?.[0]}{patient.last_name?.[0]}
                            </div>
                        )}
                    </div>
                    {/* Active Status Dot */}
                    <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-5 h-5 sm:w-6 sm:h-6 bg-background rounded-full p-1 shadow-lg">
                        <div className="w-full h-full bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    </div>
                </div>
              </div>

              <div className="px-4 sm:px-8 pt-4 sm:pt-6 pb-6 sm:pb-8 space-y-6 sm:space-y-8">
                  {/* Centered Profile Header */}
                  <div className="text-center space-y-1.5 sm:space-y-2">
                      <motion.h2 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xl sm:text-3xl font-black tracking-tight text-foreground truncate px-4"
                      >
                          {patient.first_name} {patient.last_name}
                      </motion.h2>
                      <div className="flex flex-col items-center gap-1 sm:gap-1.5">
                          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.25em] text-primary">
                            @{patient.staff_id}
                          </span>
                          <div className="flex items-center gap-2 mt-1 sm:mt-2">
                              <Badge className="bg-primary/10 text-primary border-primary/20 font-black uppercase tracking-widest text-[8px] sm:text-[9px] px-2 sm:px-2.5 py-0.5 rounded-md shadow-sm">
                                  Patient Profile
                              </Badge>
                              <Badge variant="outline" className="font-black uppercase tracking-widest text-[8px] sm:text-[9px] px-2 sm:px-2.5 py-0.5 rounded-md opacity-60">
                                  Registry
                              </Badge>
                          </div>
                      </div>
                  </div>

                  {/* Information Grid - ALL 2-columns even on mobile */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div className="col-span-2">
                        <DetailItem icon={Mail} label="Official Email" value={patient.email} />
                      </div>
                      
                      <DetailItem icon={Phone} label="Primary Phone" value={patient.phone} />
                      <DetailItem icon={Calendar} label="System Joined" value="Apr 2026" />
                      
                      <DetailItem icon={Briefcase} label="Institutional Department" value={patient.department} />
                      <DetailItem icon={CheckCircle2} label="Security Status" value="Verified" />
                  </div>

                  {/* Bio-Metric Metrics (Secondary Grid) */}
                  <div className="pt-1 sm:pt-2">
                      <div className="flex items-center gap-3 mb-3 sm:mb-4">
                          <Separator className="flex-1" />
                          <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.4em] sm:tracking-[0.4em] text-muted-foreground/40 whitespace-nowrap">Bio-Metric Metrics</span>
                          <Separator className="flex-1" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                          <div className="text-center p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-muted/20 border border-transparent hover:border-primary/5 transition-all">
                              <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Age Value</p>
                              <p className="text-[10px] sm:text-sm font-black mt-1 text-foreground">{patient.age} Yrs</p>
                          </div>
                          <div className="text-center p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-muted/20 border border-transparent hover:border-primary/5 transition-all">
                              <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Gender</p>
                              <p className="text-[10px] sm:text-sm font-black mt-1 text-foreground">{patient.gender}</p>
                          </div>
                          <div className="text-center p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-muted/20 border border-transparent hover:border-primary/5 transition-all overflow-hidden">
                              <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Region</p>
                              <p className="text-[10px] sm:text-sm font-black mt-1 text-foreground truncate px-1">{patient.nationality || patient.race}</p>
                          </div>
                      </div>
                  </div>

                  {/* Footer Verification */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="pt-4 sm:pt-6 flex flex-col sm:flex-row gap-3 sm:justify-between items-center border-t border-muted/50"
                  >
                      <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-muted/20 border border-transparent">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">Verified Audit Session</p>
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">
                         {branding?.clinic_name || 'System Registry'}
                      </p>
                  </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
