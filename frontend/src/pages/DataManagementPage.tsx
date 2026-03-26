import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Download, Upload, FileSpreadsheet, Loader2, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAppContext } from '@/context/AppContext';

const DataManagementPage: React.FC = () => {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const { user } = useAppContext();

  const handleExport = async () => {
    setExporting(true);
    try {
      const resp = await axios.get('http://localhost:5000/api/admin/export', {
        headers: { 'X-User-ID': user?.id?.toString() },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Clinic_Data_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Data export completed successfully.");
    } catch (err) {
      toast.error("Failed to trigger data export.");
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const resp = await axios.post('http://localhost:5000/api/admin/import', formData, {
        headers: { 
          'X-User-ID': user?.id?.toString(),
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

  return (
    <MainLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Database className="w-8 h-8 text-primary" />
            Data Management & Exports
          </h1>
          <p className="text-muted-foreground font-medium italic mt-1">Import bio-data and download comprehensive system records for offline analysis.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          {/* Export Card */}
          <Card className="border-2 shadow-xl hover:border-primary/20 transition-all rounded-3xl overflow-hidden group">
            <div className="h-2 bg-primary w-full opacity-50 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="pb-4">
               <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2 border border-primary/20">
                  <Download className="w-6 h-6" />
               </div>
               <CardTitle className="text-2xl font-black tracking-tight">Data Export</CardTitle>
               <CardDescription className="text-sm font-bold text-muted-foreground">
                  Download comprehensive patient and screening data in Excel format.
               </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="bg-muted/30 border border-muted-foreground/10 rounded-2xl p-4 flex gap-4 items-center">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
                      <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                      <p className="text-xs font-black uppercase tracking-tight">XLSX Generation Engine</p>
                      <p className="text-[10px] text-muted-foreground font-medium italic">Available for administrators and directors.</p>
                  </div>
               </div>
               
               <Button 
                onClick={handleExport}
                disabled={exporting}
                className="w-full h-14 rounded-2xl font-black text-sm gap-3 shadow-xl shadow-primary/20 transition-all active:scale-95"
               >
                  {exporting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                        <Download className="w-5 h-5" />
                        Initiate Full Data Export
                    </>
                  )}
               </Button>
            </CardContent>
          </Card>

          {/* Import Card */}
          <Card className="border-2 shadow-xl opacity-80 rounded-3xl overflow-hidden group border-dashed relative">
            <div className="absolute inset-0 bg-muted/5 z-0" />
            <div className="relative z-10">
                <CardHeader className="pb-4">
                   <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2 border border-amber-500/20">
                      <Upload className="w-6 h-6" />
                   </div>
                   <CardTitle className="text-2xl font-black tracking-tight">Data Import <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase ml-2">Beta</span></CardTitle>
                   <CardDescription className="text-sm font-bold text-muted-foreground">
                      Excel-based patient bio-data ingestion service for bulk registration.
                   </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                   <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex gap-4 items-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold italic leading-relaxed">
                        Data Import module is now ACTIVE. Ensure your Excel sheet contains 'staff_id', 'first_name', and 'last_name' columns.
                      </p>
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
                          Import Bio-Data Excel
                        </>
                       )}
                     </Button>
                   </div>
                </CardContent>
            </div>
          </Card>
        </div>

        <div className="mt-12 bg-primary/5 border border-primary/10 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 shadow-inner">
            <div className="p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-primary/10 ring-8 ring-primary/5">
                <CheckCircle2 className="w-12 h-12 text-primary" />
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
