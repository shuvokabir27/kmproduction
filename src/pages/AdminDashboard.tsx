import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, Film, CreditCard, TrendingUp, Wallet, CalendarIcon, X, List, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { bn } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import MonthlyExpenseChart from "@/components/MonthlyExpenseChart";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const [dueDialogOpen, setDueDialogOpen] = useState(false);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);

  const { data: memberCount } = useQuery({
    queryKey: ["admin-member-count"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: shootingCount } = useQuery({
    queryKey: ["admin-shooting-count"],
    queryFn: async () => {
      const { count } = await supabase.from("shootings").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: totalPayments } = useQuery({
    queryKey: ["admin-total-payments"],
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("amount");
      return data?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
    },
  });

  const { data: totalDue } = useQuery({
    queryKey: ["admin-total-due"],
    queryFn: async () => {
      // Only count active members
      const { data: activeProfiles } = await (supabase as any).from("profiles").select("id, previous_balance, salary_type, salary_type_changed_at").eq("is_active", true);
      const activeIds = activeProfiles?.map((p: any) => p.id) ?? [];
      if (activeIds.length === 0) return { totalEarned: 0, totalPaid: 0, due: 0 };

      const { data: attendance } = await supabase.from("attendance").select("daily_rate, member_id").eq("is_present", true).in("member_id", activeIds);
      const totalEarned = attendance?.reduce((sum, a) => sum + Number(a.daily_rate || 0), 0) ?? 0;
      const { data: payments } = await supabase.from("payments").select("amount, member_id").in("member_id", activeIds);
      const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) ?? 0;
      const { data: bonuses } = await (supabase as any).from("bonuses").select("amount, member_id").in("member_id", activeIds);
      const totalBonuses = bonuses?.reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0) ?? 0;
      const { data: salaryCredits } = await (supabase as any).from("salary_credits").select("amount, member_id, credit_month").in("member_id", activeIds);
      
      // Build exclude map: for members changed from monthly to daily, exclude credits from change month onwards
      const excludeMap: Record<string, string> = {};
      activeProfiles?.forEach((p: any) => {
        if (p.salary_type === "daily" && p.salary_type_changed_at) {
          const d = new Date(p.salary_type_changed_at);
          excludeMap[p.id] = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
        }
      });
      const totalSalaryCredits = salaryCredits?.reduce((sum: number, s: any) => {
        const cutoff = excludeMap[s.member_id];
        if (cutoff && s.credit_month >= cutoff) return sum;
        return sum + Number(s.amount || 0);
      }, 0) ?? 0;

      const totalPreviousBalance = activeProfiles?.reduce((sum: number, p: any) => sum + Number(p.previous_balance || 0), 0) ?? 0;

      // Production members' admin-assigned freelance income (freelance_assignments)
      // NOTE: client_project_artists (client-added artists) intentionally excluded from admin dashboard
      const { data: freelanceAssignments } = await (supabase as any)
        .from("freelance_assignments")
        .select("rate, paid_amount, member_id")
        .in("member_id", activeIds);
      const totalFreelance = freelanceAssignments?.reduce((sum: number, f: any) => sum + Number(f.rate || 0), 0) ?? 0;
      const totalFreelancePaid = freelanceAssignments?.reduce((sum: number, f: any) => sum + Number(f.paid_amount || 0), 0) ?? 0;

      return { totalEarned, totalPaid, due: totalEarned + totalBonuses + totalSalaryCredits + totalPreviousBalance + totalFreelance - totalPaid - totalFreelancePaid };
    },
  });

  const { data: filteredData } = useQuery({
    queryKey: ["admin-filtered-due-all"],
    enabled: dueDialogOpen,
    queryFn: async () => {
      const { data: allMembers } = await (supabase as any).from("profiles").select("id, user_id, full_name, member_id, photo_url, previous_balance, salary_type, salary_type_changed_at").eq("is_active", true);
      const { data: rolesData1 } = await (supabase as any).from("user_roles").select("user_id, role");
      const rolesByUser1 = new Map<string, string[]>();
      (rolesData1 ?? []).forEach((r: any) => { const a = rolesByUser1.get(r.user_id) ?? []; a.push(r.role); rolesByUser1.set(r.user_id, a); });
      const members = (allMembers ?? []).filter((p: any) => {
        const r = rolesByUser1.get(p.user_id) ?? [];
        return r.includes("member") && !r.includes("admin") && !r.includes("client") && !r.includes("product_admin");
      });
      const { data: attendance } = await supabase.from("attendance").select("member_id, daily_rate").eq("is_present", true);
      const { data: payments } = await supabase.from("payments").select("member_id, amount");
      const { data: bonuses } = await (supabase as any).from("bonuses").select("member_id, amount");
      const { data: salaryCredits } = await (supabase as any).from("salary_credits").select("member_id, amount, credit_month");

      // Production members' admin-assigned freelance (all-time)
      const { data: freelanceRows } = await (supabase as any).from("freelance_assignments").select("member_id, rate, paid_amount");

      // Build exclude map
      const excludeMap: Record<string, string> = {};
      members?.forEach((m: any) => {
        if (m.salary_type === "daily" && m.salary_type_changed_at) {
          const d = new Date(m.salary_type_changed_at);
          excludeMap[m.id] = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
        }
      });

      const memberMap = new Map<string, { name: string; memberId: number; photo: string | null; earned: number; paid: number; bonus: number; salary: number; freelance: number; freelancePaid: number; previous: number }>();
      members?.forEach((m: any) => memberMap.set(m.id, { name: m.full_name, memberId: m.member_id, photo: m.photo_url, earned: 0, paid: 0, bonus: 0, salary: 0, freelance: 0, freelancePaid: 0, previous: Number(m.previous_balance || 0) }));
      attendance?.forEach((a: any) => { const entry = memberMap.get(a.member_id); if (entry) entry.earned += Number(a.daily_rate || 0); });
      payments?.forEach((p: any) => { const entry = memberMap.get(p.member_id); if (entry) entry.paid += Number(p.amount || 0); });
      bonuses?.forEach((b: any) => { const entry = memberMap.get(b.member_id); if (entry) entry.bonus += Number(b.amount || 0); });
      salaryCredits?.forEach((s: any) => {
        const cutoff = excludeMap[s.member_id];
        if (cutoff && s.credit_month >= cutoff) return;
        const entry = memberMap.get(s.member_id); if (entry) entry.salary += Number(s.amount || 0);
      });
      freelanceRows?.forEach((f: any) => {
        const entry = memberMap.get(f.member_id);
        if (entry) { entry.freelance += Number(f.rate || 0); entry.freelancePaid += Number(f.paid_amount || 0); }
      });
      const list = Array.from(memberMap.values())
        .map(m => ({ ...m, due: m.earned + m.bonus + m.salary + m.freelance + m.previous - m.paid - m.freelancePaid }))
        .filter(m => m.due > 0)
        .sort((a, b) => b.due - a.due);
      const totalEarned = list.reduce((s, m) => s + m.earned, 0);
      const totalPaid = list.reduce((s, m) => s + m.paid, 0);
      const totalBonus = list.reduce((s, m) => s + m.bonus, 0);
      const totalSalary = list.reduce((s, m) => s + m.salary, 0);
      const totalFreelance = list.reduce((s, m) => s + m.freelance, 0);
      const totalFreelancePaid = list.reduce((s, m) => s + m.freelancePaid, 0);
      const totalPrevious = list.reduce((s, m) => s + m.previous, 0);
      return { list, totalEarned, totalPaid, totalDue: totalEarned + totalBonus + totalSalary + totalFreelance + totalPrevious - totalPaid - totalFreelancePaid };
    },
  });

  const { data: memberBalances } = useQuery({
    queryKey: ["admin-member-balances"],
    queryFn: async () => {
      const { data: allMembers2 } = await (supabase as any).from("profiles").select("id, user_id, full_name, member_id, photo_url, designation, previous_balance, salary_type, salary_type_changed_at").eq("is_active", true);
      const { data: rolesData2 } = await (supabase as any).from("user_roles").select("user_id, role");
      const rolesByUser2 = new Map<string, string[]>();
      (rolesData2 ?? []).forEach((r: any) => { const a = rolesByUser2.get(r.user_id) ?? []; a.push(r.role); rolesByUser2.set(r.user_id, a); });
      const members = (allMembers2 ?? []).filter((p: any) => {
        const r = rolesByUser2.get(p.user_id) ?? [];
        return r.includes("member") && !r.includes("admin") && !r.includes("client") && !r.includes("product_admin");
      });
      const { data: attendance } = await supabase.from("attendance").select("member_id, daily_rate").eq("is_present", true);
      const { data: payments } = await supabase.from("payments").select("member_id, amount");
      const { data: bonuses } = await (supabase as any).from("bonuses").select("member_id, amount");
      const { data: salaryCredits } = await (supabase as any).from("salary_credits").select("member_id, amount, credit_month");
      // Production members' admin-assigned freelance income (client_project_artists excluded)
      const { data: freelanceRows } = await (supabase as any).from("freelance_assignments").select("member_id, rate, paid_amount");

      // Build exclude map for members changed from monthly to daily
      const excludeMap: Record<string, string> = {};
      members?.forEach((m: any) => {
        if (m.salary_type === "daily" && m.salary_type_changed_at) {
          const d = new Date(m.salary_type_changed_at);
          excludeMap[m.id] = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
        }
      });

      const map = new Map<string, { name: string; memberId: number; photo: string | null; designation: string | null; earned: number; paid: number; bonus: number; salary: number; freelance: number; freelancePaid: number; previous: number }>();
      members?.forEach((m: any) => map.set(m.id, { name: m.full_name, memberId: m.member_id, photo: m.photo_url, designation: m.designation, earned: 0, paid: 0, bonus: 0, salary: 0, freelance: 0, freelancePaid: 0, previous: Number(m.previous_balance || 0) }));
      attendance?.forEach((a: any) => { const e = map.get(a.member_id); if (e) e.earned += Number(a.daily_rate || 0); });
      payments?.forEach((p: any) => { const e = map.get(p.member_id); if (e) e.paid += Number(p.amount || 0); });
      bonuses?.forEach((b: any) => { const e = map.get(b.member_id); if (e) e.bonus += Number(b.amount || 0); });
      salaryCredits?.forEach((s: any) => {
        const cutoff = excludeMap[s.member_id];
        if (cutoff && s.credit_month >= cutoff) return;
        const e = map.get(s.member_id); if (e) e.salary += Number(s.amount || 0);
      });
      freelanceRows?.forEach((f: any) => {
        const e = map.get(f.member_id);
        if (e) { e.freelance += Number(f.rate || 0); e.freelancePaid += Number(f.paid_amount || 0); }
      });
      return Array.from(map.values()).map(m => ({ ...m, balance: m.earned + m.bonus + m.salary + m.freelance + m.previous - m.paid - m.freelancePaid })).sort((a, b) => b.balance - a.balance);
    },
  });

  const { data: recentPayments } = useQuery({
    queryKey: ["admin-recent-payments"],
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("*, profiles(full_name, member_id, photo_url)").order("payment_date", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const stats = [
    { label: "মোট সদস্য", value: memberCount ?? 0, icon: Users, gradient: "from-violet-500/20 to-violet-500/5", iconColor: "text-violet-400", iconBg: "bg-violet-500/10", onClick: () => navigate("/admin/members") },
    { label: "মোট শুটিং", value: shootingCount ?? 0, icon: Film, gradient: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-400", iconBg: "bg-emerald-500/10", onClick: () => navigate("/admin/shootings") },
    { label: "মোট পেমেন্ট", value: `৳${(totalPayments ?? 0).toLocaleString("bn-BD")}`, icon: CreditCard, gradient: "from-amber-500/20 to-amber-500/5", iconColor: "text-amber-400", iconBg: "bg-amber-500/10", onClick: () => navigate("/admin/payments") },
    { label: "মোট বকেয়া", value: `৳${(totalDue?.due ?? 0).toLocaleString("bn-BD")}`, icon: Wallet, gradient: "from-rose-500/20 to-rose-500/5", iconColor: "text-rose-400", iconBg: "bg-rose-500/10", onClick: () => setDueDialogOpen(true) },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">এডমিন ড্যাশবোর্ড</h1>
            <p className="text-muted-foreground text-xs md:text-sm mt-1">সকল কার্যক্রমের সারসংক্ষেপ</p>
          </div>
          <div className="h-1 w-12 bg-gradient-to-r from-violet-500 to-rose-500 rounded-full mb-1 hidden md:block" />
        </motion.div>

        {/* Stats Grid - Compact Glossy */}
        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3" variants={container} initial="hidden" animate="show">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              variants={item}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 20 }}
            >
              <div
                onClick={stat.onClick}
                className={`relative cursor-pointer rounded-2xl p-3 md:p-3.5 overflow-hidden group
                  bg-gradient-to-br ${stat.gradient}
                  border border-white/10 backdrop-blur-xl
                  shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.08)]
                  hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.15)]
                  transition-shadow duration-300`}
              >
                {/* Glossy top highlight */}
                <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                {/* Diagonal shine */}
                <div className="absolute -inset-x-4 -top-4 h-16 bg-gradient-to-r from-transparent via-white/15 to-transparent rotate-12 blur-sm pointer-events-none opacity-60" />
                {/* Shimmer sweep on hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                {/* Corner glow */}
                <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-white/5 blur-2xl pointer-events-none" />

                <div className="relative z-10 flex items-center gap-2.5">
                  <motion.div
                    whileHover={{ rotate: [0, -8, 8, 0], scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                    className={`h-9 w-9 md:h-10 md:w-10 shrink-0 rounded-xl ${stat.iconBg} flex items-center justify-center
                      shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_2px_8px_-2px_rgba(0,0,0,0.3)]
                      border border-white/10`}
                  >
                    <stat.icon className={`h-4 w-4 md:h-[18px] md:w-[18px] ${stat.iconColor} drop-shadow`} />
                  </motion.div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wider truncate font-medium">{stat.label}</p>
                    <motion.p
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + idx * 0.05, type: "spring", stiffness: 200 }}
                      className="text-base md:text-lg font-bold text-foreground truncate leading-tight"
                    >
                      {stat.value}
                    </motion.p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Monthly Expense Chart */}
        <MonthlyExpenseChart />

        {/* Balance button */}
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/5 text-xs md:text-sm w-full md:w-auto"
          onClick={() => setBalanceDialogOpen(true)}
        >
          <List className="h-4 w-4 text-cyan-400" /> সদস্য ব্যালেন্স তালিকা
        </Button>

        {/* Recent Payments */}
        <div className="premium-card rounded-2xl overflow-hidden">
          <div className="p-4 md:p-5 border-b border-border/20 flex items-center justify-between">
            <h2 className="font-semibold text-foreground text-sm md:text-base flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-amber-400" />
              </div>
              সাম্প্রতিক পেমেন্ট
            </h2>
          </div>
          <div className="divide-y divide-border/10">
            {recentPayments?.map((p: any) => (
              <div key={p.id} className="px-4 md:px-5 py-3.5 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-border/30 flex items-center justify-center overflow-hidden shrink-0">
                    {p.profiles?.photo_url ? (
                      <img src={p.profiles.photo_url} alt={p.profiles?.full_name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-primary text-xs font-bold">{p.profiles?.full_name?.charAt(0) || "M"}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.profiles?.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">ID: {p.profiles?.member_id}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-sm font-bold text-foreground">৳{Number(p.amount).toLocaleString("bn-BD")}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(p.payment_date).toLocaleDateString("bn-BD")}</p>
                </div>
              </div>
            ))}
            {recentPayments?.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">কোনো পেমেন্ট নেই</div>
            )}
          </div>
        </div>
      </div>

      {/* Due Detail Dialog */}
      <Dialog open={dueDialogOpen} onOpenChange={setDueDialogOpen}>
        <DialogContent className="bg-card border-border/30 max-w-2xl max-h-[85vh] overflow-y-auto mx-2">
          <DialogHeader>
            <DialogTitle className="text-foreground text-base flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" /> বকেয়া বিস্তারিত
            </DialogTitle>
          </DialogHeader>

          {filteredData && (
            <div className="space-y-4 py-2">
              {/* Total Due - Hero */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-destructive/15 to-destructive/5 border border-destructive/30 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">সর্বমোট বকেয়া</p>
                <p className="text-2xl md:text-3xl font-bold text-destructive">৳{filteredData.totalDue.toLocaleString("bn-BD")}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{filteredData.list.length} জন সদস্যের কাছে পাওনা</p>
              </div>

              {/* Category Breakdown */}
              <div className="rounded-2xl border border-border/30 overflow-hidden">
                <div className="px-4 py-2.5 bg-secondary/40 border-b border-border/20">
                  <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Wallet className="h-3.5 w-3.5 text-primary" /> খাত অনুযায়ী হিসাব
                  </h3>
                </div>
                <div className="divide-y divide-border/15">
                  {[
                    { label: "শুটিং থেকে আয়", value: filteredData.totalEarned, color: "text-emerald-400", sign: "+" },
                    { label: "বোনাস ও যাতায়াত", value: (filteredData as any).totalBonus ?? 0, color: "text-amber-400", sign: "+" },
                    { label: "মাসিক বেতন", value: (filteredData as any).totalSalary ?? 0, color: "text-violet-400", sign: "+" },
                    { label: "বাইরের কাজ থেকে আয়", value: (filteredData as any).totalFreelance ?? 0, color: "text-cyan-400", sign: "+" },
                    { label: "পূর্ববর্তী বকেয়া", value: (filteredData as any).totalPrevious ?? 0, color: "text-orange-400", sign: "+" },
                    { label: "প্রদানকৃত পেমেন্ট", value: filteredData.totalPaid, color: "text-rose-400", sign: "−" },
                    { label: "বাইরের কাজের পেমেন্ট", value: (filteredData as any).totalFreelancePaid ?? 0, color: "text-rose-400", sign: "−" },
                  ].filter(r => r.value > 0).map((row, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                      <span className="text-xs md:text-sm text-foreground">{row.label}</span>
                      <span className={`text-xs md:text-sm font-semibold ${row.color}`}>
                        {row.sign} ৳{row.value.toLocaleString("bn-BD")}
                      </span>
                    </div>
                  ))}
                  <div className="px-4 py-3 bg-destructive/5 flex items-center justify-between">
                    <span className="text-xs md:text-sm font-bold text-foreground">মোট বকেয়া</span>
                    <span className="text-sm md:text-base font-bold text-destructive">৳{filteredData.totalDue.toLocaleString("bn-BD")}</span>
                  </div>
                </div>
              </div>

              {/* Per-Member Due List */}
              <div className="rounded-2xl border border-border/30 overflow-hidden">
                <div className="px-4 py-2.5 bg-secondary/40 border-b border-border/20 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-cyan-400" /> কার কাছে কত বকেয়া
                  </h3>
                  <span className="text-[10px] text-muted-foreground">{filteredData.list.length} জন</span>
                </div>
                <div className="divide-y divide-border/15 max-h-[40vh] overflow-y-auto">
                  {filteredData.list.length === 0 && (
                    <div className="p-6 text-center text-xs text-muted-foreground">কোনো বকেয়া নেই</div>
                  )}
                  {filteredData.list.map((m, i) => (
                    <div key={i} className="px-4 py-3 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-9 w-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center overflow-hidden shrink-0">
                          {m.photo ? (
                            <img src={m.photo} alt={m.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-primary text-xs font-bold">{m.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                          <p className="text-[10px] text-muted-foreground">ID: {m.memberId}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-destructive ml-2 shrink-0">
                        ৳{m.due.toLocaleString("bn-BD")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Member Balance Dialog */}
      <Dialog open={balanceDialogOpen} onOpenChange={setBalanceDialogOpen}>
        <DialogContent className="bg-card border-border/30 max-w-lg max-h-[85vh] overflow-y-auto mx-2">
          <DialogHeader>
            <DialogTitle className="text-foreground text-base flex items-center gap-2">
              <List className="h-5 w-5 text-primary" /> সদস্য ব্যালেন্স
            </DialogTitle>
          </DialogHeader>
          <div className="divide-y divide-border/15">
            {memberBalances?.map((m, i) => (
              <div key={i} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center overflow-hidden text-xs font-bold text-muted-foreground">
                      {m.photo ? <img src={m.photo} alt={m.name} className="h-full w-full object-cover" /> : m.name.charAt(0)}
                    </div>
                    <span className="absolute -top-1 -left-1 text-[8px] font-bold bg-primary text-primary-foreground rounded-full h-4 w-4 flex items-center justify-center">{i + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground">{m.designation || "সদস্য"}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${m.balance > 0 ? "text-warning" : "text-success"}`}>
                    {m.balance > 0 ? "বকেয়া" : m.balance < 0 ? "অগ্রিম" : "ব্যালেন্স"}{" "}
                    ৳{Math.abs(m.balance).toLocaleString("bn-BD")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default AdminDashboard;
