import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  Clock, 
  Loader2,
  AlertCircle,
  Calendar,
  User,
  Building2,
  Mail,
  Phone,
  Globe,
  CheckCircle2,
  Search,
  RefreshCw,
  MoreVertical,
  Check,
  Trash2
} from 'lucide-react';
import { PatientSearch } from '@/components/PatientSearch';
import { ActionConfirmModal } from '@/components/ActionConfirmModal';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppContext } from '@/context/AppContext';
import { usePermissions } from '@/hooks/usePermissions';
import { generateAppointmentSlots } from '@/lib/timeUtils';
import { motion, AnimatePresence } from 'framer-motion';

const appointmentSchema = z.object({
  appointment_date: z.string().refine((date) => {
    const d = new Date(date);
    const day = d.getDay();
    return day !== 0 && day !== 6; // 0 is Sunday, 6 is Saturday
  }, {
    message: "Appointments can only be booked for Monday to Friday"
  }),
  time_slot: z.string().min(1, "Please select a time slot"),
  reason: z.string().min(1, "Reason is required").max(500, "Reason must be less than 500 characters")
});

type AppointmentValues = z.infer<typeof appointmentSchema>;

interface Appointment {
    id: number;
    staff_id: string;
    patient_name: string;
    department: string;
    appointment_date: string;
    time_slot: string;
    reason: string;
    status: 'Pending' | 'Completed' | 'Cancelled';
    phone?: string;
    email?: string;
}

const BioItem = ({ label, value, icon: Icon }: any) => (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-transparent hover:border-primary/20 transition-all overflow-hidden w-full min-w-0">
        <div className="mt-1 p-1.5 rounded-lg bg-background border shadow-sm text-primary shrink-0">
            <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground leading-none mb-1 truncate">{label}</p>
            <p className="text-sm font-bold text-foreground leading-tight truncate" title={value}>{value || 'N/A'}</p>
        </div>
    </div>
);

