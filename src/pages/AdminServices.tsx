import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, X, Star, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ServiceForm {
  title: string;
  description: string;
  icon: string;
  category: string;
  price_label: string;
  features: string;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
}

const defaultForm: ServiceForm = {
  title: "", description: "", icon: "Camera", category: "",
  price_label: "যোগাযোগ করুন", features: "", is_featured: false, is_active: true, sort_order: 0,
};

const iconOptions = [
  "Building", "Heart", "Film", "Camera", "Megaphone", "Clapperboard",
  "Star", "MessageCircle", "Phone", "Sparkles", "Play", "Monitor",
  "Palette", "Mic", "Video", "Lightbulb",
];

const AdminServices = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(defaultForm);

  const { data: services, isLoading } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services" as any).select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        description: form.description,
        icon: form.icon,
        category: form.category,
        price_label: form.price_label,
        features: form.features.split("\n").filter(Boolean),
        is_featured: form.is_featured,
        is_active: form.is_active,
        sort_order: form.sort_order,
      };
      if (editingId) {
        const { error } = await supabase.from("services" as any).update(payload as any).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services" as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(defaultForm);
      toast({ title: editingId ? "আপডেট হয়েছে" : "যুক্ত হয়েছে" });
    },
    onError: (err: any) => toast({ title: "সমস্যা", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      toast({ title: "মুছে ফেলা হয়েছে" });
    },
  });

  const openEdit = (service: any) => {
    setEditingId(service.id);
    setForm({
      title: service.title || "",
      description: service.description || "",
      icon: service.icon || "Camera",
      category: service.category || "",
      price_label: service.price_label || "",
      features: ((service.features as string[]) || []).join("\n"),
      is_featured: service.is_featured || false,
      is_active: service.is_active ?? true,
      sort_order: service.sort_order || 0,
    });
    setDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">সেবা / প্যাকেজ</h1>
          <Button onClick={() => { setEditingId(null); setForm(defaultForm); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> নতুন সেবা
          </Button>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">লোড হচ্ছে...</p>
        ) : !services?.length ? (
          <p className="text-center text-muted-foreground py-8">কোনো সেবা নেই</p>
        ) : (
          <div className="space-y-3">
            {services.map((s: any) => (
              <Card key={s.id} className={!s.is_active ? "opacity-50" : ""}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">{s.title}</h3>
                      {s.is_featured && <Star className="h-4 w-4 text-primary fill-primary flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.category} • ক্রম: {s.sort_order}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "সেবা সম্পাদনা" : "নতুন সেবা যুক্ত করুন"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>টাইটেল *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="সেবার নাম" />
              </div>
              <div>
                <Label>বিবরণ</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="সেবার বিবরণ" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>ক্যাটেগরি</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="বিজ্ঞাপন" />
                </div>
                <div>
                  <Label>মূল্য লেবেল</Label>
                  <Input value={form.price_label} onChange={(e) => setForm({ ...form, price_label: e.target.value })} placeholder="যোগাযোগ করুন" />
                </div>
              </div>
              <div>
                <Label>আইকন</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setForm({ ...form, icon })}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                        form.icon === icon ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary/30 border-border/30 text-muted-foreground"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>ফিচার সমূহ (প্রতি লাইনে একটি)</Label>
                <Textarea
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                  placeholder={"প্রফেশনাল ভিডিওগ্রাফি\nড্রোন শট\nভিডিও এডিটিং"}
                  rows={4}
                />
              </div>
              <div>
                <Label>ক্রম</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
                  <Label>ফিচারড</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>সক্রিয়</Label>
                </div>
              </div>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title.trim()} className="w-full">
                {saveMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default AdminServices;
