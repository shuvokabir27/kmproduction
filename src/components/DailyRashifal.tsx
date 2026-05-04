import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Sun, Moon, Star, RefreshCw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type HoroscopeMember = {
  id?: string;
  user_id?: string;
  full_name: string;
  designation?: string | null;
  photo_url?: string | null;
};

type Pool = { generic: string[]; byRole: Record<string, string[]> };

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const POOL: Pool = {
  generic: [
    "আজ অপ্রত্যাশিত একটা ফোন আসবে — কিন্তু রিসিভ করার আগে চা শেষ করো ☕",
    "আজ মানিব্যাগ খুললে অবাক হবে — হয় খুশি, নাহয় কান্না 😂",
    "আজ কারো একটা পুরনো ছবি দেখে নস্টালজিয়া আসবে 📸",
    "আজ ‘৫ মিনিটে আসছি’ বললে মিনিমাম ১ ঘন্টা লাগবে ⏱️",
    "আজ একজন তোমাকে খুঁজবে, কিন্তু তুমি ফোন সাইলেন্টে রেখে দিবা 🤫",
    "আজ যেটা ভাবছ সেটা হবে না, যেটা ভাবোনি সেটাই হবে 🌀",
    "আজ ঘুম কম হবে, কিন্তু এনার্জি ফুল থাকবে ⚡",
    "আজ একটা পুরনো বন্ধু মনে পড়বে — মেসেজ দিয়ে দাও 💬",
    "আজ যা খাবা সেটা মনে রাখবে পেট, ভুলবে না 😅",
    "আজ একটা ছোট্ট ভুল বড় হাসির কারণ হবে 🎭",
  ],
  byRole: {
    cameraman: [
      "আজ ক্যামেরার ব্যাটারি বিশ্বাসঘাতকতা করবে — ব্যাকআপ রেডি রাখো 🔋",
      "আজ একটা শট ‘পারফেক্ট’ হবে, কিন্তু রেকর্ড বাটন চাপা হয়নি 🎥😭",
      "আজ ফোকাস ঠিক রাখো — ক্যামেরায় আর জীবনে দুটোতেই 📷✨",
      "আজ পরিচালকের সাথে ছোট্ট ঝগড়া হবে, কিন্তু চায়ে মিটবে ☕",
    ],
    director: [
      "আজ ‘অ্যাকশন’ বলার আগে একবার ভেবে নিও — সবাই রেডি না 🎬",
      "আজ কেউ স্ক্রিপ্ট মুখস্থ না করে আসবে — শ্বাস নাও 😤",
      "আজ একটা সিন একবারেই ওকে হবে — মিরাকল 🌟",
      "আজ লাইট ম্যান হঠাৎ হারিয়ে যাবে 💡🚶",
    ],
    actor: [
      "আজ ডায়লগ ভুলে যাবে, কিন্তু এক্সপ্রেশনে পার পেয়ে যাবে 😎",
      "আজ মেকআপ নষ্ট হবে — গরমকে দোষ দিও 🥵",
      "আজ একজন তোমার অভিনয়ের ভক্ত হয়ে যাবে 💖",
      "আজ ‘ওয়ান মোর টেক’ মিনিমাম ১০ বার শুনবা 🔁",
    ],
    actress: [
      "আজ শাড়ি/ড্রেসে কেউ একটা সুন্দর কথা বলবে 🌸",
      "আজ ক্যামেরা তোমাকে বেশি ভালোবাসবে 📸💕",
      "আজ একটা সিন এমন হবে যেটা মনে রাখবে দর্শক ⭐",
      "আজ মেকআপ আর্টিস্টের সাথে গসিপ জমবে 💄",
    ],
    writer: [
      "আজ একটা দারুণ আইডিয়া আসবে — সাথে সাথে লিখে রাখো ✍️",
      "আজ পুরনো একটা স্ক্রিপ্ট খুললে হাসি পাবে 📜😂",
      "আজ ‘শেষ সিন’ লিখতে গিয়ে নতুন গল্প মাথায় আসবে 💡",
      "আজ চরিত্রের মুখে এমন কথা বসাবে যা নিজেই বলতে চাও 🎭",
    ],
    editor: [
      "আজ টাইমলাইন ক্র্যাশ করবে — সেভ করতে ভুলো না 💾",
      "আজ একটা কাট এতই smooth হবে নিজেই হাসবে 😂",
      "আজ রেন্ডার শেষ হতে হতে দু’কাপ চা শেষ ☕☕",
      "আজ ক্লায়েন্ট ‘আরেকটু চেঞ্জ’ বলবে — শ্বাস নাও 😮‍💨",
    ],
    production: [
      "আজ বাজেট নিয়ে মাথা গরম হবে — ঠাণ্ডা পানি খাও 💧",
      "আজ একজন ‘শেষ মুহূর্তে’ ক্যান্সেল করবে 📞❌",
      "আজ সব ম্যানেজ করবে তুমিই — হিরো তুমি 🦸",
      "আজ একটা ছোট্ট পরিকল্পনা বড় সাফল্য আনবে 🏆",
    ],
    music: [
      "আজ একটা সুর মাথায় ঘুরবে — গুনগুন করতেই থাকবা 🎵",
      "আজ পুরনো কোনো গান নতুন করে ভালো লাগবে 🎶",
      "আজ একটা beat এমন বানাবে — সবাই মাথা নাড়াবে 🎧",
    ],
  },
};

