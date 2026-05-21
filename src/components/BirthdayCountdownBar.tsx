import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cake, Gift, PartyPopper, Sparkles, MessageCircle, Wand2, Copy, RefreshCw, X, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BirthdayWishCard } from "./BirthdayWishCard";

interface BirthdayMember {
  id: string;
  full_name: string;
  photo_url: string | null;
  date_of_birth: string;
  designation: string | null;
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
  const [wishOpen, setWishOpen] = useState(false);
  const [wishLoading, setWishLoading] = useState(false);
  const [wishMessage, setWishMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [wishMember, setWishMember] = useState<BirthdayMember | null>(null);

  const fetchWish = async (member: BirthdayMember) => {
    setWishLoading(true);
    setWishMessage("");
    try {
      // fetch designation from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("designation")
        .eq("id", member.id)
        .maybeSingle();

      const { data, error } = await supabase.functions.invoke("generate-birthday-wish", {
        body: {
          full_name: member.full_name,
          designation: profile?.designation ?? null,
          days_until: member.daysUntil,
          member_id: member.id,
          seed: Date.now(),
        },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.error.includes("credits")) toast.error("AI ক্রেডিট শেষ");
        else if (data.error.includes("Rate")) toast.error("একটু পরে আবার চেষ্টা করুন");
        else toast.error("শুভেচ্ছা তৈরি করা যায়নি");
        return;
      }
      setWishMessage(data?.message ?? "");
    } catch (err: any) {
      toast.error(err?.message ?? "কিছু একটা ভুল হয়েছে");
    } finally {
      setWishLoading(false);
    }
  };

  const openWish = (member: BirthdayMember) => {
    setWishMember(member);
    setWishOpen(true);
    void fetchWish(member);
  };

  const copyWish = async () => {
    if (!wishMessage) return;
    await navigator.clipboard.writeText(wishMessage);
    setCopied(true);
    toast.success("কপি হয়েছে!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Live ticker every second for countdown
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: members } = useQuery({
    queryKey: ["upcoming-birthdays"],
    queryFn: async () => {
      // Use security-definer RPC so members/clients (not just admins) can see all
      // active members' birthdays. The profiles table RLS only exposes the
      // viewer's own row, which would hide every other birthday.
      const { data: rpcData, error: rpcError } = await (supabase as any).rpc("get_public_profiles");
      if (!rpcError && rpcData) {
        return (rpcData as any[])
          .filter((m) => m.is_active && m.date_of_birth)
          .map((m) => ({
            id: m.id,
            full_name: m.full_name,
            photo_url: m.photo_url,
            date_of_birth: m.date_of_birth,
            designation: m.designation ?? null,
          }));
      }
      // Fallback to direct table (admins will see all rows)
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, photo_url, date_of_birth, designation")
        .eq("is_active", true)
        .not("date_of_birth", "is", null);
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        id: m.id,
        full_name: m.full_name,
        photo_url: m.photo_url,
        date_of_birth: m.date_of_birth,
        designation: m.designation ?? null,
      }));
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
          designation: m.designation ?? null,
          daysUntil: days,
          isToday: days === 0,
          nextBirthday: nextDate,
        };
      })
      .filter((m) => m.daysUntil <= 30) // only next 30 days
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [members]);

  // Today's birthday members (for big card)
  const todayMembers = useMemo(() => upcoming.filter((m) => m.isToday), [upcoming]);
  const upcomingOnly = useMemo(() => upcoming.filter((m) => !m.isToday), [upcoming]);
  const [todayIdx, setTodayIdx] = useState(0);
  useEffect(() => {
    setTodayIdx(0);
  }, [todayMembers.length]);

  // Rotate every 4s through upcoming-only list
  useEffect(() => {
    if (upcomingOnly.length <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % upcomingOnly.length), 4000);
    return () => clearInterval(id);
  }, [upcomingOnly.length]);

  if (upcoming.length === 0) return null;

  const current = upcomingOnly.length > 0 ? upcomingOnly[idx % upcomingOnly.length] : null;
  const showPlanBanner = !!current && current.daysUntil > 0 && current.daysUntil <= 3;

  // Live countdown to current upcoming
  const diffMs = current ? current.nextBirthday.getTime() - now.getTime() : 0;
  const totalSec = Math.max(0, Math.floor(diffMs / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  const todayMember = todayMembers.length > 0 ? todayMembers[todayIdx % todayMembers.length] : null;

  return (
    <div className="space-y-2">
      {/* ========== TODAY'S BIRTHDAY: Big celebration card ========== */}
      {todayMember && (
        <div className="relative">
          {/* Carousel controls if multiple today */}
          {todayMembers.length > 1 && (
            <div className="flex items-center justify-between mb-2 px-1">
              <button
                onClick={() => setTodayIdx((i) => (i - 1 + todayMembers.length) % todayMembers.length)}
                className="h-7 w-7 rounded-full bg-card border border-border/60 flex items-center justify-center hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[11px] font-bold text-pink-400">
                🎂 আজ {bnNum(todayMembers.length)} জনের জন্মদিন ({bnNum(todayIdx + 1)}/{bnNum(todayMembers.length)})
              </span>
              <button
                onClick={() => setTodayIdx((i) => (i + 1) % todayMembers.length)}
                className="h-7 w-7 rounded-full bg-card border border-border/60 flex items-center justify-center hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          <BirthdayWishCard
            key={todayMember.id}
            member={{
              id: todayMember.id,
              full_name: todayMember.full_name,
              photo_url: todayMember.photo_url,
              designation: todayMember.designation,
            }}
          />
        </div>
      )}

      {/* ========== UPCOMING (next 30 days): Sliding ticker ========== */}
      {upcomingOnly.length > 0 && current && (
        <div
          className={`relative border border-border/30 rounded-xl backdrop-blur-xl overflow-hidden ${
            showPlanBanner
              ? "bg-gradient-to-r from-red-500/15 via-red-500/10 to-pink-500/15"
              : "bg-gradient-to-r from-cyan-500/10 via-card/50 to-red-500/10"
          }`}
        >
          <div className="relative px-2 md:px-3 py-1.5">
            <div className="flex items-center gap-2">
              {/* Icon */}
              <div className="shrink-0 flex items-center justify-center h-8 w-8 rounded-lg overflow-hidden relative">
                <motion.div
                  animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 -z-10"
                  style={{
                    background: "linear-gradient(135deg,#06b6d4,#3b82f6,#8b5cf6,#06b6d4)",
                    backgroundSize: "200% 200%",
                  }}
                />
                <Cake className="h-4 w-4 text-white drop-shadow" strokeWidth={2.4} />
              </div>

              {/* Avatar */}
              <Link
                to={`/profile/${current.id}`}
                className="relative shrink-0 h-8 w-8 rounded-full overflow-hidden border-2 border-pink-400/50 hover:border-pink-400 transition-colors"
              >
                {current.photo_url ? (
                  <img src={current.photo_url} alt={current.full_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {current.full_name.charAt(0)}
                  </div>
                )}
              </Link>

              {/* Sliding info */}
              <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${current.id}-${idx}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] md:text-[12px] font-bold text-foreground truncate max-w-[140px] md:max-w-none">
                        {current.full_name}
                      </span>
                      {showPlanBanner ? (
                        <span className="text-[9px] md:text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-200 border border-red-400/40 font-bold">
                          শুভেচ্ছা প্ল্যান করুন
                        </span>
                      ) : (
                        <span className="text-[9px] md:text-[10px] text-muted-foreground">
                          আসছে জন্মদিন
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 text-[10px] md:text-[11px] font-mono tabular-nums">
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
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Counter dots */}
              {upcomingOnly.length > 1 && (
                <span className="shrink-0 text-[9px] text-muted-foreground/60 font-mono tabular-nums">
                  {bnNum(idx + 1)}/{bnNum(upcomingOnly.length)}
                </span>
              )}
            </div>
          </div>

          {/* Animated underline */}
          <motion.div
            aria-hidden
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            className="absolute inset-x-0 bottom-0 h-[1.5px] opacity-70"
            style={{
              background: "linear-gradient(90deg,#06b6d4,#3b82f6,#8b5cf6,#ec4899,#06b6d4)",
              backgroundSize: "300% 100%",
            }}
          />
        </div>
      )}
    </div>
  );
}

