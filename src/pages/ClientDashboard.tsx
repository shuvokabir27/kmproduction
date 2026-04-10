import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Calendar, MapPin, FileText, CheckCircle2, Clock, LogOut, Wallet, Users, Banknote, Download, Filter, CreditCard, ArrowRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClientProjectScript } from "@/components/ClientProjectScript";
import { ClientSceneEditor } from "@/components/ClientSceneEditor";
import { ClientArtistBilling } from "@/components/ClientArtistBilling";
import { downloadProjectBillPDF, downloadAllProjectsBillPDF } from "@/lib/billPdf";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import ClientArtistReceipt from "@/components/ClientArtistReceipt";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const statusMap: Record<string, { label: string; color: string }> = {
  upcoming: { label: "আসন্ন", color: "bg-sky-500/20 text-sky-400" },
  ongoing: { label: "চলছে", color: "bg-amber-500/20 text-amber-400" },
  completed: { label: "সম্পন্ন", color: "bg-emerald-500/20 text-emerald-400" },
  paid: { label: "পেইড", color: "bg-violet-500/20 text-violet-400" },
};

const paymentMethodLabel: Record<string, string> = {
  cash: "নগদ",
  bkash: "বিকাশ",
  nagad: "নগদ (নাগাদ)",
  bank: "ব্যাংক",
};

