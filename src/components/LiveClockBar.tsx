import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Calendar, Moon, Sparkles } from "lucide-react";

const BN_WEEK_DAYS = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];

// Bangla calendar (Bangladesh - revised, since 2018)
const BANGLA_MONTHS = [
  "বৈশাখ", "জ্যৈষ্ঠ", "আষাঢ়", "শ্রাবণ", "ভাদ্র", "আশ্বিন",
  "কার্তিক", "অগ্রহায়ণ", "পৌষ", "মাঘ", "ফাল্গুন", "চৈত্র",
];

// Hijri Arabic months → Bangla translation (in order 1-12)
const HIJRI_BN_MONTHS = [
  "মুহাররম", "সফর", "রবিউল আউয়াল", "রবিউস সানি",
  "জমাদিউল আউয়াল", "জমাদিউস সানি", "রজব", "শাবান",
  "রমজান", "শাওয়াল", "জিলকদ", "জিলহজ্জ",
];

const toBnDigits = (s: string | number) =>
  String(s).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

// Convert Gregorian → Bangla calendar (Bangladesh revised)
function getBanglaDate(g: Date) {
  const gy = g.getFullYear();
  const gm = g.getMonth() + 1; // 1-12
  const gd = g.getDate();

  // Boishakh 1 = April 14 every year (revised BD calendar)
  // Bengali year = Gregorian - 593 if before Boishakh 1, else -593 (then +1 actually)
  // Actually: Bengali New Year starts April 14. BS year = Gregorian - 593 (Apr 14 onwards) else - 594.
  let bYear = gy - 593;
  if (gm < 4 || (gm === 4 && gd < 14)) bYear -= 1;

  // Month boundaries (1st of each Bangla month in Gregorian, BD revised)
  // Boishakh 1 = Apr 14, Joishtho 1 = May 15, Asharh 1 = Jun 15, Shrabon 1 = Jul 16,
  // Bhadra 1 = Aug 16, Ashwin 1 = Sep 16, Kartik 1 = Oct 17, Agrahayan 1 = Nov 16,
  // Poush 1 = Dec 16, Magh 1 = Jan 15, Falgun 1 = Feb 14, Choitro 1 = Mar 15
  const starts: Array<[number, number]> = [
    [4, 14], [5, 15], [6, 15], [7, 16], [8, 16], [9, 16],
    [10, 17], [11, 16], [12, 16], [1, 15], [2, 14], [3, 15],
  ];

  // Find which Bangla month we're in by walking backwards
  // Build a list of (month index, date object) for current cycle (Apr current year → Mar next year)
  const cycleYear = gm < 4 || (gm === 4 && gd < 14) ? gy - 1 : gy;
  const monthStartDates = starts.map(([m, d], i) => {
    const year = i < 9 ? cycleYear : cycleYear + 1; // Magh-Choitro fall in next Gregorian year
    return new Date(year, m - 1, d);
  });

  let bMonthIdx = 0;
  for (let i = 11; i >= 0; i--) {
    if (g >= monthStartDates[i]) { bMonthIdx = i; break; }
  }
  const dayOfMonth = Math.floor((g.getTime() - monthStartDates[bMonthIdx].getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return {
    day: dayOfMonth,
    month: BANGLA_MONTHS[bMonthIdx],
    year: bYear,
  };
}

// Convert Gregorian → Hijri (approximate algorithm, accurate ±1 day)
function getHijriDate(g: Date) {
  const day = g.getDate();
  const month = g.getMonth() + 1;
  const year = g.getFullYear();

  let jd: number;
  if (year > 1582 || (year === 1582 && month > 10) || (year === 1582 && month === 10 && day > 14)) {
    jd = Math.floor((1461 * (year + 4800 + Math.floor((month - 14) / 12))) / 4)
      + Math.floor((367 * (month - 2 - 12 * Math.floor((month - 14) / 12))) / 12)
      - Math.floor((3 * Math.floor((year + 4900 + Math.floor((month - 14) / 12)) / 100)) / 4)
      + day - 32075;
  } else {
    jd = 367 * year - Math.floor((7 * (year + 5001 + Math.floor((month - 9) / 7))) / 4)
      + Math.floor((275 * month) / 9) + day + 1729777;
  }

  const l1 = jd - 1948440 + 10632;
  const n = Math.floor((l1 - 1) / 10631);
  const l2 = l1 - 10631 * n + 354;
  const j = (Math.floor((10985 - l2) / 5316)) * (Math.floor((50 * l2) / 17719))
    + (Math.floor(l2 / 5670)) * (Math.floor((43 * l2) / 15238));
  const l3 = l2 - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50))
    - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
  const hMonth = Math.floor((24 * l3) / 709);
  const hDay = l3 - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;

  return {
    day: hDay,
    month: HIJRI_BN_MONTHS[Math.min(11, Math.max(0, hMonth - 1))],
    year: hYear,
  };
}

