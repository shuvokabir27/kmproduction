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
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-500 via-red-500 to-red-500 p-4 md:p-5 shadow-xl ring-2 ring-red-300/60 hover:shadow-2xl transition-all">
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_50%,white,transparent_60%)]" />
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-red-300/30 rounded-full blur-2xl animate-pulse" />
            <div className="relative flex items-center gap-3 md:gap-4">
              <div className="bg-white/20 backdrop-blur p-3 rounded-xl">
                <Truck className="h-7 w-7 md:h-9 md:w-9 text-white" />
              </div>
              <div className="flex-1 text-white" style={{ fontFamily: "'Tiro Bangla', serif" }}>
                <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold mb-1 animate-pulse">
                  <Sparkles className="h-3 w-3" /> বিশেষ অফার
                </div>
                <h3 className="font-extrabold text-base md:text-xl leading-tight">{campaign.title}</h3>
                {campaign.description && (
                  <p className="text-xs md:text-sm text-white/90 line-clamp-1">{campaign.description}</p>
                )}
              </div>
              <div className="bg-white text-red-600 font-bold rounded-full px-3 md:px-5 py-2 md:py-2.5 text-xs md:text-sm whitespace-nowrap flex items-center gap-1 group-hover:gap-2 transition-all shadow-lg" style={{ fontFamily: "'Tiro Bangla', serif" }}>
                Get Free Delivery <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </div>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
