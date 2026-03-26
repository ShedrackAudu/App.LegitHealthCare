import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { Shield, Activity, MessageSquare, Bell, Search, ArrowRight, CheckCircle2, Heart, Smartphone } from 'lucide-react';
import axios from 'axios';

const LandingPage = () => {
  const [branding, setBranding] = useState<any>(null);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/branding');
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
    return `http://localhost:5000${path}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              {branding?.logo_light ? (
                <img src={getImageUrl(branding.logo_light, '')} alt="Logo" className="h-10 mr-2" />
              ) : (
                <Activity className="h-8 w-8 text-primary mr-2" />
              )}
              <span className="text-2xl font-bold text-primary tracking-tight">{branding?.clinic_name || "Legit HealthCare"}</span>
            </div>
            <div className="hidden md:flex items-center space-x-8 text-sm font-semibold">
              <a href="#services" className="hover:text-primary transition-colors">Services</a>
              <a href="#about" className="hover:text-primary transition-colors">About</a>
              <a href="#contact" className="hover:text-primary transition-colors">Contact</a>
              <div className="flex items-center space-x-4 pl-4 border-l">
                <ModeToggle />
                <Link to="/login">
                  <Button variant="ghost" className="font-semibold">Login</Button>
                </Link>
                <Link to="/signup">
                  <Button className="font-bold">Get Started</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute top-0 left-0 w-full h-full -z-10 bg-grid-white/[0.02] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -z-10 animate-pulse" />
        
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 text-center lg:text-left space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider animate-in fade-in slide-in-from-left-4 duration-500">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                Now Live: Enhanced Real-time Messaging
              </div>
              <h1 className="text-6xl lg:text-8xl font-bold leading-[1.1] tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground via-foreground/90 to-primary/50">
                {branding?.clinic_name || "Legit HealthCare"}: <br />
                <span className="text-primary">Excellence.</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
                The official healthcare management portal for DCP & DCT staff. Securely manage screenings, communicate with your clinical team, and track your wellness journey.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center lg:justify-start pt-4">
                <Link to="/signup">
                  <Button size="lg" className="w-full sm:w-auto h-16 px-10 text-lg font-bold shadow-[0_20px_50px_rgba(var(--primary),_0.3)] hover:scale-105 transition-transform">
                    Start Your Profile <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto h-16 px-10 text-lg font-bold border-2 hover:bg-muted/50 transition-colors">
                    Member Login
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
      <section id="services" className="py-32 relative">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight">Enterprise-Grade Clinical Features</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">Built with the highest standards of modern web technology to serve the health needs of Legit HealthCare professionals.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <FeatureCard 
              icon={<MessageSquare className="w-6 h-6 text-primary" />} 
              title="Real-Time Messaging" 
              description="Directly connect with clinic administrators and medical staff. Instant updates and secure communication channels." 
            />
            <FeatureCard 
              icon={<Shield className="w-6 h-6 text-primary" />} 
              title="Secure Screenings" 
              description="Your medical data is encrypted and private. Access your yearly screening results and transcripts with one click." 
            />
            <FeatureCard 
              icon={<Bell className="w-6 h-6 text-primary" />} 
              title="Smart Notifications" 
              description="Never miss a medical appointment. Real-time alerts for screenings, results, and critical health updates." 
            />
            <FeatureCard 
              icon={<Search className="w-6 h-6 text-primary" />} 
              title="Unified Directory" 
              description="Efficiently browse staff information across DCP and DCT departments with advanced search capabilities." 
            />
            <FeatureCard 
              icon={<Smartphone className="w-6 h-6 text-primary" />} 
              title="Multi-Contact Sync" 
              description="Stay reachable with WhatsApp, social media, and additional contact synchronization across the platform." 
            />
            <FeatureCard 
              icon={<CheckCircle2 className="w-6 h-6 text-primary" />} 
              title="Verified Profiles" 
              description="Official DCP/DCT verification hierarchy ensures only authorized staff access sensitive healthcare data." 
            />
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-32 bg-muted/50">
        <div className="container mx-auto px-6">
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
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-1 space-y-4">
               <div className="flex items-center">
                 {branding?.logo_light ? (
                   <img src={getImageUrl(branding.logo_light, '')} alt="Logo" className="h-6 mr-2" />
                 ) : (
                   <Activity className="h-6 w-6 text-primary mr-2" />
                 )}
                 <span className="text-2xl font-bold tracking-tight text-primary">{branding?.clinic_name || "Legit HealthCare"}</span>
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
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {branding?.email || "contact@legithealthcare.com"}
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {branding?.phone || "+234 (0) 800 LEGIT HC"}
                </li>
                <li className="flex items-start gap-2 max-w-[200px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  {branding?.address || "Healthway Avenue, Wellness City"}
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
                    <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <ArrowRight className="w-3 h-3" />
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
