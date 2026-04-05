import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, FileText, Calendar, Building2, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';

const ReportVerificationPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<'success' | 'failed' | null>(null);
    const [reportDetails, setReportDetails] = useState<any>(null);

    useEffect(() => {
        const verifyReport = async () => {
            if (!token) {
                setStatus('failed');
                setLoading(false);
                return;
            }

            try {
                const response = await axios.get(`http://localhost:5000/api/public/verify/${token}`);
                setReportDetails(response.data);
                setStatus('success');
            } catch (err) {
                setStatus('failed');
            } finally {
                setLoading(false);
            }
        };

        verifyReport();
    }, [token]);

    return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
            <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
                <Card className="border-border shadow-2xl relative overflow-hidden">
                    {/* Header Strip */}
                    <div className={`h-2 w-full ${status === 'success' ? 'bg-green-500' : status === 'failed' ? 'bg-destructive' : 'bg-primary'}`} />
                    
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto mb-4 mt-2">
                            {loading ? (
                                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                </div>
                            ) : status === 'success' ? (
                                <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto ring-8 ring-green-500/20">
                                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                                </div>
                            ) : (
                                <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto ring-8 ring-destructive/20">
                                    <XCircle className="h-12 w-12 text-destructive" />
                                </div>
                            )}
                        </div>
                        <CardTitle className="text-2xl font-black">
                            {loading ? 'Verifying Report...' : status === 'success' ? 'Authentic Report' : 'Verification Failed'}
                        </CardTitle>
                        <CardDescription className="text-sm font-medium mt-1">
                            {loading 
                                ? 'Please wait while we validate the digital signature of this medical report.' 
                                : status === 'success' 
                                    ? 'This medical report has been cryptographically verified by Legit HealthCare systems.' 
                                    : 'This report code is invalid, expired, or may be a forged document.'}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-6">
                        {status === 'success' && reportDetails && (
                            <div className="bg-muted/30 rounded-2xl p-5 space-y-4 border border-border">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 border-b pb-2">Verified Record Details</h3>
                                
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-card rounded-lg border shadow-sm"><User className="h-4 w-4 text-primary" /></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Patient Reference (ID)</p>
                                        <p className="font-bold text-sm">{reportDetails.staff_id}</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-card rounded-lg border shadow-sm"><FileText className="h-4 w-4 text-primary" /></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Screening Period</p>
                                        <p className="font-bold text-sm">{reportDetails.year} Annual Medical Screenings</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-card rounded-lg border shadow-sm"><Building2 className="h-4 w-4 text-primary" /></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Assigned Section</p>
                                        <div className="mt-1">
                                            <Badge variant="outline" className="font-bold bg-card">{reportDetails.section}</Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-card rounded-lg border shadow-sm"><Calendar className="h-4 w-4 text-primary" /></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Mined Timestamp (UTC)</p>
                                        <p className="font-bold text-sm">{new Date(reportDetails.generated_at).toLocaleString('en-GB')}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {status === 'failed' && (
                            <div className="bg-destructive/5 rounded-2xl p-5 border border-destructive/10 text-center">
                                <p className="text-sm font-medium text-destructive mb-2">If you suspect this is a forged document, please contact the clinic administration immediately.</p>
                            </div>
                        )}

                        <div className="mt-8 text-center border-t pt-6">
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-3">Powered By</p>
                            <Link to="/" className="text-sm font-black tracking-tighter hover:text-primary transition-colors inline-flex items-center gap-2">
                                LEGIT HEALTHCARE SYSTEMS
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ReportVerificationPage;
