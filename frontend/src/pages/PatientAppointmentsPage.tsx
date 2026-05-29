import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Clock01Icon, 
  Loading03Icon,
  AlertCircleIcon,
  Calendar03Icon,
  UserIcon,
  Building02Icon,
  Mail01Icon,
  CallIcon,
  GlobeIcon,
  CheckmarkCircle02Icon,
  ArrowRight01Icon
} from '@hugeicons/core-free-icons';
import { PatientLayout } from '@/components/layout/PatientLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useAppContext } from '@/context/AppContext';
import { generateAppointmentSlots } from '@/lib/timeUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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

const BioItem = ({ label, value, icon: Icon }: any) => (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-transparent hover:border-primary/20 transition-all group">
        <div className="p-2 rounded-lg bg-background border shadow-sm text-primary group-hover:scale-105 transition-transform shrink-0">
            <HugeiconsIcon icon={Icon} className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
            <p className="text-[9px] uppercase tracking-widest font-black text-muted-foreground leading-none mb-1">{label}</p>
            <p className="text-sm font-bold text-foreground leading-tight truncate">{value || 'N/A'}</p>
        </div>
    </div>
);

const PatientAppointmentsPage = () => {
  const { user } = useAppContext();
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [fetchingAppointments, setFetchingAppointments] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<AppointmentValues>({
    resolver: zodResolver(appointmentSchema)
  });

  const selectedDate = watch('appointment_date');
  const selectedSlot = watch('time_slot');

  useEffect(() => {
    const fetchBookedSlots = async () => {
        if (!selectedDate) return;
        setFetchingSlots(true);
        try {
            // Re-format to DD-MM-YYYY for backend consistency
            const [y, m, d] = selectedDate.split('-');
            const formattedDate = `${d}-${m}-${y}`;
            const res = await api.get(`/api/appointments/booked?date=${formattedDate}`);
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

  useEffect(() => {
     const fetchProfile = async () => {
        try {
           const res = await api.get('/api/patient/profile', {
              headers: { 'X-Staff-ID': user?.username }
           });
           setProfile(res.data);
        } catch (err) {
           console.error("Error fetching profile:", err);
           toast.error("Failed to load your clinical profile");
        } finally {
           setLoadingProfile(false);
        }
     };
     if (user?.username) fetchProfile();
  }, [user]);

  const fetchAppointments = async () => {
    setFetchingAppointments(true);
    try {
      const res = await api.get('/api/patient/appointments');
      setAppointments(res.data);
    } catch (err) {
      console.error("Error fetching appointments:", err);
    } finally {
      setFetchingAppointments(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const onBookAppointment = async (data: AppointmentValues) => {
    if (!profile) return;

    setIsBooking(true);
    try {
      // Format to DD-MM-YYYY as requested by user
      const [y, m, d] = data.appointment_date.split('-');
      const formattedDate = `${d}-${m}-${y}`;

      await api.post('/api/appointments', {
        ...data,
        appointment_date: formattedDate,
        staff_id: profile.staff_id
      });
      toast.success("Appointment booked! Notification sent to Head Doctor.");
      reset();
      fetchAppointments(); // Refresh history
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to book appointment");
    } finally {
      setIsBooking(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <PatientLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
        
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 p-5 md:p-8 text-white shadow-xl shadow-amber-500/20 group">
          {/* Integrated Background Icon */}
          <div className="absolute -right-10 -bottom-10 w-48 h-48 text-white/[0.12] pointer-events-none -rotate-12 transition-transform duration-1000 group-hover:rotate-0">
             <HugeiconsIcon icon={Calendar03Icon} className="w-full h-full stroke-[1.5]" />
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left gap-4">
             <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 text-[8px] md:text-[9px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10">
               <HugeiconsIcon icon={Clock01Icon} className="w-2.5 h-2.5" /> Scheduling Active
             </div>
             <div className="space-y-1.5">
                <h1 className="text-xl md:text-3xl font-black tracking-tight leading-none">Book Appointment</h1>
                <p className="text-[11px] md:text-sm text-white/80 max-w-sm font-medium leading-relaxed">
                   Need a follow-up or a new health screening? <br className="hidden md:block"/>Schedule your visit with our medical team.
                </p>
             </div>
          </div>
        </div>

        {loadingProfile ? (
            <div className="flex flex-col items-center justify-center py-40">
                <HugeiconsIcon icon={Loading03Icon} className="h-12 w-12 animate-spin text-amber-500 mb-4" />
                <p className="text-sm font-black uppercase tracking-widest text-muted-foreground animate-pulse">Synchronizing Patient ID...</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Side: Profile Summary - Compact */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="border shadow-lg rounded-2xl overflow-hidden sticky top-24 border-primary/5 transition-all hover:shadow-xl">
                        <CardHeader className="bg-primary/5 border-b border-primary/10 p-5">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                                    <HugeiconsIcon icon={UserIcon} className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <CardTitle className="text-base font-black leading-none truncate">{profile?.first_name} {profile?.last_name}</CardTitle>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-black tracking-widest">
                                            {profile?.staff_id}
                                        </span>
                                        <div className="flex items-center gap-1 text-[9px] font-bold text-primary uppercase">
                                            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-2.5 h-2.5" /> Active
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2 bg-muted/5">
                            <BioItem label="DEPARTMENT" value={profile?.department} icon={Building02Icon} />
                            <BioItem label="CONTACT PHONE" value={profile?.phone} icon={CallIcon} />
                            <BioItem label="EMAIL ADDRESS" icon={Mail01Icon} value={profile?.email} />
                            <BioItem label="GENDER / AGE" value={`${profile?.gender} • ${profile?.age} yrs`} icon={UserIcon} />
                            <div className="pt-2 px-1">
                                <Button variant="link" className="px-0 h-auto font-bold text-[11px] text-primary group" onClick={() => window.location.href='/patient/account'}>
                                    Profile Settings <HugeiconsIcon icon={ArrowRight01Icon} className="ml-1.5 w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Side: Tabs */}
                <div className="lg:col-span-2">
                    <Tabs defaultValue="book" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/30 p-1.5 h-14 rounded-2xl border border-primary/5">
                            <TabsTrigger value="book" className="rounded-xl font-black text-[10px] sm:text-[13px] tracking-normal sm:tracking-widest uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all shadow-none h-full px-2">Book Visit</TabsTrigger>
                            <TabsTrigger value="history" className="rounded-xl font-black text-[10px] sm:text-[13px] tracking-normal sm:tracking-widest uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all shadow-none h-full px-2">History</TabsTrigger>
                        </TabsList>

                        <TabsContent value="book" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Card className="border shadow-lg rounded-2xl overflow-hidden border-primary/5 transition-all">
                                <CardHeader className="p-4 md:p-6 pb-0">
                                    <CardTitle className="text-lg md:text-xl font-black">Slot Selection</CardTitle>
                                    <CardDescription className="text-[11px] font-medium text-muted-foreground/60 leading-none mt-1">Fill in your clinical visit details.</CardDescription>
                                </CardHeader>
                        <CardContent className="p-4 md:p-6 pt-2 space-y-3.5">
                            <div className="grid grid-cols-1 gap-3.5">
                                <div className="space-y-1">
                                    <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-70">Preferred Date <span className="text-red-500">*</span></Label>
                                    <div className="relative group">
                                        <HugeiconsIcon icon={Calendar03Icon} className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors z-10" />
                                        <Input 
                                            type="date"
                                            min={today}
                                            className={`h-10 pl-10 rounded-xl border font-bold text-xs transition-all focus:ring-4 focus:ring-primary/5 ${errors.appointment_date ? 'border-red-500' : 'focus:border-primary'}`} 
                                            {...register('appointment_date')}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center px-0.5">
                                         {errors.appointment_date ? (
                                            <p className="text-[9px] text-red-500 font-bold flex items-center gap-1">
                                                <HugeiconsIcon icon={AlertCircleIcon} className="h-2.5 w-2.5" />
                                                {errors.appointment_date.message}
                                            </p>
                                        ) : (
                                            <p className="text-[8px] text-muted-foreground font-black italic opacity-40 uppercase tracking-tighter">* Mon - Fri (10AM - 4PM)</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-70">
                                        Time Slot <span className="text-red-500">*</span>
                                        {fetchingSlots && <HugeiconsIcon icon={Loading03Icon} className="inline ml-2 h-2.5 w-2.5 animate-spin text-primary" />}
                                    </Label>
                                    
                                    {!selectedDate ? (
                                        <div className="py-4 rounded-xl bg-muted/5 border border-dashed border-muted/20 flex items-center justify-center gap-2 text-muted-foreground/30">
                                            <HugeiconsIcon icon={Clock01Icon} className="w-3.5 h-3.5 opacity-20" />
                                            <p className="text-[8px] font-black uppercase tracking-[0.2em]">Select a date first</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
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
                                                            relative h-8 rounded-lg border font-black text-[8.5px] transition-all
                                                            ${isBooked 
                                                                ? 'bg-muted/10 border-transparent text-muted-foreground/30 cursor-not-allowed' 
                                                                : isSelected
                                                                    ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 ring-1 ring-primary ring-offset-1'
                                                                    : 'bg-background border-primary/5 hover:border-primary/30 hover:bg-primary/5'
                                                            }
                                                        `}
                                                    >
                                                        {slot.split(' - ')[0]}
                                                        {isBooked && <div className="absolute -top-1 -right-1 bg-red-500/80 text-[5px] text-white px-0.5 rounded-sm uppercase font-black">Full</div>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {errors.time_slot && (
                                        <p className="text-[9px] text-red-500 font-bold flex items-center gap-1 ml-0.5">
                                            <HugeiconsIcon icon={AlertCircleIcon} className="h-2.5 w-2.5" />
                                            {errors.time_slot.message}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-70">Reason <span className="text-red-500">*</span></Label>
                                    <Textarea 
                                        placeholder="Briefly state why you need to see a doctor..." 
                                        className={`min-h-[70px] rounded-xl border p-3 font-bold text-xs transition-all resize-none focus:ring-4 focus:ring-primary/5 ${errors.reason ? 'border-red-500' : 'focus:border-primary'}`}
                                        {...register('reason')}
                                    />
                                    <div className="flex justify-between items-center px-0.5">
                                        {errors.reason && (
                                            <p className="text-[9px] text-red-500 font-bold flex items-center gap-1">
                                                <HugeiconsIcon icon={AlertCircleIcon} className="h-2.5 w-2.5" />
                                                {errors.reason.message}
                                            </p>
                                        )}
                                        <p className="text-[8px] text-muted-foreground font-black ml-auto opacity-30 uppercase tracking-tighter italic">Max 500 chars</p>
                                    </div>
                                </div>
                            </div>

                            <Separator className="my-1.5 opacity-20" />
                            
                            <Button 
                                onClick={handleSubmit(onBookAppointment)}
                                disabled={isBooking}
                                size="lg"
                                className="w-full h-11 rounded-xl text-xs font-black gap-2 shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-all bg-primary shadow-primary/20"
                            >
                                {isBooking ? (
                                    <>
                                        <HugeiconsIcon icon={Loading03Icon} className="h-3.5 w-3.5 animate-spin" />
                                        Confirming...
                                    </>
                                ) : (
                                    <>
                                        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4" />
                                        Complete Booking
                                    </>
                                )}
                            </Button>

                            <div className="p-3.5 rounded-xl bg-primary/5 border border-dashed border-primary/10 flex gap-3">
                                <div className="p-1 bg-primary/10 rounded-lg text-primary shrink-0 h-fit">
                                     <HugeiconsIcon icon={GlobeIcon} className="w-3 h-3" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-black text-emerald-800 uppercase tracking-wider opacity-60">Next Steps</p>
                                    <p className="text-[10px] font-semibold text-primary/50 leading-tight">Admin will confirm within 24 hours.</p>
                                </div>
                            </div>
                        </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="history" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Card className="border shadow-xl rounded-2xl overflow-hidden border-primary/5 min-h-[400px]">
                                <CardHeader className="p-4 md:p-6 pb-4 bg-muted/10">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle className="text-lg md:text-xl font-black">Visit History</CardTitle>
                                            <CardDescription className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">Status of your clinic appointments</CardDescription>
                                        </div>
                                        {fetchingAppointments && <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin text-primary" />}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="hidden md:block overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-muted/20 border-b">
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="font-black text-[9px] uppercase tracking-widest py-4 pl-6">Schedule</TableHead>
                                                    <TableHead className="font-black text-[9px] uppercase tracking-widest py-4">Status</TableHead>
                                                    <TableHead className="font-black text-[9px] uppercase tracking-widest py-4">Booking Info</TableHead>
                                                    <TableHead className="font-black text-[9px] uppercase tracking-widest py-4 pr-6">Reason</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {appointments.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="h-48 text-center text-muted-foreground font-medium italic opacity-60">
                                                            No appointment records found.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    appointments.map((app) => (
                                                        <TableRow key={app.id} className="hover:bg-muted/5 transition-colors group">
                                                            <TableCell className="py-4 pl-6">
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                                                        <HugeiconsIcon icon={Calendar03Icon} className="h-3.5 w-3.5 text-primary" />
                                                                        {new Date(app.appointment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground/60">
                                                                        <HugeiconsIcon icon={Clock01Icon} className="h-3.5 w-3.5" />
                                                                        {app.time_slot}
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="py-4">
                                                                <Badge className={`${
                                                                    app.status === 'Completed' ? 'bg-green-500 hover:bg-green-600' : 
                                                                    app.status === 'Cancelled' ? 'bg-red-500 hover:bg-red-600' : 
                                                                    'bg-amber-500 hover:bg-amber-600'
                                                                } text-white border-0 font-black text-[8px] uppercase tracking-widest py-0.5 px-2`}>
                                                                    {app.status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="py-4">
                                                                <div className="space-y-0.5">
                                                                    <p className="text-[8px] font-black text-muted-foreground uppercase opacity-60 tracking-tighter">Booked By</p>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <p className="text-[10px] font-black text-foreground uppercase">
                                                                            {app.booked_by_type === 'patient' ? 'You' : 'Clinic Staff'}
                                                                        </p>
                                                                        {app.booked_by_type === 'patient' && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />}
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="py-4 pr-6">
                                                                <p className="text-[10px] font-bold text-muted-foreground italic line-clamp-1 max-w-[180px] group-hover:line-clamp-none transition-all">
                                                                    {app.reason}
                                                                </p>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <div className="md:hidden p-4 space-y-3">
                                        {appointments.length === 0 ? (
                                            <div className="py-12 text-center text-muted-foreground font-medium italic opacity-60">
                                                No appointment records found.
                                            </div>
                                        ) : (
                                            appointments.map(app => (
                                                <div key={app.id} className="p-4 rounded-xl border bg-muted/5 space-y-3">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-2">
                                                            <HugeiconsIcon icon={Calendar03Icon} className="h-4 w-4 text-primary" />
                                                            <p className="text-xs font-black">{new Date(app.appointment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                                                        </div>
                                                        <Badge className={`${
                                                            app.status === 'Completed' ? 'bg-green-500' : 
                                                            app.status === 'Cancelled' ? 'bg-red-500' : 
                                                            'bg-amber-500'
                                                        } text-white border-0 font-black text-[7px] uppercase tracking-widest py-0 px-2 h-4`}>
                                                            {app.status}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                                                        <HugeiconsIcon icon={Clock01Icon} className="h-3 w-3" />
                                                        {app.time_slot}
                                                    </div>
                                                    <div className="pt-2 border-t border-dashed border-muted/20">
                                                        <p className="text-[8px] font-black text-muted-foreground uppercase opacity-40 mb-1">Reason</p>
                                                        <p className="text-[10px] font-medium leading-relaxed italic">{app.reason}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        )}
      </div>
    </PatientLayout>
  );
};

export default PatientAppointmentsPage;
