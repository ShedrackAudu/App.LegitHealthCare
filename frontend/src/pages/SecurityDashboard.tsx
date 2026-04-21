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
import axios from 'axios';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'react-hot-toast';

const COLORS = ['#0d9488', '#0891b2', '#2563eb', '#7c3aed', '#db2777', '#ea580c'];

export default function SecurityDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get('/api/admin/audit-analytics');
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch security analytics:', error);
      toast.error('Could not load security engine data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Security Dashboard">
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-3xl" />
            ))}
          </div>
          <Skeleton className="h-[400px] w-full rounded-3xl" />
        </div>
      </MainLayout>
    );
  }

  // Safety check to prevent blank screen if data fails to load or is malformed
  if (!data || !data.timeline || !data.action_breakdown) {
    return (
      <MainLayout title="Security Dashboard">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <h2 className="text-xl font-bold">Security Engine Offline</h2>
          <p className="text-muted-foreground">Unable to retrieve real-time analytics data.</p>
          <button 
            onClick={() => { setLoading(true); fetchAnalytics(); }}
            className="px-4 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </MainLayout>
    );
  }

  const criticalEvents = [
    { label: 'Failed Logins (24h)', value: data.failed_logins_24h, icon: ShieldAlert, color: 'text-rose-500' },
    { label: 'Total Logs', value: data.total_logs, icon: Database, color: 'text-teal-500' },
    { label: 'Active Policies', value: '4 Active', icon: Lock, color: 'text-blue-500' },
    { label: 'Health Status', value: 'Protected', icon: Activity, color: 'text-emerald-500' },
  ];

  return (
    <MainLayout title="Security Command Center">
      <div className="space-y-6 pb-12 animate-in slide-in-from-bottom-4 duration-700">
        
        {/* Top Metric Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {criticalEvents.map((item, idx) => (
            <Card key={idx} className="border-none shadow-xl bg-gradient-to-br from-card to-secondary/30 rounded-3xl overflow-hidden group hover:scale-[1.02] transition-transform">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{item.label}</p>
                    <h3 className="text-2xl font-black mt-1 tracking-tight">{item.value}</h3>
                  </div>
                  <div className={cn("p-4 rounded-2xl bg-background/50 shadow-inner group-hover:rotate-12 transition-transform", item.color)}>
                    <item.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-7">
          {/* Main Traffic Chart */}
          <Card className="md:col-span-4 border-none shadow-2xl rounded-[2.5rem] bg-card/60 backdrop-blur-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-teal-500" />
                    Security Event Timeline
                  </CardTitle>
                  <CardDescription>Event frequency over the last 30 days</CardDescription>
                </div>
                <Badge variant="outline" className="bg-teal-500/10 text-teal-600 border-teal-500/20">
                  <Activity className="h-3 w-3 mr-1" /> Live
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.timeline}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10 }}
                    minTickGap={20}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#0d9488" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorCount)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Action Breakdown Chart */}
          <Card className="md:col-span-3 border-none shadow-2xl rounded-[2.5rem] bg-card/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-xl font-black">Action Distribution</CardTitle>
              <CardDescription>Top activity by type</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px] flex flex-col justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.action_breakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="action"
                  >
                    {data.action_breakdown.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {data.action_breakdown.slice(0, 4).map((entry: any, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-[10px] font-bold text-muted-foreground truncate uppercase">{entry.action}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Critical Security Stats */}
          <Card className="border-none shadow-2xl rounded-[2.5rem] bg-card/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-xl font-black flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Critical Security Vector
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(data.security_stats).map(([action, count], idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-muted-foreground">
                    <span>{action}</span>
                    <span className="text-primary">{count} events</span>
                  </div>
                  <Progress value={Math.min(100, (Number(count) / data.total_logs) * 500)} className="h-2 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Failed Attempts Alert Card */}
          <Card className="border-none shadow-2xl rounded-[2.5rem] bg-rose-500 text-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <ShieldAlert size={150} />
            </div>
            <CardHeader>
              <CardTitle className="text-2xl font-black">Brute-Force Detection</CardTitle>
              <CardDescription className="text-rose-100">Intrusion attempts blocked by Security Engine</CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              <div className="flex items-baseline gap-2">
                <h2 className="text-7xl font-black tracking-tighter">{data.failed_logins_24h}</h2>
                <span className="text-xl font-bold opacity-80 uppercase tracking-widest">Events in 24h</span>
              </div>
              <div className="mt-8 flex gap-4">
                <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2">
                  <Fingerprint size={16} />
                  <span className="text-xs font-bold">IP Guard Active</span>
                </div>
                <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2">
                  <Lock size={16} />
                  <span className="text-xs font-bold">Rate Limits On</span>
                </div>
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
