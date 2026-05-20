import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, Radio, ExternalLink, Flag, Globe2, X, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

const HIDE_KEY = "news-ticker-hidden";

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

const ROTATE_MS = 12000; // 12 seconds per headline

/**
 * Interleave items so that Bangladeshi and non-Bangladeshi (international/random)
 * headlines alternate. The non-BD pool is shuffled for randomness across countries.
 * No two consecutive items will be Bangladeshi.
 */
function interleaveAlternating(list: NewsItem[]): NewsItem[] {
  const bd = list.filter((it) => it.bangladeshi);
  const intl = list.filter((it) => !it.bangladeshi);

  // Shuffle international pool for random country variety
  for (let i = intl.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [intl[i], intl[j]] = [intl[j], intl[i]];
  }

  const result: NewsItem[] = [];
  let bi = 0;
  let ii = 0;
  // Start with BD if available, then alternate
  let pickBD = bd.length > 0;

  while (bi < bd.length || ii < intl.length) {
    if (pickBD && bi < bd.length) {
      result.push(bd[bi++]);
      pickBD = false;
    } else if (!pickBD && ii < intl.length) {
      result.push(intl[ii++]);
      pickBD = true;
    } else if (bi < bd.length) {
      // intl exhausted — only append BD if last wasn't BD (enforce no-consecutive rule)
      if (result.length === 0 || !result[result.length - 1].bangladeshi) {
        result.push(bd[bi++]);
      } else {
        bi++; // skip to avoid two BD in a row
      }
      pickBD = false;
    } else if (ii < intl.length) {
      result.push(intl[ii++]);
      pickBD = true;
    }
  }
  return result;
}

export function NewsTickerBar() {
  const { isAdmin } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState<boolean>(() => {
    try { return localStorage.getItem(HIDE_KEY) === "1"; } catch { return false; }
  });
  if (!isAdmin && !isEnabled("breaking_news")) return null;
  const rotateTimeoutRef = useRef<number | null>(null);

  const setHiddenPersist = (v: boolean) => {
    setHidden(v);
    try { localStorage.setItem(HIDE_KEY, v ? "1" : "0"); } catch {}
  };

  // Fetch news
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
        if (data?.items?.length) {
          setItems(interleaveAlternating(data.items));
          setIdx(0);
        }
      } catch (e) {
        console.error("news-feed fetch failed", e);
      }
    }

    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Auto-rotate every 8s
  useEffect(() => {
    if (rotateTimeoutRef.current) {
      window.clearTimeout(rotateTimeoutRef.current);
      rotateTimeoutRef.current = null;
    }

    if (items.length === 0 || paused) return;

    rotateTimeoutRef.current = window.setTimeout(() => {
      setIdx((i) => (i + 1) % items.length);
    }, ROTATE_MS);

    return () => {
      if (rotateTimeoutRef.current) {
        window.clearTimeout(rotateTimeoutRef.current);
        rotateTimeoutRef.current = null;
      }
    };
  }, [idx, items.length, paused]);

  // Collapsed view — small button to re-open
  if (hidden) {
    return (
      <div className="relative border-b border-border/30 bg-gradient-to-r from-rose-500/10 via-card/70 to-amber-500/10 backdrop-blur-xl">
        <button
          onClick={() => setHiddenPersist(false)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          aria-label="ব্রেকিং নিউজ দেখান"
        >
          <Eye className="h-3 w-3" />
          ব্রেকিং নিউজ দেখান
        </button>
      </div>
    );
  }

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

  const current = items[idx];
  const FlagIcon = current.bangladeshi ? Flag : Globe2;
  const colorClass = current.bangladeshi ? "text-emerald-300" : "text-cyan-300";
  const dotColor = current.bangladeshi ? "bg-emerald-400" : "bg-cyan-400";

  return (
    <div
      className="relative border-b border-border/30 bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-cyan-500/10 backdrop-blur-xl"
      onPointerEnter={(e) => { if (e.pointerType === "mouse") setPaused(true); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") setPaused(false); }}
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

      {/* Progress bar — fills over 8s */}
      {!paused && (
        <motion.div
          key={idx}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: ROTATE_MS / 1000, ease: "linear" }}
          className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-400 z-20 shadow-[0_0_6px_rgba(251,191,36,0.6)]"
        />
      )}

      <div className="relative px-2 md:px-3 py-2">
        <div className="flex items-stretch gap-2">
          {/* LIVE badge — vertical pill */}
          <div className="relative shrink-0 flex flex-col items-center justify-center gap-0.5 px-2 rounded-lg overflow-hidden self-stretch min-w-[52px] md:min-w-[60px]">
            <motion.div
              aria-hidden
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 -z-10"
              style={{
                background: "linear-gradient(135deg,#f43f5e,#ef4444,#f59e0b,#f43f5e)",
                backgroundSize: "200% 200%",
              }}
            />
            <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent -z-10" />
            <div className="flex items-center gap-1">
              <motion.span
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_2px_rgba(255,255,255,0.9)]"
              />
              <Newspaper className="h-3 w-3 text-white drop-shadow" strokeWidth={2.6} />
            </div>
            <span className="text-[9px] md:text-[10px] font-extrabold text-white tracking-wider drop-shadow leading-none">
              ব্রেকিং নিউজ
            </span>
          </div>

          {/* Headline box — grows with content, no overflow */}
          <div className="relative flex-1 min-w-0 grid">
            <AnimatePresence mode="wait">
              <motion.a
                key={idx}
                href={current.link}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="col-start-1 row-start-1 flex flex-col gap-1 px-2.5 md:px-3 py-1.5 rounded-lg
                  bg-gradient-to-br from-card/90 to-card/60 border border-border/50
                  hover:border-primary/40 transition-colors group
                  shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]
                  min-w-0 w-full"
              >
                {/* Top row: source chip + counter */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] md:text-[10px] font-extrabold uppercase tracking-wider shrink-0 max-w-[55%]
                      ${current.bangladeshi
                        ? "bg-gradient-to-r from-emerald-500/25 to-green-500/20 text-emerald-200 border border-emerald-400/40"
                        : "bg-gradient-to-r from-cyan-500/25 to-blue-500/20 text-cyan-200 border border-cyan-400/40"
                      }`}
                  >
                    <FlagIcon className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{current.source}</span>
                  </span>
                  <span className="text-[9px] text-muted-foreground/60 ml-auto font-mono tabular-nums shrink-0">
                    {idx + 1}/{items.length}
                  </span>
                  <ExternalLink className="h-2.5 w-2.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>

                {/* Full headline — wraps freely */}
                <p
                  className="text-[12px] md:text-[13px] leading-snug font-semibold text-foreground/95 group-hover:text-primary transition-colors min-w-0"
                  style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                >
                  {current.title}
                </p>
              </motion.a>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Hide button */}
      <button
        onClick={() => setHiddenPersist(true)}
        aria-label="ব্রেকিং নিউজ লুকান"
        className="absolute top-1 right-1 z-30 h-5 w-5 rounded-full bg-background/70 hover:bg-background border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
