import { WPAdminShell } from "@/components/admin/WPAdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, ShoppingBag, Upload, Image as ImageIcon } from "lucide-react";
import { useProductCategories } from "@/hooks/useProductCategories";
import { RichTextEditor } from "@/components/RichTextEditor";

export default function AdminSiteProducts() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [productCategory, setProductCategory] = useState<"taler_gur" | "other">("taler_gur");
  const { data: categoryData } = useProductCategories();
  const categoryTree = categoryData?.tree ?? [];
  const [search, setSearch] = useState("");

  const empty = {
    name: "", slug: "", short_description: "", short_description_html: "", description: "", description_html: "",
    price: "", discount_price: "", image_url: "", category: "", is_active: true, is_featured: false,
    stock_status: "in_stock", sort_order: "0", contact_info: "", unit_type: "piece" as "piece" | "kg" | "size",
    weight_grams: "", variants: [] as any[], suggested_product_ids: [] as string[],
  };
  const [form, setForm] = useState(empty);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*")
        .order("sort_order", { ascending: true }).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      name: p.name || "", slug: p.slug || "",
      short_description: p.short_description || "", short_description_html: p.short_description_html || "",
      description: p.description || "", description_html: p.description_html || "",
      price: String(p.price || 0), discount_price: p.discount_price ? String(p.discount_price) : "",
      image_url: p.image_url || "", category: p.category || "",
      is_active: p.is_active ?? true, is_featured: p.is_featured ?? false,
      stock_status: p.stock_status || "in_stock", sort_order: String(p.sort_order || 0),
      contact_info: p.contact_info || "", unit_type: (p.unit_type || "piece"),
      weight_grams: p.weight_grams ? String(p.weight_grams) : "",
      variants: Array.isArray(p.variants) ? p.variants.map((v: any) => ({
        label: v.label || "", price: String(v.price ?? ""),
        discount_price: v.discount_price != null ? String(v.discount_price) : "",
        weight_grams: v.weight_grams != null ? String(v.weight_grams) : "",
      })) : [],
      suggested_product_ids: Array.isArray(p.suggested_product_ids) ? p.suggested_product_ids : [],
    });
    setDialogOpen(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: publicUrl }));
      toast.success("ছবি আপলোড হয়েছে");
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("প্রডাক্টের নাম দিন");
    const payload: any = {
      name: form.name.trim(), slug: form.slug.trim() || null,
      short_description: form.short_description.trim() || null,
      short_description_html: form.short_description_html?.trim() || null,
      description: form.description.trim() || null,
      description_html: form.description_html?.trim() || null,
      price: Number(form.price) || 0,
      discount_price: form.discount_price ? Number(form.discount_price) : null,
      image_url: form.image_url || null, category: form.category.trim() || null,
      is_active: form.is_active, is_featured: form.is_featured,
      stock_status: form.stock_status, sort_order: Number(form.sort_order) || 0,
      contact_info: form.contact_info.trim() || null,
      unit_type: form.unit_type, weight_grams: Number(form.weight_grams) || 0,
      variants: form.variants.filter((v: any) => v.label.trim() && v.price !== "").map((v: any) => ({
        label: v.label.trim(), price: Number(v.price) || 0,
        discount_price: v.discount_price ? Number(v.discount_price) : null,
        weight_grams: v.weight_grams ? Number(v.weight_grams) : 0,
      })),
      suggested_product_ids: form.suggested_product_ids,
    };
    try {
      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("আপডেট হয়েছে");
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        toast.success("যোগ হয়েছে");
      }
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setDialogOpen(false); setEditing(null); setForm(empty);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("মুছে ফেলবেন?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("মুছে ফেলা হয়েছে");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  };

  const filtered = (products || []).filter((p: any) => {
    const catOk = productCategory === "taler_gur" ? p.category === "taler_gur" : p.category !== "taler_gur";
    const sOk = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    return catOk && sOk;
  });

  return (
    <WPAdminShell
      title="প্রডাক্ট"
      subtitle="প্রডাক্ট যোগ ও পরিচালনা"
      actions={
        <Button onClick={() => { setEditing(null); setForm({ ...empty, category: productCategory === "taler_gur" ? "taler_gur" : "" }); setDialogOpen(true); }}
          size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> নতুন প্রডাক্ট
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-md w-fit">
            {[
              { v: "taler_gur", label: "🌴 তালের গুড়" },
              { v: "other", label: "📦 অন্যান্য" },
            ].map((b) => (
              <button key={b.v}
                onClick={() => setProductCategory(b.v as any)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  productCategory === b.v ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
                }`}>{b.label}</button>
            ))}
          </div>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="নাম দিয়ে খুঁজুন..." className="max-w-sm" />
        </div>

        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">লোড হচ্ছে...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">কোনো প্রডাক্ট নেই</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                <tr>
                  <th className="text-left p-3">প্রডাক্ট</th>
                  <th className="text-left p-3 hidden md:table-cell">ক্যাটাগরি</th>
                  <th className="text-left p-3">দাম</th>
                  <th className="text-left p-3 hidden md:table-cell">স্ট্যাটাস</th>
                  <th className="text-right p-3">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img src={p.image_url} className="h-10 w-10 rounded object-cover border" alt="" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-slate-400" />
                          </div>
                        )}
                        <span className="font-medium text-slate-900">{p.name}</span>
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell text-slate-600">{p.category || "—"}</td>
                    <td className="p-3 font-semibold text-slate-900">
                      ৳{p.discount_price ?? p.price}
                      {p.discount_price && <span className="ml-1 text-xs text-slate-400 line-through">৳{p.price}</span>}
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs ${p.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {p.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" className="mr-1 h-8" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 h-8" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "প্রডাক্ট এডিট" : "নতুন প্রডাক্ট"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>ছবি</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.image_url && <img src={form.image_url} alt="" className="h-16 w-16 object-cover rounded border" />}
                <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleUpload} />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-1">
                  <Upload className="h-3 w-3" /> {uploading ? "আপলোড..." : "ছবি আপলোড"}
                </Button>
              </div>
            </div>
            <div>
              <Label>প্রডাক্টের নাম *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>সংক্ষিপ্ত বিবরণ</Label>
              <RichTextEditor value={form.short_description_html || form.short_description}
                onChange={(html) => setForm({ ...form, short_description_html: html, short_description: html.replace(/<[^>]+>/g, "").trim() })}
                minHeight={80} />
            </div>
            <div>
              <Label>বিস্তারিত বিবরণ</Label>
              <RichTextEditor value={form.description_html || form.description}
                onChange={(html) => setForm({ ...form, description_html: html, description: html.replace(/<[^>]+>/g, "").trim() })}
                minHeight={120} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>দাম (৳)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              <div><Label>ডিসকাউন্ট</Label><Input type="number" value={form.discount_price} onChange={(e) => setForm({ ...form, discount_price: e.target.value })} /></div>
              <div><Label>ওজন (g)</Label><Input type="number" value={form.weight_grams} onChange={(e) => setForm({ ...form, weight_grams: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>ক্যাটাগরি</Label>
                <Select value={form.category || "none"} onValueChange={(v) => setForm({ ...form, category: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-80">
                    <SelectItem value="none">কোনোটি নয়</SelectItem>
                    {categoryTree.map((m: any) => (
                      <div key={m.id}>
                        <SelectItem value={m.value}>{m.label}</SelectItem>
                        {m.children.map((s: any) => (
                          <SelectItem key={s.id} value={s.value}>— {s.label}</SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>স্টক</Label>
                <Select value={form.stock_status} onValueChange={(v) => setForm({ ...form, stock_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_stock">স্টকে আছে</SelectItem>
                    <SelectItem value="out_of_stock">স্টক শেষ</SelectItem>
                    <SelectItem value="pre_order">প্রি-অর্ডার</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-6 pt-1">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>সক্রিয়</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
                <Label>ফিচার্ড</Label>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700">{editing ? "আপডেট" : "যোগ করুন"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </WPAdminShell>
  );
}
