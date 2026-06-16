import React, { useState, useEffect } from 'react';
import { PatientLayout } from '@/components/layout/PatientLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Loading03Icon, 
  AlertCircleIcon, 
  Activity01Icon, 
  Calendar03Icon, 
  File01Icon 
} from '@hugeicons/core-free-icons';
import { useAppContext } from '@/context/AppContext';
import { FileAttachmentSection } from '@/components/FileAttachmentSection';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

const PatientFilesPage: React.FC = () => {
    const { user } = useAppContext();
    const [availableYears, setAvailableYears] = useState<string[]>([]);
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [fetchingYears, setFetchingYears] = useState(true);

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

    return (
        <PatientLayout>
            <div className="space-y-8 animate-in fade-in duration-700">
                {/* Header Selector Card (Matching Medical Reports Style) */}
                <Card className="border shadow-lg rounded-2xl overflow-hidden bg-card/50 backdrop-blur-md">
                    <CardHeader className="p-6 md:p-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl text-primary">
                                        <HugeiconsIcon icon={Activity01Icon} className="h-5 w-5 sm:h-6 sm:w-6" />
                                    </div>
                                    <CardTitle className="text-xl sm:text-2xl font-black tracking-tight">Technical Reports</CardTitle>
                                </div>
                                <p className="text-muted-foreground font-medium text-xs sm:text-base pl-4 border-l-4 border-primary/20 ml-1 py-1">
                                    Access detailed machine-generated diagnostic attachments.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                                <div className="w-full sm:w-44">
                                    <Select value={selectedYear} onValueChange={setSelectedYear} disabled={fetchingYears}>
                                        <SelectTrigger className="h-10 rounded-xl border font-bold text-sm">
                                            <HugeiconsIcon icon={Calendar03Icon} className="mr-2 h-3.5 w-3.5 text-primary" />
                                            <SelectValue placeholder={fetchingYears ? "Loading..." : "Select Year"} />
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
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* Files Section */}
                {!selectedYear && !fetchingYears ? (
                    <div className="flex flex-col items-center justify-center min-h-[320px] sm:min-h-[450px] bg-muted/5 rounded-3xl border-2 border-dashed border-border/40 text-center px-6 py-12 space-y-4 shadow-inner">
                        <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-2">
                            <HugeiconsIcon icon={File01Icon} className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-black text-muted-foreground/50 uppercase tracking-[0.2em]">No History Found</h3>
                            <p className="text-xs text-muted-foreground font-medium italic max-w-xs mx-auto leading-relaxed">
                                You do not have any screening records in our database. Once you complete a screening, your technical files will appear here.
                            </p>
                        </div>
                    </div>
                ) : fetchingYears ? (
                    <div className="space-y-6">
                        <Card className="border border-border/80 bg-card/45 backdrop-blur-sm p-6">
                            <div className="space-y-4 animate-pulse">
                                <Skeleton className="h-8 w-48 bg-muted/40 rounded" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="p-4 border border-border/50 rounded-xl space-y-3">
                                            <Skeleton className="h-12 w-12 rounded bg-muted/40" />
                                            <Skeleton className="h-4 w-3/4 rounded bg-muted/40" />
                                            <Skeleton className="h-3 w-1/2 rounded bg-muted/40" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        <Card className="border-2 shadow-lg rounded-2xl overflow-hidden transition-all hover:shadow-xl">
                            <CardContent className="p-6">
                                {user?.username && selectedYear && (
                                    <FileAttachmentSection 
                                        staffId={user.username} 
                                        year={selectedYear} 
                                        allowUpload={false} 
                                    />
                                )}
                            </CardContent>
                        </Card>

                        {/* Information Alert */}
                        <Card className="bg-primary/5 border-primary/10 border-2 rounded-2xl">
                            <CardContent className="p-6 flex items-start gap-4">
                                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                                    <HugeiconsIcon icon={AlertCircleIcon} className="h-5 w-5 text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-black text-primary uppercase tracking-tight">Understanding Technical Files</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                        View raw diagnostic images and PDF reports from machine tests (ECG, Spirometry, Audiometry) that support your medical results. 
                                        Missing files may still be pending upload by clinical staff.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </PatientLayout>
    );
};

export default PatientFilesPage;
