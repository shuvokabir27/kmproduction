import { useEffect, useState } from "react";
import { WPAdminShell, WPCard } from "@/components/admin/WPAdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, KeyRound, UserCog, ShieldCheck, ShoppingCart, Palette } from "lucide-react";

type Manager = {
  id: string;
  email: string;
  created_at: string;
  metadata: any;
  roles: string[];
};

const ROLE_META: Record<string, { label: string; icon: any; color: string }> = {
  product_admin: { label: "সুপার অ্যাডমিন", icon: ShieldCheck, color: "text-blue-700 bg-blue-50 border-blue-200" },
  order_manager: { label: "অর্ডার ম্যানেজার", icon: ShoppingCart, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  site_manager: { label: "সাইট ম্যানেজার", icon: Palette, color: "text-amber-700 bg-amber-50 border-amber-200" },
};

export default function AdminUsers() {
  const { user } = useAuth();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "order_manager" as string });
  const [busy, setBusy] = useState(false);
  const [pwdOpen, setPwdOpen] = useState<null | Manager>(null);
  const [newPwd, setNewPwd] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-create-manager", { body: { action: "list" } });
    if (error) toast.error(error.message);
    else setManagers((data as any)?.users || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.email || !form.password) return toast.error("ইমেইল ও পাসওয়ার্ড দিন");
    if (form.password.length < 6) return toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষর");
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-create-manager", {
      body: { action: "create", ...form },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "সমস্যা হয়েছে");
      return;
    }
    toast.success("ম্যানেজার তৈরি হয়েছে");
    setCreateOpen(false);
    setForm({ email: "", password: "", full_name: "", role: "order_manager" });
    load();
  };

  const handleDelete = async (m: Manager) => {
    if (m.id === user?.id) return toast.error("নিজেকে মুছতে পারবেন না");
    if (!confirm(`${m.email} মুছে ফেলতে চান?`)) return;
    const { data, error } = await supabase.functions.invoke("admin-create-manager", {
      body: { action: "delete", user_id: m.id },
    });
    if (error || (data as any)?.error) return toast.error((data as any)?.error || error?.message);
    toast.success("মুছে ফেলা হয়েছে");
    load();
  };

  const handleRoleChange = async (m: Manager, role: string) => {
    const { data, error } = await supabase.functions.invoke("admin-create-manager", {
      body: { action: "update_role", user_id: m.id, role },
    });
    if (error || (data as any)?.error) return toast.error((data as any)?.error || error?.message);
    toast.success("রোল আপডেট হয়েছে");
    load();
  };

  const handleResetPwd = async () => {
    if (!pwdOpen) return;
    if (newPwd.length < 6) return toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষর");
    const { data, error } = await supabase.functions.invoke("admin-create-manager", {
      body: { action: "reset_password", user_id: pwdOpen.id, password: newPwd },
    });
    if (error || (data as any)?.error) return toast.error((data as any)?.error || error?.message);
    toast.success("পাসওয়ার্ড রিসেট হয়েছে");
    setPwdOpen(null);
    setNewPwd("");
  };

  return (
    <WPAdminShell
      title="ম্যানেজার অ্যাকাউন্ট"
      subtitle="অ্যাডমিন ও ম্যানেজার যোগ/পরিচালনা"
      actions={
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" /> নতুন ম্যানেজার
        </Button>
      }
    >
      <WPCard>
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <UserCog className="h-4 w-4 text-blue-600" />
          <h3 className="font-semibold text-slate-900 text-sm">সকল ম্যানেজার ({managers.length})</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">লোড হচ্ছে...</div>
        ) : managers.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">এখনো কোনো ম্যানেজার নেই</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {managers.map((m) => {
              const primary = m.roles.includes("product_admin")
                ? "product_admin"
                : m.roles.includes("order_manager")
                  ? "order_manager"
                  : "site_manager";
              const meta = ROLE_META[primary];
              const Icon = meta.icon;
              const isMe = m.id === user?.id;
              return (
                <div key={m.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 truncate">{m.email}</span>
                      {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">আপনি</span>}
                    </div>
                    {m.metadata?.full_name && <p className="text-xs text-slate-500 mt-0.5">{m.metadata.full_name}</p>}
                    <div className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-xs border ${meta.color}`}>
                      <Icon className="h-3 w-3" /> {meta.label}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={primary} onValueChange={(v) => handleRoleChange(m, v)} disabled={isMe}>
                      <SelectTrigger className="h-9 w-44 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product_admin">সুপার অ্যাডমিন</SelectItem>
                        <SelectItem value="order_manager">অর্ডার ম্যানেজার</SelectItem>
                        <SelectItem value="site_manager">সাইট ম্যানেজার</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => { setPwdOpen(m); setNewPwd(""); }}>
                      <KeyRound className="h-3.5 w-3.5" /> পাসওয়ার্ড
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 border-red-200" onClick={() => handleDelete(m)} disabled={isMe}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </WPCard>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>নতুন ম্যানেজার তৈরি</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>ইমেইল *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="manager@example.com" />
            </div>
            <div>
              <Label>নাম (ঐচ্ছিক)</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <Label>পাসওয়ার্ড *</Label>
              <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="ন্যূনতম ৬ অক্ষর" />
            </div>
            <div>
              <Label>রোল *</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="order_manager">অর্ডার ম্যানেজার — শুধু অর্ডার</SelectItem>
                  <SelectItem value="site_manager">সাইট ম্যানেজার — শুধু সাইট কাস্টমাইজেশন</SelectItem>
                  <SelectItem value="product_admin">সুপার অ্যাডমিন — সব কিছু</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>বাতিল</Button>
            <Button onClick={handleCreate} disabled={busy} className="bg-blue-600 hover:bg-blue-700">{busy ? "তৈরি হচ্ছে..." : "তৈরি করুন"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!pwdOpen} onOpenChange={(o) => !o && setPwdOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>পাসওয়ার্ড রিসেট — {pwdOpen?.email}</DialogTitle></DialogHeader>
          <div>
            <Label>নতুন পাসওয়ার্ড</Label>
            <Input type="text" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="ন্যূনতম ৬ অক্ষর" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdOpen(null)}>বাতিল</Button>
            <Button onClick={handleResetPwd} className="bg-blue-600 hover:bg-blue-700">রিসেট</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WPAdminShell>
  );
}
