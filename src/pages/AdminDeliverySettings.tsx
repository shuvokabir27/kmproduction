import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Truck } from "lucide-react";
import { toast } from "sonner";
import { calculateDelivery, DEFAULT_DELIVERY } from "@/lib/delivery";

const AdminDeliverySettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...DEFAULT_DELIVERY });

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("delivery_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (data) {
        setId(data.id);
        setForm({
          base_weight_grams: Number(data.base_weight_grams),
          base_charge: Number(data.base_charge),
          extra_charge_per_kg: Number(data.extra_charge_per_kg),
          free_delivery_threshold: Number(data.free_delivery_threshold),
          free_delivery_enabled: !!data.free_delivery_enabled,
        });
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      if (id) {
        const { error } = await (supabase as any).from("delivery_settings").update({ ...form, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any).from("delivery_settings").insert(form).select("id").single();
        if (error) throw error;
        setId(data.id);
      }
      toast.success("সেভ হয়েছে");
    } catch (e: any) {
      toast.error(e.message || "সেভ করতে সমস্যা হয়েছে");
    } finally {
      setSaving(false);
    }
  };

  // Live preview
  const previews = [
    { name: "১ কেজি, ৫০০৳ অর্ডার", weight: 1000, sub: 500 },
    { name: "৩ কেজি, ১২০০৳ অর্ডার", weight: 3000, sub: 1200 },
    { name: "২ কেজি, ২৫০০৳ অর্ডার", weight: 2000, sub: 2500 },
  ];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-green-50 py-6 px-4" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/products")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> ফিরে যান
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-green-700" /> ডেলিভারি সেটিংস
          </h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>বেস ওজন (গ্রাম)</Label>
              <Input type="number" value={form.base_weight_grams}
                onChange={(e) => setForm(f => ({ ...f, base_weight_grams: Number(e.target.value) }))} />
              <p className="text-[11px] text-muted-foreground mt-1">এই ওজন পর্যন্ত বেস চার্জ (যেমন: ১০০০ = ১ কেজি)</p>
            </div>
            <div>
              <Label>বেস চার্জ (৳)</Label>
              <Input type="number" value={form.base_charge}
                onChange={(e) => setForm(f => ({ ...f, base_charge: Number(e.target.value) }))} />
              <p className="text-[11px] text-muted-foreground mt-1">বেস ওজন পর্যন্ত নির্দিষ্ট চার্জ</p>
            </div>
            <div>
              <Label>প্রতি অতিরিক্ত কেজির চার্জ (৳)</Label>
              <Input type="number" value={form.extra_charge_per_kg}
                onChange={(e) => setForm(f => ({ ...f, extra_charge_per_kg: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>ফ্রি ডেলিভারি টার্গেট (৳)</Label>
              <Input type="number" value={form.free_delivery_threshold}
                onChange={(e) => setForm(f => ({ ...f, free_delivery_threshold: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="flex items-center justify-between bg-green-50 rounded-xl p-4 border border-green-100">
            <div>
              <p className="font-bold text-green-900">ফ্রি ডেলিভারি অফার</p>
              <p className="text-xs text-green-700">টার্গেট অ্যামাউন্ট ক্রস করলে ডেলিভারি ফ্রি</p>
            </div>
            <Switch
              checked={form.free_delivery_enabled}
              onCheckedChange={(v) => setForm(f => ({ ...f, free_delivery_enabled: v }))}
            />
          </div>

          <Button onClick={save} disabled={saving} className="w-full bg-green-700 hover:bg-green-800 text-white h-11 gap-2">
            <Save className="h-4 w-4" /> {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
          </Button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6 mt-6">
          <h2 className="font-bold text-gray-800 mb-3">লাইভ প্রিভিউ</h2>
          <div className="space-y-2">
            {previews.map((p, i) => {
              const r = calculateDelivery(p.sub, p.weight, form);
              return (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  <span className="text-gray-700">{p.name}</span>
                  <span className={`font-bold ${r.isFree ? "text-green-700" : "text-gray-900"}`}>
                    {r.isFree ? "ফ্রি ডেলিভারি 🎉" : `৳${r.charge}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDeliverySettings;