const LUCKY_COLORS = ["আকাশী 💙", "সবুজ 💚", "হলুদ 💛", "লাল ❤️", "বেগুনি 💜", "কমলা 🧡", "গোলাপি 💗"];
const LUCKY_NUMBERS = ["৩", "৭", "৯", "১১", "১৩", "২১", "৫"];
const MOODS = [
  { label: "চাঙ্গা", icon: Sun },
  { label: "শান্ত", icon: Moon },
  { label: "জাদুকরী", icon: Sparkles },
  { label: "ভাগ্যবান", icon: Star },
];

function pickRole(designation?: string | null): string[] {
  const d = (designation || "").toLowerCase();
  if (/(camera|ক্যামেরা|dop|cinematograph)/i.test(d)) return POOL.byRole.cameraman;
  if (/(direct|পরিচালক|director)/i.test(d)) return POOL.byRole.director;
  if (/(actress|নায়িকা|অভিনেত্রী)/i.test(d)) return POOL.byRole.actress;
  if (/(actor|নায়ক|অভিনেতা|hero)/i.test(d)) return POOL.byRole.actor;
  if (/(writer|লেখক|script|স্ক্রিপ্ট|রাইটার)/i.test(d)) return POOL.byRole.writer;
  if (/(edit|এডিটর|সম্পাদক)/i.test(d)) return POOL.byRole.editor;
  if (/(product|প্রোডাকশন|manager|ম্যানেজার)/i.test(d)) return POOL.byRole.production;
  if (/(music|সঙ্গীত|গান|sound)/i.test(d)) return POOL.byRole.music;
  return [];
}

function createHoroscope(member: HoroscopeMember, dateKey: string, salt = 0) {
  const id = member.id || member.user_id || member.full_name || "guest";
  const seed = hashStr(`${id}|${dateKey}|${salt}`);
  const rng = mulberry32(seed);
  const rolePool = pickRole(member.designation);
  const useRole = rolePool.length > 0 && rng() < 0.6;
  const pool = useRole ? rolePool : POOL.generic;
  const prediction = pool[Math.floor(rng() * pool.length)];
  const color = LUCKY_COLORS[Math.floor(rng() * LUCKY_COLORS.length)];
  const number = LUCKY_NUMBERS[Math.floor(rng() * LUCKY_NUMBERS.length)];
  const mood = MOODS[Math.floor(rng() * MOODS.length)];
  const score = 60 + Math.floor(rng() * 40);
  return { prediction, color, number, mood, score };
}

function HoroscopeCard({
  member,
  dateKey,
  shuffleSalt,
  title,
  subtitle,
  autoTag,
}: {
  member: HoroscopeMember;
  dateKey: string;
  shuffleSalt: number;
  title: string;
  subtitle: string;
  autoTag?: string;
}) {
  const data = useMemo(() => createHoroscope(member, dateKey, shuffleSalt), [member, dateKey, shuffleSalt]);
  const MoodIcon = data.mood.icon;

  const handleShare = async () => {
    const text = `🔮 আজকের রাশিফল (${member.full_name || ""}):\n\n${data.prediction}\n\n🎨 ভাগ্যের রঙ: ${data.color}\n🔢 ভাগ্যের সংখ্যা: ${data.number}\n✨ মুড: ${data.mood.label}\n📊 দিনের স্কোর: ${data.score}/১০০`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("রাশিফল কপি হয়েছে!");
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 backdrop-blur-sm p-4 md:p-5"
    >
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute top-3 right-6 text-primary/80">✨</div>
        <div className="absolute bottom-4 left-8 text-primary/70">⭐</div>
        <div className="absolute top-10 left-1/3 text-primary/60">💫</div>
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-full bg-primary/35 blur-md opacity-90" />
              <div className="relative h-16 w-16 md:h-20 md:w-20 rounded-full overflow-hidden border-2 border-background shadow-xl ring-2 ring-primary/40">
                {member.photo_url ? (
                  <img src={member.photo_url} alt={member.full_name || ""} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-primary text-primary-foreground text-xl md:text-2xl font-bold">
                    {member.full_name?.charAt(0) || "U"}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow-lg border-2 border-background">
                <Sparkles className="h-3 w-3 text-primary-foreground" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm md:text-base font-bold text-foreground leading-tight">{title}</h3>
                {autoTag ? <span className="text-[10px] px-2 py-0.5 rounded-full border border-border/50 bg-background/30 text-muted-foreground">{autoTag}</span> : null}
              </div>
              <p className="text-xs md:text-sm font-semibold text-foreground/90 truncate">{member.full_name || "তুমি"}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground truncate">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleShare} title="শেয়ার">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${member.id || member.user_id || member.full_name}-${shuffleSalt}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="rounded-xl bg-background/40 border border-border/40 p-3 md:p-4 mb-3"
          >
            <p className="text-sm md:text-base text-foreground leading-relaxed font-medium">{data.prediction}</p>
          </motion.div>
        </AnimatePresence>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="rounded-lg bg-background/40 border border-border/30 px-2.5 py-2">
            <p className="text-[10px] text-muted-foreground">ভাগ্যের রঙ</p>
            <p className="text-xs md:text-sm font-semibold text-foreground truncate">{data.color}</p>
          </div>
          <div className="rounded-lg bg-background/40 border border-border/30 px-2.5 py-2">
            <p className="text-[10px] text-muted-foreground">ভাগ্যের সংখ্যা</p>
            <p className="text-xs md:text-sm font-semibold text-foreground">{data.number}</p>
          </div>
          <div className="rounded-lg bg-background/40 border border-border/30 px-2.5 py-2">
            <p className="text-[10px] text-muted-foreground">মুড</p>
            <p className="text-xs md:text-sm font-semibold text-foreground flex items-center gap-1">
              <MoodIcon className="h-3.5 w-3.5 text-primary" />
              {data.mood.label}
            </p>
          </div>
          <div className="rounded-lg bg-background/40 border border-border/30 px-2.5 py-2">
            <p className="text-[10px] text-muted-foreground">দিনের স্কোর</p>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1.5 rounded-full bg-border/50 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${data.score}%` }} />
              </div>
              <span className="text-[10px] font-bold text-foreground">{data.score}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function DailyRashifal({
  mode = "self",
  className = "",
}: {
  mode?: "self" | "all" | "public";
  className?: string;
}) {
  const { profile } = useAuth();
  const [shuffleSalt, setShuffleSalt] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const today = new Date();
  const dateKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

  const { data: publicMembers = [] } = useQuery({
    queryKey: ["public-rashifal-members", mode],
    enabled: mode !== "self",
    queryFn: async () => {
      const { data } = await supabase.rpc("get_public_profiles");
      return ((data as any[]) ?? []).map((member) => ({
        id: member.id,
        user_id: member.user_id,
        full_name: member.full_name,
        designation: member.designation,
        photo_url: member.photo_url,
      })) as HoroscopeMember[];
    },
  });

  const selfMember = useMemo(() => {
    if (!profile?.full_name) return null;
    return {
      id: profile.id,
      user_id: profile.user_id,
      full_name: profile.full_name,
      designation: profile.designation,
      photo_url: profile.photo_url,
    } as HoroscopeMember;
  }, [profile]);

  const members = useMemo(() => {
    if (mode === "self") return selfMember ? [selfMember] : [];
    return publicMembers;
  }, [mode, publicMembers, selfMember]);

  useEffect(() => {
    if (mode === "self" || members.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % members.length);
      setShuffleSalt((prev) => prev + 1);
    }, 20000);
    return () => window.clearInterval(timer);
  }, [mode, members.length]);

  useEffect(() => {
    setActiveIndex(0);
  }, [members.length, mode]);

  const activeMember = members[activeIndex] ?? null;

  if (!activeMember) return null;

  const title = mode === "self" ? "তোমার আজকের রাশিফল 🔮" : "আজকের রাশিফল 🔮";
  const subtitle = mode === "self" ? "শুধুই মজার জন্য 😄" : "সকল মেম্বারের রাশিফল এক এক করে আসবে ✨";

  return (
    <div className={className}>
      <HoroscopeCard
        member={activeMember}
        dateKey={dateKey}
        shuffleSalt={shuffleSalt}
        title={title}
        subtitle={subtitle}
        autoTag={mode === "self" ? undefined : "Auto • 20s"}
      />

      {mode !== "self" && members.length > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {members.slice(0, Math.min(members.length, 8)).map((member, idx) => (
            <button
              key={member.id || member.user_id || `${member.full_name}-${idx}`}
              type="button"
              onClick={() => {
                setActiveIndex(idx);
                setShuffleSalt((prev) => prev + 1);
              }}
              className={`h-2 rounded-full transition-all ${idx === activeIndex ? "w-6 bg-primary" : "w-2 bg-border hover:bg-primary/50"}`}
              title={member.full_name}
              aria-label={member.full_name}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
