import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Lock, 
  Fingerprint, 
  TrendingUp,
  AlertTriangle,
  Database
} from 'lucide-react';
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
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['#0d9488', '#0891b2', '#2563eb', '#7c3aed', '#db2777', '#ea580c'];

export default function SecurityDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics();
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
          <AlertTriangle className="h-10 w-10 text-amber-500" />
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
    { label: 'Login Failures', value: data.failed_logins_24h, icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { label: 'Event Logs', value: data.total_logs, icon: Database, color: 'text-teal-500', bg: 'bg-teal-500/10' },
    { label: 'Security Policies', value: '4 Active', icon: Lock, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { label: 'System Integrity', value: 'Protected', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  return (
    <MainLayout title="Security Command Center">
      <div className="space-y-4 pb-8 animate-in slide-in-from-bottom-2 duration-500 dashboard-page">
        
        {/* Compact Stats Row */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {criticalEvents.map((item, idx) => (
            <div key={idx} className="relative overflow-hidden bg-card border border-border/50 rounded-lg p-4 shadow-sm group hover:border-primary/30 transition-all duration-300">
              <div className="flex items-center gap-4 relative z-10">
                 <div className={cn("p-2.5 rounded-lg transition-transform group-hover:scale-110", item.bg, item.color)}>
                    <item.icon className="h-5 w-5" />
                 </div>
                 <div>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.22em]">{item.label}</p>
                    <h3 className="text-lg font-black tracking-tighter mt-0.5 text-foreground leading-none">{item.value as React.ReactNode}</h3>
                 </div>
              </div>
              <div className="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                <item.icon className="h-16 w-16" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-12">
          {/* Timeline Chart - Theme-Aware Appearance */}
          <Card className="md:col-span-8 border border-border/50 shadow-xl rounded-xl bg-card overflow-hidden">
            <CardHeader className="pb-0 pt-6 px-8 flex flex-row items-center justify-between space-y-0">
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest">Active Monitoring</p>
                  <CardTitle className="text-xl font-black text-foreground">
                    Event Telemetry
                  </CardTitle>
               </div>
               <div className="flex items-center gap-2 px-3 py-1 bg-secondary/30 dark:bg-white/5 border border-border/50 dark:border-white/10 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground dark:text-white/70">Real-Time</span>
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
          <Card className="md:col-span-4 border border-border/50 shadow-lg rounded-xl bg-card overflow-hidden">
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
                  <ShieldAlert className="h-6 w-6 text-muted-foreground opacity-20" />
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
          <Card className="border border-border/50 shadow-lg rounded-xl bg-card overflow-hidden">
            <CardHeader className="p-6">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-foreground">
                <TrendingUp className="h-4 w-4 text-teal-600" />
                Integrity Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              {Object.entries(data.security_stats || {}).slice(0, 4).map(([action, count]: [string, any], idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                    <span className="text-muted-foreground/80">{action}</span>
                    <span className="text-primary font-black">{count as React.ReactNode}</span>
                  </div>
                  <Progress value={Math.min(100, (Number(count) / data.total_logs) * 500)} className="h-1.5 rounded-full bg-muted shadow-inner" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Threat Intelligence Card */}
          <div className="relative rounded-xl overflow-hidden shadow-2xl group border border-border/50 bg-card">
             {/* Abstract Grid Background */}
             <div className="absolute inset-0 opacity-[0.03] dark:opacity-10 bg-[radial-gradient(#2dd4bf_1px,transparent_1px)] [background-size:20px_20px] transition-transform duration-[10s] group-hover:scale-125 z-0" />
             
             <div className="relative z-10 p-6 flex items-center gap-6 h-full">
                <div className="h-20 w-20 rounded-xl bg-rose-500/20 flex items-center justify-center border border-rose-500/30 group-hover:bg-rose-500/30 transition-colors">
                   <ShieldAlert className="h-10 w-10 text-rose-500" />
                </div>
                <div className="flex-1">
                   <p className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-[0.3em]">Threat Alert</p>
                   <h2 className="text-4xl font-black text-foreground tracking-tighter mt-1">{data.failed_logins_24h as React.ReactNode}</h2>
                   <p className="text-xs font-bold text-muted-foreground/80 mb-4">Unauthorized access attempts blocked (24h)</p>
                   <div className="flex gap-2">
                      <span className="px-2 py-1 rounded bg-secondary/80 dark:bg-white/10 border border-border/50 text-[8px] font-black text-muted-foreground uppercase tracking-widest">WAF Active</span>
                      <span className="px-2 py-1 rounded bg-secondary/80 dark:bg-white/10 border border-border/50 text-[8px] font-black text-muted-foreground uppercase tracking-widest">Brute-Force Guard</span>
                   </div>
                </div>
                <div className="hidden sm:block">
                  <button className="p-3 rounded-lg bg-secondary/80 dark:bg-white/10 border border-border/50 hover:bg-secondary/100 transition-colors">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
