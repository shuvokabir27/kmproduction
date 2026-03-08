import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useMemberBalance } from "@/hooks/useMemberBalance";
import { Wallet, Calendar, CreditCard, TrendingUp, Film, ExternalLink, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { ScriptEditor } from "@/components/ScriptEditor";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const MemberDashboard = () => {
  const { user, profile, loading, isAdmin } = useAuth();

  const { data: balance } = useMemberBalance(profile?.id);

  const { data: recentPayments } = useQuery({
    queryKey: ["my-payments", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("member_id", profile!.id)
        .order("payment_date", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const { data: recentAttendance } = useQuery({
    queryKey: ["my-attendance", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("*, shootings(name, shoot_date)")
        .eq("member_id", profile!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const { data: shootings } = useQuery({
    queryKey: ["member-shootings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shootings")
        .select("*")
        .order("shoot_date", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;

  const paymentMethodLabel: Record<string, string> = {
    bank: "ব্যাংক",
    bkash: "বিকাশ",
    nagad: "নগদ",
    cash: "ক্যাশ",
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">স্বাগতম, {profile?.full_name}</h1>
          <p className="text-muted-foreground text-sm">আইডি: {profile?.member_id}</p>
        </div>

        {/* Balance Cards */}
        <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-4" variants={container} initial="hidden" animate="show">
          <motion.div variants={item}>
            <Card className="p-5 bg-card border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">মোট আয়</p>
                  <p className="text-2xl font-bold text-foreground">৳{balance?.totalEarned?.toLocaleString("bn-BD") || "০"}</p>
                </div>
              </div>
            </Card>
          </motion.div>
          <motion.div variants={item}>
            <Card className="p-5 bg-card border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">মোট প্রদান</p>
                  <p className="text-2xl font-bold text-foreground">৳{balance?.totalPaid?.toLocaleString("bn-BD") || "০"}</p>
                </div>
              </div>
            </Card>
          </motion.div>
          <motion.div variants={item}>
            <Card className="p-5 bg-card border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">বকেয়া ব্যালেন্স</p>
                  <p className="text-2xl font-bold text-foreground">৳{balance?.balance?.toLocaleString("bn-BD") || "০"}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>

        {/* Shootings */}
        <Card className="bg-card border-border/50">
          <div className="p-4 border-b border-border/30">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Film className="h-4 w-4 text-primary" /> শুটিং তালিকা
            </h2>
          </div>
          <div className="divide-y divide-border/30 max-h-80 overflow-auto">
            {shootings?.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground text-center">কোনো শুটিং নেই</div>
            )}
            {shootings?.map((s: any) => {
              const statusMap: Record<string, { label: string; color: string }> = {
                plan: { label: "প্লান", color: "bg-muted/50 text-muted-foreground" },
                upcoming: { label: "আসন্ন", color: "bg-warning/10 text-warning" },
                ongoing: { label: "চলছে", color: "bg-primary/10 text-primary" },
                completed: { label: "শুটিং শেষ", color: "bg-success/10 text-success" },
                editing: { label: "এডিটিং চলছে", color: "bg-accent/50 text-accent-foreground" },
                editing_done: { label: "এডিটিং শেষ", color: "bg-success/15 text-success" },
                published: { label: "পাবলিশ হয়েছে", color: "bg-success/10 text-success" },
              };
              const info = statusMap[s.status] || statusMap.upcoming;
              return (
                <div key={s.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.shoot_date).toLocaleDateString("bn-BD")}
                      {s.location && ` • ${s.location}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.script_content && (
                      <button onClick={() => { setViewShooting(s); setViewScriptOpen(true); }} className="text-primary hover:text-primary/80">
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {s.script_url && (
                      <a href={s.script_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment History */}
          <Card className="bg-card border-border/50">
            <div className="p-4 border-b border-border/30">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" /> পেমেন্ট হিস্ট্রি
              </h2>
            </div>
            <div className="divide-y divide-border/30 max-h-80 overflow-auto">
              {recentPayments?.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground text-center">কোনো পেমেন্ট নেই</div>
              )}
              {recentPayments?.map((p) => (
                <div key={p.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground">৳{Number(p.amount).toLocaleString("bn-BD")}</p>
                    <p className="text-xs text-muted-foreground">
                      {paymentMethodLabel[p.payment_method] || p.payment_method} • {new Date(p.payment_date).toLocaleDateString("bn-BD")}
                    </p>
                  </div>
                  {p.transaction_id && (
                    <span className="text-xs text-muted-foreground">#{p.transaction_id}</span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Attendance History */}
          <Card className="bg-card border-border/50">
            <div className="p-4 border-b border-border/30">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> হাজিরা হিস্ট্রি
              </h2>
            </div>
            <div className="divide-y divide-border/30 max-h-80 overflow-auto">
              {recentAttendance?.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground text-center">কোনো হাজিরা নেই</div>
              )}
              {recentAttendance?.map((a: any) => (
                <div key={a.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground">{a.shootings?.name || "শুটিং"}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.shootings?.shoot_date ? new Date(a.shootings.shoot_date).toLocaleDateString("bn-BD") : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_present ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      {a.is_present ? "উপস্থিত" : "অনুপস্থিত"}
                    </span>
                    {a.daily_rate > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">৳{Number(a.daily_rate).toLocaleString("bn-BD")}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default MemberDashboard;
