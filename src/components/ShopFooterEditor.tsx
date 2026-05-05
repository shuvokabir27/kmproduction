import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

const FIELDS = [
  { key: "shop_name", label: "শপের নাম", placeholder: "কে এম শপ" },
  { key: "shop_tagline", label: "ট্যাগলাইন / সংক্ষিপ্ত বর্ণনা", placeholder: "কুয়াকাটার সেরা পণ্য সম্ভার...", textarea: true },
  { key: "contact_phone", label: "ফোন নম্বর", placeholder: "01XXXXXXXXX" },
  { key: "whatsapp_no", label: "WhatsApp নম্বর", placeholder: "8801XXXXXXXXX" },
  { key: "shop_email", label: "ইমেইল", placeholder: "info@example.com" },
  { key: "shop_address", label: "ঠিকানা", placeholder: "কুয়াকাটা, পটুয়াখালী" },
  { key: "shop_copyright", label: "কপিরাইট টেক্সট", placeholder: "কে এম শপ। সর্বস্বত্ব সংরক্ষিত।" },
] as const;

export default function ShopFooterEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from("site_settings").select("*").maybeSingle().then(({ data }) => {
      if (data) {
        setId(data.id);
        const next: Record<string, string> = {};
        FIELDS.forEach(f => { next[f.key] = (data as any)[f.key] ?? ""; });
        setForm(next);
      }
      setLoading(false);
    });
  }, []);

  const save = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from("site_settings").update(form).eq("id", id);
    setSaving(false);
    if (error) toast.error("সংরক্ষণ ব্যর্থ");
    else toast.success("ফুটার আপডেট হয়েছে");
  };

  if (loading) return <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="bg-card border rounded-2xl p-5 max-w-2xl">
      <h3 className="text-lg font-bold mb-1">ফুটার সেটিংস</h3>
      <p className="text-xs text-muted-foreground mb-4">প্রডাক্ট পেজের নিচের ফুটার এখান থেকে এডিট করুন</p>
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
