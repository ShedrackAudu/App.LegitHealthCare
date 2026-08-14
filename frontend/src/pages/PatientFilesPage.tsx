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
                {/* Header Selector Card */}
                <Card className="border border-border/60 shadow-xs rounded-xl overflow-hidden bg-card/60 dark:bg-card/45 backdrop-blur-md">
                    <CardHeader className="p-6 md:p-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 sm:p-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary shadow-2xs">
                                        <HugeiconsIcon icon={Activity01Icon} className="h-5 w-5 sm:h-6 sm:w-6" />
                                    </div>
                                    <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">Technical Reports</CardTitle>
                                </div>
                                <p className="text-muted-foreground font-medium text-xs sm:text-sm pl-3 border-l-2 border-primary/40 ml-1 py-0.5">
                                    Access detailed machine-generated diagnostic attachments.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                                <div className="w-full sm:w-44">
                                    <Select value={selectedYear} onValueChange={setSelectedYear} disabled={fetchingYears}>
                                        <SelectTrigger className="h-10 rounded-lg border-input/80 bg-card/60 backdrop-blur-sm font-bold text-sm shadow-2xs">
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
                    <div className="flex flex-col items-center justify-center min-h-[320px] sm:min-h-[450px] bg-card/30 backdrop-blur-sm rounded-xl border border-dashed border-border/60 text-center px-6 py-12 space-y-4">
                        <div className="w-16 h-16 bg-muted/30 rounded-xl flex items-center justify-center mx-auto mb-2 border border-border/40 shadow-2xs">
                            <HugeiconsIcon icon={File01Icon} className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <div className="space-y-1.5">
                            <h3 className="text-base font-bold text-foreground tracking-tight">No History Found</h3>
                            <p className="text-xs text-muted-foreground font-medium italic max-w-xs mx-auto leading-relaxed">
                                You do not have any screening records in our database. Once you complete a screening, your technical files will appear here.
                            </p>
                        </div>
                    </div>
                ) : fetchingYears ? (
                    <div className="space-y-6">
                        <Card className="border border-border/60 bg-card/45 backdrop-blur-sm p-6 rounded-xl">
                            <div className="space-y-4 animate-pulse">
                                <Skeleton className="h-8 w-48 bg-muted/40 rounded-lg" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="p-4 border border-border/50 rounded-xl space-y-3 bg-card/40">
                                            <Skeleton className="h-10 w-10 rounded-lg bg-muted/40" />
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
                        <Card className="border border-border/60 shadow-xs rounded-xl overflow-hidden bg-card/60 dark:bg-card/45 backdrop-blur-md transition-all hover:shadow-sm">
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
                        <Card className="bg-primary/[0.04] border border-primary/20 rounded-xl backdrop-blur-sm shadow-2xs">
                            <CardContent className="p-5 flex items-start gap-4">
                                <div className="h-10 w-10 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0 text-primary shadow-2xs">
                                    <HugeiconsIcon icon={AlertCircleIcon} className="h-5 w-5 text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-primary tracking-tight">Understanding Technical Files</p>
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
