import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft, Image as ImageIcon, RefreshCw, Share2, Copy, Facebook, Sparkles } from "lucide-react";
import { toast } from "sonner";

const MAIN_TITLE = "কুয়াকাটা উপজেলা চাই";

const SLOGAN_OPTIONS = [
  { id: "right", label: "অধিকার", text: "কুয়াকাটাবাসীর ন্যায্য অধিকার" },
  { id: "voice", label: "একতার কণ্ঠস্বর", text: "একতাই আমাদের শক্তি" },
  { id: "demand", label: "যৌক্তিক দাবি", text: "যুগের দাবি — কুয়াকাটা উপজেলা" },
  { id: "movement", label: "গণআন্দোলন", text: "আমরা ঐক্যবদ্ধ, আমরা সোচ্চার" },
  { id: "future", label: "নতুন ভোর", text: "নতুন উপজেলা — নতুন সম্ভাবনা" },
];

const PhotoCard = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [sloganId, setSloganId] = useState<string>("right");
  // Crop transform: zoom (1 = cover-fit), offsetX/Y in normalized [-1, 1] (0 = center)
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; ox: number; oy: number }>({
    active: false, startX: 0, startY: 0, ox: 0, oy: 0,
  });

  // Preload Bengali fonts for canvas rendering
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700;800;900&family=Tiro+Bangla:ital@0;1&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);


  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("শুধুমাত্র ছবি আপলোড করুন");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setImgDims({ w: img.width, h: img.height });
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setImageSrc(src);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };


  const drawCard = () => {
    return new Promise<HTMLCanvasElement | null>((resolve) => {
      if (!imageSrc) return resolve(null);
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      const W = 1080;
      const H = 1350;
      canvas.width = W;
      canvas.height = H;

      const slogan = SLOGAN_OPTIONS.find((s) => s.id === sloganId) || SLOGAN_OPTIONS[0];

      // Deep base background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "#1a0608");
      bgGrad.addColorStop(1, "#0a0203");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // ---------- IMAGE FRAME ----------
        const frameX = 50;
        const frameY = 50;
        const frameW = W - 100;
        const frameH = 920;
        const radius = 24;

        // Outer red glow border
        ctx.save();
        ctx.shadowColor = "rgba(220, 38, 38, 0.6)";
        ctx.shadowBlur = 40;
        ctx.fillStyle = "#dc2626";
        roundRect(ctx, frameX - 6, frameY - 6, frameW + 12, frameH + 12, radius + 4);
        ctx.fill();
        ctx.restore();

        // Image clip
        ctx.save();
        roundRect(ctx, frameX, frameY, frameW, frameH, radius);
        ctx.clip();

        // Cover-fit image with zoom + offset (user-controlled crop)
        const ir = img.width / img.height;
        const ar = frameW / frameH;
        // Base "cover" source rect (centered)
        let bsw = img.width, bsh = img.height;
        if (ir > ar) {
          bsw = img.height * ar;
        } else {
          bsh = img.width / ar;
        }
        // Apply zoom: smaller source rect = more zoomed in
        const sw = bsw / zoom;
        const sh = bsh / zoom;
        // Max pannable range (in source pixels) so source stays inside image
        const maxOffsetX = (img.width - sw) / 2;
        const maxOffsetY = (img.height - sh) / 2;
        const sx = Math.max(0, Math.min(img.width - sw, (img.width - sw) / 2 + offset.x * maxOffsetX));
        const sy = Math.max(0, Math.min(img.height - sh, (img.height - sh) / 2 + offset.y * maxOffsetY));
        ctx.drawImage(img, sx, sy, sw, sh, frameX, frameY, frameW, frameH);

        // Subtle vignette
        const vGrad = ctx.createLinearGradient(0, frameY, 0, frameY + frameH);
        vGrad.addColorStop(0, "rgba(0,0,0,0.25)");
        vGrad.addColorStop(0.5, "rgba(0,0,0,0)");
        vGrad.addColorStop(1, "rgba(0,0,0,0.55)");
        ctx.fillStyle = vGrad;
        ctx.fillRect(frameX, frameY, frameW, frameH);

        // Top-left protest badge
        const badgeX = frameX + 30;
        const badgeY = frameY + 30;
        ctx.fillStyle = "rgba(220, 38, 38, 0.95)";
        roundRect(ctx, badgeX, badgeY, 240, 56, 28);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.font = '700 24px "Hind Siliguri", sans-serif';
        ctx.fillText("● প্রতিবাদ ২০২৬", badgeX + 22, badgeY + 28);

        ctx.restore();

        // ---------- DECORATIVE DIVIDER ----------
        const divY = 1000;
        // Triple stripe: red / white / red
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(50, divY, W - 100, 6);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(50, divY + 10, W - 100, 2);
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(50, divY + 16, W - 100, 6);

        // ---------- MAIN TITLE ----------
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Title with shadow for depth
        ctx.save();
        ctx.shadowColor = "rgba(220, 38, 38, 0.5)";
        ctx.shadowBlur = 20;
        const titleGrad = ctx.createLinearGradient(0, 1060, 0, 1140);
        titleGrad.addColorStop(0, "#ffffff");
        titleGrad.addColorStop(1, "#fecaca");
        ctx.fillStyle = titleGrad;
        ctx.font = '900 96px "Hind Siliguri", "Tiro Bangla", sans-serif';
        ctx.fillText(MAIN_TITLE, W / 2, 1100);
        ctx.restore();

        // ---------- SLOGAN (custom selected) ----------
        ctx.fillStyle = "#fbbf24";
        ctx.font = '700 36px "Hind Siliguri", sans-serif';
        ctx.fillText(slogan.text, W / 2, 1180);

        // ---------- "এটি একটি প্রতিবাদ" small label with side lines ----------
        const labelY = 1230;
        const labelText = "এটি একটি প্রতিবাদ";
        ctx.font = '500 24px "Hind Siliguri", sans-serif';
        ctx.fillStyle = "#fca5a5";
        const labelW = ctx.measureText(labelText).width;
        ctx.fillText(labelText, W / 2, labelY);
        // Side dashes
        ctx.strokeStyle = "rgba(252, 165, 165, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(W / 2 - labelW / 2 - 80, labelY);
        ctx.lineTo(W / 2 - labelW / 2 - 20, labelY);
        ctx.moveTo(W / 2 + labelW / 2 + 20, labelY);
        ctx.lineTo(W / 2 + labelW / 2 + 80, labelY);
        ctx.stroke();

        // ---------- BOTTOM RED BAR ----------
        const barGrad = ctx.createLinearGradient(0, 1290, W, 1290);
        barGrad.addColorStop(0, "#7f1d1d");
        barGrad.addColorStop(0.5, "#dc2626");
        barGrad.addColorStop(1, "#7f1d1d");
        ctx.fillStyle = barGrad;
        ctx.fillRect(0, 1280, W, 70);

        ctx.fillStyle = "#ffffff";
        ctx.font = '800 26px "Hind Siliguri", sans-serif';
        ctx.fillText("#কুয়াকাটা_উপজেলা_চাই   ●   #প্রতিবাদ", W / 2, 1315);

        resolve(canvas);
      };
      img.src = imageSrc;
    });
  };

  // Rounded rectangle helper
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


  const handleDownload = async () => {
    const canvas = await drawCard();
    if (!canvas) {
      toast.error("প্রথমে একটি ছবি আপলোড করুন");
      return;
    }
    const mime = format === "png" ? "image/png" : "image/jpeg";
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `kuakata-jela-chai.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast.success("ফটো কার্ড ডাউনলোড হয়েছে");
      },
      mime,
      0.95
    );
  };

  // Auto-draw preview whenever image changes
  useEffect(() => {
    if (imageSrc) drawCard();
  }, [imageSrc, sloganId, zoom, offset]);

  const handleShare = async () => {
    const url = `${window.location.origin}/photo-card`;
    const shareData = {
      title: "কুয়াকাটা জেলা চাই - ফটো কার্ড",
      text: "আপনিও প্রতিবাদের ফটো কার্ড বানান — কুয়াকাটা জেলা চাই",
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch (e) {
      // user cancelled — fall through to copy
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("লিংক কপি হয়েছে!");
    } catch {
      toast.error("লিংক কপি করা যায়নি");
    }
  };

  const handleFacebookShare = () => {
    const url = `${window.location.origin}/photo-card`;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-red-950/20">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> হোম
          </Link>
          <h1 className="text-base sm:text-lg font-bold text-red-500">📸 ফটো কার্ড</h1>
          <button
            onClick={handleShare}
            className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-400 transition-colors"
            aria-label="Share"
          >
            <Share2 className="w-4 h-4" /> শেয়ার
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            কুয়াকাটা জেলা চাই
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            আপনার ছবি আপলোড করে প্রতিবাদের ফটো কার্ড বানান এবং সোশ্যাল মিডিয়ায় শেয়ার করুন
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button
              size="sm"
              onClick={handleShare}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Share2 className="w-4 h-4 mr-2" /> পেজ শেয়ার করুন
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleFacebookShare}
              className="border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
            >
              <Facebook className="w-4 h-4 mr-2" /> Facebook
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(`${window.location.origin}/photo-card`);
                toast.success("লিংক কপি হয়েছে!");
              }}
            >
              <Copy className="w-4 h-4 mr-2" /> লিংক কপি
            </Button>
          </div>
        </div>


        {/* Upload zone */}
        {!imageSrc && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className="border-2 border-dashed border-red-500/40 rounded-2xl p-12 text-center cursor-pointer hover:bg-red-500/5 transition-colors"
          >
            <ImageIcon className="w-16 h-16 mx-auto text-red-500/60 mb-4" />
            <p className="text-foreground font-semibold mb-1">ছবি আপলোড করুন</p>
            <p className="text-xs text-muted-foreground">JPG, PNG সর্বোচ্চ ১০MB</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        {/* Preview */}
        {imageSrc && (
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden border border-red-500/30 bg-black shadow-2xl relative select-none">
              <canvas
                ref={canvasRef}
                className="w-full h-auto block touch-none cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => {
                  (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
                  dragRef.current = {
                    active: true,
                    startX: e.clientX,
                    startY: e.clientY,
                    ox: offset.x,
                    oy: offset.y,
                  };
                }}
                onPointerMove={(e) => {
                  if (!dragRef.current.active) return;
                  const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
                  // Convert pixel drag to normalized offset (drag moves image, so invert)
                  const dx = (e.clientX - dragRef.current.startX) / rect.width;
                  const dy = (e.clientY - dragRef.current.startY) / rect.height;
                  // Scale factor: at zoom=1 there's nothing to pan; multiply by 2 for full range
                  const factor = 2.2;
                  setOffset({
                    x: Math.max(-1, Math.min(1, dragRef.current.ox - dx * factor)),
                    y: Math.max(-1, Math.min(1, dragRef.current.oy - dy * factor)),
                  });
                }}
                onPointerUp={(e) => {
                  dragRef.current.active = false;
                  (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
                }}
                onPointerCancel={() => { dragRef.current.active = false; }}
              />
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur text-white text-[10px] px-2 py-1 rounded-full pointer-events-none">
                ✋ ছবি টেনে সরান
              </div>
            </div>

            {/* Crop / Zoom controls */}
            <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-amber-400">🔍 জুম ও পজিশন</p>
                <button
                  onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}
                  className="text-[11px] px-2 py-1 rounded-full bg-background/50 text-foreground/70 border border-red-500/20 hover:border-red-500/50"
                >
                  রিসেট
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">−</span>
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-red-600"
                />
                <span className="text-xs text-muted-foreground">+</span>
                <span className="text-xs font-semibold text-red-400 w-10 text-right">{zoom.toFixed(1)}x</span>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                ছবিতে আঙুল/মাউস দিয়ে টেনে পজিশন ঠিক করুন
              </p>
            </div>

            {/* Slogan selector */}
            <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <p className="text-xs font-semibold text-amber-400">স্লোগান নির্বাচন করুন</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {SLOGAN_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSloganId(s.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      sloganId === s.id
                        ? "bg-red-600 text-white shadow-lg shadow-red-900/40 scale-105"
                        : "bg-background/50 text-foreground/70 border border-red-500/20 hover:border-red-500/50"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Format selector */}
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
                onClick={() => fileInputRef.current?.click()}
                className="border-red-500/40"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> অন্য ছবি
              </Button>
              <Button
                onClick={handleDownload}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" /> ডাউনলোড
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

export default PhotoCard;
