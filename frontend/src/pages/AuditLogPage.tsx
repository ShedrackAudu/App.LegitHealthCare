import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { History, Search, ChevronLeft, ChevronRight, Loader2, Calendar, User, Activity, Globe, Terminal, Info, ExternalLink, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAppContext } from '@/context/AppContext';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAppContext();

  const fetchLogs = async (pageNum: number) => {
    setLoading(true);
    try {
      const resp = await axios.get(`/api/admin/audit-logs?page=${pageNum}&per_page=15`);
      setLogs(resp.data.logs);
      setTotalPages(resp.data.pages);
      setPage(resp.data.current_page);
    } catch (err) {
      toast.error("Failed to fetch audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const getActionColor = (action: string) => {
    const act = action.toUpperCase();
    
    // High Risk / Destructive
    if (act.includes('DELETE') || act.includes('CLEAR') || act.includes('REVOKE') || act.includes('DEACTIVATE')) {
      return 'bg-rose-500/10 text-rose-500 border-rose-500/20 antialiased shadow-sm ring-1 ring-rose-500/10';
    }
    
    // Administrative / Creation
    if (act.includes('CREATE') || act.includes('ADD') || act.includes('IMPORT') || act.includes('ASSIGN')) {
      return 'bg-primary/10 text-primary border-primary/20 antialiased shadow-sm ring-1 ring-primary/10';
    }
    
    // Mutations / Changes
    if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('RESET') || act.includes('CHANGE') || act.includes('SET')) {
      return 'bg-amber-500/10 text-amber-500 border-amber-500/20 antialiased shadow-sm ring-1 ring-amber-500/10';
    }
    
    // Access / Security
    if (act.includes('ACTIVATE') || act.includes('GENERATE') || act.includes('LOGIN') || act.includes('VERIFY') || act.includes('ACCESS')) {
      return 'bg-violet-500/10 text-violet-500 border-violet-500/20 antialiased shadow-sm ring-1 ring-violet-500/10';
    }
    
    // Data Operations
    if (act.includes('EXPORT') || act.includes('DOWNLOAD') || act.includes('VIEW') || act.includes('PRINT')) {
      return 'bg-sky-500/10 text-sky-500 border-sky-500/20 antialiased shadow-sm ring-1 ring-sky-500/10';
    }
    
    return 'bg-slate-500/10 text-slate-500 border-slate-500/20 antialiased';
  };

  const renderDetails = (details: any) => {
    if (!details) return <p className="text-[10px] text-muted-foreground italic">No extended metadata available.</p>;
    try {
      const data = typeof details === 'string' ? JSON.parse(details) : details;
      if (typeof data !== 'object' || data === null) return <p className="text-xs font-bold">{String(data)}</p>;
      
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="p-3 rounded-xl bg-slate-500/[0.03] border border-slate-500/10 hover:border-slate-500/20 transition-all">
              <p className="text-[9px] font-black uppercase text-slate-500/60 mb-0.5 tracking-widest">{key.replace(/_/g, ' ')}</p>
              <p className="text-[11px] font-bold text-foreground line-clamp-2" title={String(value)}>{String(value)}</p>
            </div>
          ))}
        </div>
      );
    } catch {
      return <p className="text-xs font-bold truncate">{String(details)}</p>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 sm:gap-6 bg-card p-4 sm:p-6 rounded-2xl border transition-all">
          <div className="flex items-center gap-3">
            <div className="p-1.5 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl text-primary">
              <History className="h-5 w-5 sm:h-8 sm:w-8" />
            </div>
            <div>
              <h1 className="text-base sm:text-2xl font-black tracking-tight text-foreground">System Audit Trails</h1>
              <p className="text-[9px] sm:text-sm text-muted-foreground font-medium">
                Monitor system activities, security events, and administrative overrides.
              </p>
            </div>
          </div>
          
          <div className="relative w-full lg:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search by action or user..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 pl-10 rounded-xl border-2 focus-visible:ring-primary/20 font-bold"
            />
          </div>
        </div>

        <Card className="border-2 shadow-xl overflow-hidden rounded-2xl bg-card">
          <CardHeader className="bg-muted/5 border-b py-4">
            <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Security Event Log
                </CardTitle>
                <Badge variant="outline" className="font-bold text-[10px] bg-primary/5 text-primary border-primary/20">
                    Live Stream Active
                </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-6">
            {loading ? (
              <div className="h-96 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground font-black text-xs uppercase tracking-widest animate-pulse">Retrieving encrypted logs...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/10">
                    <TableRow className="hover:bg-transparent border-b-2 text-left">
                      <TableHead className="font-black text-[10px] uppercase tracking-wider py-4 text-left w-[25%]"><User className="w-3 h-3 inline mr-1" /> Originator</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-wider py-4 text-left w-[20%]"><Activity className="w-3 h-3 inline mr-1" /> Action</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-wider py-4 w-[25%]">Resource Target</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-wider py-4 w-[15%]"><Globe className="w-3 h-3 inline mr-1" /> Source IP</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-wider py-4 text-right w-[15%]"><Calendar className="w-3 h-3 inline mr-1" /> Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.filter(log => 
                      log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      (log.user_name && log.user_name.toLowerCase().includes(searchTerm.toLowerCase()))
                    ).map((log) => (
                      <TableRow 
                        key={log.id} 
                        onClick={() => {
                            setSelectedLog(log);
                            setIsModalOpen(true);
                        }}
                        className="group hover:bg-muted/5 transition-all border-b cursor-pointer relative"
                      >
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-[10px] border border-primary/20">
                                {log.user_name?.charAt(0) || 'S'}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-black tracking-tight">{log.user_name || 'System'}</span>
                                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
                                    Verified Event
                                </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 text-left">
                          <Badge variant="outline" className={`font-black text-[9px] px-2 py-0.5 rounded-lg border shadow-sm ${getActionColor(log.action)}`}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[11px] font-mono font-bold text-slate-400 py-2.5">
                          {log.resource}
                        </TableCell>
                        <TableCell className="text-[11px] font-bold text-slate-400 py-2.5">
                          {log.ip_address || '127.0.0.1'}
                        </TableCell>
                        <TableCell className="text-[11px] font-bold text-slate-500 py-2.5 text-right whitespace-nowrap">
                          {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          <div className="bg-muted/5 p-4 border-t flex items-center justify-between">
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="h-8 rounded-lg font-black text-[10px] uppercase gap-1"
              >
                <ChevronLeft className="w-3 h-3" /> Prev
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="h-8 rounded-lg font-black text-[10px] uppercase gap-1"
              >
                Next <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </Card>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-2xl border-2 shadow-2xl rounded-3xl overflow-hidden p-0 gap-0">
                {selectedLog && (
                    <>
                        <div className="bg-muted/30 p-8 border-b">
                            <div className="flex items-center justify-between mb-6">
                                <Badge variant="outline" className={`font-black text-[10px] px-3 py-1 rounded-full border shadow-sm ${getActionColor(selectedLog.action)}`}>
                                    <Activity className="w-3 h-3 mr-1.5" />
                                    {selectedLog.action}
                                </Badge>
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                    REF #LOG-{selectedLog.id}
                                </span>
                            </div>
                            
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tighter mb-1">Activity Insight</h2>
                            <p className="text-sm text-muted-foreground font-medium italic">Detailed breakdown of the system interaction event.</p>
                        </div>

                        <ScrollArea className="max-h-[60vh]">
                            <div className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                            <User className="w-3 h-3" /> Originator
                                        </p>
                                        <p className="text-sm font-bold">{selectedLog.user_name || 'System Auto'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                            <Globe className="w-3 h-3" /> Source IP
                                        </p>
                                        <p className="text-sm font-bold font-mono">{selectedLog.ip_address || '127.0.0.1'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3" /> Registered At
                                        </p>
                                        <p className="text-sm font-bold">{format(new Date(selectedLog.timestamp), 'MMM dd, yyyy HH:mm:ss')}</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                        <ExternalLink className="w-3 h-3" /> Target Resource
                                    </p>
                                    <div className="p-4 rounded-2xl bg-primary/[0.03] border-2 border-primary/5 flex items-center justify-between group">
                                        <span className="font-bold text-primary font-mono text-xs">{selectedLog.resource}</span>
                                        <Shield className="w-4 h-4 text-primary opacity-20 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                            <Terminal className="w-3 h-3" /> Extended Metadata
                                        </p>
                                        <Badge variant="outline" className="text-[8px] border-primary/20 bg-primary/5 text-primary font-black">
                                            ENCRYPTED PAYLOAD
                                        </Badge>
                                    </div>
                                    <div className="p-1 rounded-2xl">
                                        {renderDetails(selectedLog.details)}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>

                        <div className="p-6 bg-muted/30 border-t flex justify-end">
                            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold px-8">
                                Dismiss Insight
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default AuditLogPage;
