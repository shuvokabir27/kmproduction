import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone, Mail, Instagram, Facebook, Youtube, MapPin, Ruler, Palette,
  Scissors, Eye, Sparkles, Film, Video, Tv, GraduationCap, Award,
  Languages, PlayCircle, ArrowLeft, Calendar
} from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const getYouTubeEmbed = (url: string) => {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
};

const ActorPortfolio = () => {
  const { id } = useParams();
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["actor-profile", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("member_id", Number(id))
        .maybeSingle();
      return data as any;
    },
    enabled: !!id,
  });

  const { data: gallery } = useQuery({
    queryKey: ["actor-gallery", profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("actor_portfolio_images" as any)
        .select("*")
        .eq("profile_id", profile?.id)
        .order("sort_order");
      return (data as any[]) ?? [];
    },
    enabled: !!profile?.id,
  });

  const { data: credits } = useQuery({
    queryKey: ["actor-credits", profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("actor_credits" as any)
        .select("*")
        .eq("profile_id", profile?.id)
        .order("release_year", { ascending: false });
      return (data as any[]) ?? [];
    },
    enabled: !!profile?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">লোড হচ্ছে...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">প্রোফাইল পাওয়া যায়নি</p>
        <Link to="/"><Button variant="outline">হোমে ফিরুন</Button></Link>
      </div>
    );
  }

  const stageName = profile.stage_name || profile.full_name;
  const englishName = profile.full_name_en;
  const showreelEmbed = getYouTubeEmbed(profile.showreel_url);

  // Group credits by category
  const creditsByCategory = (credits ?? []).reduce((acc: any, c: any) => {
    const cat = c.category || "drama";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(c);
    return acc;
  }, {});

  const categoryLabels: Record<string, { label: string; icon: any }> = {
    drama: { label: "নাটক / Drama", icon: Tv },
    tvc: { label: "TVC / Commercial", icon: Video },
    film: { label: "Film / শর্ট ফিল্ম", icon: Film },
    web: { label: "Web Series / OTT", icon: PlayCircle },
  };

  // Group gallery by category
  const galleryByCategory = (gallery ?? []).reduce((acc: any, img: any) => {
    const cat = img.category || "headshot";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(img);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Nav */}
      <div className="absolute top-4 left-4 z-20">
        <Link to="/">
          <Button variant="ghost" size="sm" className="text-foreground/70 hover:text-foreground backdrop-blur-md bg-background/30">
            <ArrowLeft className="h-4 w-4 mr-1" /> ফিরুন
          </Button>
        </Link>
      </div>

      {/* ===== 1. HERO SECTION ===== */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.15),transparent_50%)]" />

        <div className="relative max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center w-full">
          {/* Photo */}
          <div className="relative group order-2 md:order-1">
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/30 to-transparent blur-2xl opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-border/40 shadow-2xl">
              {profile.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt={stageName}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-muted flex items-center justify-center text-6xl font-light text-primary/50">
                  {stageName?.charAt(0)}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
            </div>
          </div>

          {/* Info */}
          <div className="order-1 md:order-2 space-y-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary/80">
              <span className="h-px w-8 bg-primary/50" />
              Actor · Performer
            </div>

            <div>
              <h1 className="text-5xl md:text-7xl font-light tracking-tight leading-none">
                {stageName}
              </h1>
              {englishName && englishName !== stageName && (
                <p className="text-xl md:text-2xl text-muted-foreground font-light mt-3 italic">
                  {englishName}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {profile.current_location && (
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary/70" /> {profile.current_location}
                </span>
              )}
              {profile.age_range && (
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary/70" /> {profile.age_range}
                </span>
              )}
              {profile.designation && (
                <span className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary/70" /> {profile.designation}
                </span>
              )}
            </div>

            {profile.short_bio && (
              <p className="text-base md:text-lg text-muted-foreground/90 leading-relaxed font-light max-w-xl">
                {profile.short_bio}
              </p>
            )}

            <div className="flex flex-wrap gap-3 pt-4">
              {profile.phone && (
                <a href={`tel:${profile.phone}`}>
                  <Button size="lg" className="rounded-full px-8 shadow-lg shadow-primary/20">
                    <Phone className="h-4 w-4 mr-2" /> Contact / Book Actor
                  </Button>
                </a>
              )}
              {profile.email && (
                <a href={`mailto:${profile.email}`}>
                  <Button size="lg" variant="outline" className="rounded-full px-8 border-border/50">
                    <Mail className="h-4 w-4 mr-2" /> Email
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== 2. PHYSICAL ATTRIBUTES ===== */}
      {(profile.height_cm || profile.skin_tone || profile.hair_type || profile.eye_color || profile.body_measurements) && (
        <section className="py-20 px-6 border-t border-border/20">
          <div className="max-w-5xl mx-auto">
            <SectionHeader eyebrow="Profile" title="Physical Attributes" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 mt-12">
              {profile.height_cm && <AttrCard icon={Ruler} label="Height" value={`${profile.height_cm} cm`} />}
              {profile.skin_tone && <AttrCard icon={Palette} label="Skin Tone" value={profile.skin_tone} />}
              {profile.hair_type && <AttrCard icon={Scissors} label="Hair" value={profile.hair_type} />}
              {profile.eye_color && <AttrCard icon={Eye} label="Eyes" value={profile.eye_color} />}
              {profile.body_measurements && <AttrCard icon={Sparkles} label="Measurements" value={profile.body_measurements} />}
            </div>
          </div>
        </section>
      )}

      {/* ===== 3. PORTFOLIO GALLERY ===== */}
      {gallery && gallery.length > 0 && (
        <section className="py-20 px-6 border-t border-border/20 bg-muted/10">
          <div className="max-w-6xl mx-auto">
            <SectionHeader eyebrow="Portfolio" title="Gallery" />

            {Object.keys(galleryByCategory).map((cat) => (
              <div key={cat} className="mt-12">
                <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-6">
                  {cat === "headshot" ? "Headshots" : cat === "fullbody" ? "Full Body" : cat === "lookbook" ? "Look Book" : cat}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {galleryByCategory[cat].map((img: any) => (
                    <button
                      key={img.id}
                      onClick={() => setLightboxImg(img.image_url)}
                      className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-border/30 cursor-zoom-in"
                    >
                      <img
                        src={img.image_url}
                        alt={img.caption || ""}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      {img.caption && (
                        <div className="absolute bottom-0 left-0 right-0 p-3 text-xs text-foreground translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                          {img.caption}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== 4. SHOWREEL ===== */}
      {showreelEmbed && (
        <section className="py-20 px-6 border-t border-border/20">
          <div className="max-w-5xl mx-auto">
            <SectionHeader eyebrow="Watch" title="Showreel" />
            <div className="mt-12 aspect-video rounded-2xl overflow-hidden border border-border/40 shadow-2xl bg-muted/20">
              <iframe
                src={showreelEmbed}
                title="Showreel"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      )}

      {/* ===== 5. ACTING CREDITS ===== */}
      {credits && credits.length > 0 && (
        <section className="py-20 px-6 border-t border-border/20 bg-muted/10">
          <div className="max-w-5xl mx-auto">
            <SectionHeader eyebrow="Filmography" title="Acting Credits" />

            <div className="mt-12 space-y-12">
              {Object.keys(creditsByCategory).map((cat) => {
                const meta = categoryLabels[cat] || { label: cat, icon: Film };
                const Icon = meta.icon;
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-xl font-light tracking-wide">{meta.label}</h3>
                    </div>

                    <div className="space-y-px bg-border/20 rounded-xl overflow-hidden border border-border/30">
                      {creditsByCategory[cat].map((c: any) => (
                        <div key={c.id} className="grid grid-cols-12 gap-4 px-5 py-4 bg-background/50 backdrop-blur-sm hover:bg-muted/20 transition-colors">
                          <div className="col-span-12 md:col-span-1 text-xs text-muted-foreground/70 font-mono">
                            {c.release_year || "—"}
                          </div>
                          <div className="col-span-12 md:col-span-4">
                            <p className="font-medium text-foreground">{c.project_title}</p>
                            {c.character_name && (
                              <p className="text-xs text-primary/80 mt-0.5">as {c.character_name}</p>
                            )}
                          </div>
                          <div className="col-span-6 md:col-span-3 text-sm text-muted-foreground">
                            {c.director && <span>Dir: {c.director}</span>}
                          </div>
                          <div className="col-span-6 md:col-span-4 text-sm text-muted-foreground/80 text-right md:text-left">
                            {c.production_house}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===== 6. SKILLS & EDUCATION ===== */}
      {(profile.special_skills?.length || profile.languages?.length || profile.acting_education) && (
        <section className="py-20 px-6 border-t border-border/20">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16">
            {/* Skills + Languages */}
            <div>
              <SectionHeader eyebrow="Talents" title="Special Skills" />
              <div className="mt-8 space-y-6">
                {profile.languages?.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <Languages className="h-3.5 w-3.5" /> Languages
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {profile.languages.map((lang: string, i: number) => (
                        <Badge key={i} variant="outline" className="rounded-full px-4 py-1.5 border-primary/30 text-foreground bg-primary/5">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {profile.special_skills?.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5" /> Skills
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {profile.special_skills.map((skill: string, i: number) => (
                        <Badge key={i} variant="secondary" className="rounded-full px-4 py-1.5">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Education */}
            {profile.acting_education && (
              <div>
                <SectionHeader eyebrow="Training" title="Education" />
                <div className="mt-8 flex gap-4 p-6 rounded-xl border border-border/30 bg-muted/10">
                  <GraduationCap className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                  <p className="text-foreground/90 leading-relaxed font-light whitespace-pre-line">
                    {profile.acting_education}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===== 7. CONTACT & SOCIALS ===== */}
      <section className="py-24 px-6 border-t border-border/20 bg-gradient-to-b from-transparent to-primary/5">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-primary/80 mb-3">Get in Touch</p>
          <h2 className="text-4xl md:text-5xl font-light mb-10">Let's Create Together</h2>

          <div className="flex flex-wrap justify-center gap-3">
            {profile.phone && (
              <SocialLink href={`tel:${profile.phone}`} icon={Phone} label="Call" />
            )}
            {profile.email && (
              <SocialLink href={`mailto:${profile.email}`} icon={Mail} label="Email" />
            )}
            {profile.instagram_url && (
              <SocialLink href={profile.instagram_url} icon={Instagram} label="Instagram" />
            )}
            {profile.facebook_url && (
              <SocialLink href={profile.facebook_url} icon={Facebook} label="Facebook" />
            )}
            {profile.youtube_url && (
              <SocialLink href={profile.youtube_url} icon={Youtube} label="YouTube" />
            )}
          </div>

          <p className="mt-16 text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} {stageName} · All rights reserved
          </p>
        </div>
      </section>

      {/* Lightbox */}
      <Dialog open={!!lightboxImg} onOpenChange={() => setLightboxImg(null)}>
        <DialogContent className="max-w-4xl border-0 bg-background/95 backdrop-blur-xl p-2">
          {lightboxImg && (
            <img src={lightboxImg} alt="" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SectionHeader = ({ eyebrow, title }: { eyebrow: string; title: string }) => (
  <div>
    <p className="text-xs uppercase tracking-[0.3em] text-primary/80 mb-3">{eyebrow}</p>
    <h2 className="text-3xl md:text-4xl font-light tracking-tight">{title}</h2>
    <div className="h-px w-12 bg-primary/40 mt-4" />
  </div>
);

const AttrCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="group p-5 rounded-xl border border-border/30 bg-muted/10 hover:border-primary/40 hover:bg-primary/5 transition-all">
    <Icon className="h-5 w-5 text-primary/70 mb-3 group-hover:text-primary transition-colors" />
    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
    <p className="text-base font-medium text-foreground">{value}</p>
  </div>
);

const SocialLink = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="group flex items-center gap-2 px-5 py-3 rounded-full border border-border/40 bg-muted/20 hover:border-primary/50 hover:bg-primary/10 transition-all"
  >
    <Icon className="h-4 w-4 text-primary/70 group-hover:text-primary transition-colors" />
    <span className="text-sm">{label}</span>
  </a>
);

export default ActorPortfolio;
