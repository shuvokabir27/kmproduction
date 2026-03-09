import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemberBalance } from "@/hooks/useMemberBalance";
import { CreditCard, Plus, Wallet, Building, Smartphone, Download, Trash2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import PaymentReceipt from "@/components/PaymentReceipt";

const AdminPayments = () => {
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("");
  const [transactionId, setTransactionId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [deleteTimers, setDeleteTimers] = useState<Record<string, number>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Delete timer countdown
  useEffect(() => {
    const activeTimers = Object.entries(deleteTimers).filter(([, v]) => v > 0);
    if (activeTimers.length === 0) return;
    const interval = setInterval(() => {
      setDeleteTimers((prev) => {
        const next = { ...prev };
        for (const [id, val] of Object.entries(next)) {
          if (val > 0) next[id] = val - 1;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [deleteTimers]);

  const startDeleteTimer = (id: string) => {
    setDeleteTimers((prev) => ({ ...prev, [id]: 5 }));
  };

  const cancelDelete = (id: string) => {
    setDeleteTimers((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (deleteTimers[paymentId] !== 0) return;
    setDeletingId(paymentId);
    try {
      const { error } = await supabase.from("payments").delete().eq("id", paymentId);
      if (error) throw error;
      toast.success("পেমেন্ট ডিলিট হয়েছে এবং ব্যালেন্স আপডেট হয়েছে!");
      queryClient.invalidateQueries({ queryKey: ["admin-all-payments"] });
      queryClient.invalidateQueries({ queryKey: ["member-balance"] });
      queryClient.invalidateQueries({ queryKey: ["admin-member-balances"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
      setDeleteTimers((prev) => {
        const next = { ...prev };
        delete next[paymentId];
        return next;
      });
    }
  };

  const { data: members } = useQuery({
    queryKey: ["admin-members-pay"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("is_active", true).order("full_name");
      return data ?? [];
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["admin-all-payments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("*, profiles(full_name, member_id, photo_url)")
        .order("payment_date", { ascending: false });
      return data ?? [];
    },
  });

  const selectedProfile = members?.find((m) => m.id === selectedMember);
  const { data: memberBalance } = useMemberBalance(selectedMember || undefined);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !amount || !method) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("payments").insert({
        member_id: selectedMember,
        amount: Number(amount),
        payment_method: method as any,
        transaction_id: transactionId || null,
        notes: notes || null,
        paid_by: user!.id,
      });
      if (error) throw error;
      toast.success("পেমেন্ট সফল!");
      // Show receipt
      setReceiptData({
        memberName: selectedProfile?.full_name || "",
        memberId: selectedProfile?.member_id || 0,
        amount: Number(amount),
        method,
        transactionId: transactionId || null,
        notes: notes || null,
        date: new Date().toISOString(),
        totalEarned: memberBalance?.totalEarned || 0,
        totalPaid: (memberBalance?.totalPaid || 0) + Number(amount),
        balance: (memberBalance?.balance || 0) - Number(amount),
      });
      queryClient.invalidateQueries({ queryKey: ["admin-all-payments"] });
      queryClient.invalidateQueries({ queryKey: ["member-balance"] });
      setOpen(false);
      setSelectedMember(""); setAmount(""); setMethod(""); setTransactionId(""); setNotes("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const methodLabel: Record<string, string> = { bank: "ব্যাংক", bkash: "বিকাশ", nagad: "নগদ", cash: "ক্যাশ" };
  const methodIcon: Record<string, any> = { bank: Building, bkash: Smartphone, nagad: Smartphone, cash: Wallet };

  const showReceiptForPayment = async (payment: any) => {
    // Fetch member balance info
    const { data: attendance } = await supabase.from("attendance").select("daily_rate").eq("member_id", payment.member_id).eq("is_present", true);
    const totalEarned = attendance?.reduce((sum, a) => sum + Number(a.daily_rate || 0), 0) ?? 0;
    const { data: allPayments } = await supabase.from("payments").select("amount").eq("member_id", payment.member_id);
    const totalPaid = allPayments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) ?? 0;
    const { data: bonuses } = await (supabase as any).from("bonuses").select("amount").eq("member_id", payment.member_id);
    const totalBonuses = bonuses?.reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0) ?? 0;
    const { data: salaryCredits } = await (supabase as any).from("salary_credits").select("amount").eq("member_id", payment.member_id);
    const totalSalaryCredits = salaryCredits?.reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0) ?? 0;
    const { data: profile } = await (supabase as any).from("profiles").select("previous_balance").eq("id", payment.member_id).maybeSingle();
    const previousBalance = Number((profile as any)?.previous_balance || 0);

    setReceiptData({
      memberName: payment.profiles?.full_name || "",
      memberId: payment.profiles?.member_id || 0,
      amount: Number(payment.amount),
      method: payment.payment_method,
      transactionId: payment.transaction_id || null,
      notes: payment.notes || null,
      date: payment.payment_date,
      totalEarned,
      totalPaid,
      balance: totalEarned + totalBonuses + totalSalaryCredits + previousBalance - totalPaid,
    });
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" /> পেমেন্ট ম্যানেজমেন্ট
          </h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> পেমেন্ট করুন</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border/50 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-foreground">নতুন পেমেন্ট</DialogTitle>
              </DialogHeader>
              <form onSubmit={handlePay} className="space-y-4">
                <div>
                  <Label className="text-foreground">সদস্য নির্বাচন করুন</Label>
                  <Select value={selectedMember} onValueChange={setSelectedMember}>
                    <SelectTrigger className="bg-secondary border-border/50">
                      <SelectValue placeholder="সদস্য নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/50">
                      {members?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.full_name} (ID: {m.member_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Member Info Card */}
                {selectedProfile && (
                   <Card className="p-4 bg-secondary/50 border-border/30 space-y-2">
                    {/* বকেয়া ব্যালেন্স - Highlighted */}
                    <div className="rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-red-500/15 border border-amber-500/30 p-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-amber-300">💰 বকেয়া ব্যালেন্স</span>
                      <span className="text-xl font-extrabold text-amber-400 tracking-tight">৳{memberBalance?.balance?.toLocaleString() || "0"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">আইডি</span>
                      <span className="text-sm text-foreground font-mono">{selectedProfile.member_id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">মোট আয়</span>
                      <span className="text-xs font-semibold text-emerald-400">৳{memberBalance?.totalEarned?.toLocaleString() || "0"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">মোট প্রদান</span>
                      <span className="text-xs font-semibold text-cyan-400">৳{memberBalance?.totalPaid?.toLocaleString() || "0"}</span>
                    </div>
                    {selectedProfile.bank_name && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">ব্যাংক</span>
                        <span className="text-xs text-foreground">{selectedProfile.bank_name} - {selectedProfile.bank_account_no}</span>
                      </div>
                    )}
                    {selectedProfile.bkash_no && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">বিকাশ</span>
                        <span className="text-xs text-foreground">{selectedProfile.bkash_no}</span>
                      </div>
                    )}
                    {selectedProfile.nagad_no && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">নগদ</span>
                        <span className="text-xs text-foreground">{selectedProfile.nagad_no}</span>
                      </div>
                    )}
                  </Card>
                )}

                <div>
                  <Label className="text-foreground">পরিমাণ (৳)</Label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="1" className="bg-secondary border-border/50" />
                </div>

                <div>
                  <Label className="text-foreground">পেমেন্ট মাধ্যম</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger className="bg-secondary border-border/50">
                      <SelectValue placeholder="মাধ্যম নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/50">
                      <SelectItem value="bank">🏦 ব্যাংক</SelectItem>
                      <SelectItem value="bkash">📱 বিকাশ</SelectItem>
                      <SelectItem value="nagad">📱 নগদ</SelectItem>
                      <SelectItem value="cash">💵 ক্যাশ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-foreground">পেমেন্ট লাস্ট ৪ ডিজিট (ঐচ্ছিক)</Label>
                  <Input
                    value={transactionId}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setTransactionId(val);
                    }}
                    placeholder="যেমন: 1234"
                    maxLength={4}
                    inputMode="numeric"
                    className="bg-secondary border-border/50 tracking-widest text-lg font-mono"
                  />
                </div>

                <div>
                  <Label className="text-foreground">নোট (ঐচ্ছিক)</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-secondary border-border/50" />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "প্রসেস হচ্ছে..." : "পেমেন্ট সম্পন্ন করুন"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Payment History */}
        <Card className="bg-card border-border/50 overflow-hidden">
          <div className="p-4 border-b border-border/30">
            <h2 className="font-semibold text-foreground">সকল পেমেন্ট হিস্ট্রি</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-secondary/30">
                  <th className="text-left p-3 text-cyan-400 font-medium text-xs">সদস্য</th>
                  <th className="text-left p-3 text-emerald-400 font-medium text-xs">পরিমাণ</th>
                  <th className="text-left p-3 text-amber-400 font-medium text-xs hidden sm:table-cell">মাধ্যম</th>
                  <th className="text-left p-3 text-violet-400 font-medium text-xs hidden md:table-cell">ট্রানজেকশন</th>
                  <th className="text-left p-3 text-pink-400 font-medium text-xs">তারিখ</th>
                  <th className="text-center p-3 text-blue-400 font-medium text-xs">রিসিট</th>
                  <th className="text-center p-3 text-red-400 font-medium text-xs">ডিলিট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {payments?.map((p: any) => {
                  const MIcon = methodIcon[p.payment_method] || CreditCard;
                  return (
                     <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                       <td className="p-3">
                         <div className="flex items-center gap-2">
                           <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden shrink-0">
                             {p.profiles?.photo_url ? (
                               <img src={p.profiles.photo_url} alt={p.profiles?.full_name} className="h-full w-full object-cover" />
                             ) : (
                               <span className="text-primary text-[10px] font-medium">{p.profiles?.full_name?.charAt(0) || "M"}</span>
                             )}
                           </div>
                           <div>
                             <p className="text-foreground">{p.profiles?.full_name}</p>
                             <p className="text-xs text-muted-foreground">ID: {p.profiles?.member_id}</p>
                           </div>
                         </div>
                       </td>
                      <td className="p-3 text-foreground font-medium">৳{Number(p.amount).toLocaleString()}</td>
                      <td className="p-3 hidden sm:table-cell">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground inline-flex items-center gap-1">
                          <MIcon className="h-3 w-3" />
                          {methodLabel[p.payment_method] || p.payment_method}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs hidden md:table-cell">{p.transaction_id || "—"}</td>
                      <td className="p-3 text-muted-foreground text-xs">{new Date(p.payment_date).toLocaleDateString("bn-BD")}</td>
                      <td className="p-3 text-center">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => showReceiptForPayment(p)}>
                          <Download className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      </td>
                      <td className="p-3 text-center">
                        {deleteTimers[p.id] === undefined ? (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startDeleteTimer(p.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        ) : deleteTimers[p.id] > 0 ? (
                          <div className="flex items-center gap-1 justify-center">
                            <span className="text-xs text-destructive font-bold">{deleteTimers[p.id]}s</span>
                            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-muted-foreground" onClick={() => cancelDelete(p.id)}>
                              বাতিল
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-[10px] px-2"
                            disabled={deletingId === p.id}
                            onClick={() => handleDeletePayment(p.id)}
                          >
                            {deletingId === p.id ? "..." : "ডিলিট"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {payments?.length === 0 && (
                  <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">কোনো পেমেন্ট নেই</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Payment Receipt */}
        {receiptData && (
          <PaymentReceipt
            receiptData={receiptData}
            onClose={() => setReceiptData(null)}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default AdminPayments;
