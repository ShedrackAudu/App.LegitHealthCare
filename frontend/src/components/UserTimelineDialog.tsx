import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Calendar, 
  Clock, 
  Shield, 
  Key, 
  LogIn, 
  LogOut, 
  UserCog, 
  AlertTriangle,
  Mail,
  Activity,
  CheckCircle2,
  X,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from 'axios';
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppContext } from '@/context/AppContext';

import { Button } from "@/components/ui/button";

interface AuditLog {
  id: number;
  action: string;
  resource: string;
  timestamp: string;
  ip_address: string;
  user_name: string;
  details: any;
}

interface UserTimelineDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export const UserTimelineDialog: React.FC<UserTimelineDialogProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAppContext();

  useEffect(() => {
    if (isOpen && user) {
      fetchTimeline();
    }
  }, [isOpen, user]);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const headers = { 'X-User-ID': currentUser?.id?.toString() || '' };
      const response = await axios.get(`/api/admin/users/${user.id}/timeline`, { headers });
      setLogs(response.data);
    } catch (err) {
      console.error("Failed to fetch timeline:", err);
    } finally {
      setLoading(false);
    }
  };

  const getActionConfig = (action: string) => {
    const a = action.toUpperCase();
    if (a.includes('LOGIN')) return { icon: LogIn, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    if (a.includes('LOGOUT')) return { icon: LogOut, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
    if (a.includes('PASSWORD')) return { icon: Key, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
    if (a.includes('ROLE') || a.includes('PERMISSION')) return { icon: Shield, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' };
    if (a.includes('ONBOARD') || a.includes('CREATE')) return { icon: UserCog, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
    if (a.includes('FAIL') || a.includes('ERROR')) return { icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-600/10', border: 'border-rose-600/20' };
    return { icon: Activity, color: 'text-muted-foreground', bg: 'bg-muted/20', border: 'border-muted' };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-0 shadow-2xl rounded-2xl bg-card">
        <DialogHeader className="p-6 bg-muted/30 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight">User Security Timeline</DialogTitle>
                <p className="text-sm text-muted-foreground font-medium italic">Audit history for {user?.first_name} {user?.last_name} (@{user?.username})</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-0">
          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
              <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">Scanning Logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center">
                    <Activity className="h-10 w-10 text-muted-foreground/30" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-foreground/70">No Records Found</h3>
                    <p className="text-sm text-muted-foreground italic max-w-xs mx-auto">This user has no recorded security events in the current audit window.</p>
                </div>
            </div>
          ) : (
            <ScrollArea className="h-[500px] px-6 py-8">
              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted-foreground/10 before:to-transparent">
                {logs.map((log, idx) => {
                  const config = getActionConfig(log.action);
                  const Icon = config.icon;
                  return (
                    <motion.div 
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="relative flex items-start gap-6 group"
                    >
                      {/* Timeline Dot/Icon */}
                      <div className={`relative z-10 flex items-center justify-center h-10 w-10 rounded-xl border-2 shadow-sm transition-all group-hover:scale-110 ${config.bg} ${config.border} ${config.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <h4 className="text-sm font-black tracking-tight uppercase">{log.action.replace(/_/g, ' ')}</h4>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold">
                              <Clock className="h-3 w-3" />
                              {format(new Date(log.timestamp), 'PPP p')}
                            </div>
                          </div>
                          <Badge variant="outline" className="w-fit text-[9px] font-black uppercase tracking-tighter opacity-60">
                            {log.ip_address}
                          </Badge>
                        </div>
                        
                        <div className="bg-muted/20 rounded-xl p-3 border border-transparent hover:border-border transition-all">
                          <p className="text-xs text-foreground/80 leading-relaxed italic">
                            {log.resource ? `${log.resource}: ` : ''}
                            {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                          </p>
                          <div className="mt-2 pt-2 border-t border-muted-foreground/5 flex items-center gap-2">
                             <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Authenticated By:</span>
                             <span className="text-[9px] font-bold text-primary/60">{log.user_name}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="p-4 bg-muted/30 border-t flex justify-end">
          <Button variant="ghost" onClick={onClose} className="font-bold">Close History</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


