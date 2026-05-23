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
import { CreditCard, Plus, Wallet, Building, Smartphone, Download, Trash2, Copy, Search, FileDown, MessageCircle, Send, CheckCircle2 } from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
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
  const [smsPhone, setSmsPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [deleteTimers, setDeleteTimers] = useState<Record<string, number>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [searchText, setSearchText] = useState("");

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

  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    if (!searchText.trim()) return payments;
    const q = searchText.trim().toLowerCase();
    return payments.filter((p: any) =>
      p.profiles?.full_name?.toLowerCase().includes(q) ||
      String(p.profiles?.member_id || "").includes(q)
    );
  }, [payments, searchText]);

  const handleDownloadFiltered = async () => {
    if (filteredPayments.length === 0) { toast.error("কোনো রেকর্ড নেই"); return; }
    const totalAmount = filteredPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;top:-9999px;left:0;width:800px;padding:32px;background:#0a0a0a;color:#fff;font-family:sans-serif;";
    container.innerHTML = `
      <div style="text-align:center;margin-bottom:20px;">
        <h2 style="font-size:20px;margin:0 0 4px;">পেমেন্ট হিস্ট্রি রিপোর্ট</h2>
        ${searchText.trim() ? `<p style="font-size:13px;color:#aaa;margin:0;">সার্চ: "${searchText.trim()}" — ${filteredPayments.length} টি রেকর্ড</p>` : `<p style="font-size:13px;color:#aaa;margin:0;">সকল পেমেন্ট — ${filteredPayments.length} টি রেকর্ড</p>`}
        <p style="font-size:11px;color:#888;margin:4px 0 0;">তারিখ: ${new Date().toLocaleDateString("bn-BD")}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:2px solid #333;">
            <th style="text-align:left;padding:8px;color:#22d3ee;">সদস্য</th>
            <th style="text-align:left;padding:8px;color:#22d3ee;">আইডি</th>
            <th style="text-align:right;padding:8px;color:#10b981;">পরিমাণ</th>
            <th style="text-align:left;padding:8px;color:#f59e0b;">মাধ্যম</th>
            <th style="text-align:left;padding:8px;color:#ec4899;">তারিখ</th>
          </tr>
        </thead>
        <tbody>
          ${filteredPayments.map((p: any, i: number) => `
            <tr style="border-bottom:1px solid #222;${i % 2 === 0 ? 'background:#111;' : ''}">
              <td style="padding:8px;">${p.profiles?.full_name || ""}</td>
              <td style="padding:8px;color:#aaa;">${p.profiles?.member_id || ""}</td>
              <td style="padding:8px;text-align:right;font-weight:bold;">৳${Number(p.amount).toLocaleString("bn-BD")}</td>
              <td style="padding:8px;color:#aaa;">${methodLabel[p.payment_method] || p.payment_method}</td>
              <td style="padding:8px;color:#aaa;">${new Date(p.payment_date).toLocaleDateString("bn-BD")}</td>
            </tr>
          `).join("")}
        </tbody>
        <tfoot>
          <tr style="border-top:2px solid #333;">
            <td colspan="2" style="padding:10px;font-weight:bold;font-size:14px;">মোট:</td>
            <td style="padding:10px;text-align:right;font-weight:bold;font-size:14px;color:#10b981;">৳${totalAmount.toLocaleString("bn-BD")}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    `;
    document.body.appendChild(container);
    try {
      const canvas = await html2canvas(container, { scale: 2, backgroundColor: "#0a0a0a" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: canvas.width > canvas.height ? "landscape" : "portrait", unit: "px", format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`পেমেন্ট_হিস্ট্রি${searchText.trim() ? `_${searchText.trim()}` : ""}.pdf`);
      toast.success("PDF ডাউনলোড হয়েছে!");
    } finally { document.body.removeChild(container); }
  };

  const selectedProfile = members?.find((m) => m.id === selectedMember);

  const normalizeSmsPhone = (value: string) => {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("01")) return `88${digits}`;
    if (digits.length === 10 && digits.startsWith("1")) return `880${digits}`;
    if (digits.length === 13 && digits.startsWith("8801")) return digits;
    return "";
  };

  const getSmsErrorMessage = (result: any) => {
    const failed = Array.isArray(result?.results) ? result.results.find((r: any) => !r?.ok) : null;
    const response = failed?.response || result?.results?.[0]?.response || result;
    const rawMessage = response?.error_message || failed?.error || result?.reason || result?.error || "SMS পাঠানো যায়নি";
    if (String(rawMessage).toLowerCase().includes("not whitelisted")) {
      const ip = String(rawMessage).match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/)?.[0];
      return `SMS সার্ভিসে IP whitelist করা নেই। BulkSMSBD Phonebook-এ${ip ? ` ${ip}` : " এই"} IP whitelist করুন, অথবা IP restriction বন্ধ করুন।`;
    }
    return rawMessage;
  };

  // Auto-fill SMS phone when member selected
  useEffect(() => {
    if (!selectedMember) { setSmsPhone(""); return; }
    const sp: any = selectedProfile || {};
    const raw = String(sp.sms_mobile || sp.phone || sp.whatsapp_no || sp.bkash_no || sp.nagad_no || "").replace(/\D/g, "");
    // Strip leading 88 if present so user sees 01XXXXXXXXX
    const local = raw.startsWith("88") ? raw.slice(2) : raw;
    setSmsPhone(local.slice(0, 11));
  }, [selectedMember, selectedProfile]);

  const { data: memberBalance } = useMemberBalance(selectedMember || undefined);

  // SMS preview & cost calculator
  const smsPreview = useMemo(() => {
    if (!selectedProfile) return null;
    const mName = selectedProfile.full_name || "Member";
    const mLabelEn: Record<string, string> = { bank: "Bank", bkash: "bKash", nagad: "Nagad", cash: "Cash" };
    const prevDue = Number(memberBalance?.balance || 0);
    const newDue = Math.max(0, prevDue - Number(amount || 0));
    const dateStr = format(new Date(), "dd/MM/yyyy");
    const msg = `Dear ${mName}, Payment Tk ${Number(amount || 0).toLocaleString("en-US")} received via ${mLabelEn[method] || method || "Cash"} on ${dateStr}.${transactionId ? ` TrxID: ${transactionId}.` : ""} Due: Tk ${newDue.toLocaleString("en-US")}. Thank you. - KM Multimedia`;
    return msg;
  }, [selectedProfile, amount, method, transactionId, memberBalance]);

  const smsCost = useMemo(() => {
    if (!smsPreview) return null;
    const len = smsPreview.length;
    const perSegment = 0.35;
    const segments = len <= 160 ? 1 : Math.ceil(len / 153);
    const cost = (segments * perSegment).toFixed(2);
    return { len, segments, cost };
  }, [smsPreview]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !amount || !method) return;
    setSubmitting(true);
    try {
      const { data: inserted, error } = await supabase.from("payments").insert({
        member_id: selectedMember,
        amount: Number(amount),
        payment_method: method as any,
        transaction_id: transactionId || null,
        notes: notes || null,
        paid_by: user!.id,
      }).select("id").single();
      if (error) throw error;
      toast.success("পেমেন্ট সফল! রিসিট দেখতে পেমেন্ট হিস্ট্রি থেকে ক্লিক করুন।");
      // SMS payment confirmation to member (English-only for BulkSMSBD non-unicode)
      const mName = selectedProfile?.full_name || "Member";
      const mLabelEn: Record<string, string> = { bank: "Bank", bkash: "bKash", nagad: "Nagad", cash: "Cash" };
      const prevDue = Number(memberBalance?.balance || 0);
      const newDue = Math.max(0, prevDue - Number(amount));
      const dateStr = format(new Date(), "dd/MM/yyyy");
      const sp: any = selectedProfile || {};
      const phoneCandidate = normalizeSmsPhone((smsPhone.trim() || sp.sms_mobile || sp.phone || sp.whatsapp_no || sp.bkash_no || sp.nagad_no || "").toString());
      const msg = `Dear ${mName}, Payment Tk ${Number(amount).toLocaleString("en-US")} received via ${mLabelEn[method] || method} on ${dateStr}.${transactionId ? ` TrxID: ${transactionId}.` : ""} Due: Tk ${newDue.toLocaleString("en-US")}. Thank you. - KM Multimedia`;
      try {
        const { data: smsRes, error: smsErr } = await supabase.functions.invoke("send-team-sms",
          phoneCandidate ? { body: { phone: String(phoneCandidate), message: msg } } : { body: { member_id: selectedMember, message: msg } }
        );
        if (!smsErr && smsRes && (smsRes.sent ?? 0) > 0 && inserted?.id) {
          await supabase.from("payments").update({ sms_sent_at: new Date().toISOString() } as any).eq("id", inserted.id);
        } else {
          toast.error(getSmsErrorMessage(smsErr || smsRes));
        }
      } catch (e: any) { toast.error(e?.message || "SMS পাঠাতে সমস্যা হয়েছে"); }
      queryClient.invalidateQueries({ queryKey: ["admin-all-payments"] });
      queryClient.invalidateQueries({ queryKey: ["member-balance"] });
      setOpen(false);
      setSelectedMember(""); setAmount(""); setMethod(""); setTransactionId(""); setNotes(""); setSmsPhone("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const methodLabel: Record<string, string> = { bank: "ব্যাংক", bkash: "বিকাশ", nagad: "নগদ", cash: "ক্যাশ" };
  const methodIcon: Record<string, any> = { bank: Building, bkash: Smartphone, nagad: Smartphone, cash: Wallet };

  const showReceiptForPayment = async (payment: any) => {
    const { data: attendance } = await supabase.from("attendance").select("daily_rate").eq("member_id", payment.member_id).eq("is_present", true);
    const totalEarned = attendance?.reduce((sum, a) => sum + Number(a.daily_rate || 0), 0) ?? 0;
    const { data: allPayments } = await supabase.from("payments").select("amount").eq("member_id", payment.member_id);
    const totalPaid = allPayments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) ?? 0;
    const { data: bonuses } = await (supabase as any).from("bonuses").select("amount").eq("member_id", payment.member_id);
    const totalBonuses = bonuses?.reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0) ?? 0;
    const { data: salaryCredits } = await (supabase as any).from("salary_credits").select("amount, credit_month").eq("member_id", payment.member_id);
    const { data: profile } = await (supabase as any).from("profiles").select("previous_balance, salary_type, salary_type_changed_at, whatsapp_no, full_name").eq("id", payment.member_id).maybeSingle();
    const previousBalance = Number((profile as any)?.previous_balance || 0);
    
    // Filter salary credits if changed from monthly to daily
    let totalSalaryCredits = 0;
    if (salaryCredits) {
      let excludeFrom: string | null = null;
      if (profile?.salary_type === "daily" && profile?.salary_type_changed_at) {
        const d = new Date(profile.salary_type_changed_at);
        excludeFrom = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      }
      totalSalaryCredits = salaryCredits.reduce((sum: number, s: any) => {
        if (excludeFrom && s.credit_month >= excludeFrom) return sum;
        return sum + Number(s.amount || 0);
      }, 0);
    }
    
    const { data: freelanceData } = await (supabase as any).from("freelance_assignments").select("rate").eq("member_id", payment.member_id);
    const totalFreelance = freelanceData?.reduce((sum: number, f: any) => sum + Number(f.rate || 0), 0) ?? 0;

    setReceiptData({
      memberName: payment.profiles?.full_name || "",
      memberId: payment.profiles?.member_id || 0,
      amount: Number(payment.amount),
      method: payment.payment_method,
      transactionId: payment.transaction_id || null,
      notes: payment.notes || null,
      date: payment.payment_date,
      totalEarned,
      totalFreelance,
      totalPaid,
      balance: totalEarned + totalBonuses + totalSalaryCredits + totalFreelance + previousBalance - totalPaid,
      whatsappNo: (profile as any)?.whatsapp_no || null,
    });
  };

  // Quick WhatsApp send: render receipt off-screen → upload PNG to storage → open wa.me with link
  const [whatsappSendingId, setWhatsappSendingId] = useState<string | null>(null);
  const [smsSendingId, setSmsSendingId] = useState<string | null>(null);

  const sendSmsFromRow = async (payment: any) => {
    setSmsSendingId(payment.id);
    try {
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("full_name, phone, whatsapp_no, bkash_no, nagad_no, sms_mobile")
        .eq("id", payment.member_id).maybeSingle();
      const phoneCandidate = normalizeSmsPhone(profile?.sms_mobile || profile?.phone || profile?.whatsapp_no || profile?.bkash_no || profile?.nagad_no || "");
      if (!phoneCandidate) { toast.error("সদস্যের কোনো ফোন নাম্বার নেই"); return; }
      const mName = profile?.full_name || "Member";
      const mLabelEn: Record<string, string> = { bank: "Bank", bkash: "bKash", nagad: "Nagad", cash: "Cash" };
      const dateStr = format(new Date(payment.payment_date), "dd/MM/yyyy");
      const msg = `Dear ${mName}, Payment Tk ${Number(payment.amount).toLocaleString("en-US")} received via ${mLabelEn[payment.payment_method] || payment.payment_method} on ${dateStr}.${payment.transaction_id ? ` TrxID: ${payment.transaction_id}.` : ""} Thank you. - KM Multimedia`;
      const { data: smsRes, error: smsErr } = await supabase.functions.invoke("send-team-sms", { body: { phone: String(phoneCandidate), message: msg } });
      if (smsErr || !smsRes || (smsRes.sent ?? 0) === 0) {
        toast.error(getSmsErrorMessage(smsErr || smsRes));
        return;
      }
      await supabase.from("payments").update({ sms_sent_at: new Date().toISOString() } as any).eq("id", payment.id);
      toast.success("SMS পাঠানো হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["admin-all-payments"] });
    } catch (e: any) {
      toast.error(e?.message || "SMS পাঠাতে সমস্যা হয়েছে");
    } finally {
      setSmsSendingId(null);
    }
  };

  const sendWhatsAppFromRow = async (payment: any) => {
    setWhatsappSendingId(payment.id);
    try {
      // 1. Fetch profile + balance data
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("whatsapp_no, full_name, member_id")
        .eq("id", payment.member_id)
        .maybeSingle();
      const wno = (profile as any)?.whatsapp_no || "";
      if (!wno) {
        toast.error("WhatsApp নাম্বার নাই, WhatsApp নাম্বার যুক্ত করো।");
        return;
      }

      // 2. Compute balance (same logic as showReceiptForPayment)
      const [{ data: attendance }, { data: allPayments }, bonusesRes, salaryRes, freelanceRes, profile2Res] = await Promise.all([
        supabase.from("attendance").select("daily_rate").eq("member_id", payment.member_id).eq("is_present", true),
        supabase.from("payments").select("amount").eq("member_id", payment.member_id),
        (supabase as any).from("bonuses").select("amount").eq("member_id", payment.member_id),
        (supabase as any).from("salary_credits").select("amount, credit_month").eq("member_id", payment.member_id),
        (supabase as any).from("freelance_assignments").select("rate").eq("member_id", payment.member_id),
        (supabase as any).from("profiles").select("previous_balance, salary_type, salary_type_changed_at").eq("id", payment.member_id).maybeSingle(),
      ]);
      const totalEarned = attendance?.reduce((s, a) => s + Number(a.daily_rate || 0), 0) ?? 0;
      const totalPaid = allPayments?.reduce((s, p) => s + Number(p.amount || 0), 0) ?? 0;
      const totalBonuses = (bonusesRes.data as any[])?.reduce((s, b) => s + Number(b.amount || 0), 0) ?? 0;
      const totalFreelance = (freelanceRes.data as any[])?.reduce((s, f) => s + Number(f.rate || 0), 0) ?? 0;
      const previousBalance = Number((profile2Res.data as any)?.previous_balance || 0);
      let totalSalaryCredits = 0;
      const salaryCredits = salaryRes.data as any[];
      if (salaryCredits) {
        let excludeFrom: string | null = null;
        const p2 = profile2Res.data as any;
        if (p2?.salary_type === "daily" && p2?.salary_type_changed_at) {
          const d = new Date(p2.salary_type_changed_at);
          excludeFrom = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
        }
        totalSalaryCredits = salaryCredits.reduce((s: number, x: any) => {
          if (excludeFrom && x.credit_month >= excludeFrom) return s;
          return s + Number(x.amount || 0);
        }, 0);
      }
      const balance = totalEarned + totalBonuses + totalSalaryCredits + totalFreelance + previousBalance - totalPaid;

      // Detect advance: notes mentions "অগ্রিম"/"advance" OR balance is negative (overpaid)
      const noteText = String(payment.notes || "").toLowerCase();
      const isAdvance = balance < 0 || noteText.includes("অগ্রিম") || noteText.includes("advance");

      // 3. Render receipt off-screen and capture PNG
      toast.info("রিসিট তৈরি হচ্ছে...");
      const fullReceipt = {
        memberName: payment.profiles?.full_name || (profile as any)?.full_name || "",
        memberId: payment.profiles?.member_id || (profile as any)?.member_id || 0,
        amount: Number(payment.amount),
        method: payment.payment_method,
        transactionId: payment.transaction_id || null,
        notes: payment.notes || null,
        date: payment.payment_date,
        totalEarned, totalFreelance, totalPaid, balance,
        whatsappNo: wno,
      };

      // Render via offscreen container using ReactDOM
      const { createRoot } = await import("react-dom/client");
      const { default: Receipt } = await import("@/components/PaymentReceipt");
      const holder = document.createElement("div");
      holder.style.cssText = "position:fixed;top:-99999px;left:0;z-index:-1;";
      document.body.appendChild(holder);
      const root = createRoot(holder);
      await new Promise<void>((resolve) => {
        // Render in a wrapper that exposes the inner receipt
        root.render(
          <div>
            <Receipt receiptData={fullReceipt} onClose={() => {}} />
          </div>
        );
        setTimeout(resolve, 350);
      });
      // Capture the inner receipt card
      const target = holder.querySelector('[class*="bg-[#fafaf7]"]') as HTMLElement | null;
      if (!target) throw new Error("রিসিট রেন্ডার ব্যর্থ");
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(target, { quality: 0.95, backgroundColor: "#fafaf7", pixelRatio: 2 });
      root.unmount();
      document.body.removeChild(holder);

      // 4. Upload to storage
      const blob = await (await fetch(dataUrl)).blob();
      const fileName = `receipt-${payment.id}-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(fileName, blob, {
        contentType: "image/png",
        upsert: true,
      });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      // 5. Format phone & build message
      let formatted = wno.replace(/[^\d+]/g, "").replace(/^\+/, "");
      if (formatted.startsWith("0")) formatted = "880" + formatted.slice(1);
      else if (!formatted.startsWith("880")) formatted = "880" + formatted;

      const memberName = (profile as any)?.full_name || payment.profiles?.full_name || "";
      const paidAmt = Number(payment.amount).toLocaleString("bn-BD");

      // Payment method label with last 4 digits
      const methodNames: Record<string, string> = { bank: "ব্যাংক", bkash: "বিকাশ", nagad: "নগদ", cash: "ক্যাশ" };
      const methodName = methodNames[payment.payment_method] || payment.payment_method;
      let methodLine = methodName;
      if (payment.payment_method !== "cash" && payment.transaction_id) {
        const last4 = payment.payment_method === "bank"
          ? String(payment.transaction_id).slice(-4)
          : String(payment.transaction_id);
        methodLine = `${methodName} _(লাস্ট ৪ ডিজিট: ${last4})_`;
      }

      // Time-based greeting (Bangladesh time)
      const hour = new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", hour12: false });
      const h = parseInt(hour, 10);
      let greeting = "";
      let emoji = "";
      if (h >= 5 && h < 12) { greeting = "শুভ সকাল"; emoji = "🌅"; }
      else if (h >= 12 && h < 16) { greeting = "শুভ দুপুর"; emoji = "☀️"; }
      else if (h >= 16 && h < 18) { greeting = "শুভ বিকাল"; emoji = "🌤️"; }
      else if (h >= 18 && h < 20) { greeting = "শুভ সন্ধ্যা"; emoji = "🌆"; }
      else { greeting = "শুভ রাত্রি"; emoji = "🌙"; }

      const dueLine = balance > 0
        ? `🔴 *অবশিষ্ট বকেয়া:* ৳${balance.toLocaleString("bn-BD")}`
        : balance < 0
        ? `🟠 *অগ্রিম (আপনার কাছে কোম্পানি পাবে):* ৳${Math.abs(balance).toLocaleString("bn-BD")}`
        : `✅ _সকল হিসাব সমন্বয় হয়েছে — কোনো বকেয়া নেই।_`;

      // Headline changes based on whether this is an advance payment
      const paymentLine = isAdvance
        ? `💰 *অগ্রিম প্রদত্ত:* ৳${paidAmt}`
        : `✅ পেমেন্ট: *৳${paidAmt}*`;

      const introLine = isAdvance
        ? `📌 _আপনাকে অগ্রিম টাকা প্রদান করা হয়েছে। এই টাকা পরবর্তী আয় থেকে সমন্বয় হবে।_\n\n`
        : ``;

      const msg =
        `*আসসালামু আলাইকুম ${memberName}* 🌿\n` +
        `${emoji} _${greeting}!_\n\n` +
        `${introLine}` +
        `${paymentLine}\n` +
        `💳 মাধ্যম: ${methodLine}\n` +
        `${dueLine}\n\n` +
        `📄 রিসিট: ${publicUrl}\n` +
        `_⏳ লিংক ২৪ ঘন্টা সক্রিয়।_\n\n` +
        `🙏 _ধন্যবাদ আমাদের সাথে থাকার জন্য।_\n` +
        `🎬 *Kuakata Multimedia*`;

      window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(msg)}`, "_blank");
      toast.success(isAdvance ? "WhatsApp ওপেন হয়েছে — অগ্রিম মেসেজ পাঠান" : "WhatsApp ওপেন হয়েছে — রিসিট লিংক যুক্ত হয়েছে");
    } catch (err: any) {
      console.error("WhatsApp send failed", err);
      toast.error(err.message || "WhatsApp পাঠাতে সমস্যা হয়েছে");
    } finally {
      setWhatsappSendingId(null);
    }
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
            <DialogContent className="bg-card border-border/50 max-w-lg max-h-[90vh] overflow-y-auto">
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
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden shrink-0">
                              {m.photo_url ? (
                                <img src={m.photo_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-primary text-[10px] font-semibold">{m.full_name?.charAt(0)}</span>
                              )}
                            </div>
                            <span>{m.full_name} (ID: {m.member_id})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Member Bank Card */}
                {selectedProfile && (
                  <div className="relative rounded-2xl overflow-hidden p-5 space-y-3"
                    style={{
                      background: "linear-gradient(135deg, #450a0a 0%, #7f1d1d 30%, #991b1b 60%, #b91c1c 100%)",
                      backdropFilter: "blur(16px)",
                      WebkitBackdropFilter: "blur(16px)",
                      border: "1px solid rgba(255,100,100,0.3)",
                      boxShadow: "0 8px 32px rgba(185,28,28,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
                    }}
                  >
                    {/* Glass shine effect */}
                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/[0.12] to-transparent pointer-events-none rounded-t-2xl" />
                    <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-red-400/[0.08] pointer-events-none" />
                    <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-red-400/[0.06] pointer-events-none" />

                    {/* Header: Name + Photo centered */}
                    <div className="relative flex flex-col items-center gap-2">
                      <div className="h-14 w-14 rounded-full bg-white/10 border-2 border-white/25 flex items-center justify-center overflow-hidden shadow-lg">
                        {selectedProfile.photo_url ? (
                          <img src={selectedProfile.photo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-white/80 text-lg font-bold">{selectedProfile.full_name?.charAt(0)}</span>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-white/90">{selectedProfile.full_name}</p>
                        <p className="text-[10px] text-white/50 font-mono">ID: {selectedProfile.member_id}</p>
                      </div>
                      <CreditCard className="absolute top-0 right-0 h-5 w-5 text-white/20" />
                    </div>

                    {/* Balance - Big */}
                    <div className="relative text-center py-2">
                      <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
                        {(memberBalance?.balance ?? 0) > 0 ? "বকেয়া ব্যালেন্স" : (memberBalance?.balance ?? 0) < 0 ? "অগ্রিম ব্যালেন্স" : "সমন্বয়কৃত"}
                      </p>
                      <p className={`text-3xl font-black tracking-tight ${(memberBalance?.balance ?? 0) > 0 ? "text-red-300" : (memberBalance?.balance ?? 0) < 0 ? "text-red-300" : "text-cyan-300"}`}>
                        ৳{Math.abs(memberBalance?.balance ?? 0).toLocaleString()}
                      </p>
                    </div>

                    {/* Earned / Paid / Freelance row */}
                    <div className="relative flex items-center justify-between px-2">
                      <div className="text-center">
                        <p className="text-[9px] uppercase tracking-wider text-white/35">মোট আয়</p>
                        <p className="text-xs font-bold text-red-300/90">৳{memberBalance?.totalEarned?.toLocaleString() || "0"}</p>
                      </div>
                      <div className="w-px h-6 bg-white/10" />
                      <div className="text-center">
                        <p className="text-[9px] uppercase tracking-wider text-white/35">বাইরের আয়</p>
                        <p className="text-xs font-bold text-red-300/90">৳{memberBalance?.totalFreelance?.toLocaleString() || "0"}</p>
                      </div>
                      <div className="w-px h-6 bg-white/10" />
                      <div className="text-center">
                        <p className="text-[9px] uppercase tracking-wider text-white/35">মোট প্রদান</p>
                        <p className="text-xs font-bold text-cyan-300/90">৳{memberBalance?.totalPaid?.toLocaleString() || "0"}</p>
                      </div>
                    </div>

                    {/* Payment info chips */}
                    <div className="relative space-y-1.5 pt-1">
                      {selectedProfile.bank_name && (
                        <>
                          <div className="flex items-center justify-between rounded-lg bg-white/[0.06] px-3 py-1.5">
                            <div className="flex items-center gap-2">
                              <Building className="h-3 w-3 text-white/40" />
                              <span className="text-[11px] text-white/60">{selectedProfile.bank_name}</span>
                            </div>
                            <button type="button" onClick={() => { navigator.clipboard.writeText(selectedProfile.bank_name || ""); toast.success("ব্যাংক নাম কপি হয়েছে!"); }} className="text-white/30 hover:text-white/70 transition-colors">
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between rounded-lg bg-white/[0.06] px-3 py-1.5">
                            <span className="text-[11px] text-white/70 font-mono tracking-wider">{selectedProfile.bank_account_no}</span>
                            <button type="button" onClick={() => { navigator.clipboard.writeText(selectedProfile.bank_account_no || ""); toast.success("অ্যাকাউন্ট নম্বর কপি হয়েছে!"); }} className="text-white/30 hover:text-white/70 transition-colors">
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                          {selectedProfile.bank_account_holder && (
                            <div className="flex items-center justify-between rounded-lg bg-white/[0.06] px-3 py-1.5">
                              <span className="text-[11px] text-white/70">হোল্ডার: {selectedProfile.bank_account_holder}</span>
                              <button type="button" onClick={() => { navigator.clipboard.writeText(selectedProfile.bank_account_holder || ""); toast.success("হোল্ডার নাম কপি হয়েছে!"); }} className="text-white/30 hover:text-white/70 transition-colors">
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                      {selectedProfile.bkash_no && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between rounded-lg bg-white/[0.06] px-3 py-1.5">
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-3 w-3 text-pink-400/60" />
                              <span className="text-[11px] text-white/70">বিকাশ: {selectedProfile.bkash_no}</span>
                            </div>
                            <button type="button" onClick={() => { navigator.clipboard.writeText(selectedProfile.bkash_no || ""); toast.success("বিকাশ নম্বর কপি হয়েছে!"); }} className="text-white/30 hover:text-white/70 transition-colors">
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                          {selectedProfile.bkash_holder && (
                            <div className="flex items-center justify-between rounded-lg bg-white/[0.06] px-3 py-1.5">
                              <span className="text-[11px] text-white/70">হোল্ডার: {selectedProfile.bkash_holder}</span>
                              <button type="button" onClick={() => { navigator.clipboard.writeText(selectedProfile.bkash_holder || ""); toast.success("হোল্ডার নাম কপি হয়েছে!"); }} className="text-white/30 hover:text-white/70 transition-colors">
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {selectedProfile.nagad_no && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between rounded-lg bg-white/[0.06] px-3 py-1.5">
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-3 w-3 text-red-400/60" />
                              <span className="text-[11px] text-white/70">নগদ: {selectedProfile.nagad_no}</span>
                            </div>
                            <button type="button" onClick={() => { navigator.clipboard.writeText(selectedProfile.nagad_no || ""); toast.success("নগদ নম্বর কপি হয়েছে!"); }} className="text-white/30 hover:text-white/70 transition-colors">
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                          {selectedProfile.nagad_holder && (
                            <div className="flex items-center justify-between rounded-lg bg-white/[0.06] px-3 py-1.5">
                              <span className="text-[11px] text-white/70">হোল্ডার: {selectedProfile.nagad_holder}</span>
                              <button type="button" onClick={() => { navigator.clipboard.writeText(selectedProfile.nagad_holder || ""); toast.success("হোল্ডার নাম কপি হয়েছে!"); }} className="text-white/30 hover:text-white/70 transition-colors">
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
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

                {method !== "cash" && (
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
                )}

                <div>
                  <Label className="text-foreground">SMS পাঠানোর নাম্বার</Label>
                  <div className="flex items-stretch gap-2">
                    <span className="inline-flex items-center px-3 rounded-md bg-secondary border border-border/50 text-sm text-muted-foreground select-none">+88</span>
                    <Input
                      value={smsPhone}
                      onChange={(e) => setSmsPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                      placeholder="01XXXXXXXXX"
                      inputMode="numeric"
                      maxLength={11}
                      className="bg-secondary border-border/50 font-mono tracking-wide"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">খালি রাখলে সদস্যের প্রোফাইল নাম্বারে যাবে। ০ থেকে ১১ ডিজিট লিখুন।</p>
                </div>

                {/* SMS Demo Preview */}
                {smsPreview && smsCost && (
                  <div className="rounded-lg border border-border/40 bg-emerald-950/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-400" /> মেম্বারের কাছে যে SMS যাবে
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${smsCost.segments > 1 ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                        {smsCost.segments} SMS × ৳0.35 = ৳{smsCost.cost}
                      </span>
                    </div>
                    {/* Message bubble style */}
                    <div className="relative bg-emerald-600/15 border border-emerald-500/25 rounded-xl rounded-tl-sm px-3.5 py-3">
                      <p className="text-[12px] text-foreground/90 leading-relaxed break-words font-medium whitespace-pre-wrap">
                        {smsPreview}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        {smsCost.len} অক্ষর
                      </span>
                      <span>
                        {smsCost.segments > 1
                          ? `১টি SMS = ১৫৩ অক্ষর — ${smsCost.segments}টি SMS পাঠাতে হবে`
                          : "১টি SMS-এ পাঠানো যাবে (সীমা ১৬০ অক্ষর)"}
                      </span>
                    </div>
                  </div>
                )}

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
          <div className="p-4 border-b border-border/30 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">সকল পেমেন্ট হিস্ট্রি</h2>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleDownloadFiltered} disabled={filteredPayments.length === 0}>
                <FileDown className="h-3.5 w-3.5" />
                {searchText.trim() ? "ফিল্টারড ডাউনলোড" : "সব ডাউনলোড"}
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="নাম বা আইডি দিয়ে সার্চ করুন..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9 bg-secondary border-border/50"
              />
            </div>
            {searchText.trim() && (
              <p className="text-xs text-muted-foreground">{filteredPayments.length} টি রেকর্ড পাওয়া গেছে • মোট: ৳{filteredPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0).toLocaleString("bn-BD")}</p>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30 bg-secondary/30">
                  <th className="text-left p-3 text-cyan-400 font-medium text-xs">সদস্য</th>
                  <th className="text-left p-3 text-red-400 font-medium text-xs">পরিমাণ</th>
                  <th className="text-left p-3 text-red-400 font-medium text-xs hidden sm:table-cell">মাধ্যম</th>
                  <th className="text-left p-3 text-violet-400 font-medium text-xs hidden md:table-cell">লাস্ট ৪ ডিজিট</th>
                  <th className="text-left p-3 text-pink-400 font-medium text-xs">তারিখ</th>
                  <th className="text-center p-3 text-emerald-400 font-medium text-xs">SMS</th>
                  <th className="text-center p-3 text-blue-400 font-medium text-xs">রিসিট / WhatsApp</th>
                  <th className="text-center p-3 text-red-400 font-medium text-xs">ডিলিট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filteredPayments.map((p: any) => {
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
                        <div className="flex items-center justify-center gap-1.5">
                          {p.sms_sent_at ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" title={`পাঠানো: ${new Date(p.sms_sent_at).toLocaleString("bn-BD")}`}>
                              <CheckCircle2 className="h-3 w-3" /> পাঠানো
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">পাঠানো হয়নি</span>
                          )}
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-emerald-500/40 hover:bg-emerald-500/10" onClick={() => sendSmsFromRow(p)} disabled={smsSendingId === p.id} title={p.sms_sent_at ? "আবার SMS পাঠান" : "SMS পাঠান"}>
                            {smsSendingId === p.id ? (
                              <span className="h-3 w-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5 text-emerald-500" />
                            )}
                          </Button>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-primary/30 hover:bg-primary/10" onClick={() => showReceiptForPayment(p)} title="রিসিট দেখুন">
                            <Download className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-red-500/40 hover:bg-red-500/10" onClick={() => sendWhatsAppFromRow(p)} disabled={whatsappSendingId === p.id} title="WhatsApp-এ রিসিট লিংক পাঠান">
                            {whatsappSendingId === p.id ? (
                              <span className="h-3 w-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <MessageCircle className="h-4 w-4 text-red-500" />
                            )}
                          </Button>
                        </div>
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
                {filteredPayments.length === 0 && (
                  <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">{searchText.trim() ? "কোনো ফলাফল পাওয়া যায়নি" : "কোনো পেমেন্ট নেই"}</td></tr>
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
