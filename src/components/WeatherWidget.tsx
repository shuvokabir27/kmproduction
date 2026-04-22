import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog,
  CloudDrizzle, Cloudy, Wind, Droplets, MapPin,
} from "lucide-react";

const toBnDigits = (s: string | number) =>
  String(s).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

// WMO weather code → icon, label (Bangla), gradient
function describe(code: number, isDay: boolean) {
  // https://open-meteo.com/en/docs (WMO codes)
  if (code === 0) return {
    Icon: Sun, label: isDay ? "পরিষ্কার" : "পরিষ্কার রাত",
    grad: "from-amber-400 via-orange-400 to-rose-400",
    glow: "shadow-amber-500/40", color: "text-amber-300",
  };
  if (code === 1 || code === 2) return {
    Icon: Cloud, label: "আংশিক মেঘলা",
    grad: "from-sky-400 via-cyan-400 to-blue-400",
    glow: "shadow-sky-500/40", color: "text-sky-300",
  };
  if (code === 3) return {
    Icon: Cloudy, label: "মেঘলা",
    grad: "from-slate-400 via-slate-300 to-slate-400",
    glow: "shadow-slate-500/40", color: "text-slate-200",
  };
  if (code === 45 || code === 48) return {
    Icon: CloudFog, label: "কুয়াশা",
    grad: "from-zinc-400 via-slate-300 to-zinc-400",
    glow: "shadow-zinc-500/40", color: "text-zinc-200",
  };
  if (code >= 51 && code <= 57) return {
    Icon: CloudDrizzle, label: "গুঁড়ি বৃষ্টি",
    grad: "from-cyan-400 via-teal-400 to-blue-400",
    glow: "shadow-cyan-500/40", color: "text-cyan-200",
  };
  if (code >= 61 && code <= 67) return {
    Icon: CloudRain, label: "বৃষ্টি",
    grad: "from-blue-500 via-indigo-500 to-cyan-500",
    glow: "shadow-blue-500/40", color: "text-blue-200",
  };
  if (code >= 71 && code <= 77) return {
    Icon: CloudSnow, label: "তুষারপাত",
    grad: "from-cyan-200 via-sky-200 to-blue-200",
    glow: "shadow-sky-300/40", color: "text-cyan-100",
  };
  if (code >= 80 && code <= 82) return {
    Icon: CloudRain, label: "ঝড়ো বৃষ্টি",
    grad: "from-indigo-500 via-blue-500 to-violet-500",
    glow: "shadow-indigo-500/40", color: "text-indigo-200",
  };
  if (code >= 95 && code <= 99) return {
    Icon: CloudLightning, label: "বজ্রঝড়",
    grad: "from-fuchsia-500 via-purple-500 to-amber-400",
    glow: "shadow-fuchsia-500/40", color: "text-fuchsia-200",
  };
  return {
    Icon: Cloud, label: "—",
    grad: "from-sky-400 to-blue-400",
    glow: "shadow-sky-500/30", color: "text-sky-200",
  };
}

interface WeatherData {
  temp: number;
  feels: number;
  humidity: number;
  wind: number;
  code: number;
  isDay: boolean;
  city: string;
}

