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

      {/* The downloadable card */}
      <div
        ref={cardRef}
        className="relative rounded-2xl overflow-hidden mx-auto"
        style={{
          width: "100%",
          maxWidth: 420,
          background: "linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #6366f1 100%)",
          padding: 18,
        }}
      >
        {/* Decorative confetti dots */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
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
                opacity: 0.55,
              }}
            />
          ))}
        </div>

        <div
          className="relative rounded-xl"
          style={{
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.25)",
            padding: 16,
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 36, lineHeight: 1 }}>🎂🎉</div>
            <div
              style={{
                color: "#fff",
                fontWeight: 800,
                fontSize: 22,
                marginTop: 6,
                textShadow: "0 2px 8px rgba(0,0,0,0.3)",
                fontFamily: "'Tiro Bangla', 'Hind Siliguri', serif",
              }}
            >
              শুভ জন্মদিন
            </div>
          </div>

          {/* Photo */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: "50%",
                overflow: "hidden",
                border: "4px solid #fde047",
                boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
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
              textShadow: "0 2px 8px rgba(0,0,0,0.3)",
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
              }}
            >
              {member.designation}
            </div>
          )}

          {/* Message */}
          <div
            style={{
              background: "rgba(255,255,255,0.92)",
              borderRadius: 12,
              padding: 14,
              minHeight: 100,
              marginTop: 8,
            }}
          >
            {loading ? (
              <div style={{ textAlign: "center", color: "#a855f7", padding: 20, fontSize: 13 }}>
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
              color: "rgba(255,255,255,0.85)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            ❤️ KM PRODUCTION
          </div>
        </div>
      </div>

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
