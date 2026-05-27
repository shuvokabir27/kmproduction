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
        .select("text,is_enabled,speed_seconds,updated_at")
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

  // Strip the hidden editor-state marker before rendering
  const rawHtml = ((data?.text || "") as string)
    .replace(/<!--MQ_JSON:[\s\S]*?-->/g, "")
    .trim();
  const enabled = data?.is_enabled !== false;
  const speed =
    typeof data?.speed_seconds === "number" && data.speed_seconds > 0
      ? data.speed_seconds
      : 35;

  const safeHtml = useMemo(
    () =>
      DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: ["span", "b", "strong", "i", "em", "u", "br", "mark"],
        ALLOWED_ATTR: ["style", "class"],
        // Keep inline styles for color/background/text-shadow but disallow url() etc
        ALLOW_DATA_ATTR: false,
      }) as unknown as string,
    [rawHtml]
  );

  if (!enabled || !rawHtml) return null;

  // Repeat content so the marquee loops seamlessly
  const Item = (
    <span className="inline-flex items-center gap-3 px-8 text-[13px] md:text-sm text-slate-700 whitespace-nowrap">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 ring-1 ring-blue-100">
        <Megaphone className="h-3 w-3 text-blue-600" />
      </span>
      <span
        className="font-medium"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
      <span className="text-slate-300">•</span>
    </span>
  );

  return (
    <div className="relative overflow-hidden border-y border-slate-200 bg-white">
      {/* Scrolling track */}
      <div className="relative flex py-1.5">
        <div
          className="flex shrink-0 animate-marquee-x"
          style={{ animationDuration: `${speed}s` }}
        >
          {Item}
          {Item}
          {Item}
          {Item}
        </div>
        <div
          className="flex shrink-0 animate-marquee-x"
          style={{ animationDuration: `${speed}s` }}
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
