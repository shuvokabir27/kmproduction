import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Upload, Download, ArrowLeft, Image as ImageIcon, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const PROTEST_TEXT = "কুয়াকাটা জেলা চাই";
const SUBTITLE = "এটি একটি প্রতিবাদ";

const PhotoCard = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preload Bengali font for canvas rendering
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@500;700;900&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("শুধুমাত্র ছবি আপলোড করুন");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setImageSrc(e.target?.result as string);
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

      // Background
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, W, H);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Image area (top portion)
        const imgArea = { x: 40, y: 40, w: W - 80, h: 1000 };
        // Cover-fit
        const ir = img.width / img.height;
        const ar = imgArea.w / imgArea.h;
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (ir > ar) {
          sw = img.height * ar;
          sx = (img.width - sw) / 2;
        } else {
          sh = img.width / ar;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, imgArea.x, imgArea.y, imgArea.w, imgArea.h);

        // Red gradient overlay at bottom of image for text readability
        const grad = ctx.createLinearGradient(0, imgArea.y + imgArea.h - 200, 0, imgArea.y + imgArea.h);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(0,0,0,0.7)");
        ctx.fillStyle = grad;
        ctx.fillRect(imgArea.x, imgArea.y + imgArea.h - 200, imgArea.w, 200);

        // Red banner strip
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(0, 1060, W, 10);

        // Main protest text
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = '900 110px "Hind Siliguri", "Tiro Bangla", sans-serif';
        ctx.fillText(PROTEST_TEXT, W / 2, 1170);

        // Subtitle
        ctx.fillStyle = "#fca5a5";
        ctx.font = '500 42px "Hind Siliguri", "Tiro Bangla", sans-serif';
        ctx.fillText(SUBTITLE, W / 2, 1255);

        // Bottom red bar
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(0, 1310, W, 40);
        ctx.fillStyle = "#ffffff";
        ctx.font = '700 22px "Hind Siliguri", sans-serif';
        ctx.fillText("# কুয়াকাটা_জেলা_চাই", W / 2, 1330);

        resolve(canvas);
      };
      img.src = imageSrc;
    });
  };

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
  }, [imageSrc]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-red-950/20">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> হোম
          </Link>
          <h1 className="text-base sm:text-lg font-bold text-red-500">📸 ফটো কার্ড</h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
            কুয়াকাটা জেলা চাই
          </h2>
          <p className="text-sm text-muted-foreground">
            আপনার ছবি আপলোড করে প্রতিবাদের ফটো কার্ড বানান এবং সোশ্যাল মিডিয়ায় শেয়ার করুন
          </p>
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
            <div className="rounded-2xl overflow-hidden border border-red-500/30 bg-black shadow-2xl">
              <canvas
                ref={canvasRef}
                className="w-full h-auto block"
              />
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
