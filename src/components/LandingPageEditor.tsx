import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  FileText, Pencil, Check, X, Plus, Trash2, ChevronDown, ChevronUp,
  Eye, EyeOff, GripVertical, Sparkles, Star, Shield, HelpCircle, Phone, Truck
} from "lucide-react";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

// Friendly names and icons for section types
const SECTION_TYPES: Record<string, { label: string; icon: string; description: string }> = {
  hero: { label: "🌴 হিরো সেকশন", icon: "🌴", description: "পেজের সবার উপরে — ব্র্যান্ড নাম ও প্রধান বর্ণনা" },
  benefit_1: { label: "✅ উপকারিতা ১", icon: "✅", description: "প্রথম উপকারিতা কার্ড" },
  benefit_2: { label: "✅ উপকারিতা ২", icon: "✅", description: "দ্বিতীয় উপকারিতা কার্ড" },
  benefit_3: { label: "✅ উপকারিতা ৩", icon: "✅", description: "তৃতীয় উপকারিতা কার্ড" },
  benefit_4: { label: "✅ উপকারিতা ৪", icon: "✅", description: "চতুর্থ উপকারিতা কার্ড" },
  benefit_5: { label: "✅ উপকারিতা ৫", icon: "✅", description: "পঞ্চম উপকারিতা কার্ড" },
  quality_1: { label: "⭐ গুণাগুণ ১", icon: "⭐", description: "প্রথম গুণাগুণ কার্ড" },
  quality_2: { label: "⭐ গুণাগুণ ২", icon: "⭐", description: "দ্বিতীয় গুণাগুণ কার্ড" },
  quality_3: { label: "⭐ গুণাগুণ ৩", icon: "⭐", description: "তৃতীয় গুণাগুণ কার্ড" },
  quality_4: { label: "⭐ গুণাগুণ ৪", icon: "⭐", description: "চতুর্থ গুণাগুণ কার্ড" },
  cta: { label: "📞 যোগাযোগ সেকশন", icon: "📞", description: "কল-টু-অ্যাকশন — অর্ডার করতে যোগাযোগ" },
};

const getSectionInfo = (key: string) => {
  if (SECTION_TYPES[key]) return SECTION_TYPES[key];
  if (key.startsWith("benefit_")) return { label: `✅ উপকারিতা ${key.split("_")[1]}`, icon: "✅", description: "উপকারিতা কার্ড" };
  if (key.startsWith("quality_")) return { label: `⭐ গুণাগুণ ${key.split("_")[1]}`, icon: "⭐", description: "গুণাগুণ কার্ড" };
  return { label: key, icon: "📄", description: "" };
};

// Available section keys for adding new sections
const ADD_OPTIONS = [
  { key: "hero", label: "🌴 হিরো সেকশন" },
  { key: "benefit_1", label: "✅ উপকারিতা ১" },
  { key: "benefit_2", label: "✅ উপকারিতা ২" },
  { key: "benefit_3", label: "✅ উপকারিতা ৩" },
  { key: "benefit_4", label: "✅ উপকারিতা ৪" },
  { key: "benefit_5", label: "✅ উপকারিতা ৫" },
  { key: "quality_1", label: "⭐ গুণাগুণ ১" },
  { key: "quality_2", label: "⭐ গুণাগুণ ২" },
  { key: "quality_3", label: "⭐ গুণাগুণ ৩" },
  { key: "quality_4", label: "⭐ গুণাগুণ ৪" },
  { key: "cta", label: "📞 যোগাযোগ সেকশন" },
];

