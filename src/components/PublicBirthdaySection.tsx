import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cake, ChevronLeft, ChevronRight, Heart, Send, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BirthdayWishCard } from "./BirthdayWishCard";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

interface BirthdayMember {
  id: string;
  full_name: string;
  photo_url: string | null;
  date_of_birth: string;
}

const wishSchema = z.object({
  wisher_name: z.string().trim().min(1, "নাম লিখুন").max(60, "নাম ৬০ অক্ষরের কম"),
  message: z.string().trim().min(1, "বার্তা লিখুন").max(500, "বার্তা ৫০০ অক্ষরের কম"),
});

function bnNum(n: number | string): string {
  const map: Record<string, string> = { "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪", "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯" };
  return String(n).split("").map((c) => map[c] ?? c).join("");
}

function isToday(dob: string): boolean {
  const today = new Date();
  const [, m, d] = dob.split("-").map(Number);
  return today.getMonth() + 1 === m && today.getDate() === d;
}

function todayISO(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "এইমাত্র";
  if (min < 60) return `${bnNum(min)} মিনিট আগে`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${bnNum(h)} ঘণ্টা আগে`;
  const d = Math.floor(h / 24);
  return `${bnNum(d)} দিন আগে`;
}

export function PublicBirthdaySection() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [idx, setIdx] = useState(0);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: members } = useQuery({
    queryKey: ["public-birthday-today"],
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("get_public_profiles");
      const all = (data as any[] ?? []).filter((m) => m.is_active && m.date_of_birth);
      return all
        .filter((m) => isToday(m.date_of_birth))
        .map((m) => ({
          id: m.id,
          full_name: m.full_name,
          photo_url: m.photo_url,
          date_of_birth: m.date_of_birth,
        })) as BirthdayMember[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const todayMembers = members ?? [];
  const current = todayMembers.length > 0 ? todayMembers[idx % todayMembers.length] : null;

  // Restore wisher name from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("birthday_wisher_name");
    if (stored) setName(stored);
  }, []);

  const { data: wishes } = useQuery({
    queryKey: ["birthday-wishes", current?.id, todayISO()],
    enabled: !!current?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("birthday_wishes" as any)
        .select("*")
        .eq("member_id", current!.id)
        .eq("birthday_date", todayISO())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!current) throw new Error("No member");
      const parsed = wishSchema.safeParse({ wisher_name: name, message });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "ভুল তথ্য");
      }
      const { error } = await supabase.from("birthday_wishes" as any).insert({
        member_id: current.id,
        wisher_name: parsed.data.wisher_name,
        message: parsed.data.message,
        birthday_date: todayISO(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      localStorage.setItem("birthday_wisher_name", name.trim());
      setMessage("");
      toast.success("শুভেচ্ছা পাঠানো হয়েছে! 🎉");
      qc.invalidateQueries({ queryKey: ["birthday-wishes", current?.id, todayISO()] });
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "পাঠাতে ব্যর্থ");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("birthday_wishes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("মুছে ফেলা হয়েছে");
      qc.invalidateQueries({ queryKey: ["birthday-wishes", current?.id, todayISO()] });
    },
    onError: () => toast.error("মুছতে ব্যর্থ"),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await submitMutation.mutateAsync().catch(() => {});
    setSubmitting(false);
  };

  if (todayMembers.length === 0 || !current) return null;

  return (
    <section className="relative py-8 md:py-12 px-4">
      {/* Celebratory background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-[160px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[160px]" />
        {/* Floating confetti */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: -50, opacity: 0 }}
            animate={{
              y: ["0%", "120vh"],
              opacity: [0, 1, 1, 0],
              rotate: [0, 360],
            }}
            transition={{
              duration: 8 + (i % 5),
              repeat: Infinity,
              delay: i * 0.4,
              ease: "linear",
            }}
            className="absolute text-2xl"
            style={{ left: `${(i * 53) % 100}%` }}
          >
            {["🎉", "🎂", "🎈", "✨", "🎁"][i % 5]}
          </motion.div>
        ))}
      </div>

      <div className="relative max-w-4xl mx-auto">
        {/* Section title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-400/40 mb-3">
            <Sparkles className="h-3.5 w-3.5 text-pink-400" />
            <span className="text-xs font-bold tracking-widest uppercase text-pink-300">
              আজকের জন্মদিন
            </span>
            <Sparkles className="h-3.5 w-3.5 text-pink-400" />
          </div>
          <h2 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent" style={{ fontFamily: "'Tiro Bangla', serif" }}>
            🎂 শুভ জন্মদিন 🎉
          </h2>
          <p className="text-muted-foreground text-sm mt-2">
            শুভেচ্ছা জানান, ছবি ডাউনলোড করে শেয়ার করুন
          </p>
        </motion.div>

        {/* Carousel controls if multiple */}
        {todayMembers.length > 1 && (
          <div className="flex items-center justify-between mb-4 max-w-md mx-auto">
            <button
              onClick={() => setIdx((i) => (i - 1 + todayMembers.length) % todayMembers.length)}
              className="h-9 w-9 rounded-full bg-card/80 backdrop-blur border border-border hover:bg-muted flex items-center justify-center"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-bold text-pink-400 flex items-center gap-1.5">
              <Cake className="h-4 w-4" />
              আজ {bnNum(todayMembers.length)} জনের জন্মদিন · {bnNum(idx + 1)}/{bnNum(todayMembers.length)}
            </span>
            <button
              onClick={() => setIdx((i) => (i + 1) % todayMembers.length)}
              className="h-9 w-9 rounded-full bg-card/80 backdrop-blur border border-border hover:bg-muted flex items-center justify-center"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.5 }}
            className="grid md:grid-cols-2 gap-6 items-start"
          >
            {/* Card with surrounding animations */}
            <div className="relative">
              {/* Pulsing color glow ring */}
              <motion.div
                aria-hidden
                animate={{
                  opacity: [0.4, 0.8, 0.4],
                  scale: [1, 1.05, 1],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -inset-6 rounded-3xl pointer-events-none"
                style={{
                  background:
                    "conic-gradient(from 0deg, #ec4899, #a855f7, #6366f1, #06b6d4, #fde047, #ec4899)",
                  filter: "blur(40px)",
                }}
              />

              {/* Rotating color halo */}
              <motion.div
                aria-hidden
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -inset-3 rounded-3xl pointer-events-none opacity-60"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent, #fde047, transparent, #ec4899, transparent, #a855f7, transparent)",
                  filter: "blur(20px)",
                }}
              />

              {/* Floating balloons around the card */}
              {[
                { emoji: "🎈", color: "#ec4899", left: "-8%", top: "5%", delay: 0 },
                { emoji: "🎈", color: "#a855f7", left: "92%", top: "10%", delay: 0.5 },
                { emoji: "🎈", color: "#06b6d4", left: "-10%", top: "55%", delay: 1 },
                { emoji: "🎈", color: "#fde047", left: "94%", top: "60%", delay: 1.5 },
                { emoji: "🎁", color: "#fff", left: "-6%", top: "85%", delay: 0.8 },
                { emoji: "🎁", color: "#fff", left: "90%", top: "88%", delay: 0.3 },
              ].map((b, i) => (
                <motion.div
                  key={i}
                  aria-hidden
                  animate={{
                    y: [0, -14, 0],
                    rotate: [-6, 6, -6],
                  }}
                  transition={{
                    duration: 3 + (i % 3),
                    repeat: Infinity,
                    delay: b.delay,
                    ease: "easeInOut",
                  }}
                  className="absolute text-3xl pointer-events-none z-10"
                  style={{
                    left: b.left,
                    top: b.top,
                    filter: `drop-shadow(0 0 12px ${b.color})`,
                  }}
                >
                  {b.emoji}
                </motion.div>
              ))}

              {/* Twinkling light bulbs around the perimeter */}
              {[...Array(16)].map((_, i) => {
                const colors = ["#fde047", "#ec4899", "#a855f7", "#06b6d4", "#fff"];
                const color = colors[i % colors.length];
                const positions = [
                  // Top edge
                  { left: `${(i / 8) * 100}%`, top: "-2%" },
                ];
                // Distribute around perimeter
                const t = i / 16;
                let left = "0%", top = "0%";
                if (t < 0.25) { left = `${t * 4 * 100}%`; top = "-2%"; }
                else if (t < 0.5) { left = "100%"; top = `${(t - 0.25) * 4 * 100}%`; }
                else if (t < 0.75) { left = `${(1 - (t - 0.5) * 4) * 100}%`; top = "100%"; }
                else { left = "0%"; top = `${(1 - (t - 0.75) * 4) * 100}%`; }

                return (
                  <motion.div
                    key={`light-${i}`}
                    aria-hidden
                    animate={{
                      opacity: [0.3, 1, 0.3],
                      scale: [0.8, 1.3, 0.8],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: "easeInOut",
                    }}
                    className="absolute h-2.5 w-2.5 rounded-full pointer-events-none z-10"
                    style={{
                      left,
                      top,
                      background: color,
                      boxShadow: `0 0 12px ${color}, 0 0 24px ${color}`,
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                );
              })}

              {/* Sparkles */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={`spark-${i}`}
                  aria-hidden
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    rotate: [0, 180],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.4,
                    ease: "easeInOut",
                  }}
                  className="absolute pointer-events-none z-10"
                  style={{
                    left: `${(i * 67) % 100}%`,
                    top: `${(i * 41) % 100}%`,
                  }}
                >
                  <Sparkles className="h-4 w-4 text-yellow-300" style={{ filter: "drop-shadow(0 0 6px #fde047)" }} />
                </motion.div>
              ))}

              <div className="relative z-20">
                <BirthdayWishCard
                  member={{
                    id: current.id,
                    full_name: current.full_name,
                    photo_url: current.photo_url,
                  }}
                />
              </div>
            </div>

            {/* Wishes panel */}
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl p-5 shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="h-5 w-5 text-pink-400 fill-pink-400/30" />
                <h3 className="font-bold text-lg">
                  শুভেচ্ছা বার্তা ({bnNum(wishes?.length ?? 0)})
                </h3>
              </div>

              {/* Wish form */}
              <form onSubmit={handleSubmit} className="space-y-2 mb-5 pb-5 border-b border-border/40">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="আপনার নাম"
                  maxLength={60}
                  required
                  className="w-full h-9 px-3 rounded-lg bg-background/60 border border-border focus:border-pink-400 focus:outline-none text-sm"
                />
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`${current.full_name} কে শুভেচ্ছা জানান...`}
                  rows={3}
                  maxLength={500}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-background/60 border border-border focus:border-pink-400 focus:outline-none text-sm resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {bnNum(message.length)}/{bnNum(500)}
                  </span>
                  <button
                    type="submit"
                    disabled={submitting || !name.trim() || !message.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white text-sm font-bold transition-opacity disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {submitting ? "পাঠানো হচ্ছে..." : "পাঠান"}
                  </button>
                </div>
              </form>

              {/* Wish list */}
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {!wishes || wishes.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <Heart className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    এখনো কেউ শুভেচ্ছা জানায়নি।<br />
                    প্রথম শুভেচ্ছাটি আপনিই দিন!
                  </div>
                ) : (
                  wishes.map((w) => (
                    <motion.div
                      key={w.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group relative bg-background/40 border border-border/40 rounded-xl p-3 hover:border-pink-400/40 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                          {(w.wisher_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-sm text-foreground truncate">
                              {w.wisher_name}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {timeAgo(w.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/85 mt-1 whitespace-pre-wrap break-words leading-relaxed">
                            {w.message}
                          </p>
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => deleteMutation.mutate(w.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-md hover:bg-destructive/20 text-destructive flex items-center justify-center shrink-0"
                            title="মুছুন"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
