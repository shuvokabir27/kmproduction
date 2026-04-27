import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, RefreshCw, Sparkles, X, Cake } from "lucide-react";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BirthdayWishCardProps {
  member: {
    id: string;
    full_name: string;
    photo_url: string | null;
    designation?: string | null;
  };
  onClose?: () => void;
}

function bnNum(n: number | string): string {
  const map: Record<string, string> = { "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪", "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯" };
  return String(n).split("").map((c) => map[c] ?? c).join("");
}

export function BirthdayWishCard({ member, onClose }: BirthdayWishCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const fetchWish = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-birthday-wish", {
        body: {
          full_name: member.full_name,
          designation: member.designation ?? null,
          days_until: 0,
          member_id: member.id,
          seed: Date.now(),
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error("শুভেচ্ছা তৈরি করা যায়নি");
        setMessage(`প্রিয় ${member.full_name},\nশুভ জন্মদিন! 🎂🎉\nতোমার জীবন আনন্দ ও সাফল্যে ভরে উঠুক। 🌟`);
        return;
      }
      setMessage(data?.message ?? "");
    } catch (err: any) {
      toast.error("শুভেচ্ছা লোড করা যায়নি");
      setMessage(`প্রিয় ${member.full_name},\nশুভ জন্মদিন! 🎂🎉`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchWish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member.id]);

  const downloadPng = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      // Wait for fonts and images
      await document.fonts.ready;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
      });
      // Use Blob for reliable mobile download
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("ডাউনলোড করা যায়নি");
          setDownloading(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `birthday-${member.full_name.replace(/\s+/g, "-")}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast.success("ছবি ডাউনলোড হয়েছে! ফেসবুকে পোস্ট করুন 🎉");
        setDownloading(false);
      }, "image/png");
    } catch (err: any) {
      console.error(err);
      toast.error("ডাউনলোড ব্যর্থ হয়েছে");
      setDownloading(false);
    }
  };

  return (
    <div className="relative">
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-20 h-7 w-7 rounded-full bg-card border border-border/60 flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="বন্ধ করুন"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {/* 3D tilt wrapper */}
      <motion.div
        whileHover={{ rotateX: -4, rotateY: 6, scale: 1.02 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        style={{ perspective: 1200, transformStyle: "preserve-3d" }}
        className="mx-auto"
      >
        {/* The downloadable card */}
        <div
          ref={cardRef}
          className="relative rounded-2xl overflow-hidden mx-auto"
          style={{
            width: "100%",
            maxWidth: 420,
            background:
              "linear-gradient(135deg, #ec4899 0%, #a855f7 45%, #6366f1 100%)",
            padding: 18,
            boxShadow:
              "0 20px 50px -10px rgba(168,85,247,0.55), 0 8px 20px -6px rgba(236,72,153,0.4), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -2px 12px rgba(0,0,0,0.25)",
            transform: "translateZ(0)",
          }}
        >
          {/* Glossy top highlight */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 16,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.12) 25%, rgba(255,255,255,0) 55%)",
              pointerEvents: "none",
              mixBlendMode: "overlay",
            }}
          />
          {/* Diagonal glass shine */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: -40,
              left: -60,
              width: "70%",
              height: "180%",
              transform: "rotate(20deg)",
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0) 100%)",
              filter: "blur(8px)",
              pointerEvents: "none",
            }}
          />
          {/* Bottom inner glow */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 16,
              background:
                "radial-gradient(ellipse at 50% 110%, rgba(253,224,71,0.35) 0%, rgba(253,224,71,0) 55%)",
              pointerEvents: "none",
            }}
          />

          {/* Decorative confetti dots */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(24)].map((_, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${(i * 53) % 100}%`,
                  top: `${(i * 37) % 100}%`,
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: ["#fde047", "#f9a8d4", "#a5f3fc", "#fff"][i % 4],
                  opacity: 0.6,
                  boxShadow: "0 0 6px rgba(255,255,255,0.6)",
                }}
              />
            ))}
          </div>

          <div
            className="relative rounded-xl"
            style={{
              background:
                "linear-gradient(160deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.35)",
              padding: 16,
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.25)",
              transform: "translateZ(20px)",
            }}
          >
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 36,
                  lineHeight: 1,
                  filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))",
                }}
              >
                🎂🎉
              </div>
              <div
                style={{
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 22,
                  marginTop: 6,
                  textShadow:
                    "0 2px 8px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.5)",
                  fontFamily: "'Tiro Bangla', 'Hind Siliguri', serif",
                  background:
                    "linear-gradient(180deg, #ffffff 0%, #fde047 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                শুভ জন্মদিন
              </div>
            </div>

            {/* Photo with glossy ring */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <div
                style={{
                  position: "relative",
                  width: 118,
                  height: 118,
                  borderRadius: "50%",
                  padding: 4,
                  background:
                    "conic-gradient(from 0deg, #fde047, #f9a8d4, #a5f3fc, #fde047)",
                  boxShadow:
                    "0 10px 28px rgba(0,0,0,0.45), 0 0 0 2px rgba(255,255,255,0.4), inset 0 1px 0 rgba(255,255,255,0.6)",
                  transform: "translateZ(30px)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    overflow: "hidden",
                    position: "relative",
                    background: "#fff",
                  }}
                >
                  {member.photo_url ? (
                    <img
                      src={member.photo_url}
                      alt={member.full_name}
                      crossOrigin="anonymous"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 44,
                        fontWeight: 800,
                        color: "#a855f7",
                        background: "#fff",
                      }}
                    >
                      {member.full_name.charAt(0)}
                    </div>
                  )}
                  {/* Glossy reflection on photo */}
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.1) 35%, rgba(255,255,255,0) 55%)",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Name */}
            <div
              style={{
                textAlign: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 20,
                marginBottom: 4,
                textShadow:
                  "0 2px 8px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.4)",
                fontFamily: "'Tiro Bangla', 'Hind Siliguri', serif",
              }}
            >
              {member.full_name}
            </div>
            {member.designation && (
              <div
                style={{
                  textAlign: "center",
                  color: "#fde047",
                  fontSize: 12,
                  marginBottom: 10,
                  fontWeight: 600,
                  fontFamily: "'Tiro Bangla', 'Hind Siliguri', serif",
                  textShadow: "0 1px 4px rgba(0,0,0,0.4)",
                }}
              >
                {member.designation}
              </div>
            )}

            {/* Message with glossy panel */}
            <div
              style={{
                position: "relative",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.88) 100%)",
                borderRadius: 12,
                padding: 14,
                minHeight: 100,
                marginTop: 8,
                boxShadow:
                  "0 8px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(0,0,0,0.08)",
                overflow: "hidden",
              }}
            >
              {/* Top gloss strip */}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "40%",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)",
                  pointerEvents: "none",
                }}
              />
              {loading ? (
                <div style={{ textAlign: "center", color: "#a855f7", padding: 20, fontSize: 13, position: "relative" }}>
                  ✨ AI বার্তা তৈরি করছে...
                </div>
              ) : (
                <p
                  style={{
                    color: "#1f2937",
                    fontSize: 14,
                    lineHeight: 1.7,
                    fontWeight: 500,
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    fontFamily: "'Tiro Bangla', 'Hind Siliguri', serif",
                    textAlign: "center",
                    position: "relative",
                  }}
                >
                  {message}
                </p>
              )}
            </div>

            {/* Footer brand */}
            <div
              style={{
                textAlign: "center",
                marginTop: 12,
                color: "rgba(255,255,255,0.95)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.5,
                textShadow: "0 1px 4px rgba(0,0,0,0.4)",
                lineHeight: 1.4,
              }}
            >
              🎉 জন্মদিনের শুভেচ্ছা<br />
              <span style={{ fontSize: 10, opacity: 0.95 }}>কুয়াকাটা মাল্টিমিডিয়া পরিবারের পক্ষ থেকে ❤️</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Action buttons (NOT inside card so won't be in PNG) */}
      <div className="flex items-center gap-2 mt-3 max-w-[420px] mx-auto">
        <button
          onClick={fetchWish}
          disabled={loading}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-card hover:bg-muted border border-border/50 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          নতুন বার্তা
        </button>
        <button
          onClick={downloadPng}
          disabled={downloading || loading}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white text-xs font-bold transition-opacity disabled:opacity-50"
        >
          <Download className={`h-3.5 w-3.5 ${downloading ? "animate-bounce" : ""}`} />
          {downloading ? "ডাউনলোড হচ্ছে..." : "PNG ডাউনলোড"}
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-1.5">
        📱 ডাউনলোড করে ফেসবুকে পোস্ট করুন
      </p>
    </div>
  );
}
