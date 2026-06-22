import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  WorkHistoryIcon, 
  Search01Icon, 
  ArrowLeft01Icon, 
  ArrowRight01Icon, 
  Loading03Icon, 
  Calendar01Icon, 
  UserIcon, 
  Activity01Icon, 
  GlobeIcon, 
  ComputerTerminal01Icon, 
  ArrowUpRight01Icon, 
  Shield01Icon 
} from '@hugeicons/core-free-icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAppContext } from '@/context/AppContext';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';

const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  
  // Advanced filters state
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user, socket } = useAppContext();

  const fetchLogs = async (pageNum: number, pageSize = perPage, filters = { action: actionFilter, username: userFilter, start: startDate, end: endDate }) => {
    setLoading(true);
    try {
      let url = `/api/admin/audit-logs?page=${pageNum}&per_page=${pageSize}`;
      
      if (filters.action) url += `&action=${filters.action}`;
      if (filters.username) url += `&username=${filters.username}`;
      if (filters.start) url += `&start_date=${new Date(filters.start).toISOString()}`;
      if (filters.end) url += `&end_date=${new Date(filters.end).toISOString()}`;

      const resp = await axios.get(url);
      setLogs(resp.data.logs);
      setTotalPages(resp.data.pages);
      setPage(resp.data.current_page);
      setTotalItems(resp.data.total || 0);
    } catch (err) {
      toast.error("Failed to fetch audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page, perPage, { action: actionFilter, username: userFilter, start: startDate, end: endDate });
  }, [page, perPage, actionFilter, userFilter, startDate, endDate]);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewLog = (newLog: any) => {
      if (page === 1) {
        setLogs(prev => [newLog, ...prev.slice(0, perPage - 1)]);
        setTotalItems(prev => prev + 1);
      }
    };
    
    socket.on('new_audit_log', handleNewLog);
    return () => {
      socket.off('new_audit_log', handleNewLog);
    };
  }, [socket, page, perPage]);

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
      
      const filteredData = Object.entries(data).filter(([key]) => key !== 'device' && key !== 'portal');
      if (filteredData.length === 0) return <p className="text-[10px] text-muted-foreground italic">No additional metadata fields.</p>;

      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          {filteredData.map(([key, value]) => (
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="p-1.5 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl text-primary">
              <HugeiconsIcon icon={WorkHistoryIcon} className="h-5 w-5 sm:h-8 sm:w-8" />
            </div>
            <div>
              <h1 className="text-base sm:text-2xl font-black tracking-tight text-foreground">System Audit Trails</h1>
              <p className="text-[9px] sm:text-sm text-muted-foreground font-medium">
                Monitor system activities, security events, and administrative overrides.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-stretch sm:items-center">
            <div className="relative group flex-1 sm:w-60">
              <HugeiconsIcon icon={Search01Icon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Search action..." 
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="h-11 pl-10 rounded-xl border-2 focus-visible:ring-primary/20 font-bold"
              />
            </div>
            <div className="relative group flex-1 sm:w-60">
              <HugeiconsIcon icon={UserIcon} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Search staff/username..." 
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="h-11 pl-10 rounded-xl border-2 focus-visible:ring-primary/20 font-bold"
              />
            </div>
          </div>
        </div>

        {/* Date Filters Panel */}
        <div className="bg-card p-4 rounded-2xl border flex flex-wrap gap-4 items-end shadow-sm">
          <div className="flex flex-col gap-1.5 min-w-[150px] flex-1">
            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Start Date</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-background border rounded-xl px-3 py-1.5 text-xs font-bold outline-none h-9 text-foreground w-full"
            />
          </div>
          
          <div className="flex flex-col gap-1.5 min-w-[150px] flex-1">
            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">End Date</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-background border rounded-xl px-3 py-1.5 text-xs font-bold outline-none h-9 text-foreground w-full"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setActionFilter('');
                setUserFilter('');
                setStartDate('');
                setEndDate('');
                fetchLogs(1, perPage, { action: '', username: '', start: '', end: '' });
              }}
              className="h-9 px-4 text-xs font-black rounded-xl"
            >
              Reset
            </Button>
          </div>
        </div>

        <Card className="border-2 shadow-xl overflow-hidden rounded-2xl bg-card">
          <CardHeader className="bg-muted/5 border-b py-4">
            <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2">
                    <HugeiconsIcon icon={Activity01Icon} className="w-4 h-4" />
                    Security Event Log
                </CardTitle>
                <Badge variant="outline" className="font-bold text-[10px] bg-primary/5 text-primary border-primary/20">
                    Live Stream Active
                </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow className="hover:bg-transparent border-b-2 text-left">
                    <TableHead className="font-black text-[10px] uppercase tracking-wider py-4 text-left w-[25%]"><HugeiconsIcon icon={UserIcon} className="w-3 h-3 inline mr-1" /> Originator</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-wider py-4 text-left w-[20%]"><HugeiconsIcon icon={Activity01Icon} className="w-3 h-3 inline mr-1" /> Action</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-wider py-4 w-[25%]">Resource Target</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-wider py-4 w-[15%]"><HugeiconsIcon icon={GlobeIcon} className="w-3 h-3 inline mr-1" /> Source / Device</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-wider py-4 text-right w-[15%]"><HugeiconsIcon icon={Calendar01Icon} className="w-3 h-3 inline mr-1" /> Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <Skeleton className="w-7 h-7 rounded-lg bg-muted/40 animate-pulse" />
                            <div className="space-y-1.5 flex-1">
                              <Skeleton className="h-3.5 w-20 rounded bg-muted/40 animate-pulse" />
                              <Skeleton className="h-2 w-12 rounded bg-muted/40 animate-pulse" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Skeleton className="h-5 w-16 rounded bg-muted/40 animate-pulse" />
                        </TableCell>
                        <TableCell className="py-3">
                          <Skeleton className="h-3 w-40 rounded bg-muted/40 animate-pulse" />
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="space-y-1.5">
                            <Skeleton className="h-3 w-20 rounded bg-muted/40 animate-pulse" />
                            <Skeleton className="h-2 w-16 rounded bg-muted/40 animate-pulse" />
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <Skeleton className="h-3.5 w-16 rounded bg-muted/40 ml-auto animate-pulse" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : logs.filter(log => 
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
                      <TableCell className="py-2.5">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-mono font-bold text-slate-400">{log.resource}</span>
                          {log.patient_name && (
                            <span className="text-[10px] font-bold text-primary mt-0.5">
                              Patient: {log.patient_name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-slate-400">{log.ip_address || '127.0.0.1'}</span>
                          {log.details?.device && (
                            <span className="text-[9px] font-semibold text-muted-foreground/80 truncate max-w-[130px]" title={`${log.details.device.platform} / ${log.details.device.browser}`}>
                              {log.details.device.platform} / {log.details.device.browser}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-[11px] font-bold text-slate-500 py-2.5 text-right whitespace-nowrap">
                        {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <div className="bg-muted/5 px-8 py-2 border-t">
            <Pagination
              currentPage={page}
              totalItems={totalItems}
              perPage={perPage}
              onPageChange={setPage}
              onPerPageChange={setPerPage}
              loading={loading}
            />
          </div>
        </Card>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-2xl border-2 shadow-2xl rounded-3xl overflow-hidden p-0 gap-0">
                {selectedLog && (
                    <>
                        <div className="bg-muted/30 p-8 border-b">
                            <div className="flex items-center justify-between mb-6">
                                <Badge variant="outline" className={`font-black text-[10px] px-3 py-1 rounded-full border shadow-sm ${getActionColor(selectedLog.action)}`}>
                                    <HugeiconsIcon icon={Activity01Icon} className="w-3 h-3 mr-1.5" />
                                    {selectedLog.action}
                                </Badge>
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                    REF #LOG-{selectedLog.id}
                                </span>
                            </div>
                            
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tighter mb-1">Activity Insight</h2>
                            <p className="text-sm text-muted-foreground font-medium italic">Detailed breakdown of the system interaction event.</p>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto">
                            <div className="p-8 space-y-8">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                            <HugeiconsIcon icon={UserIcon} className="w-3 h-3" /> Originator
                                        </p>
                                        <p className="text-sm font-bold">{selectedLog.user_name || 'System Auto'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                            <HugeiconsIcon icon={GlobeIcon} className="w-3 h-3" /> Source IP
                                        </p>
                                        <p className="text-sm font-bold font-mono">{selectedLog.ip_address || '127.0.0.1'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                            <HugeiconsIcon icon={Calendar01Icon} className="w-3 h-3" /> Registered At
                                        </p>
                                        <p className="text-sm font-bold">{format(new Date(selectedLog.timestamp), 'MMM dd, yyyy HH:mm:ss')}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg> Access Device
                                        </p>
                                        <p className="text-sm font-bold truncate" title={selectedLog.details?.device ? `${selectedLog.details.device.platform} / ${selectedLog.details.device.browser}` : 'Unknown'}>
                                            {selectedLog.details?.device 
                                                ? `${selectedLog.details.device.platform} (${selectedLog.details.device.browser})`
                                                : 'Unknown'
                                            }
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                        <HugeiconsIcon icon={ArrowUpRight01Icon} className="w-3 h-3" /> Target Resource
                                    </p>
                                    <div className="p-4 rounded-2xl bg-primary/[0.03] border-2 border-primary/5 flex items-center justify-between group">
                                        <span className="font-bold text-primary font-mono text-xs">{selectedLog.resource}</span>
                                        <HugeiconsIcon icon={Shield01Icon} className="w-4 h-4 text-primary opacity-20 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>

                                {selectedLog.patient_name && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-2xl bg-slate-500/[0.03] border border-slate-500/10">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                                <HugeiconsIcon icon={UserIcon} className="w-3 h-3" /> Patient Full Name
                                            </p>
                                            <p className="text-sm font-black text-foreground">{selectedLog.patient_name}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 inline"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg> Patient Staff ID
                                            </p>
                                            <p className="text-sm font-bold font-mono">{selectedLog.patient_staff_id || 'N/A'}</p>
                                        </div>
                                    </div>
                                )}

                                {selectedLog.details?.device?.user_agent && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                            User Agent String
                                        </p>
                                        <div className="p-3.5 rounded-xl bg-slate-500/[0.03] border border-slate-500/10 text-[10px] font-mono text-muted-foreground break-all leading-normal">
                                            {selectedLog.details.device.user_agent}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                            <HugeiconsIcon icon={ComputerTerminal01Icon} className="w-3 h-3" /> Extended Metadata
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
                        </div>

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
