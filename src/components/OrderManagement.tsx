import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Package, Plus, Eye, Pencil, Trash2, Phone, MapPin, Calendar,
  Clock, Search, Filter, TrendingUp, ShoppingCart, CheckCircle2,
  Truck, XCircle, Ban, CreditCard, MessageCircle, PhoneCall, RotateCcw, BarChart3
} from "lucide-react";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "পেন্ডিং", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: Clock },
  confirmed: { label: "কনফার্মড", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: CheckCircle2 },
  processing: { label: "প্রসেসিং", color: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: Package },
  shipped: { label: "শিপড", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20", icon: Truck },
  delivered: { label: "ডেলিভারড", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle2 },
  cancelled: { label: "ক্যান্সেলড", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
  returned: { label: "রিটার্নড", color: "bg-rose-500/10 text-rose-700 border-rose-500/20", icon: RotateCcw },
  abandoned: { label: "অসম্পূর্ণ", color: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: Clock },
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  unpaid: { label: "বাকি", color: "bg-red-500/10 text-red-600" },
  partial: { label: "আংশিক", color: "bg-yellow-500/10 text-yellow-600" },
  paid: { label: "পেইড", color: "bg-green-500/10 text-green-600" },
};

const OrderManagement = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [verifySearch, setVerifySearch] = useState("");
  const [verifyAmounts, setVerifyAmounts] = useState<Record<string, string>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialog, setViewDialog] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    customer_name: "", customer_phone: "", customer_address: "",
    product_name: "", quantity: "1", unit_price: "0", total_amount: "0",
    status: "pending", payment_method: "cash", payment_status: "unpaid",
    notes: "", delivery_date: "",
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const resetForm = () => {
    setForm({
      customer_name: "", customer_phone: "", customer_address: "",
      product_name: "", quantity: "1", unit_price: "0", total_amount: "0",
      status: "pending", payment_method: "cash", payment_status: "unpaid",
      notes: "", delivery_date: "",
    });
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (o: any) => {
    setEditing(o);
    setForm({
      customer_name: o.customer_name || "",
      customer_phone: o.customer_phone || "",
      customer_address: o.customer_address || "",
      product_name: o.product_name || "",
      quantity: String(o.quantity || 1),
      unit_price: String(o.unit_price || 0),
      total_amount: String(o.total_amount || 0),
      status: o.status || "pending",
      payment_method: o.payment_method || "cash",
      payment_status: o.payment_status || "unpaid",
      notes: o.notes || "",
      delivery_date: o.delivery_date || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      toast.error("কাস্টমারের নাম ও ফোন দিন"); return;
    }
    const payload = {
      customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone.trim(),
      customer_address: form.customer_address.trim() || null,
      product_name: form.product_name.trim(),
      quantity: Number(form.quantity) || 1,
      unit_price: Number(form.unit_price) || 0,
      total_amount: Number(form.total_amount) || 0,
      status: form.status as any,
      payment_method: form.payment_method,
      payment_status: form.payment_status as any,
      notes: form.notes.trim() || null,
      delivery_date: form.delivery_date || null,
    };
    try {
      if (editing) {
        const { error } = await supabase.from("orders").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("অর্ডার আপডেট হয়েছে");
      } else {
        const { error } = await supabase.from("orders").insert(payload);
        if (error) throw error;
        toast.success("অর্ডার যোগ হয়েছে");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("এই অর্ডারটি মুছে ফেলতে চান?")) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("অর্ডার মুছে ফেলা হয়েছে");
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  const quickStatusUpdate = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(`স্ট্যাটাস "${statusConfig[status]?.label}" করা হয়েছে`);
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  const updateTotal = (qty: string, price: string) => {
    const total = (Number(qty) || 0) * (Number(price) || 0);
    setForm(f => ({ ...f, quantity: qty, unit_price: price, total_amount: String(total) }));
  };

  // Helper: extract last 4 digits from order notes
  const getLast4 = (notes: string | null) => {
    if (!notes) return null;
    const match = notes.match(/লাস্ট ৪ ডিজিট: (\d{4})/);
    return match ? match[1] : null;
  };

  // Helper: extract trx ID from order notes
  const getTrxId = (notes: string | null) => {
    if (!notes) return null;
    const match = notes.match(/ট্রানজেকশন আইডি: (\S+)/);
    return match ? match[1] : null;
  };

  // Helper: get payment method label from notes
  const getPaymentLabel = (notes: string | null) => {
    if (!notes) return null;
    if (notes.includes("বিকাশ লাস্ট") || notes.includes("বিকাশ") && notes.includes("ট্রানজেকশন")) return "বিকাশ";
    if (notes.includes("নগদ লাস্ট") || notes.includes("নগদ") && notes.includes("ট্রানজেকশন")) return "নগদ";
    return null;
  };

  // Orders with mobile payment (bKash/Nagad)
  const mobilePaymentOrders = (orders ?? []).filter((o: any) => {
    const pm = o.payment_method;
    return (pm === "bkash" || pm === "nagad") && o.payment_status !== "paid" && o.payment_status !== "partial";
  });

  // Verify search: match by last 4 digits OR transaction ID
  const verifyInput = verifySearch.trim();
  const verifyLast4 = verifyInput.replace(/\D/g, "").slice(-4);
  const verifiedOrders = verifyInput.length >= 4
    ? mobilePaymentOrders.filter((o: any) => {
        const last4 = getLast4(o.notes);
        const trxId = getTrxId(o.notes);
        // Match last 4 digits
        if (verifyLast4.length === 4 && last4 === verifyLast4) return true;
        // Match transaction ID (case-insensitive partial match)
        if (trxId && trxId.toLowerCase().includes(verifyInput.toLowerCase())) return true;
        return false;
      })
    : [];

  // Filter orders
  const filtered = (orders ?? []).filter((o: any) => {
    if (activeTab === "payment_verify") {
      const pm = o.payment_method;
      return pm === "bkash" || pm === "nagad";
    }
    if (activeTab !== "all" && o.status !== activeTab) return false;
    if (search) {
      const s = search.toLowerCase();
      return o.customer_name?.toLowerCase().includes(s) ||
        o.customer_phone?.includes(s) ||
        o.product_name?.toLowerCase().includes(s) ||
        String(o.order_number)?.includes(s);
    }
    return true;
  });

  // Stats
  const stats = {
    total: orders?.length || 0,
    pending: orders?.filter((o: any) => o.status === "pending").length || 0,
    confirmed: orders?.filter((o: any) => o.status === "confirmed").length || 0,
    delivered: orders?.filter((o: any) => o.status === "delivered").length || 0,
    totalRevenue: orders?.filter((o: any) => o.status === "delivered")
      .reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0) || 0,
    returned: orders?.filter((o: any) => o.status === "returned").length || 0,
    returnAmount: orders?.filter((o: any) => o.status === "returned")
      .reduce((sum: number, o: any) => sum + Number(o.return_amount || o.total_amount || 0), 0) || 0,
  };

  // Return stats by period
  const now = new Date();
  const returnedOrders = (orders ?? []).filter((o: any) => o.status === "returned");
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const returnStats = {
    weekly: returnedOrders.filter((o: any) => new Date(o.returned_at || o.updated_at) >= weekStart)
      .reduce((s: number, o: any) => s + Number(o.return_amount || o.total_amount || 0), 0),
    monthly: returnedOrders.filter((o: any) => new Date(o.returned_at || o.updated_at) >= monthStart)
      .reduce((s: number, o: any) => s + Number(o.return_amount || o.total_amount || 0), 0),
    yearly: returnedOrders.filter((o: any) => new Date(o.returned_at || o.updated_at) >= yearStart)
      .reduce((s: number, o: any) => s + Number(o.return_amount || o.total_amount || 0), 0),
  };

  const tabs = [
    { key: "pending", label: "পেন্ডিং", count: stats.pending },
    { key: "confirmed", label: "কনফার্মড", count: orders?.filter((o: any) => o.status === "confirmed").length || 0 },
    { key: "processing", label: "প্রসেসিং", count: orders?.filter((o: any) => o.status === "processing").length || 0 },
    { key: "shipped", label: "শিপড", count: orders?.filter((o: any) => o.status === "shipped").length || 0 },
    { key: "delivered", label: "ডেলিভারড", count: stats.delivered },
    { key: "cancelled", label: "ক্যান্সেলড", count: orders?.filter((o: any) => o.status === "cancelled").length || 0 },
    { key: "returned", label: "🔄 রিটার্নড", count: stats.returned },
    { key: "abandoned", label: "অসম্পূর্ণ", count: orders?.filter((o: any) => o.status === "abandoned").length || 0 },
    { key: "payment_verify", label: "💳 পেমেন্ট চেক", count: mobilePaymentOrders.length },
    { key: "all", label: "সকল", count: stats.total },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">অর্ডার ম্যানেজমেন্ট</h2>
            <p className="text-xs text-muted-foreground">সকল অর্ডার পরিচালনা করুন</p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> নতুন অর্ডার
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">মোট অর্ডার</span>
          </div>
          <span className="text-2xl font-bold text-foreground">{toBn(stats.total)}</span>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-yellow-500" />
            <span className="text-xs text-muted-foreground">পেন্ডিং</span>
          </div>
          <span className="text-2xl font-bold text-yellow-600">{toBn(stats.pending)}</span>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">ডেলিভারড</span>
          </div>
          <span className="text-2xl font-bold text-green-600">{toBn(stats.delivered)}</span>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">মোট আয়</span>
          </div>
          <span className="text-xl font-bold text-primary">৳{toBn(stats.totalRevenue)}</span>
        </div>
        {stats.returned > 0 && (
          <div className="bg-card border border-rose-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <RotateCcw className="h-4 w-4 text-rose-500" />
              <span className="text-xs text-muted-foreground">রিটার্ন লস</span>
            </div>
            <span className="text-xl font-bold text-rose-600">-৳{toBn(stats.returnAmount)}</span>
          </div>
        )}
      </div>

      {/* Return stats panel */}
      {activeTab === "returned" && stats.returned > 0 && (
        <div className="bg-card border border-rose-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-rose-600" />
            <h3 className="font-bold text-foreground text-sm">রিটার্ন হিসাব</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-rose-500/5 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">এই সপ্তাহ</p>
              <span className="text-sm font-bold text-rose-600">-৳{toBn(returnStats.weekly)}</span>
            </div>
            <div className="bg-rose-500/5 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">এই মাস</p>
              <span className="text-sm font-bold text-rose-600">-৳{toBn(returnStats.monthly)}</span>
            </div>
            <div className="bg-rose-500/5 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">এই বছর</p>
              <span className="text-sm font-bold text-rose-600">-৳{toBn(returnStats.yearly)}</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">মোট {toBn(stats.returned)}টি অর্ডার রিটার্ন হয়েছে</p>
        </div>
      )}

      {/* Search + Tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="অর্ডার নং, নাম বা ফোন দিয়ে খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {tab.label} ({toBn(tab.count)})
            </button>
          ))}
        </div>
      </div>

      {/* Payment Verify Section */}
      {activeTab === "payment_verify" && (
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-bold text-foreground text-sm">পেমেন্ট ভেরিফাই</h3>
              <p className="text-[11px] text-muted-foreground">ফুল ট্রানজেকশন নম্বর দিয়ে অর্ডার খুঁজুন</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="লাস্ট ৪ ডিজিট বা ট্রানজেকশন আইডি দিন..."
              value={verifySearch}
              onChange={e => setVerifySearch(e.target.value)}
              className="pl-9 text-lg tracking-wider"
            />
          </div>
          {verifyInput.length >= 4 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                🔍 সার্চ: <span className="font-bold text-primary text-sm">{verifyInput}</span>
                {verifiedOrders.length > 0
                  ? <span className="text-green-600 ml-2">✅ {toBn(verifiedOrders.length)}টি অর্ডার পাওয়া গেছে</span>
                  : <span className="text-red-500 ml-2">❌ কোনো ম্যাচ নেই</span>
                }
              </p>
              {verifiedOrders.map((o: any) => {
                const totalAmt = Number(o.total_amount || 0);
                const paidInput = verifyAmounts[o.id] ?? String(totalAmt);
                const paidNum = Number(paidInput) || 0;
                const remaining = totalAmt - paidNum;
                const payStatus = paidNum >= totalAmt ? "paid" : paidNum > 0 ? "partial" : "unpaid";
                return (
                <div key={o.id} className="bg-green-500/5 border border-green-500/20 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">#{toBn(o.order_number)}</span>
                    <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
                      ✅ ম্যাচ
                    </Badge>
                  </div>
                  <h4 className="font-bold text-foreground text-sm">{o.customer_name}</h4>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span><Phone className="h-3 w-3 inline mr-0.5" />{o.customer_phone}</span>
                    <span className="font-bold text-primary">মোট: ৳{toBn(totalAmt)}</span>
                  </div>
                  {/* Payment amount input */}
                  <div className="mt-2 space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">পেমেন্টের পরিমাণ (৳)</Label>
                    <Input
                      type="number"
                      value={paidInput}
                      onChange={e => setVerifyAmounts(prev => ({ ...prev, [o.id]: e.target.value }))}
                      className="h-8 text-sm font-bold"
                      min={0}
                      max={totalAmt}
                    />
                    {remaining > 0 && paidNum > 0 && (
                      <p className="text-[10px] text-yellow-600">⚠️ বাকি থাকবে: ৳{toBn(remaining)}</p>
                    )}
                    {paidNum >= totalAmt && (
                      <p className="text-[10px] text-green-600">✅ সম্পূর্ণ পেইড</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Button size="sm" variant="outline" className={`text-xs h-7 gap-1 ${payStatus === "paid" ? "text-green-600 border-green-500/30" : "text-yellow-600 border-yellow-500/30"}`}
                      onClick={() => {
                        quickStatusUpdate(o.id, "confirmed");
                        const notes = paidNum < totalAmt
                          ? `${o.notes || ""} | পেইড: ৳${paidNum}, বাকি: ৳${remaining}`.trim()
                          : o.notes;
                        supabase.from("orders").update({ payment_status: payStatus, notes } as any).eq("id", o.id).then(() => {
                          queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
                        });
                      }}>
                      <CheckCircle2 className="h-3 w-3" />
                      {payStatus === "paid" ? "ভেরিফাই ও কনফার্ম" : "আংশিক পেমেন্ট কনফার্ম"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setViewDialog(o)}>
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-card animate-pulse rounded-xl" />)}
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>কোনো অর্ডার পাওয়া যায়নি</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order: any) => {
            const sc = statusConfig[order.status] || statusConfig.pending;
            const pc = paymentStatusConfig[order.payment_status] || paymentStatusConfig.unpaid;
            const StatusIcon = sc.icon;
            const orderLast4 = getLast4(order.notes);
            const orderTrxId = getTrxId(order.notes);
            const orderPayLabel = getPaymentLabel(order.notes);
            return (
              <div key={order.id} className="bg-card border border-border/50 rounded-xl p-4 hover:border-primary/20 transition-all">
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <StatusIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">#{toBn(order.order_number)}</span>
                      <h4 className="font-semibold text-foreground text-sm leading-tight">{order.customer_name}</h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${sc.color}`}>{sc.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${pc.color}`}>{pc.label}</span>
                  </div>
                </div>

                {/* Info row */}
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {order.customer_phone}
                  </div>
                  <div className="flex items-center gap-1">
                    <Package className="h-3 w-3" /> {order.product_name}
                  </div>
                  {order.customer_address && (
                    <div className="flex items-center gap-1 col-span-2">
                      <MapPin className="h-3 w-3" /> {order.customer_address}
                    </div>
                  )}
                </div>
                {/* Mobile payment badge */}
                {(orderLast4 || orderTrxId) && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    {orderLast4 && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        orderPayLabel === "বিকাশ" ? "bg-pink-100 text-pink-700" : "bg-orange-100 text-orange-700"
                      }`}>
                        {orderPayLabel === "বিকাশ" ? "📱" : "📲"} {orderPayLabel} • লাস্ট ৪: <span className="tracking-wider">{orderLast4}</span>
                      </span>
                    )}
                    {orderTrxId && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        orderPayLabel === "বিকাশ" ? "bg-pink-100 text-pink-700" : "bg-orange-100 text-orange-700"
                      }`}>
                        🔑 TrxID: <span className="tracking-wider">{orderTrxId}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Bottom row */}
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-primary">৳{toBn(Number(order.total_amount))}</span>
                    <span className="text-xs text-muted-foreground">
                      {toBn(order.quantity)} × ৳{toBn(Number(order.unit_price))}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setViewDialog(order)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(order)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(order.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Follow-up buttons */}
                <div className="flex gap-2 mt-2">
                  <a href={`https://wa.me/88${order.customer_phone?.replace(/\D/g, "")}?text=${encodeURIComponent(`আসসালামু আলাইকুম ${order.customer_name}, আপনার অর্ডার #${order.order_number} সম্পর্কে জানাচ্ছি।`)}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button size="sm" variant="outline" className="w-full text-xs h-8 gap-1 text-green-600 border-green-500/30 hover:bg-green-500/10">
                      <MessageCircle className="h-3 w-3" /> WhatsApp
                    </Button>
                  </a>
                  <a href={`tel:${order.customer_phone}`} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full text-xs h-8 gap-1 text-blue-600 border-blue-500/30 hover:bg-blue-500/10">
                      <PhoneCall className="h-3 w-3" /> কল
                    </Button>
                  </a>
                </div>

                {order.status === "pending" && (
                  <div className="flex gap-2 mt-3 pt-2 border-t border-border/30">
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-8 gap-1 text-green-600 border-green-500/30 hover:bg-green-500/10"
                      onClick={() => quickStatusUpdate(order.id, "confirmed")}>
                      <CheckCircle2 className="h-3 w-3" /> কনফার্ম
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-8 gap-1 text-red-600 border-red-500/30 hover:bg-red-500/10"
                      onClick={() => quickStatusUpdate(order.id, "cancelled")}>
                      <Ban className="h-3 w-3" /> ক্যান্সেল
                    </Button>
                  </div>
                )}
                {order.status === "cancelled" && (
                  <div className="flex gap-2 mt-3 pt-2 border-t border-border/30">
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-8 gap-1 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/10"
                      onClick={() => quickStatusUpdate(order.id, "pending")}>
                      <Clock className="h-3 w-3" /> পেন্ডিংয়ে ফেরাও
                    </Button>
                  </div>
                )}
                {order.status === "confirmed" && (
                  <div className="flex gap-2 mt-3 pt-2 border-t border-border/30">
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-8 gap-1"
                      onClick={() => quickStatusUpdate(order.id, "processing")}>
                      <Package className="h-3 w-3" /> প্রসেসিং
                    </Button>
                  </div>
                )}
                {order.status === "processing" && (
                  <div className="flex gap-2 mt-3 pt-2 border-t border-border/30">
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-8 gap-1"
                      onClick={() => quickStatusUpdate(order.id, "shipped")}>
                      <Truck className="h-3 w-3" /> শিপড
                    </Button>
                  </div>
                )}
                {order.status === "shipped" && (
                  <div className="flex gap-2 mt-3 pt-2 border-t border-border/30">
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-8 gap-1 text-green-600 border-green-500/30 hover:bg-green-500/10"
                      onClick={() => quickStatusUpdate(order.id, "delivered")}>
                      <CheckCircle2 className="h-3 w-3" /> ডেলিভারড
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-8 gap-1 text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                      onClick={() => {
                        const amt = Number(order.total_amount || 0);
                        supabase.from("orders").update({
                          status: "returned",
                          returned_at: new Date().toISOString(),
                          return_amount: amt,
                        } as any).eq("id", order.id).then(() => {
                          queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
                          toast.success(`অর্ডার রিটার্ন হয়েছে। ৳${amt} মাইনাস।`);
                        });
                      }}>
                      <RotateCcw className="h-3 w-3" /> রিটার্ন
                    </Button>
                  </div>
                )}
                {order.status === "returned" && (
                  <div className="flex gap-2 mt-3 pt-2 border-t border-rose-200/50 bg-rose-50/30 -mx-4 -mb-4 px-4 pb-4 rounded-b-xl">
                    <div className="w-full">
                      <p className="text-[10px] text-rose-600 mb-2">রিটার্ন মূল্য: ৳{toBn(Number(order.return_amount || order.total_amount || 0))}</p>
                      <Button size="sm" variant="outline" className="w-full text-xs h-8 gap-1 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/10"
                        onClick={() => {
                          supabase.from("orders").update({
                            status: "pending",
                            returned_at: null,
                            return_amount: 0,
                          } as any).eq("id", order.id).then(() => {
                            queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
                            toast.success("অর্ডার পেন্ডিংয়ে ফেরানো হয়েছে");
                          });
                        }}>
                        <Clock className="h-3 w-3" /> পেন্ডিংয়ে ফেরাও
                      </Button>
                    </div>
                  </div>
                )}
                {order.status === "abandoned" && (
                  <div className="flex gap-2 mt-3 pt-2 border-t border-orange-200/50 bg-orange-50/30 -mx-4 -mb-4 px-4 pb-4 rounded-b-xl">
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-8 gap-1 text-green-600 border-green-500/30 hover:bg-green-500/10"
                      onClick={() => quickStatusUpdate(order.id, "pending")}>
                      <CheckCircle2 className="h-3 w-3" /> পেন্ডিং করুন
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-8 gap-1"
                      onClick={() => openEdit(order)}>
                      <Phone className="h-3 w-3" /> ফলোআপ
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={!!viewDialog} onOpenChange={() => setViewDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>অর্ডার #{viewDialog && toBn(viewDialog.order_number)}</DialogTitle>
          </DialogHeader>
          {viewDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">কাস্টমার</span>
                  <p className="font-medium text-foreground">{viewDialog.customer_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">ফোন</span>
                  <p className="font-medium text-foreground">{viewDialog.customer_phone}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground text-xs">ঠিকানা</span>
                  <p className="font-medium text-foreground">{viewDialog.customer_address || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">প্রডাক্ট</span>
                  <p className="font-medium text-foreground">{viewDialog.product_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">পরিমাণ</span>
                  <p className="font-medium text-foreground">{toBn(viewDialog.quantity)} পিস</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">মোট মূল্য</span>
                  <p className="font-bold text-primary text-lg">৳{toBn(Number(viewDialog.total_amount))}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">পেমেন্ট</span>
                  <p className="font-medium text-foreground">{viewDialog.payment_method}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">স্ট্যাটাস</span>
                  <Badge className={statusConfig[viewDialog.status]?.color}>{statusConfig[viewDialog.status]?.label}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">পেমেন্ট স্ট্যাটাস</span>
                  <Badge className={paymentStatusConfig[viewDialog.payment_status]?.color}>{paymentStatusConfig[viewDialog.payment_status]?.label}</Badge>
                </div>
                {viewDialog.delivery_date && (
                  <div>
                    <span className="text-muted-foreground text-xs">ডেলিভারি তারিখ</span>
                    <p className="font-medium text-foreground">{viewDialog.delivery_date}</p>
                  </div>
                )}
                {viewDialog.notes && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground text-xs">নোট</span>
                    <p className="font-medium text-foreground">{viewDialog.notes}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => { setViewDialog(null); openEdit(viewDialog); }}>
                  <Pencil className="h-4 w-4 mr-1" /> এডিট করুন
                </Button>
                <a href={`tel:${viewDialog.customer_phone}`} className="flex-1">
                  <Button variant="outline" className="w-full gap-1">
                    <Phone className="h-4 w-4" /> কল করুন
                  </Button>
                </a>
              </div>
              <Button variant="outline" className="w-full gap-1" onClick={() => {
                const inv = document.getElementById("invoice-print");
                if (inv) {
                  const w = window.open("", "_blank", "width=400,height=600");
                  if (w) {
                    w.document.write(`<html><head><title>ইনভয়েস #${viewDialog.order_number}</title><style>body{font-family:sans-serif;padding:20px;font-size:14px}h2{text-align:center;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin:12px 0}td{padding:6px 4px;border-bottom:1px solid #eee}.right{text-align:right}.bold{font-weight:bold}.center{text-align:center}.footer{margin-top:20px;text-align:center;color:#888;font-size:12px}</style></head><body>`);
                    w.document.write(`<h2>কে এম প্রডাক্ট</h2><p class="center" style="color:#888;font-size:12px">ইনভয়েস #${viewDialog.order_number}</p><hr/>`);
                    w.document.write(`<table><tr><td class="bold">কাস্টমার</td><td class="right">${viewDialog.customer_name}</td></tr>`);
                    w.document.write(`<tr><td class="bold">ফোন</td><td class="right">${viewDialog.customer_phone}</td></tr>`);
                    if (viewDialog.customer_address) w.document.write(`<tr><td class="bold">ঠিকানা</td><td class="right">${viewDialog.customer_address}</td></tr>`);
                    w.document.write(`<tr><td class="bold">প্রডাক্ট</td><td class="right">${viewDialog.product_name}</td></tr>`);
                    w.document.write(`<tr><td class="bold">পরিমাণ</td><td class="right">${viewDialog.quantity} পিস</td></tr>`);
                    w.document.write(`<tr><td class="bold">একক মূল্য</td><td class="right">৳${viewDialog.unit_price}</td></tr>`);
                    w.document.write(`<tr style="border-top:2px solid #333"><td class="bold" style="font-size:16px">মোট</td><td class="right bold" style="font-size:16px">৳${viewDialog.total_amount}</td></tr></table>`);
                    w.document.write(`<p class="footer">তারিখ: ${new Date(viewDialog.created_at).toLocaleDateString("bn-BD")}<br/>ধন্যবাদ!</p>`);
                    w.document.write(`</body></html>`);
                    w.document.close();
                    w.print();
                  }
                }
              }}>
                🖨️ ইনভয়েস প্রিন্ট
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "অর্ডার এডিট" : "নতুন অর্ডার"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>কাস্টমারের নাম *</Label>
                <Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
              </div>
              <div>
                <Label>ফোন নম্বর *</Label>
                <Input value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>ঠিকানা</Label>
              <Textarea value={form.customer_address} onChange={e => setForm(f => ({ ...f, customer_address: e.target.value }))} rows={2} />
            </div>
            <div>
              <Label>প্রডাক্টের নাম *</Label>
              <Input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>পরিমাণ</Label>
                <Input type="number" value={form.quantity} onChange={e => updateTotal(e.target.value, form.unit_price)} />
              </div>
              <div>
                <Label>একক মূল্য (৳)</Label>
                <Input type="number" value={form.unit_price} onChange={e => updateTotal(form.quantity, e.target.value)} />
              </div>
              <div>
                <Label>মোট (৳)</Label>
                <Input type="number" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>অর্ডার স্ট্যাটাস</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>পেমেন্ট স্ট্যাটাস</Label>
                <Select value={form.payment_status} onValueChange={v => setForm(f => ({ ...f, payment_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(paymentStatusConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>পেমেন্ট মেথড</Label>
                <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">ক্যাশ</SelectItem>
                    <SelectItem value="bkash">বিকাশ</SelectItem>
                    <SelectItem value="nagad">নগদ</SelectItem>
                    <SelectItem value="bank">ব্যাংক</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ডেলিভারি তারিখ</Label>
                <Input type="date" value={form.delivery_date} onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>নোট</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? "আপডেট করুন" : "অর্ডার যোগ করুন"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderManagement;