export default function ClientDashboard() {
  const { user, loading } = useAuth();
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

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

  // Fetch all artist billing data across all projects
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const getScenes = (pid: string) => allScenes.filter((s: any) => s.project_id === pid);

  // Production bill (what client pays to KMP)
  const totalBudget = projects.reduce((s: number, p: any) => s + Number(p.total_budget || 0), 0);
  const totalProductionPaid = allPayments.reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0);
  const productionDue = totalBudget - totalProductionPaid;

  // Artist bill totals
  const totalArtistBill = allProjectArtists.reduce((s: number, a: any) => s + Number(a.remuneration || 0), 0);
  const totalArtistPaid = allProjectArtists.reduce((s: number, a: any) => s + Number(a.paid_amount || 0), 0);
  const artistDue = totalArtistBill - totalArtistPaid;

  // Combined totals
  const grandTotal = totalBudget + totalArtistBill;
  const grandPaid = totalProductionPaid + totalArtistPaid;
  const grandDue = grandTotal - grandPaid;

  // Per-project artist totals helper
  const getProjectArtistTotals = (pid: string) => {
    const arts = allProjectArtists.filter((a: any) => a.project_id === pid);
    const bill = arts.reduce((s: number, a: any) => s + Number(a.remuneration || 0), 0);
    const paid = arts.reduce((s: number, a: any) => s + Number(a.paid_amount || 0), 0);
    return { bill, paid, due: bill - paid, count: arts.length };
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">স্বাগতম, {clientProfile?.name || "ক্লায়েন্ট"}</h1>
              <p className="text-xs text-muted-foreground">আইডি: {clientProfile?.client_id} {clientProfile?.company && `• ${clientProfile.company}`}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()} className="gap-1.5">
            <LogOut className="h-4 w-4" /> লগআউট
          </Button>
        </div>

        {/* Overall Summary Cards */}
        {projects.length > 0 && (
          <div className="space-y-3">
            {/* Grand Total Row */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" /> সামগ্রিক হিসাব
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">মোট বিল</div>
                    <div className="text-lg font-bold text-foreground">৳{grandTotal.toLocaleString("bn-BD")}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">মোট পেইড</div>
                    <div className="text-lg font-bold text-emerald-400">৳{grandPaid.toLocaleString("bn-BD")}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">মোট বাকি</div>
                    <div className="text-lg font-bold text-amber-400">৳{Math.max(0, grandDue).toLocaleString("bn-BD")}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Breakdown: Production vs Artist */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Banknote className="h-3.5 w-3.5 text-sky-400" />
                    <span className="text-xs font-semibold text-muted-foreground">প্রোডাকশন বিল</span>
                  </div>
                  <div className="text-sm font-bold text-foreground">৳{totalBudget.toLocaleString("bn-BD")}</div>
                  <div className="text-xs text-emerald-400">পেইড: ৳{totalProductionPaid.toLocaleString("bn-BD")}</div>
                  {productionDue > 0 && (
                    <div className="text-xs text-amber-400">বাকি: ৳{productionDue.toLocaleString("bn-BD")}</div>
                  )}
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Users className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-xs font-semibold text-muted-foreground">আর্টিস্ট বিল</span>
                  </div>
                  <div className="text-sm font-bold text-foreground">৳{totalArtistBill.toLocaleString("bn-BD")}</div>
                  <div className="text-xs text-emerald-400">পেইড: ৳{totalArtistPaid.toLocaleString("bn-BD")}</div>
                  {artistDue > 0 && (
                    <div className="text-xs text-amber-400">বাকি: ৳{artistDue.toLocaleString("bn-BD")}</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Project Count + Download All */}
            <div className="flex items-center gap-3">
              <Card className="border-border/50 flex-1">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">মোট প্রজেক্ট</span>
                  </div>
                  <span className="text-xl font-bold text-foreground">{projects.length}</span>
                </CardContent>
              </Card>
              <BillDownloadDialog
                projects={projects}
                allProjectArtists={allProjectArtists}
                allPayments={allPayments}
                clientProfile={clientProfile}
              />
            </div>
          </div>
        )}

        {/* Payment Button */}
        {projects.length > 0 && grandDue > 0 && (
          <PaymentDialog
            allProjectArtists={allProjectArtists}
            allPayments={allPayments}
            projects={projects}
            clientName={clientProfile?.name || ""}
            clientProfileId={clientProfile?.id || ""}
            totalBudget={totalBudget}
            totalProductionPaid={totalProductionPaid}
          />
        )}

        {/* Payment History */}
        {allPayments.length > 0 && (
          <Card className="border-border/50">
            <CardContent className="p-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> প্রোডাকশন পেমেন্ট হিস্ট্রি
              </h3>
              {allPayments.map((pay: any) => (
                <div key={pay.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
                  <div>
                    <div className="text-sm font-medium text-foreground">৳{Number(pay.amount).toLocaleString("bn-BD")}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(pay.payment_date), "d MMM yyyy", { locale: bn })}
                      {" • "}{paymentMethodLabel[pay.payment_method] || pay.payment_method}
                    </div>
                  </div>
                  {pay.notes && <span className="text-xs text-muted-foreground max-w-[150px] truncate">{pay.notes}</span>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Projects */}
        {projects.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">কোনো প্রজেক্ট নেই</div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> আপনার প্রজেক্ট সমূহ
            </h2>
            {projects.map((p: any) => {
              const scenes = getScenes(p.id);
              const st = statusMap[p.status] || statusMap.upcoming;
              const isOpen = expandedProject === p.id;
              const artTotals = getProjectArtistTotals(p.id);
              const projProductionPaid = allPayments
                .filter((pay: any) => pay.project_id === p.id)
                .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0);

              return (
                <Card key={p.id} className="border-border/50 overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                    onClick={() => setExpandedProject(isOpen ? null : p.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{p.name}</h3>
                          <Badge variant="outline" className={st.color}>{st.label}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {format(new Date(p.project_date), "d MMM yyyy", { locale: bn })}</span>
                          {p.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {p.location}</span>}
                        </div>
                        {/* Per-project mini summary */}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px]">
                          <span className="text-muted-foreground">
                            প্রোডাকশন: <span className="text-foreground font-medium">৳{Number(p.total_budget).toLocaleString("bn-BD")}</span>
                          </span>
                          {artTotals.count > 0 && (
                            <span className="text-muted-foreground">
                              আর্টিস্ট: <span className="text-foreground font-medium">৳{artTotals.bill.toLocaleString("bn-BD")}</span>
                              {artTotals.due > 0 && <span className="text-amber-400 ml-1">(বাকি ৳{artTotals.due.toLocaleString("bn-BD")})</span>}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-medium text-foreground">৳{(Number(p.total_budget) + artTotals.bill).toLocaleString("bn-BD")}</div>
                        <div className="text-[10px] text-muted-foreground">মোট বিল</div>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-4">
                          {/* Budget + Download Bill */}
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                              <Wallet className="h-4 w-4 text-primary" /> বাজেট
                            </h4>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-xs h-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                const arts = allProjectArtists.filter((a: any) => a.project_id === p.id);
                                downloadProjectBillPDF({
                                  projectName: p.name,
                                  projectDate: p.project_date,
                                  clientName: clientProfile?.name || "",
                                  productionBudget: Number(p.total_budget || 0),
                                  productionPaid: projProductionPaid,
                                  artists: arts.map((a: any) => ({
                                    artist_name: a.artist_name,
                                    remuneration: Number(a.remuneration || 0),
                                    paid_amount: Number(a.paid_amount || 0),
                                  })),
                                });
                                toast({ title: "বিল ডাউনলোড হচ্ছে..." });
                              }}
                            >
                              <Download className="h-3.5 w-3.5" /> বিল ডাউনলোড
                            </Button>
                          </div>
                          <div className="rounded-lg bg-sky-500/10 p-3 text-center">
                            <div className="text-xs text-muted-foreground">প্রজেক্ট বাজেট</div>
                            <div className="font-bold text-sky-400">৳{Number(p.total_budget).toLocaleString("bn-BD")}</div>
                          </div>

                          {/* Client Artist Billing */}
                          <ClientArtistBilling
                            projectId={p.id}
                            clientProfileId={clientProfile.id}
                            clientName={clientProfile?.name || "ক্লায়েন্ট"}
                            projectName={p.name}
                          />

                          {/* Client Scene Editor */}
                          <ClientSceneEditor
                            projectId={p.id}
                            scenes={scenes}
                            onUpdate={() => refetchScenes()}
                          />

                          {/* Client Script Writing */}
                          <ClientProjectScript
                            projectId={p.id}
                            userId={user!.id}
                            initialScript={p.client_script}
                            initialImages={Array.isArray(p.client_script_images) ? p.client_script_images : []}
                            onUpdate={() => {}}
                          />

                          {p.notes && <p className="text-xs text-muted-foreground italic border-t border-border/20 pt-2">নোট: {p.notes}</p>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Bill Download Dialog with filters ─── */
function BillDownloadDialog({ projects, allProjectArtists, allPayments, clientProfile }: {
  projects: any[];
  allProjectArtists: any[];
  allPayments: any[];
  clientProfile: any;
}) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Reset selections when dialog opens
  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setSelectedIds(new Set(projects.map((p: any) => p.id)));
      setDateFrom(undefined);
      setDateTo(undefined);
    }
    setOpen(isOpen);
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((p: any) => {
      if (!selectedIds.has(p.id)) return false;
      const pDate = new Date(p.project_date);
      if (dateFrom && pDate < dateFrom) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59);
        if (pDate > end) return false;
      }
      return true;
    });
  }, [projects, selectedIds, dateFrom, dateTo]);

  const toggleProject = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === projects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(projects.map((p: any) => p.id)));
    }
  };

  const handleDownload = () => {
    if (filteredProjects.length === 0) {
      toast({ title: "কোনো প্রজেক্ট সিলেক্ট করা হয়নি", variant: "destructive" });
      return;
    }
    const billData = filteredProjects.map((p: any) => {
      const arts = allProjectArtists.filter((a: any) => a.project_id === p.id);
      const projPaid = allPayments
        .filter((pay: any) => pay.project_id === p.id)
        .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0);
      return {
        projectName: p.name,
        projectDate: p.project_date,
        clientName: clientProfile?.name || "",
        productionBudget: Number(p.total_budget || 0),
        productionPaid: projPaid,
        artists: arts.map((a: any) => ({
          artist_name: a.artist_name,
          remuneration: Number(a.remuneration || 0),
          paid_amount: Number(a.paid_amount || 0),
        })),
      };
    });
    downloadAllProjectsBillPDF({
      clientName: clientProfile?.name || "প্রজেক্ট ডিরেক্টর",
      company: clientProfile?.company || undefined,
      projects: billData,
    });
    toast({ title: `${filteredProjects.length} টি প্রজেক্টের বিল ডাউনলোড হচ্ছে...` });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-auto py-3 px-4">
          <Download className="h-4 w-4" />
          <span className="text-xs">সব বিল<br />ডাউনলোড</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[360px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">বিল ডাউনলোড ফিল্টার</DialogTitle>
        </DialogHeader>

        {/* Date Filters */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">তারিখ ফিল্টার</p>
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("text-xs justify-start", !dateFrom && "text-muted-foreground")}>
                  <Calendar className="h-3 w-3 mr-1" />
                  {dateFrom ? format(dateFrom, "d MMM yy", { locale: bn }) : "শুরু তারিখ"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker mode="single" selected={dateFrom} onSelect={setDateFrom} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("text-xs justify-start", !dateTo && "text-muted-foreground")}>
                  <Calendar className="h-3 w-3 mr-1" />
                  {dateTo ? format(dateTo, "d MMM yy", { locale: bn }) : "শেষ তারিখ"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker mode="single" selected={dateTo} onSelect={setDateTo} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
              তারিখ ফিল্টার সরান
            </Button>
          )}
        </div>

        {/* Project Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">প্রজেক্ট সিলেক্ট করুন</p>
            <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={toggleAll}>
              {selectedIds.size === projects.length ? "সব বাদ" : "সব সিলেক্ট"}
            </Button>
          </div>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {projects.map((p: any) => (
              <label
                key={p.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer"
              >
                <Checkbox
                  checked={selectedIds.has(p.id)}
                  onCheckedChange={() => toggleProject(p.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {format(new Date(p.project_date), "d MMM yyyy", { locale: bn })}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Summary & Download */}
        <div className="pt-2 border-t border-border space-y-2">
          <p className="text-xs text-muted-foreground">
            সিলেক্টেড: <span className="font-bold text-foreground">{filteredProjects.length}</span> / {projects.length} প্রজেক্ট
          </p>
          <Button className="w-full gap-2" onClick={handleDownload} disabled={filteredProjects.length === 0}>
            <Download className="h-4 w-4" />
            বিল ডাউনলোড করুন ({filteredProjects.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Payment Dialog ─── */
function PaymentDialog({ allProjectArtists, allPayments, projects, clientName, clientProfileId, totalBudget, totalProductionPaid }: {
  allProjectArtists: any[];
  allPayments: any[];
  projects: any[];
  clientName: string;
  clientProfileId: string;
  totalBudget: number;
  totalProductionPaid: number;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"choose" | "artist" | "production">("choose");
  const [selectedArtistName, setSelectedArtistName] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [receiptData, setReceiptData] = useState<any>(null);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setStep("choose");
      setSelectedArtistName(null);
      setPayAmount("");
    }
    setOpen(isOpen);
  };

  // Group all unpaid artists by name (across all projects)
  const artistsByName = useMemo(() => {
    const map = new Map<string, { name: string; entries: any[]; totalBill: number; totalPaid: number; totalDue: number }>();
    allProjectArtists.forEach((a: any) => {
      const rem = Number(a.remuneration || 0);
      const paid = Number(a.paid_amount || 0);
      const due = rem - paid;
      if (due <= 0) return;
      const existing = map.get(a.artist_name) || { name: a.artist_name, entries: [], totalBill: 0, totalPaid: 0, totalDue: 0 };
      existing.entries.push(a);
      existing.totalBill += rem;
      existing.totalPaid += paid;
      existing.totalDue += due;
      map.set(a.artist_name, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.totalDue - a.totalDue);
  }, [allProjectArtists]);

  // Production projects with dues
  const productionProjectGroups = useMemo(() => {
    return projects
      .map((p: any) => {
        const paid = allPayments
          .filter((pay: any) => pay.project_id === p.id)
          .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0);
        const due = Number(p.total_budget || 0) - paid;
        return { project: p, paid, due };
      })
      .filter((g) => g.due > 0);
  }, [projects, allPayments]);

  const totalArtistDue = artistsByName.reduce((s, g) => s + g.totalDue, 0);
  const totalProductionDue = totalBudget - totalProductionPaid;

  const selectedGroup = selectedArtistName ? artistsByName.find(g => g.name === selectedArtistName) : null;

  // Auto-distribute payment across projects (oldest project first)
  const handlePayArtist = async () => {
    if (!selectedGroup) return;
    const amount = Number(payAmount || 0);
    if (amount <= 0) {
      toast({ title: "পরিমাণ দিন", variant: "destructive" });
      return;
    }

    // Sort entries by project date (oldest first)
    const sorted = [...selectedGroup.entries].sort((a, b) => {
      const dateA = projects.find((p: any) => p.id === a.project_id)?.project_date || "";
      const dateB = projects.find((p: any) => p.id === b.project_id)?.project_date || "";
      return dateA.localeCompare(dateB);
    });

    let remaining = amount;
    const updates: { id: string; newPaid: number; isPaid: boolean; projectName: string; amount: number }[] = [];

    for (const entry of sorted) {
      if (remaining <= 0) break;
      const rem = Number(entry.remuneration || 0);
      const paid = Number(entry.paid_amount || 0);
      const due = rem - paid;
      if (due <= 0) continue;

      const payNow = Math.min(remaining, due);
      const newPaid = paid + payNow;
      const isPaid = newPaid >= rem;
      const projName = projects.find((p: any) => p.id === entry.project_id)?.name || "";

      updates.push({ id: entry.id, newPaid, isPaid, projectName: projName, amount: payNow });
      remaining -= payNow;
    }

    try {
      for (const upd of updates) {
        const { error } = await (supabase as any)
          .from("client_project_artists")
          .update({ paid_amount: upd.newPaid, is_paid: upd.isPaid })
          .eq("id", upd.id);
        if (error) throw error;
      }

      toast({ title: `৳${amount.toLocaleString("bn-BD")} পেমেন্ট সম্পন্ন ✓` });

      // Show receipt with distribution info
      setReceiptData({
        artistName: selectedGroup.name,
        projectName: updates.map(u => u.projectName).join(", "),
        clientName,
        amount,
        totalRemuneration: selectedGroup.totalBill,
        totalPaid: selectedGroup.totalPaid + amount,
        remaining: selectedGroup.totalDue - amount,
        date: new Date().toISOString(),
      });

      queryClient.invalidateQueries({ queryKey: ["all-client-project-artists", clientProfileId] });
      queryClient.invalidateQueries({ queryKey: ["client-project-artists"] });
      setSelectedArtistName(null);
      setPayAmount("");
      setStep("artist");
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    }
  };

  const goBack = () => {
    if (selectedArtistName) {
      setSelectedArtistName(null);
      setPayAmount("");
    } else {
      setStep("choose");
    }
  };

  // Calculate payment distribution preview
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
      const status = newPaid >= Number(entry.remuneration || 0) ? "Paid" : "Partially Paid";
      result.push({ projectName: projName, amount: payNow, status });
      rem -= payNow;
    }
    return result;
  }, [selectedGroup, payAmount, projects]);

  return (
    <>
      {receiptData && (
        <ClientArtistReceipt receiptData={receiptData} onClose={() => setReceiptData(null)} />
      )}
      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogTrigger asChild>
          <Button className="w-full gap-2 h-12 text-base font-semibold" size="lg">
            <CreditCard className="h-5 w-5" /> পেমেন্ট করুন
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[400px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              {step !== "choose" && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={goBack}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <CreditCard className="h-4 w-4 text-primary" />
              {step === "choose" && "পেমেন্ট ক্যাটাগরি বাছুন"}
              {step === "artist" && (selectedArtistName ? "পেমেন্ট করুন" : "মেম্বার বাছুন")}
              {step === "production" && "প্রোডাকশন পেমেন্ট"}
            </DialogTitle>
          </DialogHeader>

          {/* Step 1: Choose Category */}
          {step === "choose" && (
            <div className="space-y-3">
              {totalArtistDue > 0 && (
                <button
                  className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                  onClick={() => setStep("artist")}
                >
                  <div className="h-11 w-11 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">আর্টিস্ট / মেম্বার</div>
                    <div className="text-xs text-muted-foreground">বাকি আছে ৳{totalArtistDue.toLocaleString("bn-BD")}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              )}
              {totalProductionDue > 0 && (
                <button
                  className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                  onClick={() => setStep("production")}
                >
                  <div className="h-11 w-11 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
                    <Banknote className="h-5 w-5 text-sky-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground">প্রোডাকশন</div>
                    <div className="text-xs text-muted-foreground">বাকি আছে ৳{totalProductionDue.toLocaleString("bn-BD")}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              )}
            </div>
          )}

          {/* Step 2: Artist → Select by Name (grouped across projects) */}
          {step === "artist" && !selectedArtistName && (
            <div className="space-y-2">
              {artistsByName.map((group) => {
                const paidPercent = group.totalBill > 0 ? Math.round((group.totalPaid / group.totalBill) * 100) : 0;
                return (
                  <button
                    key={group.name}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/40 hover:bg-secondary/30 transition-all text-left"
                    onClick={() => { setSelectedArtistName(group.name); setPayAmount(String(group.totalDue)); }}
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {group.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{group.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {group.entries.length} টি প্রজেক্ট • মোট: ৳{group.totalBill.toLocaleString("bn-BD")}
                      </div>
                      <div className="w-full h-1.5 bg-secondary rounded-full mt-1">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${paidPercent}%` }} />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-amber-400">৳{group.totalDue.toLocaleString("bn-BD")}</div>
                      <div className="text-[10px] text-muted-foreground">বাকি</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 3: Pay selected artist (with auto project distribution) */}
          {step === "artist" && selectedGroup && (
            <div className="space-y-4">
              {/* Artist Info Card */}
              <div className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                    {selectedGroup.name?.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{selectedGroup.name}</div>
                    <div className="text-xs text-muted-foreground">{selectedGroup.entries.length} টি প্রজেক্টে কাজ করেছেন</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-secondary/40 p-2">
                    <div className="text-[10px] text-muted-foreground">মোট বিল</div>
                    <div className="text-sm font-bold text-foreground">৳{selectedGroup.totalBill.toLocaleString("bn-BD")}</div>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 p-2">
                    <div className="text-[10px] text-muted-foreground">পেইড</div>
                    <div className="text-sm font-bold text-emerald-400">৳{selectedGroup.totalPaid.toLocaleString("bn-BD")}</div>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 p-2">
                    <div className="text-[10px] text-muted-foreground">বাকি</div>
                    <div className="text-sm font-bold text-amber-400">৳{selectedGroup.totalDue.toLocaleString("bn-BD")}</div>
                  </div>
                </div>

                {/* Per-project breakdown */}
                <div className="space-y-1.5">
                  <div className="text-[10px] font-medium text-muted-foreground">প্রজেক্ট ভিত্তিক বিল:</div>
                  {selectedGroup.entries.map((entry: any) => {
                    const rem = Number(entry.remuneration || 0);
                    const paid = Number(entry.paid_amount || 0);
                    const due = rem - paid;
                    const projName = projects.find((p: any) => p.id === entry.project_id)?.name || "";
                    return (
                      <div key={entry.id} className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded bg-secondary/20">
                        <span className="text-foreground truncate mr-2">{projName}</span>
                        <span className="text-amber-400 shrink-0 font-medium">বাকি ৳{due.toLocaleString("bn-BD")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Input */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">পেমেন্ট পরিমাণ</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="৳ পরিমাণ লিখুন"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    min={0}
                    max={selectedGroup.totalDue}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs shrink-0"
                    onClick={() => setPayAmount(String(selectedGroup.totalDue))}
                  >
                    সম্পূর্ণ
                  </Button>
                </div>
              </div>

              {/* Auto distribution preview */}
              {paymentPreview.length > 0 && (
                <div className="rounded-lg border border-border/50 p-3 space-y-1.5">
                  <div className="text-[10px] font-medium text-muted-foreground">পেমেন্ট বিতরণ প্রিভিউ:</div>
                  {paymentPreview.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px]">
                      <span className="text-foreground truncate mr-2">{p.projectName}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-foreground font-medium">৳{p.amount.toLocaleString("bn-BD")}</span>
                        <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0",
                          p.status === "Paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        )}>
                          {p.status === "Paid" ? "পেইড" : "আংশিক"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button
                className="w-full gap-2"
                onClick={handlePayArtist}
                disabled={Number(payAmount) <= 0}
              >
                <Banknote className="h-4 w-4" />
                ৳{Number(payAmount || 0).toLocaleString("bn-BD")} পেমেন্ট করুন
              </Button>
            </div>
          )}

          {/* Production Payment View */}
          {step === "production" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-border p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-secondary/40 p-2">
                    <div className="text-[10px] text-muted-foreground">মোট বিল</div>
                    <div className="text-sm font-bold text-foreground">৳{totalBudget.toLocaleString("bn-BD")}</div>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 p-2">
                    <div className="text-[10px] text-muted-foreground">পেইড</div>
                    <div className="text-sm font-bold text-emerald-400">৳{totalProductionPaid.toLocaleString("bn-BD")}</div>
                  </div>
                  <div className="rounded-lg bg-amber-500/10 p-2">
                    <div className="text-[10px] text-muted-foreground">বাকি</div>
                    <div className="text-sm font-bold text-amber-400">৳{totalProductionDue.toLocaleString("bn-BD")}</div>
                  </div>
                </div>
              </div>

              {productionProjectGroups.map(({ project, paid, due }) => (
                <div key={project.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{project.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      বাজেট: ৳{Number(project.total_budget).toLocaleString("bn-BD")} • পেইড: ৳{paid.toLocaleString("bn-BD")}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-amber-400 shrink-0">৳{due.toLocaleString("bn-BD")}</div>
                </div>
              ))}

              <p className="text-xs text-muted-foreground italic text-center">প্রোডাকশন পেমেন্ট অ্যাডমিন দ্বারা পরিচালিত হয়</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}