import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, useNavigate } from 'react-router-dom';
import * as z from 'zod';
import {
  Users,
  Search,
  UserPlus,
  Save,
  Loader2,
  Calendar,
  Activity,
  ClipboardList,
  ArrowLeft,
  X,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { useAppContext } from '@/context/AppContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';



const RegistrationPage: React.FC = () => {
  const { activeSection, activeYear } = useAppContext();
  const [searchParams] = useSearchParams();
  const [isSelecting, setIsSelecting] = useState(false);
  const navigate = useNavigate();
  const editStaffId = searchParams.get('edit');
  const isEditMode = !!editStaffId;

  const registrationSchema = z.object({
    staff_id: z.string().min(1, 'Staff ID is required'),
    patient_id: isEditMode ? z.string().optional() : z.string().min(1, 'Patient ID is required'),
    first_name: z.string().min(1, 'First Name is required'),
    middle_name: z.string().optional(),
    last_name: z.string().min(1, 'Last Name is required'),
    department: z.string().min(1, 'Department is required'),
    gender: z.string().min(1, 'Gender is required'),
    dob: z.string().min(1, 'Date of Birth is required'),
    age: z.number(),
    phone: z.string().min(1, 'Phone is required'),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    race: z.string().min(1, 'Race is required'),
    nationality: z.string().min(1, 'Nationality is required'),
  });

  type RegistrationValues = z.infer<typeof registrationSchema>;

  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [races, setRaces] = useState<string[]>([]);
  const [nationalities, setNationalities] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

  const { register, handleSubmit, watch, setValue, control, reset, formState: { errors } } = useForm<RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      age: 0
    }
  });

  const dobValue = watch('dob');

  // Fetch data if in edit mode
  useEffect(() => {
    if (isEditMode && editStaffId) {
      const fetchPatient = async () => {
        setLoading(true);
        try {
          const response = await axios.get(`/patient/${editStaffId}?year=${activeYear}`, {
            headers: { 'X-Company-Context': activeSection }
          });
          const p = response.data;

          // Format ISO date (YYYY-MM-DD) to DD/MM/YYYY
          if (p.dob && p.dob.includes('-')) {
            const [y, m, d] = p.dob.split('-');
            p.dob = `${d}/${m}/${y}`;
          }

          reset(p);
        } catch (err) {
          toast.error("Failed to load patient data for editing");
          navigate('/view-patients');
        } finally {
          setLoading(false);
        }
      };
      fetchPatient();
    }
  }, [isEditMode, editStaffId, reset, navigate, activeSection]);

  // Auto-calculate age from DD/MM/YYYY
  useEffect(() => {
    if (dobValue && dobValue.includes('/')) {
      const parts = dobValue.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);

        if (year > 1900 && year <= new Date().getFullYear() && month >= 0 && month < 12 && day > 0 && day <= 31) {
          const birthDate = new Date(year, month, day);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          setValue('age', age > 0 ? age : 0);
        }
      }
    }
  }, [dobValue, setValue]);

  const [stats, setStats] = useState<any>(null);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`/stats?year=${activeYear}`, {
        headers: { 'X-Company-Context': activeSection }
      });
      setStats(response.data);
    } catch (err) {
    }
  };

  const handleClearForm = () => {
    reset({
      age: 0,
      staff_id: '',
      patient_id: '',
      first_name: '',
      middle_name: '',
      last_name: '',
      department: '',
      gender: '',
      dob: '',
      phone: '',
      email: '',
      race: '',
      nationality: ''
    });
    setSearchId('');
    setSearchResults([]);
  };

  useEffect(() => {
    fetchStats();
  }, [activeSection, activeYear]);

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const [deptRes, raceRes, natRes] = await Promise.all([
          axios.get(`/api/config/departments`),
          axios.get(`/api/config/races`),
          axios.get(`/api/config/nationalities`)
        ]);
        setDepartments(deptRes.data.map((d: any) => d.name));
        setRaces(raceRes.data.map((r: any) => r.name));
        setNationalities(natRes.data.map((n: any) => n.name));
      } catch (err) {
        console.error("Failed to fetch configs", err);
      }
    };
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (searchId.length > 0) {
      if (isSelecting) {
        setIsSelecting(false);
        setSearchResults([]);
        return;
      }
      const fetchResults = async () => {
        try {
          const res = await axios.get(`/api/patients/search?q=${searchId}&year=${activeYear}`, {
            headers: { 'X-Company-Context': activeSection }
          });
          setSearchResults(res.data.results || []);
        } catch (err) {
          console.error(err);
        }
      };
      const timer = setTimeout(fetchResults, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchId, activeSection, isSelecting]);

  const handleSearch = async () => {
    const cleanId = searchId.trim();
    if (!cleanId) return;
    setSearching(true);
    try {
      const response = await axios.get(`/patient/${cleanId}?year=${activeYear}`, {
        headers: { 'X-Company-Context': activeSection }
      });

      const p = response.data;
      // Format ISO date (YYYY-MM-DD) to DD/MM/YYYY
      if (p.dob && p.dob.includes('-')) {
        const [y, m, d] = p.dob.split('-');
        p.dob = `${d}/${m}/${y}`;
      }

      reset(p);
      setSearchResults([]);
      toast.success(`Patient ${p.first_name} found and records retrieved.`);
    } catch (err) {
      toast.error("Patient not found in the comprehensive database.");
    } finally {
      setSearching(false);
    }
  };

  const selectPatient = (patient: any) => {
    const p = { ...patient };
    if (p.dob && p.dob.includes('-')) {
      const [y, m, d] = p.dob.split('-');
      p.dob = `${d}/${m}/${y}`;
    }
    setIsSelecting(true);
    reset(p);
    setSearchId(''); // Clear the search field immediately
    setSearchResults([]);
    toast.success(`Patient ${p.first_name} ${p.last_name} selected.`);
  };

  const onSubmit = async (data: RegistrationValues) => {
    setLoading(true);
    try {
      let formattedDob = data.dob;
      if (data.dob.includes('/')) {
        const [d, m, y] = data.dob.split('/');
        formattedDob = `${y}-${m}-${d}`;
      }

      if (isEditMode) {
        await axios.put(`/api/patients/${editStaffId}`, {
          ...data,
          dob: formattedDob,
          screening_year: activeYear
        }, {
          headers: { 'X-Company-Context': activeSection }
        });
        toast.success("Patient profile updated successfully!");
        navigate('/view-patients');
      } else {
        await axios.post('/register-patient', {
          ...data,
          dob: formattedDob,
          screening_year: Number(activeYear)
        }, {
          headers: { 'X-Company-Context': activeSection }
        });
        toast.success("Registration successful!");
        handleClearForm();
        fetchStats();
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || (isEditMode ? "Update failed" : "Registration failed");
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);

  useEffect(() => {
    setActiveSearchIndex(-1);
  }, [searchId, searchResults]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (searchResults.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveSearchIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveSearchIndex(prev => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (activeSearchIndex >= 0 && activeSearchIndex < searchResults.length) {
            selectPatient(searchResults[activeSearchIndex]);
          } else {
            handleSearch();
          }
          break;
        case 'Escape':
          setSearchResults([]);
          break;
      }
    } else if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 registration-page">
        {/* Top Header & Search Area */}
        <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 sm:gap-6 bg-card p-4 sm:p-6 rounded-2xl border transition-all">
          <div className="flex items-center gap-3">
            {isEditMode && (
              <Button variant="ghost" size="icon" onClick={() => navigate('/view-patients')} className="mr-2 hover:bg-primary/10 shrink-0">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </Button>
            )}
            <div className="p-1.5 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl">
              {isEditMode ? (
                <Users className="text-primary h-5 w-5 sm:h-8 sm:w-8" />
              ) : (
                <UserPlus className="text-primary h-5 w-5 sm:h-8 sm:w-8" />
              )}
            </div>
            <div>
              <h1 className="text-base sm:text-2xl font-black tracking-tight">
                {isEditMode ? 'Edit Patient Profile' : 'Patient Registration'}
              </h1>
              <p className="text-[9px] sm:text-sm text-muted-foreground font-medium">
                {isEditMode ? `Updating ${editStaffId}` : `Session: ${activeYear} • ${activeSection}`}
              </p>
            </div>
          </div>

          {!isEditMode && (
            <div className="w-full lg:max-w-xl relative">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-muted/30 p-2 rounded-xl border focus-within:border-primary/50 transition-all relative">
                <div className="flex items-center gap-2 flex-1 px-2 h-11">
                  <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                  <Input
                    className="border-0 bg-transparent focus-visible:ring-0 min-w-0 flex-1 text-base sm:text-lg font-bold h-full px-0"
                    placeholder="Search Staff ID or Name..."
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                  />
                </div>
                <Button 
                  onClick={handleSearch}
                  disabled={searching || !searchId.trim()}
                  className="bg-primary hover:bg-primary/90 px-6 sm:px-8 whitespace-nowrap font-bold h-11 rounded-xl w-full sm:w-auto"
                >
                  {searching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Load Data'}
                </Button>

                {/* Search Results Card */}
                {searchResults.length > 0 && (
                  <Card className="absolute top-full left-0 right-0 mt-2 z-[100] border border-primary/20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <CardHeader className="py-3 bg-primary/5 border-b">
                      <CardTitle className="text-xs uppercase tracking-widest text-primary/70">Matching Profiles</CardTitle>
                    </CardHeader>
                    <ul className="max-h-[300px] overflow-auto divide-y">
                      {searchResults.map((p: any, index: number) => (
                        <li 
                          key={p.staff_id}
                          className={`p-4 cursor-pointer transition-colors group ${activeSearchIndex === index ? 'bg-primary/10' : 'hover:bg-primary/5'}`}
                          onClick={() => selectPatient(p)}
                          onMouseEnter={() => setActiveSearchIndex(index)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black group-hover:scale-110 transition-transform ${activeSearchIndex === index ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                                {p.first_name[0]}{p.last_name[0]}
                              </div>
                              <div>
                                <p className={`font-bold capitalize ${activeSearchIndex === index ? 'text-primary' : 'text-foreground'}`}>{p.first_name} {p.last_name}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-2">
                                  <span className="bg-muted px-1.5 py-0.5 rounded uppercase">{p.staff_id}</span>
                                  {p.patient_id && (
                                    <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-semibold">PID: {p.patient_id}</span>
                                  )}
                                  • <span>{p.department}</span>
                                </p>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" className={`${activeSearchIndex === index ? 'opacity-100 bg-primary/20 text-primary' : 'opacity-0 group-hover:opacity-100'} h-8 px-2`}>
                              Select <ChevronRight className="ml-1 h-3 w-3" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <StatCard
            title="Total Registered"
            value={stats?.year_total?.toLocaleString() || '0'}
            sub={`${activeYear} Screening`}
            icon={Users}
            color="text-blue-600"
          />
          <StatCard
            title="Registered Today"
            value={stats?.today?.toLocaleString() || '0'}
            sub={`${activeYear} Screening`}
            icon={Activity}
            color="text-primary"
          />
          <StatCard
            title="Gender Mix"
            value={stats ? `${Math.round((stats.males / (stats.year_total || 1)) * 100)}% Male` : '0% Male'}
            sub={`${stats?.males || 0} M / ${stats?.females || 0} F`}
            icon={Users}
            color="text-indigo-600"
          />
          <StatCard
            title="Age Context"
            value={stats?.age_40_above?.toLocaleString() || '0'}
            sub="40 Years & Above"
            icon={Activity}
            color="text-amber-600"
          />
          <StatCard
            title="Youth Context"
            value={stats?.age_below_40?.toLocaleString() || '0'}
            sub="Below 40 Years"
            icon={Users}
            color="text-rose-600"
          />
          <StatCard
            title="Daily Target"
            value="80%"
            sub="Progress indicator"
            icon={Activity}
            color="text-primary"
          />
        </div>

        {/* Form Section */}
        <Card className="border">
          <CardHeader className="bg-primary/5 border-b py-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Bio-Data Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Row 1: IDs */}
              <div className="grid grid-cols-2 gap-3 sm:gap-6 p-4 bg-muted/20 rounded-xl border border-dashed mb-6">
                <div className="space-y-2">
                  <Label className="text-primary font-bold">Staff ID <span className="text-rose-500">*</span></Label>
                  <Input
                    {...register('staff_id', { required: true })}
                    className="h-11 border-primary/30 font-bold text-lg uppercase tracking-wider disabled:bg-muted/50"
                    placeholder="e.g. 123456"
                    inputMode="numeric"
                    required
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      e.target.value = val;
                      register('staff_id').onChange(e);
                    }}
                    disabled={isEditMode}
                  />
                  {errors.staff_id && <p className="text-xs text-destructive">{errors.staff_id.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-primary font-bold">Patient ID {!isEditMode && <span className="text-rose-500">*</span>}</Label>
                  <Input 
                    {...register('patient_id', { required: !isEditMode })} 
                    className="h-11 border-primary/30 font-bold text-lg uppercase tracking-wider" 
                    placeholder={isEditMode ? "Patient ID (Optional)" : "e.g. 12345"} 
                    inputMode="numeric"
                    required={!isEditMode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
                      e.target.value = val;
                      register('patient_id').onChange(e);
                    }}
                  />
                  {errors.patient_id && <p className="text-xs text-destructive">{errors.patient_id.message}</p>}
                </div>
              </div>

              {/* Main Form Fields: 4 per row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>First Name <span className="text-rose-500">*</span></Label>
                  <Input {...register('first_name', { required: true })} placeholder="First Name" required />
                </div>
                <div className="space-y-2">
                  <Label>Middle Name</Label>
                  <Input {...register('middle_name')} placeholder="Middle Name" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name <span className="text-rose-500">*</span></Label>
                  <Input {...register('last_name', { required: true })} placeholder="Last Name" required />
                </div>
                <div className="space-y-2">
                  <Label>Department <span className="text-rose-500">*</span></Label>
                  <Controller
                    name="department"
                    control={control}
                    render={({ field }) => (
                      <SearchableCombobox
                        options={departments}
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder="Select Department..."
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Gender <span className="text-rose-500">*</span></Label>
                  <Controller
                    name="gender"
                    control={control}
                    render={({ field }) => (
                      <SearchableCombobox
                        options={["Female", "Male"]}
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder="Select Gender..."
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth <span className="text-rose-500">*</span></Label>
                  <div className="relative group">
                    <Input
                      type="text"
                      {...register('dob', { required: true })}
                      placeholder="DD/MM/YYYY"
                      className="pr-12"
                      required
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 8) val = val.slice(0, 8);
                        if (val.length > 4) {
                          val = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
                        } else if (val.length > 2) {
                          val = `${val.slice(0, 2)}/${val.slice(2)}`;
                        }
                        e.target.value = val;
                        register('dob').onChange(e);
                      }}
                    />
                    <div className="absolute right-0 top-0 bottom-0 flex items-center pr-3 pointer-events-none z-10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <input
                      type="date"
                      className="absolute right-0 top-0 bottom-0 w-12 opacity-0 cursor-pointer z-50"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          const [y, m, d] = val.split('-');
                          setValue('dob', `${d}/${m}/${y}`, { shouldValidate: true });
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input type="number" {...register('age')} readOnly className="bg-muted/30 font-bold text-primary" />
                </div>
                <div className="space-y-2">
                  <Label>Phone No. <span className="text-rose-500">*</span></Label>
                  <Input {...register('phone', { required: true })} placeholder="+234..." required />
                </div>

                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input type="email" {...register('email')} placeholder="email@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Race <span className="text-rose-500">*</span></Label>
                  <Controller
                    name="race"
                    control={control}
                    render={({ field }) => (
                      <SearchableCombobox
                        options={races}
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder="Select Race..."
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nationality <span className="text-rose-500">*</span></Label>
                  <Controller
                    name="nationality"
                    control={control}
                    render={({ field }) => (
                      <SearchableCombobox
                        options={nationalities}
                        value={field.value || ''}
                        onChange={field.onChange}
                        placeholder="Select Nationality..."
                      />
                    )}
                  />
                </div>

              </div>

              <div className="pt-4 border-t flex flex-wrap justify-end gap-3">
                {!isEditMode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-12 px-8 font-bold text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 transition-all"
                    onClick={() => setIsClearDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-5 w-5" /> Clear Form
                  </Button>
                )}
                {isEditMode && (
                  <Button type="button" variant="outline" size="lg" className="h-12 px-8 font-bold" onClick={() => navigate('/view-patients')}>
                    <X className="mr-2 h-5 w-5" /> Cancel
                  </Button>
                )}
                <Button type="submit" size="lg" className="w-full sm:w-auto h-12 px-10 font-black text-base sm:text-lg" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (
                    <><Save className="mr-2 h-5 w-5 shrink-0" /> {isEditMode ? 'Update Profile' : 'Save Registration'}</>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Clear Form Confirmation Dialog */}
      <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border registration-dialog">
          <div className="p-6 pt-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-4 animate-in zoom-in duration-300">
                <Trash2 className="w-8 h-8" />
            </div>
            
            <DialogHeader className="space-y-2 flex flex-col items-center text-center sm:text-center">
                <DialogTitle className="text-2xl font-black tracking-tight text-foreground">Clear All Data?</DialogTitle>
                <DialogDescription className="text-sm font-medium text-muted-foreground px-4">
                    This will permanently remove all entered information from the form. This action cannot be undone.
                </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex flex-row gap-3 p-4 bg-muted/30 border-t">
            <Button 
                variant="ghost" 
                onClick={() => setIsClearDialogOpen(false)} 
                className="flex-1 font-bold h-11 hover:bg-background transition-colors"
            >
              No, Keep Data
            </Button>
            <Button 
                variant="destructive" 
                onClick={() => {
                    handleClearForm();
                    setIsClearDialogOpen(false);
                    toast.success("Form cleared successfully");
                }}
                className="flex-1 font-black h-11 active:scale-95 transition-all px-8"
            >
              Yes, Clear Form
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
  <Card className="border transition-all overflow-hidden">
    <CardContent className="p-2 sm:p-4 flex items-center gap-2 sm:gap-4 h-full">
      <div className={`p-2 sm:p-3 rounded-xl bg-muted/50 ${color} shrink-0`}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">{title}</p>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
          <h3 className="text-sm sm:text-2xl font-black truncate">{value}</h3>
          {sub && <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground truncate opacity-80">{sub}</span>}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default RegistrationPage;
