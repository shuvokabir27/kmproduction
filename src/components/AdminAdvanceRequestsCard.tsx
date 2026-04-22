import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Bell, CheckCircle2, XCircle, Clock, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

function bnNum(n: number | string): string {
  const map: Record<string, string> = { "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪", "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯" };
  return String(n).split("").map((c) => map[c] ?? c).join("");
}

export function AdminAdvanceRequestsCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [actionDialog, setActionDialog] = useState<{ type: "approve" | "reject"; req: any } | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");

  const { data: pendingRequests } = useQuery({
    queryKey: ["admin-advance-pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advance_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const memberIds = Array.from(new Set((pendingRequests ?? []).map((r) => r.member_id)));
  const { data: members } = useQuery({
    queryKey: ["admin-advance-pending-members", memberIds.join(",")],
    queryFn: async () => {
      if (memberIds.length === 0) return {};
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, photo_url, member_id, designation")
        .in("id", memberIds);
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
    onSuccess: () => {
      toast.success("সফলভাবে আপডেট হয়েছে");
      setActionDialog(null);
      setAdminNote("");
      setApprovedAmount("");
      qc.invalidateQueries({ queryKey: ["admin-advance-pending"] });
      qc.invalidateQueries({ queryKey: ["admin-advance-requests"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "আপডেট করা যায়নি"),
  });

  const requests = pendingRequests ?? [];
  const count = requests.length;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-orange-500/5 backdrop-blur-xl shadow-lg overflow-hidden"
      >
        <div className="relative p-2.5 md:p-3">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative shrink-0">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/30">
                  <Wallet className="h-4 w-4 text-white" />
                </div>
                {count > 0 && (
                  <motion.span
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-background"
                  >
                    {bnNum(count)}
                  </motion.span>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs md:text-sm font-extrabold text-foreground flex items-center gap-1 truncate">
                  অ্যাডভান্স রিকোয়েস্ট
                  {count > 0 && <Bell className="h-3 w-3 text-amber-400 animate-pulse shrink-0" />}
                </h3>
                <p className="text-[10px] text-muted-foreground truncate">
                  {count > 0 ? `${bnNum(count)}টি অপেক্ষমান` : "✅ সব রিভিউ করা হয়েছে"}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/admin/advances")}
              className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-card/60 hover:bg-card border border-border/50 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              সব দেখুন
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Pending List */}
          {count > 0 && (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              <AnimatePresence>
                {requests.map((r) => {
                  const member = members?.[r.member_id];
                  return (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="p-3 rounded-xl bg-card/70 border border-amber-500/20 hover:border-amber-500/50 transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        {/* Avatar */}
                        {member?.photo_url ? (
                          <img
                            src={member.photo_url}
                            alt={member.full_name}
                            className="h-9 w-9 rounded-full object-cover border border-amber-500/30 shrink-0"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                            {member?.full_name?.[0] ?? "?"}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-foreground truncate">
                              {member?.full_name ?? "অজানা সদস্য"}
                            </span>
                            {member?.member_id && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-semibold">
                                #{bnNum(member.member_id)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-base font-extrabold text-amber-300">
                              ৳{bnNum(r.amount)}
                            </span>
                            <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: bn })}
                            </span>
                          </div>
                          {r.reason && (
                            <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                              <span className="font-semibold text-foreground/70">কারণ:</span> {r.reason}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-1.5 mt-2">
                            <button
                              onClick={() => {
                                setActionDialog({ type: "approve", req: r });
                                setApprovedAmount(String(r.amount));
                                setAdminNote("");
                              }}
                              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition-colors"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              অনুমোদন
                            </button>
                            <button
                              onClick={() => {
                                setActionDialog({ type: "reject", req: r });
                                setAdminNote("");
                              }}
                              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-[11px] font-bold transition-colors"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              বাতিল
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog?.type === "approve" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>অ্যাডভান্স অনুমোদন</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-400" />
                  <span>অ্যাডভান্স বাতিল</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {actionDialog && (
            <div className="space-y-4">
              <div className="rounded-lg p-3 bg-muted/30 border border-border/40">
                <div className="text-xs text-muted-foreground">সদস্য</div>
                <div className="text-sm font-bold">
                  {members?.[actionDialog.req.member_id]?.full_name ?? "অজানা"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">রিকোয়েস্ট পরিমাণ</div>
                <div className="text-base font-extrabold text-amber-300">
                  ৳{bnNum(actionDialog.req.amount)}
                </div>
                {actionDialog.req.reason && (
                  <div className="text-[11px] text-muted-foreground mt-2">
                    <span className="font-semibold">কারণ:</span> {actionDialog.req.reason}
                  </div>
                )}
              </div>

              {actionDialog.type === "approve" && (
                <div>
                  <Label className="text-sm font-semibold mb-1.5 block">
                    অনুমোদিত পরিমাণ (৳) <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    className="bg-secondary border-border/50"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    আংশিক অনুমোদন করতে চাইলে কম পরিমাণ দিন
                  </p>
                </div>
              )}

              <div>
                <Label className="text-sm font-semibold mb-1.5 block">
                  {actionDialog.type === "approve" ? "নোট (ঐচ্ছিক)" : "বাতিলের কারণ"}
                  {actionDialog.type === "reject" && <span className="text-red-400"> *</span>}
                </Label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder={
                    actionDialog.type === "approve"
                      ? "যেমন: আগামী বেতন থেকে কাটা হবে"
                      : "সদস্য কেন বাতিল হলো তা দেখতে পারবে"
                  }
                  className="bg-secondary border-border/50 min-h-[70px]"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setActionDialog(null)} className="flex-1">
                  পিছনে
                </Button>
                <Button
                  onClick={() => {
                    if (actionDialog.type === "reject" && !adminNote.trim()) {
                      toast.error("বাতিলের কারণ লিখুন");
                      return;
                    }
                    if (actionDialog.type === "approve" && (!approvedAmount || Number(approvedAmount) <= 0)) {
                      toast.error("সঠিক পরিমাণ দিন");
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
                  className={`flex-1 font-bold text-white ${
                    actionDialog.type === "approve"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                      : "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600"
                  }`}
                >
                  {reviewMut.isPending
                    ? "আপডেট হচ্ছে..."
                    : actionDialog.type === "approve"
                    ? "অনুমোদন করুন"
                    : "বাতিল করুন"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
