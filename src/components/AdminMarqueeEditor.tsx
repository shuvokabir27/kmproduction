import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Megaphone,
  Save,
  Bold,
  Italic,
  Underline,
  Sparkles,
  Eraser,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import DOMPurify from "dompurify";

/**
 * Rich admin editor for the top scrolling announcement.
 *
 * Admin selects part of the text and applies:
 *  - any color (color picker)
 *  - any background color
 *  - bold / italic / underline
 *  - effects: blink / pulse / glow / rainbow / shake / bounce
 *
 * Storage = sanitized HTML in public.marquee_settings.text.
 * A live preview shows exactly what users will see in the scrolling bar.
 */

const EFFECTS: { key: string; label: string; cls: string }[] = [
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

export function AdminMarqueeEditor() {
  const qc = useQueryClient();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [html, setHtml] = useState<string>("");
  const [color, setColor] = useState("#22d3ee");
  const [bg, setBg] = useState("#7c3aed");
  const [loaded, setLoaded] = useState(false);

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

  // Initial load — only set editor content once to avoid clobbering caret while typing
  useEffect(() => {
    if (!data || loaded) return;
    setEnabled(!!data.is_enabled);
    const initial = DOMPurify.sanitize(data.text || "", SANITIZE_OPTS) as unknown as string;
    setHtml(initial);
    if (editorRef.current) editorRef.current.innerHTML = initial;
    setLoaded(true);
  }, [data, loaded]);

  const previewHtml = useMemo(
    () => DOMPurify.sanitize(html, SANITIZE_OPTS) as unknown as string,
    [html]
  );

  // ---- Selection helpers ----
  // Save the last non-collapsed range from inside the editor so toolbar
  // clicks (which steal focus) can still apply formatting to the selection.
  const savedRangeRef = useRef<Range | null>(null);

  const captureSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (
      range.collapsed ||
      !editorRef.current ||
      !editorRef.current.contains(range.commonAncestorContainer)
    ) {
      return;
    }
    savedRangeRef.current = range.cloneRange();
  };

  const wrapSelection = (
    styleAttr?: Partial<CSSStyleDeclaration>,
    className?: string
  ) => {
    const range = savedRangeRef.current;
    if (!range) {
      toast.info("আগে কিছু টেক্সট সিলেক্ট করুন");
      return;
    }
    if (
      !editorRef.current ||
      !editorRef.current.contains(range.commonAncestorContainer)
    ) {
      toast.info("এডিটরের ভেতরে সিলেক্ট করুন");
      return;
    }

    const span = document.createElement("span");
    if (className) span.className = className;
    if (styleAttr) {
      Object.entries(styleAttr).forEach(([k, v]) => {
        if (v !== undefined && v !== "") {
          span.style.setProperty(
            // camelCase -> kebab-case for setProperty
            k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()),
            String(v),
            "important"
          );
        }
      });
    }
    try {
      span.appendChild(range.extractContents());
      range.insertNode(span);

      // Re-select the new span so the user can chain effects
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        sel.addRange(newRange);
        savedRangeRef.current = newRange.cloneRange();
      }
    } catch (e) {
      console.error("wrapSelection failed", e);
    }
    syncFromEditor();
  };

  const syncFromEditor = () => {
    if (!editorRef.current) return;
    const next = DOMPurify.sanitize(editorRef.current.innerHTML, SANITIZE_OPTS) as unknown as string;
    setHtml(next);
  };

  const clearFormatting = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      // Clear all if nothing selected
      if (editorRef.current) {
        const text = editorRef.current.innerText;
        editorRef.current.innerHTML = "";
        editorRef.current.textContent = text;
        syncFromEditor();
      }
      return;
    }
    const range = sel.getRangeAt(0);
    const text = range.toString();
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    sel.removeAllRanges();
    syncFromEditor();
  };

  // ---- Save ----
  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanHtml = (DOMPurify.sanitize(
        editorRef.current?.innerHTML || html,
        SANITIZE_OPTS
      ) as unknown as string).trim();

      const payload = { text: cleanHtml, is_enabled: enabled };
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
    <Card className="p-4 bg-card border-border/50 space-y-3">
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
            টেক্সট সিলেক্ট করে রঙ ও ইফেক্ট দিন। নিচে লাইভ প্রিভিউ দেখুন।
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label
            htmlFor="marquee-enabled"
            className="text-xs text-muted-foreground"
          >
            চালু
          </Label>
          <Switch
            id="marquee-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/40">
        {/* Text color */}
        <div className="flex items-center gap-1.5">
          <Type className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-7 w-9 p-0.5 cursor-pointer"
            title="টেক্সট রঙ"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 px-2 text-[11px]"
            onClick={() => wrapSelection({ color })}
          >
            রঙ দিন
          </Button>
        </div>

        <span className="h-5 w-px bg-border/60" />

        {/* Background color */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">BG</span>
          <Input
            type="color"
            value={bg}
            onChange={(e) => setBg(e.target.value)}
            className="h-7 w-9 p-0.5 cursor-pointer"
            title="ব্যাকগ্রাউন্ড রঙ"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 px-2 text-[11px]"
            onClick={() =>
              wrapSelection({
                backgroundColor: bg,
                padding: "0 4px",
                borderRadius: "4px",
              })
            }
          >
            BG দিন
          </Button>
        </div>

        <span className="h-5 w-px bg-border/60" />

        {/* Style toggles */}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 w-7 p-0"
          title="Bold"
          onClick={() => wrapSelection(undefined, "mq-bold")}
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 w-7 p-0"
          title="Italic"
          onClick={() => wrapSelection(undefined, "mq-italic")}
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 w-7 p-0"
          title="Underline"
          onClick={() => wrapSelection(undefined, "mq-underline")}
        >
          <Underline className="h-3.5 w-3.5" />
        </Button>

        <span className="h-5 w-px bg-border/60" />

        {/* Effects */}
        <div className="flex items-center gap-1 flex-wrap">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          {EFFECTS.map((ef) => (
            <Button
              key={ef.key}
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-[11px]"
              onClick={() => wrapSelection(undefined, ef.cls)}
              title={ef.label}
            >
              {ef.label}
            </Button>
          ))}
        </div>

        <span className="h-5 w-px bg-border/60" />

        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px]"
          onClick={clearFormatting}
          title="ফরম্যাট মুছুন"
        >
          <Eraser className="h-3.5 w-3.5 mr-1" />
          ক্লিয়ার
        </Button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={syncFromEditor}
        className="min-h-[80px] max-h-[200px] overflow-auto p-3 rounded-lg bg-background border border-border/60 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40"
        data-placeholder="এখানে টেক্সট লিখুন, তারপর শব্দ সিলেক্ট করে উপরের রঙ/ইফেক্ট অ্যাপ্লাই করুন..."
      />

      {/* Live preview — same look as the real top bar */}
      <div className="space-y-1.5">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          লাইভ প্রিভিউ
        </p>
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
            <div className="flex shrink-0 animate-marquee-x">
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
                      __html: previewHtml || "এখানে প্রিভিউ দেখাবে",
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
        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className="gap-1.5"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
        </Button>
      </div>
    </Card>
  );
}
