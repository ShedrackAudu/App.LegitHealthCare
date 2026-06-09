import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Cancel01Icon, 
  PrinterIcon,
  Shield01Icon,
  Download01Icon,
  Loading03Icon
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import { toJpeg } from 'html-to-image';
import axios from 'axios';
import { ModeToggle } from '@/components/mode-toggle';
import { API_BASE_URL } from '../lib/api';
import '@/styles/PatientReport.css';

const PublicReportPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReportData = async () => {
            if (!token) return;
            try {
                const res = await axios.get(`/api/public/verify/${token}/report-data`);
                setReportData(res.data);
            } catch (err: any) {
                console.error("Failed to load clinical report:", err);
                toast.error("Failed to load verified clinical data");
            } finally {
                setLoading(false);
            }
        };
        fetchReportData();
    }, [token]);

    const handlePrint = () => window.print();

    const generateFrontendPDF = async (): Promise<Blob> => {
        const pages = document.querySelectorAll('.a4-page');
        if (pages.length === 0) throw new Error("Report pages not found in DOM");

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < pages.length; i++) {
            const pageEl = pages[i] as HTMLElement;
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
        const pId = reportData?.selected_patient?.patient_id || 'UNKNOWN';
        const dpt = reportData?.selected_patient?.department?.replace(/\s+/g, '') || 'Dept';
        const sId = reportData?.selected_patient?.staff_id || 'UNKNOWN';
        return `LHCSL${reportData?.bio?.screening_year || ''}_Verified_${pId}_${dpt}_${sId}.pdf`;
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
            const msg = err.message || String(err) || 'Failed to generate PDF.';
            toast.error(`Error: ${msg}`, { id: 'pdfGen' });
        }
    };

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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-background">
                <HugeiconsIcon icon={Loading03Icon} className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs animate-pulse">Loading Verified Digital Report...</p>
            </div>
        );
    }

    if (!reportData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center p-4 bg-background">
                <div className="p-4 bg-destructive/10 rounded-2xl mb-4">
                    <HugeiconsIcon icon={Cancel01Icon} className="h-12 w-12 text-destructive" />
                </div>
                <h2 className="text-xl font-black mb-2">Verified Report Not Found</h2>
                <p className="text-muted-foreground max-w-sm mb-6">This verification token is invalid or the medical report is no longer available.</p>
                <Button onClick={() => navigate(`/verify/${token}`)}>Back to Verification</Button>
            </div>
        );
    }

    const { selected_patient } = reportData;

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
        <div className="h-full overflow-y-auto bg-background text-foreground pb-12 relative print:bg-transparent">
            {/* Control Bar - hidden on print */}
            <div className="flex flex-col md:flex-row items-center justify-between bg-card/85 p-4 rounded-b-2xl border-b shadow-lg sticky top-0 z-50 backdrop-blur-md no-print gap-4 px-6 sm:px-12">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button variant="outline" className="rounded-xl border-2 font-bold w-full md:w-auto text-xs" onClick={() => navigate(`/verify/${token}`)}>
                        <HugeiconsIcon icon={Cancel01Icon} className="mr-2 h-4 w-4" /> Close Viewer
                    </Button>
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full shrink-0">
                        <HugeiconsIcon icon={Shield01Icon} className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">Verified Digital Copy</span>
                    </div>
                </div>
                
                <div className="flex items-center justify-end gap-3 w-full md:w-auto">
                    <ModeToggle />
                    <Button className="rounded-xl shadow-lg border-2 font-bold px-4 sm:px-6 text-xs" onClick={handlePrint}>
                        <HugeiconsIcon icon={PrinterIcon} className="sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Print Report</span>
                    </Button>
                    <Button className="rounded-xl shadow-lg border-2 font-bold px-4 sm:px-6 border-indigo-500 text-indigo-500 hover:bg-indigo-50 text-xs" variant="outline" onClick={handleDownloadPDF}>
                        <HugeiconsIcon icon={Download01Icon} className="sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Download PDF</span>
                    </Button>
                </div>
            </div>

            <div className="flex flex-col items-center gap-1.5 py-6 px-4 overflow-x-auto print-container bg-muted/30 dark:bg-background rounded-3xl border-border print:bg-transparent print:border-0 print:p-0 print:overflow-visible">
                {/* PAGE 1 */}
                <div className="a4-page shadow-2xl rounded-2xl border bg-white dark:bg-white text-black print:shadow-none print:border-0 print:rounded-none">
                    {/* Branding Header Area */}
                    <div className="report-branding">
                        {reportData.branding?.header_image ? (
                            <img src={`${API_BASE_URL}${reportData.branding.header_image}`} alt="Header" className="report-header-img border-0" />
                        ) : (
                            <div className="report-header-img">result_header</div>
                        )}
                        <div className="report-title">
                            {reportData.bio.screening_year} ANNUAL MEDICAL SCREENING FOR SUNU HEALTH ENROLLEES AT DANGOTE CEMENT {fmtSec(reportData.bio.section)}, OBAJANA, KOGI STATE.
                        </div>
                    </div>

                    {/* Patient Bio Area */}
                    <div className="report-bio-header">
                        <div className="report-patient-name" style={{ borderTop: '2px solid #000', borderBottom: '1px solid #000', marginTop: '1mm', paddingTop: '1mm', marginBottom: '2mm', paddingBottom: '1mm' }}>
                            {mkName(selected_patient.first_name, selected_patient.middle_name, selected_patient.last_name)}
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
                                <div className="bio-row flex justify-between"><span className="bio-label font-bold text-[#00897b]">Ref:</span><span className="text-[#333]">{mkRef(reportData.bio.screening_year, reportData.bio.section, reportData.bio.patient_id)}</span></div>
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
                                <td>{getParam('lymphocyte', 'Lymphocryte', '19.1-48', '%').name}</td>
                                <td>{reportData.results.fbc?.lymp_percent || '-'}</td>
                                <td>{renderMultiline(getParam('lymphocyte', 'Lymphocryte', '19.1-48', '%').range)}</td>
                                <td>{renderMultiline(getParam('lymphocyte', 'Lymphocryte', '19.1-48', '%').unit)}</td>
                            </tr>
                            <tr>
                                <td></td>
                                <td>{getParam('neutrophil', 'Neutrophil', '43.6-73.3', '%').name}</td>
                                <td>{reportData.results.fbc?.gra_percent || '-'}</td>
                                <td>{renderMultiline(getParam('neutrophil', 'Neutrophil', '43.6-73.3', '%').range)}</td>
                                <td>{renderMultiline(getParam('neutrophil', 'Neutrophil', '43.6-73.3', '%').unit)}</td>
                            </tr>
                            <tr>
                                <td></td>
                                <td>{getParam('mixed', 'Mixed', '4.5-12.1', '%').name}</td>
                                <td>{reportData.results.fbc?.mid_percent || '-'}</td>
                                <td>{renderMultiline(getParam('mixed', 'Mixed', '4.5-12.1', '%').range)}</td>
                                <td>{renderMultiline(getParam('mixed', 'Mixed', '4.5-12.1', '%').unit)}</td>
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
                                    <img src={`${API_BASE_URL}${reportData.branding.signature_image}`} alt="Signature" className="sig-img border-0 bg-transparent mix-blend-multiply" />
                                ) : (
                                    <div className="sig-img">&#123;signature&#125;</div>
                                )}
                                <div className="sig-name">{reportData.branding?.doctor_name}</div>
                                <div className="sig-title">{reportData.branding?.doctor_post}</div>
                            </div>
                        </div>
                        {reportData.branding?.footer_image ? (
                            <img src={`${API_BASE_URL}${reportData.branding.footer_image}`} alt="Footer" className="report-footer-img border-0" />
                        ) : (
                            <div className="report-footer-img">result_footer</div>
                        )}
                        <div className="report-page-number">Page 1 of 2</div>
                    </div>
                </div>

                {/* PAGE 2 */}
                <div className="a4-page shadow-2xl rounded-2xl border bg-white dark:bg-white text-black mt-6 print:mt-0 print:shadow-none print:border-0 print:rounded-none">
                    <div className="report-branding">
                        {reportData.branding?.header_image ? (
                            <img src={`${API_BASE_URL}${reportData.branding.header_image}`} alt="Header" className="report-header-img border-0" />
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
                                    <img src={`${API_BASE_URL}${reportData.branding.signature_image}`} alt="Signature" className="sig-img border-0 bg-transparent mix-blend-multiply" />
                                ) : (
                                    <div className="sig-img">&#123;signature&#125;</div>
                                )}
                                <div className="sig-name">{reportData.branding?.doctor_name}</div>
                                <div className="sig-title">{reportData.branding?.doctor_post}</div>
                            </div>
                        </div>
                        {reportData.branding?.footer_image ? (
                            <img src={`${API_BASE_URL}${reportData.branding.footer_image}`} alt="Footer" className="report-footer-img border-0" />
                        ) : (
                            <div className="report-footer-img">result_footer</div>
                        )}
                        <div className="report-page-number">Page 2 of 2</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicReportPage;
