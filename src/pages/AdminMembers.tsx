import { useAuth } from "@/hooks/useAuth";
import { Navigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Eye, Plus, Edit, Trash2, Camera, Image, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeyRound, Mail, MessageCircle, BookUser } from "lucide-react";
import { BankSelect } from "@/components/BankSelect";
import { MemberDeleteDialog } from "@/components/MemberDeleteDialog";

interface MemberForm {
  full_name: string;
  full_name_en: string;
  email: string;
  phone: string;
  whatsapp_no: string;
  sms_mobile: string;
  designation: string;
  designation_en: string;
  bio: string;
  bio_en: string;
  short_bio: string;
  short_bio_en: string;
  bank_name: string;
  bank_account_no: string;
  bank_account_holder: string;
  bkash_no: string;
  bkash_holder: string;
  nagad_no: string;
  nagad_holder: string;
  address: string;
  address_en: string;
  education: string;
  education_en: string;
  achievements: string;
  achievements_en: string;
  date_of_birth: string;
  blood_group: string;
  favorite_actor: string;
  favorite_actor_en: string;
  favorite_actress: string;
  favorite_actress_en: string;
  favorite_color: string;
  favorite_color_en: string;
  favorite_dress: string;
  favorite_dress_en: string;
  favorite_food: string;
  favorite_food_en: string;
  salary_type: string;
  monthly_salary: string;
  daily_rate: string;
  previous_balance: string;
}

const emptyForm: MemberForm = {
  full_name: "", full_name_en: "", email: "", phone: "", whatsapp_no: "", sms_mobile: "",
  designation: "", designation_en: "",
  bio: "", bio_en: "", short_bio: "", short_bio_en: "",
  bank_name: "", bank_account_no: "", bank_account_holder: "", bkash_no: "", bkash_holder: "", nagad_no: "", nagad_holder: "",
  address: "", address_en: "",
  education: "", education_en: "",
  achievements: "", achievements_en: "",
  date_of_birth: "",
  blood_group: "",
  favorite_actor: "", favorite_actor_en: "",
  favorite_actress: "", favorite_actress_en: "",
  favorite_color: "", favorite_color_en: "",
  favorite_dress: "", favorite_dress_en: "",
  favorite_food: "", favorite_food_en: "",
  salary_type: "daily", monthly_salary: "0", daily_rate: "0", previous_balance: "0",
};

