import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Download, Upload, FileSpreadsheet, Loader2, CheckCircle2, LayoutGrid, Import, User, Activity, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAppContext } from '@/context/AppContext';

const DataManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exporting, setExporting] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const { user, activeSection, activeYear } = useAppContext();

  const handleExport = async (type: 'patients' | 'screening') => {
    setExporting(type);
    try {
      const endpoint = type === 'patients' ? 'export/patients' : 'export/screening';
      const yearParam = type === 'screening' ? `?year=${activeYear}` : '';
      
      const resp = await axios.get(`/api/admin/${endpoint}${yearParam}`, {
        headers: { 
            'X-User-ID': user?.id?.toString(),
            'X-Company-Context': activeSection 
        },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = type === 'patients' 
        ? `${activeSection}_Patient_Directory_${new Date().toISOString().split('T')[0]}.xlsx`
        : `${activeSection}_Screening_Matrix_${activeYear}_${new Date().toISOString().split('T')[0]}.xlsx`;
        
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${type === 'patients' ? 'Patient Directory' : 'Screening Matrix'} exported successfully.`);
    } catch (err: any) {
      if (err.response && err.response.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result as string);
            toast.error(errorData.error || "Failed to trigger data export.");
          } catch (e) {
            toast.error("Failed to trigger data export.");
          }
        };
        reader.readAsText(err.response.data);
      } else {
        toast.error(err.response?.data?.error || "Failed to trigger data export.");
      }
    } finally {
      setExporting(null);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const resp = await axios.post('/api/admin/import', formData, {
        headers: { 
          'X-Company-Context': activeSection,
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success(resp.data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to import data.");
    } finally {
      setImporting(false);
      event.target.value = ''; // Reset input
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const resp = await axios.get('/api/admin/import/patient-template', {
        headers: { 
            'X-User-ID': user?.id?.toString(),
            'X-Company-Context': activeSection 
        },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Bulk_Patient_Import_Template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Import template downloaded.");
    } catch (err: any) {
        if (err.response && err.response.data instanceof Blob) {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const errorData = JSON.parse(reader.result as string);
                    toast.error(errorData.error || "Failed to download template.");
                } catch (e) {
                    toast.error("Failed to download template.");
                }
            };
            reader.readAsText(err.response.data);
        } else {
            toast.error(err.response?.data?.error || err.message || "Failed to download template.");
        }
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl shrink-0">
                <Database className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <h1 className="text-xl sm:text-3xl font-black tracking-tight leading-tight">
                Data Management Hub
              </h1>
            </div>
            <p className="text-muted-foreground font-medium italic text-xs sm:text-base pl-4 border-l-4 border-primary/10 ml-1 py-1">
                Centralized hub for {activeSection} data operations • Session {activeYear}
            </p>
          </div>

          <div className="flex bg-muted/50 p-1.5 rounded-2xl border-2 shadow-sm w-full md:w-auto gap-1">
            <button
              onClick={() => setActiveTab('export')}
              className={`flex-1 px-4 sm:px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === 'export' 
                ? 'bg-primary shadow-lg shadow-primary/20 text-white' 
                : 'text-muted-foreground hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Download className="w-4 h-4" />
              Data Export
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`flex-1 px-4 sm:px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === 'import' 
                ? 'bg-primary shadow-lg shadow-primary/20 text-white' 
                : 'text-muted-foreground hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Upload className="w-4 h-4" />
              Bulk Import
            </button>
          </div>
        </div>

        {activeTab === 'export' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
            {/* Patient Directory Export */}
            <Card className="border-2 shadow-xl hover:border-primary/20 transition-all rounded-3xl overflow-hidden group">
              <div className="h-2 bg-primary w-full opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-4">
                 <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2 border border-primary/20">
                    <User className="w-6 h-6" />
                 </div>
                 <CardTitle className="text-2xl font-black tracking-tight">Patient Directory</CardTitle>
                 <CardDescription className="text-sm font-bold text-muted-foreground">
                    Export all registered bio-data for the current section ({activeSection}).
                 </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="bg-muted/30 border border-muted-foreground/10 rounded-2xl p-4 flex gap-4 items-center">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
                        <FileSpreadsheet className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-tight">Full Archive Export</p>
                        <p className="text-[10px] text-muted-foreground font-medium italic">Includes all 13 bio-data fields.</p>
                    </div>
                 </div>
                 
                 <Button 
                  onClick={() => handleExport('patients')}
                  disabled={!!exporting}
                  className="w-full h-14 rounded-2xl font-black text-sm gap-3 shadow-xl shadow-primary/20 transition-all active:scale-95"
                 >
                    {exporting === 'patients' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                          <Download className="w-5 h-5" />
                          Export Directory
                      </>
                    )}
                 </Button>
              </CardContent>
            </Card>

            {/* Screening Matrix Export */}
            <Card className="border-2 shadow-xl hover:border-indigo-500/20 transition-all rounded-3xl overflow-hidden group">
              <div className="h-2 bg-indigo-500 w-full opacity-50 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-4">
                 <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-2 border border-indigo-500/20">
                    <LayoutGrid className="w-6 h-6" />
                 </div>
                 <CardTitle className="text-2xl font-black tracking-tight">Screening Matrix</CardTitle>
                 <CardDescription className="text-sm font-bold text-muted-foreground">
                    Export all clinical diagnostic results for the {activeYear} session.
                 </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 flex gap-4 items-center">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
                        <Activity className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-tight text-indigo-600">Joined Dataset Engine</p>
                        <p className="text-[10px] text-muted-foreground font-medium italic">Joins FBC, KFT, LFT, Lipid, ECG, and Consultations.</p>
                    </div>
                 </div>
                 
                 <Button 
                  onClick={() => handleExport('screening')}
                  disabled={!!exporting}
                  className="w-full h-14 rounded-2xl font-black text-sm gap-3 shadow-xl shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 text-white transition-all active:scale-95"
                 >
                    {exporting === 'screening' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                          <Download className="w-5 h-5" />
                          Export Screening Matrix
                      </>
                    )}
                 </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="mt-4 max-w-4xl">
            {/* Import Card */}
            <Card className="border-2 shadow-xl rounded-3xl overflow-hidden group border-dashed relative">
              <div className="absolute inset-0 bg-muted/5 z-0" />
              <div className="relative z-10">
                  <CardHeader className="pb-4">
                     <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2 border border-amber-500/20">
                        <Import className="w-6 h-6" />
                     </div>
                      <CardTitle className="text-2xl font-black tracking-tight">Bulk Patient Import</CardTitle>
                      <CardDescription className="text-sm font-bold text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                         <span>Excel-based data ingestion for bulk registration into the {activeSection} directory.</span>
                         <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleDownloadTemplate}
                          className="h-8 rounded-lg font-black text-[10px] gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all shrink-0"
                         >
                            <Download className="w-3.5 h-3.5" />
                            Download Template
                         </Button>
                      </CardDescription>
                   </CardHeader>
                  <CardContent className="space-y-6">
                     <div className="space-y-4">
                        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex gap-4 items-center">
                           <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                           <p className="text-[11px] text-primary dark:text-primary font-bold italic leading-relaxed">
                             Excel headers must match exactly. The system will map data based on the header names provided below.
                           </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {[
                                { name: 'staff_id', req: true, desc: 'Unique identifier' },
                                { name: 'first_name', req: true, desc: 'Patient first name' },
                                { name: 'middle_name', req: false, desc: 'Optional initial' },
                                { name: 'last_name', req: true, desc: 'Patient surname' },
                                { name: 'gender', req: false, desc: 'Male / Female' },
                                { name: 'dob', req: false, desc: 'YYYY-MM-DD' },
                                { name: 'age', req: false, desc: 'Calculated years' },
                                { name: 'department', req: false, desc: 'Work unit' },
                                { name: 'phone', req: false, desc: 'Contact number' },
                                { name: 'email', req: false, desc: 'Official email' },
                                { name: 'race', req: false, desc: 'Ethnicity' },
                                { name: 'nationality', req: false, desc: 'Country' }
                            ].map((col) => (
                                <div key={col.name} className="p-2.5 bg-muted/20 border-2 border-transparent hover:border-amber-500/20 rounded-xl flex items-center justify-between transition-all group">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black font-mono text-primary group-hover:text-amber-600 transition-colors uppercase">{col.name}</span>
                                        <span className="text-[9px] text-muted-foreground font-medium italic">{col.desc}</span>
                                    </div>
                                    {col.req && <span className="text-[7px] font-black bg-rose-500/10 text-rose-600 px-1.5 py-0.5 rounded-md">REQ</span>}
                                </div>
                            ))}
                        </div>
                     </div>
                     
                     <div className="relative">
                       <input 
                        type="file" 
                        id="import-file" 
                        className="hidden" 
                        accept=".xlsx, .xls"
                        onChange={handleImport}
                        disabled={importing}
                       />
                       <Button 
                        onClick={() => document.getElementById('import-file')?.click()}
                        disabled={importing}
                        className="w-full h-14 rounded-2xl font-black text-sm gap-3 shadow-xl shadow-amber-500/20 bg-amber-500 hover:bg-amber-600 text-white transition-all active:scale-95"
                       >
                         {importing ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                         ) : (
                          <>
                            <Upload className="w-5 h-5" />
                            Upload Bio-Data
                          </>
                         )}
                       </Button>
                     </div>
                  </CardContent>
              </div>
            </Card>
          </div>
        )}

        <div className="mt-12 bg-primary/5 border border-primary/10 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 shadow-inner">
            <div className="p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-primary/10 ring-8 ring-primary/5">
                <ShieldCheck className="w-12 h-12 text-primary" />
            </div>
            <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-black tracking-tight mb-2">Secure Data Custodianship</h3>
                <p className="text-sm text-muted-foreground font-medium italic leading-relaxed">
                    Legit HealthCare employs AES-256 encryption for all exported datasets. Every export action is recorded in the 
                    <span className="text-primary font-black mx-1">System Audit Trails</span> to ensure complete chain of custody for sensitive medical records.
                </p>
            </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default DataManagementPage;
