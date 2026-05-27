import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Truck, ArrowRight } from "lucide-react";

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
          <div className="relative rounded-2xl border border-slate-200 bg-white hover:border-blue-300 transition-colors p-4 md:p-5">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="shrink-0 grid place-items-center h-12 w-12 md:h-14 md:w-14 rounded-xl bg-blue-50 text-blue-600">
                <Truck className="h-6 w-6 md:h-7 md:w-7" />
              </div>

              <div className="flex-1 min-w-0" style={{ fontFamily: "'Tiro Bangla', serif" }}>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold mb-1 bg-blue-50 text-blue-700">
                  বিশেষ অফার
                </div>
                <h3 className="font-extrabold text-base md:text-xl leading-tight text-slate-900 truncate">
                  {campaign.title}
                </h3>
                {campaign.description && (
                  <p className="text-xs md:text-sm text-slate-500 line-clamp-1 mt-0.5">{campaign.description}</p>
                )}
              </div>

              <div className="shrink-0" style={{ fontFamily: "'Tiro Bangla', serif" }}>
                <div className="inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full px-3 md:px-4 py-2 text-xs md:text-sm whitespace-nowrap">
                  <span>Get Free Delivery</span>
                  <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
