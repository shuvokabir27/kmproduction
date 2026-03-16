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
import { Plus, Trash2, Pencil, X, Star, Eye, EyeOff, Timer, Percent, Gift } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type PricingType = 'hourly' | 'per_minute' | 'event' | 'fixed';

const pricingTypeLabels: Record<PricingType, string> = {
  hourly: "ঘন্টা ভিত্তিক",
  per_minute: "মিনিট ভিত্তিক",
  event: "ইভেন্ট ভিত্তিক",
  fixed: "নির্দিষ্ট মূল্য",
};

interface ServiceForm {
  title: string;
  description: string;
  icon: string;
  category: string;
  pricing_type: PricingType;
  price_label: string;
  price: string;
  price_per_minute: string;
  price_per_hour: string;
  edited_photos_per_hour: string;
  unlimited_photos_per_hour: boolean;
  discount_percentage: string;
  duration: string;
  features: string;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
}

const defaultForm: ServiceForm = {
  title: "", description: "", icon: "Camera", category: "",
  pricing_type: "fixed",
  price_label: "যোগাযোগ করুন", price: "", price_per_minute: "", price_per_hour: "", edited_photos_per_hour: "20", unlimited_photos_per_hour: true, discount_percentage: "", features: "", is_featured: false, is_active: true, sort_order: 0,
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

  // Offer states
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [offerEditId, setOfferEditId] = useState<string | null>(null);
  const [offerTitle, setOfferTitle] = useState("বিশেষ অফার");
  const [offerDesc, setOfferDesc] = useState("");
  const [offerDiscount, setOfferDiscount] = useState("");
  const [offerEndDate, setOfferEndDate] = useState("");
  const [offerActive, setOfferActive] = useState(true);
  const [offerServiceIds, setOfferServiceIds] = useState<string[]>([]);

  const { data: services, isLoading } = useQuery({
    queryKey: ["admin-services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services" as any).select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: offers } = useQuery({
    queryKey: ["admin-service-offers"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("service_offers").select("*").order("created_at", { ascending: false });
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
        pricing_type: form.pricing_type,
        price_label: form.price_label,
        price: form.price ? Number(form.price) : null,
        price_per_minute: form.pricing_type === 'per_minute' && form.price_per_minute ? Number(form.price_per_minute) : null,
        price_per_hour: form.pricing_type === 'hourly' && form.price_per_hour ? Number(form.price_per_hour) : null,
        edited_photos_per_hour: form.pricing_type === 'hourly' && form.edited_photos_per_hour ? Number(form.edited_photos_per_hour) : 20,
        unlimited_photos_per_hour: form.pricing_type === 'hourly' ? form.unlimited_photos_per_hour : true,
        discount_percentage: form.discount_percentage ? Number(form.discount_percentage) : null,
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

  const saveOffer = async () => {
    if (!offerDiscount || !offerEndDate) return;
    const payload = {
      title: offerTitle,
      description: offerDesc || null,
      discount_percentage: Number(offerDiscount),
      offer_end_date: new Date(offerEndDate).toISOString(),
      is_active: offerActive,
      service_ids: offerServiceIds.length > 0 ? offerServiceIds : [],
    };
    if (offerEditId) {
      const { error } = await (supabase as any).from("service_offers").update(payload).eq("id", offerEditId);
      if (error) { toast({ title: "সমস্যা", description: error.message, variant: "destructive" }); return; }
      toast({ title: "অফার আপডেট হয়েছে" });
    } else {
      const { error } = await (supabase as any).from("service_offers").insert(payload);
      if (error) { toast({ title: "সমস্যা", description: error.message, variant: "destructive" }); return; }
      toast({ title: "অফার যুক্ত হয়েছে" });
    }
    queryClient.invalidateQueries({ queryKey: ["admin-service-offers"] });
    setOfferDialogOpen(false);
    resetOfferForm();
  };

  const deleteOffer = async (id: string) => {
    await (supabase as any).from("service_offers").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-service-offers"] });
    toast({ title: "অফার মুছে ফেলা হয়েছে" });
  };

  const resetOfferForm = () => {
    setOfferEditId(null);
    setOfferTitle("বিশেষ অফার");
    setOfferDesc("");
    setOfferDiscount("");
    setOfferEndDate("");
    setOfferActive(true);
    setOfferServiceIds([]);
  };

  const openEditOffer = (offer: any) => {
    setOfferEditId(offer.id);
    setOfferTitle(offer.title || "");
    setOfferDesc(offer.description || "");
    setOfferDiscount(String(offer.discount_percentage));
    setOfferEndDate(new Date(offer.offer_end_date).toISOString().slice(0, 16));
    setOfferActive(offer.is_active);
    setOfferServiceIds((offer.service_ids as string[]) || []);
    setOfferDialogOpen(true);
  };

  const openEdit = (service: any) => {
    setEditingId(service.id);
    setForm({
      title: service.title || "",
      description: service.description || "",
      icon: service.icon || "Camera",
      category: service.category || "",
      pricing_type: service.pricing_type || "fixed",
      price_label: service.price_label || "",
      price: service.price ? String(service.price) : "",
      price_per_minute: service.price_per_minute ? String(service.price_per_minute) : "",
      price_per_hour: service.price_per_hour ? String(service.price_per_hour) : "",
      edited_photos_per_hour: service.edited_photos_per_hour ? String(service.edited_photos_per_hour) : "20",
      unlimited_photos_per_hour: service.unlimited_photos_per_hour ?? true,
      discount_percentage: service.discount_percentage ? String(service.discount_percentage) : "",
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

        {/* Offer Management Section */}
        <Card className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-red-500/10 border-amber-500/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-400">
                <Gift className="h-5 w-5" /> অফার ম্যানেজমেন্ট
              </CardTitle>
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => { resetOfferForm(); setOfferDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> নতুন অফার
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {!offers?.length && <p className="text-sm text-muted-foreground text-center py-3">কোনো অফার নেই। নতুন অফার যোগ করুন।</p>}
            {offers?.map((offer: any) => {
              const isExpired = new Date(offer.offer_end_date) < new Date();
              return (
                <div key={offer.id} className={`flex items-center justify-between p-3 rounded-xl border ${isExpired ? "border-red-500/20 bg-red-500/5 opacity-60" : "border-amber-500/20 bg-amber-500/5"}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-amber-400 shrink-0" />
                      <span className="font-semibold text-foreground">{offer.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">{offer.discount_percentage}% ছাড়</span>
                      {isExpired && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">মেয়াদ শেষ</span>}
                      {!offer.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">নিষ্ক্রিয়</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      শেষ: {new Date(offer.offer_end_date).toLocaleString("bn-BD")}
                      {offer.description && ` • ${offer.description}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditOffer(offer)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteOffer(offer.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Services List */}
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
                      {s.discount_percentage && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">{s.discount_percentage}% ছাড়</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s.category}
                      {s.pricing_type && <span className="ml-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-semibold">{pricingTypeLabels[s.pricing_type as PricingType] || s.pricing_type}</span>}
                      {' • '}ক্রম: {s.sort_order}
                      {s.price_per_hour && ` • ৳${s.price_per_hour}/ঘন্টা`}
                      {s.price_per_minute && ` • ৳${s.price_per_minute}/মিনিট`}
                      {s.price && !s.price_per_hour && !s.price_per_minute && ` • ৳${s.price}`}
                    </p>
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

        {/* Service Dialog */}
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
              {/* Pricing Type Selector */}
              <div>
                <Label>প্রাইসিং ধরন *</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {(Object.keys(pricingTypeLabels) as PricingType[]).map((pt) => (
                    <button
                      key={pt}
                      onClick={() => setForm({ ...form, pricing_type: pt })}
                      className={`px-3 py-2 rounded-lg text-sm border transition-all text-left ${
                        form.pricing_type === pt ? "bg-primary/10 border-primary/30 text-primary font-semibold" : "bg-secondary/30 border-border/30 text-muted-foreground"
                      }`}
                    >
                      {pricingTypeLabels[pt]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>ক্যাটেগরি</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="বিজ্ঞাপন" />
                </div>
                <div>
                  <Label>ক্রম</Label>
                  <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
                </div>
              </div>

              {/* Fixed / Event Price */}
              {(form.pricing_type === 'fixed' || form.pricing_type === 'event') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>মূল্য (৳)</Label>
                    <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="15000" />
                  </div>
                  <div>
                    <Label>মূল্য লেবেল (ঐচ্ছিক)</Label>
                    <Input value={form.price_label} onChange={(e) => setForm({ ...form, price_label: e.target.value })} placeholder="যোগাযোগ করুন" />
                  </div>
                </div>
              )}

              {/* Per Minute */}
              {form.pricing_type === 'per_minute' && (
                <div>
                  <Label>প্রতি মিনিট মূল্য (৳) *</Label>
                  <Input type="number" value={form.price_per_minute} onChange={(e) => setForm({ ...form, price_per_minute: e.target.value })} placeholder="যেমন: 500" />
                  <p className="text-xs text-muted-foreground mt-1">কাস্টমার মিনিট সিলেক্ট করে মূল্য দেখতে পারবে</p>
                </div>
              )}

              {/* Hourly */}
              {form.pricing_type === 'hourly' && (
                <>
                  <div>
                    <Label>প্রতি ঘন্টা মূল্য (৳) *</Label>
                    <Input type="number" value={form.price_per_hour} onChange={(e) => setForm({ ...form, price_per_hour: e.target.value })} placeholder="যেমন: 2000" />
                    <p className="text-xs text-muted-foreground mt-1">কাস্টমার ঘন্টা সিলেক্ট করে মূল্য দেখতে পারবে</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>প্রতি ঘন্টায় এডিটেড ছবি</Label>
                      <Input type="number" value={form.edited_photos_per_hour} onChange={(e) => setForm({ ...form, edited_photos_per_hour: e.target.value })} placeholder="20" />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <Switch checked={form.unlimited_photos_per_hour} onCheckedChange={(v) => setForm({ ...form, unlimited_photos_per_hour: v })} />
                      <Label>আনলিমিটেড ছবি</Label>
                    </div>
                  </div>
                </>
              )}
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
                <Label>ডিসকাউন্ট (%) — ঐচ্ছিক</Label>
                <Input type="number" value={form.discount_percentage} onChange={(e) => setForm({ ...form, discount_percentage: e.target.value })} placeholder="যেমন: 10" min="0" max="100" />
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

        {/* Offer Dialog */}
        <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-400">
                <Gift className="h-5 w-5" /> {offerEditId ? "অফার সম্পাদনা" : "নতুন অফার যোগ করুন"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>অফারের শিরোনাম</Label>
                <Input value={offerTitle} onChange={(e) => setOfferTitle(e.target.value)} placeholder="বিশেষ অফার" />
              </div>
              <div>
                <Label>বিবরণ (ঐচ্ছিক)</Label>
                <Textarea value={offerDesc} onChange={(e) => setOfferDesc(e.target.value)} placeholder="অফার সম্পর্কে বিস্তারিত..." rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>ডিসকাউন্ট (%)</Label>
                  <Input type="number" value={offerDiscount} onChange={(e) => setOfferDiscount(e.target.value)} placeholder="15" min="1" max="100" />
                </div>
                <div>
                  <Label>অফার শেষ তারিখ ও সময়</Label>
                  <Input type="datetime-local" value={offerEndDate} onChange={(e) => setOfferEndDate(e.target.value)} />
                </div>
              </div>
              {/* Service Selection */}
              {services && services.length > 0 && (
                <div>
                  <Label>কোন সেবায় প্রযোজ্য? (সিলেক্ট না করলে সবগুলোতে প্রযোজ্য হবে)</Label>
                  <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto rounded-lg border border-border/30 p-2">
                    {services.map((s: any) => (
                      <label key={s.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary/30 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={offerServiceIds.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setOfferServiceIds([...offerServiceIds, s.id]);
                            } else {
                              setOfferServiceIds(offerServiceIds.filter(id => id !== s.id));
                            }
                          }}
                          className="rounded border-border"
                        />
                        <span className="text-foreground">{s.title}</span>
                        {s.category && <span className="text-[10px] text-muted-foreground">({s.category})</span>}
                      </label>
                    ))}
                  </div>
                  {offerServiceIds.length > 0 && (
                    <p className="text-xs text-primary mt-1">{offerServiceIds.length}টি সেবা সিলেক্ট করা হয়েছে</p>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch checked={offerActive} onCheckedChange={setOfferActive} />
                <Label>সক্রিয়</Label>
              </div>
              <Button onClick={saveOffer} disabled={!offerDiscount || !offerEndDate} className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                {offerEditId ? "আপডেট করুন" : "অফার যোগ করুন"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default AdminServices;
