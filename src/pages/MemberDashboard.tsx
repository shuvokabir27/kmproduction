import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useMemberBalance } from "@/hooks/useMemberBalance";
import { Wallet, Calendar, CreditCard, TrendingUp, Film, ExternalLink, FileText, ScrollText, Eye, Gift, Car, Banknote, Globe, Briefcase, CheckCircle2, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import { ScriptEditor } from "@/components/ScriptEditor";
import { NoticeBoard } from "@/components/NoticeBoard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const MemberDashboard = () => {
  const { user, profile, loading, isAdmin, isClient } = useAuth();
  const [viewScriptOpen, setViewScriptOpen] = useState(false);
  const [viewShooting, setViewShooting] = useState<any>(null);
  const [paymentDetailOpen, setPaymentDetailOpen] = useState(false);
  const [freelanceDetailOpen, setFreelanceDetailOpen] = useState(false);
  const [balanceDetailOpen, setBalanceDetailOpen] = useState(false);

  const { data: balance } = useMemberBalance(profile?.id);

  const { data: recentPayments } = useQuery({
    queryKey: ["my-payments", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("*").eq("member_id", profile!.id).order("payment_date", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const { data: recentAttendance } = useQuery({
    queryKey: ["my-attendance", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("attendance").select("*, shootings(name, shoot_date)").eq("member_id", profile!.id).order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const { data: shootings } = useQuery({
    queryKey: ["member-shootings"],
    queryFn: async () => {
      const { data } = await supabase.from("shootings").select("*").order("shoot_date", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const { data: permittedScripts } = useQuery({
    queryKey: ["my-scripts", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("scripts").select("*").order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: myBonuses } = useQuery({
    queryKey: ["my-bonuses", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await (supabase as any).from("bonuses").select("*").eq("member_id", profile!.id).order("bonus_date", { ascending: false });
      return data ?? [];
    },
  });

  const { data: myFreelance } = useQuery({
    queryKey: ["my-freelance", profile?.id, profile?.full_name],
    enabled: !!profile?.id,
    queryFn: async () => {
      // Source 1: admin-assigned freelance work (linked by member_id)
      const { data: assignments } = await (supabase as any)
        .from("freelance_assignments")
        .select("*, freelance_projects(*, client_profiles(company, name))")
        .eq("member_id", profile!.id)
        .order("created_at", { ascending: false });

      // Source 2: client-portal artist entries matched by name (no member link)
      const names = [profile?.full_name, (profile as any)?.full_name_en].filter(Boolean) as string[];
      let clientArtists: any[] = [];
      if (names.length > 0) {
        const { data } = await (supabase as any)
          .from("client_project_artists")
          .select("*, freelance_projects(*, client_profiles(company, name))")
          .in("artist_name", names)
          .order("created_at", { ascending: false });
        clientArtists = data ?? [];
      }

      // Normalize both into a single shape
      const fromAssignments = (assignments ?? []).map((a: any) => ({
        id: `fa-${a.id}`,
        rate: Number(a.rate || 0),
        paid_amount: Number(a.paid_amount || 0),
        is_paid: a.is_paid,
        role_label: a.role_label,
        notes: a.notes,
        freelance_projects: a.freelance_projects,
        source: "assignment" as const,
      }));
      const fromClientArtists = clientArtists.map((c: any) => ({
        id: `ca-${c.id}`,
        rate: Number(c.remuneration || 0),
        paid_amount: Number(c.paid_amount || 0),
        is_paid: c.is_paid,
        role_label: "আর্টিস্ট",
        notes: c.notes,
        freelance_projects: c.freelance_projects,
        source: "client" as const,
      }));

      return [...fromAssignments, ...fromClientArtists];
    },
  });

  const [viewScriptData, setViewScriptData] = useState<any>(null);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;

  const paymentMethodLabel: Record<string, string> = { bank: "ব্যাংক", bkash: "বিকাশ", nagad: "নগদ", cash: "ক্যাশ" };

  const getFreelanceDisplayName = (project: any) =>
    project?.client_profiles?.company ||
    project?.client_name ||
    project?.client_profiles?.name ||
    project?.name ||
    "অজানা কোম্পানি";

  const freelanceClientNames = Array.from(
    new Set((myFreelance ?? []).map((item: any) => getFreelanceDisplayName(item.freelance_projects)).filter(Boolean))
  ) as string[];

  const freelanceCardLabel =
    freelanceClientNames.length === 1
      ? freelanceClientNames[0]
      : freelanceClientNames.length > 1
        ? `${freelanceClientNames[0]} +${freelanceClientNames.length - 1}`
        : "বাইরের আয়";

  const balanceCards = [
    { label: (balance?.balance ?? 0) > 0 ? "বকেয়া ব্যালেন্স" : (balance?.balance ?? 0) < 0 ? "অগ্রিম ব্যালেন্স" : "সমন্বয়কৃত", value: Math.abs(balance?.balance ?? 0), icon: Wallet, gradient: "from-red-500/20 to-red-500/5", iconColor: (balance?.balance ?? 0) > 0 ? "text-red-400" : (balance?.balance ?? 0) < 0 ? "text-emerald-400" : "text-blue-400", iconBg: (balance?.balance ?? 0) > 0 ? "bg-red-500/10" : (balance?.balance ?? 0) < 0 ? "bg-emerald-500/10" : "bg-blue-500/10", onClick: () => setBalanceDetailOpen(true) },
    { label: "মোট পেমেন্ট", value: balance?.totalPaid, icon: CreditCard, gradient: "from-rose-500/20 to-rose-500/5", iconColor: "text-rose-400", iconBg: "bg-rose-500/10", onClick: () => setPaymentDetailOpen(true) },
    { label: "মোট বোনাস", value: balance?.totalBonus, icon: Gift, gradient: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-400", iconBg: "bg-emerald-500/10", onClick: undefined },
    { label: "মোট গাড়ি ভাড়া", value: balance?.totalTransport, icon: Car, gradient: "from-cyan-500/20 to-cyan-500/5", iconColor: "text-cyan-400", iconBg: "bg-cyan-500/10", onClick: undefined },
    { label: "মাসিক বেতন", value: balance?.totalSalaryCredits, icon: Banknote, gradient: "from-amber-500/20 to-amber-500/5", iconColor: "text-amber-400", iconBg: "bg-amber-500/10", onClick: undefined },
    { label: freelanceCardLabel, value: balance?.totalFreelance, icon: Briefcase, gradient: "from-orange-500/20 to-orange-500/5", iconColor: "text-orange-400", iconBg: "bg-orange-500/10", onClick: () => setFreelanceDetailOpen(true) },
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {isClient && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Eye className="h-4 w-4" />
              <span>আপনি মেম্বার ড্যাশবোর্ড দেখছেন (শুধু পঠনযোগ্য)</span>
            </div>
            <Link to="/client" className="text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline whitespace-nowrap">
              ক্লায়েন্ট ড্যাশবোর্ডে ফিরে যান
            </Link>
          </div>
        )}

        {/* Notice Board */}
        <NoticeBoard />

        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">স্বাগতম, {profile?.full_name}</h1>
            <p className="text-muted-foreground text-xs mt-1">আইডি: {profile?.member_id}</p>
          </div>
          <Link to="/" className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors border border-primary/20">
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">পাবলিক সাইট দেখুন</span>
            <span className="sm:hidden">সাইট</span>
          </Link>
        </motion.div>

        {/* Balance Cards */}
        <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4" variants={container} initial="hidden" animate="show">
          {balanceCards.map((card) => (
            <motion.div key={card.label} variants={item}>
              <div
                className={`premium-card rounded-2xl p-4 md:p-5 relative overflow-hidden ${card.onClick ? "cursor-pointer hover:ring-1 hover:ring-primary/30 active:scale-[0.98] transition-all" : ""}`}
                onClick={card.onClick}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-60`} />
                <div className="relative z-10">
                  <div className={`h-9 w-9 rounded-xl ${card.iconBg} flex items-center justify-center mb-3`}>
                    <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                  </div>
                  <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">{card.label}</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground mt-1">৳{card.value?.toLocaleString("bn-BD") || "০"}</p>
                  {card.onClick && <p className="text-[9px] text-primary/60 mt-1">বিস্তারিত দেখুন →</p>}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Shootings */}
        <div className="premium-card rounded-2xl overflow-hidden">
          <div className="p-4 md:p-5 border-b border-border/15 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <Film className="h-4 w-4 text-rose-400" />
            </div>
            <h2 className="font-semibold text-foreground text-sm md:text-base">শুটিং তালিকা</h2>
          </div>
          <div className="divide-y divide-border/10 max-h-80 overflow-auto">
            {shootings?.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">কোনো শুটিং নেই</div>}
            {shootings?.map((s: any) => {
              const statusMap: Record<string, { label: string; color: string }> = {
                plan: { label: "প্লান", color: "bg-muted/50 text-muted-foreground" },
                upcoming: { label: "আসন্ন", color: "bg-warning/10 text-warning" },
                calltime: { label: "কলটাইম", color: "bg-orange-500/10 text-orange-400" },
                ongoing: { label: "চলছে", color: "bg-primary/10 text-primary" },
                completed: { label: "শুটিং শেষ", color: "bg-success/10 text-success" },
                editing: { label: "এডিটিং চলছে", color: "bg-accent/50 text-accent-foreground" },
                editing_done: { label: "এডিটিং শেষ", color: "bg-success/15 text-success" },
                published: { label: "পাবলিশ হয়েছে", color: "bg-success/10 text-success" },
              };
              const info = statusMap[s.status] || statusMap.upcoming;
              return (
                <div key={s.id} className="p-3.5 flex items-center justify-between hover:bg-secondary/15 transition-colors">
                  <div>
                    <p className="text-sm text-foreground font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(s.shoot_date).toLocaleDateString("bn-BD")}{s.location && ` • ${s.location}`}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.script_content && <button onClick={() => { setViewShooting(s); setViewScriptOpen(true); }} className="text-primary hover:text-primary/80"><FileText className="h-3.5 w-3.5" /></button>}
                    {s.script_url && <a href={s.script_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80"><ExternalLink className="h-3.5 w-3.5" /></a>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scripts */}
        <div className="premium-card rounded-2xl overflow-hidden">
          <div className="p-4 md:p-5 border-b border-border/15 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-fuchsia-500/10 flex items-center justify-center">
              <ScrollText className="h-4 w-4 text-fuchsia-400" />
            </div>
            <h2 className="font-semibold text-foreground text-sm md:text-base">স্ক্রিপ্ট সমূহ</h2>
          </div>
          <div className="divide-y divide-border/10 max-h-80 overflow-auto">
            {(!permittedScripts || permittedScripts.length === 0) && <div className="p-6 text-sm text-muted-foreground text-center">কোনো স্ক্রিপ্ট অ্যাক্সেস নেই</div>}
            {permittedScripts?.map((script: any) => (
              <div key={script.id} className="p-3.5 flex items-center justify-between hover:bg-secondary/15 transition-colors cursor-pointer" onClick={() => setViewScriptData(script)}>
                <div>
                  <p className="text-sm text-foreground font-medium">{script.title}</p>
                  <p className="text-xs text-muted-foreground">{script.updated_at ? new Date(script.updated_at).toLocaleDateString("bn-BD") : ""}</p>
                </div>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>

        {/* Bonus & Transport */}
        <div className="premium-card rounded-2xl overflow-hidden">
          <div className="p-4 md:p-5 border-b border-border/15 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Gift className="h-4 w-4 text-emerald-400" />
            </div>
            <h2 className="font-semibold text-foreground text-sm md:text-base">বোনাস ও গাড়ি ভাড়া</h2>
          </div>
          <div className="divide-y divide-border/10 max-h-80 overflow-auto">
            {(!myBonuses || myBonuses.length === 0) && <div className="p-6 text-sm text-muted-foreground text-center">কোনো বোনাস/গাড়ি ভাড়া নেই</div>}
            {myBonuses?.map((b: any) => (
              <div key={b.id} className="p-3.5 flex items-center justify-between hover:bg-secondary/15 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg ${b.type === "bonus" ? "bg-success/10" : "bg-primary/10"} flex items-center justify-center`}>
                    {b.type === "bonus" ? <Gift className="h-4 w-4 text-success" /> : <Car className="h-4 w-4 text-primary" />}
                  </div>
                  <div>
                    <p className="text-sm text-foreground font-medium">{b.type === "bonus" ? "বোনাস" : "গাড়ি ভাড়া"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(b.bonus_date).toLocaleDateString("bn-BD")}{b.notes && ` • ${b.notes}`}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-foreground">৳{Number(b.amount).toLocaleString("bn-BD")}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Outsourcing / Freelance Work — detailed */}
        {myFreelance && myFreelance.length > 0 && (() => {
          const totalEarning = myFreelance.reduce((s: number, a: any) => s + Number(a.rate || 0), 0);
          const totalPaid = myFreelance.reduce((s: number, a: any) => s + Number(a.paid_amount || 0), 0);
          const totalDue = Math.max(0, totalEarning - totalPaid);
          const statusMap: Record<string, { label: string; cls: string }> = {
            upcoming: { label: "আসন্ন", cls: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
            ongoing:  { label: "চলছে", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
            completed:{ label: "সম্পন্ন", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
            paid:     { label: "পেইড", cls: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
          };
          return (
            <div className="premium-card rounded-2xl overflow-hidden">
              <div className="p-4 md:p-5 border-b border-border/15 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-orange-400" />
                </div>
                <h2 className="font-semibold text-foreground text-sm md:text-base">বাইরের কাজ (Outsourcing)</h2>
                <span className="ml-auto text-xs text-muted-foreground">{myFreelance.length} টি প্রজেক্ট</span>
              </div>

              {/* Summary strip */}
              <div className="grid grid-cols-3 gap-2 p-3 md:p-4 bg-secondary/10">
                <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3">
                  <p className="text-[10px] text-muted-foreground">মোট আয়</p>
                  <p className="text-sm md:text-base font-bold text-orange-400 mt-0.5">৳{totalEarning.toLocaleString("bn-BD")}</p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <p className="text-[10px] text-muted-foreground">পেইড</p>
                  <p className="text-sm md:text-base font-bold text-emerald-400 mt-0.5">৳{totalPaid.toLocaleString("bn-BD")}</p>
                </div>
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                  <p className="text-[10px] text-muted-foreground">বাকি</p>
                  <p className="text-sm md:text-base font-bold text-rose-400 mt-0.5">৳{totalDue.toLocaleString("bn-BD")}</p>
                </div>
              </div>

              {/* Project cards */}
              <div className="divide-y divide-border/10 max-h-[28rem] overflow-auto">
                {myFreelance.map((a: any) => {
                  const project = a.freelance_projects;
                  const rate = Number(a.rate || 0);
                  const paid = Number(a.paid_amount || 0);
                  const due = Math.max(0, rate - paid);
                  const st = statusMap[project?.status as string] ?? { label: project?.status || "—", cls: "bg-secondary text-muted-foreground border-border/30" };
                  return (
                    <div key={a.id} className="p-4 hover:bg-secondary/15 transition-colors space-y-2.5">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground truncate">
                              👤 {project?.client_name || project?.name || "ক্লায়েন্ট"}
                            </p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                          </div>
                          {project?.name && project?.client_name && (
                            <p className="text-[11px] text-foreground/70 mt-0.5 truncate">📋 {project.name}</p>
                          )}
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {a.role_label && <span className="text-foreground/80">{a.role_label}</span>}
                            {project?.project_date && <> • {new Date(project.project_date).toLocaleDateString("bn-BD")}</>}
                          </p>
                        </div>
                        <div className={`h-7 w-7 shrink-0 rounded-lg ${a.is_paid ? "bg-success/10" : due > 0 ? "bg-warning/10" : "bg-muted"} flex items-center justify-center`}>
                          {a.is_paid ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Clock className="h-4 w-4 text-warning" />}
                        </div>
                      </div>

                      {/* Location row */}
                      {project?.location && (
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span>📍 {project.location}</span>
                        </div>
                      )}

                      {/* Money grid */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="rounded-lg border border-border/30 bg-background/40 px-2.5 py-1.5">
                          <p className="text-[9px] text-muted-foreground">পাওনা</p>
                          <p className="text-xs font-bold text-foreground">৳{rate.toLocaleString("bn-BD")}</p>
                        </div>
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5">
                          <p className="text-[9px] text-muted-foreground">পেইড</p>
                          <p className="text-xs font-bold text-emerald-400">৳{paid.toLocaleString("bn-BD")}</p>
                        </div>
                        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-2.5 py-1.5">
                          <p className="text-[9px] text-muted-foreground">বাকি</p>
                          <p className="text-xs font-bold text-rose-400">৳{due.toLocaleString("bn-BD")}</p>
                        </div>
                      </div>

                      {a.notes && (
                        <p className="text-[11px] text-muted-foreground italic border-l-2 border-border/30 pl-2">{a.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="premium-card rounded-2xl overflow-hidden">
            <div className="p-4 md:p-5 border-b border-border/15 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-amber-400" />
              </div>
              <h2 className="font-semibold text-foreground text-sm md:text-base">পেমেন্ট হিস্ট্রি</h2>
            </div>
            <div className="divide-y divide-border/10 max-h-80 overflow-auto">
              {recentPayments?.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">কোনো পেমেন্ট নেই</div>}
              {recentPayments?.map((p) => (
                <div key={p.id} className="p-3.5 flex items-center justify-between hover:bg-secondary/15 transition-colors">
                  <div>
                    <p className="text-sm text-foreground font-medium">৳{Number(p.amount).toLocaleString("bn-BD")}</p>
                    <p className="text-xs text-muted-foreground">{paymentMethodLabel[p.payment_method] || p.payment_method} • {new Date(p.payment_date).toLocaleDateString("bn-BD")}</p>
                  </div>
                  {p.transaction_id && <span className="text-xs text-muted-foreground">#{p.transaction_id}</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="premium-card rounded-2xl overflow-hidden">
            <div className="p-4 md:p-5 border-b border-border/15 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-cyan-400" />
              </div>
              <h2 className="font-semibold text-foreground text-sm md:text-base">হাজিরা হিস্ট্রি</h2>
            </div>
            <div className="divide-y divide-border/10 max-h-80 overflow-auto">
              {recentAttendance?.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">কোনো হাজিরা নেই</div>}
              {recentAttendance?.map((a: any) => (
                <div key={a.id} className="p-3.5 flex items-center justify-between hover:bg-secondary/15 transition-colors">
                  <div>
                    <p className="text-sm text-foreground font-medium">{a.shootings?.name || "শুটিং"}</p>
                    <p className="text-xs text-muted-foreground">{a.shootings?.shoot_date ? new Date(a.shootings.shoot_date).toLocaleDateString("bn-BD") : ""}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_present ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{a.is_present ? "উপস্থিত" : "অনুপস্থিত"}</span>
                    {a.daily_rate > 0 && <p className="text-xs text-muted-foreground mt-0.5">৳{Number(a.daily_rate).toLocaleString("bn-BD")}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {viewShooting && (
        <ScriptEditor
          open={viewScriptOpen}
          onOpenChange={setViewScriptOpen}
          title={`স্ক্রিপ্ট — ${viewShooting.name}`}
          initialContent={viewShooting.script_content || ""}
          onSave={async () => {}}
          readOnly
        />
      )}

      {/* Script View Dialog */}
      <Dialog open={!!viewScriptData} onOpenChange={(open) => !open && setViewScriptData(null)}>
        <DialogContent className="bg-muted/50 border-none max-w-[900px] w-[95vw] max-h-[95vh] p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/20 bg-card/80 backdrop-blur">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-primary" />
              {viewScriptData?.title}
            </h2>
          </div>
          <div className="overflow-y-auto p-4 md:p-8 flex justify-center" style={{ maxHeight: "calc(95vh - 56px)" }}>
            <div
              className="bg-white shadow-2xl rounded-sm w-full"
              style={{
                maxWidth: "210mm",
                minHeight: "297mm",
                padding: "20mm 25mm",
                color: "#1a1a1a",
                fontFamily: "'Noto Sans Bengali', 'SolaimanLipi', sans-serif",
                lineHeight: 1.8,
                fontSize: "14px",
              }}
            >
              <h1 style={{ fontSize: "22px", fontWeight: 700, textAlign: "center", marginBottom: "24px", color: "#000", borderBottom: "2px solid #e5e5e5", paddingBottom: "16px" }}>
                {viewScriptData?.title}
              </h1>
              {(() => {
                const content = viewScriptData?.content;
                if (!content) return <p style={{ color: "#999", textAlign: "center" }}>কোনো কন্টেন্ট নেই</p>;
                try {
                  const parsed = JSON.parse(content);
                  if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].title !== undefined) {
                    return parsed.map((seq: any, i: number) => (
                      <div key={seq.id || i} style={{ marginBottom: "28px" }}>
                        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#333", marginBottom: "10px", borderLeft: "3px solid #2563eb", paddingLeft: "12px" }}>
                          {seq.title}
                        </h2>
                        <div
                          style={{ color: "#1a1a1a" }}
                          className="prose prose-sm max-w-none [&_*]:!text-[#1a1a1a] [&_h1]:!text-[#000] [&_h2]:!text-[#222] [&_h3]:!text-[#333] [&_strong]:!text-[#000] [&_p]:!my-2 [&_ul]:!my-2 [&_ol]:!my-2"
                          dangerouslySetInnerHTML={{ __html: seq.content || "" }}
                        />
                      </div>
                    ));
                  }
                } catch {}
                return (
                  <div
                    className="prose prose-sm max-w-none [&_*]:!text-[#1a1a1a] [&_h1]:!text-[#000] [&_h2]:!text-[#222] [&_strong]:!text-[#000]"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                );
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Detail Dialog */}
      <Dialog open={paymentDetailOpen} onOpenChange={setPaymentDetailOpen}>
        <DialogContent className="bg-card border-border/50 max-w-md max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-rose-400" />
              মোট পেমেন্ট বিবরণ
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Total Summary */}
            <div className="rounded-xl bg-gradient-to-br from-rose-500/15 to-rose-500/5 p-4 text-center border border-rose-500/10">
              <p className="text-xs text-muted-foreground mb-1">সর্বমোট পেমেন্ট পেয়েছেন</p>
              <p className="text-3xl font-bold text-foreground">৳{balance?.totalPaid?.toLocaleString("bn-BD") || "০"}</p>
              <p className="text-[10px] text-muted-foreground mt-2">মোট {recentPayments?.length || 0}টি পেমেন্ট</p>
            </div>

            {/* Note */}
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/15 p-3">
              <p className="text-[11px] text-amber-300/90 leading-relaxed">
                📌 <span className="font-medium">বিশেষ দ্রষ্টব্য:</span> এই হিসাব অ্যাপ চালু হওয়ার পর থেকে গণনা করা হচ্ছে। অ্যাপ চালুর পূর্বের কোনো লেনদেন এখানে অন্তর্ভুক্ত নয়।
              </p>
            </div>

            {/* Payment List */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">পেমেন্ট তালিকা</p>
              <div className="divide-y divide-border/10 rounded-xl border border-border/20 overflow-hidden">
                {recentPayments?.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">কোনো পেমেন্ট নেই</div>
                )}
                {recentPayments?.map((p: any) => (
                  <div key={p.id} className="p-3 flex items-center justify-between hover:bg-secondary/10 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">৳{Number(p.amount).toLocaleString("bn-BD")}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(p.payment_date).toLocaleDateString("bn-BD")} • {paymentMethodLabel[p.payment_method] || p.payment_method}
                      </p>
                      {p.notes && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{p.notes}</p>}
                    </div>
                    <div className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-medium">
                      {paymentMethodLabel[p.payment_method] || p.payment_method}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Freelance Detail Dialog */}
      <Dialog open={freelanceDetailOpen} onOpenChange={setFreelanceDetailOpen}>
        <DialogContent className="bg-card border-border/50 max-w-md max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Briefcase className="h-5 w-5 text-orange-400" /> বাইরের আয় বিস্তারিত
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const list = myFreelance ?? [];
            const totalEarning = list.reduce((s: number, a: any) => s + Number(a.rate || 0), 0);
            const totalPaid = list.reduce((s: number, a: any) => s + Number(a.paid_amount || 0), 0);
            const totalDue = Math.max(0, totalEarning - totalPaid);
            const statusMap: Record<string, { label: string; cls: string }> = {
              upcoming: { label: "আসন্ন", cls: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
              ongoing:  { label: "চলছে", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
              completed:{ label: "সম্পন্ন", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
              paid:     { label: "পেইড", cls: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
            };
            return (
              <div className="space-y-4">
                {/* Summary 3-grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">মোট আয়</p>
                    <p className="text-sm font-bold text-orange-400 mt-0.5">৳{totalEarning.toLocaleString("bn-BD")}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">পেইড</p>
                    <p className="text-sm font-bold text-emerald-400 mt-0.5">৳{totalPaid.toLocaleString("bn-BD")}</p>
                  </div>
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">বাকি</p>
                    <p className="text-sm font-bold text-rose-400 mt-0.5">৳{totalDue.toLocaleString("bn-BD")}</p>
                  </div>
                </div>

                {/* Project count */}
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>মোট প্রজেক্ট</span>
                  <span className="font-semibold text-foreground">{list.length} টি</span>
                </div>

                {list.length > 0 ? (
                  <div className="space-y-2">
                    {list.map((a: any) => {
                      const project = a.freelance_projects;
                      const rate = Number(a.rate || 0);
                      const paid = Number(a.paid_amount || 0);
                      const due = Math.max(0, rate - paid);
                      const st = statusMap[project?.status as string] ?? { label: project?.status || "—", cls: "bg-secondary text-muted-foreground border-border/30" };
                      return (
                        <div key={a.id} className="p-3 rounded-xl bg-secondary/30 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-foreground truncate">
                                  {project?.client_name || project?.name || "প্রজেক্ট"}
                                </p>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                              </div>
                              {project?.name && project?.client_name && (
                                <p className="text-[11px] text-foreground/70 mt-0.5 truncate">📋 {project.name}</p>
                              )}
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {a.role_label && <span className="text-foreground/80">{a.role_label}</span>}
                                {project?.project_date && <> • {new Date(project.project_date).toLocaleDateString("bn-BD")}</>}
                              </p>
                            </div>
                          </div>

                          {project?.location && (
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                              <span>📍 {project.location}</span>
                            </div>
                          )}

                          <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-lg border border-border/30 bg-background/40 px-2 py-1.5 text-center">
                              <p className="text-[9px] text-muted-foreground">পাওনা</p>
                              <p className="text-xs font-bold text-foreground">৳{rate.toLocaleString("bn-BD")}</p>
                            </div>
                            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2 py-1.5 text-center">
                              <p className="text-[9px] text-muted-foreground">পেইড</p>
                              <p className="text-xs font-bold text-emerald-400">৳{paid.toLocaleString("bn-BD")}</p>
                            </div>
                            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-2 py-1.5 text-center">
                              <p className="text-[9px] text-muted-foreground">বাকি</p>
                              <p className="text-xs font-bold text-rose-400">৳{due.toLocaleString("bn-BD")}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-4">কোনো বাইরের কাজ নেই</p>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Balance Detail Dialog */}
      <Dialog open={balanceDetailOpen} onOpenChange={setBalanceDetailOpen}>
        <DialogContent className="bg-card border-border/50 max-w-md max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Wallet className="h-5 w-5 text-red-400" />
              বকেয়া বিস্তারিত
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const list = myFreelance ?? [];
            // Group dues by client name
            const dueByClient = new Map<string, { earned: number; paid: number; due: number; projects: number }>();
            list.forEach((a: any) => {
              const earned = Number(a.rate || 0);
              const paid = Number(a.paid_amount || 0);
              const due = Math.max(0, earned - paid);
              const clientName = a.freelance_projects?.client_name || "অজানা ক্লায়েন্ট";
              const prev = dueByClient.get(clientName) || { earned: 0, paid: 0, due: 0, projects: 0 };
              dueByClient.set(clientName, {
                earned: prev.earned + earned,
                paid: prev.paid + paid,
                due: prev.due + due,
                projects: prev.projects + 1,
              });
            });

            const totalEarned = Number(balance?.totalEarned || 0);
            const totalPaid = Number(balance?.totalPaid || 0);
            const totalBonuses = Number(balance?.totalBonuses || 0);
            const totalSalaryCredits = Number(balance?.totalSalaryCredits || 0);
            const totalFreelance = Number(balance?.totalFreelance || 0);
            const totalFreelancePaid = Number((balance as any)?.totalFreelancePaid || 0);
            const previousBalance = Number(balance?.previousBalance || 0);
            const finalBalance = Number(balance?.balance || 0);
            const freelanceDue = Math.max(0, totalFreelance - totalFreelancePaid);
            const internalDue = (totalEarned + totalBonuses + totalSalaryCredits + previousBalance) - totalPaid;

            return (
              <div className="space-y-4 mt-2">
                {/* Total Summary */}
                <div className={`rounded-xl p-4 border ${finalBalance > 0 ? "bg-red-500/10 border-red-500/30" : finalBalance < 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-blue-500/10 border-blue-500/30"}`}>
                  <p className="text-xs text-muted-foreground">{finalBalance > 0 ? "মোট বকেয়া" : finalBalance < 0 ? "মোট অগ্রিম" : "সমন্বয়কৃত"}</p>
                  <p className={`text-2xl font-bold ${finalBalance > 0 ? "text-red-400" : finalBalance < 0 ? "text-emerald-400" : "text-blue-400"}`}>
                    ৳{Math.abs(finalBalance).toLocaleString("bn-BD")}
                  </p>
                </div>

                {/* Calculation Breakdown */}
                <div className="rounded-xl border border-border/40 p-3 space-y-2 bg-muted/20">
                  <p className="text-xs font-semibold text-foreground mb-2">হিসাবের বিবরণ</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">শুটিং থেকে আয়</span>
                    <span className="font-semibold text-foreground">৳{totalEarned.toLocaleString("bn-BD")}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">বোনাস + গাড়ি ভাড়া</span>
                    <span className="font-semibold text-foreground">৳{totalBonuses.toLocaleString("bn-BD")}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">মাসিক বেতন</span>
                    <span className="font-semibold text-foreground">৳{totalSalaryCredits.toLocaleString("bn-BD")}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">বাইরের আয়</span>
                    <span className="font-semibold text-foreground">৳{totalFreelance.toLocaleString("bn-BD")}</span>
                  </div>
                  {previousBalance !== 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">পূর্ববর্তী ব্যালেন্স</span>
                      <span className="font-semibold text-foreground">৳{previousBalance.toLocaleString("bn-BD")}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border/30">
                    <span className="text-muted-foreground">প্রাপ্ত পেমেন্ট (অভ্যন্তরীণ)</span>
                    <span className="font-semibold text-rose-400">- ৳{totalPaid.toLocaleString("bn-BD")}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">প্রাপ্ত পেমেন্ট (বাইরের)</span>
                    <span className="font-semibold text-rose-400">- ৳{totalFreelancePaid.toLocaleString("bn-BD")}</span>
                  </div>
                </div>

                {/* Who owes - Internal (KM Production) */}
                {internalDue > 0 && (
                  <div className="rounded-xl border border-border/40 p-3 bg-muted/20">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-foreground">KM Production (অভ্যন্তরীণ)</p>
                      <span className="text-sm font-bold text-red-400">৳{internalDue.toLocaleString("bn-BD")}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">শুটিং, বোনাস, মাসিক বেতন থেকে বকেয়া</p>
                  </div>
                )}

                {/* Who owes - Per client */}
                {dueByClient.size > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">বাইরের ক্লায়েন্ট থেকে বকেয়া</p>
                    {Array.from(dueByClient.entries())
                      .filter(([, v]) => v.due > 0)
                      .sort((a, b) => b[1].due - a[1].due)
                      .map(([clientName, info]) => (
                        <div key={clientName} className="rounded-xl border border-border/40 p-3 bg-muted/20">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-semibold text-foreground">{clientName}</p>
                            <span className="text-sm font-bold text-red-400">৳{info.due.toLocaleString("bn-BD")}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-[10px] text-muted-foreground mt-2">
                            <div>প্রজেক্ট: <span className="text-foreground font-semibold">{info.projects.toLocaleString("bn-BD")}</span></div>
                            <div>পাওনা: <span className="text-foreground font-semibold">৳{info.earned.toLocaleString("bn-BD")}</span></div>
                            <div>পেইড: <span className="text-emerald-400 font-semibold">৳{info.paid.toLocaleString("bn-BD")}</span></div>
                          </div>
                        </div>
                      ))}
                    {Array.from(dueByClient.values()).every((v) => v.due === 0) && (
                      <p className="text-xs text-muted-foreground text-center py-2">বাইরের কোনো ক্লায়েন্টের কাছে বকেয়া নেই</p>
                    )}
                  </div>
                )}

                {finalBalance <= 0 && internalDue <= 0 && Array.from(dueByClient.values()).every((v) => v.due === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">কোনো বকেয়া নেই 🎉</p>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default MemberDashboard;
