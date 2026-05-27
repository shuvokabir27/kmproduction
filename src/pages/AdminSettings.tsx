import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, UserCog, Camera, ImageIcon, Plus, Trash2, Save, ArrowLeft, LogOut, Mail, Settings, Globe } from "lucide-react";
import { SiteSettingsDialog } from "@/components/SiteSettingsDialog";
import { AdminMarqueeEditor } from "@/components/AdminMarqueeEditor";
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface FavoriteWork {
  id?: string;
  title: string;
  video_url: string;
  description: string;
}

const AdminSettings = () => {
  const { user, profile, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [siteSettingsOpen, setSiteSettingsOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const [extraFields, setExtraFields] = useState({
    full_name: "", designation: "",
    address: "", education: "", achievements: "", short_bio: "", bio: "",
    favorite_actor: "", favorite_actress: "", favorite_color: "",
    favorite_dress: "", favorite_food: "", date_of_birth: "",
    full_name_en: "", designation_en: "", short_bio_en: "", bio_en: "",
    address_en: "", education_en: "", achievements_en: "",
    favorite_actor_en: "", favorite_actress_en: "", favorite_color_en: "",
    favorite_dress_en: "", favorite_food_en: "",
    phone: "", joining_date: "",
  });
  const [editTab, setEditTab] = useState<"bn" | "en">("bn");
  const [works, setWorks] = useState<FavoriteWork[]>([]);

  const { data: fullProfile } = useQuery({
    queryKey: ["admin-profile", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", profile!.id).single();
      return data;
    },
  });

  const { data: favoriteWorks } = useQuery({
    queryKey: ["admin-favorite-works", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("favorite_works").select("*").eq("member_id", profile!.id).order("sort_order");
      return (data ?? []) as any[];
    },
  });

  useEffect(() => {
    if (fullProfile) {
      const p = fullProfile as any;
      setExtraFields({
        full_name: p.full_name || "", designation: p.designation || "",
        address: p.address || "", education: p.education || "",
        achievements: p.achievements || "", short_bio: p.short_bio || "",
        bio: p.bio || "",
        favorite_actor: p.favorite_actor || "", favorite_actress: p.favorite_actress || "",
        favorite_color: p.favorite_color || "", favorite_dress: p.favorite_dress || "",
        favorite_food: p.favorite_food || "", date_of_birth: p.date_of_birth || "",
        full_name_en: p.full_name_en || "", designation_en: p.designation_en || "",
        short_bio_en: p.short_bio_en || "", bio_en: p.bio_en || "",
        address_en: p.address_en || "", education_en: p.education_en || "",
        achievements_en: p.achievements_en || "",
        favorite_actor_en: p.favorite_actor_en || "", favorite_actress_en: p.favorite_actress_en || "",
        favorite_color_en: p.favorite_color_en || "", favorite_dress_en: p.favorite_dress_en || "",
        favorite_food_en: p.favorite_food_en || "",
        phone: p.phone || "", joining_date: p.joining_date || "",
      });
    }
  }, [fullProfile]);

  useEffect(() => {
    if (favoriteWorks) {
      setWorks(favoriteWorks.map((w: any) => ({ id: w.id, title: w.title, video_url: w.video_url || "", description: w.description || "" })));
    }
  }, [favoriteWorks]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const setExtra = (key: string, value: string) => setExtraFields(f => ({ ...f, [key]: value }));
  const addWork = () => {
    if (works.length >= 5) { toast.error("সর্বোচ্চ ৫টি কাজ যোগ করা যায়"); return; }
    setWorks([...works, { title: "", video_url: "", description: "" }]);
  };
  const updateWork = (idx: number, field: keyof FavoriteWork, value: string) => {
    setWorks(ws => ws.map((w, i) => i === idx ? { ...w, [field]: value } : w));
  };
  const removeWork = (idx: number) => setWorks(ws => ws.filter((_, i) => i !== idx));

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${profile!.id}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("member-photos").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: pub } = supabase.storage.from("member-photos").getPublicUrl(path);
    return pub.publicUrl;
  };

  const handleChangePassword = async () => {
    if (newPw.length < 6) { toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে"); return; }
    if (newPw !== confirmPw) { toast.error("পাসওয়ার্ড মিলছে না"); return; }
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast.success("পাসওয়ার্ড পরিবর্তন হয়েছে!");
      setPwDialogOpen(false);
      setNewPw(""); setConfirmPw("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPwSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const updates: any = {
        full_name: extraFields.full_name || null, designation: extraFields.designation || null,
        phone: extraFields.phone || null,
        address: extraFields.address || null, education: extraFields.education || null,
        achievements: extraFields.achievements || null, short_bio: extraFields.short_bio || null,
        bio: extraFields.bio || null,
        favorite_actor: extraFields.favorite_actor || null, favorite_actress: extraFields.favorite_actress || null,
        favorite_color: extraFields.favorite_color || null, favorite_dress: extraFields.favorite_dress || null,
        favorite_food: extraFields.favorite_food || null, date_of_birth: extraFields.date_of_birth || null,
        joining_date: extraFields.joining_date || null,
        full_name_en: extraFields.full_name_en || null, designation_en: extraFields.designation_en || null,
        short_bio_en: extraFields.short_bio_en || null, bio_en: extraFields.bio_en || null,
        address_en: extraFields.address_en || null, education_en: extraFields.education_en || null,
        achievements_en: extraFields.achievements_en || null,
        favorite_actor_en: extraFields.favorite_actor_en || null, favorite_actress_en: extraFields.favorite_actress_en || null,
        favorite_color_en: extraFields.favorite_color_en || null, favorite_dress_en: extraFields.favorite_dress_en || null,
        favorite_food_en: extraFields.favorite_food_en || null,
      };
      if (photoFile) updates.photo_url = await uploadFile(photoFile, "profiles");
      if (coverFile) updates.cover_url = await uploadFile(coverFile, "covers");

      const { error } = await supabase.from("profiles").update(updates).eq("id", profile.id);
      if (error) throw error;

      // Save favorite works
      await supabase.from("favorite_works").delete().eq("member_id", profile.id);
      const validWorks = works.filter(w => w.title.trim());
      if (validWorks.length > 0) {
        const { error: wErr } = await supabase.from("favorite_works").insert(
          validWorks.map((w, i) => ({ member_id: profile.id, title: w.title, video_url: w.video_url || null, description: w.description || null, sort_order: i }))
        );
        if (wErr) throw wErr;
      }

      toast.success("প্রোফাইল আপডেট হয়েছে!");
      setPhotoFile(null); setCoverFile(null); setPhotoPreview(null); setCoverPreview(null);
      queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
      queryClient.invalidateQueries({ queryKey: ["admin-favorite-works"] });
      setProfileEditOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const fp = fullProfile as any;

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" /> এডমিন সেটিংস
          </h1>
        </div>

        {/* Profile Info */}
        <Card className="p-4 bg-card border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden">
              {fp?.photo_url ? (
                <img src={fp.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-primary text-lg font-medium">{fp?.full_name?.charAt(0) || "A"}</span>
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground">{fp?.full_name || "এডমিন"}</p>
              <p className="text-xs text-muted-foreground">{fp?.designation || "এডমিন"} • আইডি: {fp?.member_id}</p>
              <p className="text-[10px] text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </Card>

        {/* Top scrolling announcement editor */}
        <AdminMarqueeEditor />

        {/* Settings Options */}
        <div className="space-y-2">
          <button
            onClick={() => setSiteSettingsOpen(true)}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 hover:bg-secondary/30 transition-colors text-left"
          >
            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">সাইট সেটিংস</p>
              <p className="text-xs text-muted-foreground">সাইট টাইটেল, লোগো ও আইকন পরিবর্তন করুন</p>
            </div>
          </button>

          <button
            onClick={() => setProfileEditOpen(true)}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 hover:bg-secondary/30 transition-colors text-left"
          >
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserCog className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">প্রোফাইল এডিট</p>
              <p className="text-xs text-muted-foreground">ছবি, তথ্য ও পছন্দের কাজ আপডেট করুন</p>
            </div>
          </button>

          <button
            onClick={() => setPwDialogOpen(true)}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 hover:bg-secondary/30 transition-colors text-left"
          >
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <KeyRound className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">পাসওয়ার্ড পরিবর্তন</p>
              <p className="text-xs text-muted-foreground">আপনার লগইন পাসওয়ার্ড পরিবর্তন করুন</p>
            </div>
          </button>

          <button
            onClick={async () => { await signOut(); navigate("/login"); }}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 hover:bg-destructive/5 transition-colors text-left"
          >
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <LogOut className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium text-destructive">লগআউট</p>
              <p className="text-xs text-muted-foreground">অ্যাকাউন্ট থেকে বের হন</p>
            </div>
          </button>
        </div>
      </div>

      {/* Profile Edit Dialog */}
      <Dialog open={profileEditOpen} onOpenChange={setProfileEditOpen}>
        <DialogContent className="bg-white border-gray-200 max-w-lg max-h-[90vh] overflow-y-auto text-gray-900 [&_*]:!text-gray-900 [&_input]:!bg-gray-50 [&_input]:!border-gray-300 [&_textarea]:!bg-gray-50 [&_textarea]:!border-gray-300 [&_.text-muted-foreground]:!text-gray-500 [&_input::placeholder]:!text-gray-400 [&_textarea::placeholder]:!text-gray-400">
          <DialogHeader>
            <DialogTitle className="text-foreground">প্রোফাইল তথ্য আপডেট</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-foreground text-xs mb-1 block">প্রোফাইল ছবি</Label>
                <input type="file" accept="image/*" ref={photoRef} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); } }} />
                <button type="button" onClick={() => photoRef.current?.click()} className="w-full h-24 rounded-lg border-2 border-dashed border-border/50 bg-secondary/50 flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors overflow-hidden">
                  {photoPreview || fp?.photo_url ? (
                    <img src={photoPreview || fp?.photo_url} alt="photo" className="w-full h-full object-cover" />
                  ) : (<><Camera className="h-5 w-5 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">ছবি আপলোড</span></>)}
                </button>
              </div>
              <div>
                <Label className="text-foreground text-xs mb-1 block">কভার ফটো</Label>
                <input type="file" accept="image/*" ref={coverRef} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setCoverFile(f); setCoverPreview(URL.createObjectURL(f)); } }} />
                <button type="button" onClick={() => coverRef.current?.click()} className="w-full h-24 rounded-lg border-2 border-dashed border-border/50 bg-secondary/50 flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors overflow-hidden">
                  {coverPreview || fp?.cover_url ? (
                    <img src={coverPreview || fp?.cover_url} alt="cover" className="w-full h-full object-cover" />
                  ) : (<><ImageIcon className="h-5 w-5 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">কভার আপলোড</span></>)}
                </button>
              </div>
            </div>

            <div className="flex gap-1 p-1 rounded-lg bg-secondary/50 border border-border/30">
              <button type="button" onClick={() => setEditTab("bn")} className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${editTab === "bn" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>বাংলা</button>
              <button type="button" onClick={() => setEditTab("en")} className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${editTab === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>English</button>
            </div>

            {editTab === "bn" ? (
              <>
                <div><Label className="text-foreground text-xs">পুরো নাম</Label><Input value={extraFields.full_name} onChange={e => setExtra("full_name", e.target.value)} className="bg-secondary border-border/50" /></div>
                <div><Label className="text-foreground text-xs">পদবী</Label><Input value={extraFields.designation} onChange={e => setExtra("designation", e.target.value)} className="bg-secondary border-border/50" placeholder="যেমন: পরিচালক" /></div>
                <div><Label className="text-foreground text-xs">ফোন নম্বর</Label><Input value={extraFields.phone} onChange={e => setExtra("phone", e.target.value)} className="bg-secondary border-border/50" placeholder="01XXXXXXXXX" /></div>
                <div><Label className="text-foreground text-xs">শর্ট বিবরণ</Label><Textarea value={extraFields.short_bio} onChange={e => setExtra("short_bio", e.target.value)} className="bg-secondary border-border/50" rows={2} placeholder="নিজের সম্পর্কে সংক্ষেপে..." /></div>
                <div><Label className="text-foreground text-xs">সম্পূর্ণ বিবরণ</Label><Textarea value={extraFields.bio} onChange={e => setExtra("bio", e.target.value)} className="bg-secondary border-border/50" rows={3} placeholder="বিস্তারিত বিবরণ..." /></div>
                <div><Label className="text-foreground text-xs">ঠিকানা</Label><Input value={extraFields.address} onChange={e => setExtra("address", e.target.value)} className="bg-secondary border-border/50" /></div>
                <div><Label className="text-foreground text-xs">শিক্ষাগত যোগ্যতা</Label><Input value={extraFields.education} onChange={e => setExtra("education", e.target.value)} className="bg-secondary border-border/50" placeholder="যেমন: বি.এ (অনার্স)" /></div>
                <div><Label className="text-foreground text-xs">জন্ম তারিখ</Label><Input type="date" value={extraFields.date_of_birth} onChange={e => setExtra("date_of_birth", e.target.value)} className="bg-secondary border-border/50" /></div>
                <div><Label className="text-foreground text-xs">যোগদানের তারিখ</Label><Input type="date" value={extraFields.joining_date} onChange={e => setExtra("joining_date", e.target.value)} className="bg-secondary border-border/50" /></div>
                <div><Label className="text-foreground text-xs">অর্জন</Label><Textarea value={extraFields.achievements} onChange={e => setExtra("achievements", e.target.value)} className="bg-secondary border-border/50" rows={2} placeholder="উল্লেখযোগ্য অর্জনসমূহ..." /></div>
                <div className="border-t border-border/30 pt-3">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">পছন্দের তথ্য</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-foreground text-xs">পছন্দের নায়ক</Label><Input value={extraFields.favorite_actor} onChange={e => setExtra("favorite_actor", e.target.value)} className="bg-secondary border-border/50" /></div>
                    <div><Label className="text-foreground text-xs">পছন্দের নায়িকা</Label><Input value={extraFields.favorite_actress} onChange={e => setExtra("favorite_actress", e.target.value)} className="bg-secondary border-border/50" /></div>
                    <div><Label className="text-foreground text-xs">পছন্দের রং</Label><Input value={extraFields.favorite_color} onChange={e => setExtra("favorite_color", e.target.value)} className="bg-secondary border-border/50" /></div>
                    <div><Label className="text-foreground text-xs">পছন্দের পোশাক</Label><Input value={extraFields.favorite_dress} onChange={e => setExtra("favorite_dress", e.target.value)} className="bg-secondary border-border/50" /></div>
                    <div className="col-span-2"><Label className="text-foreground text-xs">পছন্দের খাবার</Label><Input value={extraFields.favorite_food} onChange={e => setExtra("favorite_food", e.target.value)} className="bg-secondary border-border/50" /></div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div><Label className="text-foreground text-xs">Full Name (English)</Label><Input value={extraFields.full_name_en} onChange={e => setExtra("full_name_en", e.target.value)} className="bg-secondary border-border/50" placeholder="e.g. John Doe" /></div>
                <div><Label className="text-foreground text-xs">Designation (English)</Label><Input value={extraFields.designation_en} onChange={e => setExtra("designation_en", e.target.value)} className="bg-secondary border-border/50" placeholder="e.g. Director" /></div>
                <div><Label className="text-foreground text-xs">Short Bio (English)</Label><Textarea value={extraFields.short_bio_en} onChange={e => setExtra("short_bio_en", e.target.value)} className="bg-secondary border-border/50" rows={2} /></div>
                <div><Label className="text-foreground text-xs">Full Bio (English)</Label><Textarea value={extraFields.bio_en} onChange={e => setExtra("bio_en", e.target.value)} className="bg-secondary border-border/50" rows={3} /></div>
                <div><Label className="text-foreground text-xs">Address (English)</Label><Input value={extraFields.address_en} onChange={e => setExtra("address_en", e.target.value)} className="bg-secondary border-border/50" /></div>
                <div><Label className="text-foreground text-xs">Education (English)</Label><Input value={extraFields.education_en} onChange={e => setExtra("education_en", e.target.value)} className="bg-secondary border-border/50" /></div>
                <div><Label className="text-foreground text-xs">Achievements (English)</Label><Textarea value={extraFields.achievements_en} onChange={e => setExtra("achievements_en", e.target.value)} className="bg-secondary border-border/50" rows={2} /></div>
                <div className="border-t border-border/30 pt-3">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Favorites</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-foreground text-xs">Favorite Actor</Label><Input value={extraFields.favorite_actor_en} onChange={e => setExtra("favorite_actor_en", e.target.value)} className="bg-secondary border-border/50" /></div>
                    <div><Label className="text-foreground text-xs">Favorite Actress</Label><Input value={extraFields.favorite_actress_en} onChange={e => setExtra("favorite_actress_en", e.target.value)} className="bg-secondary border-border/50" /></div>
                    <div><Label className="text-foreground text-xs">Favorite Color</Label><Input value={extraFields.favorite_color_en} onChange={e => setExtra("favorite_color_en", e.target.value)} className="bg-secondary border-border/50" /></div>
                    <div><Label className="text-foreground text-xs">Favorite Dress</Label><Input value={extraFields.favorite_dress_en} onChange={e => setExtra("favorite_dress_en", e.target.value)} className="bg-secondary border-border/50" /></div>
                    <div className="col-span-2"><Label className="text-foreground text-xs">Favorite Food</Label><Input value={extraFields.favorite_food_en} onChange={e => setExtra("favorite_food_en", e.target.value)} className="bg-secondary border-border/50" /></div>
                  </div>
                </div>
              </>
            )}

            {/* Favorite Works */}
            <div className="border-t border-border/30 pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium">প্রিয় ৫টি কাজ (ভিডিও লিংকসহ)</p>
                {works.length < 5 && <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary" onClick={addWork}><Plus className="h-3.5 w-3.5" /> যোগ করুন</Button>}
              </div>
              <div className="space-y-3">
                {works.map((w, i) => (
                  <div key={i} className="p-3 rounded-lg bg-secondary/50 border border-border/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">কাজ #{i + 1}</span>
                      <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeWork(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      {/* Password Change Dialog */}
      <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
        <DialogContent className="bg-card border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> পাসওয়ার্ড পরিবর্তন
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-muted-foreground text-xs">নতুন পাসওয়ার্ড</Label><Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="bg-secondary/50 border-border/50" placeholder="নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)" /></div>
            <div><Label className="text-muted-foreground text-xs">নতুন পাসওয়ার্ড নিশ্চিত করুন</Label><Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="bg-secondary/50 border-border/50" placeholder="আবার নতুন পাসওয়ার্ড দিন" /></div>
            <Button onClick={handleChangePassword} disabled={pwSaving} className="w-full gap-2">
              <KeyRound className="h-4 w-4" /> {pwSaving ? "পরিবর্তন হচ্ছে..." : "পাসওয়ার্ড পরিবর্তন করুন"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SiteSettingsDialog open={siteSettingsOpen} onOpenChange={setSiteSettingsOpen} />
    </AppLayout>
  );
};

export default AdminSettings;
