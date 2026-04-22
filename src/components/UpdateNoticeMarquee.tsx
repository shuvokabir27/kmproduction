import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone } from "lucide-react";
import DOMPurify from "dompurify";

/**
 * Glossy scrolling marquee shown at the very top of the app.
 * Text + on/off is controlled by admins via public.marquee_settings.
 * The text is stored as sanitized HTML so admins can color individual
 * words and apply effects (blink, glow, rainbow, etc.) per word.
 */
export function UpdateNoticeMarquee() {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["marquee-settings"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("marquee_settings")
        .select("text,is_enabled,updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Live updates so every viewer sees changes instantly
  useEffect(() => {
    const channel = supabase
      .channel("marquee-settings-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marquee_settings" },
        () => qc.invalidateQueries({ queryKey: ["marquee-settings"] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const rawHtml = (data?.text || "").trim();
  const enabled = data?.is_enabled !== false;

  const safeHtml = useMemo(
    () =>
      DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: ["span", "b", "strong", "i", "em", "u", "br", "mark"],
        ALLOWED_ATTR: ["style", "class"],
        // Keep inline styles for color/background/text-shadow but disallow url() etc
        ALLOW_DATA_ATTR: false,
      }),
    [rawHtml]
  );

  if (!enabled || !rawHtml) return null;

  // Repeat content so the marquee loops seamlessly
  const Item = (
    <span className="inline-flex items-center gap-3 px-8 text-[13px] md:text-sm text-white/95 whitespace-nowrap">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
        <Megaphone className="h-3 w-3 text-white" />
      </span>
      <span
        className="font-medium"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
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
          background: "linear-gradient(to top, rgba(0,0,0,0.25), transparent)",
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
        <div className="flex shrink-0 animate-marquee-x" aria-hidden>
          {Item}
          {Item}
          {Item}
          {Item}
        </div>
      </div>
    </div>
  );
}
