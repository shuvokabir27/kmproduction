import { useAuth } from "@/hooks/useAuth";
import ClientBottomNav from "@/components/ClientBottomNav";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Calendar, MapPin, FileText, Wallet, Download, ChevronDown, ChevronLeft, Users, Receipt, Film, ScrollText, Search, X, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, subMonths, isAfter, startOfDay, endOfDay, parseISO } from "date-fns";
import { bn } from "date-fns/locale";
import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { motion, AnimatePresence } from "framer-motion";
import { ClientProjectScript } from "@/components/ClientProjectScript";
import { ClientSceneEditor } from "@/components/ClientSceneEditor";
import { ClientArtistBilling } from "@/components/ClientArtistBilling";
import { ClientProjectExpenses } from "@/components/ClientProjectExpenses";
import { downloadProjectBillPDF } from "@/lib/billPdf";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  upcoming: { label: "আসন্ন", color: "text-sky-400", bg: "bg-sky-500/15 border-sky-500/20" },
  ongoing: { label: "চলছে", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/20" },
  completed: { label: "সম্পন্ন", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/20" },
  paid: { label: "পেইড", color: "text-violet-400", bg: "bg-violet-500/15 border-violet-500/20" },
};

export default function ClientProjects() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);

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

  const oneMonthAgo = useMemo(() => subMonths(new Date(), 1), []);
  const isSearchActive = searchText.trim() !== "" || !!filterDate;

  const filteredProjects = useMemo(() => {
    let list = projects as any[];
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter((p: any) =>
        p.name?.toLowerCase().includes(q) ||
        p.client_name?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q)
      );
    }
    if (filterDate) {
      const dStr = format(filterDate, "yyyy-MM-dd");
      list = list.filter((p: any) => p.project_date === dStr);
    }
    if (!isSearchActive && !showAll) {
      list = list.filter((p: any) => {
        try {
          return isAfter(parseISO(p.project_date), startOfDay(oneMonthAgo));
        } catch { return true; }
      });
    }
    return list;
  }, [projects, searchText, filterDate, showAll, isSearchActive, oneMonthAgo]);

  const hasMoreProjects = !isSearchActive && !showAll && filteredProjects.length < projects.length;

  const getScenes = (pid: string) => allScenes.filter((s: any) => s.project_id === pid);
  const getProjectExpenseTotal = (pid: string) => {
    return allProjectExpenses.filter((e: any) => e.project_id === pid).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  };
  const getProjectArtistTotals = (pid: string) => {
    const arts = allProjectArtists.filter((a: any) => a.project_id === pid);
    const bill = arts.reduce((s: number, a: any) => s + Number(a.remuneration || 0), 0);
    const paid = arts.reduce((s: number, a: any) => s + Number(a.paid_amount || 0), 0);
    return { bill, paid, due: bill - paid, count: arts.length };
  };

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 rounded-xl"
            onClick={() => navigate("/client")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-bold text-foreground flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-primary" /> আপনার প্রজেক্ট সমূহ
          </h1>
          <Badge variant="outline" className="ml-auto text-[10px] px-2 py-0.5 border-primary/20 text-primary">
            {projects.length}টি
          </Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 space-y-3 pb-24 md:pb-8">
        {/* Search & Filter Bar */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="নাম দিয়ে খুঁজুন..."
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setShowAll(true); }}
              className="pl-8 h-9 text-sm rounded-xl bg-secondary/30 border-border/30"
            />
            {searchText && (
              <button onClick={() => setSearchText("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("h-9 gap-1.5 rounded-xl text-xs border-border/30", filterDate && "border-primary/40 text-primary")}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                {filterDate ? format(filterDate, "d MMM", { locale: bn }) : "তারিখ"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarPicker
                mode="single"
                selected={filterDate}
                onSelect={(d) => { setFilterDate(d); if (d) setShowAll(true); }}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
              {filterDate && (
                <div className="px-3 pb-3">
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setFilterDate(undefined)}>
                    ফিল্টার মুছুন
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {!isSearchActive && !showAll && (
          <p className="text-[10px] text-muted-foreground text-center">শেষ ১ মাসের প্রজেক্ট দেখাচ্ছে</p>
        )}

        {filteredProjects.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-primary/50" />
            </div>
            <p className="text-muted-foreground text-sm">{isSearchActive ? "কোনো ফলাফল পাওয়া যায়নি" : "কোনো প্রজেক্ট নেই"}</p>
          </div>
        ) : (
          <>
          {filteredProjects.map((p: any, pIdx: number) => {
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
                      <div className="px-4 pb-5 space-y-3 border-t border-border/20 pt-4">
                        {/* বাজেট হেডার ও ডাউনলোড */}
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
                              const exps = allProjectExpenses.filter((ex: any) => ex.project_id === p.id);
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
                                expenses: exps.map((ex: any) => ({
                                  category: ex.category,
                                  amount: Number(ex.amount || 0),
                                  description: ex.description || "",
                                  is_paid: ex.is_paid,
                                  paid_amount: Number(ex.paid_amount || 0),
                                })),
                              });
                              toast({ title: "বিল ডাউনলোড হচ্ছে..." });
                            }}
                          >
                            <Download className="h-3.5 w-3.5" /> বিল ডাউনলোড
                          </Button>
                        </div>
                        <ProjectBudgetSummary
                          productionBudget={Number(p.total_budget)}
                          productionPaid={projProductionPaid}
                          artistBill={artTotals.bill}
                          artistPaid={artTotals.paid}
                          expenseTotal={projExpenseTotal}
                          expensesPaidTotal={allProjectExpenses.filter((e: any) => e.project_id === p.id).reduce((s: number, e: any) => s + Number(e.paid_amount || 0), 0)}
                          expenses={allProjectExpenses.filter((e: any) => e.project_id === p.id)}
                        />

                        {/* ═══ আর্টিস্ট সেকশন (কলাপসিবল, ভায়োলেট) ═══ */}
                        <CollapsibleSection
                          icon={<Users className="h-4 w-4" />}
                          title="আর্টিস্ট লিস্ট"
                          badge={artTotals.count > 0 ? `${artTotals.count}জন` : undefined}
                          colorClass="violet"
                          defaultOpen={false}
                        >
                          <ClientArtistBilling
                            projectId={p.id}
                            clientProfileId={clientProfile.id}
                            clientName={clientProfile?.name || "ক্লায়েন্ট"}
                            projectName={p.name}
                          />
                        </CollapsibleSection>

                        {/* ═══ শুটিং খরচ (কলাপসিবল, অরেঞ্জ) ═══ */}
                        <CollapsibleSection
                          icon={<Receipt className="h-4 w-4" />}
                          title="শুটিং খরচ"
                          badge={projExpenseTotal > 0 ? `৳${projExpenseTotal.toLocaleString("bn-BD")}` : undefined}
                          colorClass="orange"
                          defaultOpen={false}
                        >
                          <ClientProjectExpenses
                            projectId={p.id}
                            clientProfileId={clientProfile.id}
                          />
                        </CollapsibleSection>

                        {/* ═══ সিন বাই সিন (কলাপসিবল, টিল) ═══ */}
                        <CollapsibleSection
                          icon={<Film className="h-4 w-4" />}
                          title="সিন বাই সিন লাইনআপ"
                          badge={scenes.length > 0 ? `${scenes.length}টি সিন` : undefined}
                          colorClass="teal"
                          defaultOpen={false}
                        >
                          <ClientSceneEditor projectId={p.id} scenes={scenes} onUpdate={() => refetchScenes()} />
                        </CollapsibleSection>

                        {/* ═══ স্ক্রিপ্ট (কলাপসিবল, ইন্ডিগো) ═══ */}
                        <CollapsibleSection
                          icon={<ScrollText className="h-4 w-4" />}
                          title="স্ক্রিপ্ট"
                          colorClass="indigo"
                          defaultOpen={false}
                        >
                          <ClientProjectScript
                            projectId={p.id}
                            userId={user!.id}
                            initialScript={p.client_script}
                            initialImages={Array.isArray(p.client_script_images) ? p.client_script_images : []}
                            onUpdate={() => {}}
                          />
                        </CollapsibleSection>

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

          {hasMoreProjects && (
            <Button
              variant="outline"
              className="w-full rounded-xl text-xs h-10 border-border/40 gap-1.5"
              onClick={() => setShowAll(true)}
            >
              <Briefcase className="h-3.5 w-3.5" /> সকল প্রজেক্ট দেখুন ({projects.length}টি)
            </Button>
          )}
          </>
        )}
      </div>
      <ClientBottomNav />
    </div>
  );
}

/* ═══ Project Budget Summary ═══ */
const expenseCategoryLabels: Record<string, string> = {
  food: "খাবার",
  costume: "কস্টিউম",
  transport: "যাতায়াত",
};

function ProjectBudgetSummary({ productionBudget, productionPaid, artistBill, artistPaid, expenseTotal, expensesPaidTotal, expenses }: {
  productionBudget: number;
  productionPaid: number;
  artistBill: number;
  artistPaid: number;
  expenseTotal: number;
  expensesPaidTotal: number;
  expenses: any[];
}) {
  const [open, setOpen] = useState(false);
  const grandTotal = productionBudget + artistBill + expenseTotal;
  const grandPaid = productionPaid + artistPaid + expensesPaidTotal;
  const grandDue = grandTotal - grandPaid;

  // expense breakdown by category
  const expByCategory: Record<string, number> = {};
  expenses.forEach((e: any) => {
    const cat = e.category || "other";
    expByCategory[cat] = (expByCategory[cat] || 0) + Number(e.amount || 0);
  });

  const sections = [
    { label: "প্রোডাকশন", total: productionBudget, paid: productionPaid, color: "sky" },
    { label: "আর্টিস্ট", total: artistBill, paid: artistPaid, color: "violet" },
    { label: "শুটিং খরচ", total: expenseTotal, paid: expensesPaidTotal, color: "orange" },
  ].filter(s => s.total > 0);

  return (
    <div className="rounded-xl border border-primary/20 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 active:opacity-80 transition-opacity bg-gradient-to-r from-primary/8 to-primary/3"
      >
        <div className="text-[10px] text-muted-foreground mb-1">সর্বমোট প্রজেক্ট বাজেট</div>
        <div className="text-2xl font-bold text-primary">৳{grandTotal.toLocaleString("bn-BD")}</div>
        <div className="flex items-center justify-center gap-3 mt-2">
          <span className="text-[10px] text-emerald-400">পেইড: ৳{grandPaid.toLocaleString("bn-BD")}</span>
          {grandDue > 0 && <span className="text-[10px] text-amber-400">বাকি: ৳{grandDue.toLocaleString("bn-BD")}</span>}
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/20">
              {sections.map(s => {
                const due = s.total - s.paid;
                const pct = s.total > 0 ? Math.round((s.total / grandTotal) * 100) : 0;
                return (
                  <div key={s.label} className="rounded-lg bg-secondary/20 p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">{s.label}</span>
                      <span className="text-xs font-bold text-foreground">৳{s.total.toLocaleString("bn-BD")} <span className="text-[9px] text-muted-foreground font-normal">({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary/40 overflow-hidden mb-1">
                      <div
                        className={cn("h-full rounded-full transition-all",
                          s.color === "sky" ? "bg-sky-400" : s.color === "violet" ? "bg-violet-400" : "bg-orange-400"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex gap-3 text-[10px]">
                      <span className="text-emerald-400">পেইড: ৳{s.paid.toLocaleString("bn-BD")}</span>
                      {due > 0 && <span className="text-amber-400">বাকি: ৳{due.toLocaleString("bn-BD")}</span>}
                    </div>
                    {/* শুটিং খরচের সাব-ক্যাটেগরি */}
                    {s.label === "শুটিং খরচ" && Object.keys(expByCategory).length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-border/15 space-y-0.5">
                        {Object.entries(expByCategory).map(([cat, amt]) => (
                          <div key={cat} className="flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground">{expenseCategoryLabels[cat] || cat}</span>
                            <span className="text-foreground font-medium">৳{amt.toLocaleString("bn-BD")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══ Collapsible Section Component ═══ */
const COLOR_MAP: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  violet: { bg: "from-violet-500/8 to-violet-500/3", border: "border-violet-500/20", text: "text-violet-400", iconBg: "bg-violet-500/15" },
  orange: { bg: "from-orange-500/8 to-orange-500/3", border: "border-orange-500/20", text: "text-orange-400", iconBg: "bg-orange-500/15" },
  teal: { bg: "from-teal-500/8 to-teal-500/3", border: "border-teal-500/20", text: "text-teal-400", iconBg: "bg-teal-500/15" },
  indigo: { bg: "from-indigo-500/8 to-indigo-500/3", border: "border-indigo-500/20", text: "text-indigo-400", iconBg: "bg-indigo-500/15" },
};

function CollapsibleSection({ icon, title, badge, colorClass, defaultOpen, children }: {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  colorClass: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const c = COLOR_MAP[colorClass] || COLOR_MAP.violet;

  return (
    <div className={cn("rounded-xl border overflow-hidden transition-all", c.border, `bg-gradient-to-r ${c.bg}`)}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left active:opacity-80 transition-opacity"
      >
        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", c.iconBg)}>
          <span className={c.text}>{icon}</span>
        </div>
        <span className="text-[13px] font-semibold text-foreground flex-1">{title}</span>
        {badge && (
          <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", c.border, c.text)}>
            {badge}
          </span>
        )}
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-1 pb-3 pt-0.5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
