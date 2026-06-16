import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag, Leaf, ArrowRight } from "lucide-react";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

const OrganicHomeHero = () => {
  const { data: settings } = useQuery({
    queryKey: ["site-settings-hero"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      return data as any;
    },
  });

  const { data: offers } = useQuery({
    queryKey: ["hero-side-offers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shop_offers")
        .select("id, title, description, image_url, badge_text, slug")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(2);
      return data ?? [];
    },
  });

  const title = settings?.hero_title || "প্রতিদিনের সুস্থতায়\nহোক খাঁটি পণ্য";
  const subtitle =
    settings?.hero_subtitle ||
    "সরাসরি স্থানীয় কৃষক থেকে সংগ্রহ করা ১০০% তাজা ও খাঁটি পণ্য — প্রতিদিনের রান্নায় আনুন প্রকৃতির স্বাদ।";
  const badge = settings?.hero_badge || "১০০% অর্গানিক";
  const ctaLabel = settings?.hero_cta_label || "এখনই কিনুন";
  const ctaLink = settings?.hero_cta_link || "#shop";
  const heroImage = settings?.hero_image_url;

  return (
    <section className="px-4 py-6 md:py-8" style={{ fontFamily: "'Tiro Bangla', serif" }}>
      <div className="max-w-7xl mx-auto grid gap-4 md:gap-5 md:grid-cols-3">
        {/* Main hero — spans 2 cols on md */}
        <div className="md:col-span-2 relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-50 via-lime-50 to-white border border-emerald-100 p-8 md:p-12 min-h-[340px] md:min-h-[400px] flex items-center">
          {/* decorative leaves */}
          <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-emerald-200/40 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-10 w-72 h-72 rounded-full bg-lime-200/40 blur-3xl pointer-events-none" />
          <Leaf className="absolute top-6 right-6 h-8 w-8 text-emerald-400/40" />
          <Leaf className="absolute bottom-8 right-20 h-5 w-5 text-emerald-500/30 rotate-45" />

          <div className="relative grid md:grid-cols-2 gap-6 items-center w-full">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-emerald-200 text-emerald-700 text-[11px] font-bold mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {badge}
              </span>
              <h1 className="text-3xl md:text-5xl font-black leading-[1.1] text-slate-900 mb-4 whitespace-pre-line">
                {title}
              </h1>
              <p className="text-slate-600 text-sm md:text-base mb-6 max-w-md leading-relaxed">
                {subtitle}
              </p>
              <a
                href={ctaLink}
                className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-sm"
              >
                <ShoppingBag className="h-4 w-4" /> {ctaLabel}
              </a>
            </div>
            <div className="hidden md:block relative">
              {heroImage ? (
                <img
                  src={heroImage}
                  alt="Hero"
                  className="w-full h-[300px] object-contain drop-shadow-2xl"
                />
              ) : (
                <div className="w-full h-[300px] rounded-2xl bg-gradient-to-br from-emerald-100 to-lime-100 flex items-center justify-center">
                  <Leaf className="h-32 w-32 text-emerald-300" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side stack — 2 small banners */}
        <div className="grid grid-cols-2 md:grid-cols-1 gap-4 md:gap-5">
          {(offers && offers.length > 0 ? offers : [null, null]).slice(0, 2).map((o: any, i: number) => {
            const bg = i === 0
              ? "from-orange-100 via-amber-50 to-white border-amber-200"
              : "from-rose-100 via-pink-50 to-white border-rose-200";
            const accent = i === 0 ? "bg-amber-600 hover:bg-amber-700" : "bg-rose-600 hover:bg-rose-700";
            return (
              <Link
                key={i}
                to={o?.slug ? `/offer/${o.slug}` : "#shop"}
                className={`relative rounded-3xl overflow-hidden bg-gradient-to-br ${bg} border p-5 md:p-6 min-h-[170px] md:min-h-[190px] flex flex-col justify-between group`}
              >
                <div className="relative z-10">
                  {o?.badge_text && (
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/80 backdrop-blur text-[10px] font-bold text-slate-700 mb-2">
                      {o.badge_text}
                    </span>
                  )}
                  <h3 className="text-base md:text-lg font-extrabold text-slate-900 leading-tight line-clamp-2">
                    {o?.title || (i === 0 ? "তাজা ফল ও সবজি" : "সাপ্তাহিক বেস্ট সেলার")}
                  </h3>
                  {o?.description && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{o.description}</p>
                  )}
                </div>
                <div className="relative z-10 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full ${accent} text-white text-xs font-bold`}>
                    দেখুন <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
                {o?.image_url && (
                  <img
                    src={o.image_url}
                    alt=""
                    className="absolute -right-4 -bottom-4 w-28 h-28 md:w-32 md:h-32 object-cover rounded-full opacity-80 group-hover:scale-110 transition-transform duration-500"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default OrganicHomeHero;
