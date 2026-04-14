import React from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ChevronRight,
  Stethoscope,
  UserCog,
  UserPlus,
  FlaskConical,
  ShieldCheck,
  Database,
  Activity,
  Users,
  User,
  History,
  Key,
  Clock,
  ClipboardList,
  Settings2,
  Edit3,
  Check
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAppContext } from '@/context/AppContext';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const quickActions = [
  { 
    title: 'Registration', 
    description: 'Intake new patients and update bio-data.',
    icon: UserPlus, 
    path: '/registration',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    permission: 'registration'
  },
  { 
    title: 'Lab Test Results', 
    description: 'Record diagnostic findings (FBC, KFT, LFT, etc).',
    icon: FlaskConical, 
    path: '/tests',
    color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    permission: 'lab_entry'
  },
  { 
    title: 'Consultation', 
    description: 'Enter clinical assessments and recommendations.',
    icon: Stethoscope, 
    path: '/consultation',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    permission: 'consultation'
  },
  { 
    title: 'Director Review', 
    description: 'Final clinical assessment & record validation.',
    icon: ShieldCheck, 
    path: '/director',
    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    permission: 'director_review'
  },
  { 
    title: 'View Patients', 
    description: 'Access complete registry of registered patients.',
    icon: Users, 
    path: '/view-patients',
    color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    permission: 'view_patients'
  },
  { 
    title: 'Clinical Records', 
    description: 'Search and review detailed clinical findings.',
    icon: Database, 
    path: '/view-records',
    color: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    permission: 'view_records'
  },
  { 
    title: 'Patient Reports', 
    description: 'Generate and export individual patient reports.',
    icon: User, 
    path: '/patient-report',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    permission: 'view_records'
  },
  { 
    title: 'Secure Messaging', 
    description: 'Internal communication & staff coordination.',
    icon: Activity, 
    path: '/messages',
    color: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    permission: 'messaging'
  },
];

