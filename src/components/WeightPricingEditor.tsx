import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Save, X, Weight, Tag, DollarSign,
} from "lucide-react";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

const WeightPricingEditor = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    weight_label: "",
    weight_kg: "",
    label: "",
    price: "",
    discount_price: "",
    sort_order: "0",
    is_active: true,
  });

  const { data: prices, isLoading } = useQuery({
    queryKey: ["weight-prices-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_weight_prices" as any)
        .select("*")
        .order("sort_order", { ascending: true });
      return (data ?? []) as any[];
    },
  });

  const resetForm = () => {
    setForm({ weight_label: "", weight_kg: "", label: "", price: "", discount_price: "", sort_order: "0", is_active: true });
    setEditing(null);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      weight_label: p.weight_label || "",
      weight_kg: String(p.weight_kg || ""),
      label: p.label || "",
      price: String(p.price || ""),
      discount_price: p.discount_price ? String(p.discount_price) : "",
      sort_order: String(p.sort_order || 0),
      is_active: p.is_active ?? true,
    });
  };

  const handleSave = async () => {
    if (!form.weight_label.trim() || !form.price) {
      toast.error("ওজন ও দাম দিন");
      return;
    }
    const payload = {
      weight_label: form.weight_label.trim(),
      weight_kg: Number(form.weight_kg) || 1,
      label: form.label.trim(),
      price: Number(form.price) || 0,
      discount_price: form.discount_price ? Number(form.discount_price) : null,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };

    if (editing) {
      const { error } = await supabase.from("product_weight_prices" as any).update(payload).eq("id", editing.id);
      if (error) { toast.error("আপডেট ব্যর্থ"); return; }
      toast.success("আপডেট হয়েছে");
    } else {
      const { error } = await supabase.from("product_weight_prices" as any).insert(payload);
      if (error) { toast.error("যুক্ত করা ব্যর্থ"); return; }
      toast.success("নতুন প্রাইস যুক্ত হয়েছে");
    }
    queryClient.invalidateQueries({ queryKey: ["weight-prices-admin"] });
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("মুছে ফেলতে চান?")) return;
    await supabase.from("product_weight_prices" as any).delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["weight-prices-admin"] });
    toast.success("মুছে ফেলা হয়েছে");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
          <Weight className="h-5 w-5 text-red-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">ওজন অনুযায়ী দাম</h2>
          <p className="text-xs text-muted-foreground">কতটুকুর দাম কত টাকা সেট করুন</p>
        </div>
      </div>

      {/* Add/Edit Form */}
      <div className="bg-card border border-border/50 rounded-xl p-4 space-y-4">
        <h3 className="font-bold text-sm text-foreground">
          {editing ? "✏️ এডিট করুন" : "➕ নতুন প্রাইস যুক্ত করুন"}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">ওজন (যেমন: ৫০০ গ্রাম)</Label>
            <Input value={form.weight_label} onChange={e => setForm({ ...form, weight_label: e.target.value })} placeholder="৫০০ গ্রাম" className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">কেজি সংখ্যা</Label>
            <Input type="number" step="0.1" value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: e.target.value })} placeholder="0.5" className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">লেবেল</Label>
            <Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="ফ্যামিলি প্যাক" className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">ক্রম</Label>
            <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">রেগুলার দাম (৳)</Label>
            <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="700" className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">অফার দাম (৳)</Label>
            <Input type="number" value={form.discount_price} onChange={e => setForm({ ...form, discount_price: e.target.value })} placeholder="490" className="h-9 text-sm" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
            <Label className="text-xs">সক্রিয়</Label>
          </div>
          <div className="flex gap-2">
            {editing && (
              <Button variant="ghost" size="sm" onClick={resetForm} className="gap-1 text-xs">
                <X className="h-3 w-3" /> বাতিল
              </Button>
            )}
            <Button size="sm" onClick={handleSave} className="gap-1 text-xs bg-red-600 hover:bg-red-700">
              <Save className="h-3 w-3" /> {editing ? "আপডেট" : "যুক্ত করুন"}
            </Button>
          </div>
        </div>
      </div>

      {/* Existing Prices */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">লোড হচ্ছে...</div>
      ) : !prices?.length ? (
        <div className="text-center py-8 text-muted-foreground text-sm">কোনো প্রাইস সেট করা হয়নি</div>
      ) : (
        <div className="space-y-2">
          {prices.map((p: any) => {
            const hasDiscount = p.discount_price && p.discount_price < p.price;
            return (
              <div key={p.id} className={`bg-card border rounded-xl p-4 ${p.is_active ? "border-border/50" : "border-red-500/20 opacity-60"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-red-500/10 flex flex-col items-center justify-center">
                      <span className="text-xs font-bold text-red-600">{p.weight_label}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">{p.weight_label}</span>
                        {p.label && <span className="text-[10px] bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded">{p.label}</span>}
                        {!p.is_active && <span className="text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded">নিষ্ক্রিয়</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {hasDiscount ? (
                          <>
                            <span className="text-xs line-through text-muted-foreground">৳{toBn(p.price)}</span>
                            <span className="text-sm font-bold text-red-600">৳{toBn(p.discount_price)}</span>
                            <span className="text-[10px] text-red-500">
                              {toBn(Math.round(((p.price - p.discount_price) / p.price) * 100))}% ছাড়
                            </span>
                          </>
                        ) : (
                          <span className="text-sm font-bold text-foreground">৳{toBn(p.price)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WeightPricingEditor;
