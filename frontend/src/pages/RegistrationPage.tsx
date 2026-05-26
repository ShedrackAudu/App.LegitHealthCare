import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ChevronRight,
  Camera,
  Upload,
  Eye,
  Video,
  ImagePlus,
  SwitchCamera,
  CircleDot
} from 'lucide-react';
import api from '@/lib/api';
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
    passport_image: z.string().optional(),
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
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [passportPreview, setPassportPreview] = useState<string>('');
  const [isSourceDialogOpen, setIsSourceDialogOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera stream helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    setCapturedImage(null);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch (err) {
      toast.error('Camera access denied or unavailable');
      setIsCameraOpen(false);
    }
  }, []);

  // Capture photo from video stream
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Center-crop to square
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
    stopCamera();
  }, [stopCamera]);

  // Use captured photo
  const useCapturedPhoto = useCallback(() => {
    if (!capturedImage) return;
    // Convert data URL to File
    fetch(capturedImage)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'passport-capture.jpg', { type: 'image/jpeg' });
        setPassportFile(file);
        setPassportPreview(capturedImage);
        setCapturedImage(null);
        setIsCameraOpen(false);
      });
  }, [capturedImage]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

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
          const response = await api.get(`/patient/${editStaffId}?year=${activeYear}`, {
            headers: { 'X-Company-Context': activeSection }
          });
          const p = response.data;

          // Format ISO date (YYYY-MM-DD) to DD/MM/YYYY
          if (p.dob && p.dob.includes('-')) {
            const [y, m, d] = p.dob.split('-');
            p.dob = `${d}/${m}/${y}`;
          }

          if (p.passport_image) {
            setPassportPreview(p.passport_image);
          } else {
            setPassportPreview('');
          }
          setPassportFile(null);

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
      const response = await api.get(`/stats?year=${activeYear}`, {
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
      nationality: '',
      passport_image: ''
    });
    setSearchId('');
    setSearchResults([]);
    setPassportPreview('');
    setPassportFile(null);
  };

  useEffect(() => {
    fetchStats();
  }, [activeSection, activeYear]);

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const [deptRes, raceRes, natRes] = await Promise.all([
          api.get(`/api/config/departments`),
          api.get(`/api/config/races`),
          api.get(`/api/config/nationalities`)
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
          const res = await api.get(`/api/patients/search?q=${searchId}&year=${activeYear}`, {
            headers: { 'X-Company-Context': activeSection }
          });
          const rawResults = res.data.results || [];
          // Sort by relevance: exact > prefix > contains
          const q = searchId.toLowerCase().trim();
          const sorted = [...rawResults].sort((a: any, b: any) => {
            const scoreFields = (p: any) => {
              const fields = [
                (p.staff_id || '').toLowerCase(),
                (p.first_name || '').toLowerCase(),
                (p.last_name || '').toLowerCase(),
                (p.patient_id || '').toLowerCase(),
              ];
              for (const f of fields) { if (f === q) return 0; }
              for (const f of fields) { if (f.startsWith(q)) return 1; }
              return 2;
            };
            return scoreFields(a) - scoreFields(b);
          });
          setSearchResults(sorted);
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
      const response = await api.get(`/patient/${cleanId}?year=${activeYear}`, {
        headers: { 'X-Company-Context': activeSection }
      });

      const p = response.data;
      // Format ISO date (YYYY-MM-DD) to DD/MM/YYYY
      if (p.dob && p.dob.includes('-')) {
        const [y, m, d] = p.dob.split('-');
        p.dob = `${d}/${m}/${y}`;
      }

      if (p.passport_image) {
        setPassportPreview(p.passport_image);
      } else {
        setPassportPreview('');
      }
      setPassportFile(null);

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
    if (p.passport_image) {
      setPassportPreview(p.passport_image);
    } else {
      setPassportPreview('');
    }
    setPassportFile(null);
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

      let passportUrl = data.passport_image || '';
      if (passportFile) {
        toast.loading("Uploading passport image...", { id: "passportUpload" });
        const formData = new FormData();
        formData.append('file', passportFile);
        const uploadRes = await api.post('/api/patients/upload-passport', formData, {
          headers: { 
            'Content-Type': 'multipart/form-data',
            'X-Company-Context': activeSection
          }
        });
        passportUrl = uploadRes.data.passport_image;
        toast.dismiss("passportUpload");
      } else if (!passportPreview) {
        // If preview was cleared, make sure it is cleared in DB too
        passportUrl = '';
      } else {
        passportUrl = passportPreview;
      }

      if (isEditMode) {
        await api.put(`/api/patients/${editStaffId}`, {
          ...data,
          dob: formattedDob,
          passport_image: passportUrl,
          screening_year: activeYear
        }, {
          headers: { 'X-Company-Context': activeSection }
        });
        toast.success("Patient profile updated successfully!");
        navigate('/view-patients');
      } else {
        await api.post('/register-patient', {
          ...data,
          dob: formattedDob,
          passport_image: passportUrl,
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
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center overflow-hidden font-black group-hover:scale-110 transition-transform ${activeSearchIndex === index ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                                {p.passport_image ? (
                                  <img 
                                    src={p.passport_image.startsWith('http') || p.passport_image.startsWith('blob') || p.passport_image.startsWith('data') ? p.passport_image : `${(window as any).API_BASE_URL}${p.passport_image}`} 
                                    alt="Avatar" 
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <>{p.first_name[0]}{p.last_name[0]}</>
                                )}
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
            <form onSubmit={handleSubmit(onSubmit, (errs) => {
              console.error("Form validation errors:", errs);
              const fields = Object.keys(errs).map(f => f.replace('_', ' ')).join(', ');
              toast.error(`Please fill or correct the following fields: ${fields}`);
            })} className="space-y-6">
              {/* Row 1: IDs & Passport Image */}
              <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr] gap-6 p-4 bg-muted/20 rounded-xl border border-dashed mb-6 items-center">
                {/* Passport Photo Uploader */}
                <div className="flex flex-col items-center md:items-start justify-center space-y-2 border-b pb-4 md:border-b-0 md:pb-0 md:border-r md:pr-6 border-primary/10">
                  <div 
                    className="relative group w-20 h-20 rounded-2xl border-2 border-dashed border-primary/30 overflow-hidden bg-card hover:border-primary transition-all flex items-center justify-center cursor-pointer shadow-inner"
                    onClick={() => { if (!passportPreview) setIsSourceDialogOpen(true); }}
                  >
                    {passportPreview ? (
                      <>
                        <img 
                          src={passportPreview.startsWith('http') || passportPreview.startsWith('blob') || passportPreview.startsWith('data') ? passportPreview : `${(window as any).API_BASE_URL}${passportPreview}`} 
                          alt="Passport Preview" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm transition-all"
                              onClick={(e) => { e.stopPropagation(); setIsPreviewOpen(true); }}
                              title="Preview"
                            >
                              <Eye className="text-white h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm transition-all"
                              onClick={(e) => { e.stopPropagation(); setIsSourceDialogOpen(true); }}
                              title="Change photo"
                            >
                              <Camera className="text-white h-3 w-3" />
                            </button>
                          </div>
                          <button
                            type="button"
                            className="p-1 rounded-full bg-red-500/60 hover:bg-red-500/90 backdrop-blur-sm transition-all"
                            onClick={(e) => { e.stopPropagation(); setPassportFile(null); setPassportPreview(''); }}
                            title="Remove photo"
                          >
                            <Trash2 className="text-white h-2.5 w-2.5" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-2 text-muted-foreground group-hover:text-primary transition-colors">
                        <ImagePlus className="h-4 w-4 mb-1" />
                        <span className="text-[8px] font-black uppercase tracking-wider">Add Photo</span>
                      </div>
                    )}
                  </div>
                  {/* Hidden file input */}
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPassportFile(file);
                        setPassportPreview(URL.createObjectURL(file));
                      }
                      if (e.target) e.target.value = '';
                    }}
                  />
                </div>

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

      {/* Photo Source Chooser Dialog */}
      <Dialog open={isSourceDialogOpen} onOpenChange={setIsSourceDialogOpen}>
        <DialogContent className="sm:max-w-xs p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
          <div className="p-6 pb-2">
            <DialogHeader>
              <DialogTitle className="text-lg font-black tracking-tight text-center">Choose Photo Source</DialogTitle>
              <DialogDescription className="text-center text-sm text-muted-foreground">Select how you'd like to add a passport photo</DialogDescription>
            </DialogHeader>
          </div>
          <div className="flex flex-col gap-2 px-6 pb-6">
            <button
              type="button"
              className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all group text-left"
              onClick={() => {
                setIsSourceDialogOpen(false);
                fileInputRef.current?.click();
              }}
            >
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20 transition-colors">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Upload File</p>
                <p className="text-xs text-muted-foreground">Choose from your device</p>
              </div>
              <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
            <button
              type="button"
              className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all group text-left"
              onClick={() => {
                setIsSourceDialogOpen(false);
                setIsCameraOpen(true);
              }}
            >
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20 transition-colors">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Use Camera</p>
                <p className="text-xs text-muted-foreground">Capture with webcam</p>
              </div>
              <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Camera Capture Dialog */}
      <Dialog open={isCameraOpen} onOpenChange={(open) => { if (!open) { stopCamera(); setCapturedImage(null); } setIsCameraOpen(open); }}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
          <div className="p-4 pb-2">
            <DialogHeader>
              <DialogTitle className="text-lg font-black tracking-tight text-center flex items-center justify-center gap-2">
                <Video className="h-5 w-5 text-emerald-500" />
                Camera Capture
              </DialogTitle>
              <DialogDescription className="text-center text-sm text-muted-foreground">Position your face in the frame and capture</DialogDescription>
            </DialogHeader>
          </div>

          <div className="relative bg-black mx-4 rounded-xl overflow-hidden aspect-square">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                  style={{ transform: 'scaleX(-1)' }}
                  onLoadedMetadata={() => { videoRef.current?.play(); setCameraReady(true); }}
                />
                {!cameraReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                    <span className="text-sm font-medium">Starting camera...</span>
                  </div>
                )}
                {/* Face guide overlay */}
                {cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 rounded-full border-2 border-dashed border-white/40" />
                  </div>
                )}
                {/* Live indicator */}
                {cameraReady && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Live</span>
                  </div>
                )}
              </>
            ) : (
              <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
            )}
          </div>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          <div className="flex items-center justify-center gap-3 p-4">
            {!capturedImage ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="font-bold"
                  onClick={() => { stopCamera(); setCapturedImage(null); setIsCameraOpen(false); }}
                >
                  Cancel
                </Button>
                {!cameraReady && (
                  <Button
                    type="button"
                    size="sm"
                    className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    onClick={startCamera}
                  >
                    <Video className="h-4 w-4" />
                    Start Camera
                  </Button>
                )}
                {cameraReady && (
                  <Button
                    type="button"
                    size="lg"
                    className="font-black bg-white text-black hover:bg-gray-100 rounded-full w-14 h-14 p-0 shadow-lg border-4 border-emerald-500 active:scale-90 transition-transform"
                    onClick={capturePhoto}
                    title="Capture Photo"
                  >
                    <CircleDot className="h-6 w-6" />
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="font-bold gap-2"
                  onClick={() => { setCapturedImage(null); startCamera(); }}
                >
                  <SwitchCamera className="h-4 w-4" />
                  Retake
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  onClick={useCapturedPhoto}
                >
                  <Save className="h-4 w-4" />
                  Use Photo
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Image Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl border-0 shadow-2xl bg-black/95">
          <DialogHeader className="sr-only">
            <DialogTitle>Passport Photo Preview</DialogTitle>
            <DialogDescription>Full size preview of the passport photograph</DialogDescription>
          </DialogHeader>
          {passportPreview && (
            <div className="relative flex items-center justify-center p-4">
              <img
                src={passportPreview.startsWith('http') || passportPreview.startsWith('blob') || passportPreview.startsWith('data') ? passportPreview : `${(window as any).API_BASE_URL}${passportPreview}`}
                alt="Passport Full Preview"
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl"
              />
            </div>
          )}
          <div className="flex items-center justify-center gap-3 p-4 bg-black/50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-bold gap-2 border-white/20 text-white hover:bg-white/10 hover:text-white"
              onClick={() => { setIsPreviewOpen(false); setIsSourceDialogOpen(true); }}
            >
              <Camera className="h-4 w-4" />
              Change Photo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="font-bold text-white hover:bg-white/10 hover:text-white"
              onClick={() => setIsPreviewOpen(false)}
            >
              Close
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
