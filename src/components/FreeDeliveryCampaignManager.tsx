import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Truck, Package, Layers } from "lucide-react";

type Campaign = {
  id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  max_orders_per_phone: number;
  starts_at: string;
  ends_at: string | null;
};

type Tier = { id: string; campaign_id: string; label: string; required_products: number; reward_text: string | null; sort_order: number };
type Cp = { id: string; campaign_id: string; product_id: string };

export default function FreeDeliveryCampaignManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "ফ্রি ডেলিভারি অফার", description: "", max_orders_per_phone: 1, is_active: true });

  const { data: campaigns = [] } = useQuery({
    queryKey: ["fd-campaigns"],
    queryFn: async () => {
      const { data } = await supabase.from("free_delivery_campaigns" as any).select("*").order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["fd-products-pool"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id,name,image_url,price,discount_price,is_active").eq("is_active", true).order("name");
      return data ?? [];
    },
  });

  const reset = () => {
    setEditing(null);
    setForm({ title: "ফ্রি ডেলিভারি অফার", description: "", max_orders_per_phone: 1, is_active: true });
  };

  const openCreate = () => { reset(); setOpen(true); };
  const openEdit = (c: Campaign) => {
    setEditing(c);
    setForm({ title: c.title, description: c.description ?? "", max_orders_per_phone: c.max_orders_per_phone, is_active: c.is_active });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("শিরোনাম দিন");
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      max_orders_per_phone: Math.max(1, Number(form.max_orders_per_phone) || 1),
      is_active: form.is_active,
    };
    if (editing) {
      const { error } = await supabase.from("free_delivery_campaigns" as any).update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("free_delivery_campaigns" as any).insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("সংরক্ষণ হয়েছে");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["fd-campaigns"] });
  };

  const remove = async (id: string) => {
    if (!confirm("ক্যাম্পেইন মুছে ফেলবেন?")) return;
    const { error } = await supabase.from("free_delivery_campaigns" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["fd-campaigns"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Truck className="h-5 w-5" /> ফ্রি ডেলিভারি ক্যাম্পেইন</h2>
          <p className="text-xs text-muted-foreground">গ্রাহক নির্দিষ্ট সংখ্যক প্রডাক্ট নিলে ফ্রি ডেলিভারি পাবে</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> নতুন ক্যাম্পেইন</Button>
      </div>

      {campaigns.length === 0 && (
        <div className="text-center py-10 text-muted-foreground border border-dashed rounded-xl">কোনো ক্যাম্পেইন নেই</div>
      )}

      <div className="space-y-3">
        {campaigns.map((c: Campaign) => (
          <CampaignRow key={c.id} c={c} products={products} onEdit={() => openEdit(c)} onDelete={() => remove(c.id)} />
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "ক্যাম্পেইন এডিট" : "নতুন ক্যাম্পেইন"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>শিরোনাম</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>বর্ণনা</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>একই মোবাইল কতবার অর্ডার করতে পারবে</Label>
              <Input type="number" min={1} value={form.max_orders_per_phone} onChange={(e) => setForm({ ...form, max_orders_per_phone: Number(e.target.value) })} />
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><span className="text-sm">সক্রিয়</span></div>
            <Button onClick={save} className="w-full">সংরক্ষণ</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CampaignRow({ c, products, onEdit, onDelete }: { c: Campaign; products: any[]; onEdit: () => void; onDelete: () => void }) {
  const qc = useQueryClient();
  const { data: tiers = [] } = useQuery({
    queryKey: ["fd-tiers", c.id],
    queryFn: async () => {
      const { data } = await supabase.from("free_delivery_campaign_tiers" as any).select("*").eq("campaign_id", c.id).order("required_products");
      return ((data as unknown) as Tier[]) ?? [];
    },
  });
  const { data: cps = [] } = useQuery({
    queryKey: ["fd-cps", c.id],
    queryFn: async () => {
      const { data } = await supabase.from("free_delivery_campaign_products" as any).select("*").eq("campaign_id", c.id);
      return ((data as unknown) as Cp[]) ?? [];
    },
  });

  const [tierLabel, setTierLabel] = useState("");
  const [tierReq, setTierReq] = useState(3);
  const [tierReward, setTierReward] = useState("ফ্রি ডেলিভারি");

  const addTier = async () => {
    if (!tierLabel.trim() || tierReq < 1) return toast.error("সঠিকভাবে পূরণ করুন");
    const { error } = await supabase.from("free_delivery_campaign_tiers" as any).insert({
      campaign_id: c.id, label: tierLabel.trim(), required_products: tierReq, reward_text: tierReward.trim() || null, sort_order: tiers.length,
    });
    if (error) return toast.error(error.message);
    setTierLabel(""); setTierReq(3); setTierReward("ফ্রি ডেলিভারি");
    qc.invalidateQueries({ queryKey: ["fd-tiers", c.id] });
  };
  const delTier = async (id: string) => {
    await supabase.from("free_delivery_campaign_tiers" as any).delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["fd-tiers", c.id] });
  };

  const toggleProduct = async (productId: string, checked: boolean) => {
    if (checked) {
      const { error } = await supabase.from("free_delivery_campaign_products" as any).insert({ campaign_id: c.id, product_id: productId });
      if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    } else {
      await supabase.from("free_delivery_campaign_products" as any).delete().eq("campaign_id", c.id).eq("product_id", productId);
    }
    qc.invalidateQueries({ queryKey: ["fd-cps", c.id] });
  };
  const selectedIds = new Set(cps.map((p) => p.product_id));

  return (
    <div className="border rounded-xl p-4 bg-card space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold">{c.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-600"}`}>
              {c.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
            </span>
            <span className="text-xs text-muted-foreground">প্রতি মোবাইল: {c.max_orders_per_phone}</span>
          </div>
          {c.description && <p className="text-xs text-muted-foreground mt-1">{c.description}</p>}
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      </div>

      {/* Tiers */}
      <div>
        <div className="text-sm font-semibold flex items-center gap-1.5 mb-2"><Layers className="h-4 w-4" /> টায়ার (Goal)</div>
        <div className="space-y-1.5 mb-2">
          {tiers.map((t) => (
            <div key={t.id} className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-lg text-sm">
              <span><b>{t.label}</b> — {t.required_products} টি প্রডাক্ট → {t.reward_text}</span>
              <Button size="icon" variant="ghost" onClick={() => delTier(t.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-12 gap-2">
          <Input className="col-span-4" placeholder="নাম যেমন Small" value={tierLabel} onChange={(e) => setTierLabel(e.target.value)} />
          <Input className="col-span-2" type="number" min={1} value={tierReq} onChange={(e) => setTierReq(Number(e.target.value))} />
          <Input className="col-span-4" placeholder="রিওয়ার্ড টেক্সট" value={tierReward} onChange={(e) => setTierReward(e.target.value)} />
          <Button className="col-span-2" onClick={addTier} size="sm">যোগ</Button>
        </div>
      </div>

      {/* Products */}
      <div>
        <div className="text-sm font-semibold flex items-center gap-1.5 mb-2"><Package className="h-4 w-4" /> অনুমোদিত প্রডাক্ট ({selectedIds.size})</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1">
          {products.map((p: any) => (
            <label key={p.id} className="flex items-center gap-2 border rounded-lg p-2 cursor-pointer hover:bg-muted/50">
              <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={(v) => toggleProduct(p.id, !!v)} />
              {p.image_url && <img src={p.image_url} className="w-8 h-8 rounded object-cover" alt="" />}
              <span className="text-xs line-clamp-2">{p.name}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
