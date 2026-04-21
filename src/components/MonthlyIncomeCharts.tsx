import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { TrendingUp, Briefcase } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  profileId: string;
  fullName?: string | null;
  fullNameEn?: string | null;
  onKmClick?: () => void;
  onClientClick?: () => void;
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

      const kmTotal = kmSeries.reduce((s, d) => s + d.income, 0);
      const clientTotal = clientSeries.reduce((s, d) => {
        let v = 0;
        clientNames.forEach((n) => (v += Number((d as any)[n] || 0)));
        return s + v;
      }, 0);

      return { kmSeries, clientSeries, clientNames: Array.from(clientNames), kmTotal, clientTotal };
    },
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-2.5 md:space-y-3">
        <div className="grid grid-cols-2 gap-2.5 md:gap-3">
          <div className="premium-card rounded-2xl h-20 animate-pulse" />
          <div className="premium-card rounded-2xl h-20 animate-pulse" />
        </div>
        <div className="grid md:grid-cols-2 gap-2.5 md:gap-3">
          <div className="premium-card rounded-2xl h-56 animate-pulse" />
          <div className="premium-card rounded-2xl h-56 animate-pulse" />
        </div>
      </div>
    );
  }

  const { kmSeries, clientSeries, clientNames, kmTotal, clientTotal } = data;
  const palette = [
    { from: "#ef4444", to: "#b91c1c" },
    { from: "#f59e0b", to: "#b45309" },
    { from: "#10b981", to: "#047857" },
    { from: "#8b5cf6", to: "#6d28d9" },
    { from: "#ec4899", to: "#be185d" },
    { from: "#06b6d4", to: "#0e7490" },
  ];
  const hasKm = kmSeries.some((d) => d.income > 0);
  const hasClient = clientNames.length > 0 && clientSeries.some((d) => clientNames.some((n) => Number(d[n]) > 0));

  const tooltipStyle = {
    background: "hsl(var(--card) / 0.95)",
    border: "1px solid hsl(var(--border))",
    borderRadius: 10,
    fontSize: 11,
    boxShadow: "0 8px 24px -8px rgba(0,0,0,0.4)",
    backdropFilter: "blur(8px)",
  } as const;

  const yTick = (v: number) => `৳${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2.5 md:space-y-3">
      {/* Income summary cards */}
      <div className="grid grid-cols-2 gap-2.5 md:gap-3">
        <div className="card-glow rounded-2xl" style={{ ["--glow-delay" as any]: "0s" }}>
          <div className="card-glow-inner relative rounded-2xl p-3 md:p-4 border border-white/10 bg-gradient-to-br from-red-500/20 via-red-500/5 to-card shadow-[0_8px_30px_-12px_rgba(239,68,68,0.35)]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-red-500/25 blur-3xl" />
            <div className="relative flex items-center gap-2 mb-1.5">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-red-500/40 to-red-600/10 border border-red-500/30 flex items-center justify-center shadow-inner">
                <TrendingUp className="h-3.5 w-3.5 text-red-400" />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-red-400/90 font-semibold">KM Production</p>
            </div>
            <p className="relative text-lg md:text-2xl font-bold text-foreground">৳{kmTotal.toLocaleString("bn-BD")}</p>
            <p className="relative text-[9px] text-muted-foreground mt-0.5">শেষ ৬ মাসের মোট আয়</p>
          </div>
        </div>
        <div className="card-glow rounded-2xl" style={{ ["--glow-delay" as any]: "2.3s" }}>
          <div className="card-glow-inner relative rounded-2xl p-3 md:p-4 border border-white/10 bg-gradient-to-br from-orange-500/20 via-orange-500/5 to-card shadow-[0_8px_30px_-12px_rgba(249,115,22,0.35)]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" />
            <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-orange-500/25 blur-3xl" />
            <div className="relative flex items-center gap-2 mb-1.5">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-orange-500/40 to-orange-600/10 border border-orange-500/30 flex items-center justify-center shadow-inner">
                <Briefcase className="h-3.5 w-3.5 text-orange-400" />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-orange-400/90 font-semibold">Client আয়</p>
            </div>
            <p className="relative text-lg md:text-2xl font-bold text-foreground">৳{clientTotal.toLocaleString("bn-BD")}</p>
            <p className="relative text-[9px] text-muted-foreground mt-0.5">শেষ ৬ মাসের মোট আয়</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-2.5 md:gap-3">
      {/* KM Production */}
      <div className="relative overflow-hidden rounded-2xl p-3 md:p-4 border border-white/10 bg-gradient-to-br from-red-500/10 via-card to-card shadow-[0_8px_30px_-12px_rgba(239,68,68,0.25)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-red-500/20 blur-3xl" />
        <div className="relative flex items-center gap-2 mb-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-red-500/30 to-red-600/10 border border-red-500/30 flex items-center justify-center shadow-inner">
            <TrendingUp className="h-3.5 w-3.5 text-red-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-[13px] leading-tight">KM Production আয়</h3>
            <p className="text-[9px] text-muted-foreground">শেষ ৬ মাস</p>
          </div>
        </div>
        {hasKm ? (
          <div className="relative h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kmSeries} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barCategoryGap="22%">
                <defs>
                  <linearGradient id="kmGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" stopOpacity={1} />
                    <stop offset="60%" stopColor="#ef4444" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#991b1b" stopOpacity={0.85} />
                  </linearGradient>
                  <linearGradient id="kmGloss" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={0.45} />
                    <stop offset="50%" stopColor="#ffffff" stopOpacity={0.05} />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.25} vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={9} tickLine={false} axisLine={false} tickFormatter={yTick} width={36} />
                <Tooltip cursor={{ fill: "hsl(var(--primary) / 0.08)" }} contentStyle={tooltipStyle} formatter={(v: any) => [`৳${Number(v).toLocaleString("bn-BD")}`, "আয়"]} />
                <Bar dataKey="income" fill="url(#kmGrad)" radius={[8, 8, 2, 2]} maxBarSize={28} />
                <Bar dataKey="income" fill="url(#kmGloss)" radius={[8, 8, 2, 2]} maxBarSize={28} stackId="gloss" hide={false} legendType="none" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">কোনো আয় নেই</div>
        )}
      </div>

      {/* Per-client Freelance */}
      <div className="relative overflow-hidden rounded-2xl p-3 md:p-4 border border-white/10 bg-gradient-to-br from-orange-500/10 via-card to-card shadow-[0_8px_30px_-12px_rgba(249,115,22,0.25)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex items-center gap-2 mb-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-orange-500/30 to-orange-600/10 border border-orange-500/30 flex items-center justify-center shadow-inner">
            <Briefcase className="h-3.5 w-3.5 text-orange-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-[13px] leading-tight">বাইরের ক্লায়েন্ট আয়</h3>
            <p className="text-[9px] text-muted-foreground">শেষ ৬ মাস</p>
          </div>
        </div>
        {hasClient ? (
          <div className="relative h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientSeries} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barCategoryGap="22%">
                <defs>
                  {clientNames.map((name, i) => (
                    <linearGradient key={name} id={`cgrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={palette[i % palette.length].from} stopOpacity={1} />
                      <stop offset="100%" stopColor={palette[i % palette.length].to} stopOpacity={0.85} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.25} vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={9} tickLine={false} axisLine={false} tickFormatter={yTick} width={36} />
                <Tooltip cursor={{ fill: "hsl(var(--primary) / 0.08)" }} contentStyle={tooltipStyle} formatter={(v: any, n: any) => [`৳${Number(v).toLocaleString("bn-BD")}`, n]} />
                <Legend wrapperStyle={{ fontSize: 9 }} iconSize={8} iconType="circle" />
                {clientNames.map((name, i) => (
                  <Bar
                    key={name}
                    dataKey={name}
                    stackId="a"
                    fill={`url(#cgrad-${i})`}
                    radius={i === clientNames.length - 1 ? [8, 8, 0, 0] : [0, 0, 0, 0]}
                    maxBarSize={28}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">বাইরের কোনো আয় নেই</div>
        )}
      </div>
      </div>
    </motion.div>
  );
}