export function WeatherWidget() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchWeather(lat: number, lon: number, city: string) {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&timezone=auto`;
        const res = await fetch(url);
        const json = await res.json();
        if (cancelled) return;
        const c = json.current;
        setData({
          temp: Math.round(c.temperature_2m),
          feels: Math.round(c.apparent_temperature),
          humidity: Math.round(c.relative_humidity_2m),
          wind: Math.round(c.wind_speed_10m),
          code: c.weather_code,
          isDay: c.is_day === 1,
          city,
        });
      } catch (e) {
        console.error("weather fetch failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function reverseCity(lat: number, lon: number): Promise<string> {
      try {
        const r = await fetch(
          `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=bn&count=1`
        );
        const j = await r.json();
        return j?.results?.[0]?.name || "আপনার এলাকা";
      } catch {
        return "আপনার এলাকা";
      }
    }

    function fallbackDhaka() {
      void fetchWeather(23.8103, 90.4125, "ঢাকা");
    }

    if (!("geolocation" in navigator)) {
      fallbackDhaka();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const city = await reverseCity(latitude, longitude);
        if (!cancelled) void fetchWeather(latitude, longitude, city);
      },
      () => fallbackDhaka(),
      { timeout: 6000, maximumAge: 10 * 60 * 1000 }
    );

    // refresh every 15 min
    const id = setInterval(() => {
      if (data) void fetchWeather(23.8103, 90.4125, data.city);
    }, 15 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="hidden xs:flex items-center gap-1.5 px-2 py-1 rounded-full bg-gradient-to-br from-sky-500/15 to-cyan-500/10 border border-sky-500/25">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Cloud className="h-3.5 w-3.5 text-sky-300" />
        </motion.div>
        <span className="text-[10px] text-muted-foreground">লোড হচ্ছে...</span>
      </div>
    );
  }

  if (!data) return null;

  const meta = describe(data.code, data.isDay);
  const Icon = meta.Icon;

  return (
    <div className="relative">
      {/* Animated rainbow halo border */}
      <motion.div
        aria-hidden
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        className="absolute -inset-[2px] rounded-full opacity-90 blur-[2px] pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg,#f43f5e,#f59e0b,#facc15,#10b981,#06b6d4,#6366f1,#a855f7,#ec4899,#f43f5e)",
          backgroundSize: "300% 100%",
        }}
      />
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        className={`relative overflow-hidden flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full
          border border-white/50 shadow-xl ${meta.glow}
          ring-1 ring-white/25`}
        style={{
          background:
            "linear-gradient(90deg,#f43f5e,#f59e0b,#facc15,#10b981,#06b6d4,#6366f1,#a855f7,#ec4899,#f43f5e)",
          backgroundSize: "300% 100%",
        }}
        aria-label="আবহাওয়া"
      >
        {/* Glossy top sheen */}
        <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/55 to-transparent" />
        {/* Bottom darken for depth */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent" />
        {/* Shimmer sweep */}
        <motion.span
          aria-hidden
          animate={{ x: ["-120%", "220%"] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
          className="pointer-events-none absolute -inset-y-1 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent skew-x-12"
        />
        <motion.span
          animate={{ rotate: [0, 12, -12, 0], scale: [1, 1.18, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="relative flex items-center justify-center"
        >
          <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]" strokeWidth={2.6} />
        </motion.span>
        <span
          className="relative font-extrabold text-[11px] md:text-xs tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
          style={{ color: "#fff" }}
        >
          {toBnDigits(data.temp)}°C
        </span>
        <span className="relative hidden md:inline text-[10px] font-semibold text-white/95 truncate max-w-[80px] drop-shadow">
          {meta.label}
        </span>
      </motion.button>

      {/* Detail popover */}
      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl overflow-hidden
                bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl"
            >
              {/* Top color band — rainbow animated */}
              <div className="relative h-20 overflow-hidden">
                <motion.div
                  aria-hidden
                  animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(120deg,#f43f5e,#f59e0b,#facc15,#10b981,#06b6d4,#6366f1,#a855f7,#ec4899,#f43f5e)",
                    backgroundSize: "300% 100%",
                  }}
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${meta.grad} opacity-60 mix-blend-overlay`} />
                <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                  className="absolute -right-3 -bottom-3"
                >
                  <Icon className="h-20 w-20 text-white/50" strokeWidth={1.5} />
                </motion.div>
                <motion.span
                  aria-hidden
                  animate={{ x: ["-120%", "220%"] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
                  className="pointer-events-none absolute -inset-y-2 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12"
                />
                <div className="relative px-3 py-2 flex items-end h-full">
                  <div>
                    <div className="text-2xl font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] tabular-nums leading-none">
                      {toBnDigits(data.temp)}°C
                    </div>
                    <div className="text-[11px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                      {meta.label}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <MapPin className="h-3.5 w-3.5 text-rose-400" />
                  <span className="truncate bg-gradient-to-r from-rose-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
                    {data.city}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <div className="relative rounded-lg p-2 bg-gradient-to-br from-orange-500/25 via-rose-500/20 to-pink-500/15 border border-orange-400/40 shadow-md shadow-orange-500/10">
                    <div className="flex items-center gap-1 text-[9px] font-semibold text-orange-300">
                      <Sun className="h-2.5 w-2.5" /> অনুভূত
                    </div>
                    <div className="text-xs font-extrabold tabular-nums mt-0.5 bg-gradient-to-br from-orange-300 to-rose-400 bg-clip-text text-transparent">
                      {toBnDigits(data.feels)}°
                    </div>
                  </div>
                  <div className="relative rounded-lg p-2 bg-gradient-to-br from-cyan-500/25 via-sky-500/20 to-blue-500/15 border border-cyan-400/40 shadow-md shadow-cyan-500/10">
                    <div className="flex items-center gap-1 text-[9px] font-semibold text-cyan-300">
                      <Droplets className="h-2.5 w-2.5" /> আর্দ্রতা
                    </div>
                    <div className="text-xs font-extrabold tabular-nums mt-0.5 bg-gradient-to-br from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                      {toBnDigits(data.humidity)}%
                    </div>
                  </div>
                  <div className="relative rounded-lg p-2 bg-gradient-to-br from-emerald-500/25 via-teal-500/20 to-green-500/15 border border-emerald-400/40 shadow-md shadow-emerald-500/10">
                    <div className="flex items-center gap-1 text-[9px] font-semibold text-emerald-300">
                      <Wind className="h-2.5 w-2.5" /> বাতাস
                    </div>
                    <div className="text-xs font-extrabold tabular-nums mt-0.5 bg-gradient-to-br from-emerald-300 to-teal-400 bg-clip-text text-transparent">
                      {toBnDigits(data.wind)}
                    </div>
                  </div>
                </div>
                <div className="text-[9px] text-muted-foreground/70 text-center pt-1">
                  ১৫ মিনিট অন্তর আপডেট হয়
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
