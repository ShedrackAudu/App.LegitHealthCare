import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  Search, 
  Calendar, 
  User, 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  Clock, 
  Loader2,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/context/AppContext';

const appointmentSchema = z.object({
  appointment_date: z.string().refine((date) => {
    const d = new Date(date);
    const day = d.getDay();
    return day !== 0 && day !== 6; // 0 is Sunday, 6 is Saturday
  }, {
    message: "Appointments can only be booked for Monday to Friday"
  }),
  reason: z.string().min(1, "Reason is required").max(500, "Reason must be less than 500 characters")
});

type AppointmentValues = z.infer<typeof appointmentSchema>;

const BioItem = ({ label, value, icon: Icon }: any) => (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-transparent hover:border-primary/20 transition-all">
        <div className="mt-1 p-1.5 rounded-lg bg-background border shadow-sm text-primary">
            <Icon className="h-4 w-4" />
        </div>
        <div>
            <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground leading-none mb-1">{label}</p>
            <p className="text-sm font-bold text-foreground leading-tight">{value || 'N/A'}</p>
        </div>
    </div>
);

const AppointmentsPage = () => {
  const { activeSection, activeYear } = useAppContext();
  const [searchId, setSearchId] = useState('');
  const [patient, setPatient] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<AppointmentValues>({
    resolver: zodResolver(appointmentSchema)
  });

  // Real-time search effect
  useEffect(() => {
    if (searchId.length > 1) {
      const fetchResults = async () => {
        try {
          const res = await axios.get(`http://localhost:5000/api/patients/search?q=${searchId}`, {
             headers: { 'X-Company-Context': activeSection }
          });
          setSearchResults(res.data || []);
        } catch (err) {
          console.error(err);
        }
      };
      const timer = setTimeout(fetchResults, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchId, activeSection]);

  const handleSearch = async (forcedId?: string) => {
    const id = forcedId || searchId;
    if (!id) return;

    setIsSearching(true);
    setSearchResults([]);
    try {
      const res = await axios.get(`http://localhost:5000/api/patients/search?q=${id}`, {
          headers: { 'X-Company-Context': activeSection }
      });
      if (res.data && res.data.length > 0) {
          // Find exact match or take first
          const match = res.data.find((p: any) => p.staff_id === id) || res.data[0];
          setPatient(match);
          setSearchId(match.staff_id);
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
      await axios.post('http://localhost:5000/api/appointments', {
        ...data,
        staff_id: patient.staff_id
      }, {
          headers: { 'X-Company-Context': activeSection }
      });
      toast.success("Appointment booked successfully!");
      reset();
      setPatient(null);
      setSearchId('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to book appointment");
    } finally {
      setIsBooking(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <MainLayout title="Appointments Management">
      <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in slide-in-from-bottom-4 duration-500 mt-2 p-4">
        
        {/* Top Header & Search Area - Strictly matched with Director Review style */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-card p-6 rounded-2xl border-2 shadow-xl border-primary/10 transition-all">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl">
                <Calendar className="text-primary h-8 w-8" />
            </div>
            <div>
                <h1 className="text-2xl font-black tracking-tight">Appointments Booking</h1>
                <p className="text-sm text-muted-foreground font-medium">Session: {activeYear} • {activeSection}</p>
            </div>
          </div>

          <div className="flex w-full xl:w-auto items-center gap-3 bg-muted/30 p-2 rounded-xl border-2 focus-within:border-primary/50 transition-all relative">
              <Search className="ml-2 h-5 w-5 text-muted-foreground" />
              <Input 
                  placeholder="Search Numeric Staff ID..." 
                  className="border-0 bg-transparent focus-visible:ring-0 min-w-[300px] text-lg font-bold"
                  value={searchId}
                  inputMode="numeric"
                  onChange={(e) => setSearchId(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              {searchResults.length > 0 && (
                  <Card className="absolute top-full left-0 right-0 mt-2 bg-background border-2 shadow-2xl rounded-xl overflow-hidden z-[100] animate-in slide-in-from-top-2 duration-200">
                      {searchResults.map((p, i) => (
                          <div 
                              key={i}
                              onClick={() => {
                                  setPatient(p);
                                  setSearchId(p.staff_id);
                                  setSearchResults([]);
                                  toast.success(`Patient ${p.first_name} selected`);
                              }}
                              className="p-3 hover:bg-primary/5 cursor-pointer flex items-center justify-between group transition-colors border-b last:border-0"
                          >
                              <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                                      {p.first_name[0]}{p.last_name[0]}
                                  </div>
                                  <div>
                                      <p className="font-bold text-sm tracking-tight">{p.first_name} {p.last_name}</p>
                                      <p className="text-[10px] text-muted-foreground uppercase font-black">{p.staff_id}</p>
                                  </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                          </div>
                      ))}
                  </Card>
              )}
              <Button size="lg" className="shadow-lg px-8 font-bold whitespace-nowrap h-11 rounded-xl" onClick={() => handleSearch()} disabled={isSearching}>
                  {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Retrieve Record'}
              </Button>
          </div>
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
                            <CardTitle className="text-3xl font-black">Book New Appointment</CardTitle>
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
                                    <p className="text-[10px] text-muted-foreground font-bold ml-1 italic">* Mondays to Fridays Only</p>
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
                                disabled={isBooking}
                                className="w-full h-16 rounded-2xl text-xl font-black gap-3 shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all bg-primary shadow-primary/20"
                            >
                                {isBooking ? (
                                    <>
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Calendar className="h-6 w-6" />
                                        Schedule Appointment
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AppointmentsPage;
