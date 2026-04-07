import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useForm, Controller } from 'react-hook-form';
import { 
  Activity, 
  Save, 
  Loader2, 
  Clock, 
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { PatientSearch } from '@/components/PatientSearch';
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
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext';
import axios from 'axios';

// Helper Components
const BioItem = ({ label, value }: any) => (
    <div className="space-y-0.5">
        <p className="text-[9px] md:text-[10px] uppercase tracking-widest font-black text-muted-foreground leading-none">{label}</p>
        <p className="text-sm md:text-base font-bold text-foreground leading-tight truncate">{value}</p>
    </div>
);

const AccordionSection = ({ title, description, children, defaultOpen = false }: any) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <Card className="border-2 shadow-sm overflow-hidden transition-all duration-300">
            <div 
                className={`flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors ${isOpen ? 'bg-primary/5 border-b-2 border-primary/20' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl bg-background border shadow-sm">
                        {isOpen ? <ChevronUp className="h-6 w-6" /> : <ChevronDown className="h-6 w-6" />}
                    </Button>
                    <div>
                        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
                        <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                </div>
                <div className="text-xs font-black uppercase text-primary tracking-tighter">
                    {isOpen ? 'Collapse Section' : 'Expand Section'}
                </div>
            </div>
            <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                {children}
            </div>
        </Card>
    );
};

const SelectField = ({ label, options, name, control }: any) => (
  <div className="space-y-1.5 lg:col-span-1">
      <Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1">{label}</Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select onValueChange={field.onChange} value={field.value}>
            <SelectTrigger className="h-10 border rounded-md font-semibold">
              <SelectValue placeholder={`Select ${label}...`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt: string) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
  </div>
);

const ComboField = React.forwardRef(({ label, options, ...props }: any, ref: any) => (
  <div className="space-y-1.5 lg:col-span-1">
      <Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1">{label}</Label>
      <div className="relative group">
          <Input 
              ref={ref}
              {...props}
              className="h-10 border rounded-md font-semibold pr-10" 
          />
          <div className="absolute right-0 top-0 bottom-0 flex items-center pr-3 cursor-pointer">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="p-1 hover:bg-muted rounded-md transition-colors">
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-hover:scale-110" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {options.map((opt: string) => (
                    <DropdownMenuItem 
                      key={opt} 
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
  </div>
));

const RadioField = ({ label, name, control }: any) => (
  <div className="space-y-2 lg:col-span-1">
    <Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1">{label}</Label>
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <RadioGroup
          onValueChange={field.onChange}
          value={field.value}
          className="flex gap-4 p-1 bg-muted/30 rounded-xl border-2 h-11 items-center px-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Yes" id={`${name}-yes`} className="text-primary border-2" />
            <Label htmlFor={`${name}-yes`} className="font-bold cursor-pointer">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="No" id={`${name}-no`} className="text-rose-600 border-2" />
            <Label htmlFor={`${name}-no`} className="font-bold cursor-pointer">No</Label>
          </div>
        </RadioGroup>
      )}
    />
  </div>
);

const ReviewContent = ({ patient, history, loading, onSubmit, activeYear, activeSection }: any) => {
    const { register, handleSubmit, setValue, watch, control, reset } = useForm({
        defaultValues: {
            ...history?.consultation,
            ...history?.special,
            ...history?.fbc,
            ...history?.kft,
            ...history?.lipid,
            ...history?.lft,
            ...history?.review
        }
    });

    const [generatingAI, setGeneratingAI] = useState(false);

    useEffect(() => {
        reset({
            ...history?.consultation,
            ...history?.special,
            ...history?.fbc,
            ...history?.kft,
            ...history?.lipid,
            ...history?.lft,
            ...history?.review
        });
    }, [history, reset]);

    // Live calculation for KFT and Lipids
    useEffect(() => {
        const subscription = watch((value, { name }) => {
            // Urea -> Creatinine estimation (sample logic)
            if (name === 'urea') {
                const urea = parseFloat(value.urea);
                if (!isNaN(urea)) {
                    // Just example logic
                }
            }

            // HDL: TCHO * 0.35
            if (name === 'total_cholesterol') {
                const tcho = parseFloat(value.total_cholesterol);
                if (!isNaN(tcho)) {
                    setValue('hdl', (tcho * 0.35).toFixed(2));
                }
            }

            // LDL: TCHO + TRIGLYCERIDES(TG)/5 + HDL
            if (name === 'total_cholesterol' || name === 'triglycerides' || name === 'hdl') {
                const tcho = parseFloat(value.total_cholesterol);
                const tg = parseFloat(value.triglycerides);
                const hdl = parseFloat(value.hdl);
                if (!isNaN(tcho) && !isNaN(tg) && !isNaN(hdl)) {
                    const ldl = tcho + (tg / 5) + hdl;
                    setValue('ldl', ldl.toFixed(2));
                }
            }
        });
        return () => subscription.unsubscribe();
    }, [watch, setValue]);

    const handleAIGenerate = async () => {
        setGeneratingAI(true);
        try {
            const res = await axios.post('http://localhost:5000/api/ai/generate', {
                staff_id: patient.staff_id,
                screening_year: activeYear
            }, {
                headers: { 'X-Company-Context': activeSection }
            });
            
            const { comments, overview } = res.data;
            if (comments && Array.isArray(comments)) {
                const suffixes = ['one', 'two', 'three', 'four'];
                comments.forEach((c: string, i: number) => {
                    if (i < 4) {
                        setValue(`comment_${suffixes[i]}`, c);
                    }
                });
                toast.success("AI generated 4 distinct comments for you!");
            } else {
                setValue('comment_one', overview);
                toast.success("AI Insight generated and applied to first comment.");
            }
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || "Failed to generate AI overview";
            toast.error(errorMsg);
        } finally {
            setGeneratingAI(false);
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <Card className="border-2 shadow-xl bg-card">
                <CardContent className="p-4 md:p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-x-3 gap-y-4 md:gap-x-4 lg:gap-4">
                        <BioItem label="STAFF ID" value={patient.staff_id} />
                        <div className="col-span-1 lg:col-span-2">
                            <BioItem label="FULL NAME" value={`${patient.first_name} ${patient.last_name}`} />
                        </div>
                        <BioItem label="AGE" value={`${patient.age} Yrs`} />
                        <BioItem label="DEPARTMENT" value={patient.department} />
                        <BioItem label="GENDER" value={patient.gender || 'N/A'} />
                        <div className="flex items-center justify-between col-span-full lg:col-span-2 border-t lg:border-t-0 lg:border-l pt-3 lg:pt-0 pl-0 lg:pl-4 border-muted mt-1 lg:mt-0">
                            <BioItem label="CONSULTED BY" value={history?.consultation?.consulted_by_name || 'N/A'} />
                            {history?.review?.first_submitted_at && (
                                <div className="flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20 shrink-0 ml-2">
                                    <Clock className="h-3 w-3 text-primary" />
                                    <div>
                                        <p className="text-[7px] uppercase font-black text-primary opacity-70 leading-none">Reported</p>
                                        <p className="text-[9px] font-bold text-primary">{new Date(history.review.first_submitted_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <AccordionSection title="Full Blood Count" description="Hematology results and remarks">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                        {[
                            'PCV', 'WBC', 'PLT', 'HGB', 'RBC',
                            'LYMP_PERCENT', 'LYMP_ABS', 'MID_PERCENT', 'MID_ABS', 'GRA_PERCENT', 'GRA_ABS',
                            'MCV', 'MCH', 'MCHC', 'RDW', 'PDW',
                            'FBC_REMARK', 'OTHER_REMARKS'
                        ].map(f => (
                            <div key={f} className={`space-y-1 ${f.includes('REMARK') ? 'lg:col-span-2' : ''}`}>
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground">{f.replace('_', ' ')}</Label>
                                {f.includes('REMARK') ? (
                                    <Input {...register(f.toLowerCase())} className="h-9 text-sm" />
                                ) : (
                                    <Input {...register(f.toLowerCase())} className="h-9 text-sm font-mono" />
                                )}
                            </div>
                        ))}
                    </div>
                </AccordionSection>

                <AccordionSection title="Kidney Function Test" description="Potassium, Sodium, Urea, and Creatinine">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                        {['POTASSIUM', 'SODIUM', 'CHLORIDE', 'BICARBONATE_CA', 'HCO3', 'UREA', 'CREATININE', 'KFT_REMARK'].map(f => (
                            <div key={f} className="space-y-1">
                                <Label className="text-xs">{f.replace('_', ' ')}</Label>
                                <Input {...register(f.toLowerCase())} className="h-9 text-sm" />
                            </div>
                        ))}
                    </div>
                </AccordionSection>

                <AccordionSection title="Lipid Profile Test" description="Cholesterol, HDL, and LDL levels">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {['TOTAL_CHOLESTEROL', 'TRIGLYCERIDES', 'HDL', 'LDL', 'LP_REMARK'].map(f => (
                            <div key={f} className="space-y-1">
                                <Label className="text-xs">{f.replace('_', ' ')}</Label>
                                <Input {...register(f.toLowerCase())} className="h-9 text-sm" />
                            </div>
                        ))}
                    </div>
                </AccordionSection>

                <AccordionSection title="Liver Function Test" description="AST, ALT, ALP, and Bilirubin">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                        {['AST', 'ALT', 'ALP', 'TB', 'CB', 'LFT_REMARK'].map(f => (
                            <div key={f} className="space-y-1">
                                <Label className="text-xs">{f.replace('_', ' ')}</Label>
                                <Input {...register(f.toLowerCase())} className="h-9 text-sm" />
                            </div>
                        ))}
                    </div>
                </AccordionSection>

                <AccordionSection title="Special Diagnostic Tests" description="ECG, Spirometry, Audiometry, and Vitals">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                        {[
                            { id: 'ecg_result', label: 'ECG Status' },
                            { id: 'ecg_remark', label: 'ECG Remark' },
                            { id: 'spirometry_result', label: 'Spirometry' },
                            { id: 'spirometry_remark', label: 'Spiro Remark' },
                            { id: 'audiometry_result', label: 'Audiometry' },
                            { id: 'audiometry_remark', label: 'Audio Remark' },
                            { id: 'weight', label: 'Weight (kg)' },
                            { id: 'height', label: 'Height (m)' }
                        ].map(f => (
                            <div key={f.id} className="space-y-1">
                                <Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1">{f.label}</Label>
                                <Input {...register(f.id)} className="h-9 text-sm" />
                            </div>
                        ))}
                    </div>
                </AccordionSection>

                <AccordionSection title="Medical Assessments" description="Clinical findings and diagnosis">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {[
                            { id: 'luts', label: 'LUTS (Y/N)' },
                            { id: 'chronic_cough', label: 'Chronic Cough' },
                            { id: 'chronic_chest_pain', label: 'Chest Pain' },
                            { id: 'chest_infection', label: 'Chest Infection' },
                            { id: 'heart_dx', label: 'Heart Disease' },
                            { id: 'palor', label: 'Palor' },
                            { id: 'jaundice', label: 'Jaundice' },
                            { id: 'murmur', label: 'Murmur' }
                        ].map(f => (
                            <RadioField 
                                key={f.id} 
                                name={f.id} 
                                control={control} 
                                label={f.label} 
                            />
                        ))}
                    </div>
                </AccordionSection>

                <AccordionSection title="Clinical Assessment" description="Physical examination results">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
                        <SelectField name="chest_status" control={control} label="Chest Status" options={['Clinically Clear', 'Not Clinically Clear']} />
                        <SelectField name="hs_status" control={control} label="HS: 1&2" options={['Present', 'S3 Present', 'S4 Present']} />
                        <SelectField name="breast_exam" control={control} label="Breast Exam" options={['Normal', 'Abnormal', 'Not Applicable']} />
                        <SelectField name="breast_remark" control={control} label="Breast Remark" options={['Normal', 'Not Applicable']} />
                        <SelectField name="abdomen" control={control} label="Abdomen" options={['Abnormal', 'Normal']} />
                    </div>
                </AccordionSection>

                <AccordionSection title="Final Review" description="Comprehensive medical assessment and comments" defaultOpen={true}>
                    <div className="space-y-6 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="md:col-span-1">
                                <SelectField name="dm_status" control={control} label="DM" options={['No', 'Yes - On Regular Medication', 'Yes - Not on Regular Medication', 'Yes - Not on Medication']} />
                            </div>
                            <div className="md:col-span-1">
                                <SelectField name="htn_status" control={control} label="HTN" options={['No', 'Yes - On Regular Medication', 'Yes - Not on Regular Medication', 'Yes - Not on Medication']} />
                            </div>
                            <div className="space-y-1"><Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1">B.P</Label><Input {...register('bp')} /></div>
                            <div className="space-y-1"><Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1">PULSE</Label><Input {...register('pulse')} /></div>
                            <div className="space-y-1"><Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1">SPO2%</Label><Input {...register('spo2')} /></div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-dashed">
                             <SelectField name="psa" control={control} label="PSA RESULT" options={['Negative', 'Not Applicable', 'Positive']} />
                             <SelectField name="psa_remark" control={control} label="PSA REMARK" options={['Normal', 'Abnormal', 'Not Applicable']} />
                             <ComboField {...register('fbs')} label="FBS" options={['Not Applicable']} />
                             <ComboField {...register('rbs')} label="RBS" options={['Not Applicable']} />
                             <SelectField name="fbs_rbs_remark" control={control} label="SUGAR REMARK" options={['Abnormal', 'Maybe Abnormal', 'Normal']} />
                             <SelectField name="ua_result" control={control} label="Urine Analysis" options={['Glycosuria', 'Glycosuria+', 'Glycosuria >+', 'No Abnormality', 'Proteinuria', 'Proteinuria+', 'Proteinuria >+', 'Proteinuria/Glycosuria']} />
                             <SelectField name="ua_remark" control={control} label="UA REMARK" options={['Abnormal', 'Maybe Abnormal', 'Normal']} />
                             <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1">Overall Lab Remark</Label>
                                <Input {...register('overall_lab_remark')} />
                             </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <SelectField name="assessment_hx_pe" control={control} label="Assessment Hx & PE" options={['Bladder Outlet Obstruction', 'Elevated BP', 'Known DM', 'Poorly Controlled HTN', 'Satisfactory']} />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <Label className="text-xs font-bold uppercase tracking-tight text-emerald-600 ml-1">Overall Assessment(s)</Label>
                                    <textarea {...register('overall_assessment')} className="w-full min-h-[120px] border-2 border-emerald-500/20 rounded-xl p-4 text-sm focus:ring-4 ring-emerald-500/10 bg-emerald-500/[0.02] outline-none font-black" placeholder="Final clinical summary..." />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1">Other Assessments</Label>
                                    <Input {...register('other_assessments')} placeholder="Secondary assessments..." />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1">Other Remarks</Label>
                                    <Input {...register('other_remarks')} placeholder="Miscellaneous notes..." />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-dashed">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-black text-rose-600 ml-1">Director Comment One</Label>
                                    <textarea {...register('comment_one')} className="w-full min-h-[80px] border-2 border-rose-200 rounded-xl p-3 text-sm focus:ring-4 ring-rose-500/10 outline-none font-medium" placeholder="First comment..." />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-black text-rose-600 ml-1">Director Comment Two</Label>
                                    <textarea {...register('comment_two')} className="w-full min-h-[80px] border-2 border-rose-200 rounded-xl p-3 text-sm focus:ring-4 ring-rose-500/10 outline-none font-medium" placeholder="Second comment..." />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-black text-rose-600 ml-1">Director Comment Three</Label>
                                    <textarea {...register('comment_three')} className="w-full min-h-[80px] border-2 border-rose-200 rounded-xl p-3 text-sm focus:ring-4 ring-rose-500/10 outline-none font-medium" placeholder="Third comment..." />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-black text-rose-600 ml-1">Director Comment Four</Label>
                                    <textarea {...register('comment_four')} className="w-full min-h-[80px] border-2 border-rose-200 rounded-xl p-3 text-sm focus:ring-4 ring-rose-500/10 outline-none font-medium" placeholder="Fourth comment..." />
                                </div>
                            </div>
                        </div>
                    </div>
                </AccordionSection>

                <div className="flex justify-end items-center gap-4 pt-6 border-t">
                    <Button 
                        type="button" 
                        variant="default"
                        size="lg" 
                        onClick={handleAIGenerate}
                        disabled={generatingAI || loading}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-lg shadow-xl shadow-blue-500/20 h-12 rounded-xl border-0"
                    >
                        {generatingAI ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="mr-2 h-5 w-5" />}
                        AI Overview
                    </Button>
                    
                    <Button type="submit" size="lg" className="px-12 font-black text-lg shadow-xl shadow-primary/20 h-12 rounded-xl" disabled={loading || generatingAI}>
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="mr-2 h-5 w-5" /> Submit Final Review</>}
                    </Button>
                </div>
            </form>
        </div>
    );
};

const DirectorPage: React.FC = () => {
    const { activeSection, activeYear } = useAppContext();
    const [patient, setPatient] = useState<any>(null);
    const [history, setHistory] = useState<any>(null);
    const [searching, setSearching] = useState(false);
    const [loading, setLoading] = useState(false);
    const selectPatient = (p: any) => {
        handleSearchWithId(p.staff_id);
    };

    const handleSearchWithId = async (id: string) => {
        if (!id) return;
        setPatient(null);
        setHistory(null);
        setSearching(true);
        try {
            const pRes = await axios.get(`http://localhost:5000/patient/${id}`, {
                headers: { 'X-Company-Context': activeSection }
            });
            setPatient(pRes.data);
            
            const hRes = await axios.get(`http://localhost:5000/api/director/get-patient-history/${id}?year=${activeYear}`, {
                headers: { 'X-Company-Context': activeSection }
            });
            setHistory(hRes.data);
            toast.success(`Records loaded for ${pRes.data.first_name}`);
        } catch (err) {
            toast.error("Records not found for this patient");
        } finally {
            setSearching(false);
        }
    };

    const handleSearch = () => {
        // This is primarily for the PatientSearch button
        // Wrapped because of naming or specific logic if needed
    };

    const handleSaveAll = async (data: any) => {
        setLoading(true);
        try {
            await axios.post('http://localhost:5000/api/director/save-director-review', {
                ...data,
                staff_id: patient.staff_id,
                screening_year: activeYear
            }, {
                headers: { 'X-Company-Context': activeSection }
            });
            toast.success("Director Review saved successfully!");
            handleSearch();
        } catch (err) {
            toast.error("Failed to save review");
        } finally {
            setLoading(false);
        }
    };

    return (
        <MainLayout>
            <div className="space-y-8 animate-in fade-in duration-500 pb-20">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card p-6 rounded-2xl border-2 shadow-xl border-primary/10 transition-all">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                            <ShieldCheck className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight">Director Review Panel</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-sm text-muted-foreground font-medium">Session: {activeYear} • {activeSection}</p>
                            </div>
                        </div>
                    </div>
                    
                    <PatientSearch
                        activeSection={activeSection}
                        onSelect={selectPatient}
                        onSearch={handleSearchWithId}
                        searching={searching}
                        themeColor="primary"
                        placeholder="Search Staff ID or Name..."
                    />
                </div>

                {!patient ? (
                    <div className="flex flex-col items-center justify-center h-[50vh] bg-muted/20 border-2 border-dashed rounded-3xl opacity-50">
                        <Activity className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
                        <p className="text-xl font-bold text-muted-foreground">Search for a patient to begin review</p>
                    </div>
                ) : (
                    <ReviewContent 
                        patient={patient} 
                        history={history} 
                        loading={loading} 
                        onSubmit={handleSaveAll} 
                        activeYear={activeYear}
                        activeSection={activeSection}
                    />
                )}
            </div>
        </MainLayout>
    );
};

export default DirectorPage;
