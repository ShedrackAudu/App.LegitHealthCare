import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useForm, Controller } from 'react-hook-form';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Activity01Icon, 
  FloppyDiskIcon, 
  Loading03Icon, 
  Clock01Icon, 
  ArrowDown01Icon,
  ArrowUp01Icon,
  Shield01Icon,
  SparklesIcon,
  UserIcon
} from '@hugeicons/core-free-icons';
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
    <div className="space-y-0.5 sm:space-y-1">
        <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/60 leading-none">{label}</p>
        <p className="font-black text-base sm:text-lg text-primary tracking-tight truncate leading-tight">{value}</p>
    </div>
);

const AccordionSection = ({ title, description, children, defaultOpen = true }: any) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <Card className="border-2 shadow-sm overflow-hidden transition-all duration-300">
            <div 
                className={`flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors ${isOpen ? 'bg-primary/5 border-b-2 border-primary/20' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl bg-background border shadow-sm">
                        {isOpen ? <HugeiconsIcon icon={ArrowUp01Icon} className="h-6 w-6" /> : <HugeiconsIcon icon={ArrowDown01Icon} className="h-6 w-6" />}
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

const SelectField = ({ label, options, name, control, required = true }: any) => (
  <div className="space-y-1.5 lg:col-span-1">
      <Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1 whitespace-nowrap truncate block">{label} {required && <span className="text-red-500">*</span>}</Label>
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

const ComboField = React.forwardRef(({ label, options, required = true, ...props }: any, ref: any) => (
  <div className="space-y-1.5 lg:col-span-1">
      <Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1 whitespace-nowrap truncate block">{label} {required && <span className="text-red-500">*</span>}</Label>
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
                    <HugeiconsIcon icon={ArrowDown01Icon} className="h-4 w-4 text-muted-foreground transition-transform group-hover:scale-110" />
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

const RadioField = ({ label, name, control, required = true }: any) => (
  <div className="space-y-2 lg:col-span-1">
    <Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1 whitespace-nowrap truncate block">{label} {required && <span className="text-red-500">*</span>}</Label>
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <RadioGroup
          onValueChange={field.onChange}
          value={field.value}
          className="flex flex-col sm:flex-row gap-2 sm:gap-4 p-2 sm:p-1 bg-muted/30 rounded-xl border-2 min-h-[2.75rem] sm:h-11 sm:items-center px-4 transition-all"
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
            ...history?.review,
            ...history?.consultation,
            ...history?.special,
            ...history?.fbc,
            ...history?.kft,
            ...history?.lipid,
            ...history?.lft
        }
    });

    const [generatingAI, setGeneratingAI] = useState(false);

    useEffect(() => {
        reset({
            ...history?.review,
            ...history?.consultation,
            ...history?.special,
            ...history?.fbc,
            ...history?.kft,
            ...history?.lipid,
            ...history?.lft
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

            // LDL: TCHO - (TRIGLYCERIDES(TG)/5 + HDL)
            if (name === 'total_cholesterol' || name === 'triglycerides' || name === 'hdl') {
                const tcho = parseFloat(value.total_cholesterol);
                const tg = parseFloat(value.triglycerides);
                const hdl = parseFloat(value.hdl);
                if (!isNaN(tcho) && !isNaN(tg) && !isNaN(hdl)) {
                    const ldl = tcho - ((tg / 5) + hdl);
                    setValue('ldl', ldl.toFixed(2));
                }
            }
        });
        return () => subscription.unsubscribe();
    }, [watch, setValue]);

    const handleAIGenerate = async () => {
        setGeneratingAI(true);
        try {
            const res = await axios.post('/api/ai/generate', {
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
            <Card className="border-2 border-primary/20 shadow-lg bg-primary/[0.02] overflow-hidden">
                <CardContent className="p-4 md:p-6 flex flex-col sm:flex-row items-center gap-6">
                    {/* Passport Avatar */}
                    <div className="w-16 h-16 rounded-xl border border-primary/20 overflow-hidden bg-card shrink-0 shadow-sm flex items-center justify-center">
                        {patient.passport_image ? (
                            <img 
                                src={patient.passport_image.startsWith('http') || patient.passport_image.startsWith('blob') || patient.passport_image.startsWith('data') ? patient.passport_image : `${(window as any).API_BASE_URL}${patient.passport_image}`} 
                                alt="Passport" 
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <HugeiconsIcon icon={UserIcon} className="h-8 w-8 text-primary/40" />
                        )}
                    </div>

                    {/* Bio Grid */}
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-x-3 gap-y-4 md:gap-x-4 lg:gap-4 w-full">
                        <div className="col-span-1 lg:col-span-2">
                            <BioItem label="FULL NAME" value={`${patient.first_name} ${patient.last_name}`} />
                        </div>
                        <BioItem label="STAFF ID" value={patient.staff_id} />
                        <BioItem label="PATIENT ID" value={patient.patient_id || 'N/A'} />
                        <BioItem label="AGE" value={`${patient.age} Yrs`} />
                        <BioItem label="GENDER" value={patient.gender || 'N/A'} />
                        <BioItem label="DEPARTMENT" value={patient.department} />
                        <div className="flex items-center justify-between col-span-full lg:col-span-2 border-t lg:border-t-0 lg:border-l pt-3 lg:pt-0 pl-0 lg:pl-4 border-muted mt-1 lg:mt-0">
                            <BioItem label="CONSULTED BY" value={history?.consultation?.consulted_by_name || 'N/A'} />
                            {history?.review?.first_submitted_at && (
                                <div className="flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20 shrink-0 ml-2">
                                    <HugeiconsIcon icon={Clock01Icon} className="h-3 w-3 text-primary" />
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
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                        {[
                            'PCV', 'WBC', 'PLT', 'HGB', 'RBC',
                            'LYMP_PERCENT', 'LYMP_ABS', 'MID_PERCENT', 'MID_ABS', 'GRA_PERCENT', 'GRA_ABS',
                            'MCV', 'MCH', 'MCHC', 'RDW', 'PDW',
                            'FBC_REMARK'
                        ].map(f => (
                            <div key={f} className={`space-y-1 ${f.includes('REMARK') ? 'lg:col-span-2' : ''}`}>
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap truncate block">{f.replace('_ABS', '').replace('_PERCENT', ' %').replace('_', ' ')} <span className="text-red-500">*</span></Label>
                                {f.includes('REMARK') ? (
                                    <Input {...register(f.toLowerCase(), { required: true })} className="h-9 text-sm" required />
                                ) : (
                                    <Input {...register(f.toLowerCase(), { required: true })} className="h-9 text-sm font-mono" required />
                                )}
                            </div>
                        ))}
                    </div>
                </AccordionSection>

                <AccordionSection title="Kidney Function Test" description="Potassium, Sodium, Chloride, and Calcium">
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                        {['POTASSIUM', 'SODIUM', 'CHLORIDE', 'HCO3', 'BICARBONATE_CA', 'KFT_REMARK'].map(f => {
                            const isOptional = ['BICARBONATE_CA', 'KFT_REMARK'].includes(f);
                            const displayName = f === 'BICARBONATE_CA' ? 'CALCIUM CA' : f.replace('_', ' ');
                            return (
                                <div key={f} className="space-y-1">
                                    <Label className="text-xs whitespace-nowrap truncate block">
                                        {displayName} {!isOptional && <span className="text-red-500">*</span>}
                                    </Label>
                                    <Input 
                                        {...register(f.toLowerCase(), isOptional ? {} : { required: true })} 
                                        className="h-9 text-sm font-mono" 
                                        required={!isOptional} 
                                    />
                                </div>
                            );
                        })}
                    </div>
                </AccordionSection>

                <AccordionSection title="Lipid Profile Test" description="Cholesterol, HDL, and LDL levels">
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {['TOTAL_CHOLESTEROL', 'TRIGLYCERIDES', 'HDL', 'LDL', 'LP_REMARK'].map(f => (
                            <div key={f} className="space-y-1">
                                <Label className="text-xs whitespace-nowrap truncate block">{f.replace('_', ' ')} <span className="text-red-500">*</span></Label>
                                <Input {...register(f.toLowerCase(), { required: true })} className="h-9 text-sm" required />
                            </div>
                        ))}
                    </div>
                </AccordionSection>

                <AccordionSection title="Liver Function Test" description="AST, ALT, ALP, Bilirubin, Urea, and Creatinine">
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                        {['AST', 'ALT', 'ALP', 'TB', 'CB', 'UREA', 'CREATININE', 'LFT_REMARK'].map(f => (
                            <div key={f} className="space-y-1">
                                <Label className="text-xs whitespace-nowrap truncate block">{f.replace('_', ' ')} <span className="text-red-500">*</span></Label>
                                <Input {...register(f.toLowerCase(), { required: true })} className="h-9 text-sm" required />
                            </div>
                        ))}
                    </div>
                </AccordionSection>

                <AccordionSection title="Special Diagnostic Tests" description="ECG, Spirometry, Audiometry, and Vitals">
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
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
                                <Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1">{f.label} <span className="text-red-500">*</span></Label>
                                <Input {...register(f.id, { required: true })} className="h-9 text-sm" required />
                            </div>
                        ))}
                    </div>
                </AccordionSection>

                <AccordionSection title="Medical Assessments" description="Clinical findings and diagnosis">
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
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
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-4">
                        <SelectField name="chest_status" control={control} label="Chest Status" options={['Clinically Clear', 'Not Clinically Clear']} />
                        <SelectField name="hs_status" control={control} label="HS: 1&2" options={['Present', 'S3 Present', 'S4 Present']} />
                        <SelectField name="breast_exam" control={control} label="Breast Exam" options={['Normal', 'Abnormal', 'Not Applicable']} />
                        <SelectField name="breast_remark" control={control} label="Breast Remark" options={['Normal', 'Not Applicable']} />
                        <div className="space-y-1">
                            <Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1">Breast Others</Label>
                            <Input {...register('breast_others')} placeholder="Specify if others..." className="h-10 border rounded-md font-semibold" />
                        </div>
                        <SelectField name="abdomen" control={control} label="Abdomen" options={['Abnormal', 'Normal']} />
                        <div className="space-y-1">
                            <Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1">Abdomen Others</Label>
                            <Input {...register('abdomen_others')} placeholder="Specify if others..." className="h-10 border rounded-md font-semibold" />
                        </div>
                    </div>
                </AccordionSection>

                <AccordionSection title="Final Review" description="Comprehensive medical assessment and comments" defaultOpen={true}>
                    <div className="space-y-6 p-4">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="md:col-span-1">
                                <SelectField name="dm_status" control={control} label="DM" options={['No', 'Yes - On Regular Medication', 'Yes - Not on Regular Medication', 'Yes - Not on Medication']} />
                            </div>
                            <div className="md:col-span-1">
                                <SelectField name="htn_status" control={control} label="HTN" options={['No', 'Yes - On Regular Medication', 'Yes - Not on Regular Medication', 'Yes - Not on Medication']} />
                            </div>
                            <div className="space-y-1"><Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1">B.P (mm/Hg) <span className="text-red-500">*</span></Label><Input {...register('bp', { required: true })} required /></div>
                            <div className="space-y-1"><Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1">PULSE (b/m) <span className="text-red-500">*</span></Label><Input {...register('pulse', { required: true })} required /></div>
                            <div className="space-y-1"><Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1">SPO2 (%) <span className="text-red-500">*</span></Label><Input {...register('spo2', { required: true })} required /></div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-dashed">
                             <SelectField name="psa" control={control} label="PSA RESULT" options={['Negative', 'Not Applicable', 'Positive']} />
                             <SelectField name="psa_remark" control={control} label="PSA REMARK" options={['Normal', 'Abnormal', 'Not Applicable']} />
                             <ComboField {...register('fbs')} label="FBS" options={['Not Applicable']} />
                             <ComboField {...register('rbs')} label="RBS" options={['Not Applicable']} />
                             <SelectField name="sugar_remark" control={control} label="FBS/RBS REMARK" options={['Abnormal', 'Maybe Abnormal', 'Normal']} />
                             <SelectField name="ua_result" control={control} label="Urine Analysis" options={['Glycosuria', 'Glycosuria+', 'Glycosuria >+', 'No Abnormality', 'Proteinuria', 'Proteinuria+', 'Proteinuria >+', 'Proteinuria/Glycosuria']} />
                             <SelectField name="ua_remark" control={control} label="UA REMARK" options={['Abnormal', 'Maybe Abnormal', 'Normal']} />
                             <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1">U/A Remark Others</Label>
                                <Input {...register('ua_remark_others')} placeholder="Specify if others..." className="h-10 border rounded-md font-semibold" />
                             </div>
                             <SelectField name="assessment_hx_pe" control={control} label="Assessment Hx & PE" options={['Bladder Outlet Obstruction', 'Elevated BP', 'Known DM', 'Inadequately controlled hypertension', 'Satisfactory']} />
                             <div className="space-y-1 col-span-full lg:col-span-4">
                                <Label className="text-xs font-bold uppercase tracking-tight text-primary ml-1">Overall Lab Remark <span className="text-red-500">*</span></Label>
                                <textarea {...register('overall_lab_remark', { required: true })} className="w-full min-h-[80px] border-2 border-primary/10 rounded-xl p-3 text-sm focus:ring-4 ring-primary/10 bg-primary/[0.01] outline-none" placeholder="Enter comprehensive lab findings..." required />
                             </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1">Other Assessments</Label>
                                    <Input {...register('other_assessments')} placeholder="Secondary assessments..." />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold uppercase tracking-tight text-muted-foreground ml-1">Other Remarks</Label>
                                    <Input {...register('other_remarks')} placeholder="Miscellaneous notes..." />
                                </div>
                                <div className="space-y-1 col-span-full">
                                    <Label className="text-xs font-bold uppercase tracking-tight text-primary ml-1">Overall Assessment(s)</Label>
                                    <textarea {...register('overall_assessment')} className="w-full min-h-[120px] border-2 border-primary/20 rounded-xl p-4 text-sm focus:ring-4 ring-primary/10 bg-primary/[0.02] outline-none font-black" placeholder="Final clinical summary..." />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-2 gap-4 pt-4 border-t border-dashed">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-black text-rose-600 ml-1">Comment One <span className="text-red-500">*</span></Label>
                                    <textarea {...register('comment_one', { required: true })} className="w-full min-h-[80px] border-2 border-rose-200 rounded-xl p-3 text-sm focus:ring-4 ring-rose-500/10 outline-none font-medium" placeholder="First comment..." required />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-black text-rose-600 ml-1">Comment Two <span className="text-red-500">*</span></Label>
                                    <textarea {...register('comment_two', { required: true })} className="w-full min-h-[80px] border-2 border-rose-200 rounded-xl p-3 text-sm focus:ring-4 ring-rose-500/10 outline-none font-medium" placeholder="Second comment..." required />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-black text-rose-600 ml-1">Comment Three <span className="text-red-500">*</span></Label>
                                    <textarea {...register('comment_three', { required: true })} className="w-full min-h-[80px] border-2 border-rose-200 rounded-xl p-3 text-sm focus:ring-4 ring-rose-500/10 outline-none font-medium" placeholder="Third comment..." required />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-black text-rose-600 ml-1">Comment Four <span className="text-red-500">*</span></Label>
                                    <textarea {...register('comment_four', { required: true })} className="w-full min-h-[80px] border-2 border-rose-200 rounded-xl p-3 text-sm focus:ring-4 ring-rose-500/10 outline-none font-medium" placeholder="Fourth comment..." required />
                                </div>
                            </div>
                        </div>
                    </div>
                </AccordionSection>

                <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3 sm:gap-4 pt-6 border-t">
                    <Button 
                        type="button" 
                        variant="default"
                        size="lg" 
                        onClick={handleAIGenerate}
                        loading={generatingAI}
                        disabled={loading}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-lg shadow-xl shadow-blue-500/20 h-12 rounded-xl border-0 w-full sm:w-auto order-2 sm:order-1"
                    >
                        {!generatingAI && (
                            <div className="flex items-center justify-center whitespace-nowrap">
                                <HugeiconsIcon icon={SparklesIcon} className="mr-2 h-5 w-5 shrink-0" /> AI Overview
                            </div>
                        )}
                    </Button>
                    
                    <Button type="submit" size="lg" loading={loading} className="w-full sm:w-auto px-12 font-black text-lg shadow-xl shadow-primary/20 h-12 rounded-xl order-1 sm:order-2" disabled={generatingAI}>
                        {!loading && (
                            <div className="flex items-center justify-center whitespace-nowrap">
                                <HugeiconsIcon icon={FloppyDiskIcon} className="mr-2 h-5 w-5 shrink-0" /> Submit Final Review
                            </div>
                        )}
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
        handleSearchWithId(p.staff_id, 'general');
    };

    const handleSearchWithId = async (id: string, searchType?: 'pid' | 'general') => {
        if (!id) return;
        setPatient(null);
        setHistory(null);
        setSearching(true);
        try {
            const pRes = await axios.get(`/patient/${id}?year=${activeYear}&strict=true&search_type=${searchType || 'general'}`, {
                headers: { 'X-Company-Context': activeSection }
            });
            setPatient(pRes.data);
            
            const hRes = await axios.get(`/api/director/get-patient-history/${id}?year=${activeYear}`, {
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
            await axios.post('/api/director/save-director-review', {
                ...data,
                staff_id: patient.staff_id,
                screening_year: activeYear
            }, {
                headers: { 'X-Company-Context': activeSection }
            });
            toast.success("Director Review saved successfully!");
            setPatient(null);
            setHistory(null);
        } catch (err) {
            toast.error("Failed to save review");
        } finally {
            setLoading(false);
        }
    };

    return (
        <MainLayout noScroll={!!patient}>
            <div className={`animate-in fade-in duration-500 ${patient ? 'flex-1 flex flex-col overflow-hidden min-h-0 h-full gap-6 pb-0' : 'space-y-8 pb-20'}`}>
                <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 sm:gap-6 bg-card p-4 sm:p-6 rounded-2xl border transition-all shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl">
                            <HugeiconsIcon icon={Shield01Icon} className="h-5 w-5 sm:h-8 sm:w-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-2xl font-black tracking-tight">Director Review Panel</h1>
                            <p className="text-[9px] sm:text-sm text-muted-foreground font-medium">Session: {activeYear} • {activeSection}</p>
                        </div>
                    </div>
                    
                    <PatientSearch
                        activeSection={activeSection}
                        onSelect={selectPatient}
                        onSearch={handleSearchWithId}
                        searching={searching}
                        themeColor="primary"
                        placeholder="Search Staff ID or Name..."
                        year={activeYear}
                        strict={true}
                        showPidToggle={true}
                    />
                </div>

                {!patient ? (
                    <Card className="border-2 border-dashed flex items-center justify-center min-h-[20rem] bg-muted/5 mt-8 p-6">
                        <div className="text-center space-y-3">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4 transition-transform hover:scale-110 duration-300">
                                <HugeiconsIcon icon={Activity01Icon} className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground/50" />
                            </div>
                            <p className="text-muted-foreground font-bold text-base sm:text-lg italic px-4 leading-snug">
                                Search for a patient to begin clinical review.
                            </p>
                            <div className="flex flex-col items-center gap-1 sm:gap-2">
                                <div className="h-px w-8 bg-muted-foreground/20" />
                                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black">
                                    Context: {activeSection} Clinic • {activeYear}
                                </p>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10">
                        <ReviewContent 
                            patient={patient} 
                            history={history} 
                            loading={loading} 
                            onSubmit={handleSaveAll} 
                            activeYear={activeYear}
                            activeSection={activeSection}
                        />
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default DirectorPage;
