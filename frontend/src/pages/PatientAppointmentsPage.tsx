import React, { useState, useEffect } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { PatientLayout } from '@/components/layout/PatientLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useAppContext } from '@/context/AppContext';
import { generateAppointmentSlots } from '@/lib/timeUtils';

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
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-muted/30 border border-transparent hover:border-primary/20 transition-all group">
        <div className="mt-1 p-2 rounded-xl bg-background border shadow-sm text-primary group-hover:scale-110 transition-transform">
            <Icon className="h-5 w-5" />
        </div>
        <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground leading-none mb-1.5">{label}</p>
            <p className="text-base font-bold text-foreground leading-tight">{value || 'N/A'}</p>
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

  useEffect(() => {
     const fetchProfile = async () => {
        try {
           const res = await axios.get('/api/patient/profile', {
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

  const onBookAppointment = async (data: AppointmentValues) => {
    if (!profile) return;

    setIsBooking(true);
    try {
      // Format to DD-MM-YYYY as requested by user
      const [y, m, d] = data.appointment_date.split('-');
      const formattedDate = `${d}-${m}-${y}`;

      await axios.post('/api/appointments', {
        ...data,
        appointment_date: formattedDate,
        staff_id: profile.staff_id
      });
      toast.success("Appointment booked! Notification sent to Head Doctor.");
      reset();
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
        
        {/* Header Hero */}
        <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-r from-amber-500 to-amber-600 p-8 md:p-12 text-white shadow-2xl shadow-amber-500/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center md:text-left">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">
                 <Clock className="w-3 h-3" /> Real-time Scheduling
               </div>
               <h1 className="text-2xl sm:text-5xl font-black tracking-tight leading-none">Book Clinical Appointment</h1>
               <p className="text-lg text-white/80 max-w-xl font-medium leading-relaxed">
                  Need a follow-up or a new screening? Schedule your visit here. Your request will be forwarded to the Head Doctor immediately.
               </p>
            </div>
            <div className="shrink-0 scale-110">
               <Calendar className="w-32 h-32 opacity-20" />
            </div>
          </div>
        </div>

        {loadingProfile ? (
            <div className="flex flex-col items-center justify-center py-40">
                <Loader2 className="h-12 w-12 animate-spin text-amber-500 mb-4" />
                <p className="text-sm font-black uppercase tracking-widest text-muted-foreground animate-pulse">Synchronizing Patient ID...</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Side: Profile Summary */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="border-2 shadow-2xl rounded-[2.5rem] overflow-hidden sticky top-24 border-primary/5">
                        <CardHeader className="bg-primary/5 border-b-2 border-primary/10 pb-8 p-8">
                            <div className="flex items-center gap-4">
                                <div className="h-16 w-16 rounded-[2rem] bg-primary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/20">
                                    <User className="h-8 w-8" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <CardTitle className="text-xl sm:text-2xl font-black leading-none truncate">{profile?.first_name} {profile?.last_name}</CardTitle>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                                            {profile?.staff_id}
                                        </span>
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                                            <CheckCircle2 className="w-3 h-3" /> Profile Active
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-4 bg-muted/10">
                            <BioItem label="DEPARTMENT" value={profile?.department} icon={Building2} />
                            <BioItem label="CONTACT PHONE" value={profile?.phone} icon={Phone} />
                            <BioItem label="EMAIL ADDRESS" icon={Mail} value={<span className="truncate block max-w-full">{profile?.email}</span>} />
                            <BioItem label="GENDER / AGE" value={`${profile?.gender} • ${profile?.age} yrs`} icon={User} />
                            <div className="pt-4">
                                <Button variant="link" className="px-0 font-bold text-primary group" onClick={() => window.location.href='/patient/account'}>
                                    Need to update this? <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Side: Form */}
                <div className="lg:col-span-2">
                    <Card className="border-2 shadow-2xl rounded-[3rem] overflow-hidden border-primary/5">
                        <CardHeader className="p-8 md:p-12 pb-4">
                            <CardTitle className="text-2xl sm:text-3xl font-black">Slot Selection</CardTitle>
                            <CardDescription className="text-base font-medium">Please provide a preferred date and reason for your visit.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 md:p-12 pt-4 space-y-8">
                            <div className="grid grid-cols-1 gap-8">
                                <div className="space-y-3">
                                    <Label className="text-sm font-black uppercase tracking-[0.1em] text-muted-foreground ml-1">Preferred Date <span className="text-red-500 font-bold">*</span></Label>
                                    <div className="relative group">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
                                        <Input 
                                            type="date"
                                            min={today}
                                            className={`h-16 pl-14 rounded-2xl border-2 font-bold text-lg transition-all focus:ring-4 focus:ring-primary/5 ${errors.appointment_date ? 'border-red-500' : 'focus:border-primary'}`} 
                                            {...register('appointment_date')}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center px-1">
                                         {errors.appointment_date ? (
                                            <p className="text-xs text-red-500 font-bold flex items-center gap-1.5">
                                                <AlertCircle className="h-3.5 w-3.5" />
                                                {errors.appointment_date.message}
                                            </p>
                                        ) : (
                                            <p className="text-[10px] text-muted-foreground font-bold italic">* Clinical hours: Monday to Friday (10AM - 4PM)</p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-sm font-black uppercase tracking-[0.1em] text-muted-foreground ml-1">
                                        Choose Time Slot <span className="text-red-500 font-bold">*</span>
                                        {fetchingSlots && <Loader2 className="inline ml-2 h-3 w-3 animate-spin text-primary" />}
                                    </Label>
                                    
                                    {!selectedDate ? (
                                        <div className="p-8 rounded-2xl bg-muted/20 border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground">
                                            <Clock className="w-8 h-8 mb-2 opacity-20" />
                                            <p className="text-xs font-bold uppercase tracking-widest">Select a date first</p>
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

                                <div className="space-y-3">
                                    <Label className="text-sm font-black uppercase tracking-[0.1em] text-muted-foreground ml-1">Reason for Visit <span className="text-red-500 font-bold">*</span></Label>
                                    <Textarea 
                                        placeholder="Briefly state why you need to see a doctor (e.g., 'Medical clearance', 'Test interpretation', 'Health issue')..." 
                                        className={`min-h-[200px] rounded-[2rem] border-2 p-6 font-bold text-lg transition-all resize-none focus:ring-4 focus:ring-primary/5 ${errors.reason ? 'border-red-500' : 'focus:border-primary'}`}
                                        {...register('reason')}
                                    />
                                    <div className="flex justify-between items-center px-2">
                                        {errors.reason && (
                                            <p className="text-xs text-red-500 font-bold flex items-center gap-1.5">
                                                <AlertCircle className="h-3.5 w-3.5" />
                                                {errors.reason.message}
                                            </p>
                                        )}
                                        <p className="text-[10px] text-muted-foreground font-bold ml-auto opacity-50">Max 500 characters</p>
                                    </div>
                                </div>
                            </div>

                            <Separator className="my-4 opacity-50" />
                            
                            <Button 
                                onClick={handleSubmit(onBookAppointment)}
                                disabled={isBooking}
                                size="lg"
                                className="w-full h-20 rounded-[2rem] text-xl font-black gap-4 shadow-2xl hover:scale-[1.01] active:scale-[0.98] transition-all bg-primary shadow-primary/30"
                            >
                                {isBooking ? (
                                    <>
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                        Confirming Booking...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-7 w-7" />
                                        Complete Booking
                                    </>
                                )}
                            </Button>

                            <div className="p-6 rounded-[2rem] bg-emerald-500/5 border-2 border-emerald-500/20 flex gap-4">
                                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600 shrink-0 h-fit">
                                     <Globe className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-emerald-800">What happens next?</p>
                                    <p className="text-xs font-semibold text-emerald-700/70 mt-1">Our clinical admin team will review your request and confirm via email or phone within 24 hours.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )}
      </div>
    </PatientLayout>
  );
};

export default PatientAppointmentsPage;
