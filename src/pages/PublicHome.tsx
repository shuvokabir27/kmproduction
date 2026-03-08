import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Film, Mail, Phone, MapPin, Facebook, Youtube, Instagram, Play, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage, labels } from "@/hooks/useLanguage";
import { LanguageToggle } from "@/components/LanguageToggle";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

const PublicHome = () => {
  const { user, isAdmin } = useAuth();
  const { lang, t } = useLanguage();
  const L = labels[lang];

  const { data: members } = useQuery({
    queryKey: ["public-members"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,full_name,member_id,photo_url,cover_url,designation,bio,short_bio,address,is_active,is_verified").eq("is_active", true).order("member_id");
      return data ?? [];
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
      const { data } = await supabase.from("shootings").select("*").order("shoot_date", { ascending: false }).limit(6);
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-surface border-b border-border/30">
        <div className="container max-w-6xl mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img src="/favicon.png" alt="KM Production House" className="h-10 w-10 rounded-xl object-contain relative z-10" />
              <div className="absolute inset-0 bg-primary/30 rounded-xl blur-lg group-hover:bg-primary/50 transition-colors" />
            </div>
            <span className="font-bold text-foreground text-lg tracking-tight">{settings?.site_name || "KM Production House"}</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            {user ? (
              <Link to={isAdmin ? "/admin" : "/dashboard"}>
                <Button size="sm" className="bg-primary hover:bg-primary/90 glow-accent">
                  {L.dashboard} <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button size="sm" className="bg-primary hover:bg-primary/90 glow-accent">
                  {L.login} <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4 pt-16">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 right-0 w-[300px] h-[300px] bg-primary/8 rounded-full blur-[80px]" />
          {/* Grid pattern */}
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(hsl(0 0% 20% / 0.15) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 20% / 0.15) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }} />
        </div>

        <div className="relative z-10 text-center max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="relative inline-block">
              <img src="/favicon.png" alt="KM Production House" className="h-28 w-28 md:h-36 md:w-36 object-contain mx-auto relative z-10" />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl scale-150" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="font-display text-6xl md:text-8xl lg:text-9xl tracking-wider text-shadow-glow"
          >
            <span className="gradient-text">KM</span>{" "}
            <span className="text-foreground">PRODUCTION</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-2"
          >
            <span className="font-display text-3xl md:text-4xl tracking-[0.3em] text-primary/80">HOUSE</span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-muted-foreground text-lg md:text-xl mt-8 max-w-2xl mx-auto leading-relaxed"
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
              <Button size="lg" className="bg-primary hover:bg-primary/90 glow-accent text-lg px-8 h-12 gap-2">
                <Play className="h-5 w-5" /> {L.seeWork}
              </Button>
            </a>
            <a href="#team">
              <Button size="lg" variant="outline" className="border-primary/30 hover:bg-primary/10 text-lg px-8 h-12 gap-2">
                <Users className="h-5 w-5" /> {L.seeTeam}
              </Button>
            </a>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-16 flex items-center justify-center gap-8 md:gap-16"
          >
            {[
              { value: members?.length || 0, label: L.teamMembers },
              { value: shootings?.length || 0, label: L.projects },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="font-display text-4xl md:text-5xl gradient-text">{stat.value}+</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Team Members */}
      <section className="py-24 px-4 relative" id="team">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="container max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <span className="text-primary text-sm font-semibold tracking-widest uppercase">Our Team</span>
            <h2 className="font-display text-4xl md:text-5xl text-foreground mt-2 tracking-wider">{L.ourTeam}</h2>
            <div className="h-1 w-16 bg-primary rounded-full mt-4" />
          </motion.div>

          <motion.div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5" variants={container} initial="hidden" whileInView="show" viewport={{ once: true }}>
            {members?.map((member) => (
              <motion.div key={member.id} variants={item}>
                <Link to={`/member/${member.member_id}`}>
                  <div className="card-3d group">
                    <Card className="p-5 bg-card border-border/30 hover:border-primary/40 transition-all text-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative z-10">
                        <div className="h-18 w-18 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4 border-2 border-primary/20 group-hover:border-primary/50 transition-all">
                          {member.photo_url ? (
                            <img src={member.photo_url} alt={member.full_name} className="h-[4.5rem] w-[4.5rem] rounded-full object-cover" />
                          ) : (
                            <span className="text-primary font-bold text-2xl">{member.full_name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <h3 className="text-sm font-semibold text-foreground truncate">
                            {lang === "en" && (member as any).full_name_en ? (member as any).full_name_en : member.full_name}
                          </h3>
                          {(member as any).is_verified && <svg className="h-4 w-4 text-blue-500 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {lang === "en" && (member as any).designation_en ? (member as any).designation_en : (member.designation || L.member)}
                        </p>
                      </div>
                    </Card>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Recent Projects */}
      {shootings && shootings.length > 0 && (
        <section className="py-24 px-4 relative" id="projects">
          <div className="absolute inset-0 bg-gradient-to-b from-card/50 to-background" />
          <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
          <div className="container max-w-6xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12"
            >
              <span className="text-primary text-sm font-semibold tracking-widest uppercase">Our Work</span>
              <h2 className="font-display text-4xl md:text-5xl text-foreground mt-2 tracking-wider">সাম্প্রতিক প্রজেক্ট</h2>
              <div className="h-1 w-16 bg-primary rounded-full mt-4" />
            </motion.div>

            <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6" variants={container} initial="hidden" whileInView="show" viewport={{ once: true }}>
              {shootings.map((s) => (
                <motion.div key={s.id} variants={item}>
                  <div className="card-3d">
                    <Card className="p-6 bg-card border-border/30 hover:border-primary/30 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/30" />
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                          <Film className="h-4 w-4 text-primary" />
                          <span className="text-xs text-primary font-medium">{new Date(s.shoot_date).toLocaleDateString("bn-BD")}</span>
                        </div>
                        <h3 className="font-bold text-foreground text-lg">{s.name}</h3>
                        {s.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{s.description}</p>}
                        {s.location && (
                          <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-border/20">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{s.location}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* Contact & Social */}
      <section className="py-24 px-4 relative" id="contact">
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="container max-w-4xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <span className="text-primary text-sm font-semibold tracking-widest uppercase">Contact Us</span>
            <h2 className="font-display text-4xl md:text-5xl text-foreground mt-2 tracking-wider">যোগাযোগ</h2>
            <div className="h-1 w-16 bg-primary rounded-full mt-4" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-5"
            >
              {settings?.contact_email && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/30 hover:border-primary/30 transition-colors group">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-foreground/80">{settings.contact_email}</span>
                </div>
              )}
              {settings?.contact_phone && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/30 hover:border-primary/30 transition-colors group">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-foreground/80">{settings.contact_phone}</span>
                </div>
              )}
              {settings?.contact_address && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/30 hover:border-primary/30 transition-colors group">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-foreground/80">{settings.contact_address}</span>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="text-lg font-semibold text-foreground mb-4">সোশ্যাল মিডিয়া</h3>
              <div className="flex gap-4">
                {settings?.facebook_url && (
                  <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer" className="h-12 w-12 rounded-xl bg-card border border-border/30 flex items-center justify-center hover:border-primary/50 hover:bg-primary/10 transition-all card-3d">
                    <Facebook className="h-5 w-5 text-primary" />
                  </a>
                )}
                {settings?.youtube_url && (
                  <a href={settings.youtube_url} target="_blank" rel="noopener noreferrer" className="h-12 w-12 rounded-xl bg-card border border-border/30 flex items-center justify-center hover:border-primary/50 hover:bg-primary/10 transition-all card-3d">
                    <Youtube className="h-5 w-5 text-primary" />
                  </a>
                )}
                {settings?.instagram_url && (
                  <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="h-12 w-12 rounded-xl bg-card border border-border/30 flex items-center justify-center hover:border-primary/50 hover:bg-primary/10 transition-all card-3d">
                    <Instagram className="h-5 w-5 text-primary" />
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 px-4">
        <div className="container max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="KM Production House" className="h-8 w-8 object-contain" />
            <span className="font-semibold text-foreground">{settings?.site_name || "KM Production House"}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {settings?.site_name || "KM Production House"}. সর্বস্বত্ব সংরক্ষিত।
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicHome;