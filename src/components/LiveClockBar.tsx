import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Calendar, Moon, Sparkles } from "lucide-react";

const BN_DAYS = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
const BN_MONTHS = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];

const toBnDigits = (s: string | number) =>
  String(s).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

export function LiveClockBar() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Time HH:MM:SS AM/PM in Bengali
  const hours24 = now.getHours();
  const ampm = hours24 < 12 ? "AM" : "PM";
  const ampmBn = hours24 < 12 ? "পূর্বাহ্ণ" : "অপরাহ্ণ";
  const h12 = hours24 % 12 || 12;
  const hh = String(h12).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  // Bengali date
  const bnDay = BN_DAYS[now.getDay()];
  const bnDate = `${toBnDigits(now.getDate())} ${BN_MONTHS[now.getMonth()]}, ${toBnDigits(now.getFullYear())}`;

  // English date
  const enDate = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Arabic Hijri date via Intl
  let arabicDate = "";
  try {
    arabicDate = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
      weekday: "long",
    }).format(now);
  } catch {
    arabicDate = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now);
  }

  const isFriday = now.getDay() === 5;

  // Rotate between date displays for marquee effect
  const [rotateIdx, setRotateIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setRotateIdx((i) => (i + 1) % 3), 4000);
    return () => clearInterval(id);
  }, []);

  const dateViews = [
    { icon: Calendar, label: bnDate, sub: bnDay, color: "text-violet-300", bg: "from-violet-500/15 to-fuchsia-500/10", border: "border-violet-500/25" },
    { icon: Calendar, label: enDate.split(",").slice(1).join(",").trim(), sub: enDate.split(",")[0], color: "text-cyan-300", bg: "from-cyan-500/15 to-blue-500/10", border: "border-cyan-500/25" },
    { icon: Moon, label: arabicDate, sub: "هجري", color: "text-amber-300", bg: "from-amber-500/15 to-orange-500/10", border: "border-amber-500/25" },
  ];

  const current = dateViews[rotateIdx];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative border-b border-border/30 bg-gradient-to-r from-indigo-500/10 via-card/70 to-violet-500/10 backdrop-blur-xl overflow-hidden"
    >
      {/* Glossy top sheen */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/8 to-transparent pointer-events-none" />
      {/* Animated diagonal shine */}
      <motion.div
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        className="absolute -inset-y-2 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none"
      />
      {/* Corner glows */}
      <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-violet-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between gap-2 px-3 md:px-4 py-2 md:py-2.5">
        {/* Live time */}
        <div className="flex items-center gap-2 shrink-0">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            className="h-7 w-7 md:h-8 md:w-8 rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 border border-white/15 flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
          >
            <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-indigo-200" />
          </motion.div>
          <div className="font-mono font-bold text-sm md:text-base bg-gradient-to-r from-indigo-200 via-violet-200 to-fuchsia-200 bg-clip-text text-transparent tabular-nums tracking-wider drop-shadow">
            {toBnDigits(hh)}<motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}>:</motion.span>{toBnDigits(mm)}<span className="text-[10px] md:text-xs opacity-70">:{toBnDigits(ss)}</span>
          </div>
          <span className="text-[9px] md:text-[10px] font-bold text-violet-300/80 px-1.5 py-0.5 rounded-md bg-violet-500/15 border border-violet-500/25 hidden sm:inline">
            {ampmBn}
          </span>
        </div>

        {/* Rotating date display */}
        <div className="flex-1 flex justify-center min-w-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={rotateIdx}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1 rounded-full
                bg-gradient-to-br ${current.bg} border ${current.border}
                shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] max-w-full`}
            >
              <current.icon className={`h-3 w-3 md:h-3.5 md:w-3.5 ${current.color} shrink-0`} />
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`text-[10px] md:text-xs font-semibold ${current.color} truncate`} dir="auto">
                  {current.label}
                </span>
                <span className="text-[9px] md:text-[10px] text-muted-foreground/70 hidden md:inline truncate" dir="auto">
                  • {current.sub}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Indicator dots */}
        <div className="flex items-center gap-1 shrink-0">
          {dateViews.map((_, i) => (
            <motion.span
              key={i}
              animate={{
                scale: rotateIdx === i ? 1.2 : 1,
                opacity: rotateIdx === i ? 1 : 0.4,
              }}
              className={`h-1 w-1 rounded-full ${rotateIdx === i ? "bg-violet-300" : "bg-muted-foreground"}`}
            />
          ))}
        </div>
      </div>

      {/* Friday Jumu'ah message */}
      <AnimatePresence>
        {isFriday && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="relative border-t border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/15 to-emerald-500/10 overflow-hidden"
          >
            {/* Shimmer */}
            <motion.div
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-y-2 w-1/3 bg-gradient-to-r from-transparent via-emerald-300/20 to-transparent skew-x-12 pointer-events-none"
            />
            <div className="relative z-10 flex items-center justify-center gap-2 px-3 py-1.5 overflow-hidden">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5 text-emerald-300" />
              </motion.div>
              <motion.span
                animate={{ opacity: [0.85, 1, 0.85] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-[10px] md:text-xs font-bold bg-gradient-to-r from-emerald-200 via-teal-200 to-emerald-200 bg-clip-text text-transparent text-center"
              >
                🕌 আজ পবিত্র জুমার দিন — সময়মতো জুমার নামাজ আদায় করুন 🤲
              </motion.span>
              <motion.div
                animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5 text-emerald-300" />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
