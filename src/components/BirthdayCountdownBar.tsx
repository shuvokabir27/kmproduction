import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cake, Gift, PartyPopper, Sparkles, MessageCircle, Wand2, Copy, RefreshCw, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface BirthdayMember {
  id: string;
  full_name: string;
  photo_url: string | null;
  date_of_birth: string;
  daysUntil: number;
  isToday: boolean;
  nextBirthday: Date;
}

function calcDaysUntil(dob: string): { days: number; nextDate: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [, m, d] = dob.split("-").map(Number);
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next < today) next = new Date(today.getFullYear() + 1, m - 1, d);
  const diff = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return { days: diff, nextDate: next };
}

function bnNum(n: number | string): string {
  const map: Record<string, string> = { "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪", "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯" };
  return String(n).split("").map((c) => map[c] ?? c).join("");
}

export function BirthdayCountdownBar() {
  const [now, setNow] = useState(new Date());
  const [idx, setIdx] = useState(0);

  // Live ticker every second for countdown
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: members } = useQuery({
    queryKey: ["upcoming-birthdays"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, photo_url, date_of_birth")
        .eq("is_active", true)
        .not("date_of_birth", "is", null);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const upcoming = useMemo<BirthdayMember[]>(() => {
    if (!members) return [];
    return members
      .map((m: any) => {
        const { days, nextDate } = calcDaysUntil(m.date_of_birth);
        return {
          id: m.id,
          full_name: m.full_name,
          photo_url: m.photo_url,
          date_of_birth: m.date_of_birth,
          daysUntil: days,
          isToday: days === 0,
          nextBirthday: nextDate,
        };
      })
      .filter((m) => m.daysUntil <= 30) // only next 30 days
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }, [members]);

  // Rotate every 6s
  useEffect(() => {
    if (upcoming.length <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % upcoming.length), 6000);
    return () => clearInterval(id);
  }, [upcoming.length]);

  if (upcoming.length === 0) return null;

  const current = upcoming[idx % upcoming.length];
  const isToday = current.isToday;
  const showPlanBanner = current.daysUntil > 0 && current.daysUntil <= 3;

  // Live countdown to next birthday
  const diffMs = current.nextBirthday.getTime() - now.getTime();
  const totalSec = Math.max(0, Math.floor(diffMs / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  return (
    <div
      className={`relative border-b border-border/30 backdrop-blur-xl overflow-hidden ${
        isToday
          ? "bg-gradient-to-r from-pink-500/20 via-fuchsia-500/15 to-purple-500/20"
          : showPlanBanner
            ? "bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-pink-500/15"
            : "bg-gradient-to-r from-cyan-500/10 via-card/50 to-emerald-500/10"
      }`}
    >
      {/* Floating sparkles when today */}
      {isToday && (
        <>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute pointer-events-none"
              initial={{ x: `${10 + i * 12}%`, y: "100%", opacity: 0 }}
              animate={{ y: "-20%", opacity: [0, 1, 0], rotate: 360 }}
              transition={{ duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
            >
              <Sparkles className="h-3 w-3 text-pink-300" />
            </motion.div>
          ))}
        </>
      )}

      <div className="relative px-2 md:px-3 py-1.5">
        <div className="flex items-center gap-2">
          {/* Icon badge */}
          <div
            className={`shrink-0 flex items-center justify-center h-9 w-9 md:h-10 md:w-10 rounded-lg overflow-hidden relative ${
              isToday ? "shadow-[0_0_12px_rgba(236,72,153,0.6)]" : ""
            }`}
          >
            <motion.div
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 -z-10"
              style={{
                background: isToday
                  ? "linear-gradient(135deg,#ec4899,#a855f7,#f43f5e,#ec4899)"
                  : "linear-gradient(135deg,#06b6d4,#3b82f6,#8b5cf6,#06b6d4)",
                backgroundSize: "200% 200%",
              }}
            />
            <motion.div
              animate={isToday ? { rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] } : { rotate: [0, 5, -5, 0] }}
              transition={{ duration: isToday ? 1.5 : 3, repeat: Infinity }}
            >
              {isToday ? (
                <PartyPopper className="h-4 w-4 md:h-5 md:w-5 text-white drop-shadow" strokeWidth={2.4} />
              ) : (
                <Cake className="h-4 w-4 md:h-5 md:w-5 text-white drop-shadow" strokeWidth={2.4} />
              )}
            </motion.div>
          </div>

          {/* Member avatar */}
          <Link
            to={`/profile/${current.id}`}
            className="relative shrink-0 h-9 w-9 md:h-10 md:w-10 rounded-full overflow-hidden border-2 border-pink-400/50 hover:border-pink-400 transition-colors"
          >
            {current.photo_url ? (
              <img src={current.photo_url} alt={current.full_name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {current.full_name.charAt(0)}
              </div>
            )}
            {isToday && (
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 rounded-full border-2 border-pink-400"
              />
            )}
          </Link>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${current.id}-${idx}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2 min-w-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] md:text-[12px] font-bold text-foreground truncate max-w-[140px] md:max-w-none">
                      {current.full_name}
                    </span>
                    {isToday ? (
                      <span className="text-[10px] md:text-[11px] font-extrabold text-pink-300 animate-pulse">
                        🎉 আজ জন্মদিন!
                      </span>
                    ) : showPlanBanner ? (
                      <span className="text-[9px] md:text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/40 font-bold">
                        শুভেচ্ছা প্ল্যান করুন
                      </span>
                    ) : (
                      <span className="text-[9px] md:text-[10px] text-muted-foreground">
                        আসছে জন্মদিন
                      </span>
                    )}
                  </div>

                  {/* Live countdown */}
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] md:text-[11px] font-mono tabular-nums">
                    {isToday ? (
                      <span className="text-pink-200 font-bold">
                        🎂 শুভ জন্মদিন! শুভেচ্ছা পাঠান →
                      </span>
                    ) : (
                      <>
                        <span className="px-1 py-0.5 rounded bg-card/60 border border-border/30 text-foreground font-bold">
                          {bnNum(days)}<span className="text-muted-foreground text-[8px] ml-0.5">দিন</span>
                        </span>
                        <span className="px-1 py-0.5 rounded bg-card/60 border border-border/30 text-foreground font-bold">
                          {bnNum(String(hours).padStart(2, "0"))}<span className="text-muted-foreground text-[8px] ml-0.5">ঘ</span>
                        </span>
                        <span className="px-1 py-0.5 rounded bg-card/60 border border-border/30 text-foreground font-bold">
                          {bnNum(String(mins).padStart(2, "0"))}<span className="text-muted-foreground text-[8px] ml-0.5">মি</span>
                        </span>
                        <span className="px-1 py-0.5 rounded bg-pink-500/20 border border-pink-400/40 text-pink-200 font-bold">
                          {bnNum(String(secs).padStart(2, "0"))}<span className="text-pink-300/70 text-[8px] ml-0.5">সে</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Action buttons (today/3-day) */}
                {(isToday || showPlanBanner) && (
                  <Link
                    to="/chat"
                    className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] md:text-[11px] font-bold transition-all ${
                      isToday
                        ? "bg-pink-500 hover:bg-pink-600 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]"
                        : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40"
                    }`}
                  >
                    {isToday ? (
                      <>
                        <MessageCircle className="h-3 w-3" />
                        <span className="hidden sm:inline">শুভেচ্ছা</span>
                      </>
                    ) : (
                      <>
                        <Gift className="h-3 w-3" />
                        <span className="hidden sm:inline">প্ল্যান</span>
                      </>
                    )}
                  </Link>
                )}

                {/* Counter (when multiple) */}
                {upcoming.length > 1 && (
                  <span className="shrink-0 text-[9px] text-muted-foreground/60 font-mono tabular-nums">
                    {bnNum(idx + 1)}/{bnNum(upcoming.length)}
                  </span>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Animated bottom underline */}
      <motion.div
        aria-hidden
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        className="absolute inset-x-0 bottom-0 h-[1.5px] opacity-70"
        style={{
          background: isToday
            ? "linear-gradient(90deg,#ec4899,#a855f7,#f43f5e,#fbbf24,#ec4899)"
            : "linear-gradient(90deg,#06b6d4,#3b82f6,#8b5cf6,#ec4899,#06b6d4)",
          backgroundSize: "300% 100%",
        }}
      />
    </div>
  );
}
