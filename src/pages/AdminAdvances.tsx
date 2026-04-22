import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, CheckCircle2, XCircle, Clock, AlertCircle, Search, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { bn } from "date-fns/locale";

function bnNum(n: number | string): string {
  const map: Record<string, string> = { "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪", "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯" };
  return String(n).split("").map((c) => map[c] ?? c).join("");
}

const STATUS_META: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  pending: { label: "অপেক্ষমান", icon: Clock, color: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/40" },
  approved: { label: "অনুমোদিত", icon: CheckCircle2, color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/40" },
  rejected: { label: "বাতিল", icon: XCircle, color: "text-red-300", bg: "bg-red-500/10", border: "border-red-500/40" },
  cancelled: { label: "সদস্য বাতিল করেছেন", icon: AlertCircle, color: "text-muted-foreground", bg: "bg-muted/30", border: "border-border/40" },
};

export default function AdminAdvances() {
  const { user, isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [actionDialog, setActionDialog] = useState<{ type: "approve" | "reject"; req: any } | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");

  const { data: requests } = useQuery({
    queryKey: ["admin-advance-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advance_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: isAdmin,
  });

  // Fetch member info for all requests
  const memberIds = Array.from(new Set((requests ?? []).map((r) => r.member_id)));
  const { data: members } = useQuery({
    queryKey: ["advance-request-members", memberIds.join(",")],
    queryFn: async () => {
      if (memberIds.length === 0) return {};
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, photo_url, member_id, designation")
        .in("id", memberIds);
      if (error) throw error;
      const map: Record<string, any> = {};
      (data ?? []).forEach((m) => { map[m.id] = m; });
      return map;
    },
    enabled: memberIds.length > 0,
  });

  const reviewMut = useMutation({
    mutationFn: async ({ id, status, note, amount }: { id: string; status: "approved" | "rejected"; note: string; amount?: number }) => {
      const update: any = {
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        admin_note: note || null,
      };
      if (status === "approved" && amount) update.approved_amount = amount;
      const { error } = await supabase.from("advance_requests").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.status === "approved" ? "অনুমোদিত হয়েছে" : "বাতিল করা হয়েছে");
      qc.invalidateQueries({ queryKey: ["admin-advance-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-advance-pending"] });
      setActionDialog(null);
      setAdminNote("");
      setApprovedAmount("");
    },
    onError: (err: any) => toast.error(err?.message ?? "ব্যর্থ"),
  });

  if (loading) return null;
  if (!user || !isAdmin) return <Navigate to="/login" replace />;

  const filtered = (requests ?? []).filter((r) => {
    if (tab !== "all" && r.status !== tab) return false;
    if (!search.trim()) return true;
    const member = members?.[r.member_id];
    const q = search.toLowerCase();
    return (
      member?.full_name?.toLowerCase().includes(q) ||
      String(member?.member_id ?? "").includes(q) ||
      String(r.amount).includes(q)
    );
  });

  const counts = {
    pending: (requests ?? []).filter((r) => r.status === "pending").length,
    approved: (requests ?? []).filter((r) => r.status === "approved").length,
    rejected: (requests ?? []).filter((r) => r.status === "rejected").length,
    cancelled: (requests ?? []).filter((r) => r.status === "cancelled").length,
    all: (requests ?? []).length,
  };

  const totalApproved = (requests ?? [])
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => sum + Number(r.approved_amount ?? r.amount), 0);
  const totalPending = (requests ?? [])
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const openAction = (type: "approve" | "reject", req: any) => {
    setActionDialog({ type, req });
    setAdminNote("");
    setApprovedAmount(type === "approve" ? String(req.amount) : "");
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-foreground">অ্যাডভান্স রিকোয়েস্ট</h1>
            <p className="text-xs text-muted-foreground">সদস্যদের অগ্রিম টাকার রিকোয়েস্ট ম্যানেজ করুন</p>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/30">
            <div className="text-[10px] text-amber-200/70 uppercase font-semibold">অপেক্ষমান</div>
            <div className="text-xl font-extrabold text-amber-300">{bnNum(counts.pending)}</div>
            <div className="text-[10px] text-amber-200/70">৳{bnNum(totalPending)}</div>
          </div>
          <div className="rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/30">
            <div className="text-[10px] text-emerald-200/70 uppercase font-semibold">অনুমোদিত</div>
            <div className="text-xl font-extrabold text-emerald-300">{bnNum(counts.approved)}</div>
            <div className="text-[10px] text-emerald-200/70">৳{bnNum(totalApproved)}</div>
          </div>
          <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/30">
            <div className="text-[10px] text-red-200/70 uppercase font-semibold">বাতিল</div>
            <div className="text-xl font-extrabold text-red-300">{bnNum(counts.rejected)}</div>
          </div>
          <div className="rounded-xl p-3 bg-muted/30 border border-border/40">
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">মোট</div>
            <div className="text-xl font-extrabold text-foreground">{bnNum(counts.all)}</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="নাম, আইডি বা পরিমাণ খুঁজুন..."
            className="pl-9 bg-secondary border-border/50"
          />
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-5 w-full bg-card/50">
            <TabsTrigger value="pending" className="text-xs">অপেক্ষমান ({bnNum(counts.pending)})</TabsTrigger>
            <TabsTrigger value="approved" className="text-xs">অনুমোদিত ({bnNum(counts.approved)})</TabsTrigger>
            <TabsTrigger value="rejected" className="text-xs">বাতিল ({bnNum(counts.rejected)})</TabsTrigger>
            <TabsTrigger value="cancelled" className="text-xs">সদস্য বাতিল</TabsTrigger>
            <TabsTrigger value="all" className="text-xs">সব ({bnNum(counts.all)})</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4 space-y-2.5">
            <AnimatePresence>
              {filtered.map((r) => {
                const member = members?.[r.member_id];
                const meta = STATUS_META[r.status];
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    layout
                    className={`rounded-xl border ${meta.border} ${meta.bg} p-3 md:p-4`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="h-11 w-11 rounded-full overflow-hidden border-2 border-border/40 shrink-0">
                        {member?.photo_url ? (
                          <img src={member.photo_url} alt={member.full_name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                            {member?.full_name?.charAt(0) ?? "?"}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-bold text-foreground">{member?.full_name ?? "অজানা সদস্য"}</span>
                          {member?.member_id && (
                            <span className="text-[10px] text-muted-foreground">#{bnNum(member.member_id)}</span>
                          )}
                          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-bold ${meta.color} border ${meta.border}`}>
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </span>
                        </div>
                        {member?.designation && (
                          <div className="text-[11px] text-muted-foreground mb-1">{member.designation}</div>
                        )}
                        <div className="flex flex-wrap items-baseline gap-3 mb-1">
                          <div className="text-2xl font-extrabold text-foreground">৳{bnNum(r.amount)}</div>
                          {r.status === "approved" && r.approved_amount && Number(r.approved_amount) !== Number(r.amount) && (
                            <div className="text-sm font-bold text-emerald-300">
                              অনুমোদিত: ৳{bnNum(r.approved_amount)}
                            </div>
                          )}
                        </div>
                        {r.reason && (
                          <div className="text-xs text-muted-foreground mb-1">
                            <span className="font-semibold text-foreground/80">কারণ:</span> {r.reason}
                          </div>
                        )}
                        {r.admin_note && (
                          <div className={`text-[11px] mt-1.5 p-2 rounded ${r.status === "rejected" ? "bg-red-500/10 text-red-200" : "bg-emerald-500/10 text-emerald-200"}`}>
                            <span className="font-semibold">আপনার বার্তা:</span> {r.admin_note}
                          </div>
                        )}
                        <div className="text-[10px] text-muted-foreground/70 mt-1.5">
                          {format(new Date(r.created_at), "d MMM yyyy, h:mm a", { locale: bn })}
                        </div>

                        {/* Actions for pending */}
                        {r.status === "pending" && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              onClick={() => openAction("approve", r)}
                              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-9"
                              size="sm"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              অনুমোদন
                            </Button>
                            <Button
                              onClick={() => openAction("reject", r)}
                              variant="outline"
                              className="flex-1 border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-200 font-bold h-9"
                              size="sm"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              বাতিল
                            </Button>
                          </div>
                        )}

                        {/* Re-approve for rejected/cancelled */}
                        {(r.status === "rejected" || r.status === "cancelled") && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              onClick={() => openAction("approve", r)}
                              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-9"
                              size="sm"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              পুনরায় অনুমোদন
                            </Button>
                          </div>
                        )}

                        {/* Cancel approved request */}
                        {r.status === "approved" && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              onClick={() => openAction("reject", r)}
                              variant="outline"
                              className="flex-1 border-red-500/40 text-red-300 hover:bg-red-500/10 hover:text-red-200 font-bold h-9"
                              size="sm"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              বাতিল করুন
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {filtered.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-12">
                কোনো রিকোয়েস্ট নেই
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Approve/Reject Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(o) => !o && setActionDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog?.type === "approve" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span>অ্যাডভান্স অনুমোদন</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-400" />
                  <span>অ্যাডভান্স বাতিল</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {actionDialog && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                <div className="text-xs text-muted-foreground mb-0.5">সদস্য</div>
                <div className="font-bold text-foreground">{members?.[actionDialog.req.member_id]?.full_name}</div>
                <div className="text-2xl font-extrabold text-foreground mt-1">৳{bnNum(actionDialog.req.amount)}</div>
                {actionDialog.req.reason && (
                  <div className="text-xs text-muted-foreground mt-2">
                    <span className="font-semibold">কারণ:</span> {actionDialog.req.reason}
                  </div>
                )}
              </div>

              {actionDialog.type === "approve" && (
                <div>
                  <Label className="text-sm font-semibold mb-1.5 block">অনুমোদিত পরিমাণ (৳)</Label>
                  <Input
                    type="number"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    className="bg-secondary border-border/50 h-11"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">কম দিতে চাইলে পরিমাণ পরিবর্তন করুন</p>
                </div>
              )}

              <div>
                <Label className="text-sm font-semibold mb-1.5 block">
                  {actionDialog.type === "reject" ? "বাতিলের কারণ" : "নোট"}
                  {actionDialog.type === "reject" && <span className="text-red-400"> *</span>}
                  {actionDialog.type === "approve" && <span className="text-muted-foreground text-xs font-normal"> (ঐচ্ছিক)</span>}
                </Label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder={actionDialog.type === "reject" ? "কেন বাতিল করছেন তা সদস্যকে জানান..." : "অতিরিক্ত বার্তা..."}
                  className="bg-secondary border-border/50 min-h-[80px]"
                  rows={3}
                />
                {actionDialog.type === "reject" && (
                  <p className="text-[10px] text-amber-300 mt-1">⚠️ সদস্য এই কারণটি দেখতে পাবেন</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setActionDialog(null)} className="flex-1">
                  বাতিল
                </Button>
                <Button
                  onClick={() => {
                    if (actionDialog.type === "reject" && !adminNote.trim()) {
                      toast.error("বাতিলের কারণ লিখুন");
                      return;
                    }
                    reviewMut.mutate({
                      id: actionDialog.req.id,
                      status: actionDialog.type === "approve" ? "approved" : "rejected",
                      note: adminNote.trim(),
                      amount: actionDialog.type === "approve" ? Number(approvedAmount) : undefined,
                    });
                  }}
                  disabled={reviewMut.isPending}
                  className={`flex-1 font-bold ${
                    actionDialog.type === "approve"
                      ? "bg-emerald-500 hover:bg-emerald-600"
                      : "bg-red-500 hover:bg-red-600"
                  } text-white`}
                >
                  {reviewMut.isPending ? "..." : actionDialog.type === "approve" ? "অনুমোদন করুন" : "বাতিল করুন"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
