import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Controller } from 'react-hook-form';
import {
  User,
  ChevronDown,
  Users,
  Clock,
  ChevronRight,
  Loader2,
  Stethoscope,
  FileText,
  ClipboardList,
  Activity,
  Heart,
  Thermometer,
  Save
} from 'lucide-react';
import { PatientSearch } from '@/components/PatientSearch';
import { toast } from 'react-hot-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext';
import axios from 'axios';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const consultationSchema = z.object({
  // Clinical Fields
  luts: z.string().min(1, 'LUTS is required'),
  chronic_cough: z.string().min(1, 'Chronic Cough is required'),
  chronic_chest_pain: z.string().min(1, 'Chronic Chest Pain is required'),
  chest_infection: z.string().min(1, 'Chest Infection is required'),
  heart_dx: z.string().min(1, 'Heart DX is required'),
  palor: z.string().min(1, 'Palor is required'),
  jaundice: z.string().min(1, 'Jaundice is required'),
  murmur: z.string().min(1, 'Murmur is required'),
  chest_status: z.string().min(1, 'Chest Status is required'),
  psa: z.string().min(1, 'PSA is required'),
  psa_remark: z.string().min(1, 'PSA Remark is required'),
  fbs: z.string().min(1, 'FBS is required'),
  rbs: z.string().min(1, 'RBS is required'),
  sugar_remark: z.string().min(1, 'FBS/RBS Remark is required'),
  ua_result: z.string().min(1, 'U/A Result is required'),
  ua_remark: z.string().min(1, 'U/A Remark is required'),
  dm_status: z.string().min(1, 'DM Status is required'),
  htn_status: z.string().min(1, 'HTN Status is required'),
  bp: z.string().min(1, 'BP is required'),
  pulse: z.string().min(1, 'Pulse is required'),
  spo2: z.string().min(1, 'SPO2 is required'),
  hs_status: z.string().min(1, 'HS Status is required'),
  breast_exam: z.string().min(1, 'Breast Exam is required'),
  breast_remark: z.string().min(1, 'Breast Remark is required'),
  abdomen: z.string().min(1, 'Abdomen is required'),
  assessment_hx_pe: z.string().min(1, 'Assessment HX/PE is required'),
  other_assessments: z.string().min(1, 'Other Assessments is required'),
  other_remarks: z.string().min(1, 'Other Remarks is required'),
  overall_assessment: z.string().optional().or(z.literal('')),
});

type ConsultationValues = z.infer<typeof consultationSchema>;

const SelectField = ({ label, options, name, control }: any) => (
  <div className="space-y-1.5 lg:col-span-1">
    <Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1 whitespace-nowrap truncate block">{label} <span className="text-red-500">*</span></Label>
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <>
          <Select onValueChange={field.onChange} value={field.value}>
            <SelectTrigger className={`h-11 rounded-xl border-2 font-semibold ${fieldState.error ? 'border-red-500' : ''}`}>
              <SelectValue placeholder={`Select ${label}...`} />
            </SelectTrigger>
            <SelectContent className="z-[150]">
              {options.map((opt: string) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldState.error && <p className="text-[10px] text-red-500 font-bold ml-1">{fieldState.error.message}</p>}
        </>
      )}
    />
  </div>
);

const RadioField = ({ label, name, control }: any) => (
  <div className="space-y-2 lg:col-span-1">
    <Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1 whitespace-nowrap truncate block">{label} <span className="text-red-500">*</span></Label>
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <>
          <RadioGroup
            onValueChange={field.onChange}
            value={field.value}
            className={`flex gap-4 p-1 bg-muted/30 rounded-xl border-2 h-11 items-center px-4 ${fieldState.error ? 'border-red-500' : ''}`}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Yes" id={`${name}-yes`} className="text-emerald-600 border-2" />
              <Label htmlFor={`${name}-yes`} className="font-bold cursor-pointer">Yes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="No" id={`${name}-no`} className="text-rose-600 border-2" />
              <Label htmlFor={`${name}-no`} className="font-bold cursor-pointer">No</Label>
            </div>
          </RadioGroup>
          {fieldState.error && <p className="text-[10px] text-red-500 font-bold ml-1">{fieldState.error.message}</p>}
        </>
      )}
    />
  </div>
);

