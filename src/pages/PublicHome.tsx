import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Film, Mail, Phone, MapPin, Facebook, Youtube, Instagram } from "lucide-react";
import { motion } from "framer-motion";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const PublicHome = () => {
  const { user, isAdmin } = useAuth();

  const { data: members } = useQuery({
    queryKey: ["public-members"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("is_active", true).order("member_id");
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 glass-surface sticky top-0 z-40">
        <div className="container max-w-6xl mx-auto flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/favicon.png" alt="KM Production House" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-semibold text-foreground">{settings?.site_name || "KM Production House"}</span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to={isAdmin ? "/admin" : "/dashboard"}>
                <Button size="sm">ড্যাশবোর্ড</Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button size="sm">লগইন</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-foreground leading-tight"
          >
            {settings?.site_name || "TeamFlow"}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-lg mt-4 max-w-2xl mx-auto"
          >
            {settings?.site_description || "প্রফেশনাল টিম ম্যানেজমেন্ট প্ল্যাটফর্ম"}
          </motion.p>
        </div>
      </section>

      {/* Team Members */}
      <section className="py-16 px-4" id="team">
        <div className="container max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-8 flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            আমাদের টিম
          </h2>
          <motion.div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" variants={container} initial="hidden" animate="show">
            {members?.map((member) => (
              <motion.div key={member.id} variants={item}>
                <Link to={`/member/${member.member_id}`}>
                  <Card className="p-4 bg-card border-border/50 hover:border-primary/30 transition-all hover:-translate-y-1 text-center group">
                    <div className="h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3 border border-primary/20 group-hover:border-primary/40 transition-colors">
                      {member.photo_url ? (
                        <img src={member.photo_url} alt={member.full_name} className="h-16 w-16 rounded-full object-cover" />
                      ) : (
                        <span className="text-primary font-bold text-xl">{member.full_name.charAt(0)}</span>
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-foreground truncate">{member.full_name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{member.designation || "সদস্য"}</p>
                    <p className="text-[10px] text-primary mt-1">ID: {member.member_id}</p>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Recent Projects */}
      {shootings && shootings.length > 0 && (
        <section className="py-16 px-4 bg-card/50" id="projects">
          <div className="container max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-8 flex items-center gap-2">
              <Film className="h-6 w-6 text-primary" />
              সাম্প্রতিক প্রজেক্ট
            </h2>
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" variants={container} initial="hidden" animate="show">
              {shootings.map((s) => (
                <motion.div key={s.id} variants={item}>
                  <Card className="p-5 bg-card border-border/50">
                    <h3 className="font-semibold text-foreground">{s.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                      <span className="text-xs text-muted-foreground">{s.location}</span>
                      <span className="text-xs text-primary">{new Date(s.shoot_date).toLocaleDateString("bn-BD")}</span>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* Contact & Social */}
      <section className="py-16 px-4" id="contact">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-8">যোগাযোগ</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              {settings?.contact_email && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Mail className="h-5 w-5 text-primary" />
                  <span>{settings.contact_email}</span>
                </div>
              )}
              {settings?.contact_phone && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="h-5 w-5 text-primary" />
                  <span>{settings.contact_phone}</span>
                </div>
              )}
              {settings?.contact_address && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span>{settings.contact_address}</span>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">সোশ্যাল মিডিয়া</h3>
              <div className="flex gap-3">
                {settings?.facebook_url && (
                  <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors">
                    <Facebook className="h-5 w-5 text-primary" />
                  </a>
                )}
                {settings?.youtube_url && (
                  <a href={settings.youtube_url} target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors">
                    <Youtube className="h-5 w-5 text-primary" />
                  </a>
                )}
                {settings?.instagram_url && (
                  <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary/20 transition-colors">
                    <Instagram className="h-5 w-5 text-primary" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 px-4">
        <div className="container max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {settings?.site_name || "TeamFlow"}. সর্বস্বত্ব সংরক্ষিত।
        </div>
      </footer>
    </div>
  );
};

export default PublicHome;
