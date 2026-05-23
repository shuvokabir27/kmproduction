import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, Layers } from "lucide-react";
import { useProductCategories } from "@/hooks/useProductCategories";

type Section = {
  id: string;
  title: string;
  eyebrow: string | null;
  section_type: "manual" | "category";
  category_value: string | null;
  badge_text: string | null;
  badge_color: string;
  accent_color: string;
  cta_label: string | null;
  cta_link: string | null;
  max_items: number;
  sort_order: number;
  is_active: boolean;
  discount_type: "none" | "percent" | "fixed";
  discount_value: number;
};

const COLORS = ["amber", "red", "green", "blue", "rose", "violet"];

const emptyForm = {
  title: "",
  eyebrow: "",
  section_type: "manual" as "manual" | "category",
  category_value: "",
  badge_text: "",
  badge_color: "amber",
  accent_color: "amber",
  cta_label: "",
  cta_link: "/products",
  max_items: 12,
  sort_order: 0,
  is_active: true,
  discount_type: "none" as "none" | "percent" | "fixed",
  discount_value: 0,
};

export default function HomeSectionsManager() {
  const qc = useQueryClient();
  const { data: catData } = useProductCategories();
  const allCategories = catData?.all ?? [];

  const { data: sections = [] } = useQuery({
    queryKey: ["admin-home-sections"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("home_sections")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      return (data ?? []) as Section[];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin-products-for-sections"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, image_url, category, is_active")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Section | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setSelectedProductIds([]);
    setDialogOpen(true);
  };

  const openEdit = async (s: Section) => {
    setEditing(s);
    setForm({
      title: s.title,
      eyebrow: s.eyebrow || "",
      section_type: s.section_type,
      category_value: s.category_value || "",
      badge_text: s.badge_text || "",
      badge_color: s.badge_color,
      accent_color: s.accent_color,
      cta_label: s.cta_label || "",
      cta_link: s.cta_link || "",
      max_items: s.max_items,
      sort_order: s.sort_order,
      is_active: s.is_active,
      discount_type: (s.discount_type || "none") as "none" | "percent" | "fixed",
      discount_value: Number(s.discount_value || 0),
    });
    // load products if manual
    if (s.section_type === "manual") {
      const { data } = await (supabase as any)
        .from("home_section_products")
        .select("product_id")
        .eq("section_id", s.id)
        .order("sort_order", { ascending: true });
      setSelectedProductIds((data ?? []).map((r: any) => r.product_id));
    } else {
      setSelectedProductIds([]);
    }
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error("টাইটেল দিন"); return; }
    if (form.section_type === "category" && !form.category_value) { toast.error("ক্যাটাগরি বাছাই করুন"); return; }
    if (form.section_type === "manual" && selectedProductIds.length === 0) { toast.error("অন্তত একটি পণ্য সিলেক্ট করুন"); return; }

    const payload = {
      title: form.title.trim(),
      eyebrow: form.eyebrow.trim() || null,
      section_type: form.section_type,
      category_value: form.section_type === "category" ? form.category_value : null,
      badge_text: form.badge_text.trim() || null,
      badge_color: form.badge_color,
      accent_color: form.accent_color,
      cta_label: form.cta_label.trim() || null,
      cta_link: form.cta_link.trim() || null,
      max_items: Number(form.max_items) || 12,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value) || 0,
    };

    let sectionId = editing?.id;
    if (editing) {
      const { error } = await (supabase as any).from("home_sections").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { data, error } = await (supabase as any).from("home_sections").insert(payload).select("id").single();
      if (error) { toast.error(error.message); return; }
      sectionId = data.id;
    }

    // sync products for manual
    if (form.section_type === "manual" && sectionId) {
      await (supabase as any).from("home_section_products").delete().eq("section_id", sectionId);
      if (selectedProductIds.length) {
        const rows = selectedProductIds.map((pid, i) => ({ section_id: sectionId, product_id: pid, sort_order: i }));
        const { error } = await (supabase as any).from("home_section_products").insert(rows);
        if (error) { toast.error(error.message); return; }
      }
    } else if (sectionId) {
      // clean any old manual links if switched to category
      await (supabase as any).from("home_section_products").delete().eq("section_id", sectionId);
    }

    toast.success(editing ? "আপডেট হয়েছে" : "সেকশন তৈরি হয়েছে");
    setDialogOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-home-sections"] });
    qc.invalidateQueries({ queryKey: ["home-sections-active"] });
  };

  const toggleActive = async (s: Section) => {
    await (supabase as any).from("home_sections").update({ is_active: !s.is_active }).eq("id", s.id);
    qc.invalidateQueries({ queryKey: ["admin-home-sections"] });
    qc.invalidateQueries({ queryKey: ["home-sections-active"] });
  };

  const remove = async (s: Section) => {
    if (!confirm(`"${s.title}" মুছে দেবেন?`)) return;
    await (supabase as any).from("home_sections").delete().eq("id", s.id);
    toast.success("মুছে দেওয়া হয়েছে");
    qc.invalidateQueries({ queryKey: ["admin-home-sections"] });
    qc.invalidateQueries({ queryKey: ["home-sections-active"] });
  };

  const move = async (s: Section, dir: -1 | 1) => {
    const newOrder = (s.sort_order || 0) + dir;
    await (supabase as any).from("home_sections").update({ sort_order: newOrder }).eq("id", s.id);
    qc.invalidateQueries({ queryKey: ["admin-home-sections"] });
    qc.invalidateQueries({ queryKey: ["home-sections-active"] });
  };

  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const filteredProducts = products.filter((p: any) =>
    !productSearch || p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Layers className="h-5 w-5" /> হোম পেইজ সেকশন</h2>
          <p className="text-xs text-muted-foreground">ক্যাটাগরি বা বাছাই করা পণ্য দিয়ে কাস্টম সেকশন তৈরি করুন</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> নতুন সেকশন</Button>
      </div>

      <div className="grid gap-3">
        {sections.length === 0 && (
          <div className="text-center text-muted-foreground py-10 border border-dashed rounded-xl">
            কোনো সেকশন নেই — "নতুন সেকশন" দিয়ে শুরু করুন
          </div>
        )}
        {sections.map((s) => (
          <div key={s.id} className="flex items-center gap-3 p-3 border border-border/40 rounded-xl bg-card/60">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => move(s, -1)} className="text-xs text-muted-foreground hover:text-foreground">▲</button>
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <button onClick={() => move(s, 1)} className="text-xs text-muted-foreground hover:text-foreground">▼</button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold">{s.title}</span>
                <Badge variant="outline" className="text-[10px]">{s.section_type === "category" ? "ক্যাটাগরি" : "ম্যানুয়াল"}</Badge>
                {s.badge_text && <Badge className="text-[10px]">{s.badge_text}</Badge>}
                {!s.is_active && <Badge variant="secondary" className="text-[10px]">নিষ্ক্রিয়</Badge>}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {s.eyebrow && <span>{s.eyebrow} • </span>}
                সর্বোচ্চ {s.max_items} টি • অর্ডার {s.sort_order}
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => toggleActive(s)} title={s.is_active ? "নিষ্ক্রিয়" : "সক্রিয়"}>
              {s.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => remove(s)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "সেকশন এডিট" : "নতুন সেকশন"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>টাইটেল *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="যেমন: ফ্রি ডেলিভারি অফার" />
              </div>
              <div>
                <Label>Eyebrow (ছোট লেবেল)</Label>
                <Input value={form.eyebrow} onChange={(e) => setForm({ ...form, eyebrow: e.target.value })} placeholder="যেমন: SPECIAL OFFER" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>সেকশন টাইপ</Label>
                <Select value={form.section_type} onValueChange={(v: any) => setForm({ ...form, section_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">ম্যানুয়াল (পণ্য বাছাই)</SelectItem>
                    <SelectItem value="category">ক্যাটাগরি অনুযায়ী</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.section_type === "category" && (
                <div>
                  <Label>ক্যাটাগরি</Label>
                  <Select value={form.category_value} onValueChange={(v) => setForm({ ...form, category_value: v })}>
                    <SelectTrigger><SelectValue placeholder="বাছাই করুন" /></SelectTrigger>
                    <SelectContent>
                      {allCategories.map((c) => (
                        <SelectItem key={c.id} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label>ব্যাজ টেক্সট</Label>
                <Input value={form.badge_text} onChange={(e) => setForm({ ...form, badge_text: e.target.value })} placeholder="যেমন: ফ্রি ডেলিভারি" />
              </div>
              <div>
                <Label>ব্যাজ কালার</Label>
                <Select value={form.badge_color} onValueChange={(v) => setForm({ ...form, badge_color: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>অ্যাকসেন্ট কালার</Label>
                <Select value={form.accent_color} onValueChange={(v) => setForm({ ...form, accent_color: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>CTA বাটনের টেক্সট</Label>
                <Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} placeholder="সব দেখুন" />
              </div>
              <div>
                <Label>CTA লিংক</Label>
                <Input value={form.cta_link} onChange={(e) => setForm({ ...form, cta_link: e.target.value })} placeholder="/products" />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label>সর্বোচ্চ পণ্য</Label>
                <Input type="number" value={form.max_items} onChange={(e) => setForm({ ...form, max_items: Number(e.target.value) })} />
              </div>
              <div>
                <Label>সর্ট অর্ডার</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
              <div className="flex items-end gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>সক্রিয়</Label>
              </div>
            </div>

            {form.section_type === "manual" && (
              <div>
                <Label className="mb-2 block">পণ্য বাছাই ({selectedProductIds.length} টি)</Label>
                <Input
                  placeholder="পণ্য খুঁজুন..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="mb-2"
                />
                <div className="max-h-64 overflow-y-auto border border-border/40 rounded-lg divide-y divide-border/20">
                  {filteredProducts.map((p: any) => (
                    <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-muted/40 cursor-pointer">
                      <Checkbox checked={selectedProductIds.includes(p.id)} onCheckedChange={() => toggleProduct(p.id)} />
                      {p.image_url && <img src={p.image_url} alt="" className="h-8 w-8 rounded object-cover" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground">{p.category} {!p.is_active && "• নিষ্ক্রিয়"}</div>
                      </div>
                    </label>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-4">কোনো পণ্য পাওয়া যায়নি</div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>বাতিল</Button>
              <Button onClick={save}>{editing ? "আপডেট" : "তৈরি করুন"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
