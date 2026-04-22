import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone } from "lucide-react";

/**
 * Glossy scrolling marquee shown at the very top of the app.
 * Announces that the user can find updates for KM Production and (if applicable)
 * any external/freelance clients linked to the current member.
 */
export function UpdateNoticeMarquee() {
  const { profile } = useAuth();

  const { data: clientNames = [] } = useQuery({
    queryKey: ["update-marquee-clients", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("freelance_assignments")
        .select(
          "freelance_projects(client_name, client_profiles(name, company))"
        )
        .eq("member_id", profile!.id);
      const names = new Set<string>();
      (data || []).forEach((row: any) => {
        const p = row?.freelance_projects;
        const n =
          p?.client_profiles?.company ||
          p?.client_profiles?.name ||
          p?.client_name;
        if (n) names.add(n);
      });
      return Array.from(names);
    },
  });

  const message = (
    <>
      এখানে{" "}
      <span className="font-bold text-cyan-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.6)]">
        কুয়াকাটা মাল্টিমিডিয়া
      </span>
      -র সকল কাজের আপডেট
      {clientNames.length > 0 && (
        <>
          {" "}ও{" "}
          <span className="font-bold text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]">
            {clientNames.join(", ")}
          </span>
          -এর সকল কাজের আপডেট
        </>
      )}{" "}
      পাবেন।
    </>
  );

  // Repeat content so the marquee loops seamlessly
  const Item = (
    <span className="inline-flex items-center gap-3 px-8 text-[13px] md:text-sm text-white/95 whitespace-nowrap">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
        <Megaphone className="h-3 w-3 text-white" />
      </span>
      {message}
      <span className="text-white/40">•</span>
    </span>
  );

  return (
    <div className="relative overflow-hidden border-b border-white/10">
      {/* Base glossy gradient */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, hsl(220 70% 18%) 0%, hsl(260 60% 22%) 35%, hsl(290 65% 28%) 65%, hsl(220 70% 18%) 100%)",
        }}
      />
      {/* Animated shimmer/sheen overlay */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-60 pointer-events-none animate-marquee-sheen"
        style={{
          background:
            "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)",
          backgroundSize: "200% 100%",
        }}
      />
      {/* Top gloss highlight */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-1/2 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.18), transparent)",
        }}
      />
      {/* Bottom subtle dark */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.25), transparent)",
        }}
      />

      {/* Scrolling track */}
      <div className="relative flex py-1.5">
        <div className="flex shrink-0 animate-marquee-x">
          {Item}
          {Item}
          {Item}
          {Item}
        </div>
        <div
          className="flex shrink-0 animate-marquee-x"
          aria-hidden
        >
          {Item}
          {Item}
          {Item}
          {Item}
        </div>
      </div>
    </div>
  );
}
