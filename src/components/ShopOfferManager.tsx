import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Sparkles, Upload, Share2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

type ComboItem = { product_id: string; quantity: number };

type OfferMode = "fixed" | "percentage" | "free_delivery";

const emptyForm = {
  title: "",
  description: "",
  offer_mode: "fixed" as OfferMode,
  combo_price: "",
  discount_percent: "",
  image_url: "",
  badge_text: "বিশেষ অফার",
  starts_at: "",
  ends_at: "",
  is_active: true,
  show_popup: true,
  popup_priority: "0",
  combo_products: [] as ComboItem[],
  combo_free_delivery: false,
};

export default function ShopOfferManager() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  const { data: offers, isLoading } = useQuery({
    queryKey: ["admin-shop-offers"],
    queryFn: async () => {
      const { data } = await supabase.from("shop_offers" as any).select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products-mini"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id,name,price,discount_price,image_url").order("name");
      return data ?? [];
    },
  });

  const reset = () => { setForm(emptyForm); setEditing(null); };

  const openEdit = (o: any) => {
    setEditing(o);
    const mode: OfferMode = o.discount_type === "free_delivery"
      ? "free_delivery"
      : o.discount_type === "percentage"
        ? "percentage"
        : "fixed";
    setForm({
      title: o.title || "",
      description: o.description || "",
      offer_mode: mode,
      combo_price: o.combo_price != null ? String(o.combo_price) : "",
      discount_percent: mode === "percentage" ? String(o.discount_value || "") : "",
      image_url: o.image_url || "",
      badge_text: o.badge_text || "",
      starts_at: o.starts_at ? new Date(o.starts_at).toISOString().slice(0, 16) : "",
      ends_at: o.ends_at ? new Date(o.ends_at).toISOString().slice(0, 16) : "",
      is_active: o.is_active,
      show_popup: o.show_popup,
      popup_priority: String(o.popup_priority || 0),
      combo_products: Array.isArray(o.combo_products) ? o.combo_products : [],
      combo_free_delivery: !!o.combo_free_delivery,
    });
    setOpen(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `offers/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm(f => ({ ...f, image_url: publicUrl }));
      toast.success("ছবি আপলোড হয়েছে");
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("অফারের শিরোনাম দিন"); return; }
    const items = form.combo_products.filter(c => c.product_id);
    if (items.length === 0) { toast.error("কমপক্ষে একটি প্রডাক্ট যোগ করুন"); return; }

    // Compute totals
    const total = items.reduce((sum, c) => {
      const p = products?.find(x => x.id === c.product_id);
      if (!p) return sum;
      return sum + Number((p as any).discount_price ?? p.price ?? 0) * (c.quantity || 1);
    }, 0);

    let discount_type: string = "combo";
    let discount_value = 0;
    let combo_price: number | null = null;
    let combo_free_delivery = false;

    if (form.offer_mode === "fixed") {
      const cp = Number(form.combo_price);
      if (!cp || cp <= 0) { toast.error("কম্বো অফার মূল্য দিন"); return; }
      if (cp >= total) { toast.error("অফার মূল্য মোট মূল্যের চেয়ে কম হতে হবে"); return; }
      combo_price = cp;
      discount_type = "combo";
    } else if (form.offer_mode === "percentage") {
      const pct = Number(form.discount_percent);
      if (!pct || pct <= 0 || pct >= 100) { toast.error("সঠিক শতাংশ দিন (১-৯৯)"); return; }
      discount_value = pct;
      combo_price = Math.round(total - (total * pct) / 100);
      discount_type = "combo";
    } else {
      combo_free_delivery = true;
      combo_price = total;
      discount_type = "combo";
    }

    if (form.offer_mode !== "free_delivery" && form.combo_free_delivery) combo_free_delivery = true;

    const payload: any = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      product_id: null,
      discount_type,
      discount_value,
      image_url: form.image_url || null,
      badge_text: form.badge_text.trim() || "বিশেষ অফার",
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      is_active: form.is_active,
      show_popup: form.show_popup,
      popup_priority: Number(form.popup_priority) || 0,
      combo_products: items,
      combo_price,
      combo_free_delivery,
    };
    try {
      if (editing) {
        const { error } = await supabase.from("shop_offers" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("অফার আপডেট হয়েছে");
      } else {
        const { error } = await supabase.from("shop_offers" as any).insert(payload);
        if (error) throw error;
        toast.success("অফার তৈরি হয়েছে");
      }
      qc.invalidateQueries({ queryKey: ["admin-shop-offers"] });
      qc.invalidateQueries({ queryKey: ["active-shop-offers"] });
      setOpen(false); reset();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("অফারটি মুছে ফেলতে চান?")) return;
    const { error } = await supabase.from("shop_offers" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("অফার মুছে ফেলা হয়েছে");
    qc.invalidateQueries({ queryKey: ["admin-shop-offers"] });
    qc.invalidateQueries({ queryKey: ["active-shop-offers"] });
  };

  const typeLabel = (t: string) => t === "percentage" ? "শতাংশ ছাড়" : t === "fixed" ? "নির্দিষ্ট ছাড়" : t === "combo" ? "কম্বো অফার" : "ফ্রি ডেলিভারি";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold">অফার ম্যানেজমেন্ট</h2>
        </div>
        <Button onClick={() => { reset(); setOpen(true); }} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> নতুন অফার
        </Button>
      </div>

      {isLoading ? (
        <div className="h-32 bg-card animate-pulse rounded-xl" />
      ) : !offers?.length ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-xl">
          <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>কোনো অফার নেই</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {offers.map((o: any) => {
            const product = products?.find(p => p.id === o.product_id);
            return (
              <div key={o.id} className="bg-card border rounded-xl p-4 space-y-2">
                <div className="flex gap-3">
                  {o.image_url && <img src={o.image_url} className="w-16 h-16 rounded-lg object-cover" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold">{o.badge_text}</span>
                      {!o.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">নিষ্ক্রিয়</span>}
                      {o.show_popup && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">পপআপ</span>}
                    </div>
                    <h3 className="font-bold text-sm mt-1 truncate">{o.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {typeLabel(o.discount_type)} {o.discount_type === "combo" && o.combo_price ? `• ৳${o.combo_price}` : o.discount_type !== "free_delivery" && o.discount_type !== "combo" ? `• ${o.discount_value}${o.discount_type === "percentage" ? "%" : "৳"}` : ""}
                      {product && ` • ${product.name}`}
                    </p>
                    {o.ends_at && <p className="text-xs text-muted-foreground">শেষ: {new Date(o.ends_at).toLocaleString("bn-BD")}</p>}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => openEdit(o)}>
                    <Pencil className="h-3 w-3" /> এডিট
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDelete(o.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "অফার এডিট" : "নতুন অফার"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>শিরোনাম *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="যেমন: ঈদ বিশেষ ছাড়" />
            </div>
            <div>
              <Label>বিবরণ</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="অফারের বিস্তারিত..." />
            </div>
            <div>
              <Label>ব্যাজ টেক্সট</Label>
              <Input value={form.badge_text} onChange={e => setForm(f => ({ ...f, badge_text: e.target.value }))} placeholder="বিশেষ অফার" />
            </div>
            {/* Product picker - always shown */}
            <div className="space-y-2 p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center justify-between">
                <Label className="font-bold">কম্বোতে প্রডাক্টসমূহ *</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => setForm(f => ({ ...f, combo_products: [...f.combo_products, { product_id: "", quantity: 1 }] }))}>
                  <Plus className="h-3 w-3 mr-1" /> প্রডাক্ট
                </Button>
              </div>
              {form.combo_products.length === 0 && <p className="text-xs text-muted-foreground">প্রডাক্ট লিস্ট থেকে একাধিক প্রডাক্ট যোগ করুন</p>}
              {form.combo_products.map((c, idx) => {
                const p = products?.find(x => x.id === c.product_id);
                const unit = p ? Number((p as any).discount_price ?? p.price ?? 0) : 0;
                const lineTotal = unit * (c.quantity || 1);
                return (
                  <div key={idx} className="space-y-1 rounded-lg border bg-card p-2">
                    <div className="grid grid-cols-[1fr_72px_36px] gap-2 items-center">
                      <select
                        value={c.product_id}
                        onChange={(e) => {
                          const next = [...form.combo_products];
                          next[idx] = { ...next[idx], product_id: e.target.value };
                          setForm(f => ({ ...f, combo_products: next }));
                        }}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">প্রডাক্ট বাছাই</option>
                        {products?.map(pp => <option key={pp.id} value={pp.id}>{pp.name} — ৳{(pp as any).discount_price ?? pp.price}</option>)}
                      </select>
                      <Input type="number" min={1} value={c.quantity} onChange={e => {
                        const next = [...form.combo_products];
                        next[idx] = { ...next[idx], quantity: Math.max(1, Number(e.target.value) || 1) };
                        setForm(f => ({ ...f, combo_products: next }));
                      }} />
                      <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => {
                        setForm(f => ({ ...f, combo_products: f.combo_products.filter((_, i) => i !== idx) }));
                      }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {p && (
                      <div className="text-xs text-muted-foreground pl-1">
                        ৳{unit} × {c.quantity || 1} = <span className="font-bold text-foreground">৳{lineTotal}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {(() => {
                const total = form.combo_products.reduce((sum, c) => {
                  const p = products?.find(x => x.id === c.product_id);
                  if (!p) return sum;
                  return sum + Number((p as any).discount_price ?? p.price ?? 0) * (c.quantity || 1);
                }, 0);
                let newPrice = 0;
                if (form.offer_mode === "fixed") newPrice = Number(form.combo_price) || 0;
                else if (form.offer_mode === "percentage") {
                  const pct = Number(form.discount_percent) || 0;
                  newPrice = pct > 0 ? Math.round(total - (total * pct) / 100) : 0;
                } else newPrice = total;
                const savings = newPrice > 0 && total > newPrice ? total - newPrice : 0;
                const pct = total > 0 && savings > 0 ? Math.round((savings / total) * 100) : 0;
                return (
                  <div className="bg-card border rounded-lg p-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">মোট মূল্য:</span><span className="font-bold">৳{total}</span></div>
                    {newPrice > 0 && form.offer_mode !== "free_delivery" && (
                      <>
                        <div className="flex justify-between"><span className="text-muted-foreground">অফার মূল্য:</span><span className="font-bold text-green-600">৳{newPrice}</span></div>
                        {savings > 0 && (
                          <div className="flex justify-between text-xs"><span className="text-muted-foreground">সাশ্রয়:</span><span className="font-bold text-red-600">৳{savings} ({pct}%)</span></div>
                        )}
                      </>
                    )}
                    {form.offer_mode === "free_delivery" && (
                      <div className="text-xs text-blue-600 font-bold">🚚 ফ্রি ডেলিভারি প্রযোজ্য</div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Offer type selector */}
            <div>
              <Label>অফারের ধরন *</Label>
              <Select value={form.offer_mode} onValueChange={(v: any) => setForm(f => ({ ...f, offer_mode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">নির্দিষ্ট কম্বো মূল্য (৳)</SelectItem>
                  <SelectItem value="percentage">শতাংশ ছাড় (%)</SelectItem>
                  <SelectItem value="free_delivery">ফ্রি ডেলিভারি</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.offer_mode === "fixed" && (
              <div>
                <Label>কম্বোর অফার মূল্য (৳) *</Label>
                <Input type="number" value={form.combo_price} onChange={e => setForm(f => ({ ...f, combo_price: e.target.value }))} placeholder="যেমন: ৪৯৯" />
              </div>
            )}
            {form.offer_mode === "percentage" && (
              <div>
                <Label>ছাড়ের শতাংশ (%) *</Label>
                <Input type="number" min={1} max={99} value={form.discount_percent} onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))} placeholder="যেমন: ১৫" />
              </div>
            )}

            {form.offer_mode !== "free_delivery" && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-card border">
                <div>
                  <Label className="text-sm cursor-pointer">🚚 ফ্রি ডেলিভারি যোগ করুন</Label>
                  <p className="text-[11px] text-muted-foreground">কম্বো অর্ডারে ডেলিভারি চার্জ লাগবে না</p>
                </div>
                <Switch checked={form.combo_free_delivery} onCheckedChange={(v) => setForm(f => ({ ...f, combo_free_delivery: v }))} />
              </div>
            )}
            <div>
              <Label>ছবি</Label>
              <div className="flex gap-2">
                <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="URL বা আপলোড করুন" />
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" hidden onChange={handleUpload} />
                  <Button type="button" variant="outline" size="icon" disabled={uploading} asChild>
                    <span><Upload className="h-4 w-4" /></span>
                  </Button>
                </label>
              </div>
              {form.image_url && <img src={form.image_url} className="mt-2 h-20 rounded-lg object-cover" />}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>শুরু</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} />
              </div>
              <div>
                <Label>শেষ</Label>
                <Input type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>পপআপ অগ্রাধিকার</Label>
              <Input type="number" value={form.popup_priority} onChange={e => setForm(f => ({ ...f, popup_priority: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <Label>সক্রিয়</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <Label>পপআপে দেখাও</Label>
              <Switch checked={form.show_popup} onCheckedChange={(v) => setForm(f => ({ ...f, show_popup: v }))} />
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? "আপডেট" : "তৈরি করুন"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
