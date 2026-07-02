import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  File01Icon, 
  Download01Icon, 
  Mail01Icon, 
  Loading03Icon, 
  Cancel01Icon, 
  PrinterIcon 
} from '@hugeicons/core-free-icons';
import { PatientSearch } from '@/components/PatientSearch';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/context/AppContext';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import { toJpeg } from 'html-to-image';
import { FileAttachmentSection } from '@/components/FileAttachmentSection';
import JSZip from 'jszip';
import '@/styles/PatientReport.css';

const PatientReportPage: React.FC = () => {
    const { activeSection, activeYear } = useAppContext();
    const [searchParams] = useSearchParams();
    const staffIdParam = searchParams.get('staff_id');
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [rangeInput, setRangeInput] = useState('');
    const [emailRangeInput, setEmailRangeInput] = useState('');
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkEmailLoading, setBulkEmailLoading] = useState(false);
    const [bulkDownloadEnabled, setBulkDownloadEnabled] = useState(true);
    const [bulkEmailEnabled, setBulkEmailEnabled] = useState(true);
    const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; name: string } | null>(null);
    const [excludeEmail, setExcludeEmail] = useState(true);

    useEffect(() => {
        const checkBulkStatuses = async () => {
            try {
                const res = await api.get('/api/config/bulk-report-download-status');
                if (res.data && res.data.bulk_report_download_enabled !== undefined) {
                    setBulkDownloadEnabled(res.data.bulk_report_download_enabled);
                }
            } catch (err) {
                console.error('Failed to fetch bulk report download status:', err);
            }
            try {
                const res = await api.get('/api/config/bulk-report-email-status');
                if (res.data && res.data.bulk_report_email_enabled !== undefined) {
                    setBulkEmailEnabled(res.data.bulk_report_email_enabled);
                }
            } catch (err) {
                console.error('Failed to fetch bulk report email status:', err);
            }
        };
        checkBulkStatuses();
    }, []);

    const handleBulkDownload = async () => {
        if (!bulkDownloadEnabled) {
            toast.error("Bulk report downloading is currently disabled by the system administrator.");
            return;
        }
        if (!rangeInput.trim()) {
            toast.error("Please enter a valid Patient ID range (e.g. 1-100)");
            return;
        }
        setBulkLoading(true);
        setBulkProgress({ current: 0, total: 100, name: 'Scanning for completed reports...' });
        
        const originalPatient = selectedPatient;
        const originalReportData = reportData;
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        try {
            // 1. Get the list of matching patients from the backend
            const response = await api.get(`/api/patient-report/bulk-download`, {
                params: {
                    range: rangeInput,
                    year: activeYear,
                    company: activeSection,
                    list_only: 'true',
                    exclude_email: excludeEmail ? 'true' : 'false'
                },
                headers: {
                    'X-Company-Context': activeSection
                }
            });
            
            const patientsList = response.data.patients || [];
            if (patientsList.length === 0) {
                toast.error("No completed reports found in the specified range.", { id: 'bulkDownload' });
                setBulkProgress(null);
                setBulkLoading(false);
                return;
            }

            toast.loading(`Found ${patientsList.length} completed reports. Starting pixel-perfect PDF rendering...`, { id: 'bulkDownload' });

            const zip = new JSZip();

            // 2. Loop through each patient, load their data, and render the PDF
            for (let i = 0; i < patientsList.length; i++) {
                const patientInfo = patientsList[i];
                setBulkProgress({ 
                    current: i + 1, 
                    total: patientsList.length, 
                    name: `${patientInfo.first_name} ${patientInfo.last_name}` 
                });

                // Fetch details
                const detailRes = await api.get(`/api/patient-report/${patientInfo.staff_id}/${activeYear}`, {
                    headers: { 'X-Company-Context': activeSection }
                });

                // Swap states to trigger rendering of the report pages
                setSelectedPatient(patientInfo);
                setReportData(detailRes.data);

                // Wait 400ms for React rendering and browser layout calculations
                await delay(400);

                // Capture PDF
                const pdfBlob = await generateFrontendPDF();

                // Add to ZIP (using individual download filename format)
                const bio = detailRes.data.bio || {};
                const pId = bio.patient_id || patientInfo.patient_id || 'UNKNOWN';
                const dpt = bio.department?.replace(/\s+/g, '') || 'Dept';
                const sId = bio.staff_id || patientInfo.staff_id || 'UNKNOWN';
                const filename = `LHCSL${activeYear}${activeSection.toUpperCase()}${pId}_${dpt}_${sId}.pdf`;
                
                zip.file(filename, pdfBlob);
            }

            setBulkProgress(prev => prev ? { ...prev, name: 'Compiling ZIP package...' } : null);
            const zipBlob = await zip.generateAsync({ type: 'blob' });

            const url = window.URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Bulk_Reports_${activeSection}_${activeYear}_${rangeInput.replace(/\s+/g, '')}.zip`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success('Bulk reports downloaded successfully', { id: 'bulkDownload' });
        } catch (err: any) {
            console.error('Bulk download error:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to download reports';
            toast.error(errorMsg, { id: 'bulkDownload' });
        } finally {
            setSelectedPatient(originalPatient);
            setReportData(originalReportData);
            setBulkProgress(null);
            setBulkLoading(false);
        }
    };

    const handleBulkEmail = async () => {
        if (!bulkEmailEnabled) {
            toast.error("Bulk report emailing is currently disabled by the system administrator.");
            return;
        }
        if (!emailRangeInput.trim()) {
            toast.error("Please enter a valid Patient ID range (e.g. 1-100)");
            return;
        }
        setBulkEmailLoading(true);
        setBulkProgress({ current: 0, total: 100, name: 'Scanning for completed reports with emails...' });
        
        const originalPatient = selectedPatient;
        const originalReportData = reportData;
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        try {
            // 1. Get the list of matching patients from the backend
            const response = await api.get(`/api/patient-report/bulk-download`, {
                params: {
                    range: emailRangeInput,
                    year: activeYear,
                    company: activeSection,
                    list_only: 'true',
                    only_with_email: 'true'
                },
                headers: {
                    'X-Company-Context': activeSection
                }
            });
            
            const patientsList = response.data.patients || [];
            if (patientsList.length === 0) {
                toast.error("No completed reports with email addresses found in the specified range.", { id: 'bulkEmail' });
                setBulkProgress(null);
                setBulkEmailLoading(false);
                return;
            }

            toast.loading(`Found ${patientsList.length} completed reports with emails. Starting PDF generation & email transmission...`, { id: 'bulkEmail' });

            const blobToBase64 = (b: Blob): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const res = reader.result as string;
                        const b64 = res.split(',')[1];
                        resolve(b64);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(b);
                });
            };

            // 2. Loop through each patient, load their data, and render/email the PDF
            for (let i = 0; i < patientsList.length; i++) {
                const patientInfo = patientsList[i];
                setBulkProgress({ 
                    current: i + 1, 
                    total: patientsList.length, 
                    name: `Emailing: ${patientInfo.first_name} ${patientInfo.last_name}` 
                });

                // Fetch details
                const detailRes = await api.get(`/api/patient-report/${patientInfo.staff_id}/${activeYear}`, {
                    headers: { 'X-Company-Context': activeSection }
                });

                // Swap states to trigger rendering of the report pages
                setSelectedPatient(patientInfo);
                setReportData(detailRes.data);

                // Wait 400ms for React rendering and browser layout calculations
                await delay(400);

                // Capture PDF
                const pdfBlob = await generateFrontendPDF();
                const b64data = await blobToBase64(pdfBlob);

                const pEmail = detailRes.data.bio?.email || patientInfo.email || '';
                if (!pEmail || !pEmail.trim()) {
                    console.warn(`Skipping patient ${patientInfo.staff_id} because email is missing.`);
                    continue;
                }

                let companyName = 'Legit HealthCare';
                if (activeSection === 'DCT') companyName = 'Dangote Cement Transport';
                if (activeSection === 'DCP') companyName = 'Dangote Cement Plant';

                // Use individual download filename format
                const bio = detailRes.data.bio || {};
                const pId = bio.patient_id || patientInfo.patient_id || 'UNKNOWN';
                const dpt = bio.department?.replace(/\s+/g, '') || 'Dept';
                const sId = bio.staff_id || patientInfo.staff_id || 'UNKNOWN';
                const filename = `LHCSL${activeYear}${activeSection.toUpperCase()}${pId}_${dpt}_${sId}.pdf`;

                const payloadData = {
                    report_data: {
                        ...detailRes.data,
                        bio: {
                            ...detailRes.data.bio,
                            section: activeSection,
                            screening_year: activeYear,
                        }
                    },
                    email: pEmail,
                    first_name: patientInfo.first_name || 'Patient',
                    screening_year: activeYear,
                    company: companyName,
                    staff_id: patientInfo.staff_id || '',
                    attachment_data: b64data,
                    attachment_filename: filename
                };

                // Send email
                await api.post('/api/email/report', payloadData);
            }
            
            toast.success(`Bulk reports successfully emailed to ${patientsList.length} patients!`, { id: 'bulkEmail' });
        } catch (err: any) {
            console.error('Bulk email error:', err);
            const errorMsg = err.response?.data?.error || err.message || 'Failed to bulk email reports';
            toast.error(errorMsg, { id: 'bulkEmail' });
        } finally {
            setSelectedPatient(originalPatient);
            setReportData(originalReportData);
            setBulkProgress(null);
            setBulkEmailLoading(false);
        }
    };

    const handleSearchById = async (id: string, searchType?: 'pid' | 'general') => {
        if (!id) return;
        setSearching(true);
        try {
            const pRes = await api.get(`/patient/${id}?year=${activeYear}&strict=true&search_type=${searchType || 'general'}`, {
                headers: { 'X-Company-Context': activeSection }
            });
            if (pRes.data) handleSelectPatient(pRes.data);
        } catch (err) {
            toast.error("Patient not found");
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        if (staffIdParam) {
            handleSearchById(staffIdParam, 'general');
        }
    }, [staffIdParam, activeYear, activeSection]);

    const handleSelectPatient = async (patient: any) => {
        setLoading(true);
        setSelectedPatient(patient);
        try {
            const res = await api.get(`/api/patient-report/${patient.staff_id}/${activeYear}`, {
                headers: { 'X-Company-Context': activeSection }
            });
            setReportData(res.data);
            toast.success("Report generated successfully");
        } catch (err) {
            toast.error("Failed to load clinical data");
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => window.print();

    const buildReportPayload = () => ({
        report_data: {
            ...reportData,
            bio: {
                ...reportData.bio,
                section: activeSection,
                screening_year: activeYear,
            }
        }
    });

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
        const pId = selectedPatient?.patient_id || 'UNKNOWN';
        const dpt = selectedPatient?.department?.replace(/\s+/g, '') || 'Dept';
        const sId = selectedPatient?.staff_id || 'UNKNOWN';
        return `LHCSL${activeYear}${activeSection.toUpperCase()}${pId}_${dpt}_${sId}.pdf`;
    };

    const handleDownloadPDF = async () => {
        if (!selectedPatient || !reportData) return;
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

            // Log download to audit trail
            try {
                const sId = selectedPatient?.staff_id;
                if (sId) {
                    await api.post('/api/patient/reports/log-download', {
                        staff_id: sId,
                        screening_year: activeYear,
                        section: activeSection
                    });
                }
            } catch (auditErr) {
                console.error("Failed to log report download audit action", auditErr);
            }
        } catch (err: any) {
            console.error('PDF error:', err);
            const msg = err.message || String(err) || 'Failed to generate frontend PDF.';
            toast.error(`Error: ${msg}`, { id: 'pdfGen' });
        }
    };

    const handleEmailPDF = async () => {
        if (!selectedPatient || !reportData) return;
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

            const pEmail = reportData.bio?.email || selectedPatient.email_address || selectedPatient.email || '';
            let companyName = 'Legit HealthCare';
            if (activeSection === 'DCT') companyName = 'Dangote Cement Transport';
            if (activeSection === 'DCP') companyName = 'Dangote Cement Plant';

            const payloadData = {
                ...buildReportPayload(),
                email: pEmail,
                first_name: selectedPatient.first_name || 'Patient',
                screening_year: activeYear,
                company: companyName,
                staff_id: selectedPatient.staff_id || '',
                attachment_data: b64data,
                attachment_filename: getDownloadFilename()
            };

            const res = await api.post('/api/email/report', payloadData);
            toast.success(res.data.message || 'Email sent successfully!', { id: 'emailSend' });
        } catch (err: any) {
            console.error('Email error:', err);
            const msg = err.response?.data?.error || 'Failed to send email. Check SMTP settings.';
            toast.error(msg, { id: 'emailSend' });
        }
    };

    // Data Formatter Helpers
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
        <MainLayout>
            {/* All UI chrome — hidden on print */}
            <div className="space-y-3 animate-in fade-in duration-500 pb-4 no-print">
                <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 sm:gap-6 bg-card p-4 sm:p-6 rounded-2xl border transition-all">
                    <div className="flex flex-col items-start sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <div className="p-1.5 sm:p-3 bg-red-500/10 rounded-xl sm:rounded-2xl">
                            <HugeiconsIcon icon={File01Icon} className="text-red-500 h-5 w-5 sm:h-8 sm:w-8" />
                        </div>
                        <div>
                            <h1 className="text-base sm:text-2xl font-black tracking-tight text-foreground leading-tight">Patient Medical Report</h1>
                            <p className="text-[9px] sm:text-sm text-muted-foreground font-medium">Session: {activeYear} • {fmtSec(activeSection)}</p>
                        </div>
                    </div>
                    <PatientSearch
                        activeSection={activeSection}
                        onSelect={handleSelectPatient}
                        onSearch={handleSearchById}
                        searching={searching || loading}
                        themeColor="primary"
                        placeholder="Search Staff ID or Name..."
                        buttonText="Retrieve Report"
                        year={activeYear}
                        strict={true}
                        showPidToggle={true}
                    />
                </div>
            </div>{/* end no-print chrome */}

            {/* Report pages — visible on screen and during print */}
            {selectedPatient && (
                <div className="space-y-1.5 animate-in slide-in-from-bottom-8 duration-500">
                    <div className="flex flex-col md:flex-row items-center justify-between bg-card/80 p-4 rounded-2xl border-2 shadow-lg sticky top-0 z-50 backdrop-blur-md no-print gap-4">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <Button variant="outline" className="w-full md:w-auto rounded-xl border-2 font-bold"
                                onClick={() => { setSelectedPatient(null); setReportData(null); }}>
                                <HugeiconsIcon icon={Cancel01Icon} className="mr-2 h-4 w-4" /> Close Report
                            </Button>
                        </div>
                        <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 w-full md:w-auto">
                            <Button className="flex-1 md:flex-none rounded-xl shadow-lg border-2 font-bold px-4 sm:px-6 text-xs sm:text-sm" onClick={handlePrint}>
                                <HugeiconsIcon icon={PrinterIcon} className="sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Print Report</span>
                            </Button>
                            <Button className="flex-1 md:flex-none rounded-xl shadow-lg border-2 font-bold px-4 sm:px-6 border-indigo-500 text-indigo-500 hover:bg-indigo-50 text-xs sm:text-sm" variant="outline" onClick={handleDownloadPDF}>
                                <HugeiconsIcon icon={Download01Icon} className="sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Download PDF</span>
                            </Button>
                            <Button className="flex-1 md:flex-none rounded-xl shadow-lg border-2 font-bold px-4 sm:px-6 bg-indigo-600 text-white hover:bg-indigo-700 text-xs sm:text-sm" onClick={handleEmailPDF}>
                                <HugeiconsIcon icon={Mail01Icon} className="sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Email Patient</span>
                            </Button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="w-full max-w-4xl mx-auto space-y-8 animate-pulse mt-6">
                            {/* Fake A4 Page 1 Skeleton */}
                            <div className="bg-card border rounded-2xl p-6 sm:p-8 shadow-md space-y-6">
                                {/* Header / Branding */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b">
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
                                    <div className="border rounded-xl overflow-hidden">
                                        <div className="bg-muted/20 h-10 border-b flex items-center px-4 justify-between">
                                            <Skeleton className="h-4 w-24 bg-muted/40 rounded" />
                                            <Skeleton className="h-4 w-16 bg-muted/40 rounded" />
                                            <Skeleton className="h-4 w-16 bg-muted/40 rounded" />
                                        </div>
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className="h-12 border-b flex items-center px-4 justify-between last:border-0">
                                                <Skeleton className="h-4 w-32 bg-muted/40 rounded" />
                                                <Skeleton className="h-4 w-12 bg-muted/40 rounded" />
                                                <Skeleton className="h-4 w-20 bg-muted/40 rounded" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : reportData ? (
                        <>
                            <div className="flex flex-col items-center gap-1.5 py-1.5 px-4 overflow-x-auto print-container bg-muted/30 dark:bg-background rounded-3xl border-2 border-dashed border-border print:bg-transparent print:border-0 print:p-0 print:overflow-visible" style={{ padding: '0.4rem' }}>
                            {/* PAGE 1 */}
                            <div className="a4-page">
                                {/* Branding Header Area */}
                                <div className="report-branding">
                                    {reportData.branding?.header_image ? (
                                        <img src={`${(window as any).API_BASE_URL}${reportData.branding.header_image}`} alt="Header" className="report-header-img border-0" />
                                    ) : (
                                        <div className="report-header-img">result_header</div>
                                    )}
                                    <div className="report-title">
                                        {activeYear} ANNUAL MEDICAL SCREENING FOR SUNU HEALTH ENROLLEES AT DANGOTE CEMENT {fmtSec(activeSection)}, OBAJANA, KOGI STATE.
                                    </div>
                                </div>

                                {/* Patient Bio Area */}
                                <div className="report-bio-header">
                                    <div className="report-patient-name" style={{ borderTop: '2px solid #000', borderBottom: '1px solid #000', marginTop: '1mm', paddingTop: '1mm', marginBottom: '2mm', paddingBottom: '1mm' }}>
                                        {mkName(selectedPatient.first_name, selectedPatient.middle_name, selectedPatient.last_name)}
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
                                            <div className="bio-row flex justify-between"><span className="bio-label font-bold text-[#00897b]">Email:</span><span className="text-[#333] truncate ml-2" title={reportData.bio.email}>{reportData.bio.email || '-'}</span></div>
                                            <div className="bio-row flex justify-between"><span className="bio-label font-bold text-[#00897b]">Nationality:</span><span className="text-[#333]">{reportData.bio.nationality || '-'}</span></div>
                                            <div className="bio-row flex justify-between"><span className="bio-label font-bold text-[#00897b]">Ref:</span><span className="text-[#333]">{mkRef(activeYear, activeSection, reportData.bio.patient_id)}</span></div>
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
                                    <div className="report-page-number">Page 1 of 2</div>
                                </div>
                            </div>

                            {/* PAGE 2 */}
                            <div className="a4-page">
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
                                <div className="report-list" style={{ marginBottom: '8px' }}>
                                    <div className="report-list-item" style={{ minHeight: '3.6em' }}><div className="idx">1.</div><div> {reportData.results.director?.comment_one || '-'}</div></div>
                                    <div className="report-list-item" style={{ minHeight: '3.6em' }}><div className="idx">2.</div><div> {reportData.results.director?.comment_two || '-'}</div></div>
                                    <div className="report-list-item" style={{ minHeight: '3.6em' }}><div className="idx">3.</div><div> {reportData.results.director?.comment_three || '-'}</div></div>
                                    <div className="report-list-item" style={{ minHeight: '3.6em' }}><div className="idx">4.</div><div> {reportData.results.director?.comment_four || '-'}</div></div>
                                </div>

                                <div className="report-section-title">CERTIFICATIONS</div>
                                <div className="cert-text pb-1 mb-1" style={{ fontSize: '10.5px' }}>
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
                                    <div className="report-page-number">Page 2 of 2</div>
                                </div>
                            </div>
                        </div>

                        {/* Technical Attachments / Uploaded Patient Files Section */}
                        <div className="mt-8 no-print w-full max-w-[21cm] mx-auto">
                            <Card className="p-6 border-2 shadow-xl rounded-3xl bg-card">
                                <FileAttachmentSection 
                                    staffId={selectedPatient.staff_id} 
                                    year={activeYear} 
                                    allowUpload={false} 
                                    allowDownload={true} 
                                />
                            </Card>
                        </div>
                        </>
                    ) : (
                        <Card className="border-2 border-dashed flex items-center justify-center min-h-[20rem] bg-muted/5 mt-8 p-6 no-print">
                            <div className="text-center space-y-3">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4 transition-transform hover:scale-110 duration-300">
                                    <HugeiconsIcon icon={File01Icon} className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground/50" />
                                </div>
                                <p className="text-muted-foreground font-bold text-base sm:text-lg italic px-4 leading-snug">
                                    No diagnostic data found for this patient in {activeYear}.
                                </p>
                                <div className="flex flex-col items-center gap-1 sm:gap-2">
                                    <div className="h-px w-8 bg-muted-foreground/20" />
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black">
                                        Context: {activeSection} Clinic • {activeYear}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {!selectedPatient && (
                <div className="no-print space-y-6 mt-8">
                    {/* Search Instructions Card */}
                    <Card className="border-2 border-dashed flex items-center justify-center min-h-[16rem] bg-muted/5 p-6 rounded-3xl w-full">
                        <div className="text-center space-y-3">
                            <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4 transition-transform hover:scale-110 duration-500">
                                <HugeiconsIcon icon={File01Icon} className="w-8 h-8 text-muted-foreground/30" />
                            </div>
                            <h2 className="text-xl font-black tracking-tight text-foreground/70">
                                Search a patient to view report
                            </h2>
                            <p className="text-xs sm:text-sm text-muted-foreground font-medium italic">
                                Use the search bar above to retrieve clinical results
                            </p>
                            <div className="flex flex-col items-center gap-2 pt-4">
                                <div className="h-px w-12 bg-muted-foreground/20" />
                                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.3em] font-black">
                                    Secure Medical Records System
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Bulk Actions Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Bulk Download Card */}
                        <Card className="border-2 border-border bg-card p-8 rounded-3xl flex flex-col justify-between min-h-[20rem] shadow-xl hover:shadow-2xl transition-all duration-300">
                            <div className="space-y-4">
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                                    <div className="p-3 bg-indigo-500/10 rounded-2xl">
                                        <HugeiconsIcon icon={Download01Icon} className="text-indigo-600 h-6 w-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-lg font-black tracking-tight text-foreground">Bulk Report Downloader</h2>
                                            {bulkDownloadEnabled ? (
                                                <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full border border-rose-500/20">
                                                    Disabled
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">Download clinical PDFs for hardcopy printing</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-muted/40 rounded-2xl border text-xs space-y-3 text-muted-foreground">
                                    <p className="font-bold text-foreground">Downloads reports meeting these criteria:</p>
                                    <ul className="list-disc list-inside space-y-1 pl-1">
                                        <li>Report progress status is exactly <span className="font-black text-indigo-600 dark:text-indigo-400">100% Complete</span></li>
                                        {excludeEmail && (
                                            <li>No email address is attached to the patient profile</li>
                                        )}
                                    </ul>

                                    <div className="pt-2 border-t flex items-center justify-between gap-4">
                                        <div className="space-y-0.5">
                                            <label htmlFor="exclude-email-toggle" className="font-bold text-foreground cursor-pointer">Only patients without email</label>
                                            <p className="text-[10px] text-muted-foreground">Exclude patients who already have an email address configured.</p>
                                        </div>
                                        <button
                                            type="button"
                                            id="exclude-email-toggle"
                                            onClick={() => setExcludeEmail(!excludeEmail)}
                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${excludeEmail ? 'bg-indigo-600' : 'bg-muted-foreground/30'}`}
                                            disabled={bulkLoading || !bulkDownloadEnabled}
                                        >
                                            <span
                                                className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform duration-200 ${excludeEmail ? 'translate-x-5' : 'translate-x-0.5'}`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="pid-range" className="text-xs font-black uppercase tracking-wider text-muted-foreground">Patient ID Range</Label>
                                    <Input
                                        id="pid-range"
                                        placeholder="e.g. 1-100 or 25"
                                        value={rangeInput}
                                        onChange={(e) => setRangeInput(e.target.value)}
                                        className="rounded-xl border-2 border-border focus-visible:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-55"
                                        disabled={bulkLoading || !bulkDownloadEnabled}
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">Specify range of serial Patient IDs to scan and download as a ZIP file.</p>
                                </div>
                            </div>

                            <Button 
                                onClick={handleBulkDownload}
                                loading={bulkLoading}
                                disabled={!bulkDownloadEnabled}
                                className="w-full mt-6 py-5 rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 disabled:scale-100 disabled:active:scale-100 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                            >
                                {!bulkLoading && <HugeiconsIcon icon={Download01Icon} className="h-4 w-4" />}
                                Bulk Download (ZIP)
                            </Button>
                        </Card>

                        {/* Bulk Email Card */}
                        <Card className="border-2 border-border bg-card p-8 rounded-3xl flex flex-col justify-between min-h-[20rem] shadow-xl hover:shadow-2xl transition-all duration-300">
                            <div className="space-y-4">
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                                    <div className="p-3 bg-indigo-500/10 rounded-2xl">
                                        <HugeiconsIcon icon={Mail01Icon} className="text-indigo-600 h-6 w-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-lg font-black tracking-tight text-foreground">Bulk Report Emailer</h2>
                                            {bulkEmailEnabled ? (
                                                <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full border border-rose-500/20">
                                                    Disabled
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">Automatically email reports to patients</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-muted/40 rounded-2xl border text-xs space-y-3 text-muted-foreground">
                                    <p className="font-bold text-foreground">Emails reports meeting these criteria:</p>
                                    <ul className="list-disc list-inside space-y-1 pl-1">
                                        <li>Report progress status is exactly <span className="font-black text-indigo-600 dark:text-indigo-400">100% Complete</span></li>
                                        <li>Patient has a valid email address configured</li>
                                    </ul>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="bulk-email-pid-range" className="text-xs font-black uppercase tracking-wider text-muted-foreground">Patient ID Range</Label>
                                    <Input
                                        id="bulk-email-pid-range"
                                        placeholder="e.g. 1-100 or 25"
                                        value={emailRangeInput}
                                        onChange={(e) => setEmailRangeInput(e.target.value)}
                                        className="rounded-xl border-2 border-border focus-visible:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-55"
                                        disabled={bulkEmailLoading || !bulkEmailEnabled}
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">Specify range of serial Patient IDs to scan and send email reports.</p>
                                </div>
                            </div>

                            <Button 
                                onClick={handleBulkEmail}
                                loading={bulkEmailLoading}
                                disabled={!bulkEmailEnabled}
                                className="w-full mt-6 py-5 rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 disabled:scale-100 disabled:active:scale-100 transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                            >
                                {!bulkEmailLoading && <HugeiconsIcon icon={Mail01Icon} className="h-4 w-4" />}
                                Bulk Email Reports
                            </Button>
                        </Card>
                    </div>
                </div>
            )}
            {bulkProgress && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                    <div className="max-w-md w-full bg-card border-2 border-primary/10 rounded-3xl p-8 shadow-2xl space-y-6">
                        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                            {/* Outer Pulsing Glow */}
                            <div className="absolute inset-0 rounded-full bg-indigo-500/10 animate-ping" style={{ animationDuration: '2s' }} />
                            
                            {/* Inner Circle Background */}
                            <div className="absolute inset-2 rounded-full bg-card border-2 border-indigo-500/5 shadow-inner flex items-center justify-center z-10">
                                <span className="text-2xl animate-pulse">📄</span>
                            </div>
                            
                            {/* SVG Gradient Spinner */}
                            <svg className="w-full h-full transform -rotate-90 z-20" viewBox="0 0 100 100">
                                <defs>
                                    <linearGradient id="spinnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#4f46e5" />
                                        <stop offset="100%" stopColor="#ec4899" />
                                    </linearGradient>
                                </defs>
                                <circle 
                                    cx="50" 
                                    cy="50" 
                                    r="42" 
                                    className="stroke-muted/30" 
                                    strokeWidth="6" 
                                    fill="transparent" 
                                />
                                <circle 
                                    cx="50" 
                                    cy="50" 
                                    r="42" 
                                    stroke="url(#spinnerGradient)" 
                                    className="transition-all duration-300" 
                                    strokeWidth="6" 
                                    fill="transparent" 
                                    strokeDasharray="264"
                                    strokeDashoffset={264 - (264 * (bulkProgress.current / (bulkProgress.total || 1)))}
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>
                        
                        <div className="space-y-2">
                            <h2 className="text-xl font-black tracking-tight text-foreground">Generating Bulk Reports</h2>
                            <p className="text-sm text-muted-foreground font-semibold">
                                Please do not close or reload this page.
                            </p>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-primary transition-all duration-300 rounded-full"
                                    style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                                />
                            </div>
                            <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-muted-foreground">
                                <span>Report {bulkProgress.current} of {bulkProgress.total}</span>
                                <span>{Math.round((bulkProgress.current / bulkProgress.total) * 100)}%</span>
                            </div>
                        </div>
                        
                        <div className="p-4 rounded-2xl bg-muted/40 border text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 mb-0.5">Processing Patient</p>
                            <p className="text-sm font-black text-foreground truncate">{bulkProgress.name || 'Initial Scanning...'}</p>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};

export default PatientReportPage;
