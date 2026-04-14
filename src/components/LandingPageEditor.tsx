import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, FileText, GripVertical, Tag, Save } from "lucide-react";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

const LandingPageEditor = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    section_key: "",
    title: "",
    content: "",
    image_url: "",
    icon: "",
    sort_order: "0",
    is_active: true,
  });

  const { data: sections, isLoading } = useQuery({
    queryKey: ["admin-landing-sections"],
    queryFn: async () => {
      const { data } = await supabase
        .from("landing_page_sections")
        .select("*")
        .order("sort_order", { ascending: true });
      return data ?? [];
    },
  });

  const resetForm = () => {
    setForm({ section_key: "", title: "", content: "", image_url: "", icon: "", sort_order: "0", is_active: true });
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({
      section_key: s.section_key || "",
      title: s.title || "",
      content: s.content || "",
      image_url: s.image_url || "",
      icon: s.icon || "",
      sort_order: String(s.sort_order || 0),
      is_active: s.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.section_key.trim()) { toast.error("সেকশন কী দিন"); return; }
    const payload = {
      section_key: form.section_key.trim(),
      title: form.title.trim() || null,
      content: form.content.trim() || null,
      image_url: form.image_url.trim() || null,
      icon: form.icon.trim() || null,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };
    try {
      if (editing) {
        const { error } = await supabase.from("landing_page_sections").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("সেকশন আপডেট হয়েছে");
      } else {
        const { error } = await supabase.from("landing_page_sections").insert(payload);
        if (error) throw error;
        toast.success("সেকশন যোগ হয়েছে");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-landing-sections"] });
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("এই সেকশন মুছে ফেলতে চান?")) return;
    const { error } = await supabase.from("landing_page_sections").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("সেকশন মুছে ফেলা হয়েছে");
    queryClient.invalidateQueries({ queryKey: ["admin-landing-sections"] });
  };

  const sectionKeyLabels: Record<string, string> = {
    hero: "হিরো সেকশন",
    benefit_: "উপকারিতা",
    quality_: "গুণাগুণ",
    cta: "যোগাযোগ সেকশন",
  };

  const getSectionLabel = (key: string) => {
    for (const [prefix, label] of Object.entries(sectionKeyLabels)) {
      if (key === prefix || key.startsWith(prefix)) return label;
    }
    return key;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-foreground">ল্যান্ডিং পেজ কন্টেন্ট</h2>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> নতুন সেকশন
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-card animate-pulse rounded-lg" />)}
        </div>
      ) : !sections?.length ? (
        <p className="text-muted-foreground text-center py-8">কোনো কন্টেন্ট নেই</p>
      ) : (
        <div className="space-y-2">
          {sections.map((s: any) => (
            <div key={s.id} className="bg-card border border-border/30 rounded-lg p-4 flex items-center gap-3">
              <GripVertical className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
              <span className="text-2xl flex-shrink-0">{s.icon || "📄"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground text-sm truncate">{s.title || s.section_key}</span>
                  <span className="text-xs bg-secondary px-2 py-0.5 rounded text-muted-foreground">{getSectionLabel(s.section_key)}</span>
                  {!s.is_active && <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded">নিষ্ক্রিয়</span>}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{s.content}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "সেকশন এডিট" : "নতুন সেকশন"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>সেকশন কী *</Label>
              <Input value={form.section_key} onChange={(e) => setForm((f) => ({ ...f, section_key: e.target.value }))} placeholder="যেমন: hero, benefit_1, quality_1, cta" />
              <p className="text-xs text-muted-foreground mt-1">hero = হিরো, benefit_X = উপকারিতা, quality_X = গুণাগুণ, cta = যোগাযোগ</p>
            </div>
            <div>
              <Label>শিরোনাম</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <Label>বিবরণ</Label>
              <Textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} rows={3} />
            </div>
            <div>
              <Label>আইকন (ইমোজি)</Label>
              <Input value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="🌴" />
            </div>
            <div>
              <Label>ছবির URL (ঐচ্ছিক)</Label>
              <Input value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <Label>সর্ট অর্ডার</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              <Label>সক্রিয়</Label>
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? "আপডেট করুন" : "যোগ করুন"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandingPageEditor;
