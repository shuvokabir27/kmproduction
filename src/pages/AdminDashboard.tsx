import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, Film, CreditCard, TrendingUp, Wallet, CalendarIcon, X } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { List } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { bn } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const AdminDashboard = () => {
  const { user, isAdmin, loading } = useAuth();
  const [dueDialogOpen, setDueDialogOpen] = useState(false);
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [filterFrom, setFilterFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [filterTo, setFilterTo] = useState<Date | undefined>(new Date());

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

  // Total due = total earned (attendance) - total paid (payments)
  const { data: totalDue } = useQuery({
    queryKey: ["admin-total-due"],
    queryFn: async () => {
      const { data: attendance } = await supabase.from("attendance").select("daily_rate").eq("is_present", true);
      const totalEarned = attendance?.reduce((sum, a) => sum + Number(a.daily_rate || 0), 0) ?? 0;

      const { data: payments } = await supabase.from("payments").select("amount");
      const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) ?? 0;

      return { totalEarned, totalPaid, due: totalEarned - totalPaid };
    },
  });

  // Filtered data for dialog
  const { data: filteredData } = useQuery({
    queryKey: ["admin-filtered-due", filterFrom?.toISOString(), filterTo?.toISOString()],
    enabled: dueDialogOpen,
    queryFn: async () => {
      const from = filterFrom ? startOfDay(filterFrom).toISOString() : undefined;
      const to = filterTo ? endOfDay(filterTo).toISOString() : undefined;

      // Get all members
      const { data: members } = await supabase.from("profiles").select("id, full_name, member_id").eq("is_active", true);

      // Get attendance in range
      let attQ = supabase.from("attendance").select("member_id, daily_rate, shooting_id, shootings(shoot_date)").eq("is_present", true);
      if (from) attQ = attQ.gte("created_at", from);
      if (to) attQ = attQ.lte("created_at", to);
      const { data: attendance } = await attQ;

      // Get payments in range
      let payQ = supabase.from("payments").select("member_id, amount, payment_date");
      if (from) payQ = payQ.gte("payment_date", from);
      if (to) payQ = payQ.lte("payment_date", to);
      const { data: payments } = await payQ;

      // Aggregate per member
      const memberMap = new Map<string, { name: string; memberId: number; earned: number; paid: number }>();
      members?.forEach(m => {
        memberMap.set(m.id, { name: m.full_name, memberId: m.member_id, earned: 0, paid: 0 });
      });

      attendance?.forEach((a: any) => {
        const entry = memberMap.get(a.member_id);
        if (entry) entry.earned += Number(a.daily_rate || 0);
      });

      payments?.forEach((p: any) => {
        const entry = memberMap.get(p.member_id);
        if (entry) entry.paid += Number(p.amount || 0);
      });

      const list = Array.from(memberMap.values())
        .map(m => ({ ...m, due: m.earned - m.paid }))
        .filter(m => m.earned > 0 || m.paid > 0)
        .sort((a, b) => b.due - a.due);

      const totalEarned = list.reduce((s, m) => s + m.earned, 0);
      const totalPaid = list.reduce((s, m) => s + m.paid, 0);

      return { list, totalEarned, totalPaid, totalDue: totalEarned - totalPaid };
    },
  });

  // Member balance list sorted by balance desc
  const { data: memberBalances } = useQuery({
    queryKey: ["admin-member-balances"],
    queryFn: async () => {
      const { data: members } = await supabase.from("profiles").select("id, full_name, member_id, photo_url, designation").eq("is_active", true);
      const { data: attendance } = await supabase.from("attendance").select("member_id, daily_rate").eq("is_present", true);
      const { data: payments } = await supabase.from("payments").select("member_id, amount");

      const map = new Map<string, { name: string; memberId: number; photo: string | null; designation: string | null; earned: number; paid: number }>();
      members?.forEach(m => map.set(m.id, { name: m.full_name, memberId: m.member_id, photo: m.photo_url, designation: m.designation, earned: 0, paid: 0 }));
      attendance?.forEach((a: any) => { const e = map.get(a.member_id); if (e) e.earned += Number(a.daily_rate || 0); });
      payments?.forEach((p: any) => { const e = map.get(p.member_id); if (e) e.paid += Number(p.amount || 0); });

      return Array.from(map.values())
        .map(m => ({ ...m, balance: m.earned - m.paid }))
        .sort((a, b) => b.balance - a.balance);
    },
  });

  const { data: recentPayments } = useQuery({
    queryKey: ["admin-recent-payments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("*, profiles(full_name, member_id)")
        .order("payment_date", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const stats = [
    { label: "মোট সদস্য", value: memberCount ?? 0, icon: Users, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "মোট শুটিং", value: shootingCount ?? 0, icon: Film, color: "text-success", bgColor: "bg-success/10" },
    { label: "মোট পেমেন্ট", value: `৳${(totalPayments ?? 0).toLocaleString("bn-BD")}`, icon: CreditCard, color: "text-warning", bgColor: "bg-warning/10" },
    {
      label: "মোট বকেয়া (ডিউ)",
      value: `৳${(totalDue?.due ?? 0).toLocaleString("bn-BD")}`,
      icon: Wallet,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      clickable: true,
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">এডমিন ড্যাশবোর্ড</h1>
          <p className="text-muted-foreground text-sm">সকল কার্যক্রমের সারসংক্ষেপ</p>
        </div>

        <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" variants={container} initial="hidden" animate="show">
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={item}>
              <Card
                className={cn(
                  "p-5 bg-card border-border/50 transition-all",
                  stat.clickable && "cursor-pointer hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                )}
                onClick={stat.clickable ? () => setDueDialogOpen(true) : undefined}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                </div>
                {stat.clickable && <p className="text-[10px] text-muted-foreground mt-2">ক্লিক করে বিস্তারিত দেখুন →</p>}
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Member Balance Button */}
        <Button
          variant="outline"
          className="gap-2 border-border/50"
          onClick={() => setBalanceDialogOpen(true)}
        >
          <List className="h-4 w-4" /> সদস্য ব্যালেন্স তালিকা দেখুন
        </Button>

        {/* Recent Payments */}
        <Card className="bg-card border-border/50">
          <div className="p-4 border-b border-border/30">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> সাম্প্রতিক পেমেন্ট
            </h2>
          </div>
          <div className="divide-y divide-border/30">
            {recentPayments?.map((p: any) => (
              <div key={p.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.profiles?.full_name}</p>
                  <p className="text-xs text-muted-foreground">ID: {p.profiles?.member_id}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">৳{Number(p.amount).toLocaleString("bn-BD")}</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.payment_date).toLocaleDateString("bn-BD")}</p>
                </div>
              </div>
            ))}
            {recentPayments?.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground text-center">কোনো পেমেন্ট নেই</div>
            )}
          </div>
        </Card>
      </div>

      {/* Due Detail Dialog */}
      <Dialog open={dueDialogOpen} onOpenChange={setDueDialogOpen}>
        <DialogContent className="bg-card border-border/50 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" /> বকেয়া বিস্তারিত
            </DialogTitle>
          </DialogHeader>

          {/* Date Filters */}
          <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-border/30">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">থেকে:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-border/50">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {filterFrom ? format(filterFrom, "dd MMM yyyy") : "তারিখ"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={filterFrom} onSelect={setFilterFrom} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">পর্যন্ত:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-border/50">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {filterTo ? format(filterTo, "dd MMM yyyy") : "তারিখ"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={filterTo} onSelect={setFilterTo} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => { setFilterFrom(startOfMonth(new Date())); setFilterTo(new Date()); }}
            >
              এই মাস
            </Button>
          </div>

          {/* Summary */}
          {filteredData && (
            <div className="grid grid-cols-3 gap-3 py-3">
              <div className="p-3 rounded-xl bg-success/10 border border-success/20 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">মোট আয়</p>
                <p className="text-lg font-bold text-success">৳{filteredData.totalEarned.toLocaleString("bn-BD")}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">মোট প্রদান</p>
                <p className="text-lg font-bold text-primary">৳{filteredData.totalPaid.toLocaleString("bn-BD")}</p>
              </div>
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">মোট বকেয়া</p>
                <p className="text-lg font-bold text-destructive">৳{filteredData.totalDue.toLocaleString("bn-BD")}</p>
              </div>
            </div>
          )}

          {/* Member-wise breakdown */}
          <div className="border border-border/30 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-secondary/30">
                  <th className="text-left p-3 text-muted-foreground font-medium text-xs">সদস্য</th>
                  <th className="text-right p-3 text-muted-foreground font-medium text-xs">আয়</th>
                  <th className="text-right p-3 text-muted-foreground font-medium text-xs">প্রদান</th>
                  <th className="text-right p-3 text-muted-foreground font-medium text-xs">বকেয়া</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filteredData?.list.map((m, i) => (
                  <tr key={i} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-3">
                      <p className="text-foreground font-medium text-sm">{m.name}</p>
                    </td>
                    <td className="p-3 text-right text-success text-sm">৳{m.earned.toLocaleString("bn-BD")}</td>
                    <td className="p-3 text-right text-primary text-sm">৳{m.paid.toLocaleString("bn-BD")}</td>
                    <td className="p-3 text-right font-semibold text-sm">
                      <span className={m.due > 0 ? "text-destructive" : "text-success"}>
                        ৳{m.due.toLocaleString("bn-BD")}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredData?.list.length === 0 && (
                  <tr><td colSpan={4} className="p-4 text-center text-muted-foreground text-sm">এই সময়ে কোনো তথ্য নেই</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default AdminDashboard;
