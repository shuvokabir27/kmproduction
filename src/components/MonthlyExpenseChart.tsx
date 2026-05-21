import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useMemo } from "react";

const MONTHS_BN = ["জানু", "ফেব", "মার্চ", "এপ্রি", "মে", "জুন", "জুলা", "আগ", "সেপ্ট", "অক্টো", "নভে", "ডিসে"];

export default function MonthlyExpenseChart() {
  const { data: expenses = [] } = useQuery({
    queryKey: ["admin-monthly-expenses-12m"],
    queryFn: async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - 11);
      since.setDate(1);
      const { data } = await supabase
        .from("shooting_expenses")
        .select("amount, expense_date")
        .gte("expense_date", since.toISOString().slice(0, 10));
      return data ?? [];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["admin-monthly-payments-12m"],
    queryFn: async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - 11);
      since.setDate(1);
      const { data } = await supabase
        .from("payments")
        .select("amount, payment_date")
        .gte("payment_date", since.toISOString().slice(0, 10));
      return data ?? [];
    },
  });

  const chartData = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; expense: number; payment: number; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: MONTHS_BN[d.getMonth()],
        expense: 0,
        payment: 0,
        total: 0,
      });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));

    (expenses as any[]).forEach((e) => {
      const d = new Date(e.expense_date);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      const i = idx.get(k);
      if (i !== undefined) buckets[i].expense += Number(e.amount || 0);
    });
    (payments as any[]).forEach((p) => {
      const d = new Date(p.payment_date);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      const i = idx.get(k);
      if (i !== undefined) buckets[i].payment += Number(p.amount || 0);
    });
    buckets.forEach((b) => (b.total = b.expense + b.payment));
    return buckets;
  }, [expenses, payments]);

  const totalThisMonth = chartData[chartData.length - 1]?.total ?? 0;
  const totalLastMonth = chartData[chartData.length - 2]?.total ?? 0;
  const diff = totalThisMonth - totalLastMonth;
  const pct = totalLastMonth > 0 ? Math.round((diff / totalLastMonth) * 100) : 0;
  const grandTotal = chartData.reduce((s, b) => s + b.total, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, type: "spring", stiffness: 120, damping: 18 }}
      className="relative rounded-2xl overflow-hidden border border-white/10 backdrop-blur-xl
        bg-gradient-to-br from-violet-500/10 via-card/80 to-rose-500/10
        shadow-[0_8px_30px_-6px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.1)]"
    >
      {/* Glossy top sheen */}
      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
      {/* Diagonal shine */}
      <div className="absolute -inset-x-8 -top-8 h-24 bg-gradient-to-r from-transparent via-white/10 to-transparent rotate-6 blur-md pointer-events-none opacity-70" />
      {/* Corner glows */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-violet-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />

      <div className="relative z-10 p-4 md:p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500/30 to-rose-500/30 border border-white/10 flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]">
                <TrendingUp className="h-4 w-4 text-violet-300" />
              </div>
              <h3 className="text-sm md:text-base font-bold text-foreground">মাসিক খরচ গ্রাফ</h3>
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1 ml-10">গত ১২ মাসের সারসংক্ষেপ</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider">১২ মাসে মোট</p>
            <motion.p
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
              className="text-base md:text-lg font-bold bg-gradient-to-r from-violet-300 to-rose-300 bg-clip-text text-transparent"
            >
              ৳{grandTotal.toLocaleString("bn-BD")}
            </motion.p>
            <div className={`text-[9px] md:text-[10px] mt-0.5 inline-flex items-center gap-1 ${diff >= 0 ? "text-rose-400" : "text-red-400"}`}>
              {diff >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
              {Math.abs(pct)}% {diff >= 0 ? "বৃদ্ধি" : "হ্রাস"}
            </div>
          </div>
        </div>

        {/* Chart */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="h-44 md:h-56 -ml-2"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="expGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(280 90% 65%)" stopOpacity={0.6} />
                  <stop offset="50%" stopColor="hsl(330 85% 60%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(330 85% 60%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(280 90% 70%)" />
                  <stop offset="100%" stopColor="hsl(340 90% 65%)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border))" strokeOpacity={0.25} vertical={false} />
              <XAxis
                dataKey="label"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={42}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
              />
              <Tooltip
                cursor={{ stroke: "hsl(280 90% 65%)", strokeWidth: 1, strokeDasharray: "4 4" }}
                contentStyle={{
                  background: "hsl(var(--background) / 0.95)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                  boxShadow: "0 8px 24px -8px rgba(0,0,0,0.5)",
                  backdropFilter: "blur(8px)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                formatter={(value: number) => [`৳${value.toLocaleString("bn-BD")}`, "খরচ"]}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="url(#expStroke)"
                strokeWidth={2.5}
                fill="url(#expGradient)"
                animationDuration={1400}
                animationEasing="ease-out"
                dot={{ r: 3, fill: "hsl(280 90% 70%)", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: "hsl(330 90% 65%)", stroke: "hsl(var(--background))", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </motion.div>
  );
}
