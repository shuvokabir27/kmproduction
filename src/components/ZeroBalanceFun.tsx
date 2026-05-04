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

export function ZeroBalanceFun() {
  const { data: members } = useQuery({
    queryKey: ["zero-balance-members-spotlight"],
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("get_public_profiles");
      return ((data ?? []) as any[]).filter((p) => p.is_active !== false);
    },
  });

  // Spotlight: pick a random member from the grid + a random funny message
  const [spot, setSpot] = useState<{ memberIdx: number; msgIdx: number; key: number } | null>(null);

  useEffect(() => {
    if (!members || members.length === 0) return;
    let timer: any;
    const tick = () => {
      const memberIdx = Math.floor(Math.random() * members.length);
      const msgIdx = Math.floor(Math.random() * FUNNY_MESSAGES.length);
      setSpot({ memberIdx, msgIdx, key: Date.now() });
      // visible ~3.2s, gap ~0.6s before next pop
      timer = setTimeout(() => {
        setSpot(null);
        timer = setTimeout(tick, 600);
      }, 3200);
    };
    tick();
    return () => clearTimeout(timer);
  }, [members]);

  return (
    <div className="space-y-6">
      {members && members.length > 0 && (
        <div className="premium-card rounded-2xl overflow-hidden">
          <div className="p-4 md:p-5 border-b border-border/15 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-cyan-400" />
            </div>
            <h2 className="font-semibold text-foreground text-sm md:text-base">সদস্য তালিকা</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {members.length} জন
            </span>
          </div>

          <div className="relative grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 p-5 pt-16">
            {members.map((m: any, idx: number) => {
              const isUp = spot?.memberIdx === idx;
              return (
                <div key={m.id} className="relative flex flex-col items-center text-center gap-1.5">
                  <motion.div
                    animate={
                      isUp
                        ? { y: -56, scale: 1.25, zIndex: 30 }
                        : { y: 0, scale: 1, zIndex: 1 }
                    }
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                    className="relative"
                  >
                    {isUp && (
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary via-fuchsia-500 to-amber-400 blur-md opacity-70 animate-pulse" />
                    )}
                    <img
                      src={m.photo_url}
                      alt={m.full_name}
                      className={`relative h-16 w-16 md:h-20 md:w-20 rounded-full object-cover border-2 ${
                        isUp ? "border-primary" : "border-border/40"
                      }`}
                    />

                    {/* Funny message bubble above the lifted member */}
                    <AnimatePresence>
                      {isUp && spot && (
                        <motion.div
                          key={spot.key}
                          initial={{ opacity: 0, y: 6, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.95 }}
                          transition={{ duration: 0.25 }}
                          className="absolute left-1/2 -translate-x-1/2 -top-12 whitespace-nowrap max-w-[60vw] px-3 py-1.5 rounded-xl bg-card border border-primary/40 shadow-lg text-[11px] md:text-xs font-semibold text-foreground"
                        >
                          {FUNNY_MESSAGES[spot.msgIdx]}
                          <span className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 h-3 w-3 rotate-45 bg-card border-r border-b border-primary/40" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  <p className="text-[11px] md:text-xs font-medium text-foreground truncate max-w-full">
                    {m.full_name}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
