import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Briefcase, Calendar, GraduationCap, Award, Heart, Play, Quote, Sparkles, BadgeCheck, Cake, Star, Edit, Droplet } from "lucide-react";
import { differenceInYears, format } from "date-fns";
import { bn } from "date-fns/locale";
import { motion } from "framer-motion";
import { useLanguage, labels } from "@/hooks/useLanguage";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ProfileReviews } from "@/components/ProfileReviews";
import { useAuth } from "@/hooks/useAuth";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: "easeOut" as const },
});

const PublicProfile = () => {
  const { memberId } = useParams();
  const { lang, t } = useLanguage();
  const L = labels[lang];
  const { isAdmin } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["public-profile", memberId],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_public_profile_by_member_id", { _member_id: Number(memberId) });
      const rows = data as any[];
      return rows?.[0] ?? null;
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

  const { data: ratings } = useQuery({
    queryKey: ["profile-ratings", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("profile_ratings" as any).select("rating").eq("profile_id", profile!.id);
      return (data ?? []) as any[];
    },
  });

  const avgRating = ratings?.length
    ? (ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : null;
  const ratingsCount = ratings?.length || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">{L.loading}</p>
        </motion.div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">{L.notFound}</h1>
          <Link to="/"><Button variant="outline">{L.goHome}</Button></Link>
        </div>
      </div>
    );
  }

  const p = profile as any;

  const displayName = t(profile.full_name, p.full_name_en);
  const displayDesignation = t(profile.designation || "সদস্য", p.designation_en || (lang === "en" ? "Member" : null));
  const displayBio = t(p.short_bio || profile.bio || "", p.short_bio_en || p.bio_en);
  const displayAddress = t(p.address || "", p.address_en);
  const displayEducation = t(p.education || "", p.education_en);
  const displayAchievements = t(p.achievements || "", p.achievements_en);

  const favorites = [
    { label: L.favActor, value: t(p.favorite_actor || "", p.favorite_actor_en), icon: "🎬" },
    { label: L.favActress, value: t(p.favorite_actress || "", p.favorite_actress_en), icon: "🌟" },
    { label: L.favColor, value: t(p.favorite_color || "", p.favorite_color_en), icon: "🎨" },
    { label: L.favDress, value: t(p.favorite_dress || "", p.favorite_dress_en), icon: "👔" },
    { label: L.favFood, value: t(p.favorite_food || "", p.favorite_food_en), icon: "🍕" },
  ].filter(f => f.value);

  const age = p.date_of_birth ? differenceInYears(new Date(), new Date(p.date_of_birth)) : null;

  const formatDate = (dateString: string) => {
    if (lang === "bn") {
      return format(new Date(dateString), "d MMMM yyyy", { locale: bn });
    }
    return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  const infoItems = [
    p.date_of_birth && { icon: Cake, text: `${L.age}: ${age?.toLocaleString(lang === "bn" ? "bn-BD" : "en-US")} ${L.years}` },
    displayAddress && { icon: MapPin, text: displayAddress },
    displayDesignation && { icon: Briefcase, text: displayDesignation },
    displayEducation && { icon: GraduationCap, text: displayEducation },
  ].filter(Boolean) as { icon: any; text: string }[];

  return (
    <div className="min-h-screen bg-background relative">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="border-b border-border/30 backdrop-blur-xl bg-background/80 sticky top-0 z-40">
        <div className="container max-w-4xl mx-auto flex items-center justify-between h-14 px-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> {L.back}
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to={`/admin/members?edit=${profile.id}`}>
                <Button variant="outline" size="sm" className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10">
                  <Edit className="h-4 w-4" /> {lang === "bn" ? "এডিট" : "Edit"}
                </Button>
              </Link>
            )}
            <LanguageToggle />
          </div>
        </div>
      </header>

      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-8 relative z-10">

        {/* ── Hero Card ── */}
        <motion.div {...fadeUp(0)}>
          <div className="rounded-2xl overflow-hidden border border-border/30 bg-card shadow-2xl shadow-primary/5">
            {/* Cover */}
            <div className="h-56 sm:h-64 relative overflow-hidden">
              {p.cover_url ? (
                <img src={p.cover_url} alt="cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/10 to-background relative">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.2),transparent_70%)]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(var(--primary)/0.15),transparent_60%)]" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
            </div>

            {/* Profile Info */}
            <div className="px-6 sm:px-8 pb-8 -mt-20 relative">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                {/* Avatar */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-br from-primary to-primary/50 rounded-2xl blur-sm opacity-60 group-hover:opacity-80 transition-opacity" />
                  <div className="h-32 w-32 rounded-2xl bg-card flex items-center justify-center border-2 border-primary/30 overflow-hidden relative shadow-xl">
                    {profile.photo_url ? (
                      <img src={profile.photo_url} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <span className="text-primary font-bold text-4xl">{displayName.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Name & Title */}
                <div className="pt-2 sm:pt-8">
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
                      {displayName}
                    </h1>
                    {p.is_verified && (
                      <span title={L.verified} className="shrink-0">
                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" fill="#1877F2" />
                          <path d="M9.5 12.5L11 14L15 10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    )}
                  </div>
                  {/* Rating next to name */}
                  {avgRating && (
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`h-4 w-4 ${s <= Math.round(Number(avgRating)) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                      ))}
                      <span className="text-foreground font-bold text-sm ml-1">{avgRating}</span>
                      <span className="text-muted-foreground text-xs">({ratingsCount})</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    <p className="text-primary font-medium text-sm tracking-wide uppercase">
                      {displayDesignation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Short Bio */}
              {displayBio && (
                <motion.div {...fadeUp(0.15)} className="mt-8 relative">
                  <div className="absolute -left-2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary to-transparent rounded-full" />
                  <div className="pl-5">
                    <Quote className="h-4 w-4 text-primary/40 mb-2" />
                    <p className="text-muted-foreground text-sm leading-relaxed italic">
                      {displayBio}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Info Grid */}
              {infoItems.length > 0 && (
                <motion.div {...fadeUp(0.2)} className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {infoItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/40 border border-border/20 hover:border-primary/20 transition-colors">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <item.icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm text-foreground/80">{item.text}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Achievements ── */}
        {displayAchievements && (
          <motion.div {...fadeUp(0.25)}>
            <div className="rounded-2xl border border-border/30 bg-card p-6 sm:p-8 shadow-lg shadow-primary/3">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground tracking-tight">{L.achievements}</h2>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed pl-1">{displayAchievements}</p>
            </div>
          </motion.div>
        )}

        {/* ── Favorites ── */}
        {favorites.length > 0 && (
          <motion.div {...fadeUp(0.3)}>
            <div className="rounded-2xl border border-border/30 bg-card p-6 sm:p-8 shadow-lg shadow-primary/3">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground tracking-tight">{L.favorites}</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {favorites.map((f, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.35 + i * 0.05 }}
                    className="group relative p-4 rounded-xl bg-gradient-to-br from-secondary/60 to-secondary/30 border border-border/20 hover:border-primary/30 transition-all hover:shadow-md hover:shadow-primary/5"
                  >
                    <span className="text-lg mb-1 block">{f.icon}</span>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{f.label}</p>
                    <p className="text-sm text-foreground font-semibold mt-1">{f.value}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Favorite Works ── */}
        {favoriteWorks && favoriteWorks.length > 0 && (
          <motion.div {...fadeUp(0.35)}>
            <div className="rounded-2xl border border-border/30 bg-card p-6 sm:p-8 shadow-lg shadow-primary/3">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-bold text-foreground tracking-tight">{L.favoriteWorks}</h2>
              </div>
              <div className="space-y-3">
                {favoriteWorks.map((w: any, i: number) => (
                  <motion.div
                    key={w.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.07 }}
                    className="group flex items-center gap-4 p-4 rounded-xl bg-secondary/40 border border-border/20 hover:border-primary/30 hover:bg-secondary/60 transition-all"
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <span className="text-primary font-bold text-sm">{String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-semibold text-sm truncate">{w.title}</p>
                      {w.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{w.description}</p>}
                    </div>
                    {w.video_url && (
                      <a
                        href={w.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 h-9 w-9 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
                      >
                        <Play className="h-4 w-4 text-primary" />
                      </a>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Reviews & Ratings */}
        <motion.div {...fadeUp(0.6)} className="max-w-2xl mx-auto">
          <ProfileReviews profileId={p.id} profileName={displayName} />
        </motion.div>

        {/* Footer spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
};

export default PublicProfile;