const AdminMembers = () => {
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editOriginalSalaryType, setEditOriginalSalaryType] = useState<string>("daily");
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwMember, setPwMember] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);

  const [emailOpen, setEmailOpen] = useState(false);
  const [emailMember, setEmailMember] = useState<any>(null);
  const [newEmail, setNewEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMember, setDeleteMember] = useState<any>(null);

  const handleSetPassword = async () => {
    if (!pwMember || newPassword.length < 6) {
      toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে");
      return;
    }
    setPwSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/set-member-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ user_id: pwMember.user_id, new_password: newPassword }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success(`${pwMember.full_name} এর পাসওয়ার্ড সেট হয়েছে!`);
      setPwOpen(false);
      setNewPassword("");
      setPwMember(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPwSubmitting(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!emailMember || !newEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      toast.error("সঠিক ইমেইল দিন");
      return;
    }
    setEmailSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/change-member-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ user_id: emailMember.user_id, new_email: newEmail.trim() }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success(`${emailMember.full_name} এর ইমেইল পরিবর্তন হয়েছে!`);
      setEmailOpen(false);
      setNewEmail("");
      setEmailMember(null);
      queryClient.invalidateQueries({ queryKey: ["admin-members"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEmailSubmitting(false);
    }
  };

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, folder: string, memberId: string) => {
    const ext = file.name.split('.').pop();
    const path = `${folder}/${memberId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('member-photos').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('member-photos').getPublicUrl(path);
    return publicUrl;
  };

  const { data: allProfiles } = useQuery({
    queryKey: ["admin-members"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("member_id");
      const { data: roles } = await (supabase as any).from("user_roles").select("user_id, role");
      // Group roles per user
      const rolesByUser = new Map<string, string[]>();
      (roles ?? []).forEach((r: any) => {
        const arr = rolesByUser.get(r.user_id) ?? [];
        arr.push(r.role);
        rolesByUser.set(r.user_id, arr);
      });
      return (profiles ?? []).map((p: any) => ({ ...p, _roles: rolesByUser.get(p.user_id) ?? [] }));
    },
  });

  // Staff = anyone with admin/product_admin/client role (even if they also have 'member')
  const isStaff = (p: any) => {
    const r = p._roles ?? [];
    return r.includes("admin") || r.includes("client") || r.includes("product_admin");
  };
  // Members = only pure members (no admin/client/product_admin role)
  const members = (allProfiles ?? []).filter((p: any) => (p._roles ?? []).includes("member") && !isStaff(p));
  // Staff list = admins, product_admins, and clients (regardless of member role)
  const staffList = (allProfiles ?? [])
    .filter((p: any) => isStaff(p))
    .sort((a: any, b: any) => {
      const oa = Number(a.public_display_order ?? 0) || 9999;
      const ob = Number(b.public_display_order ?? 0) || 9999;
      if (oa !== ob) return oa - ob;
      return (a.full_name || "").localeCompare(b.full_name || "");
    });

  // Auto-open edit dialog when ?edit={profileId} is present (e.g. from PublicProfile admin button)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const editProfileId = searchParams.get("edit");
    if (editProfileId && allProfiles && !open) {
      const target = allProfiles.find((p: any) => p.id === editProfileId);
      if (target) {
        openEdit(target);
        const next = new URLSearchParams(searchParams);
        next.delete("edit");
        setSearchParams(next, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, allProfiles]);

  const { data: lockedAccounts, refetch: refetchLocked } = useQuery({
    queryKey: ["locked-accounts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("login_attempts")
        .select("*")
        .not("locked_until", "is", null)
        .gt("locked_until", new Date().toISOString());
      return data ?? [];
    },
  });

  const resetLockout = async (identifier: string) => {
    const { error } = await supabase.from("login_attempts").delete().eq("identifier", identifier);
    if (error) { toast.error(error.message); return; }
    toast.success("সাসপেনশন রিসেট হয়েছে!");
    refetchLocked();
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const setField = (key: keyof MemberForm, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setPhotoFile(null);
    setCoverFile(null);
    setOpen(true);
  };

  const openEdit = (member: any) => {
    setEditId(member.id);
    setEditOriginalSalaryType(member.salary_type || "daily");
    setForm({
      full_name: member.full_name || "",
      full_name_en: member.full_name_en || "",
      email: member.email || "",
      phone: member.phone || "",
      whatsapp_no: (member as any).whatsapp_no || "",
      sms_mobile: (member as any).sms_mobile || "",
      designation: member.designation || "",
      designation_en: member.designation_en || "",
      bio: member.bio || "",
      bio_en: member.bio_en || "",
      short_bio: member.short_bio || "",
      short_bio_en: member.short_bio_en || "",
      bank_name: member.bank_name || "",
      bank_account_no: member.bank_account_no || "",
      bank_account_holder: member.bank_account_holder || "",
      bkash_no: member.bkash_no || "",
      bkash_holder: (member as any).bkash_holder || "",
      nagad_no: member.nagad_no || "",
      nagad_holder: (member as any).nagad_holder || "",
      address: member.address || "",
      address_en: member.address_en || "",
      education: member.education || "",
      education_en: member.education_en || "",
      achievements: member.achievements || "",
      achievements_en: member.achievements_en || "",
      date_of_birth: member.date_of_birth || "",
      blood_group: (member as any).blood_group || "",
      favorite_actor: member.favorite_actor || "",
      favorite_actor_en: member.favorite_actor_en || "",
      favorite_actress: member.favorite_actress || "",
      favorite_actress_en: member.favorite_actress_en || "",
      favorite_color: member.favorite_color || "",
      favorite_color_en: member.favorite_color_en || "",
      favorite_dress: member.favorite_dress || "",
      favorite_dress_en: member.favorite_dress_en || "",
      favorite_food: member.favorite_food || "",
      favorite_food_en: member.favorite_food_en || "",
      salary_type: member.salary_type || "daily",
      monthly_salary: String(member.monthly_salary || 0),
      daily_rate: String((member as any).daily_rate || 0),
      previous_balance: String((member as any).previous_balance || 0),
    });
    setPhotoFile(null);
    setCoverFile(null);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) {
      const nameEn = (form.full_name_en || "").trim();
      const mob = (form.sms_mobile || "").trim();
      if (!nameEn) { toast.error("English নাম দিতে হবে"); return; }
      if (!/^01\d{9}$/.test(mob)) { toast.error("সঠিক ১১ ডিজিট মোবাইল নাম্বার দিন"); return; }
      const emailInput = (form.email || "").trim();
      if (emailInput && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
        toast.error("সঠিক ইমেইল দিন অথবা খালি রাখুন"); return;
      }
      // Auto-fill required defaults so create flow stays minimal
      form.full_name = form.full_name || nameEn;
      form.email = emailInput || `m${mob}@km.local`;
      form.phone = mob; form.whatsapp_no = mob;
    } else if (!form.full_name.trim()) { toast.error("নাম দিতে হবে"); return; }
    setSubmitting(true);
    try {
      let photoUrl: string | undefined;
      let coverUrl: string | undefined;

      if (editId) {
        if (photoFile) photoUrl = await uploadFile(photoFile, 'profiles', editId);
        if (coverFile) coverUrl = await uploadFile(coverFile, 'covers', editId);

        const updateData: any = {
          full_name: form.full_name,
          full_name_en: form.full_name_en || null,
          email: form.email || null,
          phone: form.phone || null,
          whatsapp_no: form.whatsapp_no || null,
          sms_mobile: form.sms_mobile || null,
          designation: form.designation || null,
          designation_en: form.designation_en || null,
          bio: form.bio || null,
          bio_en: form.bio_en || null,
          short_bio: form.short_bio || null,
          short_bio_en: form.short_bio_en || null,
          bank_name: form.bank_name || null,
          bank_account_no: form.bank_account_no || null,
          bank_account_holder: form.bank_account_holder || null,
          bkash_no: form.bkash_no || null,
          bkash_holder: form.bkash_holder || null,
          nagad_no: form.nagad_no || null,
          nagad_holder: form.nagad_holder || null,
          address: form.address || null,
          address_en: form.address_en || null,
          education: form.education || null,
          education_en: form.education_en || null,
          achievements: form.achievements || null,
          achievements_en: form.achievements_en || null,
          date_of_birth: form.date_of_birth || null,
          blood_group: form.blood_group || null,
          favorite_actor: form.favorite_actor || null,
          favorite_actor_en: form.favorite_actor_en || null,
          favorite_actress: form.favorite_actress || null,
          favorite_actress_en: form.favorite_actress_en || null,
          favorite_color: form.favorite_color || null,
          favorite_color_en: form.favorite_color_en || null,
          favorite_dress: form.favorite_dress || null,
          favorite_dress_en: form.favorite_dress_en || null,
          favorite_food: form.favorite_food || null,
          favorite_food_en: form.favorite_food_en || null,
          salary_type: form.salary_type as any,
          monthly_salary: Number(form.monthly_salary) || 0,
          daily_rate: Number(form.daily_rate) || 0,
          previous_balance: Number(form.previous_balance) || 0,
        };
        // Track salary type change from monthly to daily
        if (editOriginalSalaryType === "monthly" && form.salary_type === "daily") {
          updateData.salary_type_changed_at = new Date().toISOString();
        }
        if (photoUrl) updateData.photo_url = photoUrl;
        if (coverUrl) updateData.cover_url = coverUrl;

        const { error } = await (supabase as any).from("profiles").update(updateData).eq("id", editId);
        if (error) throw error;
        toast.success("সদস্যের তথ্য আপডেট হয়েছে!");
      } else {
        // Create new member via edge function (won't affect admin session)
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-member`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            email: form.email,
            password: "000000",
            full_name: form.full_name,
            profile_data: {
              phone: form.phone || null,
              whatsapp_no: form.whatsapp_no || null,
              sms_mobile: form.sms_mobile || null,
              designation: form.designation || null,
              bio: form.bio || null,
              bank_name: form.bank_name || null,
              bank_account_no: form.bank_account_no || null,
              bank_account_holder: form.bank_account_holder || null,
              bkash_no: form.bkash_no || null,
              bkash_holder: form.bkash_holder || null,
              nagad_no: form.nagad_no || null,
              nagad_holder: form.nagad_holder || null,
              address: form.address || null,
              salary_type: form.salary_type,
              monthly_salary: Number(form.monthly_salary) || 0,
            },
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        toast.success(`সদস্য যোগ হয়েছে! ডিফল্ট পাসওয়ার্ড: 000000`, { duration: 10000 });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-members"] });
      queryClient.invalidateQueries({ queryKey: ["member-balance"] });
      queryClient.invalidateQueries({ queryKey: ["admin-member-balances"] });
      queryClient.invalidateQueries({ queryKey: ["admin-total-due"] });
      queryClient.invalidateQueries({ queryKey: ["admin-filtered-due"] });
      setOpen(false);
      setForm(emptyForm);
      setEditId(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (memberId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_active: !currentStatus }).eq("id", memberId);
    if (error) { toast.error(error.message); return; }
    toast.success(!currentStatus ? "সদস্য সক্রিয় করা হয়েছে" : "সদস্য নিষ্ক্রিয় করা হয়েছে");
    queryClient.invalidateQueries({ queryKey: ["admin-members"] });
  };

  const toggleVerified = async (memberId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_verified: !currentStatus } as any).eq("id", memberId);
    if (error) { toast.error(error.message); return; }
    toast.success(!currentStatus ? "ভেরিফাইড করা হয়েছে ✓" : "ভেরিফাইড সরানো হয়েছে");
    queryClient.invalidateQueries({ queryKey: ["admin-members"] });
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 md:h-6 md:w-6 text-primary" /> সদস্য
            </h1>
            <p className="text-muted-foreground text-xs">{members?.length || 0} জন সদস্য</p>
          </div>

          {/* Suspended accounts */}
          {lockedAccounts && lockedAccounts.length > 0 && (
            <Card className="p-4 bg-destructive/5 border-destructive/20">
              <h3 className="text-sm font-semibold text-destructive flex items-center gap-2 mb-3">
                <ShieldAlert className="h-4 w-4" /> সাসপেন্ডেড অ্যাকাউন্ট ({lockedAccounts.length})
              </h3>
              <div className="space-y-2">
                {lockedAccounts.map((la: any) => {
                  const memberId = la.identifier?.replace("member_", "");
                  const member = members?.find((m: any) => String(m.member_id) === memberId);
                  const remaining = Math.ceil((new Date(la.locked_until).getTime() - Date.now()) / 60000);
                  return (
                    <div key={la.id} className="flex items-center justify-between bg-card/50 rounded-lg px-3 py-2 border border-border/20">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {member?.full_name || `আইডি: ${memberId}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          বাকি সময়: {remaining > 0 ? `${remaining} মিনিট` : "মেয়াদ শেষ"}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => resetLockout(la.identifier)}>
                        রিসেট
                      </Button>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 text-xs md:text-sm" size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> সদস্য যোগ</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border/50 max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-foreground">{editId ? "সদস্যের তথ্য সম্পাদনা" : "নতুন সদস্য যোগ করুন"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                {editId && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-foreground text-xs">প্রোফাইল ছবি</Label>
                      <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
                      <Button type="button" variant="outline" size="sm" className="w-full gap-2 mt-1 border-border/50" onClick={() => photoRef.current?.click()}>
                        <Camera className="h-4 w-4" /> {photoFile ? photoFile.name.slice(0, 15) + "..." : "ছবি আপলোড"}
                      </Button>
                    </div>
                    <div>
                      <Label className="text-foreground text-xs">কভার ছবি</Label>
                      <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
                      <Button type="button" variant="outline" size="sm" className="w-full gap-2 mt-1 border-border/50" onClick={() => coverRef.current?.click()}>
                        <Image className="h-4 w-4" /> {coverFile ? coverFile.name.slice(0, 15) + "..." : "কভার আপলোড"}
                      </Button>
                    </div>
                  </div>
                )}
                {!editId && (
                  <>
                    <div>
                      <Label className="text-foreground">Full Name (English) *</Label>
                      <Input value={form.full_name_en} onChange={(e) => setField("full_name_en", e.target.value)} required className="bg-secondary border-border/50" placeholder="English name" />
                    </div>
                    <div>
                      <Label className="text-foreground flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5 text-primary" /> মোবাইল নাম্বার *
                      </Label>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-2 rounded-md bg-secondary border border-border/50 text-sm text-muted-foreground">+88</span>
                        <Input
                          value={form.sms_mobile}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                            setForm((f) => ({ ...f, phone: digits, whatsapp_no: digits, sms_mobile: digits }));
                          }}
                          placeholder="01XXXXXXXXX"
                          required
                          className="bg-secondary border-border/50 flex-1"
                          inputMode="numeric"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">এই নাম্বার দিয়েই SMS, WhatsApp, লগইন ও অন্যান্য কাজ হবে। বাকি তথ্য পরে এডিট থেকে পূরণ করা যাবে।</p>
                    </div>
                    <div>
                      <Label className="text-foreground">ইমেইল <span className="text-muted-foreground text-xs">(ঐচ্ছিক)</span></Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setField("email", e.target.value)}
                        placeholder="example@mail.com"
                        className="bg-secondary border-border/50"
                      />
                      <p className="text-xs text-muted-foreground mt-1">ইমেইল না দিলে অটো জেনারেট হবে। পরে এডিট থেকেও যোগ করা যাবে।</p>
                    </div>
                  </>
                )}
                {editId && (
                <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-foreground">পূর্ণ নাম *</Label>
                    <Input value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} required className="bg-secondary border-border/50" />
                  </div>
                  <div>
                    <Label className="text-foreground">Full Name (English)</Label>
                    <Input value={form.full_name_en} onChange={(e) => setField("full_name_en", e.target.value)} className="bg-secondary border-border/50" placeholder="English name" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-foreground">ইমেইল</Label>
                    <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} disabled className="bg-secondary border-border/50" />
                  </div>
                  <div>
                    <Label className="text-foreground flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5 text-primary" /> মোবাইল নাম্বার
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-2 rounded-md bg-secondary border border-border/50 text-sm text-muted-foreground">+88</span>
                      <Input
                        value={form.sms_mobile || form.phone || form.whatsapp_no}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                          setForm((f) => ({ ...f, phone: digits, whatsapp_no: digits, sms_mobile: digits }));
                        }}
                        placeholder="01XXXXXXXXX"
                        className="bg-secondary border-border/50 flex-1"
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="role" className="w-full">
                  <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-secondary p-1">
                    <TabsTrigger value="role" className="text-xs flex-1 min-w-[80px]">রোল</TabsTrigger>
                    <TabsTrigger value="dob" className="text-xs flex-1 min-w-[80px]">জন্ম তারিখ</TabsTrigger>
                    <TabsTrigger value="address" className="text-xs flex-1 min-w-[80px]">ঠিকানা</TabsTrigger>
                    <TabsTrigger value="education" className="text-xs flex-1 min-w-[80px]">শিক্ষা</TabsTrigger>
                    <TabsTrigger value="bio" className="text-xs flex-1 min-w-[80px]">বায়োডাটা</TabsTrigger>
                    <TabsTrigger value="banking" className="text-xs flex-1 min-w-[80px]">ব্যাংকিং</TabsTrigger>
                    <TabsTrigger value="other" className="text-xs flex-1 min-w-[80px]">অন্যান্য</TabsTrigger>
                  </TabsList>

                  {/* রোল */}
                  <TabsContent value="role" className="space-y-3 mt-4">
                    <div>
                      <Label className="text-foreground">রোল / পদবী (একাধিক নির্বাচন করা যাবে)</Label>
                      {(() => {
                        const editingMember = editId ? (allProfiles || []).find((p: any) => p.id === editId) : null;
                        const isSuperAdminMember = editingMember?.member_id === 20200;
                        const ROLES = [
                          { bn: "অভিনেতা", en: "Actor" },
                          { bn: "অভিনেত্রী", en: "Actress" },
                          { bn: "রাইটার", en: "Writer" },
                          { bn: "পরিচালক", en: "Director" },
                          { bn: "সহঃ পরিচালক", en: "Assistant Director" },
                          { bn: "প্রডাকশন", en: "Production" },
                          { bn: "ক্যামেরাম্যান", en: "Cameraman" },
                          { bn: "ক্লায়েন্ট", en: "Client" },
                          { bn: "এডিটর", en: "Editor" },
                        ];
                        if (isSuperAdminMember) ROLES.push({ bn: "সুপার এডমিন", en: "Super Admin" });
                        const selected = (form.designation || "").split(",").map((s) => s.trim()).filter(Boolean);
                        const toggle = (bn: string) => {
                          const next = selected.includes(bn) ? selected.filter((s) => s !== bn) : [...selected, bn];
                          const enList = next.map((b) => ROLES.find((r) => r.bn === b)?.en || b);
                          setForm((f) => ({ ...f, designation: next.join(", "), designation_en: enList.join(", ") }));
                        };
                        return (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2 rounded-md bg-secondary border border-border/50">
                            {ROLES.map((r) => {
                              const checked = selected.includes(r.bn);
                              return (
                                <label key={r.bn} className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer text-xs transition-colors ${checked ? "bg-primary/20 text-primary" : "hover:bg-background"}`}>
                                  <input type="checkbox" checked={checked} onChange={() => toggle(r.bn)} className="h-3 w-3 accent-primary" />
                                  <span>{r.bn}</span>
                                </label>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <Label className="text-foreground">পদবী (English) — স্বয়ংক্রিয়</Label>
                      <Input value={form.designation_en} onChange={(e) => setField("designation_en", e.target.value)} className="bg-secondary border-border/50" placeholder="Designation in English" />
                    </div>
                  </TabsContent>

                  {/* জন্ম তারিখ */}
                  <TabsContent value="dob" className="mt-4">
                    <div className="rounded-lg border-2 border-pink-500/40 bg-gradient-to-br from-pink-500/10 to-purple-500/5 p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-foreground flex items-center gap-1.5 mb-1.5">
                          🎂 <span>জন্ম তারিখ</span>
                          <span className="text-[10px] text-muted-foreground font-normal">(কাউন্টডাউনে দেখাবে)</span>
                        </Label>
                        <Input type="date" value={form.date_of_birth} onChange={(e) => setField("date_of_birth", e.target.value)} className="bg-secondary border-border/50" />
                      </div>
                      <div>
                        <Label className="text-foreground flex items-center gap-1.5 mb-1.5">
                          🩸 <span>রক্তের গ্রুপ</span>
                        </Label>
                        <Select value={form.blood_group || undefined} onValueChange={(v) => setField("blood_group" as any, v)}>
                          <SelectTrigger className="bg-secondary border-border/50">
                            <SelectValue placeholder="রক্তের গ্রুপ নির্বাচন করুন" />
                          </SelectTrigger>
                          <SelectContent>
                            {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                              <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>

                  {/* ঠিকানা */}
                  <TabsContent value="address" className="space-y-3 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-foreground">ঠিকানা</Label>
                        <Input value={form.address} onChange={(e) => setField("address", e.target.value)} className="bg-secondary border-border/50" />
                      </div>
                      <div>
                        <Label className="text-foreground">Address (English)</Label>
                        <Input value={form.address_en} onChange={(e) => setField("address_en", e.target.value)} className="bg-secondary border-border/50" />
                      </div>
                    </div>
                  </TabsContent>

                  {/* শিক্ষা */}
                  <TabsContent value="education" className="space-y-3 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-foreground text-xs">শিক্ষা</Label>
                        <Input value={form.education} onChange={(e) => setField("education", e.target.value)} className="bg-secondary border-border/50" />
                      </div>
                      <div>
                        <Label className="text-foreground text-xs">Education (English)</Label>
                        <Input value={form.education_en} onChange={(e) => setField("education_en", e.target.value)} className="bg-secondary border-border/50" />
                      </div>
                      <div>
                        <Label className="text-foreground text-xs">অর্জন</Label>
                        <Textarea value={form.achievements} onChange={(e) => setField("achievements", e.target.value)} className="bg-secondary border-border/50" rows={2} />
                      </div>
                      <div>
                        <Label className="text-foreground text-xs">Achievements (English)</Label>
                        <Textarea value={form.achievements_en} onChange={(e) => setField("achievements_en", e.target.value)} className="bg-secondary border-border/50" rows={2} />
                      </div>
                    </div>
                  </TabsContent>

                  {/* বায়োডাটা */}
                  <TabsContent value="bio" className="space-y-3 mt-4">
                    <div>
                      <Label className="text-foreground">বায়ো</Label>
                      <Textarea value={form.bio} onChange={(e) => setField("bio", e.target.value)} className="bg-secondary border-border/50" rows={2} />
                    </div>
                    <div>
                      <Label className="text-foreground text-xs">Bio (English)</Label>
                      <Textarea value={form.bio_en} onChange={(e) => setField("bio_en", e.target.value)} className="bg-secondary border-border/50" rows={2} placeholder="Full bio in English" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-foreground text-xs">সংক্ষিপ্ত বায়ো</Label>
                        <Textarea value={form.short_bio} onChange={(e) => setField("short_bio", e.target.value)} className="bg-secondary border-border/50" rows={2} placeholder="হিরোতে দেখানো হবে" />
                      </div>
                      <div>
                        <Label className="text-foreground text-xs">Short Bio (English)</Label>
                        <Textarea value={form.short_bio_en} onChange={(e) => setField("short_bio_en", e.target.value)} className="bg-secondary border-border/50" rows={2} />
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2 font-medium">প্রিয় তথ্য</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div><Label className="text-foreground text-xs">প্রিয় অভিনেতা</Label><Input value={form.favorite_actor} onChange={(e) => setField("favorite_actor", e.target.value)} className="bg-secondary border-border/50" /></div>
                      <div><Label className="text-foreground text-xs">Favorite Actor (EN)</Label><Input value={form.favorite_actor_en} onChange={(e) => setField("favorite_actor_en", e.target.value)} className="bg-secondary border-border/50" /></div>
                      <div><Label className="text-foreground text-xs">প্রিয় অভিনেত্রী</Label><Input value={form.favorite_actress} onChange={(e) => setField("favorite_actress", e.target.value)} className="bg-secondary border-border/50" /></div>
                      <div><Label className="text-foreground text-xs">Favorite Actress (EN)</Label><Input value={form.favorite_actress_en} onChange={(e) => setField("favorite_actress_en", e.target.value)} className="bg-secondary border-border/50" /></div>
                      <div><Label className="text-foreground text-xs">প্রিয় রঙ</Label><Input value={form.favorite_color} onChange={(e) => setField("favorite_color", e.target.value)} className="bg-secondary border-border/50" /></div>
                      <div><Label className="text-foreground text-xs">Favorite Color (EN)</Label><Input value={form.favorite_color_en} onChange={(e) => setField("favorite_color_en", e.target.value)} className="bg-secondary border-border/50" /></div>
                      <div><Label className="text-foreground text-xs">প্রিয় পোশাক</Label><Input value={form.favorite_dress} onChange={(e) => setField("favorite_dress", e.target.value)} className="bg-secondary border-border/50" /></div>
                      <div><Label className="text-foreground text-xs">Favorite Dress (EN)</Label><Input value={form.favorite_dress_en} onChange={(e) => setField("favorite_dress_en", e.target.value)} className="bg-secondary border-border/50" /></div>
                      <div><Label className="text-foreground text-xs">প্রিয় খাবার</Label><Input value={form.favorite_food} onChange={(e) => setField("favorite_food", e.target.value)} className="bg-secondary border-border/50" /></div>
                      <div><Label className="text-foreground text-xs">Favorite Food (EN)</Label><Input value={form.favorite_food_en} onChange={(e) => setField("favorite_food_en", e.target.value)} className="bg-secondary border-border/50" /></div>
                    </div>
                  </TabsContent>

                  {/* ব্যাংকিং */}
                  <TabsContent value="banking" className="space-y-4 mt-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 font-medium">ব্যাংক তথ্য</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-foreground text-xs">ব্যাংকের নাম</Label>
                          <BankSelect value={form.bank_name} onChange={(v) => setField("bank_name", v)} className="bg-secondary border-border/50" />
                        </div>
                        <div>
                          <Label className="text-foreground text-xs">হোল্ডারের নাম</Label>
                          <Input value={form.bank_account_holder} onChange={(e) => setField("bank_account_holder" as any, e.target.value)} className="bg-secondary border-border/50" placeholder="একাউন্টধারীর পূর্ণ নাম" />
                        </div>
                        <div>
                          <Label className="text-foreground text-xs">একাউন্ট নম্বর</Label>
                          <Input value={form.bank_account_no} onChange={(e) => setField("bank_account_no", e.target.value)} className="bg-secondary border-border/50" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 font-medium">মোবাইল ব্যাংকিং তথ্য</p>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-foreground text-xs">প্রোভাইডার</Label>
                            <div className="flex items-center h-10 px-3 rounded-md bg-secondary border border-border/50">
                              <span className="inline-flex items-center justify-center h-5 px-1.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: "#E2136E" }}>bKash</span>
                              <span className="ml-2 text-sm">বিকাশ</span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-foreground text-xs">হোল্ডারের নাম</Label>
                            <Input value={form.bkash_holder} onChange={(e) => setField("bkash_holder" as any, e.target.value)} className="bg-secondary border-border/50" placeholder="বিকাশ একাউন্টধারীর নাম" />
                          </div>
                          <div>
                            <Label className="text-foreground text-xs">নম্বর</Label>
                            <Input value={form.bkash_no} onChange={(e) => setField("bkash_no", e.target.value)} className="bg-secondary border-border/50" placeholder="01XXXXXXXXX" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-foreground text-xs">প্রোভাইডার</Label>
                            <div className="flex items-center h-10 px-3 rounded-md bg-secondary border border-border/50">
                              <span className="inline-flex items-center justify-center h-5 px-1.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: "#EE3124" }}>Nagad</span>
                              <span className="ml-2 text-sm">নগদ</span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-foreground text-xs">হোল্ডারের নাম</Label>
                            <Input value={form.nagad_holder} onChange={(e) => setField("nagad_holder" as any, e.target.value)} className="bg-secondary border-border/50" placeholder="নগদ একাউন্টধারীর নাম" />
                          </div>
                          <div>
                            <Label className="text-foreground text-xs">নম্বর</Label>
                            <Input value={form.nagad_no} onChange={(e) => setField("nagad_no", e.target.value)} className="bg-secondary border-border/50" placeholder="01XXXXXXXXX" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* অন্যান্য — বেতন ও পূর্বের বাকি */}
                  <TabsContent value="other" className="space-y-3 mt-4">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">বেতন তথ্য</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-foreground text-xs">বেতনের ধরন</Label>
                        <Select value={form.salary_type} onValueChange={(v) => setField("salary_type" as any, v)}>
                          <SelectTrigger className="bg-secondary border-border/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border/50">
                            <SelectItem value="daily">দৈনিক</SelectItem>
                            <SelectItem value="monthly">মাসিক</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {form.salary_type === "monthly" && (
                        <div>
                          <Label className="text-foreground text-xs">মাসিক বেতন (৳)</Label>
                          <Input type="number" value={form.monthly_salary} onChange={(e) => setField("monthly_salary" as any, e.target.value)} className="bg-secondary border-border/50" />
                        </div>
                      )}
                      {form.salary_type === "daily" && (
                        <div>
                          <Label className="text-foreground text-xs">দৈনিক রেট (৳)</Label>
                          <Input type="number" value={form.daily_rate} onChange={(e) => setField("daily_rate" as any, e.target.value)} className="bg-secondary border-border/50" placeholder="ফিক্স দৈনিক বেতন" />
                          <p className="text-[10px] text-muted-foreground mt-0.5">হাজিরায় স্বয়ংক্রিয়ভাবে যুক্ত হবে</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-foreground text-xs">পূর্বের বাকি (৳)</Label>
                      <Input type="number" value={form.previous_balance} onChange={(e) => setField("previous_balance" as any, e.target.value)} className="bg-secondary border-border/50" placeholder="আগের পাওনা থাকলে লিখুন" />
                      <p className="text-[10px] text-muted-foreground mt-1">সিস্টেম চালু হওয়ার আগের বকেয়া পরিমাণ</p>
                    </div>
                  </TabsContent>
                </Tabs>
                </>
                )}
                {editId && (() => {
                  const editingMember = (allProfiles || []).find((p: any) => p.id === editId);
                  if (!editingMember) return null;
                  return (
                    <div className="border-t border-border/30 pt-3 mt-2">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">অ্যাকাউন্ট ও নিরাপত্তা</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2 justify-start border-border/50"
                          onClick={() => { setEmailMember(editingMember); setNewEmail(editingMember.email || ""); setEmailOpen(true); }}
                        >
                          <Mail className="h-4 w-4 text-primary" />
                          <span className="text-xs">ইমেইল পরিবর্তন</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2 justify-start border-border/50"
                          onClick={() => { setPwMember(editingMember); setNewPassword(""); setPwOpen(true); }}
                        >
                          <KeyRound className="h-4 w-4 text-warning" />
                          <span className="text-xs">পাসওয়ার্ড পরিবর্তন</span>
                        </Button>
                      </div>
                    </div>
                  );
                })()}
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "সেভ হচ্ছে..." : editId ? "আপডেট করুন" : "সদস্য যোগ করুন"}
                </Button>
                {editId && (() => {
                  const editingMember = (allProfiles || []).find((p: any) => p.id === editId);
                  if (!editingMember || editingMember.member_id === 20200) return null;
                  return (
                    <div className="border-t border-destructive/30 pt-3 mt-2">
                      <p className="text-[11px] text-destructive/80 mb-2 font-medium">⚠️ বিপজ্জনক জোন</p>
                      <Button
                        type="button"
                        variant="destructive"
                        className="w-full gap-2"
                        onClick={() => {
                          setDeleteMember(editingMember);
                          setDeleteOpen(true);
                          setOpen(false);
                        }}
                      >
                        <Trash2 className="h-4 w-4" /> সদস্য চিরতরে ডিলিট করুন
                      </Button>
                      <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                        হাজিরা, ফ্রিল্যান্স ও সকল হিস্টরী মুছে যাবে
                      </p>
                    </div>
                  );
                })()}
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden space-y-2">
          {members?.map((m) => (
            <Card key={m.id} className={`bg-card border-border/30 p-3 active:scale-[0.99] transition-transform ${!(m.is_active ?? true) ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0 overflow-hidden">
                  {m.photo_url ? (
                    <img src={m.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-primary text-sm font-semibold">{m.full_name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground truncate">{m.full_name}</p>
                    {(m as any).is_verified && <span className="text-blue-500 text-xs">✓</span>}
                    {!(m.is_active ?? true) && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive">নিষ্ক্রিয়</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{m.designation || "সদস্য"} · ID: {m.member_id}</p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Switch
                    checked={m.is_active ?? true}
                    onCheckedChange={() => toggleActive(m.id, m.is_active ?? true)}
                    className="scale-75"
                  />
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(m)}>
                    <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setPwMember(m); setNewPassword(""); setPwOpen(true); }}>
                    <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEmailMember(m); setNewEmail(m.email || ""); setEmailOpen(true); }}>
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Link to={`/member/${m.member_id}`}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Desktop table */}
        <Card className="bg-card border-border/30 overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-secondary/30">
                  <th className="text-left p-3 text-blue-400 font-medium text-xs">আইডি</th>
                  <th className="text-left p-3 text-cyan-400 font-medium text-xs">নাম</th>
                   <th className="text-left p-3 text-violet-400 font-medium text-xs">পদবী</th>
                   <th className="text-left p-3 text-red-400 font-medium text-xs">বেতন ধরন</th>
                   <th className="text-left p-3 text-red-400 font-medium text-xs">ভেরিফাইড</th>
                   <th className="text-left p-3 text-fuchsia-400 font-medium text-xs">স্পটলাইট</th>
                   <th className="text-left p-3 text-sky-400 font-medium text-xs">ক্রম</th>
                   <th className="text-left p-3 text-pink-400 font-medium text-xs">স্ট্যাটাস</th>
                  <th className="text-right p-3 text-red-400 font-medium text-xs">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {members?.map((m) => (
                  <tr key={m.id} className={`hover:bg-secondary/30 transition-colors ${!(m.is_active ?? true) ? "opacity-50" : ""}`}>
                    <td className="p-3 text-foreground font-mono text-xs">{m.member_id}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden">
                          {m.photo_url ? <img src={m.photo_url} alt="" className="h-full w-full object-cover" /> : <span className="text-primary text-xs font-medium">{m.full_name.charAt(0)}</span>}
                        </div>
                        <div>
                          <span className="text-foreground">{m.full_name}</span>
                          {m.email && <p className="text-xs text-muted-foreground">{m.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{m.designation || "—"}</td>
                    <td className="p-3 text-muted-foreground">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${(m as any).salary_type === "monthly" ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning"}`}>
                        {(m as any).salary_type === "monthly" ? `মাসিক ৳${Number((m as any).monthly_salary || 0).toLocaleString("bn-BD")}` : "দৈনিক"}
                      </span>
                    </td>
                    <td className="p-3">
                      <Switch checked={(m as any).is_verified ?? false} onCheckedChange={() => toggleVerified(m.id, (m as any).is_verified ?? false)} />
                    </td>
                    <td className="p-3">
                      <select
                        value={Number((m as any).spotlight_priority ?? 1)}
                        onChange={async (e) => {
                          const val = Number(e.target.value);
                          const { error } = await supabase.from("profiles").update({ spotlight_priority: val } as any).eq("id", m.id);
                          if (error) { toast.error(error.message); return; }
                          toast.success("অগ্রাধিকার আপডেট হয়েছে");
                          queryClient.invalidateQueries({ queryKey: ["admin-members"] });
                        }}
                        className="bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground"
                      >
                        {[1,2,3,5,8,10].map(v => (
                          <option key={v} value={v}>{v === 1 ? "সাধারণ" : `${v}x`}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        defaultValue={Number((m as any).public_display_order ?? 0)}
                        onBlur={async (e) => {
                          const val = Number(e.target.value || 0);
                          if (val === Number((m as any).public_display_order ?? 0)) return;
                          const { error } = await supabase.from("profiles").update({ public_display_order: val } as any).eq("id", m.id);
                          if (error) { toast.error(error.message); return; }
                          toast.success("ক্রম আপডেট হয়েছে");
                          queryClient.invalidateQueries({ queryKey: ["admin-members"] });
                        }}
                        className="bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground w-16"
                        title="ছোট সংখ্যা = উপরে"
                      />
                    </td>
                    <td className="p-3">
                      <Switch checked={m.is_active ?? true} onCheckedChange={() => toggleActive(m.id, m.is_active ?? true)} />
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => openEdit(m)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => { setPwMember(m); setNewPassword(""); setPwOpen(true); }}><KeyRound className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => { setEmailMember(m); setNewEmail(m.email || ""); setEmailOpen(true); }}><Mail className="h-4 w-4" /></Button>
                        <Link to={`/member/${m.member_id}`}><Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary"><Eye className="h-4 w-4" /></Button></Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Admins & Clients (separate list) */}
        {staffList.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mt-6">
              <h2 className="text-base md:text-lg font-bold text-foreground flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-400" /> এডমিন ও ক্লায়েন্ট
              </h2>
              <p className="text-xs text-muted-foreground">{staffList.length} জন</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {staffList.map((m: any) => {
                const isAdmin = m._roles.includes("admin");
                const isClient = m._roles.includes("client");
                const isProductAdmin = m._roles.includes("product_admin");
                return (
                  <Card key={m.id} className={`bg-card border-border/30 p-3 ${!(m.is_active ?? true) ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0 overflow-hidden">
                        {m.photo_url ? (
                          <img src={m.photo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-primary text-sm font-semibold">{m.full_name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-semibold text-foreground truncate">{m.full_name}</p>
                          {isAdmin && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive">এডমিন</span>}
                          {isProductAdmin && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-500">প্রডাক্ট এডমিন</span>}
                          {isClient && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-500">ক্লায়েন্ট</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{m.email || m.designation || "—"}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          defaultValue={Number((m as any).public_display_order ?? 0)}
                          onBlur={async (e) => {
                            const val = Number(e.target.value || 0);
                            if (val === Number((m as any).public_display_order ?? 0)) return;
                            const { error } = await supabase.from("profiles").update({ public_display_order: val } as any).eq("id", m.id);
                            if (error) { toast.error(error.message); return; }
                            toast.success("ক্রম আপডেট হয়েছে");
                            queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
                          }}
                          className="bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground w-14"
                          title="ক্রম (ছোট সংখ্যা = উপরে)"
                        />
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(m)}>
                          <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setPwMember(m); setNewPassword(""); setPwOpen(true); }}>
                          <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEmailMember(m); setNewEmail(m.email || ""); setEmailOpen(true); }}>
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Password Dialog */}
        <Dialog open={pwOpen} onOpenChange={setPwOpen}>
          <DialogContent className="bg-card border-border/50 max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-foreground">পাসওয়ার্ড সেট করুন</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{pwMember?.full_name} এর জন্য নতুন পাসওয়ার্ড দিন</p>
            <Input
              type="text"
              placeholder="নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-secondary border-border/50"
            />
            <Button onClick={handleSetPassword} disabled={pwSubmitting || newPassword.length < 6} className="w-full">
              {pwSubmitting ? "সেট হচ্ছে..." : "পাসওয়ার্ড সেট করুন"}
            </Button>
          </DialogContent>
        </Dialog>

        {/* Email Change Dialog */}
        <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
          <DialogContent className="bg-card border-border/50 max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" /> ইমেইল পরিবর্তন
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{emailMember?.full_name} এর ইমেইল পরিবর্তন করুন</p>
            <Input
              type="email"
              placeholder="নতুন ইমেইল দিন"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="bg-secondary border-border/50"
            />
            <Button onClick={handleChangeEmail} disabled={emailSubmitting || !newEmail.trim()} className="w-full gap-2">
              <Mail className="h-4 w-4" /> {emailSubmitting ? "পরিবর্তন হচ্ছে..." : "ইমেইল পরিবর্তন করুন"}
            </Button>
          </DialogContent>
        </Dialog>

        <MemberDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          member={deleteMember}
          onDeleted={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-members"] });
            queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
          }}
        />
      </div>
    </AppLayout>
  );
};

export default AdminMembers;
