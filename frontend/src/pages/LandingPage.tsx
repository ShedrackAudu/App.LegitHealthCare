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
  Calendar,
  Sparkles,
  Stethoscope,
  Microscope,
  Database
} from 'lucide-react';
import axios from 'axios';
import { motion, useScroll, useTransform } from 'framer-motion';

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
        <div className="container mx-auto px-4 md:px-12 lg:px-20">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              {/* Desktop Logo: Full Branding */}
              {/* Desktop Logo: Brandmark Preferred */}
              <div className="hidden md:flex items-center">
                {branding?.logo_light ? (
                  <img src={getImageUrl(branding.logo_light, '')} alt="Logo" className="h-10 transition-all" />
                ) : branding?.logo_dark ? (
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
                <Button variant="outline" className="border-primary text-primary hover:bg-primary/10 font-bold px-4 rounded-xl border-2 text-[10px] uppercase tracking-widest h-9">
                  Patient Portal
                </Button>
              </Link>
              <a href="#about" className="hover:text-primary transition-colors">About</a>
              <div className="flex items-center space-x-4 pl-4 border-l">
                <ModeToggle />
                <Link to="/login">
                  <Button variant="ghost" className="font-semibold px-4 rounded-xl">Login</Button>
                </Link>
                <Link to="/signup">
                  <Button className="font-bold px-6 shadow-lg shadow-primary/20 rounded-xl">Get Started</Button>
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
                <Button className="w-full text-lg h-12 shadow-lg rounded-xl">Get Started</Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 lg:pt-24 lg:pb-28 overflow-hidden">
        {/* Advanced Background System */}
        <div className="absolute inset-0 -z-10 bg-background overflow-hidden">
          <motion.div 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.07 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${getImageUrl(branding?.auth_branding_image, "/images/medical_equipment_1.png")})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
          <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/20 rounded-full blur-[160px] animate-pulse" />
          <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-500/15 rounded-full blur-[160px]" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
          <div className="absolute inset-0 bg-grid-white/[0.02]" />
        </div>
        
        <div className="container mx-auto px-6 md:px-12 lg:px-20 relative">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left Content Side */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex-1 text-left space-y-7"
            >
              <div className="space-y-5">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md"
                >
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Now Live: Patient Portal</span>
                </motion.div>
                
                <h1 className="text-5xl sm:text-7xl lg:text-[105px] font-black leading-[0.95] tracking-tight group">
                  <span className="block bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                    {branding?.clinic_name || "Legit HealthCare"}
                  </span>
                  <motion.span 
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="block h-2 bg-primary/40 w-1/4 mt-4 rounded-full origin-left group-hover:w-1/2 transition-all duration-700"
                  />
                  <span className="text-[19px] lg:text-[39px] text-primary font-black mt-6 block tracking-tight whitespace-nowrap">
                    {branding?.clinic_slogan || "Excellence in Care."}
                  </span>
                </h1>
                
                <p className="text-[13px] sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl font-medium">
                  The official healthcare management portal for managing staff annual medical screenings with an advanced self-service patient portal for tracking and managing health and personal data.
                </p>
              </div>

              <div className="flex flex-row items-center gap-3 sm:gap-5">
                <Link to="/signup">
                  <Button size="lg" className="h-14 sm:h-16 px-6 sm:px-10 text-base sm:text-lg font-black rounded-xl shadow-2xl shadow-primary/40 hover:shadow-primary/60 hover:-translate-y-1 active:translate-y-0.5 transition-all bg-primary relative overflow-hidden group">
                    <span className="relative z-10 flex items-center">
                      Get Started <ArrowRight className="ml-3 h-5 w-5" />
                    </span>
                    <motion.div 
                      className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 skew-x-12"
                    />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg" className="h-14 sm:h-16 px-6 sm:px-10 text-base sm:text-lg font-black rounded-xl border-2 border-border/50 bg-background/50 backdrop-blur-xl hover:bg-muted/50 hover:border-primary/50 transition-all">
                    Login
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-5 sm:pt-7 flex flex-row items-center gap-4 sm:gap-8 border-t border-border/50">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold overflow-hidden">
                      <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" />
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full border-2 border-background bg-primary text-white flex items-center justify-center text-[10px] font-black uppercase">
                    +2k
                  </div>
                </div>
                <div className="h-8 w-px bg-border/50 hidden sm:block" />
                <div className="space-y-1">
                   <div className="flex gap-1">
                     {[1,2,3,4,5].map(i => <Sparkles key={i} className="w-3 h-3 text-amber-500 fill-amber-500" />)}
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Certified Medical Services</p>
                </div>
              </div>
            </motion.div>

            {/* Right Visual Side */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "circOut", delay: 0.3 }}
              className="lg:flex-1 relative w-full"
            >
              <div className="relative mx-auto lg:ml-auto group max-w-2xl">
                {/* Visual Depth Elements */}
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-primary/10 rounded-full blur-3xl" />
                
                {/* Main Interface Box */}
                <div className="relative bg-card/60 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-[0_40px_100px_rgba(0,0,0,0.15)] overflow-hidden lg:rotate-2 group-hover:rotate-0 transition-transform duration-1000 p-8 sm:p-12">
                   
                   {/* Interface Header */}
                   <div className="flex justify-between items-center mb-10 pb-6 border-b border-border/50">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400/30" />
                        <div className="w-3 h-3 rounded-full bg-amber-400/30" />
                        <div className="w-3 h-3 rounded-full bg-emerald-400/30" />
                      </div>
                      <div className="px-4 py-1 rounded-full bg-muted/50 border border-border/50 text-[9px] font-black tracking-widest uppercase opacity-60">
                         Clinical Interface v2.0
                      </div>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-10">
                      {/* Sub-Card 1 */}
                      <motion.div 
                        whileHover={{ y: -5, scale: 1.02 }}
                        className="h-44 rounded-xl overflow-hidden border border-white/20 shadow-xl relative group/card cursor-pointer"
                      >
                         <img 
                          src={getImageUrl(branding?.hero_image_1, "/images/medical_equipment_1.png")} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110" 
                          alt="Medical Equipment"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 transition-opacity group-hover/card:opacity-80" />
                        <div className="absolute bottom-4 left-4 right-4">
                           <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[9px] font-black uppercase tracking-wider text-white">
                              <Microscope className="w-3 h-3" /> Diagnostics
                           </div>
                        </div>
                      </motion.div>

                      {/* Sub-Card 2 */}
                      <motion.div 
                        whileHover={{ y: -5, scale: 1.02 }}
                        transition={{ delay: 0.1 }}
                        className="h-44 rounded-xl overflow-hidden border border-white/20 shadow-xl relative group/card cursor-pointer"
                      >
                         <img 
                          src={getImageUrl(branding?.hero_image_2, "/images/medical_equipment_2.png")} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110" 
                          alt="Clinical Analytics"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 transition-opacity group-hover/card:opacity-80" />
                        <div className="absolute bottom-4 left-4 right-4">
                           <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[9px] font-black uppercase tracking-wider text-white">
                              <Database className="w-3 h-3" /> Bio-Analytics
                           </div>
                        </div>
                      </motion.div>

                      {/* Large Main Card */}
                      <motion.div 
                        whileHover={{ y: -5, scale: 1.01 }}
                        transition={{ delay: 0.2 }}
                        className="sm:col-span-2 h-64 rounded-xl overflow-hidden border border-white/20 shadow-2xl relative group/card cursor-pointer"
                      >
                         <img 
                          src={getImageUrl(branding?.hero_image_team, "/images/african_american_doctors.png")} 
                          className="w-full h-full object-cover transition-transform duration-1000 group-hover/card:scale-105" 
                          alt="Medical Team"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent opacity-40 transition-opacity group-hover/card:opacity-60" />
                        <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                           <div className="space-y-1">
                              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">Expert Staff</p>
                              <h4 className="text-xl font-black text-white">Clinical Intelligence Team</h4>
                           </div>
                           <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 text-white">
                              <Stethoscope className="w-6 h-6" />
                           </div>
                        </div>
                      </motion.div>
                   </div>

                   {/* Floating Heart Button */}
                   <motion.div 
                     animate={{ y: [0, -10, 0] }}
                     transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                     className="absolute -bottom-5 -right-5 w-20 h-20 bg-background/50 backdrop-blur-3xl rounded-2xl border border-border shadow-2xl flex items-center justify-center z-20 hover:scale-110 transition-transform cursor-pointer group/heart"
                   >
                      <Heart className="w-8 h-8 text-rose-500 fill-rose-500/10 group-hover/heart:fill-rose-500 transition-all" />
                   </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="services" className="pt-24 pb-12 relative overflow-hidden">
        <div className="container mx-auto px-8 md:px-12 lg:px-20">
          <div className="text-left md:text-center max-w-3xl md:mx-auto mb-20 space-y-4">
            <h2 className="text-4xl lg:text-6xl font-black tracking-tight">Clinical Features</h2>
            <p className="text-lg text-muted-foreground font-medium">Built with the highest standards of modern healthcare technology.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
            <FeatureCard 
              icon={<CheckCircle2 className="w-6 h-6" />} 
              title="Verified Reports" 
              description="Access and download your official signed medical reports in PDF format with digital authenticity." 
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
          </div>
        </div>
      </section>

      {/* NEW Patient Portal Highlight Section */}
      <section id="patient-portal" className="pt-16 pb-32 relative overflow-hidden">
         <div className="absolute inset-0 bg-primary/5 -z-10" />
         <div className="container mx-auto px-8 md:px-12 lg:px-20">
            <div className="bg-card/50 backdrop-blur-3xl rounded-3xl border-2 border-primary/10 shadow-3xl overflow-hidden p-8 md:p-20 relative">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                  <div className="space-y-10">
                     <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[.3em] border border-primary/20">
                           Self-Service Excellence
                        </div>
                        <h2 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05]">
                           The New <br />
                           <span className="text-primary">Patient Portal</span>
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
                           <h4 className="text-xl font-bold">Secure 2FA</h4>
                           <p className="text-muted-foreground text-sm leading-relaxed">Your medical privacy is our priority. Every login session is protected by mandatory Two-Factor Authentication (2FA).</p>
                        </div>
                        <div className="space-y-3">
                           <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary font-black text-xl">3</div>
                           <h4 className="text-xl font-bold">Digital Reports</h4>
                           <p className="text-muted-foreground text-sm leading-relaxed">Download and print your official medical screening reports directly from your secure dashboard.</p>
                        </div>
                        <div className="space-y-3">
                           <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary font-black text-xl">4</div>
                           <h4 className="text-xl font-bold">Digital Bookings</h4>
                           <p className="text-muted-foreground text-sm leading-relaxed">Skip the queue by scheduling your screening sessions directly from your dashboard.</p>
                        </div>
                     </div>

                     <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <Link to="/signup?portal=patient">
                           <Button size="lg" className="h-16 px-10 text-lg font-black shadow-2xl shadow-primary/30 transition-transform active:scale-95 bg-primary rounded-xl">
                              Claim My Account
                           </Button>
                        </Link>
                        <Link to="/login?portal=patient">
                           <Button variant="outline" size="lg" className="h-16 px-10 text-lg font-black border-2 hover:bg-primary/5 shadow-xl transition-transform active:scale-95 rounded-xl">
                              Log in to Portal
                           </Button>
                        </Link>
                     </div>
                  </div>

                  {/* Portal Mockup Element */}
                  <div className="relative group">
                     <div className="absolute -inset-10 bg-primary/20 rounded-[5rem] blur-[80px] -z-10 group-hover:bg-primary/30 transition-all duration-1000" />
                     <div className="rounded-3xl border-8 border-muted bg-card shadow-2xl overflow-hidden aspect-[16/10] flex flex-col">
                        <div className="h-12 bg-muted flex items-center px-6 gap-2">
                           <div className="flex gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-red-500/50" />
                              <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                              <div className="w-3 h-3 rounded-full bg-primary/50" />
                           </div>
                           <div className="mx-auto bg-background/50 h-5 w-48 rounded-md" />
                        </div>
                        <div className="flex-1 p-8 space-y-6">
                           <div className="h-20 bg-primary/5 rounded-2xl border-2 border-primary/10 border-dashed" />
                           <div className="grid grid-cols-3 gap-4">
                              <div className="h-24 bg-blue-500/5 rounded-2xl border border-blue-500/10" />
                              <div className="h-24 bg-amber-500/5 rounded-2xl border border-amber-500/10" />
                              <div className="h-24 bg-primary/5 rounded-2xl border border-primary/10" />
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
      <section className="py-32 bg-primary relative overflow-hidden">
        {/* Decorative elements for depth */}
        <div className="absolute inset-0 bg-grid-white/[0.05] [mask-image:radial-gradient(ellipse_at_center,white,transparent)] -z-10" />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-primary via-primary/50 to-primary opacity-50 -z-10" />
        
        <div className="container mx-auto px-8 md:px-12 lg:px-20 relative z-10">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-6">
                 <h2 className="text-4xl font-bold text-primary-foreground">The Modern Health Experience</h2>
                 <p className="text-lg text-primary-foreground/70">We've revolutionized how medical screenings are handled at Legit HealthCare Services Ltd. No more paper trails—just pure digital efficiency.</p>
                 <div className="space-y-8 pt-4">
                    <WorkflowStep number="01" title="Secure Registration" text="Verify your patient profile identity via OTP and 2FA for maximum security." />
                    <WorkflowStep number="02" title="Professional Screening" text="Complete your yearly medical evaluation with our expert clinical team." />
                    <WorkflowStep number="03" title="Real-Time Access" text="Receive instant notifications and view your medical reports as soon as they are finalized." />
                 </div>
              </div>
               <div className="relative rounded-3xl overflow-hidden border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] h-[400px] lg:h-full bg-white/5 backdrop-blur-[40px] flex items-center justify-center p-12 group/hipaa ring-1 ring-white/10">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  <Activity className="h-40 w-40 text-white opacity-5 absolute -right-10 -bottom-10 rotate-12 transition-transform duration-1000 group-hover/hipaa:rotate-0" />
                  <div className="text-center relative z-10 space-y-6">
                     <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center mx-auto text-white border border-white/20 shadow-2xl relative group-hover/hipaa:scale-110 transition-transform duration-500">
                        <div className="absolute inset-0 bg-primary blur-2xl opacity-20 group-hover/hipaa:opacity-40 transition-opacity" />
                        <Shield className="h-10 w-10 relative z-10" />
                     </div>
                     <div className="space-y-2">
                        <h4 className="text-3xl font-black text-white tracking-tight">HIPAA Compliant</h4>
                        <div className="h-1 w-12 bg-white/20 mx-auto rounded-full" />
                     </div>
                     <p className="text-white/60 max-w-[280px] mx-auto text-sm leading-relaxed font-medium">
                        Every bit of your healthcare data is protected by industry-standard encryption protocols.
                     </p>
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
    <div className="text-4xl font-black text-primary-foreground/20 group-hover:text-primary-foreground/60 transition-colors duration-500 tabular-nums">
      {number}
    </div>
    <div className="space-y-1">
      <h4 className="text-xl font-bold text-primary-foreground">{title}</h4>
      <p className="text-primary-foreground/60 leading-relaxed text-sm">{text}</p>
    </div>
  </div>
);

export default LandingPage;
