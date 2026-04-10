import { useAuth } from "@/hooks/useAuth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Calendar, MapPin, FileText, CheckCircle2, LogOut, Wallet, Users, Banknote, Download, CreditCard, ArrowRight, ChevronLeft, ChevronDown, ChevronUp, Sparkles, TrendingUp, Eye, EyeOff, Receipt, Trash2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClientProjectScript } from "@/components/ClientProjectScript";
import { ClientSceneEditor } from "@/components/ClientSceneEditor";
import { ClientArtistBilling } from "@/components/ClientArtistBilling";
import { ClientProjectExpenses } from "@/components/ClientProjectExpenses";
import { downloadProjectBillPDF, downloadAllProjectsBillPDF } from "@/lib/billPdf";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import ClientArtistReceipt from "@/components/ClientArtistReceipt";
import ClientPaymentReceipt from "@/components/ClientPaymentReceipt";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  upcoming: { label: "আসন্ন", color: "text-sky-400", bg: "bg-sky-500/15 border-sky-500/20" },
  ongoing: { label: "চলছে", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/20" },
  completed: { label: "সম্পন্ন", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/20" },
  paid: { label: "পেইড", color: "text-violet-400", bg: "bg-violet-500/15 border-violet-500/20" },
};

const paymentMethodLabel: Record<string, string> = {
  cash: "নগদ",
  bkash: "বিকাশ",
  nagad: "নগদ (নাগাদ)",
  bank: "ব্যাংক",
};

/* ─── Animated Counter ─── */
function AnimatedValue({ value, prefix = "৳" }: { value: number; prefix?: string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {prefix}{value.toLocaleString("bn-BD")}
    </motion.span>
  );
}

export default function ClientDashboard() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "projects">("dashboard");
  const [expandedBillCard, setExpandedBillCard] = useState<"production" | "artist" | "expense" | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const paymentHistoryRef = useRef<HTMLDivElement>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "derived" | "history"; rec: any } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [historyReceiptData, setHistoryReceiptData] = useState<any>(null);
  const projectsRef = useRef<HTMLDivElement>(null);

  const { data: clientProfile } = useQuery({
    queryKey: ["client-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("client_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["client-projects", clientProfile?.id],
    enabled: !!clientProfile?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("freelance_projects")
        .select("*")
        .eq("client_profile_id", clientProfile.id)
        .order("project_date", { ascending: false });
      return data || [];
    },
  });

  const { data: allScenes = [], refetch: refetchScenes } = useQuery({
    queryKey: ["client-scenes", clientProfile?.id],
    enabled: !!clientProfile?.id && projects.length > 0,
    queryFn: async () => {
      const projectIds = projects.map((p: any) => p.id);
      const { data } = await (supabase as any)
        .from("freelance_scenes")
        .select("*")
        .in("project_id", projectIds)
        .order("sort_order");
      return data || [];
    },
  });

  const { data: allPayments = [] } = useQuery({
    queryKey: ["client-payments", clientProfile?.id],
    enabled: !!clientProfile?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("freelance_payments")
        .select("*")
        .eq("client_profile_id", clientProfile.id)
        .order("payment_date", { ascending: false });
      return data || [];
    },
  });

  const { data: allProjectArtists = [] } = useQuery({
    queryKey: ["all-client-project-artists", clientProfile?.id],
    enabled: !!clientProfile?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("client_project_artists")
        .select("*")
        .eq("client_profile_id", clientProfile.id);
      return data || [];
    },
  });

  const { data: allProjectExpenses = [] } = useQuery({
    queryKey: ["all-client-project-expenses", clientProfile?.id],
    enabled: !!clientProfile?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("client_project_expenses")
        .select("*")
        .eq("client_profile_id", clientProfile.id);
      return data || [];
    },
  });

  const { data: clientPaymentHistory = [] } = useQuery({
    queryKey: ["client-payment-history", clientProfile?.id],
    enabled: !!clientProfile?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("client_payment_history")
        .select("*")
        .eq("client_profile_id", clientProfile.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center animate-pulse">
          <Briefcase className="h-5 w-5 text-primary" />
        </div>
        <span className="text-sm text-muted-foreground">লোড হচ্ছে...</span>
      </motion.div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;

  const getScenes = (pid: string) => allScenes.filter((s: any) => s.project_id === pid);

  const totalBudget = projects.reduce((s: number, p: any) => s + Number(p.total_budget || 0), 0);
  const totalProductionPaid = allPayments.reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0);
  const productionDue = totalBudget - totalProductionPaid;

  const totalArtistBill = allProjectArtists.reduce((s: number, a: any) => s + Number(a.remuneration || 0), 0);
  const totalArtistPaid = allProjectArtists.reduce((s: number, a: any) => s + Number(a.paid_amount || 0), 0);
  const artistDue = totalArtistBill - totalArtistPaid;

  const totalExpenses = allProjectExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const totalExpensesPaid = allProjectExpenses.reduce((s: number, e: any) => s + Number(e.paid_amount || 0), 0);
  const expenseDue = totalExpenses - totalExpensesPaid;

  const grandTotal = totalBudget + totalArtistBill + totalExpenses;
  const grandPaid = totalProductionPaid + totalArtistPaid + totalExpensesPaid;
  const grandDue = grandTotal - grandPaid;

  const paidPercent = grandTotal > 0 ? Math.round((grandPaid / grandTotal) * 100) : 0;

  const getProjectExpenseTotal = (pid: string) => {
    return allProjectExpenses.filter((e: any) => e.project_id === pid).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  };

  const getProjectArtistTotals = (pid: string) => {
    const arts = allProjectArtists.filter((a: any) => a.project_id === pid);
    const bill = arts.reduce((s: number, a: any) => s + Number(a.remuneration || 0), 0);
    const paid = arts.reduce((s: number, a: any) => s + Number(a.paid_amount || 0), 0);
    return { bill, paid, due: bill - paid, count: arts.length };
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-violet-500/5" />
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary/5 blur-3xl" />
        
        <div className="relative max-w-4xl mx-auto px-4 pt-6 pb-4 md:px-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
                  {clientProfile?.photo_url ? (
                    <img src={clientProfile.photo_url} alt="" className="h-full w-full rounded-2xl object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-primary">
                      {clientProfile?.name?.charAt(0) || "K"}
                    </span>
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground leading-tight">
                  স্বাগতম, {clientProfile?.name || "ক্লায়েন্ট"}
                </h1>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  আইডি: {clientProfile?.client_id}
                  {clientProfile?.company && <span className="ml-1">• {clientProfile.company}</span>}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => supabase.auth.signOut()}
              className="h-9 w-9 p-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 space-y-4 pb-24 md:pb-8">
        <div ref={dashboardRef} />
        {/* ═══ Grand Summary Card ═══ */}
        {activeTab === "dashboard" && projects.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="relative rounded-2xl overflow-hidden">
              {/* Gradient BG */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-card to-violet-500/8 border border-primary/15 rounded-2xl" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/8 rounded-full blur-2xl -mr-8 -mt-8" />
              
              <div className="relative p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">সামগ্রিক হিসাব</span>
                  </div>
                  <button onClick={() => setShowBalance(!showBalance)} className="text-muted-foreground hover:text-foreground p-1">
                    {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>

                {/* Main balance */}
                <div className="mb-4">
                  <div className="text-xs text-muted-foreground mb-1">মোট বাকি</div>
                  <div className="text-3xl font-bold text-foreground tracking-tight">
                    {showBalance ? <AnimatedValue value={Math.max(0, grandDue)} /> : "৳ •••••"}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-muted-foreground">পেমেন্ট অগ্রগতি</span>
                    <span className="text-[10px] font-semibold text-primary">{paidPercent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary/60 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${paidPercent}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-background/50 backdrop-blur-sm border border-border/30 p-2.5 text-center">
                    <div className="text-[10px] text-muted-foreground mb-0.5">মোট বিল</div>
                    <div className="text-sm font-bold text-foreground">
                      {showBalance ? <AnimatedValue value={grandTotal} /> : "•••"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/15 p-2.5 text-center">
                    <div className="text-[10px] text-emerald-400/70 mb-0.5">পেইড</div>
                    <div className="text-sm font-bold text-emerald-400">
                      {showBalance ? <AnimatedValue value={grandPaid} /> : "•••"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-amber-500/8 border border-amber-500/15 p-2.5 text-center">
                    <div className="text-[10px] text-amber-400/70 mb-0.5">বাকি</div>
                    <div className="text-sm font-bold text-amber-400">
                      {showBalance ? <AnimatedValue value={Math.max(0, grandDue)} /> : "•••"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ Production & Artist Bill Cards ═══ */}
        {projects.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {/* Production */}
              <button
                className={cn(
                  "rounded-2xl p-3 text-left transition-all duration-300 border",
                  expandedBillCard === "production"
                    ? "bg-sky-500/10 border-sky-500/30 shadow-lg shadow-sky-500/5"
                    : "bg-card/80 border-border/40 hover:border-sky-500/20"
                )}
                onClick={() => setExpandedBillCard(expandedBillCard === "production" ? null : "production")}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-sky-500/15 flex items-center justify-center">
                    <Banknote className="h-3.5 w-3.5 text-sky-400" />
                  </div>
                  {expandedBillCard === "production" ? <ChevronUp className="h-3 w-3 text-sky-400 ml-auto" /> : <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto" />}
                </div>
                <div className="text-[9px] text-muted-foreground mb-0.5">প্রোডাকশন</div>
                <div className="text-sm font-bold text-foreground">৳{totalBudget.toLocaleString("bn-BD")}</div>
                <div className="flex flex-col gap-0.5 mt-1">
                  <span className="text-[9px] text-emerald-400">✓ ৳{totalProductionPaid.toLocaleString("bn-BD")}</span>
                  {productionDue > 0 && <span className="text-[9px] text-amber-400">বাকি ৳{productionDue.toLocaleString("bn-BD")}</span>}
                </div>
              </button>

              {/* Artist */}
              <button
                className={cn(
                  "rounded-2xl p-3 text-left transition-all duration-300 border",
                  expandedBillCard === "artist"
                    ? "bg-violet-500/10 border-violet-500/30 shadow-lg shadow-violet-500/5"
                    : "bg-card/80 border-border/40 hover:border-violet-500/20"
                )}
                onClick={() => setExpandedBillCard(expandedBillCard === "artist" ? null : "artist")}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-violet-500/15 flex items-center justify-center">
                    <Users className="h-3.5 w-3.5 text-violet-400" />
                  </div>
                  {expandedBillCard === "artist" ? <ChevronUp className="h-3 w-3 text-violet-400 ml-auto" /> : <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto" />}
                </div>
                <div className="text-[9px] text-muted-foreground mb-0.5">আর্টিস্ট</div>
                <div className="text-sm font-bold text-foreground">৳{totalArtistBill.toLocaleString("bn-BD")}</div>
                <div className="flex flex-col gap-0.5 mt-1">
                  <span className="text-[9px] text-emerald-400">✓ ৳{totalArtistPaid.toLocaleString("bn-BD")}</span>
                  {artistDue > 0 && <span className="text-[9px] text-amber-400">বাকি ৳{artistDue.toLocaleString("bn-BD")}</span>}
                </div>
              </button>

              {/* Expense */}
              <button
                className={cn(
                  "rounded-2xl p-3 text-left transition-all duration-300 border",
                  expandedBillCard === "expense"
                    ? "bg-orange-500/10 border-orange-500/30 shadow-lg shadow-orange-500/5"
                    : "bg-card/80 border-border/40 hover:border-orange-500/20"
                )}
                onClick={() => setExpandedBillCard(expandedBillCard === "expense" ? null : "expense")}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-orange-500/15 flex items-center justify-center">
                    <Receipt className="h-3.5 w-3.5 text-orange-400" />
                  </div>
                  {expandedBillCard === "expense" ? <ChevronUp className="h-3 w-3 text-orange-400 ml-auto" /> : <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto" />}
                </div>
                <div className="text-[9px] text-muted-foreground mb-0.5">শুটিং খরচ</div>
                <div className="text-sm font-bold text-foreground">৳{totalExpenses.toLocaleString("bn-BD")}</div>
                <div className="flex flex-col gap-0.5 mt-1">
                  <span className="text-[9px] text-emerald-400">✓ ৳{totalExpensesPaid.toLocaleString("bn-BD")}</span>
                  <span className="text-[9px] text-orange-400">✗ ৳{expenseDue.toLocaleString("bn-BD")}</span>
                </div>
              </button>
            </div>

            {/* Expanded breakdowns */}
            <AnimatePresence>
              {expandedBillCard === "production" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-sky-400 mb-3 flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" />
                      প্রজেক্ট অনুযায়ী প্রোডাকশন বিল
                    </h4>
                    {projects.map((p: any) => {
                      const projPaid = allPayments.filter((pay: any) => pay.project_id === p.id).reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0);
                      const projDue = Number(p.total_budget || 0) - projPaid;
                      return (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/20">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                            <div className="text-[10px] text-muted-foreground">{format(new Date(p.project_date), "d MMM yyyy", { locale: bn })}</div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <div className="text-sm font-bold text-foreground">৳{Number(p.total_budget || 0).toLocaleString("bn-BD")}</div>
                            {projPaid > 0 && <div className="text-[10px] text-emerald-400">পেইড: ৳{projPaid.toLocaleString("bn-BD")}</div>}
                            {projDue > 0 ? <div className="text-[10px] text-amber-400">বাকি: ৳{projDue.toLocaleString("bn-BD")}</div>
                              : Number(p.total_budget) > 0 && <div className="text-[10px] text-emerald-400 font-semibold">✓ পেইড</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
              {expandedBillCard === "artist" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-violet-400 mb-3 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      আর্টিস্ট অনুযায়ী বিল
                    </h4>
                    {(() => {
                      const artistMap: Record<string, { totalBill: number; totalPaid: number; projects: string[] }> = {};
                      allProjectArtists.forEach((a: any) => {
                        const key = a.artist_name.toLowerCase();
                        if (!artistMap[key]) artistMap[key] = { totalBill: 0, totalPaid: 0, projects: [] };
                        artistMap[key].totalBill += Number(a.remuneration || 0);
                        artistMap[key].totalPaid += Number(a.paid_amount || 0);
                        const proj = projects.find((p: any) => p.id === a.project_id);
                        if (proj && !artistMap[key].projects.includes(proj.name)) artistMap[key].projects.push(proj.name);
                      });
                      const entries = Object.entries(artistMap).map(([key, val]) => {
                        const originalName = allProjectArtists.find((a: any) => a.artist_name.toLowerCase() === key)?.artist_name || key;
                        return { name: originalName, ...val };
                      });
                      if (entries.length === 0) return <div className="text-xs text-muted-foreground text-center py-3">কোনো আর্টিস্ট নেই</div>;
                      return entries.map((artist, idx) => {
                        const due = artist.totalBill - artist.totalPaid;
                        const pct = artist.totalBill > 0 ? Math.round((artist.totalPaid / artist.totalBill) * 100) : 0;
                        return (
                          <div key={idx} className="p-3 rounded-xl bg-background/50 border border-border/20">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="h-8 w-8 rounded-full bg-violet-500/15 flex items-center justify-center text-xs font-bold text-violet-400 shrink-0">
                                  {artist.name?.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-foreground truncate">{artist.name}</div>
                                  <div className="text-[10px] text-muted-foreground truncate">{artist.projects.join(", ")}</div>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <div className="text-sm font-bold text-foreground">৳{artist.totalBill.toLocaleString("bn-BD")}</div>
                                {due > 0 ? <div className="text-[10px] text-amber-400">বাকি ৳{due.toLocaleString("bn-BD")}</div>
                                  : artist.totalBill > 0 && <div className="text-[10px] text-emerald-400 font-semibold">✓ পেইড</div>}
                              </div>
                            </div>
                            <div className="h-1 rounded-full bg-secondary/50 overflow-hidden">
                              <div className="h-full bg-violet-500/60 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </motion.div>
              )}
              {expandedBillCard === "expense" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                  <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-orange-400 mb-3 flex items-center gap-1.5">
                      <Receipt className="h-3.5 w-3.5" />
                      প্রজেক্ট অনুযায়ী শুটিং খরচ
                    </h4>
                    {(() => {
                      const projectsWithExpenses = projects.filter((p: any) => {
                        return allProjectExpenses.some((e: any) => e.project_id === p.id);
                      });
                      if (projectsWithExpenses.length === 0) return <div className="text-xs text-muted-foreground text-center py-3">কোনো খরচ নেই</div>;
                      
                      const categoryLabels: Record<string, string> = { food: "🍛 খাবার", costume: "👔 কস্টিউম", transport: "🚌 যাতায়াত" };
                      
                      return projectsWithExpenses.map((p: any) => {
                        const projExpenses = allProjectExpenses.filter((e: any) => e.project_id === p.id);
                        const projTotal = projExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
                        
                        const byCat: Record<string, number> = {};
                        projExpenses.forEach((e: any) => {
                          byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount || 0);
                        });
                        
                        return (
                          <div key={p.id} className="p-3 rounded-xl bg-background/50 border border-border/20">
                            <div className="flex items-center justify-between mb-2">
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                                <div className="text-[10px] text-muted-foreground">{format(new Date(p.project_date), "d MMM yyyy", { locale: bn })}</div>
                              </div>
                              <div className="text-sm font-bold text-foreground shrink-0 ml-2">৳{projTotal.toLocaleString("bn-BD")}</div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(byCat).map(([cat, amt]) => (
                                <span key={cat} className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300">
                                  {categoryLabels[cat] || cat}: ৳{amt.toLocaleString("bn-BD")}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Project count + Download */}
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-3 p-3.5 rounded-2xl bg-card/80 border border-border/40">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">মোট প্রজেক্ট</div>
                  <div className="text-xl font-bold text-foreground">{projects.length}</div>
                </div>
              </div>
              <BillDownloadDialog
                projects={projects}
                allProjectArtists={allProjectArtists}
                allPayments={allPayments}
                allProjectExpenses={allProjectExpenses}
                clientProfile={clientProfile}
              />
            </div>
          </motion.div>
        )}

        {/* ═══ Payment Button ═══ */}
        {projects.length > 0 && (grandDue > 0 || allProjectExpenses.some((e: any) => !e.is_paid)) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <PaymentDialog
              allProjectArtists={allProjectArtists}
              allPayments={allPayments}
              projects={projects}
              clientName={clientProfile?.name || ""}
              clientProfileId={clientProfile?.id || ""}
              companyName={clientProfile?.company || ""}
              totalBudget={totalBudget}
              totalProductionPaid={totalProductionPaid}
              allProjectExpenses={allProjectExpenses}
            />
          </motion.div>
        )}

        {/* ═══ Payment History (Production + Client) ═══ */}
        <div ref={paymentHistoryRef} />
        
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <div className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden">
              {(() => {
                const expCatLabel: Record<string, string> = { food: "খাবার", costume: "কস্টিউম", transport: "যাতায়াত" };
                const paidArtistRecords = allProjectArtists
                  .filter((a: any) => Number(a.paid_amount || 0) > 0)
                  .map((a: any) => ({
                    id: `artist-${a.id}`, type: "artist" as const, amount: Number(a.paid_amount || 0),
                    label: a.artist_name, projectName: projects.find((p: any) => p.id === a.project_id)?.name || "",
                    date: a.created_at, isPaid: a.is_paid,
                  }));
                const paidExpenseRecords = allProjectExpenses
                  .filter((e: any) => e.is_paid)
                  .map((e: any) => ({
                    id: `expense-${e.id}`, type: "expense" as const, amount: Number(e.amount || 0),
                    label: e.description || expCatLabel[e.category] || e.category,
                    projectName: projects.find((p: any) => p.id === e.project_id)?.name || "",
                    date: e.created_at, isPaid: true,
                  }));
                const derivedRecords = [...paidArtistRecords, ...paidExpenseRecords].sort((a, b) => b.date.localeCompare(a.date));
                const totalHistoryCount = allPayments.length + derivedRecords.length + clientPaymentHistory.length;

                return (
                  <>
                    <div
                      className="p-4 pb-3 flex items-center gap-2 cursor-pointer active:bg-secondary/20 transition-colors"
                      onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                    >
                      <div className="h-7 w-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                        <History className="h-3.5 w-3.5 text-emerald-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">পেমেন্ট হিস্ট্রি</h3>
                      <Badge variant="outline" className="ml-auto text-[10px] h-5 border-border/50">{totalHistoryCount}</Badge>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-300", showPaymentHistory && "rotate-180")} />
                    </div>
                    <AnimatePresence>
                      {showPaymentHistory && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-2">
                            {totalHistoryCount === 0 && (
                              <div className="text-center py-6">
                                <p className="text-xs text-muted-foreground">কোনো পেমেন্ট রেকর্ড নেই</p>
                              </div>
                            )}
                            {/* Production payments */}
                            {allPayments.map((pay: any, idx: number) => (
                              <motion.div key={pay.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                                className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/20">
                                <div className="h-9 w-9 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
                                  <Banknote className="h-4 w-4 text-sky-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold text-foreground">৳{Number(pay.amount).toLocaleString("bn-BD")}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {format(new Date(pay.payment_date), "d MMM yyyy", { locale: bn })} • প্রোডাকশন • {paymentMethodLabel[pay.payment_method] || pay.payment_method}
                                  </div>
                                </div>
                                {pay.notes && <span className="text-[10px] text-muted-foreground max-w-[80px] truncate">{pay.notes}</span>}
                              </motion.div>
                            ))}
                            {/* Derived paid records from artist/expense data */}
                            {derivedRecords.map((rec, idx: number) => (
                              <motion.div key={rec.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: (allPayments.length + idx) * 0.03 }}
                                className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/20">
                                <div className={`h-9 w-9 rounded-xl ${rec.type === "artist" ? "bg-violet-500/10" : "bg-orange-500/10"} flex items-center justify-center shrink-0`}>
                                  {rec.type === "artist" ? <Users className="h-4 w-4 text-violet-400" /> : <Receipt className="h-4 w-4 text-orange-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-semibold text-foreground">৳{rec.amount.toLocaleString("bn-BD")}</div>
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    {format(new Date(rec.date), "d MMM yyyy", { locale: bn })} • {rec.type === "artist" ? "আর্টিস্ট" : "শুটিং খরচ"} • {rec.label}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground/70 truncate">{rec.projectName}</div>
                                </div>
                                {rec.type === "artist" && (
                                  <Badge variant="outline" className={cn("text-[9px] h-4 shrink-0", rec.isPaid ? "border-emerald-500/50 text-emerald-500" : "border-amber-500/50 text-amber-500")}>
                                    {rec.isPaid ? "পেইড" : "আংশিক"}
                                  </Badge>
                                )}
                                <Button variant="ghost" size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                  onClick={() => setDeleteConfirm({ type: "derived", rec })}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </motion.div>
                            ))}
                            {/* Client payment history table (deletable) */}
                            {clientPaymentHistory.map((ph: any, idx: number) => {
                              const details = ph.details || {};
                              const typeLabel = ph.payment_type === "artist" ? "আর্টিস্ট" : "শুটিং খরচ";
                              const typeIcon = ph.payment_type === "artist" ? <Users className="h-4 w-4 text-violet-400" /> : <Receipt className="h-4 w-4 text-orange-400" />;
                              const typeBg = ph.payment_type === "artist" ? "bg-violet-500/10" : "bg-orange-500/10";
                              return (
                                <motion.div key={ph.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                                  className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/20">
                                  <div className={`h-9 w-9 rounded-xl ${typeBg} flex items-center justify-center shrink-0`}>
                                    {typeIcon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-foreground">৳{Number(ph.amount).toLocaleString("bn-BD")}</div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {format(new Date(ph.created_at), "d MMM yyyy", { locale: bn })} • {typeLabel}
                                      {details.artist_name && ` • ${details.artist_name}`}
                                      {details.expense_count && ` • ${details.expense_count} টি আইটেম`}
                                    </div>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <Button variant="ghost" size="sm"
                                      className="h-7 w-7 p-0 text-primary hover:text-primary hover:bg-primary/10"
                                      onClick={() => setHistoryReceiptData({
                                        clientName: clientProfile?.name || "",
                                        company: clientProfile?.company || undefined,
                                        amount: Number(ph.amount),
                                        paymentType: ph.payment_type,
                                        details: details,
                                        date: ph.created_at,
                                      })}
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm"
                                      className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => setDeleteConfirm({ type: "history", rec: ph })}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                );
              })()}
            </div>
          </motion.div>
        
        {/* ═══ Projects ═══ */}
        {projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-primary/50" />
            </div>
            <p className="text-muted-foreground text-sm">কোনো প্রজেক্ট নেই</p>
          </div>
        ) : (
          <>
          <div ref={projectsRef} />
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2 px-1">
              <FileText className="h-4.5 w-4.5 text-primary" /> আপনার প্রজেক্ট সমূহ
            </h2>
            {projects.map((p: any, pIdx: number) => {
              const scenes = getScenes(p.id);
              const st = statusMap[p.status] || statusMap.upcoming;
              const isOpen = expandedProject === p.id;
              const artTotals = getProjectArtistTotals(p.id);
              const projProductionPaid = allPayments.filter((pay: any) => pay.project_id === p.id).reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0);
              const projExpenseTotal = getProjectExpenseTotal(p.id);
              const projTotal = Number(p.total_budget) + artTotals.bill + projExpenseTotal;

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * pIdx }}
                  className={cn(
                    "rounded-2xl border overflow-hidden transition-all duration-300",
                    isOpen ? "border-primary/25 bg-card/90 shadow-lg shadow-primary/5" : "border-border/40 bg-card/60"
                  )}
                >
                  <div
                    className="p-4 cursor-pointer active:bg-secondary/20 transition-colors"
                    onClick={() => setExpandedProject(isOpen ? null : p.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Status indicator */}
                      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border", st.bg)}>
                        <Briefcase className={cn("h-4.5 w-4.5", st.color)} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold text-foreground text-[15px] truncate">{p.name}</h3>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("text-[9px] px-1.5 py-0 h-4 border cursor-pointer", st.bg, st.color)}
                          onClick={(e) => {
                            if (p.status === "paid") {
                              e.stopPropagation();
                              setShowPaymentHistory(true);
                              setTimeout(() => paymentHistoryRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
                            }
                          }}
                        >{st.label}</Badge>
                        <div className="flex flex-wrap gap-x-3 mt-1.5 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(p.project_date), "d MMM yyyy", { locale: bn })}</span>
                          {p.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.location}</span>}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-foreground">৳{projTotal.toLocaleString("bn-BD")}</div>
                        <div className="text-[9px] text-muted-foreground">মোট বিল</div>
                        <ChevronDown className={cn("h-4 w-4 text-muted-foreground mt-1 mx-auto transition-transform duration-300", isOpen && "rotate-180")} />
                      </div>
                    </div>

                    {/* Mini summary tags */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/15">
                        প্রোডাকশন ৳{Number(p.total_budget).toLocaleString("bn-BD")}
                      </span>
                      {artTotals.count > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/15">
                          আর্টিস্ট ৳{artTotals.bill.toLocaleString("bn-BD")}
                          {artTotals.due > 0 && <span className="text-amber-400">(বাকি ৳{artTotals.due.toLocaleString("bn-BD")})</span>}
                        </span>
                      )}
                      {projExpenseTotal > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/15">
                          খরচ ৳{projExpenseTotal.toLocaleString("bn-BD")}
                        </span>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-5 space-y-4 border-t border-border/20 pt-4">
                          {/* Budget + Download */}
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                              <Wallet className="h-4 w-4 text-primary" /> বাজেট
                            </h4>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-[11px] h-8 rounded-xl border-border/50"
                              onClick={(e) => {
                                e.stopPropagation();
                                const arts = allProjectArtists.filter((a: any) => a.project_id === p.id);
                                const exps = allProjectExpenses.filter((e: any) => e.project_id === p.id);
                                downloadProjectBillPDF({
                                  projectName: p.name,
                                  projectDate: p.project_date,
                                  clientName: clientProfile?.name || "",
                                  companyName: clientProfile?.company || undefined,
                                  productionBudget: Number(p.total_budget || 0),
                                  productionPaid: projProductionPaid,
                                  artists: arts.map((a: any) => ({
                                    artist_name: a.artist_name,
                                    remuneration: Number(a.remuneration || 0),
                                    paid_amount: Number(a.paid_amount || 0),
                                  })),
                                  expenses: exps.map((e: any) => ({
                                    category: e.category,
                                    amount: Number(e.amount || 0),
                                    description: e.description || "",
                                    is_paid: e.is_paid,
                                    paid_amount: Number(e.paid_amount || 0),
                                  })),
                                });
                                toast({ title: "বিল ডাউনলোড হচ্ছে..." });
                              }}
                            >
                              <Download className="h-3.5 w-3.5" /> বিল ডাউনলোড
                            </Button>
                          </div>
                          <div className="rounded-xl bg-gradient-to-r from-sky-500/10 to-sky-500/5 border border-sky-500/15 p-4 text-center">
                            <div className="text-[10px] text-muted-foreground mb-0.5">প্রজেক্ট বাজেট</div>
                            <div className="text-xl font-bold text-sky-400">৳{Number(p.total_budget).toLocaleString("bn-BD")}</div>
                          </div>

                          <ClientArtistBilling
                            projectId={p.id}
                            clientProfileId={clientProfile.id}
                            clientName={clientProfile?.name || "ক্লায়েন্ট"}
                            projectName={p.name}
                          />
                          <ClientProjectExpenses
                            projectId={p.id}
                            clientProfileId={clientProfile.id}
                          />
                          <ClientSceneEditor projectId={p.id} scenes={scenes} onUpdate={() => refetchScenes()} />
                          <ClientProjectScript
                            projectId={p.id}
                            userId={user!.id}
                            initialScript={p.client_script}
                            initialImages={Array.isArray(p.client_script_images) ? p.client_script_images : []}
                            onUpdate={() => {}}
                          />

                          {p.notes && (
                            <p className="text-[11px] text-muted-foreground italic border-t border-border/15 pt-3">
                              📝 নোট: {p.notes}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
          </>
        )}

        {/* ═══ Client Bottom Nav ═══ */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-card/95 backdrop-blur-xl border-t border-border/20" />
          <div className="relative flex items-center justify-around px-2 py-2 pb-safe-bottom">
            <button
              onClick={() => dashboardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl active:scale-90 transition-transform"
            >
              <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="text-[10px] font-semibold text-primary">ড্যাশবোর্ড</span>
            </button>
            <button
              onClick={() => { setShowPaymentHistory(true); setTimeout(() => paymentHistoryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100); }}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl active:scale-90 transition-transform"
            >
              <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <History className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-[10px] font-semibold text-emerald-400">পেমেন্ট হিস্ট্রি</span>
            </button>
            <button
              onClick={() => projectsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl active:scale-90 transition-transform"
            >
              <div className="h-8 w-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
                <FileText className="h-4 w-4 text-violet-400" />
              </div>
              <span className="text-[10px] font-semibold text-violet-400">বিল লিস্ট</span>
            </button>
          </div>
        </nav>
      </div>
      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent className="rounded-2xl border-border/50 bg-card max-w-[340px]">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center text-base font-bold text-foreground">
              পেমেন্ট রিভার্স করবেন?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-xs text-muted-foreground">
              {deleteConfirm?.type === "derived"
                ? `৳${deleteConfirm?.rec?.amount?.toLocaleString("bn-BD") || "০"} — ${deleteConfirm?.rec?.label || ""} এর পেমেন্ট রিভার্স হবে এবং স্ট্যাটাস "বাকি" হয়ে যাবে।`
                : `৳${Number(deleteConfirm?.rec?.amount || 0).toLocaleString("bn-BD")} পেমেন্ট ডিলিট হলে টাকা ফেরত যাবে।`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:justify-center">
            <AlertDialogCancel disabled={isDeleting} className="flex-1 rounded-xl text-xs h-9">
              বাতিল
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="flex-1 rounded-xl text-xs h-9 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={async (e) => {
                e.preventDefault();
                if (!deleteConfirm) return;
                setIsDeleting(true);
                try {
                  if (deleteConfirm.type === "derived") {
                    const rec = deleteConfirm.rec;
                    const realId = rec.id.replace(/^(artist|expense)-/, "");
                    if (rec.type === "artist") {
                      await (supabase as any).from("client_project_artists")
                        .update({ paid_amount: 0, is_paid: false }).eq("id", realId);
                    } else {
                      await (supabase as any).from("client_project_expenses")
                        .update({ paid_amount: 0, is_paid: false }).eq("id", realId);
                    }
                    toast({ title: "পেমেন্ট রিভার্স করা হয়েছে ✓" });
                  } else {
                    const ph = deleteConfirm.rec;
                    const details = ph.details || {};
                    if (ph.payment_type === "artist" && details.updates) {
                      for (const upd of details.updates) {
                        const { data: current } = await (supabase as any)
                          .from("client_project_artists").select("paid_amount, remuneration").eq("id", upd.id).single();
                        if (current) {
                          const newPaid = Math.max(0, Number(current.paid_amount || 0) - Number(upd.amount || 0));
                          await (supabase as any).from("client_project_artists")
                            .update({ paid_amount: newPaid, is_paid: newPaid >= Number(current.remuneration || 0) }).eq("id", upd.id);
                        }
                      }
                    } else if (ph.payment_type === "expense") {
                      if (details.updates && Array.isArray(details.updates)) {
                        for (const upd of details.updates) {
                          const { data: current } = await (supabase as any)
                            .from("client_project_expenses").select("paid_amount, amount").eq("id", upd.id).single();
                          if (current) {
                            const newPaid = Math.max(0, Number(current.paid_amount || 0) - Number(upd.amount || 0));
                            await (supabase as any).from("client_project_expenses")
                              .update({ paid_amount: newPaid, is_paid: newPaid >= Number(current.amount || 0) }).eq("id", upd.id);
                          }
                        }
                      } else if (details.expense_ids) {
                        for (const eid of details.expense_ids) {
                          await (supabase as any).from("client_project_expenses")
                            .update({ is_paid: false, paid_amount: 0 }).eq("id", eid);
                        }
                      }
                    }
                    await (supabase as any).from("client_payment_history").delete().eq("id", ph.id);
                    toast({ title: "পেমেন্ট ডিলিট ও রিভার্স করা হয়েছে" });
                    queryClient.invalidateQueries({ queryKey: ["client-payment-history"] });
                  }
                  queryClient.invalidateQueries({ queryKey: ["all-client-project-artists"] });
                  queryClient.invalidateQueries({ queryKey: ["client-project-artists"] });
                  queryClient.invalidateQueries({ queryKey: ["all-client-project-expenses"] });
                  queryClient.invalidateQueries({ queryKey: ["client-project-expenses"] });
                } catch (err: any) {
                  toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
                } finally {
                  setIsDeleting(false);
                  setDeleteConfirm(null);
                }
              }}
            >
              {isDeleting ? "প্রসেসিং..." : "রিভার্স করুন"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {historyReceiptData && (
        <ClientPaymentReceipt
          receiptData={historyReceiptData}
          onClose={() => setHistoryReceiptData(null)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Bill Download Dialog (unchanged logic)
   ═══════════════════════════════════════════ */
function BillDownloadDialog({ projects, allProjectArtists, allPayments, allProjectExpenses, clientProfile }: {
  projects: any[]; allProjectArtists: any[]; allPayments: any[]; allProjectExpenses: any[]; clientProfile: any;
}) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) { setSelectedIds(new Set(projects.map((p: any) => p.id))); setDateFrom(undefined); setDateTo(undefined); }
    setOpen(isOpen);
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((p: any) => {
      if (!selectedIds.has(p.id)) return false;
      const pDate = new Date(p.project_date);
      if (dateFrom && pDate < dateFrom) return false;
      if (dateTo) { const end = new Date(dateTo); end.setHours(23, 59, 59); if (pDate > end) return false; }
      return true;
    });
  }, [projects, selectedIds, dateFrom, dateTo]);

  const toggleProject = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleAll = () => { selectedIds.size === projects.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(projects.map((p: any) => p.id))); };

  const handleDownload = () => {
    if (filteredProjects.length === 0) { toast({ title: "কোনো প্রজেক্ট সিলেক্ট করা হয়নি", variant: "destructive" }); return; }
    const billData = filteredProjects.map((p: any) => {
      const arts = allProjectArtists.filter((a: any) => a.project_id === p.id);
      const exps = allProjectExpenses.filter((e: any) => e.project_id === p.id);
      const projPaid = allPayments.filter((pay: any) => pay.project_id === p.id).reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0);
      return {
        projectName: p.name, projectDate: p.project_date, clientName: clientProfile?.name || "",
        productionBudget: Number(p.total_budget || 0), productionPaid: projPaid,
        artists: arts.map((a: any) => ({ artist_name: a.artist_name, remuneration: Number(a.remuneration || 0), paid_amount: Number(a.paid_amount || 0) })),
        expenses: exps.map((e: any) => ({ category: e.category, amount: Number(e.amount || 0), description: e.description || "", is_paid: e.is_paid, paid_amount: Number(e.paid_amount || 0) })),
      };
    });
    downloadAllProjectsBillPDF({ clientName: clientProfile?.name || "প্রজেক্ট ডিরেক্টর", company: clientProfile?.company || undefined, projects: billData });
    toast({ title: `${filteredProjects.length} টি প্রজেক্টের বিল ডাউনলোড হচ্ছে...` });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <button className="h-full flex flex-col items-center justify-center gap-1.5 px-5 py-3.5 rounded-2xl bg-card/80 border border-border/40 hover:border-primary/30 transition-colors">
          <Download className="h-5 w-5 text-primary" />
          <span className="text-[10px] text-muted-foreground font-medium">বিল ডাউনলোড</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[360px] max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">বিল ডাউনলোড ফিল্টার</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">তারিখ ফিল্টার</p>
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("text-xs justify-start rounded-xl", !dateFrom && "text-muted-foreground")}>
                  <Calendar className="h-3 w-3 mr-1" />
                  {dateFrom ? format(dateFrom, "d MMM yy", { locale: bn }) : "শুরু তারিখ"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("text-xs justify-start rounded-xl", !dateTo && "text-muted-foreground")}>
                  <Calendar className="h-3 w-3 mr-1" />
                  {dateTo ? format(dateTo, "d MMM yy", { locale: bn }) : "শেষ তারিখ"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
              তারিখ ফিল্টার সরান
            </Button>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">প্রজেক্ট সিলেক্ট করুন</p>
            <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={toggleAll}>
              {selectedIds.size === projects.length ? "সব বাদ" : "সব সিলেক্ট"}
            </Button>
          </div>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {projects.map((p: any) => (
              <label key={p.id} className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-secondary/50 cursor-pointer">
                <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleProject(p.id)} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground">{format(new Date(p.project_date), "d MMM yyyy", { locale: bn })}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="pt-2 border-t border-border space-y-2">
          <p className="text-xs text-muted-foreground">
            সিলেক্টেড: <span className="font-bold text-foreground">{filteredProjects.length}</span> / {projects.length} প্রজেক্ট
          </p>
          <Button className="w-full gap-2 rounded-xl" onClick={handleDownload} disabled={filteredProjects.length === 0}>
            <Download className="h-4 w-4" /> বিল ডাউনলোড করুন ({filteredProjects.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════
   Payment Dialog (unchanged logic)
   ═══════════════════════════════════════════ */
function PaymentDialog({ allProjectArtists, allPayments, projects, clientName, clientProfileId, companyName, totalBudget, totalProductionPaid, allProjectExpenses }: {
  allProjectArtists: any[]; allPayments: any[]; projects: any[]; clientName: string; clientProfileId: string; companyName: string; totalBudget: number; totalProductionPaid: number; allProjectExpenses: any[];
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"choose" | "artist" | "production" | "expense">("choose");
  const [selectedArtistName, setSelectedArtistName] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [receiptData, setReceiptData] = useState<any>(null);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) { setStep("choose"); setSelectedArtistName(null); setPayAmount(""); }
    setOpen(isOpen);
  };

  const artistsByName = useMemo(() => {
    const map = new Map<string, { name: string; entries: any[]; totalBill: number; totalPaid: number; totalDue: number }>();
    allProjectArtists.forEach((a: any) => {
      const rem = Number(a.remuneration || 0); const paid = Number(a.paid_amount || 0); const due = rem - paid;
      if (due <= 0) return;
      const existing = map.get(a.artist_name) || { name: a.artist_name, entries: [], totalBill: 0, totalPaid: 0, totalDue: 0 };
      existing.entries.push(a); existing.totalBill += rem; existing.totalPaid += paid; existing.totalDue += due;
      map.set(a.artist_name, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.totalDue - a.totalDue);
  }, [allProjectArtists]);

  const productionProjectGroups = useMemo(() => {
    return projects.map((p: any) => {
      const paid = allPayments.filter((pay: any) => pay.project_id === p.id).reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0);
      const due = Number(p.total_budget || 0) - paid;
      return { project: p, paid, due };
    }).filter((g) => g.due > 0);
  }, [projects, allPayments]);

  const totalArtistDue = artistsByName.reduce((s, g) => s + g.totalDue, 0);
  const totalProductionDue = totalBudget - totalProductionPaid;
  const totalExpenseDue = allProjectExpenses.filter((e: any) => !e.is_paid).reduce((s: number, e: any) => s + (Number(e.amount || 0) - Number(e.paid_amount || 0)), 0);
  const selectedGroup = selectedArtistName ? artistsByName.find(g => g.name === selectedArtistName) : null;

  const expensesByProject = useMemo(() => {
    const dueExpenses = allProjectExpenses.filter((e: any) => !e.is_paid);
    const map = new Map<string, { project: any; expenses: any[]; totalDue: number }>();
    dueExpenses.forEach((e: any) => {
      const proj = projects.find((p: any) => p.id === e.project_id);
      const existing = map.get(e.project_id) || { project: proj, expenses: [], totalDue: 0 };
      existing.expenses.push(e);
      existing.totalDue += Number(e.amount || 0) - Number(e.paid_amount || 0);
      map.set(e.project_id, existing);
    });
    return Array.from(map.values());
  }, [allProjectExpenses, projects]);

  const [expensePayMode, setExpensePayMode] = useState<"select" | "custom">("select");
  const [customExpenseAmount, setCustomExpenseAmount] = useState("");

  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set());

  const toggleExpense = (id: string) => {
    setSelectedExpenseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllExpenses = () => {
    const allIds = allProjectExpenses.filter((e: any) => !e.is_paid).map((e: any) => e.id);
    setSelectedExpenseIds(new Set(allIds));
  };

  const selectedExpenseTotal = allProjectExpenses
    .filter((e: any) => selectedExpenseIds.has(e.id))
    .reduce((s: number, e: any) => s + Math.max(0, Number(e.amount || 0) - Number(e.paid_amount || 0)), 0);

  const expensePayAmount = expensePayMode === "select" ? selectedExpenseTotal : Number(customExpenseAmount || 0);

  const fetchLatestExpenses = async () => {
    const { data, error } = await (supabase as any)
      .from("client_project_expenses")
      .select("*")
      .eq("client_profile_id", clientProfileId)
      .order("created_at");

    if (error) throw error;
    return data || [];
  };

  const handlePayExpenses = async () => {
    if (expensePayMode === "select") {
      if (selectedExpenseIds.size === 0) { toast({ title: "খরচ সিলেক্ট করুন", variant: "destructive" }); return; }
      try {
        const latestExpenses = await fetchLatestExpenses();
        const selectedExpenses = latestExpenses
          .filter((e: any) => selectedExpenseIds.has(e.id))
          .map((e: any) => ({
            id: e.id,
            amount: Number(e.amount || 0),
            dueAmount: Math.max(0, Number(e.amount || 0) - Number(e.paid_amount || 0)),
          }))
          .filter((e: any) => e.dueAmount > 0);

        if (selectedExpenses.length === 0) {
          toast({ title: "সিলেক্ট করা খরচে বাকি নেই", variant: "destructive" });
          return;
        }

        for (const exp of selectedExpenses) {
          const { error } = await (supabase as any)
            .from("client_project_expenses")
            .update({ is_paid: true, paid_amount: exp.amount })
            .eq("id", exp.id);
          if (error) throw error;
        }

        const paidNowTotal = selectedExpenses.reduce((s: number, e: any) => s + e.dueAmount, 0);

        toast({ title: `৳${paidNowTotal.toLocaleString("bn-BD")} খরচ পেইড করা হয়েছে ✓` });
        await (supabase as any).from("client_payment_history").insert({
          client_profile_id: clientProfileId,
          payment_type: "expense",
          amount: paidNowTotal,
          details: {
            expense_ids: selectedExpenses.map((e: any) => e.id),
            expense_count: selectedExpenses.length,
            updates: selectedExpenses.map((e: any) => ({ id: e.id, amount: e.dueAmount })),
          },
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["all-client-project-expenses"] }),
          queryClient.invalidateQueries({ queryKey: ["client-project-expenses"] }),
          queryClient.invalidateQueries({ queryKey: ["client-payment-history"] }),
        ]);
        setSelectedExpenseIds(new Set());
        setStep("choose");
      } catch (err: any) { toast({ title: "ত্রুটি", description: err.message, variant: "destructive" }); }
    } else {
      const amount = Number(customExpenseAmount || 0);
      if (amount <= 0) { toast({ title: "পরিমাণ দিন", variant: "destructive" }); return; }
      try {
        const latestExpenses = await fetchLatestExpenses();
        const dueExpenses = latestExpenses
          .filter((e: any) => Math.max(0, Number(e.amount || 0) - Number(e.paid_amount || 0)) > 0)
          .sort((a: any, b: any) => (a.created_at || "").localeCompare(b.created_at || ""));
        let remaining = amount;
        const updates: { id: string; newPaid: number; isPaid: boolean; expAmount: number }[] = [];
        for (const exp of dueExpenses) {
          if (remaining <= 0) break;
          const expAmount = Number(exp.amount || 0);
          const alreadyPaid = Number(exp.paid_amount || 0);
          const due = expAmount - alreadyPaid;
          if (due <= 0) continue;
          const payNow = Math.min(remaining, due);
          const newPaid = alreadyPaid + payNow;
          const isPaid = newPaid >= expAmount;
          updates.push({ id: exp.id, newPaid, isPaid, expAmount: payNow });
          remaining -= payNow;
        }
        if (updates.length === 0) { toast({ title: "এই পরিমাণে কোনো খরচ পেইড করা যায় না", variant: "destructive" }); return; }

        for (const upd of updates) {
          const { error } = await (supabase as any).from("client_project_expenses").update({ paid_amount: upd.newPaid, is_paid: upd.isPaid }).eq("id", upd.id);
          if (error) throw error;
        }
        toast({ title: `৳${amount.toLocaleString("bn-BD")} খরচ পেইড করা হয়েছে ✓ (${updates.length} টি আইটেম)` });
        await (supabase as any).from("client_payment_history").insert({
          client_profile_id: clientProfileId,
          payment_type: "expense",
          amount: amount,
          details: { expense_ids: updates.map(u => u.id), expense_count: updates.length, updates: updates.map(u => ({ id: u.id, amount: u.expAmount })) },
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["all-client-project-expenses"] }),
          queryClient.invalidateQueries({ queryKey: ["client-project-expenses"] }),
          queryClient.invalidateQueries({ queryKey: ["client-payment-history"] }),
        ]);
        setCustomExpenseAmount("");
        setStep("choose");
      } catch (err: any) { toast({ title: "ত্রুটি", description: err.message, variant: "destructive" }); }
    }
  };

  const handlePayArtist = async () => {
    if (!selectedGroup) return;
    const amount = Number(payAmount || 0);
    if (amount <= 0) { toast({ title: "পরিমাণ দিন", variant: "destructive" }); return; }
    const sorted = [...selectedGroup.entries].sort((a, b) => {
      const dateA = projects.find((p: any) => p.id === a.project_id)?.project_date || "";
      const dateB = projects.find((p: any) => p.id === b.project_id)?.project_date || "";
      return dateA.localeCompare(dateB);
    });
    let remaining = amount;
    const updates: { id: string; newPaid: number; isPaid: boolean; projectName: string; amount: number }[] = [];
    for (const entry of sorted) {
      if (remaining <= 0) break;
      const rem = Number(entry.remuneration || 0); const paid = Number(entry.paid_amount || 0); const due = rem - paid;
      if (due <= 0) continue;
      const payNow = Math.min(remaining, due); const newPaid = paid + payNow; const isPaid = newPaid >= rem;
      const projName = projects.find((p: any) => p.id === entry.project_id)?.name || "";
      updates.push({ id: entry.id, newPaid, isPaid, projectName: projName, amount: payNow });
      remaining -= payNow;
    }
    try {
      for (const upd of updates) {
        const { error } = await (supabase as any).from("client_project_artists").update({ paid_amount: upd.newPaid, is_paid: upd.isPaid }).eq("id", upd.id);
        if (error) throw error;
      }
      toast({ title: `৳${amount.toLocaleString("bn-BD")} পেমেন্ট সম্পন্ন ✓` });
      // Record payment history
      await (supabase as any).from("client_payment_history").insert({
        client_profile_id: clientProfileId,
        payment_type: "artist",
        amount,
        details: {
          artist_name: selectedGroup.name,
          updates: updates.map(u => ({ id: u.id, amount: u.amount, projectName: u.projectName })),
        },
      });
      setReceiptData({
        artistName: selectedGroup.name, projectName: updates.map(u => u.projectName).join(", "),
        clientName, companyName, amount, totalRemuneration: selectedGroup.totalBill,
        totalPaid: selectedGroup.totalPaid + amount, remaining: selectedGroup.totalDue - amount,
        date: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["all-client-project-artists", clientProfileId] });
      queryClient.invalidateQueries({ queryKey: ["client-project-artists"] });
      queryClient.invalidateQueries({ queryKey: ["client-payment-history"] });
      setSelectedArtistName(null); setPayAmount(""); setStep("artist");
    } catch (err: any) { toast({ title: "ত্রুটি", description: err.message, variant: "destructive" }); }
  };

  const goBack = () => { if (selectedArtistName) { setSelectedArtistName(null); setPayAmount(""); } else { setStep("choose"); setSelectedExpenseIds(new Set()); } };

  const paymentPreview = useMemo(() => {
    if (!selectedGroup || Number(payAmount || 0) <= 0) return [];
    const sorted = [...selectedGroup.entries].sort((a: any, b: any) => {
      const dateA = projects.find((p: any) => p.id === a.project_id)?.project_date || "";
      const dateB = projects.find((p: any) => p.id === b.project_id)?.project_date || "";
      return dateA.localeCompare(dateB);
    });
    let rem = Number(payAmount || 0);
    const result: { projectName: string; amount: number; status: string }[] = [];
    for (const entry of sorted) {
      if (rem <= 0) break;
      const due = Number(entry.remuneration || 0) - Number(entry.paid_amount || 0);
      if (due <= 0) continue;
      const payNow = Math.min(rem, due);
      const newPaid = Number(entry.paid_amount || 0) + payNow;
      const projName = projects.find((p: any) => p.id === entry.project_id)?.name || "";
      result.push({ projectName: projName, amount: payNow, status: newPaid >= Number(entry.remuneration || 0) ? "Paid" : "Partially Paid" });
      rem -= payNow;
    }
    return result;
  }, [selectedGroup, payAmount, projects]);

  return (
    <>
      {receiptData && <ClientArtistReceipt receiptData={receiptData} onClose={() => setReceiptData(null)} />}
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogTrigger asChild>
          <button className="w-full relative overflow-hidden rounded-2xl p-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            <div className="relative flex items-center justify-center gap-2">
              <CreditCard className="h-5 w-5" />
              <span className="text-base font-bold">পেমেন্ট করুন</span>
            </div>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-[400px] max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              {step !== "choose" && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg" onClick={goBack}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <CreditCard className="h-4 w-4 text-primary" />
              {step === "choose" && "পেমেন্ট ক্যাটাগরি বাছুন"}
              {step === "artist" && (selectedArtistName ? "পেমেন্ট করুন" : "মেম্বার বাছুন")}
              {step === "production" && "প্রোডাকশন পেমেন্ট"}
              {step === "expense" && "শুটিং খরচ পেমেন্ট"}
            </DialogTitle>
          </DialogHeader>

          {step === "choose" && (
            <div className="space-y-3">
              {totalArtistDue > 0 && (
                <button
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border/50 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all text-left group"
                  onClick={() => setStep("artist")}
                >
                  <div className="h-12 w-12 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">আর্টিস্ট / মেম্বার</div>
                    <div className="text-xs text-muted-foreground">বাকি আছে ৳{totalArtistDue.toLocaleString("bn-BD")}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-violet-400 transition-colors" />
                </button>
              )}
              {totalProductionDue > 0 && (
                <button
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border/50 hover:border-sky-500/40 hover:bg-sky-500/5 transition-all text-left group"
                  onClick={() => setStep("production")}
                >
                  <div className="h-12 w-12 rounded-xl bg-sky-500/15 flex items-center justify-center shrink-0">
                    <Banknote className="h-5 w-5 text-sky-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">প্রোডাকশন</div>
                    <div className="text-xs text-muted-foreground">বাকি আছে ৳{totalProductionDue.toLocaleString("bn-BD")}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-sky-400 transition-colors" />
                </button>
              )}
              {totalExpenseDue > 0 && (
                <button
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border/50 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all text-left group"
                  onClick={() => { setStep("expense"); selectAllExpenses(); }}
                >
                  <div className="h-12 w-12 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
                    <Receipt className="h-5 w-5 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">শুটিং খরচ</div>
                    <div className="text-xs text-muted-foreground">বাকি আছে ৳{totalExpenseDue.toLocaleString("bn-BD")}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-orange-400 transition-colors" />
                </button>
              )}
            </div>
          )}

          {step === "artist" && !selectedArtistName && (
            <div className="space-y-2">
              {artistsByName.map((group) => {
                const paidPct = group.totalBill > 0 ? Math.round((group.totalPaid / group.totalBill) * 100) : 0;
                return (
                  <button
                    key={group.name}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border/40 hover:border-primary/30 hover:bg-secondary/20 transition-all text-left"
                    onClick={() => { setSelectedArtistName(group.name); setPayAmount(String(group.totalDue)); }}
                  >
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/15 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {group.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{group.name}</div>
                      <div className="text-[10px] text-muted-foreground">{group.entries.length} টি প্রজেক্ট • ৳{group.totalBill.toLocaleString("bn-BD")}</div>
                      <div className="w-full h-1.5 bg-secondary/50 rounded-full mt-1.5">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${paidPct}%` }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-amber-400">৳{group.totalDue.toLocaleString("bn-BD")}</div>
                      <div className="text-[9px] text-muted-foreground">বাকি</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step === "artist" && selectedGroup && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/40 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/15 flex items-center justify-center text-lg font-bold text-primary">
                    {selectedGroup.name?.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{selectedGroup.name}</div>
                    <div className="text-[11px] text-muted-foreground">{selectedGroup.entries.length} টি প্রজেক্টে কাজ করেছেন</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-secondary/30 p-2.5">
                    <div className="text-[9px] text-muted-foreground">মোট বিল</div>
                    <div className="text-sm font-bold text-foreground">৳{selectedGroup.totalBill.toLocaleString("bn-BD")}</div>
                  </div>
                  <div className="rounded-xl bg-emerald-500/8 p-2.5">
                    <div className="text-[9px] text-emerald-400/70">পেইড</div>
                    <div className="text-sm font-bold text-emerald-400">৳{selectedGroup.totalPaid.toLocaleString("bn-BD")}</div>
                  </div>
                  <div className="rounded-xl bg-amber-500/8 p-2.5">
                    <div className="text-[9px] text-amber-400/70">বাকি</div>
                    <div className="text-sm font-bold text-amber-400">৳{selectedGroup.totalDue.toLocaleString("bn-BD")}</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-[10px] font-medium text-muted-foreground">প্রজেক্ট ভিত্তিক বিল:</div>
                  {selectedGroup.entries.map((entry: any) => {
                    const rem = Number(entry.remuneration || 0); const paid = Number(entry.paid_amount || 0);
                    const projName = projects.find((p: any) => p.id === entry.project_id)?.name || "";
                    return (
                      <div key={entry.id} className="flex items-center justify-between text-[11px] px-3 py-2 rounded-lg bg-secondary/15">
                        <span className="text-foreground truncate mr-2">{projName}</span>
                        <span className="text-amber-400 shrink-0 font-medium">বাকি ৳{(rem - paid).toLocaleString("bn-BD")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">পেমেন্ট পরিমাণ</label>
                <div className="flex gap-2">
                  <Input type="number" placeholder="৳ পরিমাণ লিখুন" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} min={0} max={selectedGroup.totalDue} className="flex-1 rounded-xl" />
                  <Button variant="outline" size="sm" className="text-xs shrink-0 rounded-xl" onClick={() => setPayAmount(String(selectedGroup.totalDue))}>সম্পূর্ণ</Button>
                </div>
              </div>
              {paymentPreview.length > 0 && (
                <div className="rounded-xl border border-border/40 p-3.5 space-y-1.5">
                  <div className="text-[10px] font-medium text-muted-foreground">পেমেন্ট বিতরণ প্রিভিউ:</div>
                  {paymentPreview.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px]">
                      <span className="text-foreground truncate mr-2">{p.projectName}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-foreground font-medium">৳{p.amount.toLocaleString("bn-BD")}</span>
                        <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0",
                          p.status === "Paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        )}>{p.status === "Paid" ? "পেইড" : "আংশিক"}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Button className="w-full gap-2 rounded-xl h-12 text-base font-semibold" onClick={handlePayArtist} disabled={Number(payAmount) <= 0}>
                <Banknote className="h-4 w-4" /> ৳{Number(payAmount || 0).toLocaleString("bn-BD")} পেমেন্ট করুন
              </Button>
            </div>
          )}

          {step === "production" && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-border/40 p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-secondary/30 p-2.5">
                    <div className="text-[9px] text-muted-foreground">মোট বিল</div>
                    <div className="text-sm font-bold text-foreground">৳{totalBudget.toLocaleString("bn-BD")}</div>
                  </div>
                  <div className="rounded-xl bg-emerald-500/8 p-2.5">
                    <div className="text-[9px] text-emerald-400/70">পেইড</div>
                    <div className="text-sm font-bold text-emerald-400">৳{totalProductionPaid.toLocaleString("bn-BD")}</div>
                  </div>
                  <div className="rounded-xl bg-amber-500/8 p-2.5">
                    <div className="text-[9px] text-amber-400/70">বাকি</div>
                    <div className="text-sm font-bold text-amber-400">৳{totalProductionDue.toLocaleString("bn-BD")}</div>
                  </div>
                </div>
              </div>
              {productionProjectGroups.map(({ project, paid, due }) => (
                <div key={project.id} className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/15 border border-border/20">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{project.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      বাজেট: ৳{Number(project.total_budget).toLocaleString("bn-BD")} • পেইড: ৳{paid.toLocaleString("bn-BD")}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-amber-400 shrink-0">৳{due.toLocaleString("bn-BD")}</div>
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground italic text-center pt-1">প্রোডাকশন পেমেন্ট অ্যাডমিন দ্বারা পরিচালিত হয়</p>
            </div>
          )}

          {step === "expense" && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-border/40 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-amber-500/8 p-2.5">
                    <div className="text-[9px] text-amber-400/70">মোট বাকি</div>
                    <div className="text-sm font-bold text-amber-400">৳{totalExpenseDue.toLocaleString("bn-BD")}</div>
                  </div>
                  <div className="rounded-xl bg-emerald-500/8 p-2.5">
                    <div className="text-[9px] text-emerald-400/70">{expensePayMode === "select" ? "সিলেক্টেড" : "কাস্টম"}</div>
                    <div className="text-sm font-bold text-emerald-400">৳{expensePayAmount.toLocaleString("bn-BD")}</div>
                  </div>
                </div>
              </div>

              {/* Mode toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setExpensePayMode("select")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all ${
                    expensePayMode === "select"
                      ? "bg-primary/15 border-primary/30 text-primary"
                      : "bg-secondary/30 border-border/30 text-muted-foreground"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> আইটেম সিলেক্ট
                </button>
                <button
                  type="button"
                  onClick={() => setExpensePayMode("custom")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all ${
                    expensePayMode === "custom"
                      ? "bg-primary/15 border-primary/30 text-primary"
                      : "bg-secondary/30 border-border/30 text-muted-foreground"
                  }`}
                >
                  <Banknote className="h-3.5 w-3.5" /> কাস্টম টাকা
                </button>
              </div>

              {expensePayMode === "custom" && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">পেমেন্ট পরিমাণ</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="৳ পরিমাণ লিখুন"
                      value={customExpenseAmount}
                      onChange={(e) => setCustomExpenseAmount(e.target.value)}
                      min={0}
                      max={totalExpenseDue}
                      className="flex-1 rounded-xl"
                    />
                    <Button variant="outline" size="sm" className="text-xs shrink-0 rounded-xl" onClick={() => setCustomExpenseAmount(String(totalExpenseDue))}>সম্পূর্ণ</Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">পুরনো খরচ থেকে শুরু করে যতটুকু সম্ভব পেইড হবে</p>
                </div>
              )}

              {expensePayMode === "select" && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">বাকি খরচসমূহ সিলেক্ট করুন</span>
                    <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2" onClick={selectAllExpenses}>সব সিলেক্ট</Button>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {expensesByProject.map(({ project, expenses, totalDue }) => (
                      <div key={project?.id || "unknown"} className="rounded-xl border border-border/30 overflow-hidden">
                        <div className="px-3 py-2 bg-secondary/20 text-xs font-medium text-foreground flex items-center justify-between">
                          <span className="truncate">{project?.name || "অজানা প্রজেক্ট"}</span>
                          <span className="text-amber-400 shrink-0 ml-2">৳{totalDue.toLocaleString("bn-BD")}</span>
                        </div>
                        <div className="divide-y divide-border/20">
                          {expenses.map((exp: any) => {
                            const catLabel: Record<string, string> = { food: "🍛 খাবার", costume: "👔 কস্টিউম", transport: "🚌 যাতায়াত" };
                            return (
                              <label key={exp.id} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-secondary/30 cursor-pointer">
                                <Checkbox checked={selectedExpenseIds.has(exp.id)} onCheckedChange={() => toggleExpense(exp.id)} />
                                <div className="flex-1 min-w-0">
                                  <div className="text-[11px] font-medium text-foreground">{catLabel[exp.category] || exp.category}</div>
                                  {exp.description && <div className="text-[10px] text-muted-foreground truncate">{exp.description}</div>}
                                </div>
                                <span className="text-xs font-semibold text-foreground shrink-0">৳{Number(exp.amount).toLocaleString("bn-BD")}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <Button
                className="w-full gap-2 rounded-xl h-12 text-base font-semibold"
                onClick={handlePayExpenses}
                disabled={expensePayMode === "select" ? selectedExpenseIds.size === 0 : expensePayAmount <= 0}
              >
                <Banknote className="h-4 w-4" /> ৳{expensePayAmount.toLocaleString("bn-BD")} পেইড করুন
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
