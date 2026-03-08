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
import { Users, Eye, Plus, Edit, Trash2, Camera, Image, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeyRound, Mail } from "lucide-react";

interface MemberForm {
  full_name: string;
  email: string;
  phone: string;
  designation: string;
  bio: string;
  bank_name: string;
  bank_account_no: string;
  bkash_no: string;
  nagad_no: string;
  address: string;
  salary_type: string;
  monthly_salary: string;
  previous_balance: string;
}

const emptyForm: MemberForm = {
  full_name: "", email: "", phone: "", designation: "", bio: "",
  bank_name: "", bank_account_no: "", bkash_no: "", nagad_no: "", address: "",
  salary_type: "daily", monthly_salary: "0", previous_balance: "0",
};

const AdminMembers = () => {
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
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

  const { data: members } = useQuery({
    queryKey: ["admin-members"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("member_id");
      return data ?? [];
    },
  });

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
    setForm({
      full_name: member.full_name || "",
      email: member.email || "",
      phone: member.phone || "",
      designation: member.designation || "",
      bio: member.bio || "",
      bank_name: member.bank_name || "",
      bank_account_no: member.bank_account_no || "",
      bkash_no: member.bkash_no || "",
      nagad_no: member.nagad_no || "",
      address: member.address || "",
      salary_type: member.salary_type || "daily",
      monthly_salary: String(member.monthly_salary || 0),
    });
    setPhotoFile(null);
    setCoverFile(null);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) { toast.error("নাম দিতে হবে"); return; }
    setSubmitting(true);
    try {
      let photoUrl: string | undefined;
      let coverUrl: string | undefined;

      if (editId) {
        if (photoFile) photoUrl = await uploadFile(photoFile, 'profiles', editId);
        if (coverFile) coverUrl = await uploadFile(coverFile, 'covers', editId);

        const updateData: any = {
          full_name: form.full_name,
          email: form.email || null,
          phone: form.phone || null,
          designation: form.designation || null,
          bio: form.bio || null,
          bank_name: form.bank_name || null,
          bank_account_no: form.bank_account_no || null,
          bkash_no: form.bkash_no || null,
          nagad_no: form.nagad_no || null,
          address: form.address || null,
          salary_type: form.salary_type as any,
          monthly_salary: Number(form.monthly_salary) || 0,
        };
        if (photoUrl) updateData.photo_url = photoUrl;
        if (coverUrl) updateData.cover_url = coverUrl;

        const { error } = await supabase.from("profiles").update(updateData).eq("id", editId);
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
              designation: form.designation || null,
              bio: form.bio || null,
              bank_name: form.bank_name || null,
              bank_account_no: form.bank_account_no || null,
              bkash_no: form.bkash_no || null,
              nagad_no: form.nagad_no || null,
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
            <DialogContent className="bg-card border-border/50 max-w-lg max-h-[90vh] overflow-y-auto">
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
                <div>
                  <Label className="text-foreground">পূর্ণ নাম *</Label>
                  <Input value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} required className="bg-secondary border-border/50" />
                </div>
                <div>
                  <Label className="text-foreground">ইমেইল {!editId && "*"}</Label>
                  <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} required={!editId} disabled={!!editId} className="bg-secondary border-border/50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-foreground">ফোন</Label>
                    <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} className="bg-secondary border-border/50" />
                  </div>
                  <div>
                    <Label className="text-foreground">পদবী</Label>
                    <Input value={form.designation} onChange={(e) => setField("designation", e.target.value)} className="bg-secondary border-border/50" />
                  </div>
                </div>
                <div>
                  <Label className="text-foreground">ঠিকানা</Label>
                  <Input value={form.address} onChange={(e) => setField("address", e.target.value)} className="bg-secondary border-border/50" />
                </div>
                <div>
                  <Label className="text-foreground">বায়ো</Label>
                  <Textarea value={form.bio} onChange={(e) => setField("bio", e.target.value)} className="bg-secondary border-border/50" rows={2} />
                </div>
                <div className="border-t border-border/30 pt-3">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">বেতন তথ্য</p>
                  <div className="grid grid-cols-2 gap-3">
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
                  </div>
                </div>
                <div className="border-t border-border/30 pt-3">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">পেমেন্ট তথ্য</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-foreground text-xs">ব্যাংকের নাম</Label>
                      <Input value={form.bank_name} onChange={(e) => setField("bank_name", e.target.value)} className="bg-secondary border-border/50" />
                    </div>
                    <div>
                      <Label className="text-foreground text-xs">ব্যাংক একাউন্ট নং</Label>
                      <Input value={form.bank_account_no} onChange={(e) => setField("bank_account_no", e.target.value)} className="bg-secondary border-border/50" />
                    </div>
                    <div>
                      <Label className="text-foreground text-xs">বিকাশ নম্বর</Label>
                      <Input value={form.bkash_no} onChange={(e) => setField("bkash_no", e.target.value)} className="bg-secondary border-border/50" />
                    </div>
                    <div>
                      <Label className="text-foreground text-xs">নগদ নম্বর</Label>
                      <Input value={form.nagad_no} onChange={(e) => setField("nagad_no", e.target.value)} className="bg-secondary border-border/50" />
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "সেভ হচ্ছে..." : editId ? "আপডেট করুন" : "সদস্য যোগ করুন"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden space-y-2">
          {members?.map((m) => (
            <Card key={m.id} className="bg-card border-border/30 p-3 active:scale-[0.99] transition-transform">
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
                  </div>
                  <p className="text-[10px] text-muted-foreground">{m.designation || "সদস্য"} · ID: {m.member_id}</p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
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
                <tr className="border-b border-border/30">
                  <th className="text-left p-3 text-muted-foreground font-medium">আইডি</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">নাম</th>
                   <th className="text-left p-3 text-muted-foreground font-medium">পদবী</th>
                   <th className="text-left p-3 text-muted-foreground font-medium">বেতন ধরন</th>
                   <th className="text-left p-3 text-muted-foreground font-medium">ভেরিফাইড</th>
                   <th className="text-left p-3 text-muted-foreground font-medium">স্ট্যাটাস</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {members?.map((m) => (
                  <tr key={m.id} className="hover:bg-secondary/30 transition-colors">
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
      </div>
    </AppLayout>
  );
};

export default AdminMembers;
