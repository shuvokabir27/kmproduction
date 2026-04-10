import { useAuth } from "@/hooks/useAuth";
import ClientBottomNav from "@/components/ClientBottomNav";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Banknote, ChevronLeft, Download, History, Receipt, Trash2, Users, Search, X, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ClientPaymentReceipt from "@/components/ClientPaymentReceipt";
import { Briefcase } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const paymentMethodLabel: Record<string, string> = {
  cash: "নগদ",
  bkash: "বিকাশ",
  nagad: "নগদ (নাগাদ)",
  bank: "ব্যাংক",
};

const FILTER_TABS = [
  { key: "all", label: "সকল" },
  { key: "production", label: "প্রোডাকশন" },
  { key: "artist", label: "আর্টিস্ট" },
  { key: "expense", label: "শুটিং খরচ" },
];

export default function ClientPaymentHistory() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "derived" | "history"; rec: any } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [historyReceiptData, setHistoryReceiptData] = useState<any>(null);
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [isDownloading, setIsDownloading] = useState(false);

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

  const expCatLabel: Record<string, string> = { food: "খাবার", costume: "কস্টিউম", transport: "যাতায়াত" };

  // Normalize all records into a unified list
  const allRecords = useMemo(() => {
    const records: any[] = [];

    // Production payments
    allPayments.forEach((pay: any) => {
      records.push({
        id: pay.id, category: "production", amount: Number(pay.amount), label: "প্রোডাকশন",
        sublabel: paymentMethodLabel[pay.payment_method] || pay.payment_method,
        projectName: projects.find((p: any) => p.id === pay.project_id)?.name || "",
        date: pay.payment_date, notes: pay.notes || "",
        icon: "production", original: pay, source: "payment",
      });
    });

    // Derived artist records
    allProjectArtists.filter((a: any) => Number(a.paid_amount || 0) > 0).forEach((a: any) => {
      records.push({
        id: `artist-${a.id}`, category: "artist", amount: Number(a.paid_amount || 0), label: a.artist_name,
        sublabel: "আর্টিস্ট", projectName: projects.find((p: any) => p.id === a.project_id)?.name || "",
        date: a.created_at, notes: "", icon: "artist", isPaid: a.is_paid,
        original: a, source: "derived", derivedType: "artist",
      });
    });

    // Derived expense records
    allProjectExpenses.filter((e: any) => e.is_paid).forEach((e: any) => {
      records.push({
        id: `expense-${e.id}`, category: "expense", amount: Number(e.amount || 0),
        label: e.description || expCatLabel[e.category] || e.category,
        sublabel: expCatLabel[e.category] || e.category,
        projectName: projects.find((p: any) => p.id === e.project_id)?.name || "",
        date: e.created_at, notes: "", icon: "expense",
        original: e, source: "derived", derivedType: "expense",
      });
    });

    // Client payment history
    clientPaymentHistory.forEach((ph: any) => {
      const details = ph.details || {};
      const cat = ph.payment_type === "artist" ? "artist" : "expense";
      records.push({
        id: `history-${ph.id}`, category: cat, amount: Number(ph.amount),
        label: details.artist_name || (details.expense_count ? `${details.expense_count} টি আইটেম` : (cat === "artist" ? "আর্টিস্ট" : "শুটিং খরচ")),
        sublabel: cat === "artist" ? "আর্টিস্ট" : "শুটিং খরচ",
        projectName: "", date: ph.created_at, notes: "",
        icon: cat, original: ph, source: "history",
      });
    });

    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allPayments, allProjectArtists, allProjectExpenses, clientPaymentHistory, projects]);

  // Filter records
  const filteredRecords = useMemo(() => {
    let list = allRecords;
    if (activeFilter !== "all") {
      list = list.filter(r => r.category === activeFilter);
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(r =>
        r.label?.toLowerCase().includes(q) ||
        r.sublabel?.toLowerCase().includes(q) ||
        r.projectName?.toLowerCase().includes(q) ||
        r.notes?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allRecords, activeFilter, searchText]);

  const filteredTotal = filteredRecords.reduce((s, r) => s + r.amount, 0);

  // Download filtered records as PDF
  const handleDownloadPDF = useCallback(async () => {
    if (filteredRecords.length === 0) return;
    setIsDownloading(true);
    try {
      const filterLabel = FILTER_TABS.find(t => t.key === activeFilter)?.label || "সকল";
      const container = document.createElement("div");
      container.style.cssText = "position:fixed;left:-9999px;top:0;width:800px;padding:40px;background:#fff;font-family:sans-serif;color:#000;";
      
      container.innerHTML = `
        <div style="text-align:center;margin-bottom:24px;">
          <h2 style="font-size:20px;font-weight:bold;margin:0 0 4px;">পেমেন্ট হিস্ট্রি — ${filterLabel}</h2>
          <p style="font-size:12px;color:#666;margin:0;">${clientProfile?.name || ""} ${clientProfile?.company ? `• ${clientProfile.company}` : ""}</p>
          <p style="font-size:11px;color:#888;margin:4px 0 0;">${searchText ? `সার্চ: "${searchText}" • ` : ""}মোট ${filteredRecords.length} টি রেকর্ড • মোট: ৳${filteredTotal.toLocaleString("bn-BD")}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#f0f0f0;">
              <th style="padding:8px 6px;text-align:left;border-bottom:2px solid #ccc;">#</th>
              <th style="padding:8px 6px;text-align:left;border-bottom:2px solid #ccc;">তারিখ</th>
              <th style="padding:8px 6px;text-align:left;border-bottom:2px solid #ccc;">ক্যাটাগরি</th>
              <th style="padding:8px 6px;text-align:left;border-bottom:2px solid #ccc;">বিবরণ</th>
              <th style="padding:8px 6px;text-align:left;border-bottom:2px solid #ccc;">প্রজেক্ট</th>
              <th style="padding:8px 6px;text-align:right;border-bottom:2px solid #ccc;">পরিমাণ</th>
            </tr>
          </thead>
          <tbody>
            ${filteredRecords.map((r, i) => `
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:6px;">${(i + 1).toLocaleString("bn-BD")}</td>
                <td style="padding:6px;">${format(new Date(r.date), "d MMM yyyy", { locale: bn })}</td>
                <td style="padding:6px;">${r.sublabel}</td>
                <td style="padding:6px;">${r.label}</td>
                <td style="padding:6px;">${r.projectName || "—"}</td>
                <td style="padding:6px;text-align:right;font-weight:600;">৳${r.amount.toLocaleString("bn-BD")}</td>
              </tr>
            `).join("")}
            <tr style="background:#f0f0f0;font-weight:bold;">
              <td colspan="5" style="padding:8px 6px;text-align:right;">মোট:</td>
              <td style="padding:8px 6px;text-align:right;">৳${filteredTotal.toLocaleString("bn-BD")}</td>
            </tr>
          </tbody>
        </table>
        <p style="text-align:center;font-size:10px;color:#aaa;margin-top:20px;">তারিখ: ${format(new Date(), "d MMMM yyyy", { locale: bn })}</p>
      `;

      document.body.appendChild(container);
      const canvas = await html2canvas(container, { scale: 2, useCORS: true });
      document.body.removeChild(container);

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: canvas.width > canvas.height ? "l" : "p", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgRatio = canvas.width / canvas.height;
      let imgW = pdfW - 10;
      let imgH = imgW / imgRatio;

      if (imgH > pdfH - 10) {
        imgH = pdfH - 10;
        imgW = imgH * imgRatio;
      }

      pdf.addImage(imgData, "JPEG", (pdfW - imgW) / 2, 5, imgW, imgH);
      pdf.save(`payment-history-${activeFilter}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast({ title: "পিডিএফ ডাউনলোড হচ্ছে..." });
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  }, [filteredRecords, filteredTotal, activeFilter, searchText, clientProfile]);

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

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      if (deleteConfirm.type === "derived") {
        const rec = deleteConfirm.rec;
        const realId = rec.id.replace(/^(artist|expense)-/, "");
        if (rec.derivedType === "artist") {
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

  const renderIcon = (cat: string) => {
    if (cat === "production") return <Banknote className="h-4 w-4 text-sky-400" />;
    if (cat === "artist") return <Users className="h-4 w-4 text-violet-400" />;
    return <Receipt className="h-4 w-4 text-orange-400" />;
  };

  const renderIconBg = (cat: string) => {
    if (cat === "production") return "bg-sky-500/10";
    if (cat === "artist") return "bg-violet-500/10";
    return "bg-orange-500/10";
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
            {allRecords.length}টি
          </Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 space-y-3 pb-24 md:pb-8">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="নাম বা ক্যাটাগরি দিয়ে খুঁজুন..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-8 h-9 text-sm rounded-xl bg-secondary/30 border-border/30"
          />
          {searchText && (
            <button onClick={() => setSearchText("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={cn(
                "text-[11px] px-3 py-1.5 rounded-full border whitespace-nowrap transition-all font-medium",
                activeFilter === tab.key
                  ? "bg-primary/15 border-primary/30 text-primary"
                  : "bg-secondary/20 border-border/30 text-muted-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Summary + Download */}
        {filteredRecords.length > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-card/60 border border-border/20 px-3 py-2">
            <div>
              <div className="text-[10px] text-muted-foreground">{filteredRecords.length}টি রেকর্ড</div>
              <div className="text-sm font-bold text-foreground">৳{filteredTotal.toLocaleString("bn-BD")}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-[11px] h-8 rounded-xl border-border/50"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
            >
              <FileDown className="h-3.5 w-3.5" />
              {isDownloading ? "ডাউনলোড হচ্ছে..." : "পিডিএফ ডাউনলোড"}
            </Button>
          </div>
        )}

        {/* Records */}
        {filteredRecords.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <History className="h-8 w-8 text-emerald-400/50" />
            </div>
            <p className="text-muted-foreground text-sm">
              {searchText || activeFilter !== "all" ? "কোনো ফলাফল পাওয়া যায়নি" : "কোনো পেমেন্ট রেকর্ড নেই"}
            </p>
          </div>
        ) : (
          filteredRecords.map((rec, idx) => (
            <motion.div key={rec.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/20">
              <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", renderIconBg(rec.category))}>
                {renderIcon(rec.category)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">৳{rec.amount.toLocaleString("bn-BD")}</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {format(new Date(rec.date), "d MMM yyyy", { locale: bn })} • {rec.sublabel} • {rec.label}
                </div>
                {rec.projectName && <div className="text-[10px] text-muted-foreground/70 truncate">{rec.projectName}</div>}
              </div>
              {rec.source === "derived" && rec.derivedType === "artist" && (
                <Badge variant="outline" className={cn("text-[9px] h-4 shrink-0", rec.isPaid ? "border-emerald-500/50 text-emerald-500" : "border-amber-500/50 text-amber-500")}>
                  {rec.isPaid ? "পেইড" : "আংশিক"}
                </Badge>
              )}
              <div className="flex gap-0.5 shrink-0">
                {rec.source === "history" && (
                  <Button variant="ghost" size="sm"
                    className="h-7 w-7 p-0 text-primary hover:text-primary hover:bg-primary/10"
                    onClick={() => {
                      const ph = rec.original;
                      setHistoryReceiptData({
                        clientName: clientProfile?.name || "",
                        company: clientProfile?.company || undefined,
                        amount: Number(ph.amount),
                        paymentType: ph.payment_type,
                        details: ph.details || {},
                        date: ph.created_at,
                      });
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                )}
                {rec.source !== "payment" && (
                  <Button variant="ghost" size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (rec.source === "derived") {
                        setDeleteConfirm({ type: "derived", rec });
                      } else {
                        setDeleteConfirm({ type: "history", rec: rec.original });
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </motion.div>
          ))
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