const AppointmentsPage = () => {
  const { activeSection, activeYear } = useAppContext();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('manage_appointments');
  const canView = canManage; // Consolidate view into manage
  
  const [patient, setPatient] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [fetchingAppointments, setFetchingAppointments] = useState(false);
  const [appointmentSearchTerm, setAppointmentSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<AppointmentValues>({
    resolver: zodResolver(appointmentSchema)
  });

  const selectedDate = watch('appointment_date');
  const selectedSlot = watch('time_slot');

  const fetchAppointments = useCallback(async () => {
    if (!canView) return;
    setFetchingAppointments(true);
    try {
      const res = await axios.get('/api/appointments');
      setAppointments(res.data);
    } catch (err) {
      console.error("Error fetching appointments:", err);
      toast.error("Failed to load appointments");
    } finally {
      setFetchingAppointments(false);
    }
  }, [canView]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    const fetchBookedSlots = async () => {
        if (!selectedDate) return;
        setFetchingSlots(true);
        try {
            // Re-format to DD-MM-YYYY for backend consistency
            const [y, m, d] = selectedDate.split('-');
            const formattedDate = `${d}-${m}-${y}`;
            const res = await axios.get(`/api/appointments/booked?date=${formattedDate}`);
            setBookedSlots(res.data);
            setValue('time_slot', ''); // Reset slot when date changes
        } catch (err) {
            console.error("Error fetching booked slots:", err);
        } finally {
            setFetchingSlots(false);
        }
    };
    fetchBookedSlots();
  }, [selectedDate, setValue]);

  const handleSearch = async (query: string) => {
    if (!query) return;
    setIsSearching(true);
    try {
      const res = await axios.get(`/api/patients/search?q=${query}`, {
          headers: { 'X-Company-Context': activeSection }
      });
      if (res.data && res.data.length > 0) {
          const match = res.data.find((p: any) => p.staff_id === query) || res.data[0];
          setPatient(match);
          toast.success(`Patient ${match.first_name} selected`);
      } else {
          toast.error("No patient found with this Staff ID");
      }
    } catch (err) {
      toast.error("Failed to search for patient");
    } finally {
      setIsSearching(false);
    }
  };

  const onBookAppointment = async (data: AppointmentValues) => {
    if (!patient) return;

    setIsBooking(true);
    try {
      // Format to DD-MM-YYYY as expected by backend
      const [y, m, d] = data.appointment_date.split('-');
      const formattedDate = `${d}-${m}-${y}`;
      
      await axios.post('/api/appointments', {
        ...data,
        appointment_date: formattedDate,
        staff_id: patient.staff_id
      }, {
          headers: { 'X-Company-Context': activeSection }
      });
      toast.success("Appointment booked successfully!");
      reset();
      setPatient(null);
      fetchAppointments();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to book appointment");
    } finally {
      setIsBooking(false);
    }
  };

  const handleMarkAsCompleted = async (id: number) => {
    try {
      await axios.patch(`/api/appointments/${id}/complete`);
      toast.success("Appointment marked as completed");
      fetchAppointments();
    } catch (err) {
      toast.error("Failed to update appointment status");
    }
  };

  const handleDeleteAppointment = async () => {
    if (!appointmentToDelete) return;
    setIsDeleting(true);
    try {
      await axios.delete(`/api/appointments/${appointmentToDelete}`);
      toast.success("Appointment deleted successfully");
      setIsDeleteModalOpen(false);
      setAppointmentToDelete(null);
      fetchAppointments();
    } catch (err) {
      toast.error("Failed to delete appointment");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter(a => {
        const matchesStatus = activeTab === 'pending' ? a.status === 'Pending' : a.status === 'Completed';
        const matchesSearch = 
            a.patient_name.toLowerCase().includes(appointmentSearchTerm.toLowerCase()) ||
            a.staff_id.toLowerCase().includes(appointmentSearchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });
  }, [appointments, activeTab, appointmentSearchTerm]);

  const today = new Date().toISOString().split('T')[0];

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in slide-in-from-bottom-4 duration-500 mt-2 p-4">
        
        {/* Top Header & Search Area */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-card p-6 rounded-2xl border-2 shadow-xl border-primary/10 transition-all">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl">
                <Calendar className="text-primary h-8 w-8" />
            </div>
            <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">Appointments Booking</h1>
                <p className="text-sm text-muted-foreground font-medium">Session: {activeYear} • {activeSection}</p>
            </div>
          </div>

          <PatientSearch
              activeSection={activeSection}
              onSearch={handleSearch}
              onSelect={(p) => {
                setPatient(p);
              }}
              searching={isSearching}
              themeColor="primary"
          />
        </div>


        {patient && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                
                {/* Left Side: Bio-Data (Read-Only) */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="border-2 shadow-xl rounded-3xl overflow-hidden sticky top-24 border-primary/10">
                        <CardHeader className="bg-primary/5 border-b-2 border-primary/10 pb-6">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                                    <User className="h-7 w-7" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-black leading-none">{patient.first_name} {patient.last_name}</CardTitle>
                                    <CardDescription className="text-xs font-bold uppercase mt-1 text-primary/70">{patient.staff_id}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-3">
                            <BioItem label="DEPARTMENT" value={patient.department} icon={Building2} />
                            <BioItem label="GENDER" value={patient.gender} icon={User} />
                            <BioItem label="DATE OF BIRTH" value={patient.dob} icon={Calendar} />
                            <BioItem label="AGE" value={`${patient.age} Yrs`} icon={User} />
                            <BioItem label="CONTACT" value={patient.phone} icon={Phone} />
                            <BioItem label="EMAIL" value={patient.email} icon={Mail} />
                            <BioItem label="NATIONALITY" value={patient.nationality} icon={Globe} />
                        </CardContent>
                    </Card>
                </div>

                {/* Right Side: Appointment Form */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-2 shadow-2xl rounded-3xl overflow-hidden hover:border-primary/30 transition-colors border-primary/10">
                        <CardHeader className="p-8 pb-4">
                            <div className="flex items-center gap-3 text-primary mb-2">
                                <Clock className="h-6 w-6" />
                                <span className="text-xs font-black uppercase tracking-widest">Appointment Scheduler</span>
                            </div>
                            <CardTitle className="text-2xl sm:text-3xl font-black">Book New Appointment</CardTitle>
                            <CardDescription className="text-base font-medium">Schedule a callback or follow-up for this patient.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 pt-4 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-black uppercase tracking-tight text-muted-foreground ml-1">Appointment Date <span className="text-red-500">*</span></Label>
                                    <div className="relative group">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
                                        <Input 
                                            type="date"
                                            min={today}
                                            className={`h-14 pl-12 rounded-2xl border-2 font-bold text-lg transition-all ${errors.appointment_date ? 'border-red-500 focus:ring-red-100' : 'focus:ring-primary/10'}`} 
                                            {...register('appointment_date')}
                                        />
                                    </div>
                                    {errors.appointment_date && (
                                        <p className="text-xs text-red-500 font-bold flex items-center gap-1.5 ml-1">
                                            <AlertCircle className="h-3.5 w-3.5" />
                                            {errors.appointment_date.message}
                                        </p>
                                    )}
                                    <p className="text-[10px] text-muted-foreground font-bold ml-1 italic">* Clinical Hours: 10AM - 4PM (Mon - Fri)</p>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-sm font-black uppercase tracking-tight text-muted-foreground ml-1">
                                        Select Time Slot <span className="text-red-500">*</span>
                                        {fetchingSlots && <Loader2 className="inline ml-2 h-3 w-3 animate-spin text-primary" />}
                                    </Label>
                                    
                                    {!selectedDate ? (
                                        <div className="p-10 rounded-3xl bg-muted/20 border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground">
                                            <Clock className="w-10 h-10 mb-2 opacity-20" />
                                            <p className="text-xs font-bold uppercase tracking-widest">Select Date to See Availability</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                            {generateAppointmentSlots().map((slot) => {
                                                const isBooked = bookedSlots.includes(slot);
                                                const isSelected = selectedSlot === slot;
                                                
                                                return (
                                                    <button
                                                        key={slot}
                                                        type="button"
                                                        disabled={isBooked || fetchingSlots}
                                                        onClick={() => setValue('time_slot', slot)}
                                                        className={`
                                                            relative h-14 rounded-xl border-2 font-bold text-xs transition-all
                                                            ${isBooked 
                                                                ? 'bg-muted/50 border-muted text-muted-foreground cursor-not-allowed opacity-50' 
                                                                : isSelected
                                                                    ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]'
                                                                    : 'bg-background border-primary/10 hover:border-primary/40 hover:bg-primary/5'
                                                            }
                                                        `}
                                                    >
                                                        {slot.split(' - ')[0]}
                                                        {isBooked && <div className="absolute -bottom-1 -right-1 bg-red-500 text-[8px] text-white px-1 rounded-sm uppercase font-black">Full</div>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {errors.time_slot && (
                                        <p className="text-xs text-red-500 font-bold flex items-center gap-1.5 ml-1">
                                            <AlertCircle className="h-3.5 w-3.5" />
                                            {errors.time_slot.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-black uppercase tracking-tight text-muted-foreground ml-1">Reason for Appointment <span className="text-red-500">*</span></Label>
                                    <Textarea 
                                        placeholder="Briefly describe the reason for this appointment (max 500 characters)..." 
                                        className={`min-h-[160px] rounded-2xl border-2 p-4 font-bold text-base transition-all resize-none shadow-sm ${errors.reason ? 'border-red-500 focus:ring-red-100' : 'focus:ring-primary/10'}`}
                                        {...register('reason')}
                                    />
                                    <div className="flex justify-between items-center ml-1">
                                        {errors.reason && (
                                            <p className="text-xs text-red-500 font-bold flex items-center gap-1.5">
                                                <AlertCircle className="h-3.5 w-3.5" />
                                                {errors.reason.message}
                                            </p>
                                        )}
                                        <p className="text-[10px] text-muted-foreground font-bold ml-auto">Max 500 characters</p>
                                    </div>
                                </div>
                            </div>

                            <Separator className="my-8" />
                            
                            <Button 
                                onClick={handleSubmit(onBookAppointment)}
                                disabled={isBooking || !canManage}
                                className={`w-full h-14 sm:h-16 rounded-2xl text-sm sm:text-xl font-black gap-2 sm:gap-3 shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all bg-primary shadow-primary/20 ${!canManage ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                            >
                                {isBooking ? (
                                    <>
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        {canManage ? (
                                            <>
                                                <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
                                                Schedule Appointment
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                                                Permission Required to Schedule
                                            </>
                                        )}
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )}

        {/* Appointments List Tabs */}
        {canView && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
                <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
                    <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 mb-6">
                        <TabsList className="bg-muted/50 p-1.5 border-2 border-border/50 rounded-2xl h-14 w-full lg:w-auto">
                            <TabsTrigger value="pending" className="group flex-1 lg:flex-none rounded-xl px-4 sm:px-8 h-full font-black data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all text-xs sm:text-sm">
                                Pending
                                <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-0 group-data-[state=active]:bg-white group-data-[state=active]:text-primary transition-colors text-[10px]">
                                    {appointments.filter(a => a.status === 'Pending').length}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="completed" className="group flex-1 lg:flex-none rounded-xl px-4 sm:px-8 h-full font-black data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 transition-all text-xs sm:text-sm">
                                Completed
                                <Badge variant="secondary" className="ml-2 bg-green-500/10 text-green-700 border-0 group-data-[state=active]:bg-white group-data-[state=active]:text-primary transition-colors text-[10px]">
                                    {appointments.filter(a => a.status === 'Completed').length}
                                </Badge>
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex items-center gap-2 w-full lg:w-auto">
                            <div className="relative flex-1 lg:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search by name or ID..."
                                    className="pl-9 h-12 rounded-2xl border-2 focus:ring-primary/10 font-bold"
                                    value={appointmentSearchTerm}
                                    onChange={(e) => setAppointmentSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="icon" onClick={fetchAppointments} disabled={fetchingAppointments} className="h-12 w-12 rounded-2xl border-2 shadow-sm">
                                <RefreshCw className={`h-5 w-5 ${fetchingAppointments ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                    </div>

                    <TabsContent value="pending" className="mt-0">
                        <div className="md:hidden space-y-4">
                            {filteredAppointments.length === 0 ? (
                                <div className="p-12 text-center text-muted-foreground font-medium italic bg-card rounded-2xl border-2 border-dashed">
                                    {fetchingAppointments ? "Loading..." : "No pending appointments found."}
                                </div>
                            ) : (
                                filteredAppointments.map(app => (
                                    <Card key={app.id} className="border-2 shadow-lg rounded-2xl overflow-hidden p-5 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
                                                    {app.patient_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-base text-foreground">{app.patient_name}</p>
                                                    <p className="text-[11px] font-bold text-muted-foreground uppercase">{app.staff_id}</p>
                                                </div>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-2">
                                                        <MoreVertical className="h-5 w-5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56 rounded-2xl border-2 shadow-2xl p-2">
                                                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-3 py-2">Manage</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="flex items-center gap-3 cursor-pointer focus:bg-green-50 focus:text-green-600 font-bold text-sm py-3 rounded-xl" onClick={() => handleMarkAsCompleted(app.id)}>
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        Mark as Completed
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="flex items-center gap-3 cursor-pointer font-bold text-sm py-3 rounded-xl" onClick={() => app.phone && window.open(`tel:${app.phone}`)}>
                                                        <Phone className="h-4 w-4" />
                                                        Call Patient
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="flex items-center gap-3 cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 font-bold text-sm py-3 rounded-xl" onClick={() => { setAppointmentToDelete(app.id); setIsDeleteModalOpen(true); }}>
                                                        <Trash2 className="h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 bg-muted/30 rounded-xl space-y-1">
                                                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Schedule</p>
                                                <p className="text-xs font-black flex items-center gap-1.5"><Calendar className="h-3 w-3 text-primary" />{new Date(app.appointment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                                                <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5"><Clock className="h-3 w-3" />{app.time_slot.split(' - ')[0]}</p>
                                            </div>
                                            <div className="p-3 bg-muted/30 rounded-xl space-y-1">
                                                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Status</p>
                                                <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 font-black text-[9px] uppercase tracking-widest py-0 px-2 h-5">Pending</Badge>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                                            <p className="text-[9px] font-black uppercase text-primary/70 tracking-widest mb-1">Reason</p>
                                            <p className="text-xs font-medium text-foreground line-clamp-3 leading-relaxed">{app.reason}</p>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>

                        <Card className="hidden md:block border-2 shadow-xl rounded-2xl overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[300px] font-black text-[10px] uppercase tracking-widest py-4">Patient Info</TableHead>
                                        <TableHead className="w-[180px] font-black text-[10px] uppercase tracking-widest py-4">Schedule</TableHead>
                                        <TableHead className="w-[120px] font-black text-[10px] uppercase tracking-widest py-4">Status</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest py-4">Reason</TableHead>
                                        <TableHead className="w-[80px] font-black text-[10px] uppercase tracking-widest py-4 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <AnimatePresence mode="popLayout">
                                        {filteredAppointments.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-medium italic">
                                                    {fetchingAppointments ? "Loading appointments..." : "No pending appointments found."}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredAppointments.map((app) => (
                                                <TableRow key={app.id} className="group hover:bg-muted/20 transition-colors">
                                                    <TableCell className="py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                                                                {app.patient_name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-sm text-foreground">{app.patient_name}</p>
                                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">{app.staff_id}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-1.5 text-xs font-bold">
                                                                <Calendar className="h-3.5 w-3.5 text-primary" />
                                                                {new Date(app.appointment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground">
                                                                <Clock className="h-3.5 w-3.5" />
                                                                {app.time_slot}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 font-black text-[8px] uppercase tracking-widest py-0.5 px-2">
                                                            Pending
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <p className="text-xs font-medium line-clamp-2 max-w-[250px]">{app.reason}</p>
                                                    </TableCell>
                                                    <TableCell className="py-4 text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-48 rounded-xl border-2 shadow-xl">
                                                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Manage Appointment</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem 
                                                                    className="flex items-center gap-2 cursor-pointer focus:bg-green-50 focus:text-green-600 font-bold text-xs py-2.5 rounded-lg transition-all"
                                                                    onClick={() => handleMarkAsCompleted(app.id)}
                                                                >
                                                                    <CheckCircle2 className="h-4 w-4" />
                                                                    Mark as Completed
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem 
                                                                    className="flex items-center gap-2 cursor-pointer font-bold text-xs py-2.5 rounded-lg"
                                                                    onClick={() => {
                                                                        if (app.phone) window.open(`tel:${app.phone}`);
                                                                        else toast.error("Phone number not available");
                                                                    }}
                                                                >
                                                                    <Phone className="h-4 w-4" />
                                                                    Call Patient
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem 
                                                                    className="flex items-center gap-2 cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 font-bold text-xs py-2.5 rounded-lg"
                                                                    onClick={() => {
                                                                        setAppointmentToDelete(app.id);
                                                                        setIsDeleteModalOpen(true);
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                    Delete Appointment
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                        </Card>
                    </TabsContent>
                    <TabsContent value="completed" className="mt-0">
                        <div className="md:hidden space-y-4">
                            {filteredAppointments.length === 0 ? (
                                <div className="p-12 text-center text-muted-foreground font-medium italic bg-card rounded-2xl border-2 border-dashed opacity-70">
                                    No completed appointments found.
                                </div>
                            ) : (
                                filteredAppointments.map(app => (
                                    <Card key={app.id} className="border-2 shadow-md rounded-2xl overflow-hidden p-5 space-y-4 opacity-90">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className="h-12 w-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-600 font-black text-sm">
                                                    {app.patient_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-base text-foreground">{app.patient_name}</p>
                                                    <p className="text-[11px] font-bold text-muted-foreground uppercase">{app.staff_id}</p>
                                                </div>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-2">
                                                        <MoreVertical className="h-5 w-5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56 rounded-2xl border-2 shadow-2xl p-2">
                                                    <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-3 py-2">Manage Completed</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="flex items-center gap-3 cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 font-bold text-sm py-3 rounded-xl" onClick={() => { setAppointmentToDelete(app.id); setIsDeleteModalOpen(true); }}>
                                                        <Trash2 className="h-4 w-4" />
                                                        Delete Record
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 bg-muted/30 rounded-xl space-y-1">
                                                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Completed On</p>
                                                <p className="text-xs font-black flex items-center gap-1.5 text-muted-foreground"><Calendar className="h-3 w-3" />{new Date(app.appointment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                                            </div>
                                            <div className="p-3 bg-muted/30 rounded-xl space-y-1">
                                                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Status</p>
                                                <Badge className="bg-green-500 text-white border-0 font-black text-[9px] uppercase tracking-widest py-0 px-2 h-5">Completed</Badge>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-muted/20 rounded-xl border border-border/50">
                                            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Reason for Visit</p>
                                            <p className="text-xs font-medium text-muted-foreground line-clamp-3 leading-relaxed">{app.reason}</p>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>

                        <Card className="hidden md:block border-2 shadow-xl rounded-2xl overflow-hidden opacity-80">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[300px] font-black text-[10px] uppercase tracking-widest py-4">Patient Info</TableHead>
                                        <TableHead className="w-[180px] font-black text-[10px] uppercase tracking-widest py-4">Schedule</TableHead>
                                        <TableHead className="w-[120px] font-black text-[10px] uppercase tracking-widest py-4">Status</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest py-4">Reason</TableHead>
                                        <TableHead className="w-[80px] font-black text-[10px] uppercase tracking-widest py-4 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAppointments.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-medium italic">
                                                No completed appointments found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredAppointments.map((app) => (
                                            <TableRow key={app.id} className="hover:bg-muted/10 transition-colors">
                                                <TableCell className="py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600 font-black text-xs">
                                                            {app.patient_name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-sm text-foreground">{app.patient_name}</p>
                                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{app.staff_id}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            {new Date(app.appointment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground/60">
                                                            <Clock className="h-3.5 w-3.5" />
                                                            {app.time_slot}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <Badge className="bg-green-500 hover:bg-green-600 text-white border-0 font-black text-[8px] uppercase tracking-widest py-0.5 px-2">
                                                        Completed
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-4">
                                                     <p className="text-[10px] font-bold text-muted-foreground italic line-clamp-1 max-w-[200px]">
                                                        {app.reason}
                                                     </p>
                                                </TableCell>
                                                <TableCell className="py-4 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48 rounded-xl border-2 shadow-xl">
                                                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Manage Completed</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem 
                                                                className="flex items-center gap-2 cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 font-bold text-xs py-2.5 rounded-lg"
                                                                onClick={() => {
                                                                    setAppointmentToDelete(app.id);
                                                                    setIsDeleteModalOpen(true);
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                Delete Record
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        )}

        <ActionConfirmModal 
            isOpen={isDeleteModalOpen}
            onClose={() => {
                setIsDeleteModalOpen(false);
                setAppointmentToDelete(null);
            }}
            onConfirm={handleDeleteAppointment}
            loading={isDeleting}
            title="Delete Appointment?"
            description="This will permanently remove this appointment record from the system. This action cannot be undone."
            confirmText="Delete Permanently"
            variant="danger"
        />
      </div>
    </MainLayout>
  );
};

export default AppointmentsPage;
