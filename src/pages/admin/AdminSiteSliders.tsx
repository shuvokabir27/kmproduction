import { useEffect, useMemo, useState } from "react";
import { WPAdminShell } from "@/components/admin/WPAdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, GripVertical, Search } from "lucide-react";

type Slider = {
  id: string;
  title: string;
  subtitle: string | null;
  product_ids: string[];
  is_active: boolean;
  sort_order: number;
  autoplay: boolean;
};

const emptyDraft: Omit<Slider, "id"> & { id?: string } = {
  title: "",
  subtitle: "",
  product_ids: [],
  is_active: true,
  sort_order: 0,
  autoplay: true,
};

export default function AdminSiteSliders() {
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<typeof emptyDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from("product_sliders").select("*").order("sort_order").order("created_at"),
      supabase.from("products").select("id, name, image_url, is_active").eq("is_active", true).order("name"),
    ]);
    setSliders((s as any) || []);
    setProducts(p || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setDraft({ ...emptyDraft, sort_order: sliders.length }); setOpen(true); };
  const openEdit = (s: Slider) => { setDraft({ ...s, subtitle: s.subtitle || "" }); setOpen(true); };

  const save = async () => {
    if (!draft.title.trim()) { toast.error("টাইটেল লিখুন"); return; }
    setSaving(true);
    const payload = {
      title: draft.title.trim(),
      subtitle: draft.subtitle?.trim() || null,
      product_ids: draft.product_ids,
      is_active: draft.is_active,
      sort_order: draft.sort_order,
      autoplay: draft.autoplay,
    };
    const q = draft.id
      ? supabase.from("product_sliders").update(payload).eq("id", draft.id)
      : supabase.from("product_sliders").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("সংরক্ষণ হয়েছে");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("এই স্লাইডারটি ডিলিট করবেন?")) return;
    const { error } = await supabase.from("product_sliders").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("ডিলিট হয়েছে");
    load();
  };

  const toggleProduct = (id: string) => {
    setDraft((d) => {
      const has = d.product_ids.includes(id);
      return { ...d, product_ids: has ? d.product_ids.filter((x) => x !== id) : [...d.product_ids, id] };
    });
  };

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name?.toLowerCase().includes(q));
  }, [products, search]);

  return (
    <WPAdminShell
      title="প্রডাক্ট স্লাইডার"
      subtitle="হোম পেইজের প্রডাক্ট স্লাইডার তৈরি ও ম্যানেজ করুন। কোন প্রডাক্ট সিলেক্ট না করলে সকল প্রডাক্ট থেকে র‍্যান্ডমলি দেখাবে।"
      actions={
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
          <Plus className="h-4 w-4" /> নতুন স্লাইডার
        </Button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : sliders.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-md p-12 text-center">
          <p className="text-sm text-slate-500 mb-4">এখনো কোনো স্লাইডার তৈরি করা হয়নি।</p>
          <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <Plus className="h-4 w-4" /> প্রথম স্লাইডার তৈরি করুন
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-600">
              <tr>
                <th className="px-4 py-3 w-10"></th>
                <th className="px-4 py-3">টাইটেল</th>
                <th className="px-4 py-3">প্রডাক্ট</th>
                <th className="px-4 py-3">অর্ডার</th>
                <th className="px-4 py-3">স্ট্যাটাস</th>
                <th className="px-4 py-3 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {sliders.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-300"><GripVertical className="h-4 w-4" /></td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{s.title}</div>
                    {s.subtitle && <div className="text-xs text-slate-500">{s.subtitle}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.product_ids.length > 0 ? `${s.product_ids.length} টি নির্বাচিত` : "র‍্যান্ডম (সব)"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.sort_order}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(s)} className="text-slate-600 hover:text-blue-600 p-1"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(s.id)} className="text-slate-600 hover:text-red-600 p-1 ml-1"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? "স্লাইডার এডিট" : "নতুন স্লাইডার"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600">টাইটেল *</Label>
                <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="যেমন: হট ডিল" />
              </div>
              <div>
                <Label className="text-xs text-slate-600">অর্ডার</Label>
                <Input type="number" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-600">সাবটাইটেল</Label>
              <Textarea rows={2} value={draft.subtitle || ""} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} placeholder="সংক্ষিপ্ত বিবরণ (ঐচ্ছিক)" />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={draft.autoplay} onCheckedChange={(v) => setDraft({ ...draft, autoplay: v })} />
                অটোপ্লে
              </label>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold text-slate-800">প্রডাক্ট নির্বাচন</Label>
                <span className="text-xs text-slate-500">
                  {draft.product_ids.length === 0 ? "কিছু সিলেক্ট না করলে র‍্যান্ডম দেখাবে" : `${draft.product_ids.length} টি নির্বাচিত`}
                </span>
              </div>
              <div className="relative mb-2">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" placeholder="প্রডাক্ট সার্চ..." />
              </div>
              <div className="border border-slate-200 rounded-md max-h-72 overflow-y-auto divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const checked = draft.product_ids.includes(p.id);
                  return (
                    <label key={p.id} className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 ${checked ? "bg-emerald-50/50" : ""}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleProduct(p.id)} />
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="h-9 w-9 rounded object-cover" />
                      ) : (
                        <div className="h-9 w-9 rounded bg-slate-100" />
                      )}
                      <span className="text-slate-800">{p.name}</span>
                    </label>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <div className="text-xs text-slate-500 px-3 py-6 text-center">কোনো প্রডাক্ট পাওয়া যায়নি</div>
                )}
              </div>
              {draft.product_ids.length > 0 && (
                <button
                  onClick={() => setDraft({ ...draft, product_ids: [] })}
                  className="text-xs text-rose-600 hover:underline mt-2"
                >
                  সব আনচেক করুন (র‍্যান্ডম মোড)
                </button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>বাতিল</Button>
            <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              সংরক্ষণ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WPAdminShell>
  );
}
