import React, { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Shield01Icon,
  Activity01Icon,
  LockIcon,
  AnalyticsUpIcon,
  Alert01Icon,
  Database02Icon,
  UserIcon,
  Logout02Icon,
  Clock01Icon,
  Settings02Icon
} from '@hugeicons/core-free-icons';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import api from '@/lib/api';
import { useAppContext } from '@/context/AppContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#0d9488', '#0891b2', '#2563eb', '#7c3aed', '#db2777', '#ea580c'];

// Premium Interactive SVG World Threat Map (Phase 3)
function InteractiveThreatMap({ threatVectors }: { threatVectors: any[] }) {
  const [hoveredThreat, setHoveredThreat] = useState<any | null>(null);

  const getXY = (lat: number, lng: number) => {
    // Map longitude (-180 to 180) to X (0 to 450)
    const x = ((lng + 180) * 450) / 360;
    // Map latitude (-90 to 90) to Y (220 to 0)
    const y = ((90 - lat) * 220) / 180;
    return { x, y };
  };

  return (
    <Card className="relative overflow-hidden border border-border shadow-lg rounded-xl bg-card">
      <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-black uppercase tracking-widest text-rose-500">Live Threat Vector Map</CardTitle>
          <CardDescription className="text-[10px]">Real-time geolocations of blocked vectors</CardDescription>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-tighter text-rose-500">Active Shield</span>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-2 relative">
        <div className="w-full aspect-[2/1] relative bg-slate-50 dark:bg-slate-950 rounded-lg border border-border/80 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          <svg className="w-full h-full opacity-90" viewBox="0 0 450 220" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Grid lines */}
            <g className="opacity-30 dark:opacity-10" stroke="#2dd4bf" strokeWidth="0.5">
              <line x1="0" y1="55" x2="450" y2="55" />
              <line x1="0" y1="110" x2="450" y2="110" />
              <line x1="0" y1="165" x2="450" y2="165" />
              <line x1="112.5" y1="0" x2="112.5" y2="220" />
              <line x1="225" y1="0" x2="225" y2="220" />
              <line x1="337.5" y1="0" x2="337.5" y2="220" />
            </g>

            {/* Stylized landmasses (Continents) */}
            {/* North America */}
            <ellipse cx="100" cy="70" rx="45" ry="30" className="fill-slate-200/70 dark:fill-slate-800/40" />
            <path d="M70,50 Q110,40 140,65 T80,95 Z" className="fill-slate-200/70 dark:fill-slate-800/40 stroke-slate-300 dark:stroke-slate-700" strokeWidth="0.5" />
            
            {/* South America */}
            <ellipse cx="140" cy="150" rx="25" ry="40" className="fill-slate-200/70 dark:fill-slate-800/40" />
            <path d="M125,120 Q150,130 150,170 T130,185 Z" className="fill-slate-200/70 dark:fill-slate-800/40 stroke-slate-300 dark:stroke-slate-700" strokeWidth="0.5" />

            {/* Africa */}
            <ellipse cx="230" cy="120" rx="30" ry="40" className="fill-slate-200/70 dark:fill-slate-800/40" />
            <path d="M210,95 Q250,90 255,120 T220,155 Z" className="fill-slate-200/70 dark:fill-slate-800/40 stroke-slate-300 dark:stroke-slate-700" strokeWidth="0.5" />

            {/* Eurasia */}
            <ellipse cx="300" cy="65" rx="75" ry="40" className="fill-slate-200/70 dark:fill-slate-800/40" />
            <path d="M245,55 Q310,35 365,60 T290,95 Z" className="fill-slate-200/70 dark:fill-slate-800/40 stroke-slate-300 dark:stroke-slate-700" strokeWidth="0.5" />

            {/* Australia */}
            <ellipse cx="380" cy="160" rx="25" ry="18" className="fill-slate-200/70 dark:fill-slate-800/40" />
            <path d="M360,150 Q390,145 395,165 T370,173 Z" className="fill-slate-200/70 dark:fill-slate-800/40 stroke-slate-300 dark:stroke-slate-700" strokeWidth="0.5" />

            {/* Threat points mapping */}
            {threatVectors.map((threat, idx) => {
              if (threat.latitude === undefined || threat.longitude === undefined || threat.latitude === null || threat.longitude === null) return null;
              const { x, y } = getXY(threat.latitude, threat.longitude);
              const isLatest = idx === 0;

              return (
                <g key={threat.id || idx} className="cursor-pointer"
                   onMouseEnter={() => setHoveredThreat(threat)}
                   onMouseLeave={() => setHoveredThreat(null)}>
                  {/* Pulsating ring for latest threat */}
                  {isLatest && (
                    <circle cx={x} cy={y} r="10" fill="none" stroke="#f43f5e" strokeWidth="1.5" opacity="0.8">
                      <animate attributeName="r" values="3;12" dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="1;0" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {/* Solid dot */}
                  <circle cx={x} cy={y} r={isLatest ? 4.5 : 2.5} fill={isLatest ? "#f43f5e" : "#fb7185"} />
                </g>
              );
            })}
          </svg>

          {/* Hover overlay/tooltip */}
          {hoveredThreat && (
            <div className="absolute bottom-2 left-2 right-2 bg-slate-900/95 dark:bg-black/95 text-[9px] font-mono p-2 border border-rose-500/30 text-rose-400 rounded flex justify-between items-center animate-in fade-in slide-in-from-bottom-1">
              <div>
                <span className="font-bold text-rose-500">[{hoveredThreat.action}]</span> {hoveredThreat.city}, {hoveredThreat.country} ({hoveredThreat.ip_address})
              </div>
              <div className="text-rose-500 font-bold shrink-0 ml-4">
                BLOCKED
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SecurityDashboard() {
  const navigate = useNavigate();
  const { socket } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewLog = (newLog: any) => {
      setRecentLogs(prev => [newLog, ...prev.slice(0, 9)]);
      fetchAnalytics();
      fetchSessions();
    };
    
    socket.on('new_audit_log', handleNewLog);
    return () => {
      socket.off('new_audit_log', handleNewLog);
    };
  }, [socket]);

  useEffect(() => {
    fetchAnalytics();
    fetchSessions();
    fetchRecentLogs();

    // Poll every 10 seconds for a real-time command center feel
    const interval = setInterval(() => {
      fetchAnalytics();
      fetchSessions();
      fetchRecentLogs();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/api/admin/audit-analytics');
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch security analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await api.get('/api/admin/active-sessions');
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to fetch active sessions:', error);
    }
  };

  const fetchRecentLogs = async () => {
    try {
      const response = await api.get('/api/admin/audit-logs?page=1&per_page=10');
      setRecentLogs(response.data.logs || []);
    } catch (error) {
      console.error('Failed to fetch recent audit logs:', error);
    }
  };

  const handleRevokeSession = async (userId: number) => {
    setRevokingId(userId);
    try {
      await api.post(`/api/admin/active-sessions/revoke/${userId}`);
      toast.success("Session successfully revoked.");
      fetchSessions();
      fetchRecentLogs();
    } catch (error) {
      toast.error("Failed to revoke session.");
    } finally {
      setRevokingId(null);
    }
  };

  const formatLogTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (loading) {
    return (
      <MainLayout title="Security Command Center">
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[350px] w-full rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  if (!data || !data.timeline || !data.action_breakdown) {
    return (
      <MainLayout title="Security Command Center">
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 bg-muted/20 rounded-2xl border-2 border-dashed border-border/50">
          <HugeiconsIcon icon={Alert01Icon} className="h-10 w-10 text-amber-500 animate-bounce" />
          <div className="text-center">
            <h2 className="text-lg font-black tracking-tight">Security Engine Offline</h2>
            <p className="text-xs text-muted-foreground font-medium">Telemetry link interrupted or data unavailable.</p>
          </div>
          <button 
            onClick={() => { setLoading(true); fetchAnalytics(); }}
            className="px-6 py-2 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-lg hover:opacity-90 transition-all active:scale-95"
          >
            Retry Telemetry
          </button>
        </div>
      </MainLayout>
    );
  }

  const criticalEvents = [
    { 
      label: 'Login Failures', 
      value: data.failed_logins_24h, 
      icon: Shield01Icon, 
      color: 'text-rose-500', 
      bg: 'bg-rose-500/10',
      sub: 'Last 24 Hours'
    },
    { 
      label: 'Event Logs', 
      value: data.total_logs, 
      icon: Database02Icon, 
      color: 'text-teal-500', 
      bg: 'bg-teal-500/10',
      sub: 'Cumulative Audits'
    },
    { 
      label: 'Security Policies', 
      value: `${data.security_policies?.active_policies_count || 4} Active`, 
      icon: LockIcon, 
      color: 'text-indigo-500', 
      bg: 'bg-indigo-500/10',
      sub: `MFA Adoption: ${data.security_policies?.mfa_adoption_percentage || 0}%`
    },
    { 
      label: 'System Integrity', 
      value: data.system_integrity?.status || 'Protected', 
      icon: Activity01Icon, 
      color: data.system_integrity?.status === 'Protected' ? 'text-emerald-500' : 'text-rose-500', 
      bg: data.system_integrity?.status === 'Protected' ? 'bg-emerald-500/10' : 'bg-rose-500/10',
      sub: `Database: ${data.system_integrity?.database || 'Online'}`
    },
  ];

  return (
    <MainLayout title="Security Command Center">
      <div className="space-y-6 pb-8 animate-in slide-in-from-bottom-2 duration-500 dashboard-page">
        
        {/* Compact Stats Row */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {criticalEvents.map((item, idx) => (
            <div key={idx} className="relative overflow-hidden bg-card border border-border rounded-xl p-4 shadow-sm group hover:border-primary/30 transition-all duration-300">
              <div className="flex items-center gap-4 relative z-10">
                 <div className={cn("p-2.5 rounded-xl transition-transform group-hover:scale-110", item.bg, item.color)}>
                    <HugeiconsIcon icon={item.icon} className="h-5 w-5" />
                 </div>
                 <div>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.22em]">{item.label}</p>
                    <h3 className="text-lg font-black tracking-tighter mt-0.5 text-foreground leading-none">{item.value as React.ReactNode}</h3>
                    <p className="text-[9px] text-muted-foreground/80 mt-1 font-semibold">{item.sub}</p>
                 </div>
              </div>
              <div className="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                <HugeiconsIcon icon={item.icon} className="h-16 w-16" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-12">
          {/* Timeline Chart - Theme-Aware Appearance */}
          <Card className="md:col-span-8 border border-border shadow-xl rounded-xl bg-card overflow-hidden">
            <CardHeader className="pb-0 pt-6 px-8 flex flex-row items-center justify-between space-y-0">
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest">Active Monitoring</p>
                  <CardTitle className="text-xl font-black text-foreground">
                    Event Telemetry
                  </CardTitle>
               </div>
               <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-tighter text-emerald-600 dark:text-emerald-400">Real-Time</span>
               </div>
            </CardHeader>
            <CardContent className="pt-6 h-[320px] px-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.timeline}>
                  <defs>
                    <linearGradient id="premiumGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.05} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: 'currentColor', opacity: 0.5 }}
                    minTickGap={20}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'currentColor', opacity: 0.5 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderRadius: '0px', 
                      border: '1px solid hsl(var(--border))', 
                      boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)',
                      fontSize: '10px',
                      color: 'hsl(var(--foreground))'
                    }}
                    itemStyle={{ color: '#2dd4bf', fontWeight: 'bold' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#2dd4bf" 
                    strokeWidth={2}
                    fill="url(#premiumGradient)" 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Action Breakdown - Compact Circular View */}
          <Card className="md:col-span-4 border border-border shadow-lg rounded-xl bg-card overflow-hidden">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground">Vector Analysis</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-2 flex flex-col items-center">
              <div className="h-[180px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.action_breakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="action"
                      stroke="none"
                    >
                      {data.action_breakdown.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        borderRadius: '0px', 
                        border: '1px solid hsl(var(--border))', 
                        fontSize: '10px',
                        color: 'hsl(var(--foreground))'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <HugeiconsIcon icon={Shield01Icon} className="h-6 w-6 text-muted-foreground opacity-20" />
                </div>
              </div>
              <div className="w-full space-y-2 mt-4">
                {data.action_breakdown.slice(0, 5).map((entry: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-bold text-muted-foreground/80 uppercase">{entry.action}</span>
                    </div>
                    <span className="font-black text-foreground">{Math.round((entry.count / data.total_logs) * 100)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Security Vector Scores */}
          <Card className="border border-border shadow-lg rounded-xl bg-card overflow-hidden">
            <CardHeader className="p-6">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-foreground">
                <HugeiconsIcon icon={AnalyticsUpIcon} className="h-4 w-4 text-teal-600" />
                Integrity Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              {Object.entries(data.security_stats || {}).slice(0, 4).map(([action, count]: [string, any], idx) => {
                const totalLogs = data.total_logs || 1;
                const percentage = Math.round((Number(count) / totalLogs) * 100);
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                      <span className="text-muted-foreground/80">{action.replace(/_/g, ' ')}</span>
                      <span className="text-primary font-black">{count as React.ReactNode} ({percentage}%)</span>
                    </div>
                    <Progress value={Math.min(100, percentage * 5)} className="h-1.5 rounded-full bg-muted shadow-inner" />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Interactive Threat Map */}
          <InteractiveThreatMap threatVectors={data.threat_vectors || []} />
        </div>

        {/* Active Sessions & Live Activity Stream Block */}
        <div className="grid gap-6 md:grid-cols-12">
          {/* Active Sessions */}
          <Card className="md:col-span-6 border border-border shadow-xl rounded-xl bg-card overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-foreground">
                <HugeiconsIcon icon={Clock01Icon} className="h-4.5 w-4.5 text-primary" />
                Active Staff Sessions
              </CardTitle>
              <CardDescription>Admins currently authenticated on the server (Last 2h)</CardDescription>
            </CardHeader>
            <CardContent className="p-0 border-t border-dashed bg-muted/5">
              <div className="divide-y border-b max-h-[300px] overflow-y-auto">
                {sessions.length === 0 ? (
                  <div className="p-10 text-center text-xs text-muted-foreground italic">
                    No active sessions found.
                  </div>
                ) : (
                  sessions.map((sess) => (
                    <div key={sess.session_id} className="flex items-center justify-between p-3.5 px-6 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-black text-primary uppercase">
                          {sess.username?.slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">{sess.name}</p>
                          <p className="text-[10px] text-muted-foreground">{sess.role} • {sess.ip_address}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">Active</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-rose-500 hover:bg-rose-500/15"
                          loading={revokingId === sess.user_id}
                          onClick={() => handleRevokeSession(sess.user_id)}
                          title="Revoke Session"
                        >
                          <HugeiconsIcon icon={Logout02Icon} className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Live Activity Stream */}
          <Card className="md:col-span-6 border border-border shadow-xl rounded-xl bg-card overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-foreground">
                <HugeiconsIcon icon={Database02Icon} className="h-4.5 w-4.5 text-primary" />
                Live Event Stream
              </CardTitle>
              <CardDescription>Latest system-wide events and log occurrences</CardDescription>
            </CardHeader>
            <CardContent className="p-0 border-t border-dashed bg-muted/5">
              <div className="divide-y border-b max-h-[300px] overflow-y-auto custom-scrollbar font-mono text-[10px] leading-relaxed">
                {recentLogs.length === 0 ? (
                  <div className="p-10 text-center text-xs text-muted-foreground italic font-sans">
                    Waiting for events...
                  </div>
                ) : (
                  recentLogs.map((log) => {
                    const detailsStr = log.details 
                      ? (typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details))
                      : '';
                    return (
                      <div key={log.id} className="p-3 px-6 hover:bg-muted/50 transition-colors flex items-start justify-between gap-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">[{formatLogTime(log.timestamp)}]</span>
                            <span className="font-bold text-teal-600 dark:text-teal-400">{log.action}</span>
                          </div>
                          <p className="text-foreground/80">Resource: {log.resource}{log.patient_name && ` (${log.patient_name})`}</p>
                          {detailsStr && (
                            <p className="text-muted-foreground truncate max-w-[280px]" title={detailsStr}>
                              Details: {detailsStr}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="px-1.5 py-0.5 rounded bg-secondary/80 text-[8px] font-black text-muted-foreground border border-border">
                            {log.user_name || 'System'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </MainLayout>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

