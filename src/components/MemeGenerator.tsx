import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Download, Share2, Sparkles, RefreshCw, Laugh } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Member = {
  id: string;
  full_name: string;
  designation?: string | null;
  photo_url?: string | null;
};

type Meme = {
  id: string;
  member_id: string;
  member_name: string;
  photo_url: string | null;
  caption: string;
  created_at: string;
};

interface MemeGeneratorProps {
  mode?: "public" | "member";
  className?: string;
}

export function MemeGenerator({ mode = "public", className }: MemeGeneratorProps) {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: members = [] } = useQuery({
    queryKey: ["meme-members"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_profiles");
      if (error) throw error;
      return (data || [])
        .filter((m: any) => m.photo_url)
        .map((m: any) => ({
          id: m.id,
          full_name: m.full_name,
          designation: m.designation,
          photo_url: m.photo_url,
        })) as Member[];
    },
  });

  const { data: memes = [] } = useQuery({
    queryKey: ["memes-feed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data || []) as Meme[];
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (mode !== "public" || members.length === 0) return;
    const seedTimer = setTimeout(() => {
      if (memes.length < 3) generateNew(true);
    }, 1500);
    const interval = setInterval(() => generateNew(true), 60_000);
    return () => {
      clearTimeout(seedTimer);
      clearInterval(interval);
    };
  }, [members.length, mode]);

  useEffect(() => {
    if (memes.length < 2) return;
    const t = setInterval(() => setActiveIdx((i) => (i + 1) % memes.length), 7000);
    return () => clearInterval(t);
  }, [memes.length]);

  const generateNew = async (silent = false) => {
    if (members.length === 0) return;
    if (generating) return;
    setGenerating(true);
    try {
      const m = members[Math.floor(Math.random() * members.length)];
      const { data, error } = await supabase.functions.invoke("generate-meme", {
        body: {
          member_id: m.id,
          member_name: m.full_name,
          designation: m.designation || "",
          photo_url: m.photo_url || "",
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      await qc.invalidateQueries({ queryKey: ["memes-feed"] });
      setActiveIdx(0);
      if (!silent) toast.success("নতুন মিম তৈরি হলো! 🎉");
    } catch (e: any) {
      if (!silent) toast.error(e?.message || "মিম তৈরি ব্যর্থ");
    } finally {
      setGenerating(false);
    }
  };

  const renderMemeToCanvas = async (meme: Meme): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const W = 800, H = 800;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "#0f172a");
      grad.addColorStop(1, "#1e1b4b");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      const drawCaption = () => {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, H - 200, W, 200);

        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = "bold 38px 'Tiro Bangla', 'Hind Siliguri', serif";
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 8;

        const words = meme.caption.split(" ");
        const lines: string[] = [];
        let line = "";
        for (const w of words) {
          const test = line ? line + " " + w : w;
          if (ctx.measureText(test).width > W - 80) {
            if (line) lines.push(line);
            line = w;
          } else line = test;
        }
        if (line) lines.push(line);
        const startY = H - 180 + (200 - lines.length * 48) / 2 + 30;
        lines.slice(0, 4).forEach((ln, i) => ctx.fillText(ln, W / 2, startY + i * 48));
        ctx.shadowBlur = 0;

        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText("KM Production", W - 20, 30);

        ctx.fillStyle = "rgba(34,211,238,0.9)";
        ctx.font = "bold 22px 'Tiro Bangla', sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(meme.member_name, 30, 40);

        canvas.toBlob((b) => resolve(b), "image/png");
      };

      if (meme.photo_url) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const targetH = H - 200;
          const scale = Math.max(W / img.width, targetH / img.height);
          const dw = img.width * scale;
          const dh = img.height * scale;
          const dx = (W - dw) / 2;
          const dy = (targetH - dh) / 2;
          ctx.drawImage(img, dx, dy, dw, dh);
          drawCaption();
        };
        img.onerror = () => drawCaption();
        img.src = meme.photo_url;
      } else {
        drawCaption();
      }
    });
  };

  const handleDownload = async (meme: Meme) => {
    const blob = await renderMemeToCanvas(meme);
    if (!blob) return toast.error("ডাউনলোড ব্যর্থ");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meme-${meme.member_name}-${meme.id.slice(0, 6)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("মিম ডাউনলোড হয়েছে! 📥");
  };

  const handleShare = async (meme: Meme) => {
    const blob = await renderMemeToCanvas(meme);
    if (!blob) return;
    const file = new File([blob], `meme.png`, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "KM Production Meme", text: meme.caption });
      } catch {}
    } else {
      handleDownload(meme);
    }
  };

  const current = memes[activeIdx];

  return (
    <section className={className}>
      <div className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-950/40 via-purple-950/30 to-indigo-950/40 backdrop-blur p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center">
              <Laugh className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-bold text-fuchsia-100">মিম জেনারেটর 🎭</h3>
              <p className="text-xs text-fuchsia-300/70">AI দিয়ে তৈরি — শুধুই মজার জন্য</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => generateNew(false)}
            disabled={generating || members.length === 0}
            className="border-fuchsia-500/40 hover:bg-fuchsia-500/20 text-fuchsia-100"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span className="ml-1 hidden sm:inline">নতুন মিম</span>
          </Button>
        </div>

        {!current ? (
          <div className="aspect-square max-w-sm mx-auto rounded-xl border border-dashed border-fuchsia-500/30 flex flex-col items-center justify-center gap-2 text-fuchsia-300/60">
            <Laugh className="w-10 h-10 opacity-40" />
            <p className="text-sm">এখনো কোনো মিম নেই</p>
            <Button size="sm" onClick={() => generateNew(false)} disabled={generating || members.length === 0}>
              {generating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
              প্রথম মিম তৈরি করো
            </Button>
          </div>
        ) : (
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                ref={cardRef}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.4 }}
                className="relative max-w-sm mx-auto rounded-xl overflow-hidden bg-slate-900 shadow-2xl shadow-fuchsia-500/20"
              >
                <div className="relative aspect-square">
                  {current.photo_url ? (
                    <img
                      src={current.photo_url}
                      alt={current.member_name}
                      className="absolute inset-0 w-full h-full object-cover"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-700 to-fuchsia-700" />
                  )}
                  <div className="absolute top-2 left-2 px-2 py-1 rounded bg-cyan-500/90 text-white text-xs font-bold" style={{ fontFamily: "'Tiro Bangla', serif" }}>
                    {current.member_name}
                  </div>
                  <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/50 text-white/80 text-[10px]">
                    KM Production
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-10">
                    <p
                      className="text-white text-center font-bold text-lg md:text-xl leading-snug drop-shadow-lg"
                      style={{ fontFamily: "'Tiro Bangla', 'Hind Siliguri', serif" }}
                    >
                      {current.caption}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-center gap-2 mt-3">
              <Button size="sm" variant="secondary" onClick={() => handleDownload(current)}>
                <Download className="w-4 h-4 mr-1" /> ডাউনলোড
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleShare(current)}>
                <Share2 className="w-4 h-4 mr-1" /> শেয়ার
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setActiveIdx((i) => (i + 1) % memes.length)}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {memes.length > 1 && (
              <div className="flex justify-center gap-1 mt-2">
                {memes.slice(0, 10).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIdx(i)}
                    className={`h-1.5 rounded-full transition-all ${i === activeIdx ? "w-6 bg-fuchsia-400" : "w-1.5 bg-fuchsia-500/30"}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
