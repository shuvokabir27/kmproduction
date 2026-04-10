import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Calendar, MapPin, FileText, CheckCircle2, Clock, LogOut, Wallet, Users, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ClientProjectScript } from "@/components/ClientProjectScript";
import { ClientSceneEditor } from "@/components/ClientSceneEditor";
import { ClientArtistBilling } from "@/components/ClientArtistBilling";

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

            {/* Project Count */}
            <div className="grid grid-cols-1">
              <Card className="border-border/50">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">মোট প্রজেক্ট</span>
                  </div>
                  <span className="text-xl font-bold text-foreground">{projects.length}</span>
                </CardContent>
              </Card>
            </div>
          </div>
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
                          {/* Budget */}
                          <div>
                            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                              <Wallet className="h-4 w-4 text-primary" /> বাজেট
                            </h4>
                            <div className="rounded-lg bg-sky-500/10 p-3 text-center">
                              <div className="text-xs text-muted-foreground">প্রজেক্ট বাজেট</div>
                              <div className="font-bold text-sky-400">৳{Number(p.total_budget).toLocaleString("bn-BD")}</div>
                            </div>
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
