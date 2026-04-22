import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Newspaper, Radio, ExternalLink, Flag, Globe2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface NewsItem {
  title: string;
  link: string;
  source: string;
  bangladeshi: boolean;
}

interface NewsResponse {
  items: NewsItem[];
  updatedAt: string;
}

export function NewsTickerBar() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data, error } = await supabase.functions.invoke<NewsResponse>("news-feed");
        if (cancelled) return;
        if (error) {
          console.error("news-feed invoke error", error);
          return;
        }
        if (data?.items?.length) setItems(data.items);
      } catch (e) {
        console.error("news-feed fetch failed", e);
      }
    }

    load();
    // refresh every 5 minutes
    const id = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (items.length === 0) {
    return (
      <div className="relative border-b border-border/30 bg-gradient-to-r from-rose-500/10 via-card/70 to-amber-500/10 backdrop-blur-xl">
        <div className="flex items-center gap-2 px-3 py-1.5">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Radio className="h-3.5 w-3.5 text-rose-400" />
          </motion.div>
          <span className="text-[11px] text-muted-foreground">নিউজ লোড হচ্ছে...</span>
        </div>
      </div>
    );
  }

  // Duplicate for seamless marquee
  const loop = [...items, ...items];

  // approximate animation duration based on count
  const duration = Math.max(40, items.length * 6);

  return (
    <div
      className="relative border-b border-border/30 overflow-hidden bg-gradient-to-r from-rose-500/15 via-amber-500/10 via-emerald-500/10 to-cyan-500/15 backdrop-blur-xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Animated rainbow underline */}
      <motion.div
        aria-hidden
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute inset-x-0 bottom-0 h-[1.5px] opacity-80"
        style={{
          background:
            "linear-gradient(90deg,#f43f5e,#f59e0b,#facc15,#10b981,#06b6d4,#6366f1,#a855f7,#ec4899,#f43f5e)",
          backgroundSize: "300% 100%",
        }}
      />

      <div className="relative flex items-stretch h-8 md:h-9">
        {/* LIVE badge */}
        <div className="relative shrink-0 flex items-center gap-1.5 px-2.5 md:px-3 z-20">
          <motion.div
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute inset-y-1 left-1.5 right-1 rounded-md -z-10"
            style={{
              background:
                "linear-gradient(90deg,#f43f5e,#ef4444,#f59e0b,#f43f5e)",
              backgroundSize: "200% 100%",
            }}
          />
          <span className="absolute inset-y-1 left-1.5 right-1 rounded-md bg-gradient-to-b from-white/30 to-transparent -z-10" />
          <motion.span
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="relative h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.9)]"
          />
          <Newspaper className="h-3 w-3 md:h-3.5 md:w-3.5 text-white drop-shadow" strokeWidth={2.6} />
          <span className="text-[10px] md:text-[11px] font-extrabold text-white tracking-wider drop-shadow">
            লাইভ
          </span>
        </div>

        {/* Fade edges */}
        <div className="pointer-events-none absolute left-[78px] md:left-[92px] top-0 bottom-0 w-8 bg-gradient-to-r from-card/80 to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-card/80 to-transparent z-10" />

        {/* Marquee */}
        <div className="relative flex-1 overflow-hidden">
          <div
            className="flex items-center h-full whitespace-nowrap will-change-transform"
            style={{
              animation: `news-marquee ${duration}s linear infinite`,
              animationPlayState: paused ? "paused" : "running",
            }}
          >
            {loop.map((item, idx) => {
              const FlagIcon = item.bangladeshi ? Flag : Globe2;
              const colorClass = item.bangladeshi
                ? "text-emerald-300"
                : "text-cyan-300";
              const dotColor = item.bangladeshi ? "bg-emerald-400" : "bg-cyan-400";
              return (
                <a
                  key={`${idx}-${item.link}`}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 group"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${dotColor} shadow-[0_0_6px_currentColor]`} />
                  <FlagIcon className={`h-3 w-3 ${colorClass} shrink-0`} />
                  <span className={`text-[10px] md:text-[11px] font-bold uppercase tracking-wider ${colorClass} shrink-0`}>
                    {item.source}
                  </span>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-[11px] md:text-xs text-foreground/90 group-hover:text-primary transition-colors font-medium">
                    {item.title}
                  </span>
                  <ExternalLink className="h-2.5 w-2.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes news-marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
