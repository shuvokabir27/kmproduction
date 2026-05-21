import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

type Field = { key: string; label: string; placeholder: string; textarea?: boolean };
const FIELDS: Field[] = [
  { key: "shop_name", label: "শপের নাম", placeholder: "কে এম শপ" },
  { key: "shop_tagline", label: "ট্যাগলাইন / সংক্ষিপ্ত বর্ণনা", placeholder: "কুয়াকাটার সেরা পণ্য সম্ভার...", textarea: true },
  { key: "contact_phone", label: "ফোন নম্বর", placeholder: "01XXXXXXXXX" },
  { key: "whatsapp_no", label: "WhatsApp নম্বর", placeholder: "8801XXXXXXXXX" },
  { key: "shop_email", label: "ইমেইল", placeholder: "info@example.com" },
  { key: "shop_address", label: "ঠিকানা", placeholder: "কুয়াকাটা, পটুয়াখালী" },
  { key: "shop_copyright", label: "কপিরাইট টেক্সট", placeholder: "কে এম শপ। সর্বস্বত্ব সংরক্ষিত।" },
];

export default function ShopFooterEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    supabase.from("site_settings").select("*").maybeSingle().then(({ data }) => {
      if (data) {
        setId(data.id);
        const next: Record<string, any> = {};
        FIELDS.forEach(f => { next[f.key] = (data as any)[f.key] ?? ""; });
        next.top_strip_text = (data as any).top_strip_text ?? "";
        next.top_strip_enabled = (data as any).top_strip_enabled ?? true;
        next.top_strip_speed = (data as any).top_strip_speed ?? 30;
        setForm(next);
      }
      setLoading(false);
    });
  }, []);

  const save = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from("site_settings").update(form as any).eq("id", id);
    setSaving(false);
    if (error) toast.error("সংরক্ষণ ব্যর্থ");
    else toast.success("সেটিংস আপডেট হয়েছে");
  };

  if (loading) return <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="bg-card border rounded-2xl p-5 max-w-2xl">
      <h3 className="text-lg font-bold mb-1">ফুটার ও টপ স্ট্রিপ সেটিংস</h3>
      <p className="text-xs text-muted-foreground mb-4">প্রডাক্ট পেজের ফুটার এবং উপরের স্ক্রলিং বার এখান থেকে এডিট করুন</p>

      {/* Scrolling Top Strip Section */}
      <div className="border rounded-xl p-4 mb-5 bg-muted/30">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Label className="text-sm font-bold">উপরের স্ক্রলিং বার</Label>
            <p className="text-[11px] text-muted-foreground">হেডারের উপরে চলমান টেক্সট</p>
          </div>
          <Switch
            checked={!!form.top_strip_enabled}
            onCheckedChange={(v) => setForm(s => ({ ...s, top_strip_enabled: v }))}
          />
        </div>
        <Label className="text-xs font-semibold mb-1.5 block">স্ক্রলিং টেক্সট</Label>
        <Textarea
          value={form.top_strip_text || ""}
          onChange={e => setForm(s => ({ ...s, top_strip_text: e.target.value }))}
          placeholder="আমাদের যে কোন পণ্য অর্ডার করতে WhatsApp অথবা কল করুন।"
          rows={2}
        />
        <Label className="text-xs font-semibold mb-1.5 mt-3 block">স্ক্রল স্পিড (সেকেন্ড) — কম মান = দ্রুত</Label>
        <Input
          type="number"
          min={5}
          max={120}
          value={form.top_strip_speed ?? 30}
          onChange={e => setForm(s => ({ ...s, top_strip_speed: Number(e.target.value) || 30 }))}
        />
      </div>

      <div className="space-y-4">
        {FIELDS.map(f => (
          <div key={f.key}>
            <Label className="text-sm font-semibold mb-1.5 block">{f.label}</Label>
            {f.textarea ? (
              <Textarea
                value={form[f.key] || ""}
                onChange={e => setForm(s => ({ ...s, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                rows={2}
              />
            ) : (
              <Input
                value={form[f.key] || ""}
                onChange={e => setForm(s => ({ ...s, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
              />
            )}
          </div>
        ))}
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          সংরক্ষণ করুন
        </Button>
      </div>
    </div>
  );
}
