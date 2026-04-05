import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Mail, 
  Loader2, 
  X, 
  Printer,
  Calendar,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { PatientLayout } from '@/components/layout/PatientLayout';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAppContext } from '@/context/AppContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import '@/styles/PatientReport.css';

const PatientMedicalReport: React.FC = () => {
    const { user } = useAppContext();
    const [availableYears, setAvailableYears] = useState<string[]>([]);
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [fetchingYears, setFetchingYears] = useState(true);

    useEffect(() => {
        const fetchYears = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/patient/reports/years', {
                    headers: { 'X-Staff-ID': user?.username }
                });
                setAvailableYears(res.data);
                if (res.data.length > 0) {
                    setSelectedYear(res.data[0]);
                }
            } catch (err) {
                console.error("Error fetching years:", err);
                toast.error("Failed to load screening history");
            } finally {
                setFetchingYears(false);
            }
        };
        if (user?.username) fetchYears();
    }, [user]);

    const handleGenerateReport = async () => {
        if (!selectedYear) {
            toast.error("Please select a year");
            return;
        }

        setLoading(true);
        try {
            // Fetch profile first to get nationality/section if needed
            const profileRes = await axios.get('http://localhost:5000/api/patient/profile', {
                headers: { 'X-Staff-ID': user?.username }
            });
            
            // Try DCP then DCT as fallback logic for context
            let res;
            try {
                res = await axios.get(`http://localhost:5000/api/patient-report/${user?.username}/${selectedYear}`, {
                    headers: { 'X-Company-Context': 'DCP' }
                });
            } catch (err) {
                res = await axios.get(`http://localhost:5000/api/patient-report/${user?.username}/${selectedYear}`, {
                    headers: { 'X-Company-Context': 'DCT' }
                });
            }

            setReportData(res.data);
            toast.success(`Report for ${selectedYear} generated!`);
        } catch (err) {
            toast.error("Clinical data not found for the selected year");
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => window.print();

    const generateFrontendPDF = async (): Promise<Blob> => {
        const pages = document.querySelectorAll('.a4-page');
        if (pages.length === 0) throw new Error("Report pages not found in DOM");

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < pages.length; i++) {
            const pageEl = pages[i] as HTMLElement;
            // Force true dimensions to prevent viewport clipping on small screens
            const width = pageEl.scrollWidth;
            const height = pageEl.scrollHeight;

            const imgData = await toPng(pageEl, { 
                cacheBust: true, 
                pixelRatio: 2,
                width: width,
                height: height,
                style: { margin: '0' }
            });

            if (i > 0) pdf.addPage();
            
            // Maintain aspect ratio to prevent any squashing/stretching
            const imgProps = pdf.getImageProperties(imgData);
            const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height);
            const calcWidth = imgProps.width * ratio;
            const calcHeight = imgProps.height * ratio;
            const x = (pdfWidth - calcWidth) / 2;
            const y = (pdfHeight - calcHeight) / 2;

            pdf.addImage(imgData, 'PNG', x, y, calcWidth, calcHeight);
        }
        
        return pdf.output('blob');
    };

    const getDownloadFilename = () => {
        const pId = reportData?.bio?.patient_id || 'UNKNOWN';
        const dpt = reportData?.bio?.department?.replace(/\s+/g, '') || 'Dept';
        const sId = user?.username || reportData?.bio?.staff_id || 'UNKNOWN';
        const sec = reportData?.bio?.section || 'DCP';
        return `LHCSL${selectedYear}${sec}${pId}_${dpt}_${sId}.pdf`;
    };

    const handleDownloadPDF = async () => {
        if (!reportData) return;
        toast.loading('Generating PDF (Pixel-Perfect)...', { id: 'pdfGen' });
        try {
            const pdfBlob = await generateFrontendPDF();
            const url = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = getDownloadFilename();
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('PDF Downloaded successfully', { id: 'pdfGen' });
        } catch (err: any) {
            console.error('PDF error:', err);
            const msg = err.message || String(err) || 'Failed to generate frontend PDF.';
            toast.error(`Error: ${msg}`, { id: 'pdfGen' });
        }
    };

    const handleEmailReport = async () => {
        if (!reportData) return;
        toast.loading('Capturing layout and emailing report...', { id: 'emailSend' });
        try {
            const pdfBlob = await generateFrontendPDF();

            // Convert Base64 helper
            const blobToBase64 = (b: Blob): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const res = reader.result as string;
                        // Strip data:application/pdf;base64,
                        const b64 = res.split(',')[1];
                        resolve(b64);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(b);
                });
            };

            const b64data = await blobToBase64(pdfBlob);

            const pEmail = reportData.bio?.email || user?.email || '';
            const sec = reportData.bio?.section || 'DCP';
            let companyName = 'Legit HealthCare';
            if (sec === 'DCT') companyName = 'Dangote Cement Transport';
            if (sec === 'DCP') companyName = 'Dangote Cement Plant';

            const payloadData = {
                attachment_data: b64data,
                attachment_filename: getDownloadFilename(),
                email: pEmail,
                first_name: reportData.bio?.first_name || 'Patient',
                screening_year: selectedYear,
                company: companyName,
                department: reportData.bio?.department || 'NA',
                staff_id: user?.username || 'UNKNOWN',
                origin: 'frontend'
            };

            await axios.post('http://localhost:5000/api/email/report', payloadData);
            toast.success('Report successfully emailed to your address!', { id: 'emailSend' });
        } catch (err: any) {
            console.error('Email error:', err);
            const msg = err.response?.data?.error || 'Failed to send email. Check SMTP settings.';
            toast.error(msg, { id: 'emailSend' });
        }
    };

    // VERBATIM FORMATTER HELPERS FROM STAFF PORTAL
    const fTime = (dStr: string | undefined | null) => {
        if (!dStr) return "-";
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return "-";
        const t = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
        const day = d.getDate();
        const m = d.toLocaleString('en-US', { month: 'long' });
        const y = d.getFullYear();
        return `${t} - ${day} ${m} ${y}`;
    };

    const mkName = (f: string, m: string | null, l: string) => {
        let name = f;
        if (m && m.length > 0) name += ` ${m.charAt(0)}.`;
        name += ` ${l}`;
        return name;
    };

    const fmtSec = (s: string) => {
        const u = (s || '').toUpperCase();
        if (u === 'DCP') return 'PLANT';
        if (u === 'DCT') return 'TRANSPORT';
        return u;
    };

    const mkRef = (y: string | number, sec: string, pid: string) => {
        if (!y || !sec || !pid) return "-";
        return `${y}/${(sec || '').toUpperCase()}/${pid}`;
    };

    return (
        <PatientLayout>
            <div className="space-y-8 animate-in fade-in duration-700">
                <div className="no-print space-y-8">
                {/* Header Selector Card */}
                <Card className="border-2 shadow-2xl rounded-[2.5rem] overflow-hidden bg-card/50 backdrop-blur-md">
                    <CardHeader className="p-8 md:p-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-primary/10 rounded-3xl text-primary">
                                    <FileText className="h-8 w-8" />
                                </div>
                                <div>
                                    <CardTitle className="text-3xl font-black tracking-tight">Your Medical Reports</CardTitle>
                                    <CardDescription className="text-base font-medium">Select a screening year to view your detailed diagnostic results.</CardDescription>
                                </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                                <div className="w-full sm:w-48">
                                    <Select value={selectedYear} onValueChange={setSelectedYear} disabled={fetchingYears || loading}>
                                        <SelectTrigger className="h-12 rounded-xl border-2 font-bold">
                                            <Calendar className="mr-2 h-4 w-4 text-primary" />
                                            <SelectValue placeholder={fetchingYears ? "Loading history..." : "Select Year"} />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl font-bold">
                                            {availableYears.map(year => (
                                                <SelectItem key={year} value={year}>{year} Screening</SelectItem>
                                            ))}
                                            {availableYears.length === 0 && !fetchingYears && (
                                                <SelectItem value="none" disabled>No records found</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button 
                                    size="lg" 
                                    className="h-12 rounded-xl px-8 font-black shadow-xl transition-all active:scale-95"
                                    onClick={handleGenerateReport}
                                    disabled={!selectedYear || loading || fetchingYears}
                                >
                                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                                    Retrieve Report
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* Report Actions Banner */}
                {reportData && !loading && (
                    <div className="flex items-center justify-between bg-card/80 p-4 rounded-2xl border-2 border-primary/20 sticky top-2 z-20 backdrop-blur-xl shadow-lg">
                        <div className="flex items-center gap-3 px-4">
                            <ShieldCheck className="text-primary h-6 w-6" />
                            <span className="text-sm font-black uppercase tracking-widest text-primary">Official Verified Report - {selectedYear}</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <Button variant="outline" className="rounded-xl font-black h-10 border-2" onClick={handlePrint}>
                                <Printer className="mr-2 h-4 w-4" /> Print
                             </Button>
                             <Button className="rounded-xl font-black h-10 shadow-lg border-2 border-indigo-500 text-indigo-500 hover:bg-indigo-50" variant="outline" onClick={handleDownloadPDF}>
                                <Download className="mr-2 h-4 w-4" /> Download PDF
                             </Button>
                             <Button className="rounded-xl font-black h-10 shadow-lg border-2 bg-indigo-600 text-white hover:bg-indigo-700" onClick={handleEmailReport}>
                                <Mail className="mr-2 h-4 w-4" /> Email to My Address
                             </Button>
                        </div>
                    </div>
                )}

                {!reportData && !loading && (
                    <div className="flex flex-col items-center justify-center py-32 bg-muted/10 rounded-[3rem] border-2 border-dashed">
                        {fetchingYears ? (
                             <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20 mb-4" />
                        ) : (
                             <FileText className="h-20 w-20 text-muted-foreground opacity-10 mb-6" />
                        )}
                        <h3 className="text-xl font-black text-muted-foreground/50 uppercase tracking-[0.2em]">
                            {fetchingYears ? "Accessing Archives..." : "No Report Generated"}
                        </h3>
                        <p className="text-muted-foreground font-medium mt-2">
                            {availableYears.length > 0 
                                ? "Please select a screening session from the menu above." 
                                : "No historical medical screenings found in our database."}
                        </p>
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center py-40">
                         <div className="relative">
                            <Loader2 className="h-16 w-16 animate-spin text-primary" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <FileText className="h-6 w-6 text-primary/40" />
                            </div>
                         </div>
                         <p className="mt-6 text-sm font-black uppercase tracking-[0.3em] text-primary animate-pulse">Compiling Diagnostic Tables...</p>
                    </div>
                )}
                </div>{/* end no-print helper wrapper */}

                {/* VERBATIM REPORT CONTENT FROM STAFF PORTAL */}
                {reportData && !loading && (
                    <div className="flex flex-col items-center gap-8 py-8 px-4 overflow-x-auto print-container bg-muted/30 rounded-3xl border-2 border-dashed border-border" style={{ padding: '2rem' }}>
                        {/* PAGE 1 */}
                        <div className="a4-page shadow-2xl">
                            {/* Branding Header Area */}
                            <div className="report-branding">
                                {reportData.branding?.header_image ? (
                                    <img src={`http://localhost:5000${reportData.branding.header_image}`} alt="Header" className="report-header-img border-0" />
                                ) : (
                                    <div className="report-header-img">result_header</div>
                                )}
                                <div className="report-title">
                                    {selectedYear} ANNUAL MEDICAL SCREENING FOR SUNU HEALTH ENROLLEES AT DANGOTE CEMENT {fmtSec(reportData.bio.section || 'DCP')}, OBAJANA, KOGI STATE.
                                </div>
                            </div>

                            {/* Patient Bio Area */}
                            <div className="report-bio-header">
                                <div className="report-patient-name" style={{ borderBottom: '2px solid #000', marginBottom: '2mm', paddingBottom: '1mm' }}>
                                    {mkName(reportData.bio.first_name, reportData.bio.middle_name, reportData.bio.last_name)}
                                </div>
                                <div className="report-bio-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                                    <div className="bio-col space-y-1">
                                        <div className="bio-row flex justify-between"><span className="bio-label font-bold text-[#00897b]">Staff ID:</span><span className="text-[#333]">{reportData.bio.staff_id}</span></div>
                                        <div className="bio-row flex justify-between"><span className="bio-label font-bold text-[#00897b]">PID:</span><span className="text-[#333]">{reportData.bio.patient_id}</span></div>
                                        <div className="bio-row flex justify-between"><span className="bio-label font-bold text-[#00897b]">Dept:</span><span className="text-[#333] font-medium">{reportData.bio.department || '-'}</span></div>
                                        <div className="bio-row flex justify-between"><span className="bio-label font-bold text-[#00897b]">Sex:</span><span className="text-[#333]">{reportData.bio.gender || '-'}</span></div>
                                        <div className="bio-row flex justify-between"><span className="bio-label font-bold text-[#00897b]">DOB:</span><span className="text-[#333]">{reportData.bio.dob || '-'}</span></div>
                                    </div>
                                    <div className="bio-col space-y-1">
                                        <div className="bio-row flex justify-between"><span className="bio-label font-bold text-[#00897b]">Age:</span><span className="text-[#333]">{reportData.bio.age || '-'}</span></div>
                                        <div className="bio-row flex justify-between"><span className="bio-label font-bold text-[#00897b]">Phone:</span><span className="text-[#333]">{reportData.bio.phone || '-'}</span></div>
                                        <div className="bio-row flex justify-between"><span className="bio-label font-bold text-[#00897b]">Email:</span><span className="text-[#333] truncate ml-2">{reportData.bio.email || '-'}</span></div>
                                        <div className="bio-row flex justify-between"><span className="bio-label font-bold text-[#00897b]">Nationality:</span><span className="text-[#333]">{reportData.bio.nationality || '-'}</span></div>
                                        <div className="bio-row flex justify-between"><span className="bio-label font-bold text-[#00897b]">Ref:</span><span className="text-[#333]">{mkRef(selectedYear, reportData.bio.section || 'DCP', reportData.bio.patient_id)}</span></div>
                                    </div>
                                    <div className="bio-col space-y-1">
                                        <div className="bio-row flex justify-between"><span className="bio-label font-bold text-[#00897b]">Registered at:</span><span className="text-[#333] text-[10px]">{fTime(reportData.timing?.reg_date_time)}</span></div>
                                        <div className="bio-row flex justify-between"><span className="bio-label font-bold text-[#00897b]">Reported on:</span><span className="text-[#333] text-[10px]">{fTime(reportData.timing?.report_date_time)}</span></div>
                                        <div className="bio-row flex justify-between"><span className="bio-label font-bold text-[#00897b]">Generated on:</span><span className="text-[#333] text-[10px]">{fTime(reportData.timing?.gen_date_time)}</span></div>
                                    </div>
                                </div>
                            </div>

                            <div className="report-section-title">LAB FINDINGS/REPORT</div>

                            <table className="report-table">
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--table-border-color)' }}>
                                        <th style={{ width: '20%' }}>INVESTIGATION</th>
                                        <th style={{ width: '15%' }}>PARAMETER</th>
                                        <th style={{ width: '15%' }}>RESULT</th>
                                        <th style={{ width: '18%' }}>REF. VALUE</th>
                                        <th style={{ width: '12%' }}>UNIT</th>
                                        <th style={{ width: '20%' }}>REMARK</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Blood Sugar */}
                                    <tr className="category-row">
                                        <td>Blood Sugar</td>
                                        <td>FBS</td><td>{reportData.results.consultation?.fbs || '-'}</td><td>70-99</td><td>ml/dL</td><td rowSpan={2}>{reportData.results.consultation?.sugar_remark || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td></td><td>RBS</td><td>{reportData.results.consultation?.rbs || '-'}</td><td>&lt;200</td><td>ml/dL</td>
                                    </tr>
                                    <tr><td colSpan={6}><hr className="hr-thick" /></td></tr>

                                    {/* FBC */}
                                    <tr className="category-row">
                                        <td>FBC</td>
                                        <td>PCV</td><td>{reportData.results.fbc?.pcv || '-'}</td><td>34-53.9</td><td>%</td><td rowSpan={5}>{reportData.results.fbc?.remark || '-'}</td>
                                    </tr>
                                    <tr><td></td><td>WBC</td><td>{reportData.results.fbc?.wbc || '-'}</td><td>3-11</td><td>x109/L</td></tr>
                                    <tr><td></td><td>Lymphocryte</td><td>{reportData.results.fbc?.lymp_percent || '-'}</td><td>19.1-48</td><td>%</td></tr>
                                    <tr><td></td><td>Neutrophil</td><td>{reportData.results.fbc?.gra_percent || '-'}</td><td>43.6-73.3</td><td>%</td></tr>
                                    <tr><td></td><td>Mixed</td><td>{reportData.results.fbc?.mid_percent || '-'}</td><td>4.5-12.1</td><td>%</td></tr>
                                    <tr><td></td><td>Platelets</td><td>{reportData.results.fbc?.plt || '-'}</td><td>100-450</td><td>x109/L</td></tr>
                                    <tr><td colSpan={6}><hr className="hr-thick" /></td></tr>

                                    {/* KFT */}
                                    <tr className="category-row">
                                        <td>Kidney Function</td>
                                        <td>Potassium</td><td>{reportData.results.kft?.potassium || '-'}</td><td>3.5-5.0</td><td>mmol/L</td><td rowSpan={5}>{reportData.results.kft?.remark || '-'}</td>
                                    </tr>
                                    <tr><td></td><td>Sodium</td><td>{reportData.results.kft?.sodium || '-'}</td><td>135-145</td><td>mmol/L</td></tr>
                                    <tr><td></td><td>Chloride</td><td>{reportData.results.kft?.chloride || '-'}</td><td>97-107</td><td>mmol/L</td></tr>
                                    <tr><td></td><td>Bicarbonate</td><td>{reportData.results.kft?.hco3 || '-'}</td><td>20-31</td><td>mmol/L</td></tr>
                                    <tr><td></td><td>Urea</td><td>{reportData.results.kft?.urea || '-'}</td><td>10-50</td><td>mg/dL</td></tr>
                                    <tr>
                                        <td></td><td>Cretinine</td><td>{reportData.results.kft?.creatinine || '-'}</td>
                                        <td>Male: 0.7-1.4<br />Female: 0.6-1.2</td><td>mmol/L<br />mmol/L</td>
                                    </tr>
                                    <tr><td colSpan={6}><hr className="hr-thick" /></td></tr>

                                    {/* Lipid */}
                                    <tr className="category-row">
                                        <td>Lipid Profile</td>
                                        <td>Total Cholesterol</td><td>{reportData.results.lipid?.tcho || '-'}</td><td>150-220</td><td>mg/dL</td><td rowSpan={4}>{reportData.results.lipid?.remark || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td></td><td>Trigracerides</td><td>{reportData.results.lipid?.tg || '-'}</td>
                                        <td>Male: 60-165<br />Female: 42-88</td><td>mg/dL<br />mg/dL</td>
                                    </tr>
                                    <tr>
                                        <td></td><td>HDL-c</td><td>{reportData.results.lipid?.hdl || '-'}</td>
                                        <td>Male: 35-80<br />Female: 42-88</td><td>mg/dL<br />mg/dL</td>
                                    </tr>
                                    <tr><td></td><td>LDL-c</td><td>{reportData.results.lipid?.ldl || '-'}</td><td>&lt;130</td><td>mg/dL</td></tr>
                                    <tr><td colSpan={6}><hr className="hr-thick" /></td></tr>

                                    {/* LFT */}
                                    <tr className="category-row">
                                        <td>Liver Function</td>
                                        <td>AST</td><td>{reportData.results.lft?.ast || '-'}</td><td>0-46</td><td>U/L</td><td rowSpan={5}>{reportData.results.lft?.remark || '-'}</td>
                                    </tr>
                                    <tr><td></td><td>ALT</td><td>{reportData.results.lft?.alt || '-'}</td><td>0-49</td><td>U/L</td></tr>
                                    <tr>
                                        <td></td><td>ALP</td><td>{reportData.results.lft?.alp || '-'}</td>
                                        <td>Male: 80-306<br />Female: 64-306</td><td>U/L<br />U/L</td>
                                    </tr>
                                    <tr><td></td><td>TB</td><td>{reportData.results.lft?.tb || '-'}</td><td>0-1.2</td><td>mg/dL</td></tr>
                                    <tr><td></td><td>CB</td><td>{reportData.results.lft?.cb || '-'}</td><td>0-.14</td><td>mg/dL</td></tr>
                                    <tr><td colSpan={6}><hr className="hr-thick" /></td></tr>

                                    {/* UA & PSA */}
                                    <tr className="category-row">
                                        <td>Urine Analysis</td>
                                        <td>Sugar & Protein</td><td>{reportData.results.consultation?.ua_result || '-'}</td><td>NA</td><td></td><td>{reportData.results.consultation?.ua_remark || '-'}</td>
                                    </tr>
                                    <tr className="category-row">
                                        <td>PSA</td>
                                        <td>PSA</td><td>{reportData.results.consultation?.psa || '-'}</td><td>NA</td><td></td><td>{reportData.results.consultation?.psa_remark || '-'}</td>
                                    </tr>
                                    <tr><td colSpan={6} style={{ borderTop: '2px solid var(--table-border-color)', height: '10px' }}></td></tr>
                                </tbody>
                            </table>

                            <div className="report-footer-stack">
                                <div className="end-marker">***End of Report***</div>
                                <div className="footer-split">
                                    <div className="relative">
                                        <div className="qr-box">
                                            {reportData.verification_url ? (
                                                <QRCodeSVG value={reportData.verification_url} size={70} />
                                            ) : (
                                                <span style={{ fontSize: '8px', color: '#999' }}>&#123;qrcode&#125;</span>
                                            )}
                                        </div>
                                        <div className="qr-label">SCAN TO VERIFY</div>
                                    </div>
                                    <div className="sig-box">
                                        {reportData.branding?.signature_image ? (
                                            <img src={`http://localhost:5000${reportData.branding.signature_image}`} alt="Signature" className="sig-img border-0 bg-transparent mix-blend-multiply" />
                                        ) : (
                                            <div className="sig-img">&#123;signature&#125;</div>
                                        )}
                                        <div className="sig-name">Dr. Anyanwu Ugochukwu D. FMCPath</div>
                                        <div className="sig-title">Consultant in Charge</div>
                                    </div>
                                </div>
                                {reportData.branding?.footer_image ? (
                                    <img src={`http://localhost:5000${reportData.branding.footer_image}`} alt="Footer" className="report-footer-img border-0" />
                                ) : (
                                    <div className="report-footer-img">result_footer</div>
                                )}
                            </div>
                        </div>

                        {/* PAGE 2 */}
                        <div className="a4-page shadow-2xl">
                            <div className="report-branding">
                                {reportData.branding?.header_image ? (
                                    <img src={`http://localhost:5000${reportData.branding.header_image}`} alt="Header" className="report-header-img border-0" />
                                ) : (
                                    <div className="report-header-img">result_header</div>
                                )}
                            </div>
                            <div className="report-bio-header" style={{ display: 'flex', gap: '50px', fontWeight: 900, fontSize: '12px', color: 'var(--report-brand-teal)' }}>
                                <div>Staff ID: <span style={{ color: '#333' }}> {reportData.bio.staff_id}</span></div>
                                <div>PID: <span style={{ color: '#333' }}> {reportData.bio.patient_id}</span></div>
                            </div>

                            <div className="report-section-title">CLINICAL AND LABORATORY FINDINGS</div>

                            <div className="report-list" style={{ paddingBottom: '2mm' }}>
                                <table className="report-table" style={{ fontSize: '11px', tableLayout: 'fixed', width: '100%' }}>
                                    <colgroup>
                                        <col style={{ width: '9%' }} />
                                        <col style={{ width: '30%' }} />
                                        <col style={{ width: '61%' }} />
                                    </colgroup>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--table-border-color)' }}>
                                            <th style={{ paddingLeft: '5px' }}>S/N</th>
                                            <th>INVESTIGATION</th>
                                            <th>RESULT</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr style={{ padding: '5px 0', borderBottom: '1px solid #ccc' }}>
                                            <td className="font-bold border-0 text-center">1.</td>
                                            <td className="border-0">Relevant History and Physical Exam:</td>
                                            <td className="border-0">{reportData.results.consultation?.hx_pe || '-'}</td>
                                        </tr>
                                        <tr style={{ padding: '5px 0', borderBottom: '1px solid #ccc' }}>
                                            <td className="font-bold border-0 text-center">2.</td>
                                            <td className="border-0">Relevant Laboratory Investigations:</td>
                                            <td className="border-0">{reportData.results.consultation?.lab_remark || '-'}</td>
                                        </tr>
                                        <tr style={{ padding: '5px 0', borderBottom: '1px solid #ccc' }}>
                                            <td className="font-bold border-0 text-center">3.</td>
                                            <td className="border-0">Electrocardiogram (ECG Findings):</td>
                                            <td className="border-0">{reportData.results.special?.ecg || '-'}</td>
                                        </tr>
                                        <tr style={{ padding: '5px 0', borderBottom: '1px solid #ccc' }}>
                                            <td className="font-bold border-0 text-center">4.</td>
                                            <td className="border-0">Spirometry (Lung Function Test):</td>
                                            <td className="border-0">{reportData.results.special?.spirometry || '-'}</td>
                                        </tr>
                                        <tr style={{ padding: '5px 0', borderBottom: '1px solid #ccc' }}>
                                            <td className="font-bold border-0 text-center">5.</td>
                                            <td className="border-0">Audiometry (Hearing Test):</td>
                                            <td className="border-0">{reportData.results.special?.audiometry || '-'}</td>
                                        </tr>
                                        <tr style={{ padding: '5px 0', borderBottom: '1px solid transparent' }}>
                                            <td className="font-bold border-0 text-center">6.</td>
                                            <td className="border-0">Breast Examination (Females only):</td>
                                            <td className="border-0">{reportData.results.consultation?.breast || '-'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="report-section-title">PATIENT'S VITAL SIGNS</div>
                            <div className="vitals-grid">
                                <div className="vital-col">
                                    <span><span className="vital-label text-slate-500">Blood Pressure:</span> {reportData.results.consultation?.bp || '-'}</span>
                                    <span><span className="vital-label text-slate-500">Unit:</span> mm/hg</span>
                                </div>
                                <div className="vital-col" style={{ borderLeft: '1px solid #ccc', paddingLeft: '10px' }}>
                                    <span><span className="vital-label text-slate-500">Pulse Rate:</span> {reportData.results.consultation?.pulse || '-'}</span>
                                    <span><span className="vital-label text-slate-500">Unit:</span> b/m</span>
                                </div>
                                <div className="vital-col" style={{ borderLeft: '1px solid #ccc', paddingLeft: '10px' }}>
                                    <span><span className="vital-label text-slate-500">SPO2:</span> {reportData.results.consultation?.spo2 || '-'}</span>
                                    <span><span className="vital-label text-slate-500">Unit:</span> %</span>
                                </div>
                            </div>

                            <div className="report-section-title">COMMENTS/MEDICAL ADVICE</div>
                            <div className="report-list" style={{ minHeight: '80px', marginBottom: '20px' }}>
                                <div className="report-list-item" style={{ minHeight: '3.5em' }}><div className="idx">1.</div><div> {reportData.results.director?.comment_one || '-'}</div></div>
                                <div className="report-list-item" style={{ minHeight: '3.5em' }}><div className="idx">2.</div><div> {reportData.results.director?.comment_two || '-'}</div></div>
                                <div className="report-list-item" style={{ minHeight: '3.5em' }}><div className="idx">3.</div><div> {reportData.results.director?.comment_three || '-'}</div></div>
                                <div className="report-list-item" style={{ minHeight: '3.5em' }}><div className="idx">4.</div><div> {reportData.results.director?.comment_four || '-'}</div></div>
                            </div>

                            <div className="report-section-title">CERTIFICATIONS</div>
                            <div className="cert-text pb-2 mb-2">
                                I hereby <strong>certify</strong> that a <strong>comprehensive medical evaluation</strong> with relevant <strong>medical investigations</strong> were carried out on the above named staff on the aforementioned date and time.
                            </div>

                            <div className="report-section-title">ACRONYMS & INITIALISMS</div>
                            <div className="acronyms-grid mb-4">
                                <div className="acronym-col gap-1 flex flex-col">
                                    <div className="acronym-row"><span className="acronym-key">FBC</span> FULL BLOOD COUNT</div>
                                    <div className="acronym-row"><span className="acronym-key">TC</span> TOTAL CHOLESTEROL</div>
                                    <div className="acronym-row"><span className="acronym-key">TG</span> TRIGLYCERIDE</div>
                                    <div className="acronym-row"><span className="acronym-key">HDL-c</span> HIGH DENSITY LIPOPROTEIN CHOLESTEROL</div>
                                </div>
                                <div className="acronym-col gap-1 flex flex-col">
                                    <div className="acronym-row"><span className="acronym-key">LDL-c</span> LOW DENSITY LIPOPROTEIN CHOLESTEROL</div>
                                    <div className="acronym-row"><span className="acronym-key">AST</span> ASPARTATE AMINOTRANSFERASE</div>
                                    <div className="acronym-row"><span className="acronym-key">ALT</span> ALANINE AMINOTRANSFERASE</div>
                                    <div className="acronym-row"><span className="acronym-key">ALP</span> ALKALINE PHOSPHATASE</div>
                                </div>
                                <div className="acronym-col gap-1 flex flex-col">
                                    <div className="acronym-row"><span className="acronym-key">TB</span> TOTAL BILIRUBIN</div>
                                    <div className="acronym-row"><span className="acronym-key">CB</span> CONJUGATED BILIRUBIN</div>
                                    <div className="acronym-row"><span className="acronym-key">NAD</span> NO ABNORMALITY DETECTED</div>
                                </div>
                            </div>
                            <div className="border-top-thick mt-2 mb-4"></div>

                            <div className="report-footer-stack">
                                <div className="end-marker">***End of Report***</div>
                                <div className="footer-split">
                                    <div className="relative">
                                        <div className="qr-box">
                                            {reportData.verification_url ? (
                                                <QRCodeSVG value={reportData.verification_url} size={70} />
                                            ) : (
                                                <span style={{ fontSize: '8px', color: '#999' }}>&#123;qrcode&#125;</span>
                                            )}
                                        </div>
                                        <div className="qr-label">SCAN TO VERIFY</div>
                                    </div>
                                    <div className="sig-box">
                                        {reportData.branding?.signature_image ? (
                                            <img src={`http://localhost:5000${reportData.branding.signature_image}`} alt="Signature" className="sig-img border-0 bg-transparent mix-blend-multiply" />
                                        ) : (
                                            <div className="sig-img">&#123;signature&#125;</div>
                                        )}
                                        <div className="sig-name">Dr. Anyanwu Ugochukwu D. FMCPath</div>
                                        <div className="sig-title">Consultant in Charge</div>
                                    </div>
                                </div>
                                {reportData.branding?.footer_image ? (
                                    <img src={`http://localhost:5000${reportData.branding.footer_image}`} alt="Footer" className="report-footer-img border-0" />
                                ) : (
                                    <div className="report-footer-img">result_footer</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PatientLayout>
    );
};

export default PatientMedicalReport;
