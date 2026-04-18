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

      const totalBonus = bonuses?.filter((b: any) => b.type === "bonus").reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0) ?? 0;
      const totalTransport = bonuses?.filter((b: any) => b.type === "transport").reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0) ?? 0;
      const totalBonuses = totalBonus + totalTransport;

      // Get profile info including salary_type_changed_at
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("previous_balance, salary_type, salary_type_changed_at, full_name")
        .eq("id", profileId!)
        .maybeSingle();

      const previousBalance = Number(profile?.previous_balance || 0);

      // Monthly salary credits - exclude credits from the month salary type changed (monthly→daily)
      const { data: salaryCredits } = await (supabase as any)
        .from("salary_credits")
        .select("amount, credit_month")
        .eq("member_id", profileId!);

      let totalSalaryCredits = 0;
      if (salaryCredits) {
        const changedAt = profile?.salary_type_changed_at;
        let excludeFromMonth: string | null = null;

        if (changedAt && profile?.salary_type === "daily") {
          // Get the first day of the month when salary type changed
          const changedDate = new Date(changedAt);
          excludeFromMonth = `${changedDate.getFullYear()}-${String(changedDate.getMonth() + 1).padStart(2, "0")}-01`;
        }

        totalSalaryCredits = salaryCredits.reduce((sum: number, s: any) => {
          // Exclude salary credits from the change month onwards
          if (excludeFromMonth && s.credit_month >= excludeFromMonth) {
            return sum;
          }
          return sum + Number(s.amount || 0);
        }, 0);
      }

      // Freelance income (assigned external work rates)
      const { data: freelanceData } = await (supabase as any)
        .from("freelance_assignments")
        .select("rate")
        .eq("member_id", profileId!);

      const totalFromAssignments = freelanceData?.reduce((sum: number, f: any) => sum + Number(f.rate || 0), 0) ?? 0;

      // Client-portal artist work (matched by artist_name = profile full_name)
      const fullName = profile?.full_name as string | undefined;
      let totalFromClientArtists = 0;
      if (fullName) {
        const { data: clientArtistsData } = await (supabase as any)
          .from("client_project_artists")
          .select("remuneration")
          .eq("artist_name", fullName);
        totalFromClientArtists = clientArtistsData?.reduce((sum: number, c: any) => sum + Number(c.remuneration || 0), 0) ?? 0;
      }

      const totalFreelance = totalFromAssignments + totalFromClientArtists;

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
