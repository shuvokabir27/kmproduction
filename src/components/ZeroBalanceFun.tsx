import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Users, Maximize2, Minimize2, X, Download } from "lucide-react";

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

const loadCanvasImage = (src?: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const roundRectPath = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

const wrapCanvasText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      line = testLine;
      return;
    }
    if (line) lines.push(line);
    if (ctx.measureText(word).width <= maxWidth) {
      line = word;
      return;
    }
    let chunk = "";
    Array.from(word).forEach((char) => {
      const testChunk = `${chunk}${char}`;
      if (ctx.measureText(testChunk).width > maxWidth && chunk) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk = testChunk;
      }
    });
    line = chunk;
  });

  if (line) lines.push(line);
  return lines;
};

const drawImageCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, size: number) => {
  const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
  const sw = size / scale;
  const sh = size / scale;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = (img.naturalHeight - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, size, size);
};

const canvasBlob = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));

export function ZeroBalanceFun({ spotlightOnly = false }: { spotlightOnly?: boolean } = {}) {
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

  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    if (!members || members.length === 0) return;
    let cancelled = false;
    let timer: any;
    const tick = async () => {
      if (pausedRef.current) {
        timer = setTimeout(tick, 500);
        return;
      }
      const memberIdx = pickWeightedIndex(members);
      const member = members[memberIdx];
      const message = await fetchAiMessage(member);
      if (cancelled) return;
      setSpot({ memberIdx, message, key: Date.now() });
      // Reading time: ~70ms per char + 2.5s base, clamped 4s–14s
      const readMs = Math.min(14000, Math.max(4000, 2500 + message.length * 70));
      const wait = () => {
        if (cancelled) return;
        if (pausedRef.current) {
          timer = setTimeout(wait, 500);
        } else {
          timer = setTimeout(tick, readMs);
        }
      };
      wait();
    };
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [members]);

  const spotMember = spot && members ? members[spot.memberIdx] : null;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen?.();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen?.();
        setIsFullscreen(false);
      }
    } catch {
      // Fallback: just toggle CSS fullscreen
      setIsFullscreen((v) => !v);
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const stageRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPng = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!stageRef.current || downloading) return;
    setDownloading(true);
    try {
      await document.fonts?.ready;
      const member = spotMember;
      const message = spot?.message || "কুয়াকাটা মাল্টিমিডিয়া";
      const width = 1200;
      const height = 900;
      const ratio = 2;
      const canvas = document.createElement("canvas");
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.scale(ratio, ratio);

      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "hsl(240 35% 6%)");
      bg.addColorStop(0.5, "hsl(260 45% 8%)");
      bg.addColorStop(1, "hsl(220 35% 5%)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      const glowTop = ctx.createRadialGradient(width * 0.22, 0, 40, width * 0.22, 0, 520);
      glowTop.addColorStop(0, "hsl(190 95% 55% / 0.36)");
      glowTop.addColorStop(1, "hsl(190 95% 55% / 0)");
      ctx.fillStyle = glowTop;
      ctx.fillRect(0, 0, width, height);
      const glowBottom = ctx.createRadialGradient(width * 0.82, height * 0.9, 40, width * 0.82, height * 0.9, 560);
      glowBottom.addColorStop(0, "hsl(310 85% 58% / 0.28)");
      glowBottom.addColorStop(1, "hsl(310 85% 58% / 0)");
      ctx.fillStyle = glowBottom;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < 42; i += 1) {
        ctx.fillStyle = `hsl(0 0% 100% / ${0.16 + (i % 4) * 0.08})`;
        ctx.beginPath();
        ctx.arc((i * 97) % width, (i * 151) % height, 1.6 + (i % 3) * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = "800 34px 'Hind Siliguri', 'Tiro Bangla', sans-serif";
      const messageLines = wrapCanvasText(ctx, message, 900).slice(0, 5);
      const lineHeight = 48;
      const bubbleW = 1000;
      const bubbleH = Math.max(150, messageLines.length * lineHeight + 62);
      const bubbleX = (width - bubbleW) / 2;
      const bubbleY = 78;

      ctx.save();
      ctx.shadowColor = "hsl(190 90% 55% / 0.55)";
      ctx.shadowBlur = 46;
      const bubbleBg = ctx.createLinearGradient(bubbleX, bubbleY, bubbleX + bubbleW, bubbleY + bubbleH);
      bubbleBg.addColorStop(0, "hsl(240 40% 8% / 0.96)");
      bubbleBg.addColorStop(1, "hsl(260 50% 13% / 0.94)");
      roundRectPath(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 28);
      ctx.fillStyle = bubbleBg;
      ctx.fill();
      ctx.restore();

      roundRectPath(ctx, bubbleX + 2, bubbleY + 2, bubbleW - 4, bubbleH / 2, 26);
      const shine = ctx.createLinearGradient(0, bubbleY, 0, bubbleY + bubbleH / 2);
      shine.addColorStop(0, "hsl(0 0% 100% / 0.13)");
      shine.addColorStop(1, "hsl(0 0% 100% / 0)");
      ctx.fillStyle = shine;
      ctx.fill();

      ctx.strokeStyle = "hsl(0 0% 100% / 0.16)";
      ctx.lineWidth = 2;
      roundRectPath(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 28);
      ctx.stroke();

      const textGradient = ctx.createLinearGradient(bubbleX + 80, bubbleY, bubbleX + bubbleW - 80, bubbleY + bubbleH);
      textGradient.addColorStop(0, "hsl(45 100% 76%)");
      textGradient.addColorStop(0.5, "hsl(0 0% 100%)");
      textGradient.addColorStop(1, "hsl(180 100% 80%)");
      ctx.fillStyle = textGradient;
      ctx.shadowColor = "hsl(190 95% 55% / 0.5)";
      ctx.shadowBlur = 14;
      messageLines.forEach((line, idx) => {
        ctx.fillText(line, width / 2, bubbleY + 55 + idx * lineHeight);
      });
      ctx.shadowBlur = 0;

      const avatarSize = 286;
      const avatarX = (width - avatarSize) / 2;
      const avatarY = bubbleY + bubbleH + 92;
      const avatarCenterX = width / 2;
      const avatarCenterY = avatarY + avatarSize / 2;
      const image = await loadCanvasImage(member?.photo_url);



      const ring = ctx.createConicGradient(0, avatarCenterX, avatarCenterY);
      ring.addColorStop(0, "hsl(195 100% 55%)");
      ring.addColorStop(0.32, "hsl(310 90% 60%)");
      ring.addColorStop(0.66, "hsl(45 100% 55%)");
      ring.addColorStop(1, "hsl(195 100% 55%)");
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2 + 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      if (image) {
        drawImageCover(ctx, image, avatarX, avatarY, avatarSize);
      } else {
        const fallback = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
        fallback.addColorStop(0, "hsl(190 75% 24%)");
        fallback.addColorStop(1, "hsl(290 60% 22%)");
        ctx.fillStyle = fallback;
        ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
        ctx.fillStyle = "hsl(0 0% 100%)";
        ctx.font = "800 96px 'Hind Siliguri', sans-serif";
        ctx.fillText((member?.full_name || "?").trim().charAt(0), avatarCenterX, avatarCenterY + 34);
      }
      const avatarShine = ctx.createRadialGradient(avatarX + 85, avatarY + 48, 8, avatarX + 85, avatarY + 48, 175);
      avatarShine.addColorStop(0, "hsl(0 0% 100% / 0.42)");
      avatarShine.addColorStop(1, "hsl(0 0% 100% / 0)");
      ctx.fillStyle = avatarShine;
      ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();

      ctx.strokeStyle = "hsl(0 0% 100% / 0.28)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(avatarCenterX, avatarCenterY, avatarSize / 2 - 2, 0, Math.PI * 2);
      ctx.stroke();

      const nameY = avatarY + avatarSize + 70;
      ctx.font = "800 48px 'Hind Siliguri', 'Tiro Bangla', sans-serif";
      ctx.fillStyle = "hsl(0 0% 98%)";
      ctx.shadowColor = "hsl(0 0% 0% / 0.45)";
      ctx.shadowBlur = 12;
      ctx.fillText(member?.full_name || "সদস্য", width / 2, nameY);
      ctx.shadowBlur = 0;

      if (member?.designation) {
        ctx.font = "700 24px 'Hind Siliguri', sans-serif";
        ctx.fillStyle = "hsl(150 70% 58%)";
        ctx.fillText(member.designation, width / 2, nameY + 42);
      }
      ctx.font = "600 22px 'Hind Siliguri', sans-serif";
      ctx.fillStyle = "hsl(210 18% 82% / 0.86)";
      ctx.fillText("কুয়াকাটা মাল্টিমিডিয়া", width / 2, nameY + (member?.designation ? 78 : 44));

      const infoParts = [member?.blood_group && `🩸 ${member.blood_group}`, member?.address && `📍 ${member.address}`].filter(Boolean) as string[];
      if (infoParts.length) {
        ctx.font = "600 18px 'Hind Siliguri', sans-serif";
        const chipText = infoParts.join("   ").slice(0, 80);
        ctx.fillStyle = "hsl(190 90% 88% / 0.92)";
        ctx.fillText(chipText, width / 2, height - 46);
      }

      const blob = await canvasBlob(canvas);
      if (!blob) throw new Error("PNG export failed");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const name = (spotMember?.full_name || "spotlight").replace(/\s+/g, "_");
      a.href = url;
      a.download = `${name}_spotlight.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("PNG download failed", err);
    } finally {
      setDownloading(false);
    }
  };

  const SpotlightStage = ({ big = false }: { big?: boolean }) => (
    <div
      ref={stageRef}
      onClick={() => setPaused((p) => !p)}
      className={`relative flex items-center justify-center overflow-hidden cursor-pointer select-none ${
        big ? "min-h-screen p-8" : "min-h-[300px] md:min-h-[360px] p-6"
      }`}
      style={{
        background:
          "radial-gradient(ellipse at top, hsl(var(--primary) / 0.18), transparent 55%), radial-gradient(ellipse at bottom right, hsl(300 80% 55% / 0.15), transparent 55%), linear-gradient(135deg, hsl(240 30% 6%), hsl(260 40% 8%))",
      }}
    >
      {paused && (
        <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] md:text-xs font-semibold backdrop-blur pointer-events-none">
          ⏸ পজড — ট্যাপ করে চালু করুন
        </div>
      )}
      {/* Animated background orbs */}
      <motion.div
        className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "hsl(var(--primary) / 0.35)" }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-20 -right-20 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "hsl(310 80% 55% / 0.3)" }}
        animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute top-1/3 right-1/4 h-56 w-56 rounded-full blur-3xl"
        style={{ background: "hsl(45 90% 55% / 0.18)" }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Sparkle particles */}
      {Array.from({ length: big ? 30 : 15 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-white/70"
          style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
          transition={{ duration: 2 + (i % 4), repeat: Infinity, delay: i * 0.2 }}
        />
      ))}

      <AnimatePresence mode="wait">
        {spotMember && spot && (
          <motion.div
            key={spot.key}
            initial={{ opacity: 0, y: 60, scale: 0.6, rotateX: -20 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: -40, scale: 0.7, rotateX: 20 }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
            className="relative z-10 flex flex-col items-center gap-5"
          >
            {/* Speech bubble */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className={`relative px-6 py-4 rounded-2xl backdrop-blur-xl border border-white/15 shadow-2xl text-center overflow-hidden ${
                big ? "max-w-2xl" : "max-w-[80vw] md:max-w-md"
              }`}
              style={{
                background: "linear-gradient(135deg, hsl(240 40% 8% / 0.92), hsl(260 50% 12% / 0.88))",
                boxShadow: "0 0 50px hsl(var(--primary) / 0.5), inset 0 1px 0 hsl(0 0% 100% / 0.1)",
              }}
            >
              {/* Glossy highlight */}
              <span
                className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl"
                style={{ background: "linear-gradient(180deg, hsl(0 0% 100% / 0.08), transparent)" }}
              />
              <p
                className={`relative font-extrabold leading-snug tracking-wide ${big ? "text-xl md:text-2xl" : "text-sm md:text-base"}`}
                style={{
                  fontFamily: "'Hind Siliguri', sans-serif",
                  background: "linear-gradient(135deg, hsl(45 100% 75%), hsl(0 0% 100%) 50%, hsl(180 100% 80%))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  textShadow: "0 0 24px hsl(var(--primary) / 0.4)",
                  filter: "drop-shadow(0 2px 6px hsl(var(--primary) / 0.45))",
                }}
              >
                {spot.message}
              </p>
              <span className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 h-3 w-3 rotate-45 border-r border-b border-white/15" style={{ background: "hsl(260 50% 12% / 0.9)" }} />

            </motion.div>

            {/* Avatar with thin glossy ring */}
            <div className="relative">
              <motion.div
                className="absolute -inset-1 rounded-full"
                style={{
                  background:
                    "conic-gradient(from 0deg, hsl(var(--primary)), hsl(310 80% 60%), hsl(45 90% 55%), hsl(var(--primary)))",
                  padding: "1.5px",
                  WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              />
              <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-primary via-fuchsia-500 to-amber-400 blur-2xl opacity-50 animate-pulse" />
              <div className="relative rounded-full overflow-hidden">
                {spotMember.photo_url ? (
                  <img
                    src={spotMember.photo_url}
                    alt={spotMember.full_name}
                    className={`relative rounded-full object-cover ${
                      big ? "h-56 w-56 md:h-72 md:w-72" : "h-28 w-28 md:h-32 md:w-32"
                    }`}
                  />
                ) : (
                  <div
                    className={`relative rounded-full bg-muted flex items-center justify-center font-bold text-foreground ${
                      big ? "h-56 w-56 md:h-72 md:w-72 text-6xl" : "h-28 w-28 md:h-32 md:w-32 text-2xl"
                    }`}
                  >
                    {(spotMember.full_name || "?").trim().charAt(0)}
                  </div>
                )}
                {/* Glossy sheen overlay */}
                <span
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{
                    background:
                      "radial-gradient(ellipse at 30% 15%, hsl(0 0% 100% / 0.35), transparent 45%), linear-gradient(160deg, hsl(0 0% 100% / 0.15) 0%, transparent 35%, transparent 70%, hsl(0 0% 100% / 0.08) 100%)",
                  }}
                />
                <span
                  className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/20"
                />
              </div>
            </div>


            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <p className={`font-bold text-foreground ${big ? "text-3xl md:text-5xl" : "text-base md:text-lg"}`}>
                {spotMember.full_name}
              </p>
              {spotMember.designation && (
                <p
                  className={`mt-1 font-semibold ${big ? "text-base md:text-lg" : "text-[11px] md:text-xs"}`}
                  style={{ color: "hsl(150 70% 35%)" }}
                >
                  {spotMember.designation}
                </p>
              )}
              <p className={`mt-1 font-medium text-muted-foreground/80 ${big ? "text-sm md:text-base" : "text-[10px] md:text-xs"}`}>
                কুয়াকাটা মাল্টিমিডিয়া
              </p>
              {/* Extra info chips */}
              <div className={`mt-3 flex flex-wrap items-center justify-center gap-2 ${big ? "text-sm" : "text-[10px] md:text-xs"}`}>
                {spotMember.blood_group && (
                  <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-rose-200/90 font-medium backdrop-blur-sm flex items-center gap-1">
                    <span className="text-rose-400">🩸</span> {spotMember.blood_group}
                  </span>
                )}
                {spotMember.date_of_birth && (() => {
                  const d = new Date(spotMember.date_of_birth);
                  if (isNaN(d.getTime())) return null;
                  const months = ["জানু","ফেব্রু","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্ট","অক্টো","নভে","ডিসে"];
                  return (
                    <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-amber-100/90 font-medium backdrop-blur-sm flex items-center gap-1">
                      <span>🎂</span> {d.getDate()} {months[d.getMonth()]}
                    </span>
                  );
                })()}
                {spotMember.address && (
                  <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-cyan-100/90 font-medium backdrop-blur-sm flex items-center gap-1 max-w-[260px] truncate">
                    <span>📍</span> {spotMember.address}
                  </span>
                )}
              </div>
              {!spotlightOnly && spotMember.member_id && (
                <p className={`text-muted-foreground mt-1.5 ${big ? "text-sm" : "text-[11px] md:text-xs"}`}>
                  আইডি: {spotMember.member_id}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Animated spotlight display */}
      <div ref={containerRef} className={`premium-card rounded-2xl overflow-hidden ${isFullscreen ? "bg-background" : ""}`}>
        <div className="p-4 md:p-5 border-b border-border/15 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-fuchsia-500/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-fuchsia-400" />
          </div>
          <h2 className="font-semibold text-foreground text-sm md:text-base">আজকের স্পটলাইট</h2>
          <button
            onClick={handleDownloadPng}
            disabled={downloading || !spotMember}
            className="ml-auto h-8 w-8 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors disabled:opacity-50"
            aria-label="Download PNG"
            title="PNG ডাউনলোড করুন"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="h-8 w-8 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            title={isFullscreen ? "ছোট করুন" : "ফুল স্ক্রিন"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
        <SpotlightStage big={isFullscreen} />
      </div>

      {/* Full member grid (static) */}
      {!spotlightOnly && members && members.length > 0 && (
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
