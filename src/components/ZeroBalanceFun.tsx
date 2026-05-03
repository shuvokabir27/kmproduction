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
  const [msgIdx, setMsgIdx] = useState(() => Math.floor(Math.random() * FUNNY_MESSAGES.length));
  const [memberIdx, setMemberIdx] = useState(0);

  const { data: members } = useQuery({
    queryKey: ["zero-balance-members-spotlight"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, photo_url, member_id")
        .eq("is_active", true)
        .not("photo_url", "is", null);
      return (data ?? []) as any[];
    },
  });

  // Rotate funny message every 4s
  useEffect(() => {
    const t = setInterval(() => {
      setMsgIdx((i) => (i + 1 + Math.floor(Math.random() * (FUNNY_MESSAGES.length - 1))) % FUNNY_MESSAGES.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  // Rotate spotlight member every 3.5s
  useEffect(() => {
    if (!members || members.length === 0) return;
    const t = setInterval(() => {
      setMemberIdx(() => Math.floor(Math.random() * members.length));
    }, 3500);
    return () => clearInterval(t);
  }, [members]);

  const spotlight = members && members.length > 0 ? members[memberIdx] : null;

  return (
    <div className="space-y-6">
      {/* Random funny message banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-fuchsia-500/10 to-amber-500/10 p-5 md:p-6 text-center"
      >
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.4),transparent_70%)]" />
        <Sparkles className="relative mx-auto h-6 w-6 text-primary mb-2" />
        <AnimatePresence mode="wait">
          <motion.p
            key={msgIdx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="relative text-sm md:text-base font-semibold text-foreground"
          >
            {FUNNY_MESSAGES[msgIdx]}
          </motion.p>
        </AnimatePresence>
      </motion.div>

      {/* Random spotlight member */}
      {spotlight && (
        <div className="premium-card rounded-2xl overflow-hidden">
          <div className="p-4 md:p-5 border-b border-border/15 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-fuchsia-500/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-fuchsia-400" />
            </div>
            <h2 className="font-semibold text-foreground text-sm md:text-base">আজকের স্পটলাইট</h2>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={spotlight.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="p-6 flex flex-col items-center text-center gap-3"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary via-fuchsia-500 to-amber-400 blur-md opacity-60 animate-pulse" />
                <img
                  src={spotlight.photo_url}
                  alt={spotlight.full_name}
                  className="relative h-28 w-28 rounded-full object-cover border-4 border-background"
                />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{spotlight.full_name}</p>
                {spotlight.member_id && (
                  <p className="text-xs text-muted-foreground mt-0.5">আইডি: {spotlight.member_id}</p>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Members grid with photos */}
      {members && members.length > 0 && (
        <div className="premium-card rounded-2xl overflow-hidden">
          <div className="p-4 md:p-5 border-b border-border/15 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-cyan-400" />
            </div>
            <h2 className="font-semibold text-foreground text-sm md:text-base">সদস্য তালিকা</h2>
            <span className="ml-auto text-xs text-muted-foreground">{members.length} জন</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 p-4">
            {members.map((m: any) => (
              <motion.div
                key={m.id}
                whileHover={{ scale: 1.05 }}
                className="flex flex-col items-center text-center gap-1.5"
              >
                <img
                  src={m.photo_url}
                  alt={m.full_name}
                  className="h-16 w-16 md:h-20 md:w-20 rounded-full object-cover border-2 border-border/40"
                />
                <p className="text-[11px] md:text-xs font-medium text-foreground truncate max-w-full">
                  {m.full_name}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
