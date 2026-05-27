import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Truck, Sparkles, ArrowRight } from "lucide-react";

export default function FreeDeliveryHomeCTA() {
  const { data: campaign } = useQuery({
    queryKey: ["fd-active-campaign-cta"],
    queryFn: async () => {
      const { data } = await supabase
        .from("free_delivery_campaigns" as any)
        .select("id,title,description,is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
    },
  });

  if (!campaign) return null;

  return (
    <section className="px-4 pt-2 pb-2">
      <div className="max-w-7xl mx-auto">
        <Link to="/free-delivery" className="block group">
          {/* Outer gradient ring — premium gold→rose→crimson */}
          <div className="relative rounded-[28px] p-[1.5px] bg-[conic-gradient(from_140deg_at_50%_50%,#fde68a_0%,#fb7185_25%,#3b82f6_50%,#fb7185_75%,#fde68a_100%)] shadow-[0_20px_60px_-20px_hsl(0_85%_45%/0.55)] hover:shadow-[0_28px_70px_-18px_hsl(0_90%_50%/0.7)] transition-shadow duration-500">
            <div className="relative overflow-hidden rounded-[26px] bg-[linear-gradient(115deg,#7f1d1d_0%,#2563eb_35%,#3b82f6_70%,#9f1239_100%)] p-4 md:p-5">
              {/* Ambient glows */}
              <div className="pointer-events-none absolute -top-16 -left-10 w-56 h-56 rounded-full bg-amber-300/25 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -right-10 w-64 h-64 rounded-full bg-slate-100 blur-3xl animate-pulse" />
              {/* Soft sheen */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_60%_at_20%_0%,rgba(255,255,255,0.22),transparent_55%)]" />
              {/* Animated diagonal shine */}
              <div className="pointer-events-none absolute -inset-x-1/3 top-0 h-full opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-y-0 -left-1/3 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-0 group-hover:translate-x-[400%] transition-transform duration-[1400ms] ease-out" />
              </div>
              {/* Grain */}
              <div className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")" }} />
              {/* Inner top hairline */}
              <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

              <div className="relative flex items-center gap-3 md:gap-4">
                {/* Icon tile */}
                <div className="relative shrink-0">
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-amber-300/60 via-slate-100/40 to-blue-600/60 blur-md opacity-80" />
                  <div className="relative bg-white/15 backdrop-blur-xl p-3 rounded-2xl ring-1 ring-white/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.45),inset_0_-1px_0_0_rgba(0,0,0,0.25)]">
                    <Truck className="h-7 w-7 md:h-9 md:w-9 text-white drop-shadow" />
                  </div>
                </div>

                <div className="flex-1 min-w-0 text-white" style={{ fontFamily: "'Tiro Bangla', serif" }}>
                  <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-bold mb-1.5 ring-1 ring-white/25 shadow-sm">
                    <Sparkles className="h-3 w-3 text-amber-200 animate-pulse" />
                    <span className="bg-gradient-to-r from-amber-100 via-white to-amber-100 bg-clip-text text-transparent tracking-wide">বিশেষ অফার</span>
                  </div>
                  <h3 className="font-extrabold text-lg md:text-2xl leading-tight bg-gradient-to-r from-white via-amber-50 to-slate-100 bg-clip-text text-transparent drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)] truncate">
                    {campaign.title}
                  </h3>
                  {campaign.description && (
                    <p className="text-xs md:text-sm text-white/85 line-clamp-1 mt-0.5">{campaign.description}</p>
                  )}
                </div>

                {/* Premium CTA pill */}
                <div className="relative shrink-0" style={{ fontFamily: "'Tiro Bangla', serif" }}>
                  <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-amber-300 via-white to-slate-100 opacity-70 blur-[6px] group-hover:opacity-100 transition-opacity" />
                  <div className="relative inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all bg-gradient-to-b from-white to-amber-50 text-blue-700 font-extrabold rounded-full pl-3 md:pl-5 pr-3 md:pr-4 py-2 md:py-2.5 text-xs md:text-sm whitespace-nowrap ring-1 ring-amber-200/80 shadow-[0_10px_24px_-10px_rgba(220,38,38,0.65),inset_0_1px_0_0_rgba(255,255,255,0.9)]">
                    <span className="bg-gradient-to-r from-blue-700 via-slate-100 to-blue-700 bg-clip-text text-transparent">Get Free Delivery</span>
                    <span className="grid place-items-center h-5 w-5 md:h-6 md:w-6 rounded-full bg-gradient-to-br from-blue-600 to-slate-100 text-white shadow-inner">
                      <ArrowRight className="h-3 w-3 md:h-3.5 md:w-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