// Inline editable section card
const SectionCard = ({ section, index, onSaved, onDelete }: {
  section: any;
  index: number;
  onSaved: () => void;
  onDelete: (id: string) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(section.title || "");
  const [content, setContent] = useState(section.content || "");
  const [icon, setIcon] = useState(section.icon || "");
  const [imageUrl, setImageUrl] = useState(section.image_url || "");
  const [isActive, setIsActive] = useState(section.is_active);

  const info = getSectionInfo(section.section_key);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("landing_page_sections").update({
      title: title.trim() || null,
      content: content.trim() || null,
      icon: icon.trim() || null,
      image_url: imageUrl.trim() || null,
      is_active: isActive,
    }).eq("id", section.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("সেভ হয়েছে ✓");
    setEditing(false);
    onSaved();
  };

  const handleCancel = () => {
    setTitle(section.title || "");
    setContent(section.content || "");
    setIcon(section.icon || "");
    setImageUrl(section.image_url || "");
    setIsActive(section.is_active);
    setEditing(false);
  };

  const toggleActive = async () => {
    const newVal = !isActive;
    setIsActive(newVal);
    await supabase.from("landing_page_sections").update({ is_active: newVal }).eq("id", section.id);
    toast.success(newVal ? "সক্রিয় করা হয়েছে" : "নিষ্ক্রিয় করা হয়েছে");
    onSaved();
  };

  return (
    <div className={`bg-card border rounded-xl transition-all ${editing ? "border-primary/50 shadow-lg shadow-primary/5" : "border-border/30 hover:border-border/50"} ${!isActive ? "opacity-60" : ""}`}>
      {/* Header - always visible */}
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => !editing && setExpanded(!expanded)}>
        {/* Serial Number */}
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-primary">{toBn(index)}</span>
        </div>
        <span className="text-xl flex-shrink-0">{section.icon || info.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-sm">{section.title || info.label}</span>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{info.label.replace(/^[^\s]+\s/, "")}</span>
          </div>
          {!expanded && section.content && (
            <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-[300px]">{section.content}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); toggleActive(); }}>
            {isActive ? <Eye className="h-3.5 w-3.5 text-emerald-400" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setEditing(true); setExpanded(true); }}>
            <Pencil className="h-3.5 w-3.5 text-primary" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); onDelete(section.id); }}>
            <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
          </Button>
          {!editing && (
            expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded / Edit view */}
      {(expanded || editing) && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/20 pt-3">
          {editing ? (
            <>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">শিরোনাম</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="সেকশনের শিরোনাম"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">বিবরণ / লেখা</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="সেকশনের বিবরণ লিখুন..."
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">আইকন (ইমোজি)</Label>
                  <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🌴" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">ছবির URL</Label>
                  <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="mt-1" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <span className="text-xs text-muted-foreground">{isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleCancel} className="h-8 gap-1">
                    <X className="h-3 w-3" /> বাতিল
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 gap-1">
                    <Check className="h-3 w-3" /> {saving ? "সেভ হচ্ছে..." : "সেভ"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2 text-sm">
              {section.content && (
                <div>
                  <span className="text-[11px] text-muted-foreground font-medium">বিবরণ:</span>
                  <p className="text-foreground mt-0.5">{section.content}</p>
                </div>
              )}
              {section.image_url && (
                <div>
                  <span className="text-[11px] text-muted-foreground font-medium">ছবি:</span>
                  <img src={section.image_url} alt="" className="h-16 w-24 object-cover rounded-lg mt-1 border border-border/30" />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const LandingPageEditor = () => {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [addKey, setAddKey] = useState("");
  const [addTitle, setAddTitle] = useState("");
  const [addContent, setAddContent] = useState("");
  const [addIcon, setAddIcon] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [togglingDelivery, setTogglingDelivery] = useState(false);

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-delivery-editor"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("id, free_delivery, offer_end_date, delivery_charge, delivery_charge_per_extra_kg, free_delivery_min_kg").limit(1).single();
      return data;
    },
  });

  const toggleFreeDelivery = async () => {
    if (!siteSettings) return;
    setTogglingDelivery(true);
    const newVal = !siteSettings.free_delivery;
    const { error } = await supabase.from("site_settings").update({ free_delivery: newVal }).eq("id", siteSettings.id);
    setTogglingDelivery(false);
    if (error) { toast.error(error.message); return; }
    toast.success(newVal ? "ফ্রি ডেলিভারি চালু" : "ফ্রি ডেলিভারি বন্ধ");
    queryClient.invalidateQueries({ queryKey: ["site-settings-delivery-editor"] });
    queryClient.invalidateQueries({ queryKey: ["site-settings-delivery"] });
  };

  const [offerDate, setOfferDate] = useState("");
  const [offerTime, setOfferTime] = useState("");
  const [savingOffer, setSavingOffer] = useState(false);

  // Sync offer date/time from settings
  useEffect(() => {
    if (siteSettings?.offer_end_date) {
      const d = new Date(siteSettings.offer_end_date);
      setOfferDate(d.toISOString().split("T")[0]);
      setOfferTime(d.toTimeString().slice(0, 5));
    }
  }, [siteSettings?.offer_end_date]);

  const saveOfferEndDate = async () => {
    if (!siteSettings || !offerDate) return;
    setSavingOffer(true);
    const datetime = new Date(`${offerDate}T${offerTime || "23:59"}:00`);
    const { error } = await supabase.from("site_settings").update({ offer_end_date: datetime.toISOString() }).eq("id", siteSettings.id);
    setSavingOffer(false);
    if (error) { toast.error(error.message); return; }
    toast.success("অফারের শেষ তারিখ আপডেট হয়েছে");
    queryClient.invalidateQueries({ queryKey: ["site-settings-delivery-editor"] });
    queryClient.invalidateQueries({ queryKey: ["offer-end-date"] });
  };

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

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-landing-sections"] });

  const handleDelete = async (id: string) => {
    if (!confirm("এই সেকশন মুছে ফেলতে চান?")) return;
    const { error } = await supabase.from("landing_page_sections").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("সেকশন মুছে ফেলা হয়েছে");
    invalidate();
  };

  const handleAdd = async () => {
    if (!addKey) { toast.error("সেকশন টাইপ বাছুন"); return; }
    setAddSaving(true);
    const info = getSectionInfo(addKey);
    const maxSort = sections?.reduce((max, s: any) => Math.max(max, s.sort_order || 0), 0) || 0;
    const { error } = await supabase.from("landing_page_sections").insert({
      section_key: addKey,
      title: addTitle.trim() || info.label.replace(/^[^\s]+\s/, ""),
      content: addContent.trim() || null,
      icon: addIcon.trim() || info.icon,
      sort_order: maxSort + 1,
      is_active: true,
    });
    setAddSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("নতুন সেকশন যোগ হয়েছে");
    setAddOpen(false);
    setAddKey("");
    setAddTitle("");
    setAddContent("");
    setAddIcon("");
    invalidate();
  };

  // Existing keys
  const existingKeys = new Set(sections?.map((s: any) => s.section_key) || []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-bold text-foreground">ল্যান্ডিং পেজ কন্টেন্ট</h2>
        </div>
        <Button size="sm" onClick={() => setAddOpen(!addOpen)} className="gap-1.5">
          <Plus className="h-4 w-4" /> সেকশন যোগ
        </Button>
      </div>

      <p className="text-xs text-muted-foreground bg-muted/50 border border-border/30 rounded-lg px-3 py-2">
        প্রতিটি সেকশনের পাশের ✏️ বাটনে ক্লিক করে শিরোনাম, বিবরণ ও আইকন সরাসরি পরিবর্তন করুন। 👁️ দিয়ে দেখান/লুকান।
      </p>

      {/* Free Delivery Toggle */}
      <div className="bg-card border border-border/30 rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Truck className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">ফ্রি ডেলিভারি</p>
            <p className="text-[11px] text-muted-foreground">বন্ধ করলে ল্যান্ডিং পেজ থেকে ডেলিভারি সংক্রান্ত সব লেখা হাইড হবে</p>
          </div>
        </div>
        <Switch
          checked={siteSettings?.free_delivery ?? true}
          onCheckedChange={toggleFreeDelivery}
          disabled={togglingDelivery || !siteSettings}
        />
      </div>

      {/* Delivery Charge Settings - only when free delivery is OFF */}
      {siteSettings && !siteSettings.free_delivery && (
        <div className="bg-card border border-border/30 rounded-xl p-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <span className="text-sm">💰</span>
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">ডেলিভারি চার্জ সেটিংস</p>
              <p className="text-[11px] text-muted-foreground">ওজন অনুযায়ী ডেলিভারি চার্জ নির্ধারণ করুন</p>
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">১ কেজি বা তার কম</p>
                <p className="text-[10px] text-muted-foreground">বেস ডেলিভারি চার্জ</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-muted-foreground">৳</span>
                <Input
                  type="number"
                  min={0}
                  value={siteSettings.delivery_charge ?? 130}
                  onChange={async (e) => {
                    const val = Number(e.target.value) || 0;
                    await supabase.from("site_settings").update({ delivery_charge: val }).eq("id", siteSettings.id);
                    queryClient.invalidateQueries({ queryKey: ["site-settings-delivery-editor"] });
                    queryClient.invalidateQueries({ queryKey: ["landing-site-settings"] });
                  }}
                  className="h-8 w-24 text-center"
                />
              </div>
            </div>

            <div className="border-t border-border/30 pt-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">প্রতি অতিরিক্ত কেজি</p>
                <p className="text-[10px] text-muted-foreground">১ কেজির বেশি হলে প্রতি কেজিতে বাড়তি চার্জ</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-muted-foreground">৳</span>
                <Input
                  type="number"
                  min={0}
                  value={siteSettings.delivery_charge_per_extra_kg ?? 50}
                  onChange={async (e) => {
                    const val = Number(e.target.value) || 0;
                    await supabase.from("site_settings").update({ delivery_charge_per_extra_kg: val }).eq("id", siteSettings.id);
                    queryClient.invalidateQueries({ queryKey: ["site-settings-delivery-editor"] });
                    queryClient.invalidateQueries({ queryKey: ["landing-site-settings"] });
                  }}
                  className="h-8 w-24 text-center"
                />
              </div>
            </div>

            <div className="border-t border-border/30 pt-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">ফ্রি ডেলিভারি (মিনিমাম কেজি)</p>
                <p className="text-[10px] text-muted-foreground">এত কেজি বা বেশি হলে ডেলিভারি ফ্রি</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={(siteSettings as any).free_delivery_min_kg ?? 5}
                  onChange={async (e) => {
                    const val = Number(e.target.value) || 0;
                    await supabase.from("site_settings").update({ free_delivery_min_kg: val } as any).eq("id", siteSettings.id);
                    queryClient.invalidateQueries({ queryKey: ["site-settings-delivery-editor"] });
                    queryClient.invalidateQueries({ queryKey: ["landing-site-settings"] });
                  }}
                  className="h-8 w-24 text-center"
                />
                <span className="text-sm font-bold text-muted-foreground">কেজি</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5">
            💡 উদাহরণ: ১ কেজি = ৳{siteSettings.delivery_charge ?? 130}, ১.৫ কেজি = ৳{Math.round((siteSettings.delivery_charge ?? 130) + (siteSettings.delivery_charge_per_extra_kg ?? 50) * 0.5)}, ২ কেজি = ৳{Math.round((siteSettings.delivery_charge ?? 130) + (siteSettings.delivery_charge_per_extra_kg ?? 50) * 1)}, {(siteSettings as any).free_delivery_min_kg ?? 5}+ কেজি = ফ্রি 🚚
          </p>
        </div>
      )}

      {/* Offer Countdown Timer Control */}
      <div className="bg-card border border-border/30 rounded-xl p-3 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <span className="text-sm">⏰</span>
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">অফার কাউন্টডাউন টাইমার</p>
            <p className="text-[11px] text-muted-foreground">অফারের শেষ তারিখ ও সময় সেট করুন</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">তারিখ</Label>
            <Input type="date" value={offerDate} onChange={e => setOfferDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">সময়</Label>
            <Input type="time" value={offerTime} onChange={e => setOfferTime(e.target.value)} className="mt-1" />
          </div>
        </div>
        <Button size="sm" onClick={saveOfferEndDate} disabled={savingOffer || !offerDate} className="w-full gap-1">
          <Check className="h-3 w-3" /> {savingOffer ? "সেভ হচ্ছে..." : "কাউন্টডাউন আপডেট করুন"}
        </Button>
      </div>


      {addOpen && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
          <h4 className="font-semibold text-foreground text-sm">নতুন সেকশন যোগ করুন</h4>
          <div>
            <Label className="text-xs">সেকশন টাইপ বাছুন</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {ADD_OPTIONS.filter(o => !existingKeys.has(o.key)).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => {
                    setAddKey(opt.key);
                    const info = getSectionInfo(opt.key);
                    setAddIcon(info.icon);
                  }}
                  className={`text-left p-2.5 rounded-lg border text-xs font-medium transition-all ${
                    addKey === opt.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/30 bg-card text-foreground hover:border-border"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {ADD_OPTIONS.filter(o => !existingKeys.has(o.key)).length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">সব সেকশন টাইপ ইতিমধ্যে যোগ করা আছে</p>
            )}
          </div>
          {addKey && (
            <>
              <div>
                <Label className="text-xs">শিরোনাম</Label>
                <Input value={addTitle} onChange={e => setAddTitle(e.target.value)} placeholder="সেকশনের শিরোনাম" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">বিবরণ</Label>
                <Textarea value={addContent} onChange={e => setAddContent(e.target.value)} placeholder="বিবরণ লিখুন..." rows={2} className="mt-1" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAdd} disabled={addSaving} className="gap-1">
                  <Check className="h-3 w-3" /> {addSaving ? "যোগ হচ্ছে..." : "যোগ করুন"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setAddOpen(false); setAddKey(""); }}>বাতিল</Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Section List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 bg-card animate-pulse rounded-xl" />)}
        </div>
      ) : !sections?.length ? (
        <p className="text-muted-foreground text-center py-8">কোনো কন্টেন্ট নেই — উপরের বাটন দিয়ে সেকশন যোগ করুন</p>
      ) : (
        <div className="space-y-2">
          {sections.map((s: any, i: number) => (
            <SectionCard key={s.id} section={s} index={i + 1} onSaved={invalidate} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
};

export default LandingPageEditor;
