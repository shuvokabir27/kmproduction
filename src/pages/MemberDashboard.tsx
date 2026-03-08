import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemberBalance } from "@/hooks/useMemberBalance";
import { Wallet, Calendar, CreditCard, TrendingUp, Film, ExternalLink, FileText, UserCog, Plus, Trash2, Save, Camera, ImageIcon, ScrollText, Eye, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { ScriptEditor } from "@/components/ScriptEditor";
import { NoticeBoard } from "@/components/NoticeBoard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

interface FavoriteWork {
  id?: string;
  title: string;
  video_url: string;
  description: string;
}

const MemberDashboard = () => {
  const { user, profile, loading, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [viewScriptOpen, setViewScriptOpen] = useState(false);
  const [viewShooting, setViewShooting] = useState<any>(null);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const handleChangePassword = async () => {
    if (newPw.length < 6) { toast.error("নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে"); return; }
    if (newPw !== confirmPw) { toast.error("পাসওয়ার্ড মিলছে না"); return; }
    setPwSaving(true);
    try {
      // Verify current password by re-signing in
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: profile?.email || user?.email || "",
        password: currentPw,
      });
      if (signInErr) { toast.error("বর্তমান পাসওয়ার্ড ভুল"); setPwSaving(false); return; }

      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast.success("পাসওয়ার্ড পরিবর্তন হয়েছে!");
      setPwDialogOpen(false);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPwSaving(false);
    }
  };

  // Profile extra fields
  const [extraFields, setExtraFields] = useState({
    address: "", education: "", achievements: "", short_bio: "",
    favorite_actor: "", favorite_actress: "", favorite_color: "",
    favorite_dress: "", favorite_food: "", date_of_birth: "",
    full_name_en: "", designation_en: "", short_bio_en: "",
    address_en: "", education_en: "", achievements_en: "",
    favorite_actor_en: "", favorite_actress_en: "", favorite_color_en: "",
    favorite_dress_en: "", favorite_food_en: "",
  });
  const [editTab, setEditTab] = useState<"bn" | "en">("bn");

  // Favorite works
  const [works, setWorks] = useState<FavoriteWork[]>([]);

  const { data: balance } = useMemberBalance(profile?.id);

  const { data: recentPayments } = useQuery({
    queryKey: ["my-payments", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("*").eq("member_id", profile!.id).order("payment_date", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const { data: recentAttendance } = useQuery({
    queryKey: ["my-attendance", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("attendance").select("*, shootings(name, shoot_date)").eq("member_id", profile!.id).order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const { data: shootings } = useQuery({
    queryKey: ["member-shootings"],
    queryFn: async () => {
      const { data } = await supabase.from("shootings").select("*").order("shoot_date", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const { data: favoriteWorks } = useQuery({
    queryKey: ["my-favorite-works", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("favorite_works" as any).select("*").eq("member_id", profile!.id).order("sort_order");
      return (data ?? []) as any[];
    },
  });

  const { data: permittedScripts } = useQuery({
    queryKey: ["my-scripts", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("scripts").select("*").order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const [viewScriptData, setViewScriptData] = useState<any>(null);

  useEffect(() => {
    if (profile) {
      setExtraFields({
        address: (profile as any).address || "",
        education: (profile as any).education || "",
        achievements: (profile as any).achievements || "",
        short_bio: (profile as any).short_bio || "",
        favorite_actor: (profile as any).favorite_actor || "",
        favorite_actress: (profile as any).favorite_actress || "",
        favorite_color: (profile as any).favorite_color || "",
        favorite_dress: (profile as any).favorite_dress || "",
        favorite_food: (profile as any).favorite_food || "",
        date_of_birth: (profile as any).date_of_birth || "",
        full_name_en: (profile as any).full_name_en || "",
        designation_en: (profile as any).designation_en || "",
        short_bio_en: (profile as any).short_bio_en || "",
        address_en: (profile as any).address_en || "",
        education_en: (profile as any).education_en || "",
        achievements_en: (profile as any).achievements_en || "",
        favorite_actor_en: (profile as any).favorite_actor_en || "",
        favorite_actress_en: (profile as any).favorite_actress_en || "",
        favorite_color_en: (profile as any).favorite_color_en || "",
        favorite_dress_en: (profile as any).favorite_dress_en || "",
        favorite_food_en: (profile as any).favorite_food_en || "",
      });
    }
  }, [profile]);

  useEffect(() => {
    if (favoriteWorks) {
      setWorks(favoriteWorks.map((w: any) => ({ id: w.id, title: w.title, video_url: w.video_url || "", description: w.description || "" })));
    }
  }, [favoriteWorks]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;

  const paymentMethodLabel: Record<string, string> = { bank: "ব্যাংক", bkash: "বিকাশ", nagad: "নগদ", cash: "ক্যাশ" };

  const setExtra = (key: string, value: string) => setExtraFields(f => ({ ...f, [key]: value }));

  const addWork = () => {
    if (works.length >= 5) { toast.error("সর্বোচ্চ ৫টি কাজ যোগ করা যায়"); return; }
    setWorks([...works, { title: "", video_url: "", description: "" }]);
  };

  const updateWork = (idx: number, field: keyof FavoriteWork, value: string) => {
    setWorks(ws => ws.map((w, i) => i === idx ? { ...w, [field]: value } : w));
  };

  const removeWork = (idx: number) => {
    setWorks(ws => ws.filter((_, i) => i !== idx));
  };

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${profile!.id}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("member-photos").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: pub } = supabase.storage.from("member-photos").getPublicUrl(path);
    return pub.publicUrl;
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const updates: any = {
        address: extraFields.address || null,
        education: extraFields.education || null,
        achievements: extraFields.achievements || null,
        short_bio: extraFields.short_bio || null,
        favorite_actor: extraFields.favorite_actor || null,
        favorite_actress: extraFields.favorite_actress || null,
        favorite_color: extraFields.favorite_color || null,
        favorite_dress: extraFields.favorite_dress || null,
        favorite_food: extraFields.favorite_food || null,
        date_of_birth: extraFields.date_of_birth || null,
        full_name_en: extraFields.full_name_en || null,
        designation_en: extraFields.designation_en || null,
        short_bio_en: extraFields.short_bio_en || null,
        address_en: extraFields.address_en || null,
        education_en: extraFields.education_en || null,
        achievements_en: extraFields.achievements_en || null,
        favorite_actor_en: extraFields.favorite_actor_en || null,
        favorite_actress_en: extraFields.favorite_actress_en || null,
        favorite_color_en: extraFields.favorite_color_en || null,
        favorite_dress_en: extraFields.favorite_dress_en || null,
        favorite_food_en: extraFields.favorite_food_en || null,
      };

      if (photoFile) {
        updates.photo_url = await uploadFile(photoFile, "profiles");
      }
      if (coverFile) {
        updates.cover_url = await uploadFile(coverFile, "covers");
      }

      const { error } = await supabase.from("profiles").update(updates).eq("id", profile.id);
      if (error) throw error;

      // Delete old works and insert new ones
      await supabase.from("favorite_works" as any).delete().eq("member_id", profile.id);
      const validWorks = works.filter(w => w.title.trim());
      if (validWorks.length > 0) {
        const { error: wErr } = await supabase.from("favorite_works" as any).insert(
          validWorks.map((w, i) => ({
            member_id: profile.id,
            title: w.title,
            video_url: w.video_url || null,
            description: w.description || null,
            sort_order: i,
          }))
        );
        if (wErr) throw wErr;
      }

      toast.success("প্রোফাইল আপডেট হয়েছে!");
      setPhotoFile(null); setCoverFile(null);
      setPhotoPreview(null); setCoverPreview(null);
      queryClient.invalidateQueries({ queryKey: ["my-favorite-works"] });
      setProfileEditOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">স্বাগতম, {profile?.full_name}</h1>
            <p className="text-muted-foreground text-sm">আইডি: {profile?.member_id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 border-border/50" onClick={() => setPwDialogOpen(true)}>
              <KeyRound className="h-4 w-4" /> পাসওয়ার্ড
            </Button>
            <Button variant="outline" size="sm" className="gap-2 border-border/50" onClick={() => setProfileEditOpen(true)}>
              <UserCog className="h-4 w-4" /> প্রোফাইল এডিট
            </Button>
          </div>
        </div>

        {/* Balance Cards */}
        <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-4" variants={container} initial="hidden" animate="show">
          <motion.div variants={item}>
            <Card className="p-5 bg-card border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-success" /></div>
                <div><p className="text-xs text-muted-foreground">মোট আয়</p><p className="text-2xl font-bold text-foreground">৳{balance?.totalEarned?.toLocaleString("bn-BD") || "০"}</p></div>
              </div>
            </Card>
          </motion.div>
          <motion.div variants={item}>
            <Card className="p-5 bg-card border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><CreditCard className="h-5 w-5 text-primary" /></div>
                <div><p className="text-xs text-muted-foreground">মোট প্রদান</p><p className="text-2xl font-bold text-foreground">৳{balance?.totalPaid?.toLocaleString("bn-BD") || "০"}</p></div>
              </div>
            </Card>
          </motion.div>
          <motion.div variants={item}>
            <Card className="p-5 bg-card border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center"><Wallet className="h-5 w-5 text-warning" /></div>
                <div><p className="text-xs text-muted-foreground">বকেয়া ব্যালেন্স</p><p className="text-2xl font-bold text-foreground">৳{balance?.balance?.toLocaleString("bn-BD") || "০"}</p></div>
              </div>
            </Card>
          </motion.div>
        </motion.div>

        {/* Shootings */}
        <Card className="bg-card border-border/50">
          <div className="p-4 border-b border-border/30">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><Film className="h-4 w-4 text-primary" /> শুটিং তালিকা</h2>
          </div>
          <div className="divide-y divide-border/30 max-h-80 overflow-auto">
            {shootings?.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">কোনো শুটিং নেই</div>}
            {shootings?.map((s: any) => {
              const statusMap: Record<string, { label: string; color: string }> = {
                plan: { label: "প্লান", color: "bg-muted/50 text-muted-foreground" },
                upcoming: { label: "আসন্ন", color: "bg-warning/10 text-warning" },
                ongoing: { label: "চলছে", color: "bg-primary/10 text-primary" },
                completed: { label: "শুটিং শেষ", color: "bg-success/10 text-success" },
                editing: { label: "এডিটিং চলছে", color: "bg-accent/50 text-accent-foreground" },
                editing_done: { label: "এডিটিং শেষ", color: "bg-success/15 text-success" },
                published: { label: "পাবলিশ হয়েছে", color: "bg-success/10 text-success" },
              };
              const info = statusMap[s.status] || statusMap.upcoming;
              return (
                <div key={s.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(s.shoot_date).toLocaleDateString("bn-BD")}{s.location && ` • ${s.location}`}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.script_content && <button onClick={() => { setViewShooting(s); setViewScriptOpen(true); }} className="text-primary hover:text-primary/80"><FileText className="h-3.5 w-3.5" /></button>}
                    {s.script_url && <a href={s.script_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80"><ExternalLink className="h-3.5 w-3.5" /></a>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Permitted Scripts */}
        <Card className="bg-card border-border/50">
          <div className="p-4 border-b border-border/30">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><ScrollText className="h-4 w-4 text-primary" /> স্ক্রিপ্ট সমূহ</h2>
          </div>
          <div className="divide-y divide-border/30 max-h-80 overflow-auto">
            {(!permittedScripts || permittedScripts.length === 0) && <div className="p-4 text-sm text-muted-foreground text-center">কোনো স্ক্রিপ্ট অ্যাক্সেস নেই</div>}
            {permittedScripts?.map((script: any) => (
              <div key={script.id} className="p-3 flex items-center justify-between hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => setViewScriptData(script)}>
                <div>
                  <p className="text-sm text-foreground font-medium">{script.title}</p>
                  <p className="text-xs text-muted-foreground">{script.updated_at ? new Date(script.updated_at).toLocaleDateString("bn-BD") : ""}</p>
                </div>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card border-border/50">
            <div className="p-4 border-b border-border/30"><h2 className="font-semibold text-foreground flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> পেমেন্ট হিস্ট্রি</h2></div>
            <div className="divide-y divide-border/30 max-h-80 overflow-auto">
              {recentPayments?.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">কোনো পেমেন্ট নেই</div>}
              {recentPayments?.map((p) => (
                <div key={p.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground">৳{Number(p.amount).toLocaleString("bn-BD")}</p>
                    <p className="text-xs text-muted-foreground">{paymentMethodLabel[p.payment_method] || p.payment_method} • {new Date(p.payment_date).toLocaleDateString("bn-BD")}</p>
                  </div>
                  {p.transaction_id && <span className="text-xs text-muted-foreground">#{p.transaction_id}</span>}
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-card border-border/50">
            <div className="p-4 border-b border-border/30"><h2 className="font-semibold text-foreground flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> হাজিরা হিস্ট্রি</h2></div>
            <div className="divide-y divide-border/30 max-h-80 overflow-auto">
              {recentAttendance?.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">কোনো হাজিরা নেই</div>}
              {recentAttendance?.map((a: any) => (
                <div key={a.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground">{a.shootings?.name || "শুটিং"}</p>
                    <p className="text-xs text-muted-foreground">{a.shootings?.shoot_date ? new Date(a.shootings.shoot_date).toLocaleDateString("bn-BD") : ""}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_present ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{a.is_present ? "উপস্থিত" : "অনুপস্থিত"}</span>
                    {a.daily_rate > 0 && <p className="text-xs text-muted-foreground mt-0.5">৳{Number(a.daily_rate).toLocaleString("bn-BD")}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Profile Edit Dialog */}
      <Dialog open={profileEditOpen} onOpenChange={setProfileEditOpen}>
        <DialogContent className="bg-card border-border/50 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">প্রোফাইল তথ্য আপডেট</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Photo & Cover Upload */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-foreground text-xs mb-1 block">প্রোফাইল ছবি</Label>
                <input type="file" accept="image/*" ref={photoRef} className="hidden" onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); }
                }} />
                <button
                  type="button"
                  onClick={() => photoRef.current?.click()}
                  className="w-full h-24 rounded-lg border-2 border-dashed border-border/50 bg-secondary/50 flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors overflow-hidden"
                >
                  {photoPreview || (profile as any)?.photo_url ? (
                    <img src={photoPreview || (profile as any)?.photo_url} alt="photo" className="w-full h-full object-cover" />
                  ) : (
                    <><Camera className="h-5 w-5 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">ছবি আপলোড</span></>
                  )}
                </button>
              </div>
              <div>
                <Label className="text-foreground text-xs mb-1 block">কভার ফটো</Label>
                <input type="file" accept="image/*" ref={coverRef} className="hidden" onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { setCoverFile(f); setCoverPreview(URL.createObjectURL(f)); }
                }} />
                <button
                  type="button"
                  onClick={() => coverRef.current?.click()}
                  className="w-full h-24 rounded-lg border-2 border-dashed border-border/50 bg-secondary/50 flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors overflow-hidden"
                >
                  {coverPreview || (profile as any)?.cover_url ? (
                    <img src={coverPreview || (profile as any)?.cover_url} alt="cover" className="w-full h-full object-cover" />
                  ) : (
                    <><ImageIcon className="h-5 w-5 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">কভার আপলোড</span></>
                  )}
                </button>
              </div>
            </div>
            {/* Language Tabs */}
            <div className="flex gap-1 p-1 rounded-lg bg-secondary/50 border border-border/30">
              <button
                type="button"
                onClick={() => setEditTab("bn")}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${editTab === "bn" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                বাংলা
              </button>
              <button
                type="button"
                onClick={() => setEditTab("en")}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${editTab === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                English
              </button>
            </div>

            {editTab === "bn" ? (
              <>
                <div>
                  <Label className="text-foreground text-xs">শর্ট বিবরণ</Label>
                  <Textarea value={extraFields.short_bio} onChange={e => setExtra("short_bio", e.target.value)} className="bg-secondary border-border/50" rows={2} placeholder="নিজের সম্পর্কে সংক্ষেপে লিখুন..." />
                </div>
                <div>
                  <Label className="text-foreground text-xs">ঠিকানা</Label>
                  <Input value={extraFields.address} onChange={e => setExtra("address", e.target.value)} className="bg-secondary border-border/50" />
                </div>
                <div>
                  <Label className="text-foreground text-xs">শিক্ষাগত যোগ্যতা</Label>
                  <Input value={extraFields.education} onChange={e => setExtra("education", e.target.value)} className="bg-secondary border-border/50" placeholder="যেমন: বি.এ (অনার্স)" />
                </div>
                <div>
                  <Label className="text-foreground text-xs">জন্ম তারিখ</Label>
                  <Input type="date" value={extraFields.date_of_birth} onChange={e => setExtra("date_of_birth", e.target.value)} className="bg-secondary border-border/50" />
                </div>
                <div>
                  <Label className="text-foreground text-xs">অর্জন</Label>
                  <Textarea value={extraFields.achievements} onChange={e => setExtra("achievements", e.target.value)} className="bg-secondary border-border/50" rows={2} placeholder="আপনার উল্লেখযোগ্য অর্জনসমূহ..." />
                </div>

                <div className="border-t border-border/30 pt-3">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">পছন্দের তথ্য</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-foreground text-xs">পছন্দের নায়ক</Label>
                      <Input value={extraFields.favorite_actor} onChange={e => setExtra("favorite_actor", e.target.value)} className="bg-secondary border-border/50" />
                    </div>
                    <div>
                      <Label className="text-foreground text-xs">পছন্দের নায়িকা</Label>
                      <Input value={extraFields.favorite_actress} onChange={e => setExtra("favorite_actress", e.target.value)} className="bg-secondary border-border/50" />
                    </div>
                    <div>
                      <Label className="text-foreground text-xs">পছন্দের রং</Label>
                      <Input value={extraFields.favorite_color} onChange={e => setExtra("favorite_color", e.target.value)} className="bg-secondary border-border/50" />
                    </div>
                    <div>
                      <Label className="text-foreground text-xs">পছন্দের পোশাক</Label>
                      <Input value={extraFields.favorite_dress} onChange={e => setExtra("favorite_dress", e.target.value)} className="bg-secondary border-border/50" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-foreground text-xs">পছন্দের খাবার</Label>
                      <Input value={extraFields.favorite_food} onChange={e => setExtra("favorite_food", e.target.value)} className="bg-secondary border-border/50" />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-foreground text-xs">Full Name (English)</Label>
                  <Input value={extraFields.full_name_en} onChange={e => setExtra("full_name_en", e.target.value)} className="bg-secondary border-border/50" placeholder="e.g. John Doe" />
                </div>
                <div>
                  <Label className="text-foreground text-xs">Designation (English)</Label>
                  <Input value={extraFields.designation_en} onChange={e => setExtra("designation_en", e.target.value)} className="bg-secondary border-border/50" placeholder="e.g. Director" />
                </div>
                <div>
                  <Label className="text-foreground text-xs">Short Bio (English)</Label>
                  <Textarea value={extraFields.short_bio_en} onChange={e => setExtra("short_bio_en", e.target.value)} className="bg-secondary border-border/50" rows={2} placeholder="Write briefly about yourself..." />
                </div>
                <div>
                  <Label className="text-foreground text-xs">Address (English)</Label>
                  <Input value={extraFields.address_en} onChange={e => setExtra("address_en", e.target.value)} className="bg-secondary border-border/50" placeholder="e.g. Kuakata, Patuakhali" />
                </div>
                <div>
                  <Label className="text-foreground text-xs">Education (English)</Label>
                  <Input value={extraFields.education_en} onChange={e => setExtra("education_en", e.target.value)} className="bg-secondary border-border/50" placeholder="e.g. B.A (Honors)" />
                </div>
                <div>
                  <Label className="text-foreground text-xs">Achievements (English)</Label>
                  <Textarea value={extraFields.achievements_en} onChange={e => setExtra("achievements_en", e.target.value)} className="bg-secondary border-border/50" rows={2} placeholder="Your notable achievements..." />
                </div>

                <div className="border-t border-border/30 pt-3">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Favorites</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-foreground text-xs">Favorite Actor</Label>
                      <Input value={extraFields.favorite_actor_en} onChange={e => setExtra("favorite_actor_en", e.target.value)} className="bg-secondary border-border/50" />
                    </div>
                    <div>
                      <Label className="text-foreground text-xs">Favorite Actress</Label>
                      <Input value={extraFields.favorite_actress_en} onChange={e => setExtra("favorite_actress_en", e.target.value)} className="bg-secondary border-border/50" />
                    </div>
                    <div>
                      <Label className="text-foreground text-xs">Favorite Color</Label>
                      <Input value={extraFields.favorite_color_en} onChange={e => setExtra("favorite_color_en", e.target.value)} className="bg-secondary border-border/50" />
                    </div>
                    <div>
                      <Label className="text-foreground text-xs">Favorite Dress</Label>
                      <Input value={extraFields.favorite_dress_en} onChange={e => setExtra("favorite_dress_en", e.target.value)} className="bg-secondary border-border/50" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-foreground text-xs">Favorite Food</Label>
                      <Input value={extraFields.favorite_food_en} onChange={e => setExtra("favorite_food_en", e.target.value)} className="bg-secondary border-border/50" />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="border-t border-border/30 pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium">প্রিয় ৫টি কাজ (ভিডিও লিংকসহ)</p>
                {works.length < 5 && (
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary" onClick={addWork}>
                    <Plus className="h-3.5 w-3.5" /> যোগ করুন
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {works.map((w, i) => (
                  <div key={i} className="p-3 rounded-lg bg-secondary/50 border border-border/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">কাজ #{i + 1}</span>
                      <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeWork(i)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Input value={w.title} onChange={e => updateWork(i, "title", e.target.value)} placeholder="কাজের নাম" className="bg-background border-border/50 h-8 text-sm" />
                    <Input value={w.video_url} onChange={e => updateWork(i, "video_url", e.target.value)} placeholder="ভিডিও লিংক (YouTube/Facebook)" className="bg-background border-border/50 h-8 text-sm" />
                    <Input value={w.description} onChange={e => updateWork(i, "description", e.target.value)} placeholder="সংক্ষিপ্ত বিবরণ" className="bg-background border-border/50 h-8 text-sm" />
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleSaveProfile} className="w-full gap-2" disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {viewShooting && (
        <ScriptEditor
          open={viewScriptOpen}
          onOpenChange={setViewScriptOpen}
          title={`স্ক্রিপ্ট — ${viewShooting.name}`}
          initialContent={viewShooting.script_content || ""}
          onSave={async () => {}}
          readOnly
        />
      )}

      {/* Script View Dialog — A4 style */}
      <Dialog open={!!viewScriptData} onOpenChange={(open) => !open && setViewScriptData(null)}>
        <DialogContent className="bg-muted/50 border-none max-w-[900px] w-[95vw] max-h-[95vh] p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/20 bg-card/80 backdrop-blur">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-primary" />
              {viewScriptData?.title}
            </h2>
          </div>
          <div className="overflow-y-auto p-4 md:p-8 flex justify-center" style={{ maxHeight: "calc(95vh - 56px)" }}>
            {/* A4 Page */}
            <div
              className="bg-white shadow-2xl rounded-sm w-full"
              style={{
                maxWidth: "210mm",
                minHeight: "297mm",
                padding: "20mm 25mm",
                color: "#1a1a1a",
                fontFamily: "'Noto Sans Bengali', 'SolaimanLipi', sans-serif",
                lineHeight: 1.8,
                fontSize: "14px",
              }}
            >
              {/* Title */}
              <h1 style={{ fontSize: "22px", fontWeight: 700, textAlign: "center", marginBottom: "24px", color: "#000", borderBottom: "2px solid #e5e5e5", paddingBottom: "16px" }}>
                {viewScriptData?.title}
              </h1>

              {(() => {
                const content = viewScriptData?.content;
                if (!content) return <p style={{ color: "#999", textAlign: "center" }}>কোনো কন্টেন্ট নেই</p>;
                try {
                  const parsed = JSON.parse(content);
                  if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].title !== undefined) {
                    return parsed.map((seq: any, i: number) => (
                      <div key={seq.id || i} style={{ marginBottom: "28px" }}>
                        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#333", marginBottom: "10px", borderLeft: "3px solid #2563eb", paddingLeft: "12px" }}>
                          {seq.title}
                        </h2>
                        <div
                          style={{ color: "#1a1a1a" }}
                          className="prose prose-sm max-w-none [&_*]:!text-[#1a1a1a] [&_h1]:!text-[#000] [&_h2]:!text-[#222] [&_h3]:!text-[#333] [&_strong]:!text-[#000] [&_p]:!my-2 [&_ul]:!my-2 [&_ol]:!my-2"
                          dangerouslySetInnerHTML={{ __html: seq.content || "" }}
                        />
                      </div>
                    ));
                  }
                } catch {}
                return (
                  <div
                    className="prose prose-sm max-w-none [&_*]:!text-[#1a1a1a] [&_h1]:!text-[#000] [&_h2]:!text-[#222] [&_strong]:!text-[#000]"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                );
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
        <DialogContent className="bg-card border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> পাসওয়ার্ড পরিবর্তন
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-xs">বর্তমান পাসওয়ার্ড</Label>
              <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="bg-secondary/50 border-border/50" placeholder="বর্তমান পাসওয়ার্ড দিন" />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">নতুন পাসওয়ার্ড</Label>
              <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="bg-secondary/50 border-border/50" placeholder="নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)" />
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">নতুন পাসওয়ার্ড নিশ্চিত করুন</Label>
              <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="bg-secondary/50 border-border/50" placeholder="আবার নতুন পাসওয়ার্ড দিন" />
            </div>
            <Button onClick={handleChangePassword} disabled={pwSaving} className="w-full gap-2">
              <KeyRound className="h-4 w-4" /> {pwSaving ? "পরিবর্তন হচ্ছে..." : "পাসওয়ার্ড পরিবর্তন করুন"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default MemberDashboard;