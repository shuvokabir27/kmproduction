import { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, Share2, RefreshCw, Search, Newspaper, Sparkles, Copy, Facebook } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface NewsItem {
  id: string;
  title: string;
  featured_image_url: string | null;
  category: string | null;
  published_at: string | null;
}

const BRAND = "দৈনিক ইন্তেকাল";
const TAGLINE = "সংবাদে চিরন্তন সত্য • প্রকাশিত প্রতিদিন";

// Funny fake advertisements — appear randomly at bottom of card
const FUNNY_ADS: { brand: string; tagline: string; offer: string; bg: string; accent: string; emoji: string }[] = [
  { brand: "মামা হোটেল", tagline: "৩ দিনের বাসি ভাত — সম্পূর্ণ ফ্রেশ গ্যারান্টি!", offer: "অফার: ১ প্লেট কিনলে ১টি পেট ব্যথা ফ্রি", bg: "#7c2d12", accent: "#fde047", emoji: "🍛" },
  { brand: "চাচার চা স্টল", tagline: "যে চা খেলে শ্বশুরবাড়ির কথা মনে পড়বে", offer: "১০ কাপ চা = ১টি দীর্ঘশ্বাস ফ্রি", bg: "#451a03", accent: "#fcd34d", emoji: "☕" },
  { brand: "বাংলা টাইগার বালাম", tagline: "মাথা ব্যথা, কোমর ব্যথা, প্রেমের ব্যথা — সব এক বালামে!", offer: "১ কৌটা = ৭ পুরুষের শক্তি", bg: "#7f1d1d", accent: "#fef3c7", emoji: "💪" },
  { brand: "সুপার গ্লু আঠা", tagline: "ভাঙা সম্পর্কও জোড়া লাগাই — গ্যারান্টি ১০০%", offer: "এক ফোঁটায় সারাজীবন একসাথে", bg: "#1e3a8a", accent: "#fde047", emoji: "🔗" },
  { brand: "হারবাল হেয়ার অয়েল", tagline: "টাক মাথায় ৩ দিনে বাঁশ ঝাড়!", offer: "ফ্রি অফার: চিরুনি কেনার দরকার নেই", bg: "#064e3b", accent: "#a7f3d0", emoji: "🌿" },
  { brand: "নুরু ভাইয়ের লন্ড্রি", tagline: "সাদা শার্ট দিলে কালো ফেরত — গ্যারান্টি!", offer: "৫টি কাপড় ধুলে ১টি হারিয়ে যাবেই", bg: "#312e81", accent: "#c7d2fe", emoji: "👕" },
  { brand: "ম্যাজিক ফর্সা ক্রিম", tagline: "৭ দিনে এত ফর্সা — মা চিনবে না!", offer: "১ কৌটায় বউ পাওয়ার গ্যারান্টি", bg: "#831843", accent: "#fbcfe8", emoji: "✨" },
  { brand: "দাদুর দাঁতের পাউডার", tagline: "৬০ বছরের দাঁতে নতুন বিয়ের কামড়!", offer: "১ প্যাকেট = ১০০ বছরের ওয়ারেন্টি", bg: "#0c4a6e", accent: "#bae6fd", emoji: "🦷" },
  { brand: "কাবিল প্লাম্বার সার্ভিস", tagline: "পাইপ ঠিক করি — ঘর ভাসিয়ে দিই ফ্রি", offer: "কল দিলেই আসি — ৩ দিনের মধ্যে", bg: "#1e293b", accent: "#fde047", emoji: "🔧" },
  { brand: "শখের মুরগী ফার্ম", tagline: "ডিম দেয় — মাঝে মাঝে সোনারও দেয়!", offer: "১ ডজন কিনলে ১টি মুরগি ধার", bg: "#78350f", accent: "#fef3c7", emoji: "🐔" },
  { brand: "ফাটাফাটি ম্যাট্রিমনি", tagline: "৩ দিনে বিয়ে — ৭ দিনে ডিভোর্স!", offer: "প্যাকেজ অফার: বিয়ে + কোর্ট ফি ফ্রি", bg: "#581c87", accent: "#e9d5ff", emoji: "💍" },
  { brand: "জাদুকর বাবার তাবিজ", tagline: "শাশুড়ি বশ, বস বশ, এমনকি বিড়ালও বশ!", offer: "১টি তাবিজে ৭ পুরুষের সমস্যার সমাধান", bg: "#3f0808", accent: "#fde047", emoji: "🔮" },
];

