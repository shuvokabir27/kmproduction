import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Megaphone, Save } from "lucide-react";
import { toast } from "sonner";

/**
 * Admin-only editor for the top scrolling announcement (marquee) text.
 * Saves to public.marquee_settings (singleton). Realtime updates push to all dashboards.
 */
export function AdminMarqueeEditor() {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

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
    if (data) {
      setText(data.text || "");
      setEnabled(!!data.is_enabled);
    }
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { text: text.trim(), is_enabled: enabled };
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
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-purple-500/15 flex items-center justify-center">
          <Megaphone className="h-4 w-4 text-purple-300" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">টপ স্ক্রলিং অ্যানাউন্সমেন্ট</p>
          <p className="text-[11px] text-muted-foreground">
            এখানে যা লিখবেন তা সকল অ্যাডমিন, সদস্য ও ক্লায়েন্টের ড্যাশবোর্ডের উপরে স্ক্রল হবে।
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="marquee-enabled" className="text-xs text-muted-foreground">
            চালু
          </Label>
          <Switch id="marquee-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="যেমন: আজ রাত ৮টায় গুরুত্বপূর্ণ মিটিং..."
        rows={3}
        maxLength={500}
        className="resize-none"
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">{text.length}/500</span>
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
          <Save className="h-3.5 w-3.5" />
          {saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
        </Button>
      </div>
    </Card>
  );
}
