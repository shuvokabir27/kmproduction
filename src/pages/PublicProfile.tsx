import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, MapPin, Briefcase, Calendar, GraduationCap, Award, Heart, Play } from "lucide-react";
import { motion } from "framer-motion";

const PublicProfile = () => {
  const { memberId } = useParams();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["public-profile", memberId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("member_id", Number(memberId)).single();
      return data;
    },
  });

  const { data: favoriteWorks } = useQuery({
    queryKey: ["public-favorite-works", memberId],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("favorite_works" as any).select("*").eq("member_id", profile!.id).order("sort_order");
      return (data ?? []) as any[];
    },
  });

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="text-muted-foreground">লোড হচ্ছে...</div></div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">সদস্য পাওয়া যায়নি</h1>
          <Link to="/"><Button variant="outline">হোম পেজে ফিরুন</Button></Link>
        </div>
      </div>
    );
  }

  const p = profile as any;
  const favorites = [
    { label: "পছন্দের নায়ক", value: p.favorite_actor },
    { label: "পছন্দের নায়িকা", value: p.favorite_actress },
    { label: "পছন্দের রং", value: p.favorite_color },
    { label: "পছন্দের পোশাক", value: p.favorite_dress },
    { label: "পছন্দের খাবার", value: p.favorite_food },
  ].filter(f => f.value);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 glass-surface sticky top-0 z-40">
        <div className="container max-w-4xl mx-auto flex items-center h-14 px-4">
          <Link to="/"><Button variant="ghost" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" /> ফিরে যান</Button></Link>
        </div>
      </header>

      <div className="container max-w-4xl mx-auto px-4 py-10 space-y-6">
        {/* Profile Header */}
        <Card className="bg-card border-border/50 overflow-hidden">
          <div className="h-48 bg-gradient-to-r from-primary/20 to-primary/5 relative overflow-hidden">
            {p.cover_url && <img src={p.cover_url} alt="cover" className="w-full h-full object-cover absolute inset-0" />}
          </div>
          <div className="px-6 pb-6 -mt-16">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="h-28 w-28 rounded-xl bg-primary/15 flex items-center justify-center border-4 border-card overflow-hidden">
                {profile.photo_url ? (
                  <img src={profile.photo_url} alt={profile.full_name} className="h-28 w-28 rounded-xl object-cover" />
                ) : (
                  <span className="text-primary font-bold text-3xl">{profile.full_name.charAt(0)}</span>
                )}
              </div>
              <div className="pt-4">
                <h1 className="text-2xl font-bold text-foreground">{profile.full_name}</h1>
                <p className="text-muted-foreground">{profile.designation || "সদস্য"}</p>
              </div>
            </div>

            {p.short_bio && (
              <p className="text-muted-foreground mt-6 text-sm leading-relaxed italic">"{p.short_bio}"</p>
            )}
            {profile.bio && !p.short_bio && (
              <p className="text-muted-foreground mt-6 text-sm leading-relaxed">{profile.bio}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {profile.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4 text-primary" /> {profile.email}</div>
              )}
              {profile.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-4 w-4 text-primary" /> {profile.phone}</div>
              )}
              {p.address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 text-primary" /> {p.address}</div>
              )}
              {profile.designation && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Briefcase className="h-4 w-4 text-primary" /> {profile.designation}</div>
              )}
              {p.education && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><GraduationCap className="h-4 w-4 text-primary" /> {p.education}</div>
              )}
              {profile.joining_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="h-4 w-4 text-primary" /> যোগদান: {new Date(profile.joining_date).toLocaleDateString("bn-BD")}</div>
              )}
            </div>
          </div>
        </Card>

        {/* Achievements */}
        {p.achievements && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-card border-border/50 p-6">
              <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3"><Award className="h-5 w-5 text-primary" /> অর্জন</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{p.achievements}</p>
            </Card>
          </motion.div>
        )}

        {/* Favorites */}
        {favorites.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-card border-border/50 p-6">
              <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4"><Heart className="h-5 w-5 text-primary" /> পছন্দের তথ্য</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {favorites.map((f, i) => (
                  <div key={i} className="p-3 rounded-lg bg-secondary/50 border border-border/30">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{f.label}</p>
                    <p className="text-sm text-foreground font-medium mt-1">{f.value}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Favorite Works */}
        {favoriteWorks && favoriteWorks.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-card border-border/50 p-6">
              <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4"><Play className="h-5 w-5 text-primary" /> প্রিয় কাজসমূহ</h2>
              <div className="space-y-3">
                {favoriteWorks.map((w: any, i: number) => (
                  <div key={w.id} className="p-4 rounded-lg bg-secondary/50 border border-border/30 hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-foreground font-medium">{i + 1}. {w.title}</p>
                        {w.description && <p className="text-xs text-muted-foreground mt-1">{w.description}</p>}
                      </div>
                      {w.video_url && (
                        <a href={w.video_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 shrink-0 ml-2">
                          <Play className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PublicProfile;