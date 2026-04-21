import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { TrendingUp, Briefcase } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  profileId: string;
  fullName?: string | null;
  fullNameEn?: string | null;
}

const MONTH_BN = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগ", "সেপ্ট", "অক্টো", "নভে", "ডিসে"];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return `${MONTH_BN[parseInt(m, 10) - 1]} '${y.slice(2)}`;
}
function lastNMonths(n: number) {
  const arr: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    arr.push(monthKey(d));
  }
  return arr;
}

export function MonthlyIncomeCharts({ profileId, fullName, fullNameEn }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["monthly-income", profileId, fullName, fullNameEn],
    enabled: !!profileId,
    queryFn: async () => {
      const [att, bon, sal, fa, cpa] = await Promise.all([
        supabase.from("attendance").select("daily_rate, created_at, shootings(shoot_date)").eq("member_id", profileId).eq("is_present", true),
        (supabase as any).from("bonuses").select("amount, bonus_date").eq("member_id", profileId),
        (supabase as any).from("salary_credits").select("amount, credit_month").eq("member_id", profileId),
        (supabase as any).from("freelance_assignments").select("rate, created_at, freelance_projects(client_name, client_profiles(name, company))").eq("member_id", profileId),
        fullName
          ? (supabase as any)
              .from("client_project_artists")
              .select("remuneration, created_at, freelance_projects(client_name, client_profiles(name, company))")
              .in("artist_name", [fullName, fullNameEn].filter(Boolean) as string[])
          : Promise.resolve({ data: [] as any[] }),
      ]);

      // KM internal monthly aggregation
      const kmMap = new Map<string, number>();
      (att.data ?? []).forEach((a: any) => {
        const date = a.shootings?.shoot_date ? new Date(a.shootings.shoot_date) : new Date(a.created_at);
        const k = monthKey(date);
        kmMap.set(k, (kmMap.get(k) || 0) + Number(a.daily_rate || 0));
      });
      (bon.data ?? []).forEach((b: any) => {
        const k = monthKey(new Date(b.bonus_date));
        kmMap.set(k, (kmMap.get(k) || 0) + Number(b.amount || 0));
      });
      (sal.data ?? []).forEach((s: any) => {
        const k = monthKey(new Date(s.credit_month));
        kmMap.set(k, (kmMap.get(k) || 0) + Number(s.amount || 0));
      });

      // Per-client monthly aggregation
      const clientByMonth = new Map<string, Map<string, number>>(); // month -> clientName -> amount
      const clientNames = new Set<string>();
      const addClient = (date: Date, amount: number, project: any) => {
        const name =
          project?.client_profiles?.company ||
          project?.client_profiles?.name ||
          project?.client_name ||
          "বাইরের আয়";
        clientNames.add(name);
        const k = monthKey(date);
        if (!clientByMonth.has(k)) clientByMonth.set(k, new Map());
        const inner = clientByMonth.get(k)!;
        inner.set(name, (inner.get(name) || 0) + amount);
      };
      (fa.data ?? []).forEach((f: any) =>
        addClient(new Date(f.created_at), Number(f.rate || 0), f.freelance_projects)
      );
      (cpa.data ?? []).forEach((c: any) =>
        addClient(new Date(c.created_at), Number(c.remuneration || 0), c.freelance_projects)
      );

      const months = lastNMonths(6);
      const kmSeries = months.map((k) => ({ month: monthLabel(k), income: Math.round(kmMap.get(k) || 0) }));
      const clientSeries = months.map((k) => {
        const inner = clientByMonth.get(k) || new Map();
        const obj: any = { month: monthLabel(k) };
        clientNames.forEach((n) => {
          obj[n] = Math.round(inner.get(n) || 0);
        });
        return obj;
      });

      return { kmSeries, clientSeries, clientNames: Array.from(clientNames) };
    },
  });

  if (isLoading || !data) {
    return (
      <div className="grid md:grid-cols-2 gap-3 md:gap-4">
        <div className="premium-card rounded-2xl h-72 animate-pulse" />
        <div className="premium-card rounded-2xl h-72 animate-pulse" />
      </div>
    );
  }

  const { kmSeries, clientSeries, clientNames } = data;
  const palette = ["hsl(var(--primary))", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4"];
  const hasKm = kmSeries.some((d) => d.income > 0);
  const hasClient = clientNames.length > 0 && clientSeries.some((d) => clientNames.some((n) => Number(d[n]) > 0));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-2 gap-3 md:gap-4">
      {/* KM Production */}
      <div className="premium-card rounded-2xl p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">KM Production থেকে আয়</h3>
            <p className="text-[10px] text-muted-foreground">শেষ ৬ মাস (শুটিং + বোনাস + বেতন)</p>
          </div>
        </div>
        {hasKm ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kmSeries} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `৳${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [`৳${Number(v).toLocaleString("bn-BD")}`, "আয়"]}
                />
                <Bar dataKey="income" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">কোনো আয় নেই</div>
        )}
      </div>

      {/* Per-client Freelance */}
      <div className="premium-card rounded-2xl p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Briefcase className="h-4 w-4 text-orange-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">বাইরের ক্লায়েন্ট থেকে আয়</h3>
            <p className="text-[10px] text-muted-foreground">শেষ ৬ মাস (ক্লায়েন্ট অনুযায়ী)</p>
          </div>
        </div>
        {hasClient ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientSeries} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `৳${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any, n: any) => [`৳${Number(v).toLocaleString("bn-BD")}`, n]}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {clientNames.map((name, i) => (
                  <Bar key={name} dataKey={name} stackId="a" fill={palette[i % palette.length]} radius={i === clientNames.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">বাইরের কোনো আয় নেই</div>
        )}
      </div>
    </motion.div>
  );
}
