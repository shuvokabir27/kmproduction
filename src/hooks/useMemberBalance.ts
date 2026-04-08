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
      const { data: bonuses } = await (supabase as any)
        .from("bonuses")
        .select("amount, type")
        .eq("member_id", profileId!);

      const totalBonus = bonuses?.filter(b => b.type === "bonus").reduce((sum, b) => sum + Number(b.amount || 0), 0) ?? 0;
      const totalTransport = bonuses?.filter(b => b.type === "transport").reduce((sum, b) => sum + Number(b.amount || 0), 0) ?? 0;
      const totalBonuses = totalBonus + totalTransport;

      // Monthly salary credits
      const { data: salaryCredits } = await (supabase as any)
        .from("salary_credits")
        .select("amount")
        .eq("member_id", profileId!);

      const totalSalaryCredits = salaryCredits?.reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0) ?? 0;

      // Previous balance (prior dues)
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("previous_balance")
        .eq("id", profileId!)
        .maybeSingle();

      const previousBalance = Number((profile as any)?.previous_balance || 0);

      // Freelance income (assigned external work rates)
      const { data: freelanceData } = await (supabase as any)
        .from("freelance_assignments")
        .select("rate")
        .eq("member_id", profileId!);

      const totalFreelance = freelanceData?.reduce((sum: number, f: any) => sum + Number(f.rate || 0), 0) ?? 0;

      return {
        totalEarned,
        totalPaid,
        totalBonus,
        totalTransport,
        totalBonuses,
        totalSalaryCredits,
        totalFreelance,
        previousBalance,
        balance: totalEarned + totalBonuses + totalSalaryCredits + totalFreelance + previousBalance - totalPaid,
      };
    },
  });
}
