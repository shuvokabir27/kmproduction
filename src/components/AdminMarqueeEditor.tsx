import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Megaphone,
  Save,
  Sparkles,
  Plus,
  Trash2,
  Gauge,
  Bold,
  Italic,
  Underline,
} from "lucide-react";
import { toast } from "sonner";
import DOMPurify from "dompurify";

/**
 * New approach (segment-based):
 * - "বেস টেক্সট" = plain text shown as-is.
 * - "স্টাইলড বক্স" = অ্যাডমিন আলাদা বক্স যোগ করে, প্রতিটি বক্সের জন্য
 *   আলাদা টেক্সট, কালার, ব্যাকগ্রাউন্ড, ইফেক্ট সেট/ক্লিয়ার করা যায়।
 * - বেস টেক্সট-এর ভেতরে স্টাইলড বক্সের টেক্সট পাওয়া গেলে সেটিকে
 *   স্টাইলড স্প্যান দিয়ে রিপ্লেস করে চূড়ান্ত HTML বানানো হয়।
 * - বক্স আলাদা delete করা যায়, আবার add করা যায়।
 */

const EFFECTS: { key: string; label: string; cls: string }[] = [
  { key: "none", label: "কোনোটি না", cls: "" },
  { key: "glow", label: "Glow", cls: "mq-glow" },
  { key: "blink", label: "Blink", cls: "mq-blink" },
  { key: "pulse", label: "Pulse", cls: "mq-pulse" },
  { key: "shake", label: "Shake", cls: "mq-shake" },
  { key: "bounce", label: "Bounce", cls: "mq-bounce" },
  { key: "rainbow", label: "Rainbow", cls: "mq-rainbow" },
];

const SANITIZE_OPTS: any = {
  ALLOWED_TAGS: ["span", "b", "strong", "i", "em", "u", "br", "mark"],
  ALLOWED_ATTR: ["style", "class"],
  ALLOW_DATA_ATTR: false,
};

type Segment = {
  id: string;
  text: string;
  color: string;
  bg: string;
  effect: string; // class
  bold: boolean;
  italic: boolean;
  underline: boolean;
};

type Stored = {
  base: string;
  segments: Segment[];
};

const newSegment = (): Segment => ({
  id: Math.random().toString(36).slice(2, 10),
  text: "",
  color: "#22d3ee",
  bg: "",
  effect: "",
  bold: false,
  italic: false,
  underline: false,
});

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const segmentToSpan = (seg: Segment) => {
  const styles: string[] = [];
  if (seg.color) styles.push(`color: ${seg.color} !important`);
  if (seg.bg) {
    styles.push(`background-color: ${seg.bg} !important`);
    styles.push(`padding: 0 4px`);
    styles.push(`border-radius: 4px`);
  }
  const classes: string[] = [];
  if (seg.effect) classes.push(seg.effect);
  if (seg.bold) classes.push("mq-bold");
  if (seg.italic) classes.push("mq-italic");
  if (seg.underline) classes.push("mq-underline");

  const cls = classes.length ? ` class="${classes.join(" ")}"` : "";
  const sty = styles.length ? ` style="${styles.join("; ")}"` : "";
  return `<span${cls}${sty}>${escapeHtml(seg.text)}</span>`;
};

const buildHtml = (base: string, segments: Segment[]): string => {
  if (!base.trim() && segments.length === 0) return "";
  // If no base, just join segment spans
  if (!base.trim()) {
    return segments
      .filter((s) => s.text.trim())
      .map(segmentToSpan)
      .join(" ");
  }

  // Replace each segment's text inside base with its styled span.
  // Sort by length desc so longer matches replace first (avoids partial overlap).
  const sorted = [...segments]
    .filter((s) => s.text.trim())
    .sort((a, b) => b.text.length - a.text.length);

  let html = escapeHtml(base);
  for (const seg of sorted) {
    const escaped = escapeHtml(seg.text);
    if (!escaped) continue;
    const re = new RegExp(
      escaped.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "g"
    );
    html = html.replace(re, segmentToSpan(seg));
  }

  // Append any segment not present in base, at the end
  const appended = segments
    .filter((s) => s.text.trim() && !base.includes(s.text))
    .map(segmentToSpan)
    .join(" ");

  return appended ? `${html} ${appended}` : html;
};

// Try to parse legacy stored HTML back into base + segments.
const parseStored = (raw: string | null | undefined): Stored => {
  if (!raw) return { base: "", segments: [] };
  // Strip HTML to get plain base
  const tmp = document.createElement("div");
  tmp.innerHTML = raw;
  const text = tmp.textContent || "";
  return { base: text, segments: [] };
};

