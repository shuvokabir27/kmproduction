import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PermissionKey = "shooting_expenses" | "shootings" | "attendance";

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  shooting_expenses: "শুটিং খরচ",
  shootings: "শুটিং ম্যানেজমেন্ট",
  attendance: "হাজিরা",
};

export const ALL_PERMISSIONS: PermissionKey[] = [
  "shooting_expenses",
  "shootings",
  "attendance",
];

export function usePermissions() {
  const { profile, isAdmin } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["member-permissions", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("member_permissions" as any)
        .select("permission")
        .eq("member_id", profile!.id);
      return ((data ?? []) as any[]).map((r) => r.permission as PermissionKey);
    },
  });

  const permissions = data ?? [];
  const has = (p: PermissionKey) => isAdmin || permissions.includes(p);
  return { permissions, has, isLoading };
}
