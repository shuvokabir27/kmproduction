import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, Film, CreditCard, Calendar, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const AdminDashboard = () => {
  const { user, isAdmin, loading } = useAuth();

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
    { label: "মোট সদস্য", value: memberCount ?? 0, icon: Users, color: "text-primary" },
    { label: "মোট শুটিং", value: shootingCount ?? 0, icon: Film, color: "text-success" },
    { label: "মোট পেমেন্ট", value: `৳${(totalPayments ?? 0).toLocaleString()}`, icon: CreditCard, color: "text-warning" },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">এডমিন ড্যাশবোর্ড</h1>
          <p className="text-muted-foreground text-sm">সকল কার্যক্রমের সারসংক্ষেপ</p>
        </div>

        <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-4" variants={container} initial="hidden" animate="show">
          {stats.map((stat) => (
            <motion.div key={stat.label} variants={item}>
              <Card className="p-5 bg-card border-border/50">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg bg-secondary flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

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
                  <p className="text-sm font-medium text-foreground">৳{Number(p.amount).toLocaleString()}</p>
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
    </AppLayout>
  );
};

export default AdminDashboard;
