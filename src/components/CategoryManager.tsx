import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, FolderTree } from "lucide-react";
import { toast } from "sonner";

interface Cat {
  id: string;
  parent_id: string | null;
  label: string;
  value: string;
  icon: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^\w_]/g, "") || `cat_${Date.now()}`;

const CategoryManager = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cat | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    label: "",
    value: "",
    icon: "",
    image_url: "",
    parent_id: "none",
    sort_order: "0",
  });

  const { data: cats } = useQuery({
    queryKey: ["admin-product-categories"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("product_categories")
        .select("*")
        .order("sort_order", { ascending: true });
      return (data ?? []) as Cat[];
    },
  });

  const mains = (cats ?? []).filter((c) => !c.parent_id);
  const subsBy = (id: string) => (cats ?? []).filter((c) => c.parent_id === id);

  const reset = () => {
    setForm({ label: "", value: "", icon: "", image_url: "", parent_id: "none", sort_order: "0" });
    setEditing(null);
  };

  const openCreate = (parent_id?: string) => {
    reset();
    if (parent_id) setForm((f) => ({ ...f, parent_id }));
    setOpen(true);
  };

  const openEdit = (c: Cat) => {
    setEditing(c);
    setForm({
      label: c.label,
      value: c.value,
      icon: c.icon || "",
      image_url: c.image_url || "",
      parent_id: c.parent_id || "none",
      sort_order: String(c.sort_order),
    });
    setOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `categories/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: data.publicUrl }));
      toast.success("ছবি আপলোড হয়েছে");
    } catch (e: any) {
      toast.error(e.message || "আপলোড ব্যর্থ");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.label.trim()) return toast.error("নাম দিন");
    const value = form.value.trim() || slugify(form.label);
    const payload: any = {
      label: form.label.trim(),
      value,
      icon: form.icon.trim() || null,
      image_url: form.image_url.trim() || null,
      parent_id: form.parent_id === "none" ? null : form.parent_id,
      sort_order: Number(form.sort_order) || 0,
    };
    const res = editing
      ? await (supabase as any).from("product_categories").update(payload).eq("id", editing.id)
      : await (supabase as any).from("product_categories").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "আপডেট হয়েছে" : "যোগ হয়েছে");
    setOpen(false);
    reset();
    qc.invalidateQueries({ queryKey: ["admin-product-categories"] });
    qc.invalidateQueries({ queryKey: ["product-categories"] });
  };

  const remove = async (id: string) => {
    if (!confirm("ডিলিট করবেন? সাব-ক্যাটাগরিও ডিলিট হবে।")) return;
    const { error } = await (supabase as any).from("product_categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("ডিলিট হয়েছে");
    qc.invalidateQueries({ queryKey: ["admin-product-categories"] });
    qc.invalidateQueries({ queryKey: ["product-categories"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderTree className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">ক্যাটাগরি ম্যানেজমেন্ট</h2>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => openCreate()}>
          <Plus className="h-4 w-4" /> নতুন মেইন ক্যাটাগরি
        </Button>
      </div>

      <div className="space-y-3">
        {mains.map((m) => (
          <div key={m.id} className="bg-card border border-border/30 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">
                {m.icon} {m.label} <span className="text-xs text-muted-foreground">({m.value})</span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => openCreate(m.id)}>
                  <Plus className="h-3 w-3" /> সাব
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(m)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(m.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {subsBy(m.id).length > 0 && (
              <div className="mt-2 pl-4 border-l-2 border-border/40 space-y-1">
                {subsBy(m.id).map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-1 text-sm">
                    <span>— {s.label} <span className="text-xs text-muted-foreground">({s.value})</span></span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(s.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "ক্যাটাগরি এডিট" : "নতুন ক্যাটাগরি"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>প্যারেন্ট (সাব-ক্যাটাগরি হলে)</Label>
              <Select value={form.parent_id} onValueChange={(v) => setForm((f) => ({ ...f, parent_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— মেইন ক্যাটাগরি —</SelectItem>
                  {mains.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.icon} {m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>নাম *</Label>
              <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="যেমন: আমের আচার" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>আইকন (ইমোজি)</Label>
                <Input value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="🥭" />
              </div>
              <div>
                <Label>সর্ট অর্ডার</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>স্লাগ (ঐচ্ছিক, অটো হবে)</Label>
              <Input value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder="achar_aam" />
            </div>
            <div>
              <Label>ক্যাটাগরি ছবি (ঐচ্ছিক)</Label>
              <div className="flex items-center gap-3">
                {form.image_url ? (
                  <img src={form.image_url} alt="" className="w-16 h-16 rounded-lg object-cover border" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-2xl">{form.icon || "🖼️"}</div>
                )}
                <div className="flex-1 space-y-1.5">
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                  />
                  {form.image_url && (
                    <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setForm((f) => ({ ...f, image_url: "" }))}>
                      ছবি সরান
                    </Button>
                  )}
                </div>
              </div>
            <Button onClick={save} className="w-full">{editing ? "আপডেট" : "যোগ করুন"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryManager;
