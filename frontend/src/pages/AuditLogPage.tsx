import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { History, Search, ChevronLeft, ChevronRight, Loader2, Calendar, User, Activity, Globe } from 'lucide-react';
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
  const { user } = useAppContext();

  const fetchLogs = async (pageNum: number) => {
    setLoading(true);
    try {
      const resp = await axios.get(`http://localhost:5000/api/admin/audit-logs?page=${pageNum}&per_page=15`, {
        headers: { 'X-User-ID': user?.id?.toString() }
      });
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
    if (action.includes('DELETE')) return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    if (action.includes('CREATE') || action.includes('ADD')) return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    if (action.includes('LOGIN')) return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
    return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <History className="w-8 h-8 text-primary" />
              System Audit Trails
            </h1>
            <p className="text-muted-foreground font-medium italic mt-1">Monitor system activities, security events, and administrative overrides.</p>
          </div>
          
          <div className="relative w-full md:w-72 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search by action or user..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl border-2 focus-visible:ring-primary/20"
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
                      <TableHead className="font-black text-[10px] uppercase tracking-wider py-4 text-left w-[20%]"><Activity className="w-3 h-3 inline mr-1" /> Action</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-wider py-4 text-left w-[25%]"><User className="w-3 h-3 inline mr-1" /> Originator</TableHead>
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
                      <TableRow key={log.id} className="group hover:bg-muted/50 transition-colors border-b">
                        <TableCell className="py-2.5 text-left">
                          <Badge className={`font-black text-[9px] px-2 py-0.5 rounded-lg border shadow-sm ${getActionColor(log.action)}`}>
                            {log.action}
                          </Badge>
                        </TableCell>
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
      </div>
    </MainLayout>
  );
};

export default AuditLogPage;