export function LiveClockBar() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Time HH:MM:SS AM/PM
  const hours24 = now.getHours();
  const ampm = hours24 < 12 ? "AM" : "PM";
  const h12 = hours24 % 12 || 12;
  const hh = String(h12).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  // Bangla calendar
  const bangla = getBanglaDate(now);
  const bnWeekDay = BN_WEEK_DAYS[now.getDay()];
  const banglaDateStr = `${toBnDigits(bangla.day)} ${bangla.month}, ${toBnDigits(bangla.year)} বঙ্গাব্দ`;

  // English date
  const enDate = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Hijri date in Bangla
  const hijri = getHijriDate(now);
  const hijriDateStr = `${toBnDigits(hijri.day)} ${hijri.month}, ${toBnDigits(hijri.year)} হিজরি`;

  const isFriday = now.getDay() === 5;

  // Rotate between date displays
  const [rotateIdx, setRotateIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setRotateIdx((i) => (i + 1) % 3), 4000);
    return () => clearInterval(id);
  }, []);

  const dateViews = [
    { icon: Calendar, label: banglaDateStr, sub: bnWeekDay, color: "text-violet-300", bg: "from-violet-500/15 to-fuchsia-500/10", border: "border-violet-500/25" },
    { icon: Calendar, label: enDate.split(",").slice(1).join(",").trim(), sub: enDate.split(",")[0], color: "text-cyan-300", bg: "from-cyan-500/15 to-blue-500/10", border: "border-cyan-500/25" },
    { icon: Moon, label: hijriDateStr, sub: "চান্দ্র মাস", color: "text-amber-300", bg: "from-amber-500/15 to-orange-500/10", border: "border-amber-500/25" },
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
        {/* Live time HH:MM:SS AM/PM */}
        <div className="flex items-center gap-2 shrink-0">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            className="h-7 w-7 md:h-8 md:w-8 rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 border border-white/15 flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
          >
            <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-indigo-200" />
          </motion.div>
          <div className="font-mono font-bold text-sm md:text-base bg-gradient-to-r from-indigo-200 via-violet-200 to-fuchsia-200 bg-clip-text text-transparent tabular-nums tracking-wider drop-shadow flex items-baseline gap-0.5">
            <span>{toBnDigits(hh)}</span>
            <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}>:</motion.span>
            <span>{toBnDigits(mm)}</span>
            <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} className="text-[10px] md:text-xs">:</motion.span>
            <span className="text-[10px] md:text-xs opacity-80">{toBnDigits(ss)}</span>
          </div>
          <span className="text-[9px] md:text-[10px] font-bold text-violet-200 px-1.5 py-0.5 rounded-md bg-gradient-to-br from-violet-500/25 to-fuchsia-500/20 border border-violet-500/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]">
            {ampm}
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
                <span className={`text-[10px] md:text-xs font-semibold ${current.color} truncate`}>
                  {current.label}
                </span>
                <span className="text-[9px] md:text-[10px] text-muted-foreground/70 hidden md:inline truncate">
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