const NewsCard = () => {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [customHeadline, setCustomHeadline] = useState("");
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [adIndex, setAdIndex] = useState(() => Math.floor(Math.random() * FUNNY_ADS.length));

  // ====== CUSTOM MODE ======
  const [mode, setMode] = useState<"auto" | "custom">("auto");
  const [customImageUrl, setCustomImageUrl] = useState<string>("");
  const [customAdEnabled, setCustomAdEnabled] = useState(false);
  const [customAdBrand, setCustomAdBrand] = useState("");
  const [customAdTagline, setCustomAdTagline] = useState("");
  const [customAdOffer, setCustomAdOffer] = useState("");
  const [customAdEmoji, setCustomAdEmoji] = useState("✨");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);

  // Preload Bengali fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700;800;900&family=Tiro+Bangla:ital@0;1&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  // Fetch published news
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("news")
        .select("id, title, featured_image_url, category, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(60);
      if (error) {
        toast.error("নিউজ লোড করা যায়নি");
      } else {
        setNewsList((data || []) as NewsItem[]);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return newsList;
    return newsList.filter((n) => n.title.toLowerCase().includes(q));
  }, [search, newsList]);

  // Helpers
  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(/(\s+)/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur + w;
      if (ctx.measureText(test).width > maxWidth && cur.trim()) {
        lines.push(cur.trim());
        cur = w.trimStart();
      } else {
        cur = test;
      }
    }
    if (cur.trim()) lines.push(cur.trim());
    return lines;
  }

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const drawCard = async (): Promise<HTMLCanvasElement | null> => {
    // In custom mode we don't need a selected news item
    const isCustom = mode === "custom";
    if (!isCustom && !selected) return null;
    const canvas = canvasRef.current!;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d")!;

    // Effective inputs
    const effectiveImageUrl = isCustom
      ? customImageUrl || null
      : selected?.featured_image_url || null;
    const effectiveHeadline = (
      customHeadline.trim() || (isCustom ? "এখানে আপনার হেডলাইন লিখুন" : selected?.title || "")
    ).trim();
    const W = 1080;
    const H = 1350;
    canvas.width = W;
    canvas.height = H;

    // Background — deep red breaking news
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#1a0000");
    bg.addColorStop(1, "#000000");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle diagonal stripes overlay
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = "#ffffff";
    for (let i = -H; i < W; i += 40) {
      ctx.fillRect(i, 0, 2, H);
    }
    ctx.restore();

    // Top header bar (TV news red strip)
    const headerH = 120;
    const headerGrad = ctx.createLinearGradient(0, 0, W, headerH);
    headerGrad.addColorStop(0, "#7f1d1d");
    headerGrad.addColorStop(0.5, "#dc2626");
    headerGrad.addColorStop(1, "#7f1d1d");
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 0, W, headerH);

    // White divider under header
    ctx.fillStyle = "#fef3c7";
    ctx.fillRect(0, headerH, W, 4);

    // Brand "দৈনিক ইন্তেকাল"
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = '900 64px "Tiro Bangla", "Hind Siliguri", serif';
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 10;
    ctx.fillText(BRAND, W / 2, 78);
    ctx.shadowBlur = 0;

    // Tagline strip (yellow)
    ctx.fillStyle = "#fde047";
    ctx.font = '600 22px "Hind Siliguri", sans-serif';
    ctx.fillText(TAGLINE, W / 2, 108);

    // Image area
    const imgX = 50;
    const imgY = headerH + 40;
    const imgW = W - 100;
    const imgH = 620;

    // Image frame shadow
    ctx.save();
    ctx.shadowColor = "rgba(220,38,38,0.5)";
    ctx.shadowBlur = 30;
    ctx.fillStyle = "#000";
    roundRect(ctx, imgX, imgY, imgW, imgH, 18);
    ctx.fill();
    ctx.restore();

    // Draw featured image
    if (effectiveImageUrl) {
      try {
        const img = await loadImage(effectiveImageUrl);
        ctx.save();
        roundRect(ctx, imgX, imgY, imgW, imgH, 18);
        ctx.clip();
        // cover-fit
        const ir = img.width / img.height;
        const fr = imgW / imgH;
        let dw, dh, dx, dy;
        if (ir > fr) {
          dh = imgH;
          dw = imgH * ir;
          dx = imgX + (imgW - dw) / 2;
          dy = imgY;
        } else {
          dw = imgW;
          dh = imgW / ir;
          dx = imgX;
          dy = imgY + (imgH - dh) / 2;
        }
        ctx.drawImage(img, dx, dy, dw, dh);

        // Bottom gradient overlay for text legibility
        const ovr = ctx.createLinearGradient(0, imgY + imgH * 0.5, 0, imgY + imgH);
        ovr.addColorStop(0, "rgba(0,0,0,0)");
        ovr.addColorStop(1, "rgba(0,0,0,0.85)");
        ctx.fillStyle = ovr;
        ctx.fillRect(imgX, imgY, imgW, imgH);
        ctx.restore();
      } catch {
        // fallback placeholder
        ctx.save();
        roundRect(ctx, imgX, imgY, imgW, imgH, 18);
        ctx.clip();
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(imgX, imgY, imgW, imgH);
        ctx.fillStyle = "#666";
        ctx.font = '700 32px "Hind Siliguri", sans-serif';
        ctx.textAlign = "center";
        ctx.fillText("ছবি লোড করা যায়নি", W / 2, imgY + imgH / 2);
        ctx.restore();
      }
    } else {
      ctx.save();
      roundRect(ctx, imgX, imgY, imgW, imgH, 18);
      ctx.clip();
      const grad = ctx.createLinearGradient(imgX, imgY, imgX + imgW, imgY + imgH);
      grad.addColorStop(0, "#450a0a");
      grad.addColorStop(1, "#1c1917");
      ctx.fillStyle = grad;
      ctx.fillRect(imgX, imgY, imgW, imgH);
      ctx.restore();
    }

    // Image border
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 4;
    roundRect(ctx, imgX, imgY, imgW, imgH, 18);
    ctx.stroke();

    // BREAKING NEWS pill (top-left of image)
    const pillX = imgX + 24;
    const pillY = imgY + 24;
    ctx.fillStyle = "#dc2626";
    roundRect(ctx, pillX, pillY, 240, 50, 25);
    ctx.fill();
    // Live dot
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(pillX + 24, pillY + 25, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = '900 24px "Hind Siliguri", sans-serif';
    ctx.textAlign = "left";
    ctx.fillText("ব্রেকিং নিউজ", pillX + 46, pillY + 33);

    // ===== Funny Advertisement Block (positioned first to know its bounds) =====
    const ad = FUNNY_ADS[adIndex % FUNNY_ADS.length];
    const adX = 50;
    const adW = W - 100;
    const adH = 160;
    const adY = H - 70 - adH - 20; // above ticker with 20px gap

    // ===== Headline area — fills ALL space between image and ad =====
    const headlineAreaTop = imgY + imgH + 30;
    const headlineAreaBottom = adY - 30;
    const headlineAreaH = headlineAreaBottom - headlineAreaTop;
    const headlineMaxW = W - 80;
    const headline = (customHeadline.trim() || selected.title).trim();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";

    // Auto-fit: try font sizes from large→small until text fits height & width
    const tryFont = (size: number) => {
      ctx.font = `900 ${size}px "Tiro Bangla", "Hind Siliguri", serif`;
      const lh = size * 1.2;
      const ls = wrapText(ctx, headline, headlineMaxW);
      return { size, lh, lines: ls, totalH: ls.length * lh };
    };

    let chosen = tryFont(96);
    for (let s = 96; s >= 28; s -= 2) {
      const t = tryFont(s);
      if (t.totalH <= headlineAreaH && t.lines.length <= 6) {
        chosen = t;
        break;
      }
      chosen = t;
    }

    // Vertically center headline lines inside the available area
    const startY =
      headlineAreaTop +
      (headlineAreaH - chosen.totalH) / 2 +
      chosen.size * 0.85; // baseline offset for first line

    ctx.font = `900 ${chosen.size}px "Tiro Bangla", "Hind Siliguri", serif`;
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 8;
    chosen.lines.forEach((ln, i) => {
      ctx.fillText(ln, W / 2, startY + i * chosen.lh);
    });
    ctx.shadowBlur = 0;

    // ===== Draw Ad Block =====
    // Ad background
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 20;
    const adGrad = ctx.createLinearGradient(adX, adY, adX + adW, adY + adH);
    adGrad.addColorStop(0, ad.bg);
    adGrad.addColorStop(1, "#000000");
    ctx.fillStyle = adGrad;
    roundRect(ctx, adX, adY, adW, adH, 14);
    ctx.fill();
    ctx.restore();

    // Ad border
    ctx.strokeStyle = ad.accent;
    ctx.lineWidth = 2;
    roundRect(ctx, adX, adY, adW, adH, 14);
    ctx.stroke();

    // "বিজ্ঞাপন" tag (top-center of ad)
    const tagW = 140;
    const tagH = 30;
    const tagX = adX + (adW - tagW) / 2;
    ctx.fillStyle = ad.accent;
    roundRect(ctx, tagX, adY - 15, tagW, tagH, 8);
    ctx.fill();
    ctx.fillStyle = ad.bg;
    ctx.font = '900 17px "Hind Siliguri", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("বিজ্ঞাপন", tagX + tagW / 2, adY - 15 + 21);

    // Centered ad content
    const adCenterX = W / 2;

    // Brand name (with emoji prefix) — centered
    ctx.fillStyle = ad.accent;
    ctx.font = '900 32px "Tiro Bangla", "Hind Siliguri", serif';
    ctx.textAlign = "center";
    ctx.fillText(`${ad.emoji}  ${ad.brand}`, adCenterX, adY + 50);

    // Tagline (white, centered, may wrap)
    ctx.fillStyle = "#ffffff";
    ctx.font = '700 20px "Hind Siliguri", sans-serif';
    const adMaxW = adW - 40;
    const tlLines = wrapText(ctx, ad.tagline, adMaxW).slice(0, 2);
    tlLines.forEach((ln, i) => {
      ctx.fillText(ln, adCenterX, adY + 88 + i * 26);
    });

    // Offer line (highlighted, centered)
    ctx.fillStyle = ad.accent;
    ctx.font = '800 17px "Hind Siliguri", sans-serif';
    ctx.fillText("⚡ " + ad.offer, adCenterX, adY + adH - 18);

    // Bottom red ticker bar
    const tickerY = H - 70;
    const tickerGrad = ctx.createLinearGradient(0, tickerY, W, H);
    tickerGrad.addColorStop(0, "#7f1d1d");
    tickerGrad.addColorStop(0.5, "#dc2626");
    tickerGrad.addColorStop(1, "#7f1d1d");
    ctx.fillStyle = tickerGrad;
    ctx.fillRect(0, tickerY, W, 70);

    ctx.fillStyle = "#fde047";
    ctx.font = '800 28px "Hind Siliguri", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("● দৈনিক ইন্তেকাল ● সংবাদ যেখানে শেষ কথা ●", W / 2, tickerY + 45);

    return canvas;
  };

  // Auto draw on changes
  useEffect(() => {
    if (selected) {
      drawCard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, customHeadline, adIndex]);

  const isInAppBrowser = () => {
    const ua = navigator.userAgent || "";
    return /FBAN|FBAV|FB_IAB|FB4A|Messenger|Instagram|Line|MicroMessenger|WeChat|Twitter|TikTok|Snapchat|LinkedInApp/i.test(ua);
  };

  const handleDownload = async () => {
    const canvas = await drawCard();
    if (!canvas) {
      toast.error("প্রথমে একটি নিউজ সিলেক্ট করুন");
      return;
    }
    const mime = format === "png" ? "image/png" : "image/jpeg";
    const filename = `doinik-intekal.${format}`;

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), mime, 0.95)
    );
    if (!blob) {
      toast.error("ছবি তৈরি করতে সমস্যা হয়েছে");
      return;
    }

    // 1) Web Share with file (mobile / in-app browsers)
    try {
      const file = new File([blob], filename, { type: mime });
      const navAny = navigator as any;
      if (navAny.canShare && navAny.canShare({ files: [file] }) && isInAppBrowser()) {
        await navAny.share({
          files: [file],
          title: BRAND,
          text: "দৈনিক ইন্তেকাল — নিউজ কার্ড",
        });
        toast.success("✅ নিউজ কার্ড সফলভাবে শেয়ার/সেভ হয়েছে");
        return;
      }
    } catch {}

    // 2) Standard blob download
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      a.target = "_self";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      // 3) In-app browser fallback
      if (isInAppBrowser()) {
        const dataUrl = canvas.toDataURL(mime, 0.95);
        const w = window.open();
        if (w) {
          w.document.write(`
            <html><head><title>নিউজ কার্ড সেভ করুন</title>
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <style>
              body{margin:0;background:#0a0a0a;color:#fff;font-family:system-ui,sans-serif;text-align:center;padding:16px}
              img{max-width:100%;height:auto;border-radius:12px;box-shadow:0 4px 20px rgba(255,0,0,.3)}
              .tip{margin:16px 0;padding:12px;background:#dc2626;border-radius:10px;font-size:15px;line-height:1.6}
              a.btn{display:inline-block;margin-top:12px;padding:12px 24px;background:#fff;color:#000;text-decoration:none;border-radius:8px;font-weight:bold}
            </style></head>
            <body>
              <div class="tip">📱 ছবিটি <b>চেপে ধরে</b> "Save image" সিলেক্ট করুন</div>
              <img src="${dataUrl}" alt="নিউজ কার্ড" />
              <br><a class="btn" href="${dataUrl}" download="${filename}">⬇️ ডাউনলোড</a>
            </body></html>
          `);
          w.document.close();
          toast.success("✅ নতুন ট্যাবে খুলেছে — ছবি চেপে ধরে সেভ করুন");
          return;
        }
      }

      toast.success("✅ নিউজ কার্ড সফলভাবে ডাউনলোড হয়েছে");
    } catch {
      toast.error("ডাউনলোড করতে সমস্যা হয়েছে");
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/news-card`;
    try {
      if (navigator.share) {
        await navigator.share({ title: BRAND, text: "দৈনিক ইন্তেকাল — নিউজ কার্ড বানান", url });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(url);
      toast.success("লিংক কপি হয়েছে!");
    } catch {
      toast.error("লিংক কপি করা যায়নি");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-red-950/30">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-red-900/40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> হোম
          </Link>
          <h1 className="text-base sm:text-lg font-extrabold text-red-500 flex items-center gap-1.5">
            <Newspaper className="w-4 h-4" /> দৈনিক ইন্তেকাল
          </h1>
          <button
            onClick={handleShare}
            className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-400"
          >
            <Share2 className="w-4 h-4" /> শেয়ার
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2" style={{ fontFamily: '"Tiro Bangla", serif' }}>
            📰 দৈনিক ইন্তেকাল
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            যেকোনো নিউজ সিলেক্ট করুন — তাৎক্ষণিক একটি প্রফেশনাল ব্রেকিং নিউজ কার্ড তৈরি হবে
          </p>
        </div>

        {!selected && (
          <>
            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="হেডলাইন খুঁজুন..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 border-red-500/30 bg-card/50"
              />
            </div>

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">লোড হচ্ছে...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">কোনো নিউজ পাওয়া যায়নি</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      setSelected(n);
                      setCustomHeadline("");
                    }}
                    className="group text-left rounded-xl overflow-hidden border border-red-500/20 bg-card/50 hover:border-red-500/60 hover:shadow-lg hover:shadow-red-900/30 transition-all"
                  >
                    <div className="aspect-video bg-black overflow-hidden">
                      {n.featured_image_url ? (
                        <img
                          src={n.featured_image_url}
                          alt={n.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          ছবি নেই
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-bold text-foreground line-clamp-2 leading-snug" style={{ fontFamily: '"Hind Siliguri", sans-serif' }}>
                        {n.title}
                      </p>
                      <span className="inline-block mt-2 text-[10px] uppercase font-bold text-red-400">
                        {n.category}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {selected && (
          <div className="space-y-4">
            <div ref={previewBoxRef} className="rounded-2xl overflow-hidden border border-red-500/40 bg-black shadow-2xl shadow-red-900/40">
              <canvas ref={canvasRef} className="w-full h-auto block" />
            </div>

            {/* Custom headline override */}
            <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <p className="text-xs font-semibold text-amber-400">হেডলাইন এডিট করুন (ঐচ্ছিক)</p>
              </div>
              <textarea
                value={customHeadline}
                onChange={(e) => setCustomHeadline(e.target.value)}
                placeholder={selected.title}
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background/50 border border-red-500/20 focus:border-red-500/60 outline-none resize-none"
                style={{ fontFamily: '"Hind Siliguri", sans-serif' }}
              />
              <p className="text-[10px] text-muted-foreground mt-1">খালি রাখলে মূল হেডলাইন ব্যবহার হবে</p>
            </div>

            {/* Format */}
            <div className="flex gap-2 justify-center">
              <Button
                variant={format === "png" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormat("png")}
                className={format === "png" ? "bg-red-600 hover:bg-red-700" : ""}
              >
                PNG
              </Button>
              <Button
                variant={format === "jpeg" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormat("jpeg")}
                className={format === "jpeg" ? "bg-red-600 hover:bg-red-700" : ""}
              >
                JPEG
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setSelected(null);
                  setCustomHeadline("");
                }}
                className="border-red-500/40"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> অন্য নিউজ
              </Button>
              <Button
                onClick={handleDownload}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" /> ডাউনলোড
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setAdIndex((i) => (i + 1 + Math.floor(Math.random() * (FUNNY_ADS.length - 1))) % FUNNY_ADS.length)}
              className="w-full border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
            >
              <Sparkles className="w-4 h-4 mr-2" /> অন্য বিজ্ঞাপন দেখাও
            </Button>

            <div className="flex gap-2 justify-center pt-2">
              <Button size="sm" variant="outline" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" /> পেজ শেয়ার
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  window.open(
                    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + "/news-card")}`,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
                className="border-blue-500/40 text-blue-400"
              >
                <Facebook className="w-4 h-4 mr-2" /> Facebook
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(`${window.location.origin}/news-card`);
                  toast.success("লিংক কপি হয়েছে!");
                }}
              >
                <Copy className="w-4 h-4 mr-2" /> লিংক
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground pt-2">
              ডাউনলোড করে Facebook, WhatsApp, Instagram-এ পোস্ট করুন
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default NewsCard;
