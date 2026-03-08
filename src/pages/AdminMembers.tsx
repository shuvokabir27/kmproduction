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
import { Users, Eye, Plus, Edit, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
}

const emptyForm: MemberForm = {
  full_name: "", email: "", phone: "", designation: "", bio: "",
  bank_name: "", bank_account_no: "", bkash_no: "", nagad_no: "", address: "",
  salary_type: "daily", monthly_salary: "0",
};

const AdminMembers = () => {
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const { data: members } = useQuery({
    queryKey: ["admin-members"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("member_id");
      return data ?? [];
    },
  });

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const setField = (key: keyof MemberForm, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
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
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) { toast.error("নাম দিতে হবে"); return; }
    setSubmitting(true);
    try {
      if (editId) {
        // Update existing
        const { error } = await supabase.from("profiles").update({
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
        }).eq("id", editId);
        if (error) throw error;
        toast.success("সদস্যের তথ্য আপডেট হয়েছে!");
      } else {
        // Create new — sign up a user with a random password, profile will auto-create via trigger
        const tempPassword = crypto.randomUUID().slice(0, 16);
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: form.email,
          password: tempPassword,
          options: {
            data: { full_name: form.full_name },
          },
        });
        if (authError) throw authError;

        // Wait a moment for the trigger to create the profile, then update it
        await new Promise((r) => setTimeout(r, 1000));

        if (authData.user) {
          await supabase.from("profiles").update({
            phone: form.phone || null,
            designation: form.designation || null,
            bio: form.bio || null,
            bank_name: form.bank_name || null,
            bank_account_no: form.bank_account_no || null,
            bkash_no: form.bkash_no || null,
            nagad_no: form.nagad_no || null,
            address: form.address || null,
          }).eq("user_id", authData.user.id);
        }
        toast.success(`সদস্য যোগ হয়েছে! টেম্প পাসওয়ার্ড: ${tempPassword}`, { duration: 10000 });
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

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" /> সদস্য ম্যানেজমেন্ট
            </h1>
            <p className="text-muted-foreground text-sm">{members?.length || 0} জন সদস্য</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={openAdd}><Plus className="h-4 w-4" /> সদস্য যোগ করুন</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border/50 max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-foreground">{editId ? "সদস্যের তথ্য সম্পাদনা" : "নতুন সদস্য যোগ করুন"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
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

        <Card className="bg-card border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left p-3 text-muted-foreground font-medium">আইডি</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">নাম</th>
                  <th className="text-left p-3 text-muted-foreground font-medium hidden sm:table-cell">পদবী</th>
                  <th className="text-left p-3 text-muted-foreground font-medium hidden md:table-cell">ফোন</th>
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
                        <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center">
                          <span className="text-primary text-xs font-medium">{m.full_name.charAt(0)}</span>
                        </div>
                        <div>
                          <span className="text-foreground">{m.full_name}</span>
                          {m.email && <p className="text-xs text-muted-foreground">{m.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground hidden sm:table-cell">{m.designation || "—"}</td>
                    <td className="p-3 text-muted-foreground hidden md:table-cell">{m.phone || "—"}</td>
                    <td className="p-3">
                      <Switch
                        checked={m.is_active ?? true}
                        onCheckedChange={() => toggleActive(m.id, m.is_active ?? true)}
                      />
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => openEdit(m)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Link to={`/member/${m.member_id}`}>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AdminMembers;
