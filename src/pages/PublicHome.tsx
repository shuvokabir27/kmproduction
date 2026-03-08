import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Users, Film, Mail, Phone, MapPin, Facebook, Youtube, Instagram, Play, ChevronRight, ExternalLink, MessageCircle, Menu, X, Tv, Image } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage, labels } from "@/hooks/useLanguage";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useState } from "react";
import { AnimatePresence } from "framer-motion";

const extractYouTubeId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

const PublicHome = () => {
  const { user, isAdmin } = useAuth();
  const { lang, t } = useLanguage();
  const L = labels[lang];

  const { data: members } = useQuery({
    queryKey: ["public-members"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("is_active", true);
      const filtered = (data as any[] ?? []).filter((m: any) => m.show_on_public !== false);
      filtered.sort((a: any, b: any) => (a.public_display_order ?? 0) - (b.public_display_order ?? 0));
      return filtered;
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").limit(1).single();
      return data;
    },
  });

  const { data: shootings } = useQuery({
    queryKey: ["public-shootings"],
    queryFn: async () => {
      const { data } = await supabase.from("shootings").select("*").eq("show_on_public", true).order("shoot_date", { ascending: false }).limit(6);
      return data ?? [];
    },
  });

  const { data: popularVideos } = useQuery({
    queryKey: ["popular-videos"],
    queryFn: async () => {
      const { data } = await supabase.from("popular_videos" as any).select("*").eq("is_active", true).order("sort_order", { ascending: true });
      return (data ?? []) as any[];
    },
  });

  const { data: galleryImages } = useQuery({
    queryKey: ["gallery-images"],
    queryFn: async () => {
      const { data } = await supabase.from("gallery_images" as any).select("*").eq("is_active", true).order("sort_order", { ascending: true });
      return (data ?? []) as any[];
    },
  });

  const { data: channels } = useQuery({
    queryKey: ["public-channels"],
    queryFn: async () => {
      const { data } = await supabase.from("channels").select("*").order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const navItems = [
    { label: "আমাদের টিম", href: "#team" },
    { label: "জনপ্রিয় কাজ", href: "#popular" },
    { label: "সেবাসমূহ", href: "/services", isPage: true },
    { label: "চ্যানেল সমূহ", href: "#channels" },
    { label: "ছবি গ্যালারী", href: "#gallery" },
    { label: "যোগাযোগ", href: "#contact" },
  ];

  const scrollToSection = (href: string) => {
    setMobileMenuOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden noise-bg">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-background/60 backdrop-blur-2xl saturate-150 border-b border-border/20" />
        <div className="container max-w-6xl mx-auto relative z-10 flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img src="/favicon.png" alt="KM Production House" className="h-10 w-10 rounded-xl object-contain relative z-10" />
              <div className="absolute inset-0 bg-primary/30 rounded-xl blur-lg group-hover:bg-primary/50 transition-colors" />
            </div>
            <span className="font-bold text-foreground text-lg tracking-tight hidden sm:inline">{settings?.site_name || "KM Production House"}</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((nav) => (
              <button
                key={nav.href}
                onClick={() => scrollToSection(nav.href)}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded-lg transition-all duration-200"
              >
                {nav.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden h-9 w-9 rounded-lg bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
            >
              {mobileMenuOpen ? <X className="h-5 w-5 text-foreground" /> : <Menu className="h-5 w-5 text-foreground" />}
            </button>
            {user ? (
              <Link to={isAdmin ? "/admin" : "/dashboard"}>
                <Button size="sm" className="bg-primary hover:bg-primary/90 glow-accent font-semibold">
                  {L.dashboard} <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button size="sm" className="bg-primary hover:bg-primary/90 glow-accent font-semibold">
                  {L.login} <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden overflow-hidden relative z-10"
            >
              <div className="bg-background/80 backdrop-blur-2xl saturate-150 border-b border-border/20 px-4 py-3 space-y-1">
                {navItems.map((nav) => (
                  <button
                    key={nav.href}
                    onClick={() => scrollToSection(nav.href)}
                    className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded-lg transition-all"
                  >
                    {nav.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[95vh] flex items-center justify-center px-4 pt-16">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] bg-primary/8 rounded-full blur-[160px]" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-primary/6 rounded-full blur-[100px]" />
          {/* Subtle grid */}
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(hsl(0 0% 15% / 0.08) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 15% / 0.08) 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
          }} />
          {/* Diagonal red line accent */}
          <div className="absolute top-0 right-[20%] w-[2px] h-[40vh] bg-gradient-to-b from-primary/30 to-transparent rotate-12 origin-top" />
          <div className="absolute bottom-0 left-[15%] w-[2px] h-[30vh] bg-gradient-to-t from-primary/20 to-transparent -rotate-12 origin-bottom" />
        </div>

        <div className="relative z-10 text-center max-w-5xl mx-auto">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            className="mb-6"
          >
            <div className="relative inline-block">
              <img src="/favicon.png" alt="KM Production House" className="h-28 w-28 md:h-36 md:w-36 object-contain mx-auto relative z-10 drop-shadow-2xl" />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl scale-[2]" />
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl scale-150 animate-pulse" />
            </div>
          </motion.div>

          {/* Welcome to Kuakata Multimedia */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.9, ease: "easeOut" }}
            className="mb-8"
          >
            <motion.p
              initial={{ opacity: 0, letterSpacing: "0.8em" }}
              animate={{ opacity: 1, letterSpacing: "0.35em" }}
              transition={{ delay: 0.4, duration: 1 }}
              className="text-[10px] md:text-xs uppercase tracking-[0.35em] text-muted-foreground"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              Welcome to
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, scale: 0.9, letterSpacing: "0.6em" }}
              animate={{ opacity: 1, scale: 1, letterSpacing: "0.2em" }}
              transition={{ delay: 0.5, duration: 1 }}
              className="text-xl md:text-3xl tracking-[0.2em] gradient-text mt-1 font-bold"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              KUAKATA MULTIMEDIA
            </motion.h2>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              className="h-[1px] w-32 md:w-48 mx-auto mt-3 bg-gradient-to-r from-transparent via-primary/50 to-transparent"
            />
          </motion.div>

          {/* KM PRODUCTION HOUSE */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
            className="font-display text-7xl md:text-[9rem] lg:text-[11rem] tracking-wider leading-none text-shadow-glow"
          >
            <span className="gradient-text">KM</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-5xl lg:text-6xl tracking-[0.4em] text-foreground/90 -mt-2" style={{ fontFamily: "'Cinzel', serif", fontWeight: 600 }}>
              PRODUCTION
            </h2>
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className="h-[1px] w-16 md:w-24 bg-gradient-to-r from-transparent to-primary/60" />
              <span className="text-xl md:text-2xl tracking-[0.5em] text-primary/70" style={{ fontFamily: "'Cinzel', serif", fontWeight: 500 }}>HOUSE</span>
              <div className="h-[1px] w-16 md:w-24 bg-gradient-to-l from-transparent to-primary/60" />
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-muted-foreground text-base md:text-lg mt-10 max-w-xl mx-auto leading-relaxed font-light"
          >
            {settings?.site_description || L.description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <a href="#projects">
              <Button size="lg" className="bg-primary hover:bg-primary/90 glow-accent text-base px-8 h-12 gap-2 font-semibold">
                <Play className="h-5 w-5" /> {L.seeWork}
              </Button>
            </a>
            <a href="#team">
              <Button size="lg" variant="outline" className="border-primary/30 hover:bg-primary/10 hover:border-primary/50 text-base px-8 h-12 gap-2">
                <Users className="h-5 w-5" /> {L.seeTeam}
              </Button>
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-20 flex items-center justify-center gap-12 md:gap-20"
          >
            {[
              { value: members?.length || 0, label: L.teamMembers },
              { value: shootings?.length || 0, label: L.projects },
            ].map((stat, i) => (
              <div key={i} className="text-center relative">
                <div className="font-display text-5xl md:text-6xl gradient-text">{stat.value}+</div>
                <div className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Team */}
      <section className="py-28 px-4 relative" id="team">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/4 rounded-full blur-[120px]" />
        <div className="container max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14"
          >
            <span className="text-primary text-xs font-bold tracking-[0.3em] uppercase">Our Team</span>
            <h2 className="font-display text-5xl md:text-6xl text-foreground mt-3 tracking-wider">{L.ourTeam}</h2>
            <div className="h-1 w-20 bg-gradient-to-r from-primary to-primary/30 rounded-full mt-5" />
          </motion.div>

          <motion.div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5" variants={container} initial="hidden" whileInView="show" viewport={{ once: true }}>
            {members?.map((member) => (
              <motion.div key={member.id} variants={item}>
                <Link to={`/member/${member.member_id}`}>
                  <div className="group">
                    <div className="premium-card rounded-2xl p-5 text-center relative overflow-hidden">
                      {/* Hover glow */}
                      <div className="absolute inset-0 bg-gradient-to-b from-primary/8 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                      
                      <div className="relative z-10">
                        <div className="h-[4.5rem] w-[4.5rem] rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4 border-2 border-border/40 group-hover:border-primary/50 transition-all duration-300 overflow-hidden">
                          {member.photo_url ? (
                            <img src={member.photo_url} alt={member.full_name} className="h-full w-full rounded-full object-cover" />
                          ) : (
                            <span className="text-primary font-bold text-2xl">{member.full_name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <h3 className="text-sm font-semibold text-foreground truncate">
                            {lang === "en" && (member as any).full_name_en ? (member as any).full_name_en : member.full_name}
                          </h3>
                          {(member as any).is_verified && <svg className="h-4 w-4 text-primary shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-1">
                          {lang === "en" && (member as any).designation_en ? (member as any).designation_en : (member.designation || L.member)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Recent Projects */}
      {shootings && shootings.length > 0 && (
        <section className="py-28 px-4 relative" id="projects">
          <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-background" />
          <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-primary/4 rounded-full blur-[140px]" />
          <div className="container max-w-6xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-14"
            >
              <span className="text-primary text-xs font-bold tracking-[0.3em] uppercase">Our Work</span>
              <h2 className="font-display text-5xl md:text-6xl text-foreground mt-3 tracking-wider">{L.recentProjects}</h2>
              <div className="h-1 w-20 bg-gradient-to-r from-primary to-primary/30 rounded-full mt-5" />
            </motion.div>

            <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6" variants={container} initial="hidden" whileInView="show" viewport={{ once: true }}>
              {shootings.map((s) => {
                const videoUrl = (s as any).video_url || "";
                const youtubeId = extractYouTubeId(videoUrl);
                return (
                  <motion.div key={s.id} variants={item}>
                    <div className="premium-card rounded-2xl overflow-hidden relative group">
                      {/* Top accent line */}
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent z-20" />
                      
                      {/* YouTube Embed */}
                      {youtubeId && (
                        <div className="relative w-full aspect-video bg-background">
                          <iframe
                            src={`https://www.youtube.com/embed/${youtubeId}`}
                            title={s.name}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0 w-full h-full"
                          />
                        </div>
                      )}

                      <div className="p-5 relative z-10">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Film className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <span className="text-xs text-primary/80 font-medium">{new Date(s.shoot_date).toLocaleDateString("bn-BD")}</span>
                          </div>
                          <h3 className="font-bold text-foreground text-base leading-tight">{s.name}</h3>
                          {s.description && <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{s.description}</p>}
                          {s.location && (
                            <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-border/15">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{s.location}</span>
                            </div>
                          )}
                          {videoUrl && !youtubeId && (
                            <a
                              href={videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 transition-all group/link"
                            >
                              <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center group-hover/link:bg-primary/30 transition-colors">
                                <Play className="h-3.5 w-3.5 text-primary fill-primary" />
                              </div>
                              <span className="text-sm font-medium text-primary flex-1">নাটক দেখুন</span>
                              <ExternalLink className="h-3.5 w-3.5 text-primary/60" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>
      )}

      {/* Popular Videos */}
      {popularVideos && popularVideos.length > 0 && (
        <section className="py-28 px-4 relative" id="popular">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/4 rounded-full blur-[140px]" />
          <div className="container max-w-6xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-14"
            >
              <span className="text-primary text-xs font-bold tracking-[0.3em] uppercase">Popular Work</span>
              <h2 className="font-display text-5xl md:text-6xl text-foreground mt-3 tracking-wider">জনপ্রিয় কাজ</h2>
              <div className="h-1 w-20 bg-gradient-to-r from-primary to-primary/30 rounded-full mt-5" />
            </motion.div>

            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {popularVideos.map((v: any) => {
                const youtubeId = extractYouTubeId(v.video_url);
                return (
                  <motion.div key={v.id} variants={item}>
                    <div className="premium-card rounded-2xl overflow-hidden relative group">
                      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent z-20" />
                      {youtubeId ? (
                        <div className="relative w-full aspect-video bg-background">
                          <iframe
                            src={`https://www.youtube.com/embed/${youtubeId}`}
                            title={v.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0 w-full h-full"
                          />
                        </div>
                      ) : (
                        <a href={v.video_url} target="_blank" rel="noopener noreferrer" className="block relative w-full aspect-video bg-muted/30 flex items-center justify-center">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                              <Play className="h-6 w-6 text-primary fill-primary" />
                            </div>
                          </div>
                        </a>
                      )}
                      <div className="p-5 relative z-10">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Film className="h-3.5 w-3.5 text-primary" />
                            </div>
                          </div>
                          <h3 className="font-bold text-foreground text-base leading-tight">{v.title}</h3>
                          {v.description && <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{v.description}</p>}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>
      )}

      {/* Channels */}
      {channels && channels.length > 0 && (
        <section className="py-28 px-4 relative" id="channels">
          <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-background" />
          <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-primary/4 rounded-full blur-[120px]" />
          <div className="container max-w-6xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-14"
            >
              <span className="text-primary text-xs font-bold tracking-[0.3em] uppercase">Our Channels</span>
              <h2 className="font-display text-5xl md:text-6xl text-foreground mt-3 tracking-wider">আমাদের চ্যানেল সমূহ</h2>
              <div className="h-1 w-20 bg-gradient-to-r from-primary to-primary/30 rounded-full mt-5" />
            </motion.div>

            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {channels.map((ch) => (
                <motion.div key={ch.id} variants={item}>
                  <a
                    href={ch.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="premium-card rounded-2xl p-6 flex items-center gap-4 group hover:border-primary/30 transition-all"
                  >
                    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors flex-shrink-0">
                      {ch.platform?.toLowerCase() === "youtube" ? (
                        <Youtube className="h-7 w-7 text-primary" />
                      ) : ch.platform?.toLowerCase() === "facebook" ? (
                        <Facebook className="h-7 w-7 text-primary" />
                      ) : (
                        <Tv className="h-7 w-7 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground truncate">{ch.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{ch.platform || "Channel"}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </a>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* Gallery */}
      {galleryImages && galleryImages.length > 0 && (
        <section className="py-28 px-4 relative" id="gallery">
          <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-primary/4 rounded-full blur-[120px]" />
          <div className="container max-w-6xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-14"
            >
              <span className="text-primary text-xs font-bold tracking-[0.3em] uppercase">Gallery</span>
              <h2 className="font-display text-5xl md:text-6xl text-foreground mt-3 tracking-wider">ছবি গ্যালারী</h2>
              <div className="h-1 w-20 bg-gradient-to-r from-primary to-primary/30 rounded-full mt-5" />
            </motion.div>

            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {galleryImages.map((img: any) => (
                <motion.div key={img.id} variants={item}>
                  <button
                    onClick={() => setLightboxImage(img.image_url)}
                    className="w-full premium-card rounded-xl overflow-hidden group relative"
                  >
                    <div className="aspect-[4/3] bg-muted">
                      <img
                        src={img.image_url}
                        alt={img.title || "Gallery"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                    <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors duration-300" />
                    {img.title && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs text-foreground truncate">{img.title}</p>
                      </div>
                    )}
                  </button>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section className="py-28 px-4 relative" id="contact">
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/4 rounded-full blur-[120px]" />
        <div className="container max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14 text-center"
          >
            <span className="text-primary text-xs font-bold tracking-[0.3em] uppercase">Contact Us</span>
            <h2 className="font-display text-3xl md:text-5xl text-foreground mt-3 tracking-wider leading-tight">
              বিজ্ঞাপন বা প্রোডাকশনের জন্য
              <br />
              <span className="gradient-text">যোগাযোগ করুন</span>
            </h2>
            <div className="h-1 w-20 bg-gradient-to-r from-primary to-primary/30 rounded-full mt-5 mx-auto" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              {(settings as any)?.whatsapp_no && (
                <a
                  href={`https://wa.me/${(settings as any).whatsapp_no.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="premium-card rounded-xl flex items-center gap-4 p-4 group hover:border-green-500/30 transition-all"
                >
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                    <MessageCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">WhatsApp</p>
                    <span className="text-foreground/80 text-sm font-medium">{(settings as any).whatsapp_no}</span>
                  </div>
                </a>
              )}
              {settings?.contact_phone && (
                <a href={`tel:${settings.contact_phone}`} className="premium-card rounded-xl flex items-center gap-4 p-4 group">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ফোন</p>
                    <span className="text-foreground/80 text-sm">{settings.contact_phone}</span>
                  </div>
                </a>
              )}
              {settings?.contact_email && (
                <div className="premium-card rounded-xl flex items-center gap-4 p-4 group">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ইমেইল</p>
                    <span className="text-foreground/80 text-sm">{settings.contact_email}</span>
                  </div>
                </div>
              )}
              {settings?.contact_address && (
                <div className="premium-card rounded-xl flex items-center gap-4 p-4 group">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">ঠিকানা</p>
                    <span className="text-foreground/80 text-sm">{settings.contact_address}</span>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Social & Pages */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              {/* Facebook Pages */}
              {(() => {
                const pages = (settings as any)?.facebook_pages as any[] | null;
                return pages && pages.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">আমাদের পেইজ সমূহ</h3>
                    <div className="space-y-3">
                      {pages.map((page: any, i: number) => (
                        <a
                          key={i}
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="premium-card rounded-xl flex items-center gap-4 p-4 group hover:border-blue-500/30 transition-all"
                        >
                          <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                            <Facebook className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-foreground text-sm font-medium truncate block">{page.name}</span>
                            <span className="text-xs text-muted-foreground">Facebook Page</span>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Other Social */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">{L.socialMedia}</h3>
                <div className="flex gap-4">
                  {settings?.facebook_url && (
                    <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer" className="premium-card h-14 w-14 rounded-xl flex items-center justify-center hover:border-primary/50 hover:bg-primary/10 transition-all">
                      <Facebook className="h-5 w-5 text-primary" />
                    </a>
                  )}
                  {settings?.youtube_url && (
                    <a href={settings.youtube_url} target="_blank" rel="noopener noreferrer" className="premium-card h-14 w-14 rounded-xl flex items-center justify-center hover:border-primary/50 hover:bg-primary/10 transition-all">
                      <Youtube className="h-5 w-5 text-primary" />
                    </a>
                  )}
                  {settings?.instagram_url && (
                    <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="premium-card h-14 w-14 rounded-xl flex items-center justify-center hover:border-primary/50 hover:bg-primary/10 transition-all">
                      <Instagram className="h-5 w-5 text-primary" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 py-10 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-muted/20 to-transparent" />
        <div className="container max-w-6xl mx-auto relative z-10">
          {/* Mother company highlight */}
          <div className="flex flex-col items-center mb-8 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">A Sister Concern of</p>
            <h3 className="font-display text-2xl md:text-3xl tracking-wider gradient-text">KUAKATA MULTIMEDIA</h3>
            <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-primary/40 to-transparent mt-3" />
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/favicon.png" alt="KM Production House" className="h-8 w-8 object-contain" />
              <span className="font-semibold text-foreground">{settings?.site_name || "KM Production House"}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {settings?.site_name || "KM Production House"}. সর্বস্বত্ব সংরক্ষিত।
            </p>
          </div>
        </div>
      </footer>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setLightboxImage(null)}
          >
            <div className="absolute inset-0 bg-background/90 backdrop-blur-xl" />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative z-10 max-w-[90vw] max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightboxImage}
                alt="Gallery"
                className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
              />
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors"
              >
                <X className="h-4 w-4 text-foreground" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicHome;
