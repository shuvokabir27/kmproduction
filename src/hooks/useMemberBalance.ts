import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

type BalanceSource = "km" | "client";

type BalanceEvent = {
  source: BalanceSource;
  amount: number;
  paidAmount: number;
  date: string;
  order: number;
  kmPayable?: boolean;
};

export function useMemberBalance(profileId: string | undefined) {
  return useQuery({
    queryKey: ["member-balance", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const events: BalanceEvent[] = [];
      let eventOrder = 0;

      const toDateValue = (value: string | null | undefined) =>
        value ? new Date(value).getTime() : 0;

      const addEvent = (source: BalanceSource, amount: number, date?: string | null, paidAmount = 0, kmPayable = false) => {
        const safeAmount = Number(amount || 0);
        if (safeAmount <= 0) return;
        events.push({
          source,
          amount: safeAmount,
          paidAmount: Math.max(0, Number(paidAmount || 0)),
          date: date || "1970-01-01T00:00:00.000Z",
          order: eventOrder++,
          kmPayable,
        });
      };

      const getEffectivePaidAmount = (amount: number, paidAmount: number, isPaid?: boolean | null) => {
        const safeAmount = Math.max(0, Number(amount || 0));
        const safePaid = Math.max(0, Number(paidAmount || 0));
        return Math.min(safeAmount, isPaid ? Math.max(safePaid, safeAmount) : safePaid);
      };

      // Total earned from attendance
      const { data: attendance } = await supabase
        .from("attendance")
        .select("daily_rate, created_at")
        .eq("member_id", profileId!)
        .eq("is_present", true);

      const totalEarned = attendance?.reduce((sum, a) => sum + Number(a.daily_rate || 0), 0) ?? 0;
      attendance?.forEach((a: any) => addEvent("km", Number(a.daily_rate || 0), a.created_at));

      // Total paid
      const { data: payments } = await supabase
        .from("payments")
        .select("amount")
        .eq("member_id", profileId!);

      const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) ?? 0;

      // Total bonuses (bonus + transport)
      const { data: bonuses } = await (supabase as any)
        .from("bonuses")
        .select("amount, type, bonus_date, created_at")
        .eq("member_id", profileId!);

      const totalBonus = bonuses?.filter((b: any) => b.type === "bonus").reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0) ?? 0;
      const totalTransport = bonuses?.filter((b: any) => b.type === "transport").reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0) ?? 0;
      const totalBonuses = totalBonus + totalTransport;
      bonuses?.forEach((b: any) => addEvent("km", Number(b.amount || 0), b.bonus_date || b.created_at));

      // Get profile info including salary_type_changed_at
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("previous_balance, salary_type, salary_type_changed_at, full_name")
        .eq("id", profileId!)
        .maybeSingle();

      const previousBalance = Number(profile?.previous_balance || 0);
      addEvent("km", previousBalance, "1970-01-01T00:00:00.000Z");

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
          const amount = Number(s.amount || 0);
          addEvent("km", amount, s.credit_month);
          return sum + amount;
        }, 0);
      }

      // Freelance income (assigned external work rates)
      const { data: freelanceData } = await (supabase as any)
        .from("freelance_assignments")
        .select("rate, paid_amount, is_paid, created_at")
        .eq("member_id", profileId!);

      const totalFromAssignments = freelanceData?.reduce((sum: number, f: any) => sum + Number(f.rate || 0), 0) ?? 0;
      freelanceData?.forEach((f: any) => {
        const rate = Number(f.rate || 0);
        addEvent("client", rate, f.created_at, getEffectivePaidAmount(rate, Number(f.paid_amount || 0), f.is_paid));
      });

      // Client-portal artist work — match by profile_id (admin-added) OR artist_name (legacy)
      const fullName = profile?.full_name as string | undefined;
      let totalFromClientArtists = 0;
      let totalPaidFromClientArtists = 0;
      {
        const clientArtistQueries = [
          (supabase as any)
            .from("client_project_artists")
            .select("id, remuneration, paid_amount, is_paid, created_at")
            .eq("profile_id", profileId!),
        ];

        if (fullName) {
          clientArtistQueries.push(
            (supabase as any)
              .from("client_project_artists")
              .select("id, remuneration, paid_amount, is_paid, created_at")
              .eq("artist_name", fullName)
          );
        }

        const clientArtistResults = await Promise.all(clientArtistQueries);
        const clientArtistsData = clientArtistResults.flatMap((result: any) => result.data ?? []);
        const seen = new Set<string>();
        clientArtistsData.forEach((c: any) => {
          if (seen.has(c.id)) return;
          seen.add(c.id);
          const remuneration = Number(c.remuneration || 0);
          const paidAmount = getEffectivePaidAmount(remuneration, Number(c.paid_amount || 0), c.is_paid);
          totalFromClientArtists += remuneration;
          totalPaidFromClientArtists += paidAmount;
          addEvent("client", remuneration, c.created_at, paidAmount);
        });
      }

      // Also include paid_amount from freelance_assignments
      const totalPaidFromAssignments = freelanceData?.reduce((sum: number, f: any) => {
        const rate = Number(f.rate || 0);
        return sum + getEffectivePaidAmount(rate, Number(f.paid_amount || 0), f.is_paid);
      }, 0) ?? 0;

      const totalFreelance = totalFromAssignments + totalFromClientArtists;
      const directFreelancePaid = totalPaidFromAssignments + totalPaidFromClientArtists;

      const allocatedEvents = events
        .map((event) => ({ ...event, remaining: Math.max(0, event.amount - event.paidAmount) }))
        .sort((a, b) => toDateValue(a.date) - toDateValue(b.date) || a.order - b.order);

      // Payments from public.payments are KM-only — they must NOT reduce client/freelance balance.
      // Client-side payments are already captured via paid_amount on freelance_assignments
      // and client_project_artists. Keeping the two streams isolated lets the dashboard show
      // KM and বাইরের কাজ balances separately.
      let remainingPayments = totalPaid;
      for (const event of allocatedEvents) {
        if (remainingPayments <= 0) break;
        if (event.source !== "km") continue;
        if (event.remaining <= 0) continue;
        const applied = Math.min(event.remaining, remainingPayments);
        event.remaining -= applied;
        remainingPayments -= applied;
      }

      const kmBalance = allocatedEvents
        .filter((event) => event.source === "km")
        .reduce((sum, event) => sum + event.remaining, 0);
      const clientBalance = allocatedEvents
        .filter((event) => event.source === "client")
        .reduce((sum, event) => sum + event.remaining, 0);
      const totalFreelancePaid = Math.max(directFreelancePaid, totalFreelance - clientBalance);

      return {
        totalEarned,
        totalPaid,
        totalBonus,
        totalTransport,
        totalBonuses,
        totalSalaryCredits,
        totalFreelance,
        totalFreelancePaid,
        previousBalance,
        kmBalance,
        clientBalance,
        balance: kmBalance + clientBalance,
      };
    },
  });
}
