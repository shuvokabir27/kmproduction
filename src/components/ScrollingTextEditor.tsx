import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save, Megaphone } from "lucide-react";

export default function ScrollingTextEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [speed, setSpeed] = useState(30);

  useEffect(() => {
    supabase.from("site_settings").select("*").maybeSingle().then(({ data }) => {
      if (data) {
        setId(data.id);
        setText((data as any).top_strip_text ?? "");
        setEnabled((data as any).top_strip_enabled ?? true);
        setSpeed((data as any).top_strip_speed ?? 30);
      }
      setLoading(false);
    });
  }, []);

  const save = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .update({ top_strip_text: text, top_strip_enabled: enabled, top_strip_speed: speed } as any)
      .eq("id", id);
    setSaving(false);
    if (error) toast.error("সংরক্ষণ ব্যর্থ");
    else toast.success("স্ক্রলিং টেক্সট আপডেট হয়েছে");
  };

  if (loading) return <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="bg-card border rounded-2xl p-5 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Megaphone className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold">স্ক্রলিং টেক্সট কন্ট্রোল</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">প্রডাক্ট পেজের হেডারের উপরে চলমান টেক্সট এখান থেকে নিয়ন্ত্রণ করুন</p>

      <div className="border rounded-xl p-4 bg-muted/30 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-bold">স্ক্রলিং চালু/বন্ধ</Label>
            <p className="text-[11px] text-muted-foreground">টেক্সট দেখাবে কি না</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div>
          <Label className="text-xs font-semibold mb-1.5 block">স্ক্রলিং টেক্সট</Label>
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="আমাদের যে কোন পণ্য অর্ডার করতে WhatsApp অথবা কল করুন।"
            rows={3}
          />
        </div>

        <div>
          <Label className="text-xs font-semibold mb-1.5 block">স্ক্রল স্পিড (সেকেন্ড) — কম মান = দ্রুত</Label>
          <Input
            type="number"
            min={5}
            max={120}
            value={speed}
            onChange={e => setSpeed(Number(e.target.value) || 30)}
          />
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="gap-2 mt-4">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        সংরক্ষণ করুন
      </Button>
    </div>
  );
}
