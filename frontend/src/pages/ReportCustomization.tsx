import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  FloppyDiskIcon, 
  Loading03Icon, 
  Note01Icon,
  Activity01Icon
} from '@hugeicons/core-free-icons';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useAppContext } from '@/context/AppContext';
import { usePermissions } from '@/hooks/usePermissions';

interface ReportParameter {
  id: string;
  category: string;
  parameter_name: string;
  reference_value: string;
  unit: string;
  display_order: number;
}

const CATEGORIES = [
  { id: 'blood_sugar', label: 'Blood Sugar' },
  { id: 'fbc', label: 'Full Blood Count (FBC)' },
  { id: 'kft', label: 'Kidney Function (KFT)' },
  { id: 'lipid', label: 'Lipid Profile' },
  { id: 'lft', label: 'Liver Function (LFT)' },
  { id: 'ua', label: 'Urinalysis' },
  { id: 'psa', label: 'PSA' }
];

export const ReportCustomization = () => {
  const { activeSection } = useAppContext();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parameters, setParameters] = useState<ReportParameter[]>([]);
  const [activeTab, setActiveTab] = useState('blood_sugar');

  useEffect(() => {
    fetchParameters();
  }, [activeSection]);

  const fetchParameters = async () => {
    try {
      const res = await axios.get('/api/report-customization/', {
        headers: { 'X-Company-Context': activeSection }
      });
      setParameters(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load report parameters");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (id: string, field: keyof ReportParameter, value: string) => {
    setParameters(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put('/api/report-customization/', parameters, {
        headers: { 'X-Company-Context': activeSection }
      });
      toast.success("Report customization saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-20">
          <HugeiconsIcon icon={Loading03Icon} className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col justify-between items-stretch gap-4 sm:gap-6 bg-card p-4 sm:p-6 rounded-2xl border mb-8 transition-all">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="p-1.5 sm:p-3 bg-teal-500/10 rounded-xl sm:rounded-2xl shrink-0">
              <HugeiconsIcon icon={Note01Icon} className="text-teal-600 h-5 w-5 sm:h-8 sm:w-8" />
            </div>
            <div>
              <h1 className="text-base sm:text-2xl font-black tracking-tight text-foreground">Report Customization</h1>
              <p className="text-[9px] sm:text-sm text-muted-foreground font-medium">
                Customize reference ranges, parameter names, and units on Page 1 of patient medical reports.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6 pb-20">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-7 h-auto p-1.5 gap-1.5 bg-muted/30 border rounded-xl mb-6">
              {CATEGORIES.map(cat => (
                <TabsTrigger 
                  key={cat.id} 
                  value={cat.id}
                  className="py-2.5 px-3 font-bold text-xs rounded-lg transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md shrink-0"
                >
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {CATEGORIES.map(cat => {
              const catParams = parameters.filter(p => p.category === cat.id);
              return (
                <TabsContent key={cat.id} value={cat.id} className="focus-visible:outline-none">
                  <Card className="border-2 shadow-xl relative overflow-hidden">
                    <CardHeader className="border-b bg-muted/5 p-6">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <HugeiconsIcon icon={Activity01Icon} className="h-6 w-6 text-primary" />
                        {cat.label} Parameters
                      </CardTitle>
                      <CardDescription>
                        Modify investigation names, reference values, and measurement units for {cat.label}.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 md:p-8 space-y-8">
                      <div className="grid grid-cols-1 gap-6">
                        {catParams.map(param => (
                          <div 
                            key={param.id} 
                            className="p-5 border-2 rounded-2xl bg-muted/5 hover:bg-muted/10 transition-all space-y-4 relative"
                          >
                            <div className="absolute top-4 right-4 text-[10px] font-black tracking-widest text-muted-foreground/45 uppercase bg-muted px-2 py-0.5 rounded">
                              ID: {param.id}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor={`name-${param.id}`} className="font-bold text-xs">Parameter Name</Label>
                                <Input 
                                  id={`name-${param.id}`}
                                  value={param.parameter_name}
                                  onChange={e => handleInputChange(param.id, 'parameter_name', e.target.value)}
                                  className="h-10 border-2 font-medium"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`ref-${param.id}`} className="font-bold text-xs">Reference Range / Value</Label>
                                <Textarea 
                                  id={`ref-${param.id}`}
                                  value={param.reference_value}
                                  onChange={e => handleInputChange(param.id, 'reference_value', e.target.value)}
                                  className="min-h-[40px] h-10 border-2 font-medium py-2 resize-y"
                                  rows={1}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`unit-${param.id}`} className="font-bold text-xs">Unit</Label>
                                <Textarea 
                                  id={`unit-${param.id}`}
                                  value={param.unit || ''}
                                  onChange={e => handleInputChange(param.id, 'unit', e.target.value)}
                                  className="min-h-[40px] h-10 border-2 font-medium py-2 resize-y"
                                  rows={1}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                        {catParams.length === 0 && (
                          <p className="text-center text-sm text-muted-foreground italic py-4">No parameters found in this category.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>

          <div className="flex justify-end pt-4">
            <Button 
              type="submit" 
              size="lg" 
              loading={saving}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 px-8 shadow-lg shadow-teal-500/20 rounded-xl"
            >
              {!saving && <HugeiconsIcon icon={FloppyDiskIcon} className="mr-2 h-5 w-5" />}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default ReportCustomization;
