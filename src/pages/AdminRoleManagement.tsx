import { AppLayout } from "@/components/AppLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ALL_PERMISSIONS, PERMISSION_LABELS, PermissionKey } from "@/hooks/usePermissions";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Search, Users } from "lucide-react";

const AdminRoleManagement = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: members = [] } = useQuery({
    queryKey: ["rm-members"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, member_id, photo_url, designation")
        .eq("is_active", true)
        .order("member_id");
      return data ?? [];
    },
  });

  const { data: perms = [] } = useQuery({
    queryKey: ["rm-permissions"],
    queryFn: async () => {
      const { data } = await supabase.from("member_permissions" as any).select("*");
      return (data ?? []) as any[];
    },
  });

  const permMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const p of perms) {
      if (!m.has(p.member_id)) m.set(p.member_id, new Set());
      m.get(p.member_id)!.add(p.permission);
    }
    return m;
  }, [perms]);

  const toggle = async (memberId: string, perm: PermissionKey, on: boolean) => {
    if (on) {
      const { error } = await supabase
        .from("member_permissions" as any)
        .insert({ member_id: memberId, permission: perm, granted_by: user?.id });
      if (error) return toast.error(error.message);
      toast.success("পারমিশন দেওয়া হয়েছে");
    } else {
      const { error } = await supabase
        .from("member_permissions" as any)
        .delete()
        .eq("member_id", memberId)
        .eq("permission", perm);
      if (error) return toast.error(error.message);
      toast.success("পারমিশন বাতিল");
    }
    qc.invalidateQueries({ queryKey: ["rm-permissions"] });
    qc.invalidateQueries({ queryKey: ["member-permissions"] });
  };

  const filtered = members.filter((m: any) =>
    !search ||
    m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    String(m.member_id ?? "").includes(search)
  );

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">রোল ম্যানেজমেন্ট</h1>
            <p className="text-sm text-muted-foreground">সদস্যদের নির্দিষ্ট সেকশনের অ্যাডমিন অ্যাক্সেস দিন</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="নাম বা আইডি দিয়ে খুঁজুন"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="premium-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border/15 flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>মোট সদস্য: {filtered.length}</span>
          </div>
          <div className="divide-y divide-border/10">
            {filtered.map((m: any) => {
              const set = permMap.get(m.id) ?? new Set<string>();
              return (
                <div key={m.id} className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-3 min-w-[220px]">
                    {m.photo_url ? (
                      <img src={m.photo_url} alt={m.full_name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-secondary" />
                    )}
                    <div>
                      <div className="font-semibold text-sm">{m.full_name}</div>
                      <div className="text-xs text-muted-foreground">ID: {m.member_id} · {m.designation || "—"}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 md:gap-5 md:ml-auto">
                    {ALL_PERMISSIONS.map((p) => {
                      const checked = set.has(p);
                      return (
                        <label key={p} className="flex items-center gap-2 cursor-pointer select-none rounded-lg border border-border/40 px-3 py-2 hover:bg-secondary/40 transition-colors">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => toggle(m.id, p, !!v)}
                          />
                          <span className="text-sm">{PERMISSION_LABELS[p]}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminRoleManagement;