const ComboField = React.forwardRef(({ label, options, ...props }: any, ref: any) => (
  <div className="space-y-1.5 lg:col-span-1">
    <Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1 whitespace-nowrap truncate block">{label} <span className="text-red-500">*</span></Label>
    <div className="relative group">
      <Input
        ref={ref}
        {...props}
        className={`h-11 rounded-xl border-2 font-black pr-10 text-lg ${props.className} ${props.error ? 'border-red-500' : ''}`}
      />
      <div className="absolute right-0 top-0 bottom-0 flex items-center pr-3 cursor-pointer">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="p-1 hover:bg-muted rounded-md transition-colors">
              <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-hover:scale-110" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[150]">
            {options.map((opt: string) => (
              <DropdownMenuItem
                key={opt}
                className="font-bold"
                onClick={() => {
                  const event = {
                    target: {
                      name: props.name,
                      value: opt
                    }
                  };
                  props.onChange(event as any);
                }}
              >
                {opt}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    {props.error && <p className="text-[10px] text-red-500 font-bold ml-1">{props.error}</p>}
  </div>
));

const ConsultationPage: React.FC = () => {
  const { activeSection, activeYear } = useAppContext();
  const [patient, setPatient] = useState<any>(null);
  const [searchId, setSearchId] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [queueEntries, setQueueEntries] = useState<any[]>([]);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [loadingQueue, setLoadingQueue] = useState(false);

  // REMOVED deprecated ad-hoc search effect logic as it's now in PatientSearch component


  // Fetch queue count
  const fetchQueue = async () => {
    try {
      const resp = await axios.get(`http://localhost:5000/api/queue/?year=${activeYear}`, {
        headers: { 'X-Company-Context': activeSection }
      });
      setQueueCount(resp.data.consultation || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchQueueList = async () => {
    setLoadingQueue(true);
    try {
      const resp = await axios.get(`http://localhost:5000/api/queue/consultation/?year=${activeYear}`, {
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

  const getRelativeTime = (isoString: string) => {
    if (!isoString) return 'recently';
    const dateStr = isoString.endsWith('Z') || isoString.includes('+') ? isoString : `${isoString}Z`;
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    if (diffInMs < 0) return 'Just now';
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins} mins ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    fetchQueue();
    // Poll every 30 seconds for queue changes
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [activeYear, activeSection]);

  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors } } = useForm<ConsultationValues>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      luts: 'No',
      chronic_cough: 'No',
      chronic_chest_pain: 'No',
      chest_infection: 'No',
      heart_dx: 'No',
      palor: 'No',
      jaundice: 'No',
      murmur: 'No',
      chest_status: '',
      psa: '',
      fbs: '',
      rbs: '',
      sugar_remark: '',
      ua_result: '',
      ua_remark: '',
      dm_status: '',
      htn_status: '',
      hs_status: '',
      breast_exam: '',
      breast_remark: '',
      abdomen: '',
      assessment_hx_pe: '',
      bp: '',
      pulse: '',
      spo2: '',
      other_assessments: '',
      psa_remark: '',
      other_remarks: '',
      overall_assessment: ''
    }
  });

  // Re-fetch patient data if activeYear changes while a patient is selected
  useEffect(() => {
    if (patient) {
      handleSearch(patient.staff_id);
    }
  }, [activeYear]);

  const fbs = watch('fbs');
  const rbs = watch('rbs');

  // Mutually exclusive numeric logic for FBS and RBS
  useEffect(() => {
    if (fbs && !isNaN(parseFloat(fbs)) && rbs !== 'Not Applicable') {
      setValue('rbs', 'Not Applicable');
    }
  }, [fbs, setValue]);

  useEffect(() => {
    if (rbs && !isNaN(parseFloat(rbs)) && fbs !== 'Not Applicable') {
      setValue('fbs', 'Not Applicable');
    }
  }, [rbs, setValue]);


  const handleSearch = async (staffIdToSearch?: string) => {
    const idToSearch = staffIdToSearch || searchId;
    if (!idToSearch) return;
    setSearching(true);
    try {
      const response = await axios.get(`http://localhost:5000/screening/${activeYear}/patient/${idToSearch}`, {
        headers: { 'X-Company-Context': activeSection }
      });
      const fullData = response.data;
      setPatient(fullData);

      if (fullData.consultation) {
        reset(fullData.consultation);
        toast.success(`Loaded existing consultation for ${fullData.first_name}`);
      } else {
        reset({
          luts: 'No', chronic_cough: 'No', chronic_chest_pain: 'No', chest_infection: 'No',
          heart_dx: 'No', palor: 'No', jaundice: 'No', murmur: 'No',
          chest_status: '', psa: '', psa_remark: '',
          fbs: '', rbs: '', sugar_remark: '',
          ua_result: '', ua_remark: '', dm_status: '',
          htn_status: '', hs_status: '', bp: '', pulse: '', spo2: '',
          breast_exam: '', breast_remark: '', abdomen: '',
          assessment_hx_pe: '', other_assessments: '',
          other_remarks: '', overall_assessment: ''
        } as any);
        toast.success(`New consultation for ${fullData.first_name}`);
      }
    } catch (err) {
      toast.error("Patient not found for this session.");
    } finally {
      setSearching(false);
    }
  };

  const onSubmit = async (data: ConsultationValues) => {
    if (!patient) return;
    setSaving(true);
    try {
      await axios.post('http://localhost:5000/consultation', {
        ...data,
        staff_id: patient.staff_id,
        screening_year: activeYear
      }, {
        headers: {
          'X-Company-Context': activeSection,
          'X-User-ID': localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).id : undefined
        }
      });
      toast.success("Consultation records saved!");
      fetchQueue();
      setSearchId('');
      setPatient(null);
    } catch (err) {
      toast.error("Submission failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 mt-2 p-4">
        {/* Top Header & Search Area */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-card p-6 rounded-2xl border-2 shadow-xl border-emerald-500/10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 rounded-2xl">
              <Stethoscope className="text-emerald-600 h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Doctor's Consultation</h1>
              <p className="text-sm text-muted-foreground font-medium">Session: {activeYear} • {activeSection}</p>
            </div>
          </div>          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full xl:w-auto">
            {/* Queue Status Card */}
            <Card
              className="bg-primary/5 border-primary/20 cursor-pointer hover:bg-primary/10 transition-colors group shrink-0 hidden sm:block shadow-sm"
              onClick={fetchQueueList}
            >
              <CardContent className="p-2.5 px-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-tight">Waiting</p>
                    <h3 className="text-lg font-black tracking-tighter leading-none">{queueCount}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 text-[9px] font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  VIEW <ChevronRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>

            {/* Unified Search Header style matching Director */}
            <PatientSearch
              activeSection={activeSection}
              onSearch={handleSearch}
              onSelect={(p) => {
                setPatient(p);
                handleSearch(p.staff_id);
              }}
              searching={searching}
              themeColor="emerald"
            />
          </div>
        </div>

        {!patient ? (
          <Card className="border-2 border-dashed flex items-center justify-center h-64 bg-muted/5 mt-8">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-bold text-lg italic">Enter a Patient ID to begin consultation.</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Searching in {activeYear} Screening Data</p>
            </div>
          </Card>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 mt-8">
            <Card className="border-2 border-emerald-500/20 shadow-lg bg-emerald-500/[0.02]">
              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-x-3 gap-y-4 md:gap-x-4 lg:gap-4">
                  <PatientInfo label="STAFF ID" value={patient.staff_id} />
                  <div className="lg:col-span-2">
                    <PatientInfo label="NAME" value={`${patient.first_name} ${patient.last_name}`} />
                  </div>
                  <PatientInfo label="AGE" value={`${patient.age} Yrs`} />
                  <PatientInfo label="DEPARTMENT" value={patient.department} />
                  <PatientInfo label="GENDER" value={patient.gender} />
                  <div className="col-span-full lg:col-span-2 border-t lg:border-t-0 lg:border-l pt-3 lg:pt-0 pl-0 lg:pl-4 border-emerald-500/10">
                    <PatientInfo label="CONSULTED BY" value={patient.consultation?.consulted_by_name || 'NOT CONSULTED'} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6 pb-24">
              <Card className="border-2 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                  <FileText className="h-32 w-32" />
                </div>
                <CardHeader className="border-b bg-muted/5 py-4">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <ClipboardList className="h-6 w-6 text-emerald-600" />
                    Clinical Findings & Assessments
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
                    <div className="space-y-4">
                      <h3 className="text-sm font-black uppercase tracking-widest text-emerald-600 border-b pb-2">Medical History & Screening</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 md:gap-x-8 gap-y-4">
                        <RadioField name="luts" control={control} label="LUTS" />
                        <RadioField name="chronic_cough" control={control} label="Chronic Cough" />
                        <RadioField name="chronic_chest_pain" control={control} label="Chronic Chest Pain" />
                        <RadioField name="chest_infection" control={control} label="Chest Infection" />
                        <RadioField name="heart_dx" control={control} label="Heart DX" />
                        <RadioField name="palor" control={control} label="Palor" />
                        <RadioField name="jaundice" control={control} label="Jaundice" />
                        <RadioField name="murmur" control={control} label="Murmur" />
                        <SelectField name="chest_status" control={control} label="Chest" options={['Clinically Clear', 'Not Clear']} />
                        <SelectField name="breast_exam" control={control} label="Breast Exam" options={['Abnormal', 'Normal', 'Not Applicable']} />
                        <SelectField name="breast_remark" control={control} label="Breast Exam Remark" options={['Normal', 'Not Applicable']} />
                        <SelectField name="abdomen" control={control} label="Abdomen" options={['Abnormal', 'Normal']} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-black uppercase tracking-widest text-emerald-600 border-b pb-2">Vital Signs & Core Metrics</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label className="font-bold flex items-center gap-2 whitespace-nowrap truncate"><Activity className="h-4 w-4 text-emerald-600" /> B.P <span className="text-red-500">*</span></Label>
                            <Input {...register('bp')} className="h-12 text-lg font-bold" />
                          {errors.bp && <p className="text-xs text-destructive">{errors.bp.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold flex items-center gap-2 whitespace-nowrap truncate"><Heart className="h-4 w-4 text-rose-500" /> Pulse (b/m) <span className="text-red-500">*</span></Label>
                          <Input {...register('pulse')} className="h-12 text-lg font-bold" />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-bold flex items-center gap-2 whitespace-nowrap truncate"><Thermometer className="h-4 w-4 text-blue-500" /> SPO2 % <span className="text-red-500">*</span></Label>
                          <Input {...register('spo2')} className="h-12 text-lg font-bold" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-black uppercase tracking-widest text-emerald-600 border-b pb-2">Systematic Findings & Lab Data</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <SelectField name="dm_status" control={control} label="Diabetes Mellitus - DM" options={['No', 'Yes - Not on Medication', 'Yes - Not on Regular Medication', 'Yes - On Regular Medication']} />
                        <SelectField name="htn_status" control={control} label="Hypertension - HTN" options={['No', 'Yes - Not on Medication', 'Yes - Not on Regular Medication', 'Yes - On Regular Medication']} />
                        <SelectField name="hs_status" control={control} label="HS: 1&2" options={['Present', 'S3 Present', 'S4 Present']} />
                        <SelectField name="psa" control={control} label="Prostate-Specific Antigen - PSA" options={['Negative', 'Not Applicable', 'Positive']} />
                        <SelectField name="psa_remark" control={control} label="PSA Remark" options={['Normal', 'Abnormal', 'Not Applicable']} />
                        <ComboField {...register('fbs')} label="FBS" options={['Not Applicable']} error={errors.fbs?.message} />
                        <ComboField {...register('rbs')} label="RBS" options={['Not Applicable']} error={errors.rbs?.message} />
                        <SelectField name="sugar_remark" control={control} label="FBS/RBS Remark" options={['Abnormal', 'Maybe Abnormal', 'Normal']} />
                        <SelectField name="ua_result" control={control} label="Sugar & Protein - U/A" options={['Glycosuria', 'Glycosuria+', 'Glycosuria >+', 'No Abnormality', 'Proteinuria', 'Proteinuria+', 'Proteinuria >+', 'Proteinuria/Glycosuria']} />
                        <SelectField name="ua_remark" control={control} label="U/A Remark" options={['Abnormal', 'Maybe Abnormal', 'Normal']} />
                        <SelectField name="assessment_hx_pe" control={control} label="Assessment - HX/PE" options={['Bladder Outlet Obstruction', 'Elevated BP', 'Known DM', 'Poorly Controlled HTN', 'Satisfactory']} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="font-bold">Other Assessments <span className="text-red-500">*</span></Label>
                        <textarea {...register('other_assessments')} className="w-full min-h-[100px] border-2 rounded-xl p-3 text-sm focus:ring-2 ring-emerald-500/20 bg-muted/5 outline-none" placeholder="Provide additional assessment details..." />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-emerald-600">Other Remarks <span className="text-red-500">*</span></Label>
                        <textarea {...register('other_remarks')} className="w-full min-h-[100px] border-2 border-emerald-500/10 rounded-xl p-3 text-sm focus:ring-2 ring-emerald-500/20 bg-muted/5 outline-none" placeholder="Any other clinical notes..." />
                      </div>

                    </div>

                    <div className="pt-6 border-t flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
                      <Button type="button" variant="outline" size="lg" className="w-full sm:w-auto px-10 h-12 font-bold order-2 sm:order-1" onClick={() => setPatient(null)}>Discard</Button>
                      <Button type="submit" size="lg" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 px-10 sm:px-16 h-12 font-bold text-base sm:text-lg shadow-xl shadow-emerald-500/20 order-1 sm:order-2" disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (
                          <div className="flex items-center justify-center whitespace-nowrap">
                             <Save className="mr-2 h-5 w-5 shrink-0" /> Submit Findings
                          </div>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      <Dialog open={isQueueModalOpen} onOpenChange={setIsQueueModalOpen}>
        <DialogContent className="max-w-2xl sm:max-w-[500px] border-primary/20">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight">Consultation Queue</DialogTitle>
                <DialogDescription className="text-xs font-medium">Patients waiting for clinical assessment</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="relative mt-2">
            <ScrollArea className="h-[400px] pr-4">
              {loadingQueue ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                </div>
              ) : queueEntries.length > 0 ? (
                <div className="space-y-3">
                  {queueEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-4 rounded-xl border-2 bg-muted/5 hover:bg-muted/10 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-black text-primary border border-primary/20 transition-transform group-hover:scale-110">
                          {entry.first_name?.[0]}{entry.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-black text-sm tracking-tight">{entry.first_name} {entry.last_name}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">ID: {entry.staff_id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-3 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white border border-emerald-600/20 rounded-lg group/btn"
                          onClick={() => {
                            handleSearch(entry.staff_id);
                            setIsQueueModalOpen(false);
                          }}
                        >
                          Proceed <ChevronRight className="w-3 h-3 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
                        </Button>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] font-bold">{getRelativeTime(entry.created_at)}</span>
                          </div>
                          <Badge variant="outline" className="text-[8px] font-black tracking-tighter text-emerald-600 border-emerald-600/20">
                            WAITING
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
                  <Users className="h-12 w-12 mb-4 text-muted-foreground" />
                  <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Queue Empty</p>
                  <p className="text-xs text-muted-foreground mt-1">No patients are in the consultation queue.</p>
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              variant="ghost"
              onClick={() => setIsQueueModalOpen(false)}
              className="font-black text-xs uppercase tracking-widest hover:bg-primary/5"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

const PatientInfo = ({ label, value }: any) => (
  <div className="space-y-0.5 sm:space-y-1">
    <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 leading-none">{label}</p>
    <p className="font-black text-base sm:text-lg text-primary tracking-tight truncate leading-tight">{value}</p>
  </div>
);

export default ConsultationPage;
