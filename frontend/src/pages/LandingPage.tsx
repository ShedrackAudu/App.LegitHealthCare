import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Shield01Icon, 
  Activity01Icon, 
  Comment01Icon, 
  Notification01Icon, 
  ArrowRight01Icon, 
  CheckmarkCircle02Icon, 
  FavouriteIcon, 
  Facebook01Icon,  
  TwitterIcon, 
  InstagramIcon, 
  Linkedin01Icon, 
  YoutubeIcon, 
  GlobeIcon, 
  Link01Icon, 
  Message01Icon, 
  TiktokIcon, 
  Menu01Icon, 
  Cancel01Icon, 
  Mail01Icon, 
  CallIcon, 
  Location01Icon, 
  Note01Icon, 
  Analytics01Icon, 
  Calendar03Icon, 
  SparklesIcon, 
  StethoscopeIcon, 
  MicroscopeIcon, 
  Database02Icon, 
  ArrowUp01Icon 
} from '@hugeicons/core-free-icons';
import axios from 'axios';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { SafeImage } from '@/components/common/SafeImage';
import { useAppContext } from '@/context/AppContext';

const LandingPage = () => {
  const { branding } = useAppContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { scrollY } = useScroll();

  useEffect(() => {
    return scrollY.on("change", (latest) => {
      if (latest > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    });
  }, [scrollY]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getImageUrl = (path: string, fallback: string) => {
    if (!path) return fallback;
    if (path.startsWith('http')) return path;
    return `${(window as any).API_BASE_URL}${path}`;
  };

  const getSocialIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('facebook')) return (props: any) => <HugeiconsIcon icon={Facebook01Icon} {...props} />;
    if (l.includes('twitter') || l.includes('x')) return (props: any) => <HugeiconsIcon icon={TwitterIcon} {...props} />;
    if (l.includes('instagram')) return (props: any) => <HugeiconsIcon icon={InstagramIcon} {...props} />;
    if (l.includes('linkedin')) return (props: any) => <HugeiconsIcon icon={Linkedin01Icon} {...props} />;
    if (l.includes('youtube')) return (props: any) => <HugeiconsIcon icon={YoutubeIcon} {...props} />;
    if (l.includes('globe') || l.includes('web')) return (props: any) => <HugeiconsIcon icon={GlobeIcon} {...props} />;
    if (l.includes('whatsapp')) return (props: any) => <HugeiconsIcon icon={Message01Icon} {...props} />;
    if (l.includes('tiktok')) return (props: any) => <HugeiconsIcon icon={TiktokIcon} {...props} />;
    return (props: any) => <HugeiconsIcon icon={Link01Icon} {...props} />;
  };

  return (
    <>
      <div className="h-full overflow-y-auto bg-background text-foreground selection:bg-primary/20">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 md:px-12 lg:px-20">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              {/* Desktop Logo: Full Branding */}
              {/* Desktop Logo: Brandmark Preferred */}
              <div className="hidden md:flex items-center">
                {branding?.logo_light ? (
                  <SafeImage src={getImageUrl(branding.logo_light, '')} alt={branding?.clinic_name || "Logo"} className="h-10 transition-all" fallbackText={branding?.clinic_name} />
                ) : branding?.logo_dark ? (
                  <SafeImage src={getImageUrl(branding.logo_dark, '')} alt={branding?.clinic_name || "Logo"} className="h-10 transition-all" fallbackText={branding?.clinic_name} />
                ) : (
                  <div className="flex items-center">
                    <HugeiconsIcon icon={Activity01Icon} className="h-8 w-8 text-primary mr-2" />
                    <span className="text-2xl font-bold text-primary tracking-tight">{branding?.clinic_name || "Legit HealthCare"}</span>
                  </div>
                )}
              </div>
              
              {/* Mobile Logo: Brandmark Only */}
              <div className="md:hidden">
                {branding?.logo_light ? (
                  <SafeImage src={getImageUrl(branding.logo_light, '')} alt="Logo" className="h-10 transition-all" />
                ) : branding?.logo_dark ? (
                  <SafeImage src={getImageUrl(branding.logo_dark, '')} alt="Logo" className="h-10 transition-all" />
                ) : (
                  <HugeiconsIcon icon={Activity01Icon} className="h-8 w-8 text-primary" />
                )}
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8 text-sm font-semibold text-muted-foreground">
              <a href="#services" className="hover:text-primary transition-colors">Services</a>
              <a href="#about" className="hover:text-primary transition-colors">About</a>
              <div className="flex items-center space-x-4 pl-4 border-l">
                <ModeToggle />
                <Link to="/login">
                  <Button variant="outline" className="border-primary text-primary hover:bg-primary/10 font-bold px-6 rounded-xl border-2">Sign In</Button>
                </Link>
                <Link to="/signup?portal=staff">
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
                {menuOpen ? <HugeiconsIcon icon={Cancel01Icon} className="h-6 w-6" /> : <HugeiconsIcon icon={Menu01Icon} className="h-6 w-6" />}
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
            </div>
            <div className="pt-6 border-t border-border flex flex-col gap-4">
              <Link to="/login" onClick={() => setMenuOpen(false)}>
                <Button variant="outline" className="w-full text-lg h-12 border-primary text-primary hover:bg-primary/10 border-2 font-bold rounded-xl shadow-sm">Login</Button>
              </Link>
              <Link to="/signup?portal=staff" onClick={() => setMenuOpen(false)}>
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
            style={{ backgroundImage: `url(${getImageUrl(branding?.auth_branding_image, "/images/medical_equipment_1.webp")})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
          <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/20 rounded-full blur-[160px] animate-pulse" />
          <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-blue-500/15 rounded-full blur-[160px]" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
          <div className="absolute inset-0 bg-grid-white/[0.02]" />
        </div>
        
        <div className="container mx-auto px-6 md:px-12 lg:px-20 relative">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
            {/* Left Content Side */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex-1 text-center lg:text-left space-y-7"
            >
              <div className="space-y-5">

                <h1 className="text-5xl sm:text-7xl lg:text-[95px] font-black leading-[0.95] tracking-tight group">
                  <span className="block bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 pb-4">
                    {branding?.clinic_slogan || "Excellence in Care."}
                  </span>
                  <motion.span 
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="block h-2 bg-primary/40 w-1/4 mt-8 rounded-full origin-left group-hover:w-1/2 transition-all duration-700 mx-auto lg:mx-0"
                  />
                  <span className="text-[19px] lg:text-[35px] text-primary font-black mt-10 block tracking-tight pb-2">
                    {branding?.clinic_name || "Legit HealthCare"}
                  </span>
                </h1>
                
                <p className="text-[13px] sm:text-lg md:text-lg text-muted-foreground leading-relaxed max-w-xl font-medium mx-auto lg:mx-0">
                  The official healthcare management portal for managing staff annual medical screenings with an advanced self-service patient portal for tracking and managing health and personal data.
                </p>
              </div>

              <div className="flex flex-row items-center justify-center lg:justify-start gap-3 sm:gap-5">
                <Link to="/signup?portal=staff">
                  <Button size="lg" className="h-14 sm:h-16 px-6 sm:px-10 text-base sm:text-lg font-black rounded-xl shadow-2xl shadow-primary/40 hover:shadow-primary/60 hover:-translate-y-1 active:translate-y-0.5 transition-all bg-primary relative overflow-hidden group">
                    <span className="relative z-10 flex items-center">
                      Get Started <HugeiconsIcon icon={ArrowRight01Icon} className="ml-3 h-5 w-5" />
                    </span>
                    <motion.div 
                      className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 skew-x-12"
                    />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg" className="h-14 sm:h-16 px-6 sm:px-10 text-base sm:text-lg font-black rounded-xl border-2 border-primary text-primary hover:bg-primary/10 bg-background/50 backdrop-blur-xl transition-all">
                    Login
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-5 sm:pt-7 flex flex-row items-center justify-center lg:justify-start gap-4 sm:gap-8 border-t border-border/50">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold overflow-hidden">
                      <SafeImage src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" />
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full border-2 border-background bg-primary text-white flex items-center justify-center text-[10px] font-black uppercase">
                    +2k
                  </div>
                </div>
                <div className="h-8 w-px bg-border/50 hidden sm:block" />
                <div className="space-y-1">
                   <div className="flex gap-1 justify-center lg:justify-start">
                     {[1,2,3,4,5].map(i => <HugeiconsIcon icon={SparklesIcon} key={i} className="w-3 h-3 text-amber-500 fill-amber-500" />)}
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
              className="lg:flex-1 relative w-full mt-8 lg:mt-0"
            >
              <div className="relative mx-auto lg:ml-auto group max-w-2xl">
                {/* Visual Depth Elements */}
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-primary/10 rounded-full blur-3xl" />
                
                {/* Grid of Clinical Mockups */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-10">
                  {/* Sub-Card 1 */}
                  <motion.div 
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="h-48 sm:h-56 rounded-xl overflow-hidden border border-white/20 shadow-xl relative group/card cursor-pointer"
                  >
                     <SafeImage 
                      src={getImageUrl(branding?.hero_image_1, "/images/medical_equipment_1.webp")} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110" 
                      alt="Diagnostics"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 transition-opacity group-hover/card:opacity-80" />
                    <div className="absolute bottom-4 left-4 right-4">
                       <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[9px] font-black uppercase tracking-wider text-white">
                          <HugeiconsIcon icon={MicroscopeIcon} className="w-3 h-3" /> Diagnostics
                       </div>
                    </div>
                  </motion.div>

                  {/* Sub-Card 2 */}
                  <motion.div 
                    whileHover={{ y: -5, scale: 1.02 }}
                    transition={{ delay: 0.1 }}
                    className="h-48 sm:h-56 rounded-xl overflow-hidden border border-white/20 shadow-xl relative group/card cursor-pointer"
                  >
                     <SafeImage 
                      src={getImageUrl(branding?.hero_image_2, "/images/medical_equipment_2.webp")} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-110" 
                      alt="Bio-Analytics"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 transition-opacity group-hover/card:opacity-80" />
                    <div className="absolute bottom-4 left-4 right-4">
                       <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[9px] font-black uppercase tracking-wider text-white">
                          <HugeiconsIcon icon={Database02Icon} className="w-3 h-3" /> Bio-Analytics
                       </div>
                    </div>
                  </motion.div>

                  {/* Large Main Card */}
                  <motion.div 
                    whileHover={{ y: -5, scale: 1.01 }}
                    transition={{ delay: 0.2 }}
                    className="sm:col-span-2 h-64 sm:h-80 rounded-xl overflow-hidden border border-white/20 shadow-2xl relative group/card cursor-pointer"
                  >
                     <SafeImage 
                      src={getImageUrl(branding?.hero_image_team, "/images/african_american_doctors.webp")} 
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
                          <HugeiconsIcon icon={StethoscopeIcon} className="w-6 h-6" />
                       </div>
                    </div>
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
          <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
            <h2 className="text-4xl lg:text-6xl font-black tracking-tight">Clinical Features</h2>
            <p className="text-lg text-muted-foreground font-medium">Built with the highest standards of modern healthcare technology.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<HugeiconsIcon icon={Note01Icon} className="w-6 h-6" />} 
              title="Digital Health Records" 
              description="Access all your screening history and medical records in one centralized, secure digital vault." 
            />
            <FeatureCard 
              icon={<HugeiconsIcon icon={Analytics01Icon} className="w-6 h-6" />} 
              title="Health Analytics" 
              description="Gain insights into your health with automated trend analysis across your yearly medical evaluations." 
            />
            <FeatureCard 
              icon={<HugeiconsIcon icon={Calendar03Icon} className="w-6 h-6" />} 
              title="Appointment Scheduler" 
              description="Seamlessly book and manage your yearly medical screenings and follow-up consultations." 
            />
            <FeatureCard 
              icon={<HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-6 h-6" />} 
              title="Verified Reports" 
              description="Access and download your official signed medical reports in PDF format with digital authenticity." 
            />
            <FeatureCard 
              icon={<HugeiconsIcon icon={Shield01Icon} className="w-6 h-6" />} 
              title="Encrypted" 
              description="Your data is private. Access yearly screening results with industry-standard encryption." 
            />
            <FeatureCard 
              icon={<HugeiconsIcon icon={Notification01Icon} className="w-6 h-6" />} 
              title="Alerts" 
              description="Never miss an appointment. Automated reminders for screenings and medical follow-ups." 
            />
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 relative overflow-hidden border-t border-b border-border/50">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 bg-muted/10 -z-10" />
        <div className="absolute top-1/2 left-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -z-10" />
        
        <div className="container mx-auto px-8 md:px-12 lg:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Column: Visual/Stats */}
            <motion.div 
              initial={{ opacity: 0, x: -35 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div className="relative group rounded-3xl overflow-hidden border-2 border-border/50 bg-card p-8 md:p-12 shadow-2xl">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
                <h3 className="text-3xl font-black tracking-tight mb-6">Our Impact in Numbers</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2 p-6 rounded-2xl bg-primary/5 border border-primary/10">
                    <span className="text-4xl md:text-5xl font-black text-primary tracking-tight">99.9%</span>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Screening Accuracy</p>
                  </div>
                  <div className="space-y-2 p-6 rounded-2xl bg-primary/5 border border-primary/10">
                    <span className="text-4xl md:text-5xl font-black text-primary tracking-tight">15k+</span>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Evaluations Completed</p>
                  </div>
                  <div className="space-y-2 p-6 rounded-2xl bg-primary/5 border border-primary/10">
                    <span className="text-4xl md:text-5xl font-black text-primary tracking-tight">24/7</span>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Portal Availability</p>
                  </div>
                  <div className="space-y-2 p-6 rounded-2xl bg-primary/5 border border-primary/10">
                    <span className="text-4xl md:text-5xl font-black text-primary tracking-tight">100%</span>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">HIPAA & NDPA Compliant</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Column: Narrative */}
            <motion.div 
              initial={{ opacity: 0, x: 35 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="space-y-8 text-center lg:text-left"
            >
              <div className="space-y-4">
                <div className="flex justify-center lg:justify-start">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                    <HugeiconsIcon icon={FavouriteIcon} className="w-4 h-4 text-primary fill-primary/20" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">About Legit HealthCare</span>
                  </div>
                </div>
                <h2 className="text-4xl lg:text-6xl font-black tracking-tight leading-[1.05]">
                  Pioneering the Future of <span className="text-primary">Clinical Excellence</span>
                </h2>
                <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                  At Legit HealthCare, we blend medical expertise with state-of-the-art software technology to redefine employee medical screenings. Our mission is to empower clinics, organizations, and patients with secure, real-time access to diagnostic insights.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col items-center text-center lg:flex-row lg:items-start lg:text-left gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                    <HugeiconsIcon icon={Shield01Icon} className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">Uncompromising Security</h4>
                    <p className="text-sm text-muted-foreground mt-1">We utilize enterprise-level encryption and secure two-factor authentication to guarantee patient confidentiality and clinical record integrity.</p>
                  </div>
                </div>
                <div className="flex flex-col items-center text-center lg:flex-row lg:items-start lg:text-left gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                    <HugeiconsIcon icon={Activity01Icon} className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold">Advanced Diagnostic Integrations</h4>
                    <p className="text-sm text-muted-foreground mt-1">From automated spirometry, ECG mapping, to audiometry assessments, we make complex clinical diagnostics fast, seamless, and transparent.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* NEW Patient Portal Highlight Section */}
      <section id="patient-portal" className="pt-16 pb-32 relative overflow-hidden">
         <div className="absolute inset-0 bg-primary/5 -z-10" />
         <div className="container mx-auto px-8 md:px-12 lg:px-20">
            <div className="bg-card/50 backdrop-blur-3xl rounded-3xl border-2 border-primary/10 shadow-3xl overflow-hidden p-8 md:p-20 relative">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                  <div className="space-y-10 text-center lg:text-left">
                     <div className="space-y-4">
                        <div className="flex justify-center lg:justify-start">
                           <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[.3em] border border-primary/20">
                              Self-Service Excellence
                           </div>
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
                        <div className="space-y-3 flex flex-col items-center text-center sm:items-start sm:text-left">
                           <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white font-black text-xl">1</div>
                           <h4 className="text-xl font-bold">Claim Account</h4>
                           <p className="text-muted-foreground text-sm leading-relaxed">Enter your Staff ID and verify your identity via a secure OTP sent to your company email.</p>
                        </div>
                        <div className="space-y-3 flex flex-col items-center text-center sm:items-start sm:text-left">
                           <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary font-black text-xl">2</div>
                           <h4 className="text-xl font-bold">Secure 2FA</h4>
                           <p className="text-muted-foreground text-sm leading-relaxed">Your medical privacy is our priority. Every login session is protected by mandatory Two-Factor Authentication (2FA).</p>
                        </div>
                        <div className="space-y-3 flex flex-col items-center text-center sm:items-start sm:text-left">
                           <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary font-black text-xl">3</div>
                           <h4 className="text-xl font-bold">Digital Reports</h4>
                           <p className="text-muted-foreground text-sm leading-relaxed">Download and print your official medical screening reports directly from your secure dashboard.</p>
                        </div>
                        <div className="space-y-3 flex flex-col items-center text-center sm:items-start sm:text-left">
                           <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary font-black text-xl">4</div>
                           <h4 className="text-xl font-bold">Digital Bookings</h4>
                           <p className="text-muted-foreground text-sm leading-relaxed">Skip the queue by scheduling your screening sessions directly from your dashboard.</p>
                        </div>
                     </div>

                     <div className="flex flex-col sm:flex-row items-center sm:items-start justify-center lg:justify-start gap-4 pt-4">
                        <Link to="/signup?portal=patient">
                           <Button size="lg" className="h-16 px-10 text-lg font-black shadow-2xl shadow-primary/30 transition-transform active:scale-95 bg-primary rounded-xl">
                              Claim My Account
                           </Button>
                        </Link>
                        <Link to="/login?portal=patient">
                           <Button variant="outline" size="lg" className="h-16 px-10 text-lg font-black border-2 border-primary text-primary hover:bg-primary/10 shadow-xl transition-all active:scale-95 rounded-xl">
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
                           <HugeiconsIcon icon={Shield01Icon} className="w-5 h-5 text-primary mr-2" />
                           <span className="text-[10px] font-black uppercase text-primary tracking-widest">End-to-End Encrypted Patient Session</span>
                        </div>
                     </div>
                     <HugeiconsIcon icon={CheckmarkCircle02Icon} className="absolute -top-6 -right-6 w-20 h-20 text-primary animate-bounce-slow" />
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
              <div className="space-y-6 text-center lg:text-left">
                 <h2 className="text-4xl font-bold text-primary-foreground">The Modern Health Experience</h2>
                 <p className="text-lg text-primary-foreground/70">We've revolutionized how medical screenings are handled at Legit HealthCare Services Ltd. No more paper trails—just pure digital efficiency.</p>
                 <div className="space-y-8 pt-4">
                    <WorkflowStep number="01" title="Secure Registration" text="Verify your patient profile identity via OTP and 2FA for maximum security." />
                    <WorkflowStep number="02" title="Professional Screening" text="Complete your yearly medical evaluation with our expert clinical team." />
                    <WorkflowStep number="03" title="Real-Time Access" text="Receive instant notifications and view your medical reports as soon as they are finalized." />
                 </div>
              </div>
               <div className="relative rounded-3xl overflow-hidden border border-white/20 h-[400px] lg:h-full bg-white/5 backdrop-blur-[40px] flex items-center justify-center p-12 group/security ring-1 ring-white/10">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  <HugeiconsIcon icon={Activity01Icon} className="h-40 w-40 text-white opacity-5 absolute -right-10 -bottom-10 rotate-12 transition-transform duration-1000 group-hover/security:rotate-0" />
                  <div className="text-center relative z-10 space-y-6">
                     <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center mx-auto text-white border border-white/20 shadow-2xl relative group-hover/security:scale-110 transition-transform duration-500">
                        <div className="absolute inset-0 bg-primary blur-2xl opacity-20 group-hover/security:opacity-40 transition-opacity" />
                        <HugeiconsIcon icon={Shield01Icon} className="h-10 w-10 relative z-10" />
                     </div>
                     <div className="space-y-2">
                        <h4 className="text-3xl font-black text-white tracking-tight">NHA & NDPA Compliant</h4>
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
                     <HugeiconsIcon icon={Activity01Icon} className="h-6 w-6 text-primary mr-2" />
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
                    <HugeiconsIcon icon={Mail01Icon} className="w-4 h-4" />
                  </div>
                  <span className="group-hover:text-primary transition-colors">{branding?.email || "contact@legithealthcare.com"}</span>
                </li>
                <li className="flex items-center gap-3 group transition-all">
                  <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                    <HugeiconsIcon icon={CallIcon} className="w-4 h-4" />
                  </div>
                  <span className="group-hover:text-primary transition-colors">{branding?.phone || "+234 (0) 800 LEGIT HC"}</span>
                </li>
                <li className="flex items-start gap-3 group transition-all">
                  <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0 mt-0.5">
                    <HugeiconsIcon icon={Location01Icon} className="w-4 h-4" />
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
    
    {/* Return to Top Button */}
    <AnimatePresence>
      {showScrollTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 20 }}
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-4 rounded-2xl bg-primary text-primary-foreground shadow-2xl shadow-primary/30 hover:scale-110 active:scale-95 transition-transform"
        >
          <HugeiconsIcon icon={ArrowUp01Icon} className="w-6 h-6" />
        </motion.button>
      )}
    </AnimatePresence>
  </>
);
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => (
  <div className="bg-card p-10 rounded-3xl border-2 border-border hover:border-primary/40 transition-all group flex flex-col h-full items-center text-center md:items-start md:text-left">
    <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-primary group-hover:text-primary-foreground group-hover:rotate-6 transition-all duration-300">
      {icon}
    </div>
    <h3 className="text-2xl font-bold mb-4">{title}</h3>
    <p className="text-muted-foreground leading-relaxed flex-1">{description}</p>
  </div>
);

const WorkflowStep = ({ number, title, text }: { number: string; title: string; text: string }) => (
  <div className="flex flex-col items-center text-center lg:flex-row lg:items-start lg:text-left gap-4 lg:gap-6 group">
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
