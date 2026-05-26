import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Upload, 
  Eye, 
  Trash2, 
  Loader2, 
  ExternalLink,
  Download,
  FileIcon,
  X,
  FileUp,
  AlertCircle,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ActionConfirmModal } from './ActionConfirmModal';

interface FileAttachmentSectionProps {
  staffId: string;
  year: string;
  department?: string; // Optional: if missing, show all files
  allowUpload?: boolean;
  allowDownload?: boolean;
  compact?: boolean;
}

export const FileAttachmentSection: React.FC<FileAttachmentSectionProps> = ({ 
  staffId, 
  year, 
  department,
  allowUpload = true,
  allowDownload = true,
  compact = false
}) => {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const getFileUrl = useCallback((path: string) => {
    if (!path) return '';
    const token = localStorage.getItem('token');
    if (!token) return path;
    const baseUrl = path.startsWith('http://') || path.startsWith('https://') 
      ? '' 
      : ((window as any).API_BASE_URL || '');
    const separator = path.includes('?') ? '&' : '?';
    // Include company context so browser-initiated requests (iframe/img/a)
    // can route to the correct tenant database without custom headers
    const company = axios.defaults.headers.common['X-Company-Context'] || localStorage.getItem('activeSection') || '';
    return `${baseUrl}${path}${separator}jwt=${token}&company=${company}`;
  }, []);

  const fetchFiles = async () => {
    if (!staffId || !year) return;
    setLoading(true);
    try {
      const resp = await axios.get(`/api/files/list/${staffId}/${year}`);
      if (department) {
        setFiles(resp.data.filter((f: any) => f.department === department));
      } else {
        setFiles(resp.data);
      }
    } catch (err) {
      console.error("Error fetching files:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [staffId, year, department]);

  const processFile = async (file: File) => {
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PDF or an Image (JPG/PNG)");
      return;
    }

    // Limit size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('staff_id', staffId);
    formData.append('year', year);
    formData.append('department', department || 'General');

    setUploading(true);
    try {
      await axios.post('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success("File uploaded successfully");
      fetchFiles();
    } catch (err: any) {
      console.error("Upload error:", err);
      const msg = err.response?.data?.error || "Upload failed. Check permissions.";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (allowUpload) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (!allowUpload) return;
    
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/files/${deleteId}`);
      toast.success("File deleted");
      setDeleteId(null);
      fetchFiles();
    } catch (err) {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={cn("space-y-4", compact && "space-y-0")}>
      {!compact && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
            <FileText className="h-4 w-4 text-primary" />
            {department ? `${department} Technical Reports` : "All Technical Attachments"}
          </h3>
        </div>
      )}

      <div className={cn("flex flex-col gap-4", compact && "flex-col sm:flex-row items-center gap-2")}>
        {allowUpload && department && (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative group transition-all duration-300",
              isDragging ? "scale-[1.01]" : "scale-100",
              compact && "w-full sm:w-[132px] shrink-0"
            )}
          >
            <input 
              type="file" 
              accept=".pdf,.jpg,.jpeg,.png" 
              className="absolute inset-0 opacity-0 cursor-pointer z-20" 
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <Card className={cn(
              "border-2 border-dashed flex transition-colors relative overflow-hidden",
              compact ? "flex-row items-center p-1.5 h-11 gap-2" : "flex-col items-center justify-center text-center p-6 gap-2",
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/40 bg-muted/5",
              uploading && "opacity-50 pointer-events-none"
            )}>
              {uploading ? (
                <div className={cn("flex items-center gap-1.5", !compact && "flex-col py-2")}>
                  <Loader2 className={cn("animate-spin text-primary", compact ? "h-4 w-4" : "h-10 w-10")} />
                  <p className="text-[9px] font-black uppercase tracking-widest text-primary animate-pulse">...</p>
                </div>
              ) : (
                <>
                  <div className={cn(
                    "rounded-lg flex items-center justify-center transition-all duration-300",
                    compact ? "h-6 w-6" : "h-12 w-12",
                    isDragging ? "bg-primary text-white scale-110" : "bg-primary/10 text-primary group-hover:scale-110"
                  )}>
                    {compact ? <Upload className="h-3 w-3" /> : <FileUp className="h-6 w-6" />}
                  </div>
                  {!compact ? (
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {isDragging ? "Drop your PDF here" : "Click or Drag PDF report here"}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight mt-1">
                        PDF or Images allowed • Max 10MB
                      </p>
                    </div>
                  ) : (
                    <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground truncate">
                      {isDragging ? "Drop" : "ATTACH FILE"}
                    </p>
                  )}
                </>
              )}
            </Card>
          </div>
        )}

        {!loading && files.length > 0 && (
          <div className={cn("grid grid-cols-1 gap-2 flex-1 w-full", compact && "flex flex-col sm:flex-row gap-2 overflow-x-auto pb-1")}>
            {files.map((file) => {
              // Truncate filename: spiro....pdf
              const truncateName = (name: string) => {
                if (!compact || name.length <= 20) return name;
                const ext = name.split('.').pop();
                const base = name.split('.').shift() || '';
                return `${base.substring(0, 12)}...${ext}`;
              };

              return (
                <div 
                  key={file.id} 
                  className={cn(
                    "flex items-center justify-between rounded-xl border-2 bg-card/50 hover:bg-muted/10 transition-all group hover:shadow-md shrink-0",
                    compact ? "p-1.5 w-full sm:w-[176px] h-11 gap-2" : "p-3"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className={cn(
                      "rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0 border border-rose-500/10 group-hover:bg-rose-500 group-hover:text-white transition-colors",
                      compact ? "h-6 w-6" : "h-10 w-10"
                    )}>
                      <Activity className={compact ? "h-3 w-3" : "h-5 w-5"} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("font-bold truncate text-foreground", compact ? "text-[9px]" : "text-sm")} title={file.filename}>
                        {truncateName(file.filename)}
                      </p>
                      {!compact && (
                        <p className="text-[10px] text-muted-foreground uppercase font-black flex items-center gap-1.5 min-w-0">
                          <span className="text-primary/70 shrink-0">{file.department}</span>
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/30 shrink-0" />
                          <span className="truncate">
                            <span className="hidden xs:inline">Uploaded </span>{new Date(file.created_at).toLocaleDateString()}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={cn("flex items-center gap-0.5 shrink-0 ml-2", !compact && "lg:opacity-0 lg:group-hover:opacity-100 transition-opacity")}>
                    {allowDownload && (
                     <a href={getFileUrl(file.file_path)} download={file.filename} onClick={(e) => e.stopPropagation()}>
                       <Button 
                         type="button"
                         size="icon" 
                         variant="ghost" 
                         className={cn("text-indigo-500 hover:bg-indigo-500/10", compact ? "h-5 w-5" : "h-8 w-8")} 
                         title="Download File"
                       >
                         <Download className={compact ? "h-2.5 w-2.5" : "h-4 w-4"} />
                       </Button>
                     </a>
                    )}
                    <Button 
                      type="button"
                      size="icon" 
                      variant="ghost" 
                      className={cn("text-primary hover:bg-primary/10", compact ? "h-5 w-5" : "h-8 w-8")} 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedFile(file);
                      }}
                      title="View Inline"
                    >
                      <Eye className={compact ? "h-2.5 w-2.5" : "h-4 w-4"} />
                    </Button>
                    {compact && (
                      <a href={getFileUrl(file.file_path)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                        <Button type="button" size="icon" variant="ghost" className="h-5 w-5 hover:bg-muted" title="Open in New Tab">
                          <ExternalLink className="h-2.5 w-2.5" />
                        </Button>
                      </a>
                    )}
                    {allowUpload && (
                      <Button 
                        type="button"
                        size="icon" 
                        variant="ghost" 
                        className={cn("text-rose-500 hover:bg-rose-500/10", compact ? "h-5 w-5" : "h-8 w-8")}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteId(file.id);
                        }}
                        title="Delete"
                      >
                        <Trash2 className={compact ? "h-2.5 w-2.5" : "h-4 w-4"} />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ActionConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
        title="Delete Technical Report"
        description="Are you sure you want to permanently remove this file? This action cannot be undone."
        confirmText="Delete File"
        variant="danger"
      />

      {/* PDF Viewer Dialog */}
      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-none shadow-2xl">
          <DialogHeader className="p-3 sm:p-4 border-b bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 relative">
            <div className="flex items-center gap-3 min-w-0 pr-8 sm:pr-0">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 text-left">
                <DialogTitle className="text-[11px] sm:text-sm font-black uppercase tracking-tight text-foreground truncate block text-left">
                  {selectedFile?.filename}
                </DialogTitle>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold truncate opacity-80 text-left">
                  {selectedFile?.department} Technical Report • {year} Session
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
            {allowDownload && (
                 <a href={getFileUrl(selectedFile?.file_path)} download={selectedFile?.filename} className="w-full sm:w-auto">
                   <Button variant="outline" size="sm" className="w-full sm:w-auto gap-2 h-8 text-[9px] sm:text-[10px] font-black uppercase border-2 shadow-sm bg-background/50">
                     <Download className="h-3 w-3 text-primary" /> Download Report
                   </Button>
                 </a>
            )}
            </div>
          </DialogHeader>
          <div className="flex-1 w-full bg-zinc-800 dark:bg-black relative flex items-center justify-center overflow-auto">
            {selectedFile && (
              selectedFile.filename.toLowerCase().endsWith('.pdf') ? (
                <iframe 
                  src={`${getFileUrl(selectedFile.file_path)}#toolbar=0&navpanes=0`} 
                  className="w-full h-full border-none bg-white"
                  title="PDF Viewer"
                />
              ) : (
                <img 
                  src={getFileUrl(selectedFile.file_path)} 
                  alt="Preview" 
                  className="max-w-full max-h-full object-contain shadow-2xl"
                />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
