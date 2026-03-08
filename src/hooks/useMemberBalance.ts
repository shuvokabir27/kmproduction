import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function useMemberBalance(profileId: string | undefined) {
  return useQuery({
    queryKey: ["member-balance", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      // Total earned from attendance
      const { data: attendance } = await supabase
        .from("attendance")
        .select("daily_rate")
        .eq("member_id", profileId!)
        .eq("is_present", true);

      const totalEarned = attendance?.reduce((sum, a) => sum + Number(a.daily_rate || 0), 0) ?? 0;

      // Total paid
      const { data: payments } = await supabase
        .from("payments")
        .select("amount")
        .eq("member_id", profileId!);

      const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) ?? 0;

      return {
        totalEarned,
        totalPaid,
        balance: totalEarned - totalPaid,
      };
    },
  });
}
