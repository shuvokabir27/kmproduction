import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Plus, Clock, CheckCircle2, XCircle, AlertCircle, Sparkles, History, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { bn } from "date-fns/locale";

function bnNum(n: number | string): string {
  const map: Record<string, string> = { "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪", "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯" };
  return String(n).split("").map((c) => map[c] ?? c).join("");
}

const STATUS_META: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  pending: { label: "অপেক্ষমান", icon: Clock, color: "text-red-300", bg: "bg-red-500/10", border: "border-red-500/40" },
  approved: { label: "অনুমোদিত", icon: CheckCircle2, color: "text-red-300", bg: "bg-red-500/10", border: "border-red-500/40" },
  rejected: { label: "বাতিল", icon: XCircle, color: "text-red-300", bg: "bg-red-500/10", border: "border-red-500/40" },
  cancelled: { label: "নিজে বাতিল করেছেন", icon: AlertCircle, color: "text-muted-foreground", bg: "bg-muted/30", border: "border-border/40" },
};

export function AdvanceRequestCard() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const { data: requests } = useQuery({
    queryKey: ["my-advance-requests", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advance_requests")
        .select("*")
        .eq("member_id", profile?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.id,
  });

  const pending = (requests ?? []).filter((r) => r.status === "pending");
  const lastRejected = (requests ?? []).find((r) => r.status === "rejected" && r.admin_note);

  // Limits: max 3 per day, 1 hour cooldown after rejection
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayCount = (requests ?? []).filter((r) => new Date(r.created_at) >= startOfToday).length;
  const dailyLimitReached = todayCount >= 3;

  const lastRejectedAny = (requests ?? []).find((r) => r.status === "rejected" && r.reviewed_at);
  const cooldownMs = lastRejectedAny?.reviewed_at
    ? 60 * 60 * 1000 - (Date.now() - new Date(lastRejectedAny.reviewed_at).getTime())
    : 0;
  const cooldownActive = cooldownMs > 0;
  const cooldownMinutes = Math.ceil(cooldownMs / 60000);

  const blocked = pending.length > 0 || dailyLimitReached || cooldownActive;
  const blockReason = pending.length > 0
    ? "ইতিমধ্যে একটি রিকোয়েস্ট অপেক্ষমান"
    : dailyLimitReached
    ? "আজকের সীমা শেষ (৩/৩)"
    : cooldownActive
    ? `${bnNum(cooldownMinutes)} মিনিট পর আবার চেষ্টা করুন`
    : "";

  const createMut = useMutation({
    mutationFn: async () => {
      const amt = Number(amount);
      if (!amt || amt <= 0) throw new Error("সঠিক পরিমাণ লিখুন");
      if (!profile?.id) throw new Error("প্রোফাইল পাওয়া যায়নি");
      const { error } = await supabase.from("advance_requests").insert({
        member_id: profile.id,
        amount: amt,
        reason: reason.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("অ্যাডভান্স রিকোয়েস্ট পাঠানো হয়েছে!");
      setCreateOpen(false);
      setAmount("");
      setReason("");
      qc.invalidateQueries({ queryKey: ["my-advance-requests"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "রিকোয়েস্ট পাঠানো যায়নি"),
  });

  const cancelMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("advance_requests")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("রিকোয়েস্ট বাতিল হয়েছে");
      qc.invalidateQueries({ queryKey: ["my-advance-requests"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "বাতিল করা যায়নি"),
  });

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/10 via-card to-black backdrop-blur-xl shadow-lg overflow-hidden"
      >
        {/* Decorative background */}
        <motion.div
          aria-hidden
          animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 20% 50%, #ef4444 0%, transparent 50%), radial-gradient(circle at 80% 50%, #ffffff 0%, transparent 50%)",
            backgroundSize: "200% 200%",
          }}
        />

        <div className="relative p-4 md:p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm md:text-base font-extrabold text-foreground">অ্যাডভান্স রিকোয়েস্ট</h3>
                <p className="text-[10px] md:text-[11px] text-muted-foreground">বেতনের আগে অগ্রিম টাকা চাইতে পারেন</p>
              </div>
            </div>
            {requests && requests.length > 0 && (
              <button
                onClick={() => setHistoryOpen(true)}
                className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-card/60 hover:bg-card border border-border/50 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <History className="h-3 w-3" />
                ইতিহাস ({bnNum(requests.length)})
              </button>
            )}
          </div>

          {/* Pending request indicator */}
          {pending.length > 0 && (
            <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
              <Clock className="h-4 w-4 text-red-400 animate-pulse shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-red-200">
                  ৳{bnNum(pending[0].amount)} — অপেক্ষমান
                </div>
                <div className="text-[10px] text-red-200/70">অ্যাডমিনের অনুমোদনের অপেক্ষায়</div>
              </div>
              <span className="shrink-0 text-[10px] px-2 py-1 rounded-md bg-red-500/20 text-red-200 border border-red-500/30 font-semibold">
                প্রসেসিং
              </span>
            </div>
          )}

          {/* Last rejection reason */}
          {lastRejected && pending.length === 0 && (
            <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-1.5 mb-1">
                <XCircle className="h-3.5 w-3.5 text-red-400" />
                <span className="text-[11px] font-bold text-red-300">শেষ রিকোয়েস্ট বাতিল হয়েছিল</span>
              </div>
              <div className="text-[11px] text-red-200/80 pl-5">
                <span className="font-semibold">কারণ:</span> {lastRejected.admin_note}
              </div>
            </div>
          )}

          {/* Cooldown / daily limit notice */}
          {(cooldownActive || dailyLimitReached) && pending.length === 0 && (
            <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
              <Clock className="h-4 w-4 text-red-400 shrink-0" />
              <div className="text-[11px] text-red-200/90 flex-1">
                {dailyLimitReached
                  ? `আজ আপনি ${bnNum(todayCount)}টি রিকোয়েস্ট করেছেন। একদিনে সর্বোচ্চ ৩টি রিকোয়েস্ট করা যায়।`
                  : `বাতিল হওয়ার পর পুনরায় রিকোয়েস্ট করতে আরো ${bnNum(cooldownMinutes)} মিনিট অপেক্ষা করুন।`}
              </div>
            </div>
          )}

          {/* Daily counter */}
          {!dailyLimitReached && !cooldownActive && pending.length === 0 && (
            <div className="mb-2 text-[10px] text-muted-foreground text-right">
              আজ: {bnNum(todayCount)}/৩ রিকোয়েস্ট
            </div>
          )}

          {/* CTA Button — animated, attention-grabbing */}
          <motion.button
            onClick={() => setCreateOpen(true)}
            disabled={blocked}
            whileHover={{ scale: blocked ? 1 : 1.02 }}
            whileTap={{ scale: 0.98 }}
            animate={!blocked ? {
              boxShadow: [
                "0 0 0 0 rgba(16,185,129,0.6)",
                "0 0 0 10px rgba(16,185,129,0)",
                "0 0 0 0 rgba(16,185,129,0)",
              ],
            } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            className={`relative w-full overflow-hidden inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-extrabold text-sm transition-colors ${
              blocked
                ? "bg-muted/40 text-muted-foreground cursor-not-allowed"
                : "bg-gradient-to-r from-red-500 via-red-500 to-cyan-500 text-white"
            }`}
          >
            {!blocked && (
              <motion.span
                aria-hidden
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                animate={{ x: ["-150%", "150%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                style={{ width: "60%" }}
              />
            )}
            <Plus className="relative z-10 h-4 w-4" />
            <span className="relative z-10">
              {blocked ? blockReason : "অ্যাডভান্স রিকোয়েস্ট করুন"}
            </span>
            {!blocked && <Sparkles className="relative z-10 h-3.5 w-3.5 animate-pulse" />}
          </motion.button>
        </div>
      </motion.div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md bg-gradient-to-br from-red-500/5 via-card to-cyan-500/5 border-red-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4 text-red-400" />
              <span>অ্যাডভান্স রিকোয়েস্ট</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-foreground text-sm font-semibold mb-1.5 block">
                পরিমাণ (৳) <span className="text-red-400">*</span>
              </Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="যেমন: 5000"
                className="bg-secondary border-border/50 text-base h-11"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-foreground text-sm font-semibold mb-1.5 block">
                কারণ <span className="text-muted-foreground text-xs font-normal">(ঐচ্ছিক)</span>
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="কেন অ্যাডভান্স প্রয়োজন তা সংক্ষেপে লিখুন..."
                className="bg-secondary border-border/50 min-h-[80px]"
                rows={3}
              />
            </div>
            <div className="rounded-lg p-3 bg-red-500/10 border border-red-500/30 text-[11px] text-red-200/90">
              💡 অ্যাডমিন আপনার রিকোয়েস্ট রিভিউ করে অনুমোদন বা বাতিল করবেন। অনুমোদিত হলে নোটিফিকেশন পাবেন।
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCreateOpen(false)}
                className="flex-1"
              >
                বাতিল
              </Button>
              <Button
                onClick={() => createMut.mutate()}
                disabled={createMut.isPending || !amount}
                className="flex-1 bg-gradient-to-r from-red-500 to-cyan-500 hover:from-red-600 hover:to-cyan-600 text-white font-bold"
              >
                {createMut.isPending ? "পাঠানো হচ্ছে..." : "রিকোয়েস্ট পাঠান"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-red-400" />
              <span>অ্যাডভান্স রিকোয়েস্ট ইতিহাস</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2.5">
            <AnimatePresence>
              {(requests ?? []).map((r) => {
                const meta = STATUS_META[r.status];
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`p-3 rounded-xl border ${meta.border} ${meta.bg}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${meta.color}`} />
                        <span className="text-base font-extrabold text-foreground">৳{bnNum(r.amount)}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${meta.color} ${meta.bg} border ${meta.border}`}>
                          {meta.label}
                        </span>
                      </div>
                      {r.status === "pending" && (
                        <button
                          onClick={() => cancelMut.mutate(r.id)}
                          className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-semibold"
                        >
                          বাতিল
                        </button>
                      )}
                    </div>
                    {r.reason && (
                      <div className="text-[11px] text-muted-foreground mb-1">
                        <span className="font-semibold text-foreground/80">কারণ:</span> {r.reason}
                      </div>
                    )}
                    {r.admin_note && (
                      <div className={`text-[11px] mt-1.5 p-2 rounded ${r.status === "rejected" ? "bg-red-500/10 text-red-200" : "bg-red-500/10 text-red-200"}`}>
                        <span className="font-semibold">অ্যাডমিন বার্তা:</span> {r.admin_note}
                      </div>
                    )}
                    {r.status === "approved" && r.approved_amount && Number(r.approved_amount) !== Number(r.amount) && (
                      <div className="text-[11px] text-red-300 mt-1">
                        ✅ অনুমোদিত: ৳{bnNum(r.approved_amount)}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground/70 mt-1.5">
                      {format(new Date(r.created_at), "d MMM yyyy, h:mm a", { locale: bn })}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {(!requests || requests.length === 0) && (
              <div className="text-center text-sm text-muted-foreground py-6">কোনো ইতিহাস নেই</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
