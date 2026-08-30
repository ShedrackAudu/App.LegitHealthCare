import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
    File01Icon,
    Download01Icon,
    Mail01Icon,
    PrinterIcon,
    Calendar03Icon,
    ArrowRight01Icon,
    Shield01Icon,
    Attachment01Icon
} from '@hugeicons/core-free-icons';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useAppContext } from '@/context/AppContext';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import { toJpeg } from 'html-to-image';
import { SingleReportProgressModal, type ReportProgressState } from '@/components/SingleReportProgressModal';
import '@/styles/PatientReport.css';

const PatientMedicalReport: React.FC = () => {
    const { user } = useAppContext();
    const [availableYears, setAvailableYears] = useState<string[]>([]);
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [fetchingYears, setFetchingYears] = useState(true);
    const [reportActionModal, setReportActionModal] = useState<ReportProgressState>({
        isOpen: false,
        action: 'download',
        stage: 'idle',
        progress: 0,
    });

    useEffect(() => {
        const fetchYears = async () => {
            try {
                const res = await api.get('/api/patient/reports/years', {
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
            // First verify 100% progress for the selected year
            const progressRes = await api.get(`/api/patient/report-progress?year=${selectedYear}`, {
                headers: { 'X-Staff-ID': user?.username }
            });
            
            if (progressRes.data && progressRes.data.percentage < 100) {
                toast.error("Your report is being compiled, please check back later");
                setLoading(false);
                return;
            }

            // Fetch profile to get section
            const profileRes = await api.get('/api/patient/profile', {
                headers: { 'X-Staff-ID': user?.username }
            });

            const section = profileRes.data.section || 'DCP';

            const res = await api.get(`/api/patient-report/${user?.username}/${selectedYear}`, {
                headers: { 'X-Company-Context': section }
            });

            setReportData(res.data);
            toast.success(`Report for ${selectedYear} generated!`);
        } catch (err) {
            toast.error("Clinical data not found or screening incomplete");
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => window.print();

    const generateFrontendPDF = async (onPageProgress?: (current: number, total: number) => void): Promise<Blob> => {
        const pages = document.querySelectorAll('.a4-page');
        if (pages.length === 0) throw new Error("Report pages not found in DOM");

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < pages.length; i++) {
            if (onPageProgress) {
                onPageProgress(i + 1, pages.length);
            }
            const pageEl = pages[i] as HTMLElement;
            // Force true dimensions to prevent viewport clipping on small screens
            const width = pageEl.scrollWidth;
            const height = pageEl.scrollHeight;

            const imgData = await toJpeg(pageEl, {
                cacheBust: true,
                pixelRatio: 3,
                quality: 0.95,
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

            pdf.addImage(imgData, 'JPEG', x, y, calcWidth, calcHeight);
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

        const pName = mkName(reportData.bio?.first_name || 'Patient', reportData.bio?.middle_name, reportData.bio?.last_name || '');
        const sId = user?.username || reportData.bio?.staff_id || '';
        const filename = getDownloadFilename();

        setReportActionModal({
            isOpen: true,
            action: 'download',
            stage: 'preparing',
            progress: 15,
            patientName: pName,
            staffId: sId,
            filename: filename,
            statusTitle: 'Preparing Medical Report...',
            statusDescription: 'Validating records & initializing document layout'
        });

        try {
            const pdfBlob = await generateFrontendPDF((cur, tot) => {
                const pageProgress = 20 + Math.round((cur / tot) * 55); // 20% to 75%
                setReportActionModal(prev => ({
                    ...prev,
                    stage: 'capturing',
                    currentPage: cur,
                    totalPages: tot,
                    progress: pageProgress,
                    statusTitle: `Capturing Page ${cur} of ${tot}...`,
                    statusDescription: 'Rendering high-resolution vector and canvas graphics'
                }));
            });

            setReportActionModal(prev => ({
                ...prev,
                stage: 'packaging',
                progress: 85,
                statusTitle: 'Compiling PDF Binary...',
                statusDescription: 'Assembling high-density vector pages and metadata'
            }));

            setReportActionModal(prev => ({
                ...prev,
                stage: 'saving',
                progress: 95,
                statusTitle: 'Saving File to Device...',
                statusDescription: `Writing ${filename} to your device storage`
            }));

            const url = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            // Log download to audit trail
            try {
                const sId = reportData?.bio?.staff_id;
                const sec = reportData?.bio?.section || 'DCP';
                if (sId) {
                    await api.post('/api/patient/reports/log-download', {
                        staff_id: sId,
                        screening_year: selectedYear,
                        section: sec
                    });
                }
            } catch (auditErr) {
                console.error("Failed to log report download audit action", auditErr);
            }

            setReportActionModal(prev => ({
                ...prev,
                stage: 'success',
                progress: 100,
                statusTitle: 'Report Downloaded Successfully!',
                statusDescription: `Your medical screening report has been saved to your device.`
            }));
        } catch (err: any) {
            console.error('PDF error:', err);
            const msg = err.message || String(err) || 'Failed to generate frontend PDF.';
            setReportActionModal(prev => ({
                ...prev,
                stage: 'error',
                statusTitle: 'Download Failed',
                errorMessage: msg
            }));
        }
    };

    const handleEmailReport = async () => {
        if (!reportData) return;

        const pEmail = (reportData.bio?.email || user?.email || '').trim();
        const pName = mkName(reportData.bio?.first_name || 'Patient', reportData.bio?.middle_name, reportData.bio?.last_name || '');
        const sId = user?.username || reportData.bio?.staff_id || '';
        const filename = getDownloadFilename();

        if (!pEmail) {
            setReportActionModal({
                isOpen: true,
                action: 'email',
                stage: 'error',
                progress: 0,
                recipientEmail: 'Missing Email Address',
                patientName: pName,
                staffId: sId,
                filename: filename,
                statusTitle: 'Email Address Missing',
                errorMessage: 'No verified email address is associated with your account. Please update your profile with a valid email.'
            });
            return;
        }

        setReportActionModal({
            isOpen: true,
            action: 'email',
            stage: 'preparing',
            progress: 15,
            recipientEmail: pEmail,
            patientName: pName,
            staffId: sId,
            filename: filename,
            statusTitle: 'Preparing Medical Report...',
            statusDescription: 'Validating recipient address & initializing document layout'
        });

        try {
            const pdfBlob = await generateFrontendPDF((cur, tot) => {
                const pageProgress = 20 + Math.round((cur / tot) * 45); // 20% to 65%
                setReportActionModal(prev => ({
                    ...prev,
                    stage: 'capturing',
                    currentPage: cur,
                    totalPages: tot,
                    progress: pageProgress,
                    statusTitle: `Capturing Page ${cur} of ${tot}...`,
                    statusDescription: 'Rendering high-resolution vector and canvas graphics'
                }));
            });

            setReportActionModal(prev => ({
                ...prev,
                stage: 'packaging',
                progress: 75,
                statusTitle: 'Compiling & Encrypting PDF...',
                statusDescription: 'Packaging attachment and generating binary Base64 payload'
            }));

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

            const sec = reportData.bio?.section || 'DCP';
            let companyName = 'Legit HealthCare';
            if (sec === 'DCT') companyName = 'Dangote Cement Transport';
            if (sec === 'DCP') companyName = 'Dangote Cement Plant';

            const payloadData = {
                attachment_data: b64data,
                attachment_filename: filename,
                email: pEmail,
                first_name: reportData.bio?.first_name || 'Patient',
                screening_year: selectedYear,
                company: companyName,
                department: reportData.bio?.department || 'NA',
                staff_id: user?.username || 'UNKNOWN',
                origin: 'frontend'
            };

            setReportActionModal(prev => ({
                ...prev,
                stage: 'transmitting',
                progress: 90,
                statusTitle: 'Transmitting via SMTP Server...',
                statusDescription: `Dispatching encrypted email with PDF attachment to ${pEmail}`
            }));

            const res = await api.post('/api/email/report', payloadData);

            setReportActionModal(prev => ({
                ...prev,
                stage: 'success',
                progress: 100,
                statusTitle: 'Report Emailed Successfully!',
                statusDescription: res.data.message || `Your medical screening report has been delivered to ${pEmail}.`
            }));
        } catch (err: any) {
            console.error('Email error:', err);
            const msg = err.response?.data?.error || err.message || 'Failed to send email. Check SMTP settings.';
            setReportActionModal(prev => ({
                ...prev,
                stage: 'error',
                statusTitle: 'Email Delivery Failed',
                errorMessage: msg
            }));
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

    const getParam = (id: string, defaultName: string, defaultRange: string, defaultUnit: string) => {
        const p = reportData?.report_parameters?.[id];
        return {
            name: p?.parameter_name || defaultName,
            range: p?.reference_value || defaultRange,
            unit: p?.unit !== undefined && p?.unit !== null ? p.unit : defaultUnit
        };
    };

    const renderMultiline = (text: string | null | undefined) => {
        if (!text) return '-';
        return text.split('\n').map((line, idx) => (
            <React.Fragment key={idx}>
                {idx > 0 && <br />}
                {line}
            </React.Fragment>
        ));
    };

    return (
        <PatientLayout>
            <div className="space-y-8 animate-in fade-in duration-700">
                <div className="no-print space-y-8">
                    {/* Header Selector Card */}
                    <Card className="border border-border/60 shadow-xs rounded-xl overflow-hidden bg-card/60 dark:bg-card/45 backdrop-blur-md">
                        <CardHeader className="p-6 md:p-8">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary shadow-2xs">
                                            <HugeiconsIcon icon={File01Icon} className="h-5 w-5 sm:h-6 sm:w-6" />
                                        </div>
                                        <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">Medical Reports</CardTitle>
                                    </div>
                                    <CardDescription className="text-muted-foreground font-medium text-xs sm:text-sm pl-3 border-l-2 border-primary/30 ml-1 py-0.5">
                                        Select a screening year to view your comprehensive results.
                                    </CardDescription>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                                    <div className="w-full sm:w-44">
                                        <Select value={selectedYear} onValueChange={setSelectedYear} disabled={fetchingYears || loading}>
                                            <SelectTrigger className="h-10 rounded-lg border-input/80 bg-card/60 font-bold text-xs shadow-2xs">
                                                <HugeiconsIcon icon={Calendar03Icon} className="mr-2 h-3.5 w-3.5 text-primary" />
                                                <SelectValue placeholder={fetchingYears ? "Loading..." : "Select Year"} />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl font-bold bg-popover/95 backdrop-blur-md border border-border/80 shadow-md">
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
                                        size="default"
                                        className="w-full sm:w-auto h-10 rounded-lg px-6 font-bold shadow-xs transition-all active:scale-95 text-xs bg-primary"
                                        onClick={handleGenerateReport}
                                        loading={loading}
                                        disabled={!selectedYear || fetchingYears}
                                    >
                                        {!loading && <HugeiconsIcon icon={ArrowRight01Icon} className="mr-2 h-3.5 w-3.5" />}
                                        Retrieve Report
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Report Actions Banner */}
                    {reportData && !loading && (
                        <div className="flex flex-col md:flex-row items-center justify-between bg-card/75 dark:bg-card/60 p-3 rounded-xl border border-border/60 sticky top-2 z-20 backdrop-blur-xl shadow-xs gap-3 md:gap-0">
                            <div className="flex items-center gap-2.5 px-2 md:px-4">
                                <HugeiconsIcon icon={Shield01Icon} className="text-primary h-5 w-5 shrink-0" />
                                <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-primary">Official Verified Report - {selectedYear}</span>
                            </div>
                             <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 w-full md:w-auto px-2">
                                <Button variant="outline" className="flex-1 md:flex-none rounded-lg font-bold h-9 border border-border/70 bg-card/60 text-xs shadow-2xs" onClick={handlePrint}>
                                    <HugeiconsIcon icon={PrinterIcon} className="sm:mr-1 md:mr-1.5 h-3.5 w-3.5" /> <span className="hidden sm:inline">Print</span>
                                </Button>
                                <Button className="flex-1 md:flex-none rounded-lg font-bold h-9 shadow-2xs border border-primary/30 text-primary hover:bg-primary/10 text-xs" variant="outline" onClick={handleDownloadPDF}>
                                    <HugeiconsIcon icon={Download01Icon} className="sm:mr-1 md:mr-1.5 h-3.5 w-3.5" /> <span className="hidden sm:inline">Download</span>
                                </Button>
                                <Button className="flex-1 md:flex-none rounded-lg font-bold h-9 shadow-2xs bg-primary text-primary-foreground hover:bg-primary/90 text-xs" onClick={handleEmailReport}>
                                    <HugeiconsIcon icon={Mail01Icon} className="sm:mr-1 md:mr-1.5 h-3.5 w-3.5" /> <span className="hidden sm:inline">Email Report</span>
                                </Button>
                                <Button asChild className="flex-1 md:flex-none rounded-lg font-bold h-9 shadow-2xs border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs" variant="outline">
                                    <Link to="/patient/files">
                                        <HugeiconsIcon icon={Attachment01Icon} className="sm:mr-1 md:mr-1.5 h-3.5 w-3.5" /> <span className="hidden sm:inline">Technical Files</span>
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    )}

                    {!reportData && !loading && (
                        <div className="w-full">
                            {fetchingYears ? (
                                <div className="flex flex-col items-center justify-center py-12 md:py-24 bg-card/40 backdrop-blur-xs rounded-xl border border-dashed border-border/60 text-center px-6 space-y-6 animate-pulse">
                                    <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 bg-muted/40 rounded-full" />
                                    <div className="space-y-2.5 flex flex-col items-center">
                                        <Skeleton className="h-5 w-48 bg-muted/40 rounded" />
                                        <Skeleton className="h-3 w-64 bg-muted/30 rounded" />
                                        <Skeleton className="h-3 w-40 bg-muted/30 rounded" />
                                    </div>
                                    <div className="flex flex-col items-center gap-2 pt-6">
                                        <div className="h-px w-10 bg-muted-foreground/10" />
                                        <Skeleton className="h-3 w-32 bg-muted/30 rounded" />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 md:py-24 bg-card/40 backdrop-blur-xs rounded-xl border border-dashed border-border/60 text-center px-6 space-y-4 shadow-2xs">
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-1 transition-transform hover:scale-105 duration-300">
                                        <HugeiconsIcon icon={File01Icon} className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground/40" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <h3 className="text-sm md:text-base font-bold text-muted-foreground uppercase tracking-wider">
                                            No Report Selected
                                        </h3>
                                        <p className="text-xs text-muted-foreground font-medium italic max-w-[240px] md:max-w-xs mx-auto leading-relaxed">
                                            {availableYears.length > 0
                                                ? "Please select a screening session from the menu above to view your comprehensive results."
                                                : "No historical medical screenings found in our database for your account."}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-center gap-2 pt-4">
                                        <div className="h-px w-10 bg-muted-foreground/20" />
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                                            Official Medical Archives • {user?.username}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {loading && (
                        <div className="w-full max-w-4xl mx-auto space-y-8 animate-pulse">
                            {/* Fake A4 Page 1 Skeleton */}
                            <div className="bg-card/60 backdrop-blur-md border border-border/60 rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
                                {/* Header / Branding */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-border/50">
                                    <Skeleton className="h-12 w-48 bg-muted/40 rounded" />
                                    <Skeleton className="h-4 w-32 bg-muted/40 rounded" />
                                </div>
                                {/* Bio details */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/10 rounded-xl">
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <div key={i} className="space-y-1.5">
                                            <Skeleton className="h-3 w-16 bg-muted/40 rounded" />
                                            <Skeleton className="h-4 w-24 bg-muted/40 rounded" />
                                        </div>
                                    ))}
                                </div>
                                {/* Fake Table */}
                                <div className="space-y-3">
                                    <Skeleton className="h-6 w-36 bg-muted/40 rounded" />
                                    <div className="border border-border/50 rounded-xl overflow-hidden">
                                        <div className="bg-muted/20 h-10 border-b border-border/50 flex items-center px-4 justify-between">
                                            <Skeleton className="h-4 w-24 bg-muted/40 rounded" />
                                            <Skeleton className="h-4 w-16 bg-muted/40 rounded" />
                                            <Skeleton className="h-4 w-16 bg-muted/40 rounded" />
                                        </div>
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className="h-12 border-b border-border/50 flex items-center px-4 justify-between last:border-0">
                                                <Skeleton className="h-4 w-32 bg-muted/40 rounded" />
                                                <Skeleton className="h-4 w-12 bg-muted/40 rounded" />
                                                <Skeleton className="h-4 w-20 bg-muted/40 rounded" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>{/* end no-print helper wrapper */}

                {/* VERBATIM REPORT CONTENT FROM STAFF PORTAL */}
                {reportData && !loading && (
                    <div className="flex flex-col items-center gap-8 py-8 px-4 overflow-x-auto print-container bg-muted/20 rounded-2xl border border-dashed border-border/60 print:bg-transparent print:border-0 print:p-0 print:overflow-visible" style={{ padding: '2rem' }}>
                        {/* PAGE 1 */}
                        <div className="a4-page shadow-lg">
                            {/* Branding Header Area */}
                            <div className="report-branding">
                                {reportData.branding?.header_image ? (
                                    <img src={`${(window as any).API_BASE_URL}${reportData.branding.header_image}`} alt="Header" className="report-header-img border-0" />
                                ) : (
                                    <div className="report-header-img">result_header</div>
                                )}
                                <div className="report-title">
                                    {selectedYear} ANNUAL MEDICAL SCREENING FOR SUNU HEALTH ENROLLEES AT DANGOTE CEMENT {fmtSec(reportData.bio.section || 'DCP')}, OBAJANA, KOGI STATE.
                                </div>
                            </div>

                            {/* Patient Bio Area */}
                            <div className="report-bio-header">
                                <div className="report-patient-name" style={{ borderTop: '2px solid #000', borderBottom: '1px solid #000', marginTop: '1mm', paddingTop: '1mm', marginBottom: '2mm', paddingBottom: '1mm' }}>
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
                                        <div className="bio-row flex justify-between"><span className="bio-label font-bold text-[#00897b]">Weight:</span><span className="text-[#333]">{reportData.results.special?.weight ? `${reportData.results.special.weight} kg` : '-'}</span></div>
                                        <div className="bio-row flex justify-between"><span className="bio-label font-bold text-[#00897b]">Height:</span><span className="text-[#333]">{reportData.results.special?.height ? `${reportData.results.special.height} cm` : '-'}</span></div>
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
                                <tbody>                                    {/* Blood Sugar */}
                                    <tr className="category-row">
                                        <td>Blood Sugar</td>
                                        <td>{getParam('fbs', 'FBS', '70-99', 'ml/dL').name}</td>
                                        <td>{reportData.results.consultation?.fbs || '-'}</td>
                                        <td>{renderMultiline(getParam('fbs', 'FBS', '70-99', 'ml/dL').range)}</td>
                                        <td>{renderMultiline(getParam('fbs', 'FBS', '70-99', 'ml/dL').unit)}</td>
                                        <td rowSpan={2}>{reportData.results.consultation?.sugar_remark || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>{getParam('rbs', 'RBS', '<200', 'ml/dL').name}</td>
                                        <td>{reportData.results.consultation?.rbs || '-'}</td>
                                        <td>{renderMultiline(getParam('rbs', 'RBS', '<200', 'ml/dL').range)}</td>
                                        <td>{renderMultiline(getParam('rbs', 'RBS', '<200', 'ml/dL').unit)}</td>
                                    </tr>
                                    <tr><td colSpan={6}><hr className="hr-thick" /></td></tr>

                                    {/* FBC */}
                                    <tr className="category-row">
                                        <td>FBC</td>
                                        <td>{getParam('pcv', 'PCV', '36-53.9', '%').name}</td>
                                        <td>{reportData.results.fbc?.pcv || '-'}</td>
                                        <td>{renderMultiline(getParam('pcv', 'PCV', '36-53.9', '%').range)}</td>
                                        <td>{renderMultiline(getParam('pcv', 'PCV', '36-53.9', '%').unit)}</td>
                                        <td rowSpan={6}>{reportData.results.fbc?.remark || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>{getParam('wbc', 'WBC', '3-11', 'x109/L').name}</td>
                                        <td>{reportData.results.fbc?.wbc || '-'}</td>
                                        <td>{renderMultiline(getParam('wbc', 'WBC', '3-11', 'x109/L').range)}</td>
                                        <td>{renderMultiline(getParam('wbc', 'WBC', '3-11', 'x109/L').unit)}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>{getParam('lymphocyte', 'Lymphocryte', '0.6-4.1', 'x10⁹/L').name}</td>
                                        <td>{reportData.results.fbc?.lymp_abs || '-'}</td>
                                        <td>{renderMultiline(getParam('lymphocyte', 'Lymphocryte', '0.6-4.1', 'x10⁹/L').range)}</td>
                                        <td>{renderMultiline(getParam('lymphocyte', 'Lymphocryte', '0.6-4.1', 'x10⁹/L').unit)}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>{getParam('neutrophil', 'Neutrophil', '1.5-8.0', 'x10⁹/L').name}</td>
                                        <td>{reportData.results.fbc?.gra_abs || '-'}</td>
                                        <td>{renderMultiline(getParam('neutrophil', 'Neutrophil', '1.5-8.0', 'x10⁹/L').range)}</td>
                                        <td>{renderMultiline(getParam('neutrophil', 'Neutrophil', '1.5-8.0', 'x10⁹/L').unit)}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>{getParam('mixed', 'Mixed', '0.1-1.8', 'x10⁹/L').name}</td>
                                        <td>{reportData.results.fbc?.mid_abs || '-'}</td>
                                        <td>{renderMultiline(getParam('mixed', 'Mixed', '0.1-1.8', 'x10⁹/L').range)}</td>
                                        <td>{renderMultiline(getParam('mixed', 'Mixed', '0.1-1.8', 'x10⁹/L').unit)}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>{getParam('platelets', 'Platelets', '100-450', 'x109/L').name}</td>
                                        <td>{reportData.results.fbc?.plt || '-'}</td>
                                        <td>{renderMultiline(getParam('platelets', 'Platelets', '100-450', 'x109/L').range)}</td>
                                        <td>{renderMultiline(getParam('platelets', 'Platelets', '100-450', 'x109/L').unit)}</td>
                                    </tr>
                                    <tr><td colSpan={6}><hr className="hr-thick" /></td></tr>

                                    {/* KFT */}
                                    <tr className="category-row">
                                        <td>Kidney Function</td>
                                        <td>{getParam('potassium', 'Potassium', '3.5-5.0', 'mmol/L').name}</td>
                                        <td>{reportData.results.kft?.potassium || '-'}</td>
                                        <td>{renderMultiline(getParam('potassium', 'Potassium', '3.5-5.0', 'mmol/L').range)}</td>
                                        <td>{renderMultiline(getParam('potassium', 'Potassium', '3.5-5.0', 'mmol/L').unit)}</td>
                                        <td rowSpan={6}>{reportData.results.kft?.remark || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>{getParam('sodium', 'Sodium', '135-145', 'mmol/L').name}</td>
                                        <td>{reportData.results.kft?.sodium || '-'}</td>
                                        <td>{renderMultiline(getParam('sodium', 'Sodium', '135-145', 'mmol/L').range)}</td>
                                        <td>{renderMultiline(getParam('sodium', 'Sodium', '135-145', 'mmol/L').unit)}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>{getParam('chloride', 'Chloride', '97-107', 'mmol/L').name}</td>
                                        <td>{reportData.results.kft?.chloride || '-'}</td>
                                        <td>{renderMultiline(getParam('chloride', 'Chloride', '97-107', 'mmol/L').range)}</td>
                                        <td>{renderMultiline(getParam('chloride', 'Chloride', '97-107', 'mmol/L').unit)}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>{getParam('bicarbonate', 'Bicarbonate', '20-31', 'mmol/L').name}</td>
                                        <td>{reportData.results.kft?.hco3 || '-'}</td>
                                        <td>{renderMultiline(getParam('bicarbonate', 'Bicarbonate', '20-31', 'mmol/L').range)}</td>
                                        <td>{renderMultiline(getParam('bicarbonate', 'Bicarbonate', '20-31', 'mmol/L').unit)}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>{getParam('urea', 'Urea', '2.5-8.33', 'mmol/L').name}</td>
                                        <td>{reportData.results.lft?.urea || '-'}</td>
                                        <td>{renderMultiline(getParam('urea', 'Urea', '2.5-8.33', 'mmol/L').range)}</td>
                                        <td>{renderMultiline(getParam('urea', 'Urea', '2.5-8.33', 'mmol/L').unit)}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>{getParam('creatinine', 'Cretinine', 'Male: 80-133\nFemale: 62-115', 'umol/L\numol/L').name}</td>
                                        <td>{reportData.results.lft?.creatinine || '-'}</td>
                                        <td>{renderMultiline(getParam('creatinine', 'Cretinine', 'Male: 80-133\nFemale: 62-115', 'umol/L\numol/L').range)}</td>
                                        <td>{renderMultiline(getParam('creatinine', 'Cretinine', 'Male: 80-133\nFemale: 62-115', 'umol/L\numol/L').unit)}</td>
                                    </tr>
                                    <tr><td colSpan={6}><hr className="hr-thick" /></td></tr>

                                    {/* Lipid */}
                                    <tr className="category-row">
                                        <td>Lipid Profile</td>
                                        <td>{getParam('total_cholesterol', 'Total Cholesterol', '<200', 'mg/dL').name}</td>
                                        <td>{reportData.results.lipid?.tcho || '-'}</td>
                                        <td>{renderMultiline(getParam('total_cholesterol', 'Total Cholesterol', '<200', 'mg/dL').range)}</td>
                                        <td>{renderMultiline(getParam('total_cholesterol', 'Total Cholesterol', '<200', 'mg/dL').unit)}</td>
                                        <td rowSpan={4}>{reportData.results.lipid?.remark || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>{getParam('triglycerides', 'Trigracerides', 'Male: <150\nFemale: <150', 'mg/dL\nmg/dL').name}</td>
                                        <td>{reportData.results.lipid?.tg || '-'}</td>
                                        <td>{renderMultiline(getParam('triglycerides', 'Trigracerides', 'Male: <150\nFemale: <150', 'mg/dL\nmg/dL').range)}</td>
                                        <td>{renderMultiline(getParam('triglycerides', 'Trigracerides', 'Male: <150\nFemale: <150', 'mg/dL\nmg/dL').unit)}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>{getParam('hdl', 'HDL-c', 'Male: =>40\nFemale: =>40', 'mg/dL\nmg/dL').name}</td>
                                        <td>{reportData.results.lipid?.hdl || '-'}</td>
                                        <td>{renderMultiline(getParam('hdl', 'HDL-c', 'Male: =>40\nFemale: =>40', 'mg/dL\nmg/dL').range)}</td>
                                        <td>{renderMultiline(getParam('hdl', 'HDL-c', 'Male: =>40\nFemale: =>40', 'mg/dL\nmg/dL').unit)}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>{getParam('ldl', 'LDL-c', '<130', 'mg/dL').name}</td>
                                        <td>{reportData.results.lipid?.ldl || '-'}</td>
                                        <td>{renderMultiline(getParam('ldl', 'LDL-c', '<130', 'mg/dL').range)}</td>
                                        <td>{renderMultiline(getParam('ldl', 'LDL-c', '<130', 'mg/dL').unit)}</td>
                                    </tr>
                                    <tr><td colSpan={6}><hr className="hr-thick" /></td></tr>

                                    {/* LFT */}
                                    <tr className="category-row">
                                        <td>Liver Function</td>
                                        <td>{getParam('ast', 'AST', '0-46', 'U/L').name}</td>
                                        <td>{reportData.results.lft?.ast || '-'}</td>
                                        <td>{renderMultiline(getParam('ast', 'AST', '0-46', 'U/L').range)}</td>
                                        <td>{renderMultiline(getParam('ast', 'AST', '0-46', 'U/L').unit)}</td>
                                        <td rowSpan={5}>{reportData.results.lft?.remark || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>{getParam('alt', 'ALT', '0-49', 'U/L').name}</td>
                                        <td>{reportData.results.lft?.alt || '-'}</td>
                                        <td>{renderMultiline(getParam('alt', 'ALT', '0-49', 'U/L').range)}</td>
                                        <td>{renderMultiline(getParam('alt', 'ALT', '0-49', 'U/L').unit)}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>{getParam('alp', 'ALP', 'Male: 80-306\nFemale: 64-306', 'U/L\nU/L').name}</td>
                                        <td>{reportData.results.lft?.alp || '-'}</td>
                                        <td>{renderMultiline(getParam('alp', 'ALP', 'Male: 80-306\nFemale: 64-306', 'U/L\nU/L').range)}</td>
                                        <td>{renderMultiline(getParam('alp', 'ALP', 'Male: 80-306\nFemale: 64-306', 'U/L\nU/L').unit)}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>{getParam('tb', 'TB', '0-1.2', 'mg/dL').name}</td>
                                        <td>{reportData.results.lft?.tb || '-'}</td>
                                        <td>{renderMultiline(getParam('tb', 'TB', '0-1.2', 'mg/dL').range)}</td>
                                        <td>{renderMultiline(getParam('tb', 'TB', '0-1.2', 'mg/dL').unit)}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>{getParam('cb', 'CB', '0-0.4', 'mg/dL').name}</td>
                                        <td>{reportData.results.lft?.cb || '-'}</td>
                                        <td>{renderMultiline(getParam('cb', 'CB', '0-0.4', 'mg/dL').range)}</td>
                                        <td>{renderMultiline(getParam('cb', 'CB', '0-0.4', 'mg/dL').unit)}</td>
                                    </tr>
                                    <tr><td colSpan={6}><hr className="hr-thick" /></td></tr>

                                    {/* UA & PSA */}
                                    <tr className="category-row">
                                        <td>Urine Analysis</td>
                                        <td>{getParam('ua', 'Sugar & Protein', 'NA', '').name}</td>
                                        <td>{reportData.results.consultation?.ua_result || '-'}</td>
                                        <td>{renderMultiline(getParam('ua', 'Sugar & Protein', 'NA', '').range)}</td>
                                        <td>{renderMultiline(getParam('ua', 'Sugar & Protein', 'NA', '').unit)}</td>
                                        <td>{reportData.results.consultation?.ua_remark || '-'}</td>
                                    </tr>
                                    <tr className="category-row">
                                        <td>PSA</td>
                                        <td>{getParam('psa', 'PSA', 'NA', '').name}</td>
                                        <td>{reportData.results.consultation?.psa || '-'}</td>
                                        <td>{renderMultiline(getParam('psa', 'PSA', 'NA', '').range)}</td>
                                        <td>{renderMultiline(getParam('psa', 'PSA', 'NA', '').unit)}</td>
                                        <td>{reportData.results.consultation?.psa_remark || '-'}</td>
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
                                            <img src={`${(window as any).API_BASE_URL}${reportData.branding.signature_image}`} alt="Signature" className="sig-img border-0 bg-transparent mix-blend-multiply" />
                                        ) : (
                                            <div className="sig-img">&#123;signature&#125;</div>
                                        )}
                                        <div className="sig-name">{reportData.branding?.doctor_name}</div>
                                        <div className="sig-title">{reportData.branding?.doctor_post}</div>
                                    </div>
                                </div>
                                {reportData.branding?.footer_image ? (
                                    <img src={`${(window as any).API_BASE_URL}${reportData.branding.footer_image}`} alt="Footer" className="report-footer-img border-0" />
                                ) : (
                                    <div className="report-footer-img">result_footer</div>
                                )}
                            </div>
                        </div>

                        {/* PAGE 2 */}
                        <div className="a4-page shadow-2xl">
                            <div className="report-branding">
                                {reportData.branding?.header_image ? (
                                    <img src={`${(window as any).API_BASE_URL}${reportData.branding.header_image}`} alt="Header" className="report-header-img border-0" />
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
                                            <td className="border-0">{reportData.results.director?.hx_pe || reportData.results.consultation?.hx_pe || '-'}</td>
                                        </tr>
                                        <tr style={{ padding: '5px 0', borderBottom: '1px solid #ccc' }}>
                                            <td className="font-bold border-0 text-center">2.</td>
                                            <td className="border-0">Relevant Laboratory Investigations:</td>
                                            <td className="border-0">{reportData.results.director?.lab_remark || reportData.results.consultation?.lab_remark || '-'}</td>
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
                                    <span><span className="vital-label text-slate-500">Unit:</span> mm/Hg</span>
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
                                            <img src={`${(window as any).API_BASE_URL}${reportData.branding.signature_image}`} alt="Signature" className="sig-img border-0 bg-transparent mix-blend-multiply" />
                                        ) : (
                                            <div className="sig-img">&#123;signature&#125;</div>
                                        )}
                                        <div className="sig-name">{reportData.branding?.doctor_name}</div>
                                        <div className="sig-title">{reportData.branding?.doctor_post}</div>
                                    </div>
                                </div>
                                {reportData.branding?.footer_image ? (
                                    <img src={`${(window as any).API_BASE_URL}${reportData.branding.footer_image}`} alt="Footer" className="report-footer-img border-0" />
                                ) : (
                                    <div className="report-footer-img">result_footer</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Technical Files Redirect Button at the bottom */}
                <div className="no-print flex justify-center mt-6 w-full">
                    <Button asChild className="w-full sm:w-auto h-12 rounded-xl px-8 font-black shadow-lg border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 text-sm gap-2" variant="outline">
                        <Link to="/patient/files">
                            <HugeiconsIcon icon={Attachment01Icon} className="h-5 w-5" />
                            Technical Files
                        </Link>
                    </Button>
                </div>

                {/* Report Action Progress Modal (Download / Email) */}
                <SingleReportProgressModal
                    state={reportActionModal}
                    onClose={() => setReportActionModal(prev => ({ ...prev, isOpen: false }))}
                    onRetry={reportActionModal.action === 'email' ? handleEmailReport : handleDownloadPDF}
                />
            </div>
        </PatientLayout>
    );
};

export default PatientMedicalReport;
