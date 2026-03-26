import React, { useState, useEffect } from 'react';
import { 
  Search, 
  FileText, 
  Download, 
  Mail, 
  Loader2,
  ChevronRight,
  Activity,
  Printer,
  X
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/context/AppContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import '@/styles/PatientReport.css';

const PatientReportPage: React.FC = () => {
    const { activeSection, activeYear } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (searchTerm.length > 1) {
            const fetchResults = async () => {
                setSearching(true);
                try {
                    const res = await axios.get(`http://localhost:5000/api/patients/search?q=${searchTerm}`, {
                        headers: { 'X-Company-Context': activeSection }
                    });
                    setSearchResults(res.data);
                } catch (err) {
                    console.error(err);
                } finally {
                    setSearching(false);
                }
            };
            const timer = setTimeout(fetchResults, 300);
            return () => clearTimeout(timer);
        } else {
            setSearchResults([]);
        }
    }, [searchTerm, activeSection]);

    const handleSelectPatient = async (patient: any) => {
        setLoading(true);
        setSelectedPatient(patient);
        setSearchTerm(patient.staff_id);
        setSearchResults([]);
        try {
            const res = await axios.get(`http://localhost:5000/api/patient-report/${patient.staff_id}/${activeYear}`, {
                headers: { 'X-Company-Context': activeSection }
            });
            setReportData(res.data);
            toast.success("Report generated successfully");
        } catch (err) {
            toast.error("Failed to load clinical data for the selected year");
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleRetrieve = () => {
        if (searchResults.length > 0) {
            handleSelectPatient(searchResults[0]);
        } else if (searchTerm) {
            // Try searching directly by staff_id if no results in dropdown
            const fetchSpecific = async () => {
                setLoading(true);
                try {
                    const pRes = await axios.get(`http://localhost:5000/patient/${searchTerm}`, {
                        headers: { 'X-Company-Context': activeSection }
                    });
                    if (pRes.data) handleSelectPatient(pRes.data);
                } catch (err) {
                    toast.error("Patient not found");
                } finally {
                    setLoading(false);
                }
            };
            fetchSpecific();
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleSendEmail = async () => {
        if (!reportData?.bio?.email && !selectedPatient?.email) {
            toast.error("Patient email not found in records.");
            return;
        }
        
        const email = reportData?.bio?.email || selectedPatient?.email;
        const toastId = toast.loading(`Sending report to ${email}...`);
        
        try {
            await axios.post('http://localhost:5000/api/email/report', {
                email: email,
                report_data: reportData
            });
            toast.success("Medical report emailed successfully!", { id: toastId });
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to send email", { id: toastId });
        }
    };

    const handleDownloadPDF = async () => {
        const toastId = toast.loading("Generating PDF...");
        try {
            const response = await axios.post('http://localhost:5000/api/email/download-report', {
                report_data: reportData
            }, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const filename = `Medical_Report_${selectedPatient.staff_id}_${activeYear}.pdf`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Report downloaded!", { id: toastId });
        } catch (err) {
            toast.error("Failed to generate PDF download", { id: toastId });
        }
    };

    return (
        <MainLayout>
            <div className="space-y-8 animate-in fade-in duration-500 pb-20 no-print">
                {/* Unified Search Header style matching Consultation */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card p-6 rounded-2xl border-2 shadow-xl border-primary/10 transition-all">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                            <FileText className="text-primary h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight">Patient Medical Report</h1>
                            <p className="text-sm text-muted-foreground font-medium">Session: {activeYear} • {activeSection}</p>
                        </div>
                    </div>
                    
                    <div className="flex w-full lg:w-auto items-center gap-3 bg-muted/30 p-2 rounded-xl border-2 focus-within:border-primary/50 transition-all relative">
                        <Search className="ml-2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            placeholder="Search Numeric Staff ID..." 
                            className="border-0 bg-transparent focus-visible:ring-0 min-w-[300px] text-lg font-bold"
                            value={searchTerm}
                            inputMode="numeric"
                            onChange={(e) => setSearchTerm(e.target.value.replace(/\D/g, ''))}
                            onKeyDown={(e) => e.key === 'Enter' && handleRetrieve()}
                        />
                        <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg px-8 whitespace-nowrap font-bold" onClick={handleRetrieve} disabled={loading}>
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Retrieve Report'}
                        </Button>

                        {/* Dropdown Results */}
                        {searchResults.length > 0 && (
                            <Card className="absolute top-full left-0 right-0 mt-4 border-2 shadow-2xl rounded-2xl overflow-hidden z-50 animate-in slide-in-from-top-4 duration-300">
                                <CardContent className="p-0 max-h-[300px] overflow-y-auto">
                                    {searchResults.map((p) => (
                                        <div 
                                            key={p.staff_id}
                                            onClick={() => handleSelectPatient(p)}
                                            className="p-4 hover:bg-primary/5 cursor-pointer flex items-center justify-between group transition-colors border-b last:border-0"
                                        >
                                            <div className="flex items-center gap-4 text-left">
                                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black uppercase shadow-inner text-sm">
                                                    {p.first_name[0]}{p.last_name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm tracking-tight leading-none mb-1">{p.first_name} {p.last_name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-[9px] uppercase font-black px-1 h-4">{p.staff_id}</Badge>
                                                        <span className="text-[10px] text-muted-foreground font-medium">{p.department}</span>
                                                        {p.email && <span className="text-[10px] text-primary/70 font-bold ml-1">{p.email}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Report View State */}
                {selectedPatient && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
                        {/* Control Bar */}
                        <div className="flex items-center justify-between bg-card p-4 rounded-2xl border-2 shadow-lg sticky top-20 z-10 backdrop-blur-md bg-card/90">
                            <div className="flex items-center gap-4">
                                <Button 
                                    variant="outline" 
                                    className="rounded-xl border-2 font-bold"
                                    onClick={() => {
                                        setSelectedPatient(null);
                                        setReportData(null);
                                        setSearchTerm('');
                                    }}
                                >
                                    <X className="mr-2 h-4 w-4" /> Close Report
                                </Button>
                                <div className="h-6 w-px bg-border hidden sm:block" />
                                <div className="hidden sm:flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-xs uppercase">
                                        {selectedPatient.first_name[0]}{selectedPatient.last_name[0]}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold leading-none">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{selectedPatient.staff_id}</p>
                                            {(reportData?.bio?.email || selectedPatient?.email) && (
                                                <span className="text-[10px] text-primary font-bold">
                                                    • {reportData?.bio?.email || selectedPatient.email}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <Button variant="outline" className="rounded-xl border-2 font-bold hidden md:flex" onClick={handlePrint}>
                                    <Printer className="mr-2 h-4 w-4" /> Print Preview
                                </Button>
                                <Button 
                                    className="rounded-xl shadow-lg shadow-primary/20 font-bold px-6 border-2 border-primary"
                                    onClick={handleDownloadPDF}
                                >
                                    <Download className="mr-2 h-4 w-4" /> Download PDF
                                </Button>
                                <Button 
                                    variant="secondary" 
                                    className="rounded-xl font-bold px-6 border-2 border-secondary"
                                    onClick={handleSendEmail}
                                >
                                    <Mail className="mr-2 h-4 w-4" /> Send Email
                                </Button>
                            </div>
                        </div>

                        {/* A4 Report View */}
                        {loading ? (
                             <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs">Generating Report Pages...</p>
                            </div>
                        ) : reportData ? (
                            <div className="flex flex-col items-center gap-8 py-8 px-4 overflow-x-auto print-container">
                                {/* Page 1 */}
                                <Card className="a4-page bg-white text-black shadow-2xl p-[20mm] relative overflow-hidden border-0">
                                    <ReportHeader />
                                    
                                    <div className="mt-12 space-y-10">
                                        <ReportSection title="Bio-Data & Identification" className="border-l-4 border-primary pl-6">
                                            <div className="grid grid-cols-2 gap-y-4 text-sm font-medium">
                                                <KV label="Staff ID" value={reportData.bio.staff_id} />
                                                <KV label="Full Name" value={reportData.bio.full_name} capitalize />
                                                <KV label="Age" value={`${reportData.bio.age} Years`} />
                                                <KV label="Gender" value={reportData.bio.gender} />
                                                <KV label="Department" value={reportData.bio.department} />
                                                <KV label="Screening Year" value={reportData.bio.screening_year} />
                                            </div>
                                        </ReportSection>

                                        <ReportSection title="Consultation & Vitals">
                                            <div className="grid grid-cols-3 gap-6">
                                                <VitalBox label="B.P" value={reportData.results.consultation?.bp || 'N/A'} sub="mmHg" />
                                                <VitalBox label="Pulse" value={reportData.results.consultation?.pulse || 'N/A'} sub="b/m" />
                                                <VitalBox label="SPO2%" value={reportData.results.consultation?.spo2 || 'N/A'} sub="Saturation" />
                                            </div>
                                            <div className="mt-6 p-4 bg-muted/20 rounded-xl space-y-2">
                                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Clinical Assessment</p>
                                                <p className="text-sm font-medium leading-relaxed italic">{reportData.results.consultation?.assessment || 'No clinical assessment notes recorded for this period.'}</p>
                                            </div>
                                        </ReportSection>

                                        <ReportSection title="Full Blood Count (Hematology)">
                                            <div className="border border-border rounded-xl overflow-hidden">
                                                <table className="w-full text-xs text-left">
                                                    <thead className="bg-muted/50 border-b">
                                                        <tr>
                                                            <th className="p-3 font-bold">Parameter</th>
                                                            <th className="p-3 font-bold text-center">Value</th>
                                                            <th className="p-3 font-bold">Reference Range</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y">
                                                        <TestRow label="PCV" value={reportData.results.fbc?.pcv} range="37 - 54%" />
                                                        <TestRow label="WBC" value={reportData.results.fbc?.wbc} range="4.0 - 10.0 x10^9/L" />
                                                        <TestRow label="HGB" value={reportData.results.fbc?.hgb} range="12.0 - 18.0 g/dL" />
                                                        <TestRow label="RBC" value={reportData.results.fbc?.rbc} range="4.00 - 6.00 x10^12/L" />
                                                        <TestRow label="PLT" value={reportData.results.fbc?.plt} range="150 - 450 x10^9/L" />
                                                    </tbody>
                                                </table>
                                            </div>
                                        </ReportSection>
                                    </div>

                                    <div className="absolute bottom-10 left-10 right-10 flex justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest border-t pt-4">
                                        <span>Legit HealthCare Medical Records</span>
                                        <span>Page 1 / 2</span>
                                    </div>
                                </Card>

                                {/* Page 2 */}
                                <Card className="a4-page bg-white text-black shadow-2xl p-[20mm] relative border-0">
                                    <ReportHeader />

                                    <div className="mt-12 space-y-10">
                                        <div className="grid grid-cols-2 gap-8">
                                            <ReportSection title="Kidney Function (KFT)">
                                                <div className="border rounded-xl overflow-hidden">
                                                    <table className="w-full text-[11px]">
                                                        <thead className="bg-muted/30 border-b">
                                                            <tr><th className="p-2 text-left">Test</th><th className="p-2 text-right">Result</th></tr>
                                                        </thead>
                                                        <tbody className="divide-y">
                                                            <tr><td className="p-2">Potassium</td><td className="p-2 text-right font-bold">{reportData.results.kft?.potassium || '-'}</td></tr>
                                                            <tr><td className="p-2">Urea</td><td className="p-2 text-right font-bold">{reportData.results.kft?.urea || '-'}</td></tr>
                                                            <tr><td className="p-2">Creatinine</td><td className="p-2 text-right font-bold">{reportData.results.kft?.creatinine || '-'}</td></tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </ReportSection>

                                            <ReportSection title="Liver Function (LFT)">
                                                <div className="border rounded-xl overflow-hidden">
                                                    <table className="w-full text-[11px]">
                                                        <thead className="bg-muted/30 border-b">
                                                            <tr><th className="p-2 text-left">Test</th><th className="p-2 text-right">Result</th></tr>
                                                        </thead>
                                                        <tbody className="divide-y">
                                                            <tr><td className="p-2">AST</td><td className="p-2 text-right font-bold">{reportData.results.lft?.ast || '-'}</td></tr>
                                                            <tr><td className="p-2">ALT</td><td className="p-2 text-right font-bold">{reportData.results.lft?.alt || '-'}</td></tr>
                                                            <tr><td className="p-2">ALP</td><td className="p-2 text-right font-bold">{reportData.results.lft?.alp || '-'}</td></tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </ReportSection>
                                        </div>

                                        <ReportSection title="Lipid Profile">
                                            <div className="grid grid-cols-4 gap-4">
                                                <MiniBox label="Total CHOL" value={reportData.results.lipid?.tcho} />
                                                <MiniBox label="TG" value={reportData.results.lipid?.tg} />
                                                <MiniBox label="HDL" value={reportData.results.lipid?.hdl} />
                                                <MiniBox label="LDL" value={reportData.results.lipid?.ldl} />
                                            </div>
                                        </ReportSection>

                                        <ReportSection title="Director Review & Verdict">
                                            <div className="p-6 border-2 border-primary/20 rounded-2xl bg-primary/5 space-y-4">
                                                <p className="text-sm font-medium leading-relaxed">{reportData.results.director?.assessment || 'Final medical assessment pending director verification.'}</p>
                                                <div className="flex justify-end pt-10">
                                                    <div className="text-center">
                                                        <div className="h-px w-48 bg-black mb-1" />
                                                        <p className="text-xs font-black uppercase tracking-tighter">Medical Director Signature</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </ReportSection>
                                    </div>

                                    <div className="absolute bottom-10 left-10 right-10 flex justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest border-t pt-4">
                                        <span>Legit HealthCare Medical Records</span>
                                        <span>Page 2 / 2</span>
                                    </div>
                                </Card>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed">
                                <Activity className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
                                <p className="text-muted-foreground font-bold">No diagnostic data found for this patient in {activeYear}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Initial View Placeholder */}
                {!selectedPatient && !searching && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20">
                        <FileText className="h-32 w-32 mb-4" />
                        <h2 className="text-2xl font-black">Search a patient to view report</h2>
                    </div>
                )}
            </div>

        </MainLayout>
    );
};

const ReportHeader = () => (
    <div className="report-header">
        <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-black flex items-center justify-center text-white rounded-xl">
                <Activity className="h-8 w-8" />
            </div>
            <div>
                <h1 className="text-2xl font-black tracking-tighter leading-none text-black">LEGIT HEALTHCARE</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 text-black">Staff Screening Program</p>
            </div>
        </div>
        <div className="text-right">
            <p className="text-[10px] font-black uppercase text-muted-foreground">Generated Date</p>
            <p className="text-xs font-bold text-black">{new Date().toLocaleDateString('en-GB')}</p>
        </div>
    </div>
);

const ReportSection = ({ title, children, className }: any) => (
    <div className={`space-y-4 ${className}`}>
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-black border-b border-black/10 pb-1 w-fit">{title}</h3>
        {children}
    </div>
);

const KV = ({ label, value, capitalize }: any) => (
    <div className="flex flex-col">
        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-0.5">{label}</span>
        <span className={`text-sm font-bold text-black ${capitalize ? 'capitalize' : ''}`}>{value || '-'}</span>
    </div>
);

const VitalBox = ({ label, value, sub }: any) => (
    <div className="p-3 border rounded-xl bg-muted/5">
        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-tight mb-1">{label}</p>
        <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-primary">{value}</span>
            <span className="text-[10px] font-bold text-muted-foreground">{sub}</span>
        </div>
    </div>
);

const MiniBox = ({ label, value }: any) => (
    <div className="p-2 border rounded-lg text-center">
        <p className="text-[8px] font-black uppercase text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-bold text-black">{value || '-'}</p>
    </div>
);

const TestRow = ({ label, value, range }: any) => (
    <tr className="hover:bg-muted/5 transition-colors">
        <td className="p-3 font-bold border-r text-black">{label}</td>
        <td className="p-3 text-center font-black text-primary">{value || '-'}</td>
        <td className="p-3 text-muted-foreground text-[10px]">{range}</td>
    </tr>
);

export default PatientReportPage;
