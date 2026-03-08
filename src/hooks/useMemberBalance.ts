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

      // Total bonuses (bonus + transport)
      const { data: bonuses } = await supabase
        .from("bonuses")
        .select("amount, type")
        .eq("member_id", profileId!);

      const totalBonus = bonuses?.filter(b => b.type === "bonus").reduce((sum, b) => sum + Number(b.amount || 0), 0) ?? 0;
      const totalTransport = bonuses?.filter(b => b.type === "transport").reduce((sum, b) => sum + Number(b.amount || 0), 0) ?? 0;
      const totalBonuses = totalBonus + totalTransport;

      return {
        totalEarned,
        totalPaid,
        totalBonus,
        totalTransport,
        totalBonuses,
        balance: totalEarned + totalBonuses - totalPaid,
      };
    },
  });
}