const adminActions = [
  { 
    title: 'System Settings', 
    description: 'Manage clinical departments and system configurations.',
    icon: Settings2, 
    path: '/system-config',
    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    permission: 'manage_departments'
  },
  { 
    title: 'User Management', 
    description: 'Manage system users, roles, and account security.',
    icon: UserCog, 
    path: '/user-management',
    color: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    permission: 'view_users'
  },
  { 
    title: 'Role & Permissions', 
    description: 'Configure access control and role assignments.',
    icon: ShieldCheck, 
    path: '/roles-permissions',
    color: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    permission: 'manage_roles'
  },
  { 
    title: 'System Audit Logs', 
    description: 'Monitor system-wide activity and security events.',
    icon: History, 
    path: '/audit-logs',
    color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    permission: 'view_audit_logs'
  },
  { 
    title: 'Data Management', 
    description: 'Export records and screening data to Excel.',
    icon: Database, 
    path: '/data-management',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    permission: 'download_data'
  },
  { 
    title: 'Branding & Assets', 
    description: 'Customize clinic logos, names, and visual assets.',
    icon: User, 
    path: '/system-branding',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    permission: 'manage_branding'
  },
  { 
    title: 'AI Integration', 
    description: 'Configure AI agents and medical parameters.',
    icon: Activity, 
    path: '/ai-integration',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    permission: 'manage_ai'
  },
  { 
    title: 'Access Keys', 
    description: 'Generate temporary security entrance codes.',
    icon: Key, 
    path: '/admin/access-keys',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    permission: 'manage_access_keys'
  },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { activeSection, activeYear } = useAppContext();
  const { isAdmin, hasPermission } = usePermissions();
  const [stats, setStats] = React.useState<any>(null);
  const [queueStats, setQueueStats] = React.useState<any>(null);
  const [queueEntries, setQueueEntries] = React.useState<any[]>([]);
  const [selectedDept, setSelectedDept] = React.useState<string | null>(null);
  const [isQueueModalOpen, setIsQueueModalOpen] = React.useState(false);
  const [loadingQueue, setLoadingQueue] = React.useState(false);
  
  const fetchDashboardStats = async () => {
    try {
      const resp = await axios.get(`http://localhost:5000/api/dashboard/stats?year=${activeYear}`, {
        headers: { 'X-Company-Context': activeSection }
      });
      setStats(resp.data);
    } catch (err) {
      console.error("Dashboard stats fetch failed:", err);
    }
  };

  const fetchQueueStats = async () => {
    try {
        const resp = await axios.get(`http://localhost:5000/api/queue/?year=${activeYear}`, {
            headers: { 'X-Company-Context': activeSection }
        });
        setQueueStats(resp.data);
    } catch (err) {
        console.error("Queue stats fetch failed:", err);
    }
  };

  const fetchQueueList = async (dept: string) => {
    setSelectedDept(dept);
    setLoadingQueue(true);
    try {
      const resp = await axios.get(`http://localhost:5000/api/queue/${dept.toLowerCase()}/?year=${activeYear}`, {
        headers: { 'X-Company-Context': activeSection }
      });
      setQueueEntries(resp.data);
      setIsQueueModalOpen(true);
    } catch (err) {
      console.error("Queue list fetch failed:", err);
      toast.error("Failed to load patient queue");
    } finally {
      setLoadingQueue(false);
    }
  };

  React.useEffect(() => {
    fetchDashboardStats();
    fetchQueueStats();
    
    const interval = setInterval(() => {
        fetchDashboardStats();
        fetchQueueStats();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [activeSection, activeYear]);

  // Mocking user profile for now
  const user = JSON.parse(localStorage.getItem('user') || '{"first_name": "Health"}');

  const getRelativeTime = (isoString: string) => {
    if (!isoString) return 'recently';
    // Fix: Python's datetime.utcnow().isoformat() often lacks the 'Z' indicating UTC.
    const dateStr = isoString.endsWith('Z') || isoString.includes('+') ? isoString : `${isoString}Z`;
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    
    // Fallback if client clock is slightly behind server clock
    if (diffInMs < 0) return 'Just now';
    
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins} mins ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <MainLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome, {user.first_name}</h1>
            <p className="text-muted-foreground mt-1">
              Currently managing <span className="text-primary font-bold">{activeSection}</span> for the <span className="text-primary font-bold">{activeYear}</span> Screening Program.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-card border-2 rounded-xl p-2 md:p-3 md:px-5 shadow-sm w-full md:w-auto justify-start md:justify-end">
             <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 md:w-6 md:h-6 text-primary" />
             </div>
             <div className="text-left md:text-right min-w-0">
                <p className="text-[8px] md:text-[10px] uppercase tracking-wider font-bold text-muted-foreground truncate">Server Status</p>
                <p className="text-xs md:text-sm font-bold text-emerald-500 truncate">Connected & Optimized</p>
             </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">Quick Actions</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              // Visible to everyone, access handled by ProtectedRoute
              return (
                <Card 
                  key={action.path}
                  className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20 overflow-hidden bg-card/50 backdrop-blur-sm"
                  onClick={() => navigate(action.path)}
                >
                  <CardHeader className="p-4 pb-2 flex flex-row items-center gap-4 space-y-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${action.color.split(' ').slice(0,2).join(' ')} border ${action.color.split(' ')[2]}`}>
                      <action.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-black tracking-tight">{action.title}</CardTitle>
                      <CardDescription className="text-[11px] font-medium text-muted-foreground line-clamp-1 mt-0.5">
                        {action.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Button variant="ghost" className="mt-2 w-full justify-between p-0 px-2 group-hover:text-primary transition-colors h-7 hover:bg-primary/5 rounded-lg border border-transparent hover:border-primary/10">
                      <span className="text-[10px] uppercase font-black tracking-widest">Open Tool</span>
                      <ChevronRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Admin Control Panel Section - Only visible to Admins */}
        {(() => {
          const filteredAdminActions = adminActions.filter(action => 
            action.permission ? hasPermission(action.permission) : isAdmin()
          );

          if (filteredAdminActions.length === 0) return null;

          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-primary">Admin Control Panel</h2>
                <div className="h-px flex-1 bg-primary/20" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filteredAdminActions.map((action) => (
                  <Card 
                    key={action.path}
                    className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/20 overflow-hidden bg-primary/[0.03] backdrop-blur-sm shadow-inner"
                    onClick={() => navigate(action.path)}
                  >
                    <CardHeader className="p-4 pb-2 flex flex-row items-center gap-4 space-y-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${action.color.split(' ').slice(0,2).join(' ')} border ${action.color.split(' ')[2]}`}>
                        <action.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-black tracking-tight">{action.title}</CardTitle>
                        <CardDescription className="text-[11px] font-medium text-muted-foreground line-clamp-1 mt-0.5 italic">
                          {action.description}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <Button variant="ghost" className="mt-2 w-full justify-between p-0 px-2 group-hover:text-primary transition-colors h-7 hover:bg-primary/5 rounded-lg border border-transparent hover:border-primary/10">
                        <span className="text-[10px] uppercase font-black tracking-widest">Open Tool</span>
                        <ChevronRight className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Queue Stats Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black tracking-tight text-emerald-500">Department Queues</h2>
            <div className="h-px flex-1 bg-emerald-500/20" />
            <Button variant="ghost" size="sm" onClick={fetchQueueStats} className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/10">
              Refresh
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { id: 'consultation', label: 'Consultation', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Stethoscope },
              { id: 'audiometry', label: 'Audiometry', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: Activity },
              { id: 'spirometry', label: 'Spirometry', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Activity },
              { id: 'ecg', label: 'ECG', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20', icon: Activity }
            ].map((dept) => (
              <Card 
                key={dept.id} 
                className="group cursor-pointer hover:shadow-lg transition-all border-2 hover:border-emerald-500/30 overflow-hidden bg-card/60 backdrop-blur-sm relative"
                onClick={() => fetchQueueList(dept.label)}
              >
                <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
                  <div className={`p-2 rounded-lg ${dept.color}`}>
                    <dept.icon className="h-4 w-4" />
                  </div>
                  <Badge variant="outline" className={`${dept.color} font-black text-[10px]`}>
                    QUEUED
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <h3 className="text-3xl font-black tracking-tighter">
                    {queueStats?.[dept.id] || 0}
                  </h3>
                  <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mt-1">
                    {dept.label} Waiting
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    View Patients <ChevronRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-2 shadow-lg">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        System Statistics
                    </CardTitle>
                    <CardDescription>Performance Overview for {activeSection} - {activeYear}</CardDescription>
                </CardHeader>
                <CardContent className="p-6 pt-4 border-t border-dashed bg-muted/5">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                            { label: 'Total Registered', count: stats?.registration_stats?.total_comprehensive, icon: Users, color: 'text-blue-600', bg: 'bg-blue-500/10' },
                            { label: 'Registered Today', count: stats?.registration_stats?.today, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                            { label: 'Male Patients', count: stats?.registration_stats?.males, icon: User, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
                            { label: 'Female Patients', count: stats?.registration_stats?.females, icon: User, color: 'text-rose-600', bg: 'bg-rose-500/10' },
                            { label: 'Age 40 & Above', count: stats?.registration_stats?.age_40_above, icon: ShieldCheck, color: 'text-purple-600', bg: 'bg-purple-500/10' },
                            { label: 'Age Below 40', count: stats?.registration_stats?.age_below_40, icon: Activity, color: 'text-amber-600', bg: 'bg-amber-500/10' },
                        ].map((s) => (
                            <div key={s.label} className="bg-gradient-to-br from-muted/5 to-muted/10 p-4 rounded-xl border-2 border-transparent hover:border-primary/10 transition-all shadow-sm group/stat cursor-default overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform duration-500"></div>
                                <div className="flex items-center gap-2 mb-2 relative z-10">
                                    <div className={`p-1.5 rounded-lg ${s.bg}`}>
                                        <s.icon className={`h-4 w-4 ${s.color}`} />
                                    </div>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/80">{s.label}</p>
                                </div>
                                <div className="flex items-baseline gap-1 relative z-10">
                                    <h4 className="text-2xl font-black tracking-tighter group-hover:text-primary transition-colors">{s.count?.toLocaleString() || '0'}</h4>
                                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">Records</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="border-2 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Recent Registrations
                    </CardTitle>
                    <CardDescription>Latest patients added</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y border-t max-h-[350px] overflow-y-auto">
                        {stats?.recent_registrations?.length > 0 ? (
                            stats.recent_registrations.map((reg: any) => (
                                <div key={reg.staff_id} className="flex items-center justify-between p-4 px-6 hover:bg-muted/50 transition-colors group/row">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center text-xs font-bold text-primary group-hover/row:bg-primary group-hover/row:text-white transition-all">
                                            {reg.first_name?.[0]}{reg.last_name?.[0]}
                                        </div>
                                        <div className="text-sm">
                                            <p className="font-bold">{reg.first_name} {reg.last_name}</p>
                                            <p className="text-xs text-muted-foreground font-medium">ID: {reg.staff_id}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold text-primary block">{reg.patient_id}</span>
                                        <span className="text-[10px] font-medium text-muted-foreground">{getRelativeTime(reg.created_at)}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center">
                                <p className="text-sm text-muted-foreground italic">No recent registrations found.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Queue List Modal */}
        <Dialog open={isQueueModalOpen} onOpenChange={setIsQueueModalOpen}>
            <DialogContent className="max-w-2xl sm:max-w-[500px] border-emerald-500/20">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <ClipboardList className="w-6 h-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black tracking-tight">{selectedDept} Queue</DialogTitle>
                            <DialogDescription className="text-xs font-medium"> Patients currently waiting for assessment</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                
                <div className="relative mt-2">
                    <ScrollArea className="h-[400px] pr-4">
                        {queueEntries.length > 0 ? (
                            <div className="space-y-3">
                                {queueEntries.map((entry, idx) => (
                                    <div key={entry.staff_id} className="flex items-center justify-between p-4 rounded-xl border-2 bg-muted/5 hover:bg-muted/10 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-xs font-black text-emerald-500 border border-emerald-500/20">
                                                {entry.first_name?.[0]}{entry.last_name?.[0]}
                                            </div>
                                            <div>
                                                <p className="font-black text-sm tracking-tight">{entry.first_name} {entry.last_name}</p>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">ID: {entry.staff_id}</p>
                                            </div>
                                        </div>
                                        <div className="text-right space-y-2">
                                            <div className="flex items-center gap-1.5 justify-end">
                                               <Badge className="rounded-full bg-blue-500 hover:bg-blue-600 text-white font-black text-[9px] px-2 py-0.5 h-auto">
                                                    #{entry.queue_number || '--'}
                                               </Badge>
                                               <Badge variant="outline" className="text-[8px] font-black tracking-tighter text-emerald-500 border-emerald-500/20 h-auto">
                                                    WAITING
                                               </Badge>
                                            </div>
                                            <div className="flex items-center gap-1 text-muted-foreground justify-end">
                                                <Clock className="w-3 h-3" />
                                                <span className="text-[10px] font-bold">{getRelativeTime(entry.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
                                <ClipboardList className="h-12 w-12 mb-4 text-muted-foreground" />
                                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Queue is Empty</p>
                                <p className="text-xs text-muted-foreground mt-1">No patients are waiting in this department.</p>
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <div className="mt-6 flex justify-end">
                    <Button 
                        variant="ghost" 
                        onClick={() => setIsQueueModalOpen(false)}
                        className="font-black text-xs uppercase tracking-widest"
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
