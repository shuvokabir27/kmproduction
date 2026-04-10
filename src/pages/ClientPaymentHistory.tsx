import { useAuth } from "@/hooks/useAuth";
import ClientBottomNav from "@/components/ClientBottomNav";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Banknote, ChevronLeft, Download, History, Receipt, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ClientPaymentReceipt from "@/components/ClientPaymentReceipt";
import { Briefcase } from "lucide-react";

const paymentMethodLabel: Record<string, string> = {
  cash: "নগদ",
  bkash: "বিকাশ",
  nagad: "নগদ (নাগাদ)",
  bank: "ব্যাংক",
};

export default function ClientPaymentHistory() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "derived" | "history"; rec: any } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [historyReceiptData, setHistoryReceiptData] = useState<any>(null);

  const { data: clientProfile } = useQuery({
    queryKey: ["client-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("client_profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["client-projects", clientProfile?.id],
    enabled: !!clientProfile?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("freelance_projects").select("*").eq("client_profile_id", clientProfile.id).order("project_date", { ascending: false });
      return data || [];
    },
  });

  const { data: allPayments = [] } = useQuery({
    queryKey: ["client-payments", clientProfile?.id],
    enabled: !!clientProfile?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("freelance_payments").select("*").eq("client_profile_id", clientProfile.id).order("payment_date", { ascending: false });
      return data || [];
    },
  });

  const { data: allProjectArtists = [] } = useQuery({
    queryKey: ["all-client-project-artists", clientProfile?.id],
    enabled: !!clientProfile?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("client_project_artists").select("*").eq("client_profile_id", clientProfile.id);
      return data || [];
    },
  });

  const { data: allProjectExpenses = [] } = useQuery({
    queryKey: ["all-client-project-expenses", clientProfile?.id],
    enabled: !!clientProfile?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("client_project_expenses").select("*").eq("client_profile_id", clientProfile.id);
      return data || [];
    },
  });

  const { data: clientPaymentHistory = [] } = useQuery({
    queryKey: ["client-payment-history", clientProfile?.id],
    enabled: !!clientProfile?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("client_payment_history").select("*").eq("client_profile_id", clientProfile.id).order("created_at", { ascending: false });
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

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      if (deleteConfirm.type === "derived") {
        const rec = deleteConfirm.rec;
        const realId = rec.id.replace(/^(artist|expense)-/, "");
        if (rec.type === "artist") {
          await (supabase as any).from("client_project_artists").update({ paid_amount: 0, is_paid: false }).eq("id", realId);
        } else {
          await (supabase as any).from("client_project_expenses").update({ paid_amount: 0, is_paid: false }).eq("id", realId);
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
              await (supabase as any).from("client_project_expenses").update({ is_paid: false, paid_amount: 0 }).eq("id", eid);
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
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl" onClick={() => navigate("/client")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="h-7 w-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <History className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <h1 className="text-base font-bold text-foreground">পেমেন্ট হিস্ট্রি</h1>
          <Badge variant="outline" className="ml-auto text-[10px] px-2 py-0.5 border-emerald-500/20 text-emerald-400">
            {totalHistoryCount}টি
          </Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 space-y-2 pb-24 md:pb-8">
        {totalHistoryCount === 0 ? (
          <div className="text-center py-20">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <History className="h-8 w-8 text-emerald-400/50" />
            </div>
            <p className="text-muted-foreground text-sm">কোনো পেমেন্ট রেকর্ড নেই</p>
          </div>
        ) : (
          <>
            {/* Production payments */}
            {allPayments.map((pay: any, idx: number) => (
              <motion.div key={pay.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/20">
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
            {/* Derived paid records */}
            {derivedRecords.map((rec, idx: number) => (
              <motion.div key={rec.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: (allPayments.length + idx) * 0.03 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/20">
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
            {/* Client payment history */}
            {clientPaymentHistory.map((ph: any, idx: number) => {
              const details = ph.details || {};
              const typeLabel = ph.payment_type === "artist" ? "আর্টিস্ট" : "শুটিং খরচ";
              const typeIcon = ph.payment_type === "artist" ? <Users className="h-4 w-4 text-violet-400" /> : <Receipt className="h-4 w-4 text-orange-400" />;
              const typeBg = ph.payment_type === "artist" ? "bg-violet-500/10" : "bg-orange-500/10";
              return (
                <motion.div key={ph.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/20">
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
          </>
        )}
      </div>

      {/* Delete confirmation */}
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
            <AlertDialogCancel disabled={isDeleting} className="flex-1 rounded-xl text-xs h-9">বাতিল</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="flex-1 rounded-xl text-xs h-9 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
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
      <ClientBottomNav />
    </div>
  );
}
