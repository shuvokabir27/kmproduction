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
  /** Outstanding (বকেয়া) for KM Production. Shown on the card instead of total earned. */
  kmOutstanding?: number;
  /** Outstanding (বকেয়া) from external clients. */
  clientOutstanding?: number;
  /** "monthly" | "daily" — controls which cards/charts are shown. */
  salaryType?: string | null;
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

export function MonthlyIncomeCharts({ profileId, fullName, fullNameEn, onKmClick, onClientClick, kmOutstanding, clientOutstanding, salaryType }: Props) {
  const isMonthly = salaryType === "monthly";
  const showKm = true; // both monthly + daily users see KM
  const showClient = !isMonthly; // only daily users see client
  // Net-off logic: if KM is in advance (negative balance), apply it against client outstanding.
  const rawKm = Math.round(kmOutstanding ?? 0);
  const rawClient = Math.round(clientOutstanding ?? 0);
  const kmAdvance = rawKm < 0 ? -rawKm : 0; // amount member owes back to KM
  const displayKm = Math.max(0, rawKm); // KM card shows 0 when in advance
  const displayClient = Math.max(0, rawClient - kmAdvance); // client card absorbs KM advance
  const kmZero = displayKm === 0;
  const clientZero = displayClient === 0;
  // Hide the whole section if the relevant balances are all zero
  const hideAll = isMonthly ? kmZero : (kmZero && clientZero);
  if (hideAll) return null;
  const { data: lastPayments } = useQuery({
    queryKey: ["member-last-payments", profileId, fullName, fullNameEn],
    enabled: !!profileId,
    queryFn: async () => {
      const { data: km } = await supabase
        .from("payments")
        .select("amount, payment_date")
        .eq("member_id", profileId)
        .order("payment_date", { ascending: false })
        .limit(1);

      let lastClient: { amount: number; date: string } | null = null;
      if (fullName) {
        const names = [fullName, fullNameEn].filter(Boolean) as string[];
        const { data: cpa } = await (supabase as any)
          .from("client_project_artists")
          .select("paid_amount, updated_at")
          .in("artist_name", names)
          .gt("paid_amount", 0)
          .order("updated_at", { ascending: false })
          .limit(1);
        if (cpa && cpa[0]) {
          lastClient = { amount: Number(cpa[0].paid_amount || 0), date: cpa[0].updated_at };
        }
      }
      const { data: fa } = await (supabase as any)
        .from("freelance_assignments")
        .select("paid_amount, updated_at")
        .eq("member_id", profileId)
        .gt("paid_amount", 0)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (fa && fa[0]) {
        const candidate = { amount: Number(fa[0].paid_amount || 0), date: fa[0].updated_at as string };
        if (!lastClient || new Date(candidate.date) > new Date(lastClient.date)) {
          lastClient = candidate;
        }
      }

      return {
        km: km && km[0] ? { amount: Number(km[0].amount || 0), date: km[0].payment_date as string } : null,
        client: lastClient,
      };
    },
  });

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
          <div className="rounded-lg border border-border/70 bg-card h-20 animate-pulse" />
          <div className="rounded-lg border border-border/70 bg-card h-20 animate-pulse" />
        </div>
        <div className="grid md:grid-cols-2 gap-2.5 md:gap-3">
          <div className="rounded-lg border border-border/70 bg-card h-56 animate-pulse" />
          <div className="rounded-lg border border-border/70 bg-card h-56 animate-pulse" />
        </div>
      </div>
    );
  }

  const { kmSeries, clientSeries, clientNames, kmTotal, clientTotal } = data;
  const palette = [
    { from: "#ef4444", to: "#7f1d1d" },
    { from: "#ffffff", to: "#a3a3a3" },
    { from: "#f87171", to: "#991b1b" },
    { from: "#e5e5e5", to: "#525252" },
    { from: "#dc2626", to: "#450a0a" },
    { from: "#fca5a5", to: "#b91c1c" },
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
      <div className={`grid ${showClient ? "grid-cols-2" : "grid-cols-1"} gap-2.5 md:gap-3`}>
        <div className="rounded-lg border border-border/70 bg-card">
          <button
            type="button"
            onClick={onKmClick}
            className="relative w-full text-left rounded-lg p-3 md:p-4 bg-card hover:bg-secondary/30 active:scale-[0.99] transition-all"
          >
            <div className="relative flex items-center gap-2 mb-1.5">
              <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/25 flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-red-400" />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-red-400/90 font-semibold truncate">KM Production</p>
            </div>
            {(() => {
              const due = displayKm;
              return (
                <>
                  <p className="relative text-lg md:text-2xl font-bold text-foreground tracking-tight">৳{due.toLocaleString("bn-BD")}</p>
                  <p className="relative text-[9px] text-muted-foreground mt-0.5">বর্তমান ব্যালেন্স</p>
                </>
              );
            })()}
          </button>
        </div>
        {showClient && (
        <div className="rounded-lg border border-border/70 bg-card">
          <button
            type="button"
            onClick={onClientClick}
            className="relative w-full text-left rounded-lg p-3 md:p-4 bg-card hover:bg-secondary/30 active:scale-[0.99] transition-all"
          >
            <div className="relative flex items-center gap-2 mb-1.5">
              <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0">
                <Briefcase className="h-3.5 w-3.5 text-red-400" />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-red-400/90 font-semibold truncate">
                {clientNames.length > 0 ? clientNames.join(", ") : "Client"}
              </p>
            </div>
            {(() => {
              const due = displayClient;
              return (
                <>
                  <p className="relative text-lg md:text-2xl font-bold text-foreground tracking-tight">৳{due.toLocaleString("bn-BD")}</p>
                  <p className="relative text-[9px] text-muted-foreground mt-0.5">বর্তমান ব্যালেন্স</p>
                </>
              );
            })()}
          </button>
        </div>
        )}
      </div>

      <div className={`grid ${showClient ? "md:grid-cols-2" : "md:grid-cols-1"} gap-2.5 md:gap-3`}>
      {/* KM Production */}
      <div className="relative overflow-hidden rounded-lg p-3 md:p-4 border border-border/70 bg-card">
        <div className="relative flex items-center gap-2 mb-2">
          <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/25 flex items-center justify-center">
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

      {showClient && (
      <div className="relative overflow-hidden rounded-lg p-3 md:p-4 border border-border/70 bg-card">
        <div className="relative flex items-center gap-2 mb-2">
          <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/25 flex items-center justify-center">
            <Briefcase className="h-3.5 w-3.5 text-red-400" />
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
      )}
      </div>
    </motion.div>
  );
}