export function AdminMarqueeEditor() {
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [base, setBase] = useState("");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [speed, setSpeed] = useState<number>(35);

  const { data } = useQuery({
    queryKey: ["marquee-settings"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("marquee_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!data || loaded) return;
    setEnabled(!!data.is_enabled);
    if (typeof data.speed_seconds === "number" && data.speed_seconds > 0) {
      setSpeed(data.speed_seconds);
    }
    // Try parse JSON config from a hidden marker; fallback to plain text
    const raw: string = data.text || "";
    const marker = "<!--MQ_JSON:";
    const idx = raw.indexOf(marker);
    if (idx >= 0) {
      try {
        const end = raw.indexOf("-->", idx);
        const json = raw.slice(idx + marker.length, end);
        const parsed = JSON.parse(json) as Stored;
        setBase(parsed.base || "");
        setSegments(Array.isArray(parsed.segments) ? parsed.segments : []);
      } catch {
        const p = parseStored(raw);
        setBase(p.base);
        setSegments(p.segments);
      }
    } else {
      const p = parseStored(raw);
      setBase(p.base);
      setSegments(p.segments);
    }
    setLoaded(true);
  }, [data, loaded]);

  const finalHtml = useMemo(
    () => DOMPurify.sanitize(buildHtml(base, segments), SANITIZE_OPTS) as unknown as string,
    [base, segments]
  );

  const updateSegment = (id: string, patch: Partial<Segment>) => {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const addSegment = () => setSegments((prev) => [...prev, newSegment()]);
  const removeSegment = (id: string) =>
    setSegments((prev) => prev.filter((s) => s.id !== id));

  const handleSave = async () => {
    setSaving(true);
    try {
      const html = buildHtml(base, segments);
      const cleanHtml = (DOMPurify.sanitize(html, SANITIZE_OPTS) as unknown as string).trim();
      // Append a hidden JSON marker so we can roundtrip the editor state
      const stored = `${cleanHtml}<!--MQ_JSON:${JSON.stringify({ base, segments })}-->`;

      const payload = { text: stored, is_enabled: enabled, speed_seconds: speed };
      let error;
      if (data?.id) {
        ({ error } = await (supabase as any)
          .from("marquee_settings")
          .update(payload)
          .eq("id", data.id));
      } else {
        ({ error } = await (supabase as any)
          .from("marquee_settings")
          .insert(payload));
      }
      if (error) throw error;
      toast.success("স্ক্রলিং টেক্সট সংরক্ষিত হয়েছে");
      qc.invalidateQueries({ queryKey: ["marquee-settings"] });
    } catch (e: any) {
      toast.error(e?.message || "সংরক্ষণ ব্যর্থ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 bg-card border-border/50 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-purple-500/15 flex items-center justify-center">
          <Megaphone className="h-4 w-4 text-purple-300" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            টপ স্ক্রলিং অ্যানাউন্সমেন্ট
          </p>
          <p className="text-[11px] text-muted-foreground">
            বেস টেক্সট লিখুন, যে শব্দগুলো রঙিন/ইফেক্ট দিতে চান সেগুলো নিচে আলাদা বক্সে যোগ করুন।
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="marquee-enabled" className="text-xs text-muted-foreground">
            চালু
          </Label>
          <Switch id="marquee-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      {/* Base text */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">বেস টেক্সট (পুরো বার্তা)</Label>
        <Textarea
          value={base}
          onChange={(e) => setBase(e.target.value)}
          rows={3}
          placeholder="যেমন: আজ রাত ৯টায় নতুন এপিসোড আসছে — দেখতে ভুলবেন না!"
          className="text-sm"
        />
      </div>

      {/* Speed control */}
      <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border/40">
        <Gauge className="h-4 w-4 text-cyan-300 shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs text-muted-foreground">স্ক্রলিং স্পিড</Label>
            <span className="text-[11px] text-muted-foreground">
              {speed}s / লুপ {speed <= 15 ? "(দ্রুত)" : speed >= 60 ? "(ধীর)" : "(মাঝারি)"}
            </span>
          </div>
          <Slider
            min={5}
            max={120}
            step={1}
            value={[speed]}
            onValueChange={(v) => setSpeed(v[0] ?? 35)}
          />
        </div>
        <Input
          type="number"
          min={5}
          max={120}
          value={speed}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!isNaN(n)) setSpeed(Math.min(120, Math.max(5, n)));
          }}
          className="h-8 w-16 text-xs"
        />
      </div>

      {/* Segments list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">
            স্টাইলড বক্স ({segments.length}টি) — যে শব্দ এখানে লিখবেন, বেস টেক্সটে সেগুলো এই রঙ/ইফেক্টে দেখাবে
          </Label>
          <Button type="button" size="sm" variant="secondary" className="h-7 px-2 text-[11px]" onClick={addSegment}>
            <Plus className="h-3.5 w-3.5 mr-1" /> বক্স যোগ করুন
          </Button>
        </div>

        {segments.length === 0 && (
          <p className="text-[11px] text-muted-foreground italic px-1">
            কোনো বক্স নেই। "বক্স যোগ করুন" চাপুন এবং বেস টেক্সট থেকে কোনো শব্দ কপি করে বসান।
          </p>
        )}

        <div className="space-y-2">
          {segments.map((seg, idx) => {
            const matches = seg.text.trim() && base.includes(seg.text);
            return (
              <div
                key={seg.id}
                className="rounded-lg border border-border/50 bg-muted/20 p-2.5 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-muted-foreground w-6">
                    #{idx + 1}
                  </span>
                  <Input
                    value={seg.text}
                    onChange={(e) => updateSegment(seg.id, { text: e.target.value })}
                    placeholder="যে শব্দটি স্টাইল করতে চান (বেস থেকে কপি করে দিন)"
                    className="h-8 text-sm flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => removeSegment(seg.id)}
                    title="বক্স মুছুন"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Text color */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">রঙ</span>
                    <Input
                      type="color"
                      value={seg.color || "#ffffff"}
                      onChange={(e) => updateSegment(seg.id, { color: e.target.value })}
                      className="h-7 w-9 p-0.5 cursor-pointer"
                    />
                    {seg.color && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-1.5 text-[10px]"
                        onClick={() => updateSegment(seg.id, { color: "" })}
                      >
                        ক্লিয়ার
                      </Button>
                    )}
                  </div>

                  <span className="h-5 w-px bg-border/60" />

                  {/* BG */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">BG</span>
                    <Input
                      type="color"
                      value={seg.bg || "#000000"}
                      onChange={(e) => updateSegment(seg.id, { bg: e.target.value })}
                      className="h-7 w-9 p-0.5 cursor-pointer"
                    />
                    {seg.bg && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-1.5 text-[10px]"
                        onClick={() => updateSegment(seg.id, { bg: "" })}
                      >
                        ক্লিয়ার
                      </Button>
                    )}
                  </div>

                  <span className="h-5 w-px bg-border/60" />

                  {/* Bold/Italic/Underline */}
                  <Button
                    type="button"
                    size="sm"
                    variant={seg.bold ? "default" : "secondary"}
                    className="h-7 w-7 p-0"
                    onClick={() => updateSegment(seg.id, { bold: !seg.bold })}
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={seg.italic ? "default" : "secondary"}
                    className="h-7 w-7 p-0"
                    onClick={() => updateSegment(seg.id, { italic: !seg.italic })}
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={seg.underline ? "default" : "secondary"}
                    className="h-7 w-7 p-0"
                    onClick={() => updateSegment(seg.id, { underline: !seg.underline })}
                  >
                    <Underline className="h-3.5 w-3.5" />
                  </Button>

                  <span className="h-5 w-px bg-border/60" />

                  {/* Effect */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <Sparkles className="h-3.5 w-3.5 text-red-300" />
                    {EFFECTS.map((ef) => (
                      <Button
                        key={ef.key}
                        type="button"
                        size="sm"
                        variant={seg.effect === ef.cls ? "default" : "secondary"}
                        className="h-7 px-2 text-[10px]"
                        onClick={() => updateSegment(seg.id, { effect: ef.cls })}
                      >
                        {ef.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Per-segment preview */}
                <div className="text-[12px] px-2 py-1 rounded bg-background/50 border border-border/30">
                  <span className="text-[10px] text-muted-foreground mr-2">প্রিভিউ:</span>
                  {seg.text ? (
                    <span
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(segmentToSpan(seg), SANITIZE_OPTS) as unknown as string,
                      }}
                    />
                  ) : (
                    <span className="text-muted-foreground italic text-[11px]">
                      টেক্সট লিখুন
                    </span>
                  )}
                  {seg.text && !matches && (
                    <span className="ml-2 text-[10px] text-red-400">
                      ⚠ বেস টেক্সটে এই শব্দ নেই — শেষে যুক্ত হবে
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live preview — same look as the real top bar */}
      <div className="space-y-1.5">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">লাইভ প্রিভিউ</p>
        <div className="relative overflow-hidden rounded-lg border border-white/10">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, hsl(220 70% 18%) 0%, hsl(260 60% 22%) 35%, hsl(290 65% 28%) 65%, hsl(220 70% 18%) 100%)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-60 pointer-events-none animate-marquee-sheen"
            style={{
              background:
                "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)",
              backgroundSize: "200% 100%",
            }}
          />
          <div className="relative flex py-1.5">
            <div
              className="flex shrink-0 animate-marquee-x"
              style={{ animationDuration: `${speed}s` }}
            >
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-3 px-8 text-[13px] text-white/95 whitespace-nowrap"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                    <Megaphone className="h-3 w-3 text-white" />
                  </span>
                  <span
                    className="font-medium"
                    dangerouslySetInnerHTML={{
                      __html: finalHtml || "এখানে প্রিভিউ দেখাবে",
                    }}
                  />
                  <span className="text-white/40">•</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
          <Save className="h-3.5 w-3.5" />
          {saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
        </Button>
      </div>
    </Card>
  );
}
