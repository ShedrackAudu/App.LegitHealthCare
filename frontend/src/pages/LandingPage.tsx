import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { 
  Shield, 
  Activity, 
  MessageSquare, 
  Bell, 
  ArrowRight, 
  CheckCircle2, 
  Heart, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin, 
  Youtube, 
  Globe, 
  LinkIcon,
  MessageCircle,
  Music2,
  Menu,
  X,
  Mail,
  Phone,
  MapPin,
  FileText,
  LineChart,
  Calendar
} from 'lucide-react';
import axios from 'axios';

const LandingPage = () => {
  const [branding, setBranding] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const res = await axios.get('/api/branding');
        setBranding(res.data);
      } catch (err) {
        console.error("Failed to fetch branding", err);
      }
    };
    fetchBranding();
  }, []);

  const getImageUrl = (path: string, fallback: string) => {
    if (!path) return fallback;
    if (path.startsWith('http')) return path;
    return `${(window as any).API_BASE_URL}${path}`;
  };

  const getSocialIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('facebook')) return Facebook;
    if (l.includes('twitter') || l.includes('x')) return Twitter;
    if (l.includes('instagram')) return Instagram;
    if (l.includes('linkedin')) return Linkedin;
    if (l.includes('youtube')) return Youtube;
    if (l.includes('globe') || l.includes('web')) return Globe;
    if (l.includes('whatsapp')) return MessageCircle;
    if (l.includes('tiktok')) return Music2;
    return LinkIcon;
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-8 md:px-12 lg:px-20">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              {/* Desktop Logo: Full Branding */}
              <div className="hidden md:block">
                {branding?.logo_dark ? (
                  <img src={getImageUrl(branding.logo_dark, '')} alt="Logo" className="h-10 transition-all" />
                ) : (
                  <div className="flex items-center">
                    <Activity className="h-8 w-8 text-primary mr-2" />
                    <span className="text-2xl font-bold text-primary tracking-tight">{branding?.clinic_name || "Legit HealthCare"}</span>
                  </div>
                )}
              </div>
              
              {/* Mobile Logo: Brandmark Only */}
              <div className="md:hidden">
                {branding?.logo_light ? (
                  <img src={getImageUrl(branding.logo_light, '')} alt="Logo" className="h-10 transition-all" />
                ) : branding?.logo_dark ? (
                  <img src={getImageUrl(branding.logo_dark, '')} alt="Logo" className="h-10 transition-all" />
                ) : (
                  <Activity className="h-8 w-8 text-primary" />
                )}
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8 text-sm font-semibold text-muted-foreground">
              <a href="#services" className="hover:text-primary transition-colors">Services</a>
              <Link to="/login?portal=patient">
                <Button variant="outline" className="border-primary text-primary hover:bg-primary/10 font-bold px-4 rounded-full border-2 text-[10px] uppercase tracking-widest h-9">
                  Patient Portal
                </Button>
              </Link>
              <a href="#about" className="hover:text-primary transition-colors">About</a>
              <div className="flex items-center space-x-4 pl-4 border-l">
                <ModeToggle />
                <Link to="/login">
                  <Button variant="ghost" className="font-semibold px-4">Login</Button>
                </Link>
                <Link to="/signup">
                  <Button className="font-bold px-6 shadow-lg shadow-primary/20">Get Started</Button>
                </Link>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-4">
              <ModeToggle />
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-muted-foreground hover:text-primary transition-colors"
              >
                {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Overlay */}
        {menuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-background border-b border-border p-6 space-y-6 animate-in slide-in-from-top-4 duration-300 shadow-xl">
            <div className="flex flex-col space-y-4 text-lg font-bold">
              <a href="#services" onClick={() => setMenuOpen(false)} className="hover:text-primary transition-colors">Services</a>
              <a href="#about" onClick={() => setMenuOpen(false)} className="hover:text-primary transition-colors">About</a>
              <Link to="/login?portal=patient" onClick={() => setMenuOpen(false)} className="text-primary">
                Patient Portal
              </Link>
            </div>
            <div className="pt-6 border-t border-border flex flex-col gap-4">
              <Link to="/login" onClick={() => setMenuOpen(false)}>
                <Button variant="outline" className="w-full text-lg h-12">Login</Button>
              </Link>
              <Link to="/signup" onClick={() => setMenuOpen(false)}>
                <Button className="w-full text-lg h-12 shadow-lg">Get Started</Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute top-0 left-0 w-full h-full -z-10 bg-grid-white/[0.02] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -z-10 animate-pulse" />
        
        <div className="container mx-auto px-8 md:px-12 lg:px-20">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 text-center lg:text-left space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider animate-in fade-in slide-in-from-left-4 duration-500">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Now Live: Patient Portal
              </div>
              <h1 className="text-6xl lg:text-[100px] font-bold leading-[1.1] tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground via-foreground/90 to-primary/50">
                {branding?.clinic_name}: <br />
                <span className="text-xl lg:text-4xl text-primary font-black mt-2 block">
                  {branding?.clinic_slogan}
                </span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
                The official healthcare management portal for DCP & DCT staff. Securely manage screenings, communicate with your clinical team, and track your wellness journey.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center lg:justify-start pt-4">
                <Link to="/signup">
                  <Button size="lg" className="w-full sm:w-auto h-16 px-10 text-lg font-bold shadow-[0_20px_50px_rgba(var(--primary),_0.3)] hover:scale-105 transition-transform">
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto h-16 px-10 text-lg font-bold border-2 hover:bg-muted/50 transition-colors">
                    Login
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex-1 relative mt-16 lg:mt-0 flex justify-center lg:justify-end animate-in fade-in zoom-in-95 duration-1000">
              <div className="relative group w-full max-w-xl">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative w-full aspect-square bg-card/50 backdrop-blur-2xl rounded-[2.5rem] border-2 border-primary/20 shadow-2xl flex items-center justify-center p-12 overflow-hidden">
                   <div className="grid grid-cols-2 gap-4 w-full h-full relative z-10">
                      <div className="h-32 bg-primary/10 rounded-2xl overflow-hidden shadow-inner border border-primary/10 transition-transform group-hover:scale-[1.02] duration-500">
                        <img 
                          src={getImageUrl(branding?.hero_image_1, "/images/medical_equipment_1.png")} 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                          alt="Medical Equipment"
                        />
                      </div>
                      <div className="h-32 bg-primary/5 rounded-2xl overflow-hidden shadow-inner border border-primary/10 transition-transform group-hover:scale-[1.02] duration-500 delay-75">
                         <img 
                          src={getImageUrl(branding?.hero_image_2, "/images/medical_equipment_2.png")} 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                          alt="Medical Diagnostics"
                        />
                      </div>
                      <div className="h-64 col-span-2 bg-primary/5 rounded-2xl overflow-hidden shadow-inner border border-primary/10 transition-transform group-hover:scale-[1.01] duration-500 delay-150">
                        <img 
                          src={getImageUrl(branding?.hero_image_team, "/images/african_american_doctors.png")} 
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                          alt="Our Medical Team"
                        />
                      </div>
                   </div>
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                      <div className="w-40 h-40 bg-primary/20 rounded-full blur-3xl animate-pulse" />
                   </div>
                   <Heart className="absolute bottom-10 right-10 h-10 w-10 text-rose-500/40 animate-bounce transition-all group-hover:text-rose-500 group-hover:scale-125 z-20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="services" className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-8 md:px-12 lg:px-20">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-4xl lg:text-6xl font-black tracking-tight">Clinical Features</h2>
            <p className="text-lg text-muted-foreground font-medium">Built with the highest standards of modern healthcare technology.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<MessageSquare className="w-6 h-6" />} 
              title="Messaging" 
              description="Directly connect with clinic admins and medical staff for secure, real-time health updates." 
            />
            <FeatureCard 
              icon={<Shield className="w-6 h-6" />} 
              title="Encrypted" 
              description="Your data is private. Access yearly screening results with industry-standard encryption." 
            />
            <FeatureCard 
              icon={<Bell className="w-6 h-6" />} 
              title="Alerts" 
              description="Never miss an appointment. Automated reminders for screenings and medical follow-ups." 
            />
            <FeatureCard 
              icon={<FileText className="w-6 h-6" />} 
              title="Digital Health Records" 
              description="Access all your screening history and medical records in one centralized, secure digital vault." 
            />
            <FeatureCard 
              icon={<LineChart className="w-6 h-6" />} 
              title="Health Analytics" 
              description="Gain insights into your health with automated trend analysis across your yearly medical evaluations." 
            />
            <FeatureCard 
              icon={<Calendar className="w-6 h-6" />} 
              title="Appointment Scheduler" 
              description="Seamlessly book and manage your yearly medical screenings and follow-up consultations." 
            />
          </div>
        </div>
      </section>

      {/* NEW Patient Portal Highlight Section */}
      <section id="patient-portal" className="py-32 relative overflow-hidden">
         <div className="absolute inset-0 bg-primary/5 -z-10" />
         <div className="container mx-auto px-8 md:px-12 lg:px-20">
            <div className="bg-card/50 backdrop-blur-3xl rounded-[4rem] border-2 border-primary/10 shadow-3xl overflow-hidden p-8 md:p-20 relative">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                  <div className="space-y-10">
                     <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[.3em] border border-primary/20">
                           Self-Service Excellence
                        </div>
                        <h2 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05]">
                           The New <br />
                           <span className="text-primary italic">Patient Portal</span>
                        </h2>
                        <p className="text-xl text-muted-foreground leading-relaxed font-medium">
                           We've designed a dedicated space for you to manage your health journey. 
                           Claim your account in seconds using your official Staff ID and take full control of your medical history.
                        </p>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white font-black text-xl">1</div>
                           <h4 className="text-xl font-bold">Claim Account</h4>
                           <p className="text-muted-foreground text-sm leading-relaxed">Enter your Staff ID and verify your identity via a secure OTP sent to your company email.</p>
                        </div>
                        <div className="space-y-3">
                           <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary font-black text-xl">2</div>
                           <h4 className="text-xl font-bold">Access Records</h4>
                           <p className="text-muted-foreground text-sm leading-relaxed">View all your historical screening findngs, download PDF reports, and verify their authenticity.</p>
                        </div>
                        <div className="space-y-3">
                           <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary font-black text-xl">3</div>
                           <h4 className="text-xl font-bold">Digital Bookings</h4>
                           <p className="text-muted-foreground text-sm leading-relaxed">Skip the queue by scheduling your screening sessions directly from your dashboard.</p>
                        </div>
                        <div className="space-y-3">
                           <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary font-black text-xl">4</div>
                           <h4 className="text-xl font-bold">Direct Messaging</h4>
                           <p className="text-muted-foreground text-sm leading-relaxed">Communicate securely with the clinical team regarding any of your health test results.</p>
                        </div>
                     </div>

                     <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <Link to="/signup">
                           <Button size="lg" className="h-16 px-10 rounded-2xl text-lg font-black shadow-2xl shadow-primary/30 transition-transform active:scale-95">
                              Claim My Account
                           </Button>
                        </Link>
                        <Link to="/login">
                           <Button variant="outline" size="lg" className="h-16 px-10 rounded-2xl text-lg font-black border-2 hover:bg-primary/5 shadow-xl transition-transform active:scale-95">
                              Log in to Portal
                           </Button>
                        </Link>
                     </div>
                  </div>

                  {/* Portal Mockup Element */}
                  <div className="relative group">
                     <div className="absolute -inset-10 bg-primary/20 rounded-[5rem] blur-[80px] -z-10 group-hover:bg-primary/30 transition-all duration-1000" />
                     <div className="rounded-[3rem] border-8 border-muted bg-card shadow-2xl overflow-hidden aspect-[16/10] flex flex-col">
                        <div className="h-12 bg-muted flex items-center px-6 gap-2">
                           <div className="flex gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-red-500/50" />
                              <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                              <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                           </div>
                           <div className="mx-auto bg-background/50 h-5 w-48 rounded-md" />
                        </div>
                        <div className="flex-1 p-8 space-y-6">
                           <div className="h-20 bg-primary/5 rounded-2xl border-2 border-primary/10 border-dashed" />
                           <div className="grid grid-cols-3 gap-4">
                              <div className="h-24 bg-blue-500/5 rounded-2xl border border-blue-500/10" />
                              <div className="h-24 bg-amber-500/5 rounded-2xl border border-amber-500/10" />
                              <div className="h-24 bg-emerald-500/5 rounded-2xl border border-emerald-500/10" />
                           </div>
                           <div className="space-y-3">
                              <div className="h-12 bg-muted/50 rounded-xl w-3/4" />
                              <div className="h-32 bg-muted/20 rounded-2xl" />
                           </div>
                        </div>
                        <div className="p-4 bg-primary/10 flex items-center justify-center">
                           <Shield className="w-5 h-5 text-primary mr-2" />
                           <span className="text-[10px] font-black uppercase text-primary tracking-widest">End-to-End Encrypted Patient Session</span>
                        </div>
                     </div>
                     <CheckCircle2 className="absolute -top-6 -right-6 w-20 h-20 text-primary animate-bounce-slow" />
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* Workflow Section */}
      <section className="py-32 bg-muted/50">
        <div className="container mx-auto px-8 md:px-12 lg:px-20">
           <div className="columns-1 lg:columns-2 gap-16 space-y-12">
              <div className="space-y-6">
                 <h2 className="text-4xl font-bold">The Modern Health Experience</h2>
                 <p className="text-lg text-muted-foreground">We've revolutionized how medical screenings are handled at Legit HealthCare Services Ltd. No more paper trails—just pure digital efficiency.</p>
                 <div className="space-y-8 pt-4">
                    <WorkflowStep number="01" title="Secure Registration" text="Verify your DCP/DCT identity via OTP and 2FA for maximum security." />
                    <WorkflowStep number="02" title="Professional Screening" text="Complete your yearly medical evaluation with our expert clinical team." />
                    <WorkflowStep number="03" title="Real-Time Access" text="Receive instant notifications when results are ready for secure viewing." />
                 </div>
              </div>
              <div className="relative rounded-3xl overflow-hidden border-2 shadow-2xl h-[400px] lg:h-full bg-card flex items-center justify-center p-12">
                 <Activity className="h-32 w-32 text-primary opacity-10 absolute animate-pulse" />
                 <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                       <Shield className="h-10 w-10" />
                    </div>
                    <h4 className="text-2xl font-bold">HIPAA Compliant</h4>
                    <p className="text-muted-foreground max-w-xs mx-auto text-sm">Every bit of your healthcare data is protected by industry-standard encryption protocols.</p>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border pt-16 pb-8">
        <div className="container mx-auto px-8 md:px-12 lg:px-20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-1 space-y-4">
               <div className="flex items-center">
                 {branding?.logo_dark ? (
                   <img src={getImageUrl(branding.logo_dark, '')} alt="Logo" className="h-6 transition-all" />
                 ) : (
                   <>
                     <Activity className="h-6 w-6 text-primary mr-2" />
                     <span className="text-2xl font-bold tracking-tight text-primary">{branding?.clinic_name || "Legit HealthCare"}</span>
                   </>
                 )}
               </div>
               <p className="text-muted-foreground max-w-xs leading-relaxed text-sm">
                 Providing premium medical screening and healthcare services with modern, efficient, and secure technology tailored for excellence.
               </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-foreground text-sm uppercase tracking-wider">Quick Links</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#services" className="hover:text-primary transition-colors">Our Services</a></li>
                <li><a href="#about" className="hover:text-primary transition-colors">About Us</a></li>
                <li><a href="#contact" className="hover:text-primary transition-colors">Contact Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-foreground text-sm uppercase tracking-wider">Contact</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li className="flex items-center gap-3 group transition-all">
                  <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="group-hover:text-primary transition-colors">{branding?.email || "contact@legithealthcare.com"}</span>
                </li>
                <li className="flex items-center gap-3 group transition-all">
                  <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <span className="group-hover:text-primary transition-colors">{branding?.phone || "+234 (0) 800 LEGIT HC"}</span>
                </li>
                <li className="flex items-start gap-3 group transition-all">
                  <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="group-hover:text-primary transition-colors leading-relaxed">{branding?.address || "Healthway Avenue, Wellness City"}</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-foreground text-sm uppercase tracking-wider">Social Connect</h4>
              <div className="flex flex-col gap-3">
                {branding?.social_links?.map((link: any, i: number) => (
                  <a 
                    key={i} 
                    href={link.value.startsWith('http') ? link.value : `https://${link.value}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                      {(() => {
                        const Icon = getSocialIcon(link.label);
                        return <Icon className="w-4 h-4" />;
                      })()}
                    </div>
                    <span className="font-bold uppercase tracking-tight text-[10px]">{link.label}</span>
                  </a>
                ))}
                {(!branding?.social_links || branding.social_links.length === 0) && (
                   <p className="text-[10px] italic text-muted-foreground/50">No social profiles linked yet.</p>
                )}
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground gap-4">
            <p>© {new Date().getFullYear()} {branding?.clinic_name || "Legit HealthCare Services Ltd."}. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
  <div className="bg-card p-10 rounded-3xl border-2 border-border hover:border-primary/40 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] transition-all group flex flex-col h-full items-start">
    <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-primary group-hover:text-primary-foreground group-hover:rotate-6 transition-all duration-300">
      {icon}
    </div>
    <h3 className="text-2xl font-bold mb-4">{title}</h3>
    <p className="text-muted-foreground leading-relaxed flex-1">{description}</p>
  </div>
);

const WorkflowStep = ({ number, title, text }: { number: string; title: string; text: string }) => (
  <div className="flex gap-6 items-start group">
    <div className="text-4xl font-black text-primary/10 group-hover:text-primary/100 transition-colors duration-500 tabular-nums">
      {number}
    </div>
    <div className="space-y-1">
      <h4 className="text-xl font-bold">{title}</h4>
      <p className="text-muted-foreground leading-relaxed">{text}</p>
    </div>
  </div>
);

export default LandingPage;
