import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Users } from "lucide-react";

const FUNNY_MESSAGES = [
  "🎬 ক্যামেরা রেডি? অ্যাকশন বলার আগেই হাসি দাও!",
  "☕ চা খাও, কাজ পরে — শিল্পীর মেজাজটাই আসল!",
  "🌟 তুমি আজকের হিরো, কালকের সুপারস্টার!",
  "📸 একটা সেলফি তুলে ফেলো, আমরা তোমার ফ্যান!",
  "🎭 অভিনয় কঠিন না, কঠিন হলো সিরিয়াস থাকা!",
  "🔥 তোমার এনার্জি দেখলে ব্যাটারিও লজ্জা পাবে!",
  "🎤 ডায়লগ ভুলে গেলে? কোনো সমস্যা নেই — ইম্প্রোভাইজ!",
  "🍿 পপকর্ন রেডি, তোমার পারফরম্যান্স দেখার অপেক্ষায়!",
  "🎨 প্রতিটি শট একেকটা পেইন্টিং, তুমি আর্টিস্ট!",
  "🚀 আজকের পরিশ্রম কালকের তারকা বানাবে!",
  "💫 হাসিটা চালিয়ে যাও, ক্যামেরা ভালোবাসে!",
  "🎯 পারফেকশন না, প্যাশনই আসল!",
  "🌈 খারাপ দিন? কাট! রিটেক!",
  "🎪 জীবনটাই একটা বড়ো শো, তুমিই মেইন রোলে!",
  "🦄 আজকের দিনটা ম্যাজিকাল হোক!",
];

function Avatar({ url, name, size = "md", ring = false }: { url?: string; name: string; size?: "sm" | "md" | "lg"; ring?: boolean }) {
  const cls =
    size === "lg"
      ? "h-28 w-28 md:h-32 md:w-32 text-2xl"
      : size === "sm"
        ? "h-16 w-16 md:h-20 md:w-20 text-sm"
        : "h-20 w-20 text-base";
  const border = ring ? "border-primary" : "border-border/40";
  return url ? (
    <img src={url} alt={name} className={`relative rounded-full object-cover border-2 ${cls} ${border}`} />
  ) : (
    <div className={`relative rounded-full bg-muted border-2 flex items-center justify-center font-bold text-foreground ${cls} ${border}`}>
      {(name || "?").trim().charAt(0)}
    </div>
  );
}

export function ZeroBalanceFun() {
  const { data: members } = useQuery({
    queryKey: ["zero-balance-members-spotlight"],
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("get_public_profiles");
      const list = ((data ?? []) as any[]).filter((p) => p.is_active !== false);
      // Sort: custom display order first (ascending, 0 = unset goes last), then priority desc, then name
      list.sort((a, b) => {
        const oa = Number(a.public_display_order ?? 0) || 9999;
        const ob = Number(b.public_display_order ?? 0) || 9999;
        if (oa !== ob) return oa - ob;
        const pa = Number(a.spotlight_priority ?? 1);
        const pb = Number(b.spotlight_priority ?? 1);
        if (pb !== pa) return pb - pa;
        return (a.full_name || "").localeCompare(b.full_name || "");
      });
      return list;
    },
  });

  const [spot, setSpot] = useState<{ memberIdx: number; message: string; key: number } | null>(null);

  const pickWeightedIndex = (list: any[]) => {
    const weights = list.map((m) => Math.max(1, Number(m.spotlight_priority ?? 1)));
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return list.length - 1;
  };

  const fetchAiMessage = async (member: any): Promise<string> => {
    try {
      const { data } = await supabase.functions.invoke("generate-funny-message", {
        body: { name: member?.full_name || "", designation: member?.designation || "" },
      });
      const msg = (data as any)?.message;
      if (typeof msg === "string" && msg.trim()) return msg.trim();
    } catch {}
    return FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)];
  };

  useEffect(() => {
    if (!members || members.length === 0) return;
    let cancelled = false;
    let timer: any;
    const tick = async () => {
      const memberIdx = pickWeightedIndex(members);
      const member = members[memberIdx];
      const message = await fetchAiMessage(member);
      if (cancelled) return;
      setSpot({ memberIdx, message, key: Date.now() });
      timer = setTimeout(tick, 5500);
    };
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [members]);

  const spotMember = spot && members ? members[spot.memberIdx] : null;

  return (
    <div className="space-y-6">
      {/* Animated spotlight display */}
      <div className="premium-card rounded-2xl overflow-hidden">
        <div className="p-4 md:p-5 border-b border-border/15 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-fuchsia-500/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-fuchsia-400" />
          </div>
          <h2 className="font-semibold text-foreground text-sm md:text-base">আজকের স্পটলাইট</h2>
        </div>
        <div className="relative min-h-[260px] md:min-h-[300px] flex items-center justify-center p-6 overflow-hidden bg-gradient-to-br from-primary/5 via-fuchsia-500/5 to-amber-500/5">
          {/* glow */}
          <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.25),transparent_60%)]" />
          <AnimatePresence mode="wait">
            {spotMember && spot && (
              <motion.div
                key={spot.key}
                initial={{ opacity: 0, y: 40, scale: 0.7 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -40, scale: 0.7 }}
                transition={{ type: "spring", stiffness: 220, damping: 20 }}
                className="relative flex flex-col items-center gap-4"
              >
                {/* Speech bubble */}
                <div className="relative px-4 py-2 rounded-2xl bg-card border border-primary/40 shadow-lg max-w-[80vw] md:max-w-md text-center">
                  <p className="text-xs md:text-sm font-semibold text-foreground">
                    {spot.message}
                  </p>
                  <span className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 h-3 w-3 rotate-45 bg-card border-r border-b border-primary/40" />
                </div>
                {/* Avatar with glow */}
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary via-fuchsia-500 to-amber-400 blur-xl opacity-70 animate-pulse" />
                  <Avatar url={spotMember.photo_url} name={spotMember.full_name} size="lg" ring />
                </div>
                <div className="text-center">
                  <p className="text-base md:text-lg font-bold text-foreground">{spotMember.full_name}</p>
                  {spotMember.member_id && (
                    <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5">আইডি: {spotMember.member_id}</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Full member grid (static) */}
      {members && members.length > 0 && (
        <div className="premium-card rounded-2xl overflow-hidden">
          <div className="p-4 md:p-5 border-b border-border/15 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-cyan-400" />
            </div>
            <h2 className="font-semibold text-foreground text-sm md:text-base">সদস্য তালিকা</h2>
            <span className="ml-auto text-xs text-muted-foreground">{members.length} জন</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 p-5">
            {members.map((m: any) => (
              <div key={m.id} className="flex flex-col items-center text-center gap-1.5">
                <Avatar url={m.photo_url} name={m.full_name} size="sm" />
                <p className="text-[11px] md:text-xs font-medium text-foreground truncate max-w-full">
                  {m.full_name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
