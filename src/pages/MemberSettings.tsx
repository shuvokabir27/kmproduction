import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, UserCog, Camera, ImageIcon, Plus, Trash2, Save, ArrowLeft, LogOut, Mail, Landmark, Pencil } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import bkashLogo from "@/assets/bkash-logo.png";
import nagadLogo from "@/assets/nagad-logo.png";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface FavoriteWork {
  id?: string;
  title: string;
  video_url: string;
  description: string;
}

const MemberSettings = () => {
  const { user, profile, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [bankExpanded, setBankExpanded] = useState(false);
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

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [bankFields, setBankFields] = useState({ bank_name: "", bank_account_no: "", bank_account_holder: "", bkash_no: "", bkash_holder: "", nagad_no: "", nagad_holder: "" });
  const [bankSaving, setBankSaving] = useState(false);

  const [extraFields, setExtraFields] = useState({
    address: "", education: "", achievements: "", short_bio: "",
    favorite_actor: "", favorite_actress: "", favorite_color: "",
    favorite_dress: "", favorite_food: "", date_of_birth: "",
    full_name_en: "", designation_en: "", short_bio_en: "",
    address_en: "", education_en: "", achievements_en: "",
    favorite_actor_en: "", favorite_actress_en: "", favorite_color_en: "",
    favorite_dress_en: "", favorite_food_en: "",
    joining_date: "",
  });
  const [editTab, setEditTab] = useState<"bn" | "en">("bn");
  const [works, setWorks] = useState<FavoriteWork[]>([]);

  const { data: favoriteWorks } = useQuery({
    queryKey: ["my-favorite-works", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("favorite_works" as any).select("*").eq("member_id", profile!.id).order("sort_order");
      return (data ?? []) as any[];
    },
  });

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
        joining_date: (profile as any).joining_date || "",
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
    if (newPw.length < 6) { toast.error("নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে"); return; }
    if (newPw !== confirmPw) { toast.error("পাসওয়ার্ড মিলছে না"); return; }
    setPwSaving(true);
    try {
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

  const openBankDialog = () => {
    setBankFields({
      bank_name: (profile as any)?.bank_name || "",
      bank_account_no: (profile as any)?.bank_account_no || "",
      bank_account_holder: (profile as any)?.bank_account_holder || "",
      bkash_no: (profile as any)?.bkash_no || "",
      bkash_holder: (profile as any)?.bkash_holder || "",
      nagad_no: (profile as any)?.nagad_no || "",
      nagad_holder: (profile as any)?.nagad_holder || "",
    });
    setBankDialogOpen(true);
  };

  const handleSaveBank = async () => {
    if (!profile) return;
    setBankSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        bank_name: bankFields.bank_name || null,
        bank_account_no: bankFields.bank_account_no || null,
        bank_account_holder: bankFields.bank_account_holder || null,
        bkash_no: bankFields.bkash_no || null,
        bkash_holder: bankFields.bkash_holder || null,
        nagad_no: bankFields.nagad_no || null,
        nagad_holder: bankFields.nagad_holder || null,
      } as any).eq("id", profile.id);
      if (error) throw error;
      toast.success("ব্যাংক তথ্য আপডেট হয়েছে!");
      setBankDialogOpen(false);
      // Force page reload to refresh profile data from auth context
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBankSaving(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast.error("সঠিক ইমেইল দিন"); return;
    }
    setEmailSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/change-member-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ user_id: user!.id, new_email: newEmail.trim() }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success("ইমেইল পরিবর্তন হয়েছে!");
      setEmailDialogOpen(false);
      setNewEmail("");
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEmailSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const updates: any = {
        address: extraFields.address || null, education: extraFields.education || null,
        achievements: extraFields.achievements || null, short_bio: extraFields.short_bio || null,
        favorite_actor: extraFields.favorite_actor || null, favorite_actress: extraFields.favorite_actress || null,
        favorite_color: extraFields.favorite_color || null, favorite_dress: extraFields.favorite_dress || null,
        favorite_food: extraFields.favorite_food || null, date_of_birth: extraFields.date_of_birth || null,
        joining_date: extraFields.joining_date || null,
        full_name_en: extraFields.full_name_en || null, designation_en: extraFields.designation_en || null,
        short_bio_en: extraFields.short_bio_en || null, address_en: extraFields.address_en || null,
        education_en: extraFields.education_en || null, achievements_en: extraFields.achievements_en || null,
        favorite_actor_en: extraFields.favorite_actor_en || null, favorite_actress_en: extraFields.favorite_actress_en || null,
        favorite_color_en: extraFields.favorite_color_en || null, favorite_dress_en: extraFields.favorite_dress_en || null,
        favorite_food_en: extraFields.favorite_food_en || null,
      };
      if (photoFile) updates.photo_url = await uploadFile(photoFile, "profiles");
      if (coverFile) updates.cover_url = await uploadFile(coverFile, "covers");

      const { error } = await supabase.from("profiles").update(updates).eq("id", profile.id);
      if (error) throw error;

      await supabase.from("favorite_works" as any).delete().eq("member_id", profile.id);
      const validWorks = works.filter(w => w.title.trim());
      if (validWorks.length > 0) {
        const { error: wErr } = await supabase.from("favorite_works" as any).insert(
          validWorks.map((w, i) => ({ member_id: profile.id, title: w.title, video_url: w.video_url || null, description: w.description || null, sort_order: i }))
        );
        if (wErr) throw wErr;
      }

      toast.success("প্রোফাইল আপডেট হয়েছে!");
      setPhotoFile(null); setCoverFile(null); setPhotoPreview(null); setCoverPreview(null);
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
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">সেটিংস</h1>
        </div>

        {/* Profile Info */}
        <Card className="p-4 bg-card border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden">
              {profile?.photo_url ? (
                <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-primary text-lg font-medium">{profile?.full_name?.charAt(0) || "U"}</span>
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground">{profile?.designation || "সদস্য"} • আইডি: {profile?.member_id}</p>
            </div>
          </div>
        </Card>

        {/* Settings Options */}
        <div className="space-y-2">
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
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <KeyRound className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">পাসওয়ার্ড পরিবর্তন</p>
              <p className="text-xs text-muted-foreground">আপনার লগইন পাসওয়ার্ড পরিবর্তন করুন</p>
            </div>
          </button>

          <button
            onClick={() => { setNewEmail(profile?.email || user?.email || ""); setEmailDialogOpen(true); }}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 hover:bg-secondary/30 transition-colors text-left"
          >
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">ইমেইল পরিবর্তন</p>
              <p className="text-xs text-muted-foreground">{profile?.email || user?.email || "ইমেইল সেট করুন"}</p>
            </div>
          </button>

          {/* ব্যাংক তথ্য কার্ড */}
          <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between p-4 pb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Landmark className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">ব্যাংক তথ্য</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openBankDialog}>
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>

            {(() => {
              const p = profile as any;
              const hasBank = p?.bank_name || p?.bank_account_no;
              const hasBkash = p?.bkash_no;
              const hasNagad = p?.nagad_no;
              const hasAny = hasBank || hasBkash || hasNagad;

              if (!hasAny) {
                return (
                  <div className="px-4 pb-4 pt-1">
                    <button onClick={openBankDialog} className="w-full py-3 rounded-lg border-2 border-dashed border-border/50 text-xs text-muted-foreground hover:border-primary/50 transition-colors">
                      + ব্যাংক, বিকাশ বা নগদ তথ্য যুক্ত করুন
                    </button>
                  </div>
                );
              }

              const bankData = [
                { name: "Dutch-Bangla Bank", short: "DBBL", bg: "#00A651" },
                { name: "Islami Bank Bangladesh", short: "IBBL", bg: "#006838" },
                { name: "BRAC Bank", short: "BRAC", bg: "#E31E25" },
                { name: "City Bank", short: "CITY", bg: "#004B87" },
                { name: "Eastern Bank (EBL)", short: "EBL", bg: "#0072BC" },
                { name: "Prime Bank", short: "PB", bg: "#1B3A6B" },
                { name: "Sonali Bank", short: "SB", bg: "#F7941D" },
                { name: "Janata Bank", short: "JB", bg: "#003366" },
                { name: "Agrani Bank", short: "AB", bg: "#8B0000" },
                { name: "Pubali Bank", short: "PBL", bg: "#2E8B57" },
              ];
              const selectedBank = bankData.find(b => b.name === p?.bank_name);

              return (
                <div className="px-4 pb-4 pt-1 space-y-2">
                  {hasBank && (
                    <div className="flex items-center gap-3 p-2.5 rounded-lg" style={{ backgroundColor: 'rgba(30, 80, 160, 0.08)' }}>
                      {selectedBank ? (
                        <span className="inline-flex items-center justify-center h-8 w-10 rounded text-[10px] font-bold shrink-0" style={{ backgroundColor: selectedBank.bg, color: '#fff' }}>{selectedBank.short}</span>
                      ) : (
                        <div className="h-8 w-10 rounded flex items-center justify-center" style={{ backgroundColor: '#1E50A0' }}>
                          <Landmark className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">{p.bank_name || "ব্যাংক"}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{p.bank_account_no}</p>
                        {p.bank_account_holder && <p className="text-[10px] text-muted-foreground/70 truncate">{p.bank_account_holder}</p>}
                      </div>
                    </div>
                  )}
                  {hasBkash && (
                    <div className="flex items-center gap-3 p-2.5 rounded-lg" style={{ backgroundColor: 'rgba(230, 20, 80, 0.08)' }}>
                      <div className="h-8 w-8 rounded bg-white flex items-center justify-center shrink-0 p-1"><img src={bkashLogo} alt="bKash" className="h-full w-full object-contain" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium" style={{ color: '#E6145B' }}>বিকাশ</p>
                        <p className="text-[11px] text-muted-foreground truncate">{p.bkash_no}</p>
                        {p.bkash_holder && <p className="text-[10px] text-muted-foreground/70 truncate">{p.bkash_holder}</p>}
                      </div>
                    </div>
                  )}
                  {hasNagad && (
                    <div className="flex items-center gap-3 p-2.5 rounded-lg" style={{ backgroundColor: 'rgba(237, 28, 36, 0.08)' }}>
                      <div className="h-8 w-8 rounded bg-white flex items-center justify-center shrink-0 p-1"><img src={nagadLogo} alt="Nagad" className="h-full w-full object-contain" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium" style={{ color: '#ED1C24' }}>নগদ</p>
                        <p className="text-[11px] text-muted-foreground truncate">{p.nagad_no}</p>
                        {p.nagad_holder && <p className="text-[10px] text-muted-foreground/70 truncate">{p.nagad_holder}</p>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

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
        <DialogContent className="bg-card border-border/50 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">প্রোফাইল তথ্য আপডেট</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-foreground text-xs mb-1 block">প্রোফাইল ছবি</Label>
                <input type="file" accept="image/*" ref={photoRef} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); } }} />
                <button type="button" onClick={() => photoRef.current?.click()} className="w-full h-24 rounded-lg border-2 border-dashed border-border/50 bg-secondary/50 flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors overflow-hidden">
                  {photoPreview || (profile as any)?.photo_url ? (
                    <img src={photoPreview || (profile as any)?.photo_url} alt="photo" className="w-full h-full object-cover" />
                  ) : (<><Camera className="h-5 w-5 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">ছবি আপলোড</span></>)}
                </button>
              </div>
              <div>
                <Label className="text-foreground text-xs mb-1 block">কভার ফটো</Label>
                <input type="file" accept="image/*" ref={coverRef} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setCoverFile(f); setCoverPreview(URL.createObjectURL(f)); } }} />
                <button type="button" onClick={() => coverRef.current?.click()} className="w-full h-24 rounded-lg border-2 border-dashed border-border/50 bg-secondary/50 flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors overflow-hidden">
                  {coverPreview || (profile as any)?.cover_url ? (
                    <img src={coverPreview || (profile as any)?.cover_url} alt="cover" className="w-full h-full object-cover" />
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
                <div><Label className="text-foreground text-xs">শর্ট বিবরণ</Label><Textarea value={extraFields.short_bio} onChange={e => setExtra("short_bio", e.target.value)} className="bg-secondary border-border/50" rows={2} placeholder="নিজের সম্পর্কে সংক্ষেপে লিখুন..." /></div>
                <div><Label className="text-foreground text-xs">ঠিকানা</Label><Input value={extraFields.address} onChange={e => setExtra("address", e.target.value)} className="bg-secondary border-border/50" /></div>
                <div><Label className="text-foreground text-xs">শিক্ষাগত যোগ্যতা</Label><Input value={extraFields.education} onChange={e => setExtra("education", e.target.value)} className="bg-secondary border-border/50" placeholder="যেমন: বি.এ (অনার্স)" /></div>
                <div><Label className="text-foreground text-xs">জন্ম তারিখ</Label><Input type="date" value={extraFields.date_of_birth} onChange={e => setExtra("date_of_birth", e.target.value)} className="bg-secondary border-border/50" /></div>
                <div><Label className="text-foreground text-xs">যোগদানের তারিখ</Label><Input type="date" value={extraFields.joining_date} onChange={e => setExtra("joining_date", e.target.value)} className="bg-secondary border-border/50" /></div>
                <div><Label className="text-foreground text-xs">অর্জন</Label><Textarea value={extraFields.achievements} onChange={e => setExtra("achievements", e.target.value)} className="bg-secondary border-border/50" rows={2} placeholder="আপনার উল্লেখযোগ্য অর্জনসমূহ..." /></div>
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
                <div><Label className="text-foreground text-xs">Short Bio (English)</Label><Textarea value={extraFields.short_bio_en} onChange={e => setExtra("short_bio_en", e.target.value)} className="bg-secondary border-border/50" rows={2} placeholder="Write briefly about yourself..." /></div>
                <div><Label className="text-foreground text-xs">Address (English)</Label><Input value={extraFields.address_en} onChange={e => setExtra("address_en", e.target.value)} className="bg-secondary border-border/50" placeholder="e.g. Kuakata, Patuakhali" /></div>
                <div><Label className="text-foreground text-xs">Education (English)</Label><Input value={extraFields.education_en} onChange={e => setExtra("education_en", e.target.value)} className="bg-secondary border-border/50" placeholder="e.g. B.A (Honors)" /></div>
                <div><Label className="text-foreground text-xs">Achievements (English)</Label><Textarea value={extraFields.achievements_en} onChange={e => setExtra("achievements_en", e.target.value)} className="bg-secondary border-border/50" rows={2} placeholder="Your notable achievements..." /></div>
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
            <div><Label className="text-muted-foreground text-xs">বর্তমান পাসওয়ার্ড</Label><Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="bg-secondary/50 border-border/50" placeholder="বর্তমান পাসওয়ার্ড দিন" /></div>
            <div><Label className="text-muted-foreground text-xs">নতুন পাসওয়ার্ড</Label><Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="bg-secondary/50 border-border/50" placeholder="নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)" /></div>
            <div><Label className="text-muted-foreground text-xs">নতুন পাসওয়ার্ড নিশ্চিত করুন</Label><Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="bg-secondary/50 border-border/50" placeholder="আবার নতুন পাসওয়ার্ড দিন" /></div>
            <Button onClick={handleChangePassword} disabled={pwSaving} className="w-full gap-2">
              <KeyRound className="h-4 w-4" /> {pwSaving ? "পরিবর্তন হচ্ছে..." : "পাসওয়ার্ড পরিবর্তন করুন"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Change Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="bg-card border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" /> ইমেইল পরিবর্তন
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground text-xs">নতুন ইমেইল</Label>
              <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="bg-secondary/50 border-border/50" placeholder="নতুন ইমেইল দিন" />
            </div>
            <Button onClick={handleChangeEmail} disabled={emailSaving || !newEmail.trim()} className="w-full gap-2">
              <Mail className="h-4 w-4" /> {emailSaving ? "পরিবর্তন হচ্ছে..." : "ইমেইল পরিবর্তন করুন"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bank Info Dialog */}
      <Dialog open={bankDialogOpen} onOpenChange={setBankDialogOpen}>
        <DialogContent className="bg-card border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" /> ব্যাংক তথ্য
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* ব্যাংক একাউন্ট */}
            <div className="space-y-2 p-3 rounded-lg border" style={{ backgroundColor: 'rgba(30, 80, 160, 0.08)', borderColor: 'rgba(30, 80, 160, 0.25)' }}>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded flex items-center justify-center" style={{ backgroundColor: '#1E50A0' }}>
                  <Landmark className="h-3.5 w-3.5 text-white" />
                </div>
                <p className="text-xs font-semibold" style={{ color: '#1E50A0' }}>ব্যাংক একাউন্ট</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">ব্যাংকের নাম</Label>
                {(() => {
                  const banks = [
                    { name: "Dutch-Bangla Bank", short: "DBBL", bg: "#00A651", text: "#fff" },
                    { name: "Islami Bank Bangladesh", short: "IBBL", bg: "#006838", text: "#fff" },
                    { name: "BRAC Bank", short: "BRAC", bg: "#E31E25", text: "#fff" },
                    { name: "City Bank", short: "CITY", bg: "#004B87", text: "#fff" },
                    { name: "Eastern Bank (EBL)", short: "EBL", bg: "#0072BC", text: "#fff" },
                    { name: "Prime Bank", short: "PB", bg: "#1B3A6B", text: "#fff" },
                    { name: "Sonali Bank", short: "SB", bg: "#F7941D", text: "#fff" },
                    { name: "Janata Bank", short: "JB", bg: "#003366", text: "#fff" },
                    { name: "Agrani Bank", short: "AB", bg: "#8B0000", text: "#fff" },
                    { name: "Pubali Bank", short: "PBL", bg: "#2E8B57", text: "#fff" },
                  ];
                  const selected = banks.find(b => b.name === bankFields.bank_name);
                  return (
                    <>
                      <Select value={bankFields.bank_name} onValueChange={v => setBankFields(f => ({ ...f, bank_name: v }))}>
                        <SelectTrigger className="bg-secondary/50 border-border/50">
                          <div className="flex items-center gap-2">
                            {selected && (
                              <span className="inline-flex items-center justify-center h-5 w-7 rounded text-[9px] font-bold shrink-0" style={{ backgroundColor: selected.bg, color: selected.text }}>{selected.short}</span>
                            )}
                            <SelectValue placeholder="ব্যাংক নির্বাচন করুন" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {banks.map(bank => (
                            <SelectItem key={bank.name} value={bank.name}>
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center justify-center h-5 w-7 rounded text-[9px] font-bold shrink-0" style={{ backgroundColor: bank.bg, color: bank.text }}>{bank.short}</span>
                                {bank.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  );
                })()}
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">একাউন্ট নম্বর</Label>
                <Input value={bankFields.bank_account_no} onChange={e => setBankFields(f => ({ ...f, bank_account_no: e.target.value }))} className="bg-secondary/50 border-border/50" placeholder="একাউন্ট নম্বর দিন" />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">একাউন্ট হোল্ডার নাম</Label>
                <Input value={bankFields.bank_account_holder} onChange={e => setBankFields(f => ({ ...f, bank_account_holder: e.target.value }))} className="bg-secondary/50 border-border/50" placeholder="একাউন্ট হোল্ডারের নাম দিন" />
              </div>
            </div>

            {/* বিকাশ */}
            <div className="space-y-2 p-3 rounded-lg border" style={{ backgroundColor: 'rgba(230, 20, 80, 0.08)', borderColor: 'rgba(230, 20, 80, 0.25)' }}>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-white flex items-center justify-center p-0.5"><img src={bkashLogo} alt="bKash" className="h-full w-full object-contain" /></div>
                <p className="text-xs font-semibold" style={{ color: '#E6145B' }}>বিকাশ</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">বিকাশ নম্বর</Label>
                <Input value={bankFields.bkash_no} onChange={e => setBankFields(f => ({ ...f, bkash_no: e.target.value }))} className="bg-secondary/50 border-border/50" placeholder="বিকাশ নম্বর দিন" />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">একাউন্ট হোল্ডার নাম</Label>
                <Input value={bankFields.bkash_holder} onChange={e => setBankFields(f => ({ ...f, bkash_holder: e.target.value }))} className="bg-secondary/50 border-border/50" placeholder="বিকাশ হোল্ডারের নাম দিন" />
              </div>
            </div>

            {/* নগদ */}
            <div className="space-y-2 p-3 rounded-lg border" style={{ backgroundColor: 'rgba(237, 28, 36, 0.08)', borderColor: 'rgba(237, 130, 20, 0.3)' }}>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-white flex items-center justify-center p-0.5"><img src={nagadLogo} alt="Nagad" className="h-full w-full object-contain" /></div>
                <p className="text-xs font-semibold" style={{ color: '#ED1C24' }}>নগদ</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">নগদ নম্বর</Label>
                <Input value={bankFields.nagad_no} onChange={e => setBankFields(f => ({ ...f, nagad_no: e.target.value }))} className="bg-secondary/50 border-border/50" placeholder="নগদ নম্বর দিন" />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">একাউন্ট হোল্ডার নাম</Label>
                <Input value={bankFields.nagad_holder} onChange={e => setBankFields(f => ({ ...f, nagad_holder: e.target.value }))} className="bg-secondary/50 border-border/50" placeholder="নগদ হোল্ডারের নাম দিন" />
              </div>
            </div>

            <Button onClick={handleSaveBank} disabled={bankSaving} className="w-full gap-2">
              <Save className="h-4 w-4" /> {bankSaving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default MemberSettings;
