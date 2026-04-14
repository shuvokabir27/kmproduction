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
  Truck, XCircle, Ban, CreditCard
} from "lucide-react";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "পেন্ডিং", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: Clock },
  confirmed: { label: "কনফার্মড", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: CheckCircle2 },
  processing: { label: "প্রসেসিং", color: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: Package },
  shipped: { label: "শিপড", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20", icon: Truck },
  delivered: { label: "ডেলিভারড", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle2 },
  cancelled: { label: "ক্যান্সেলড", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
  abandoned: { label: "অসম্পূর্ণ", color: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: Clock },
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  unpaid: { label: "বাকি", color: "bg-red-500/10 text-red-600" },
  partial: { label: "আংশিক", color: "bg-yellow-500/10 text-yellow-600" },
  paid: { label: "পেইড", color: "bg-green-500/10 text-green-600" },
};

const OrderManagement = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
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

  // Filter orders
  const filtered = (orders ?? []).filter((o: any) => {
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
  };

  const tabs = [
    { key: "all", label: "সকল", count: stats.total },
    { key: "pending", label: "পেন্ডিং", count: stats.pending },
    { key: "confirmed", label: "কনফার্মড", count: orders?.filter((o: any) => o.status === "confirmed").length || 0 },
    { key: "processing", label: "প্রসেসিং", count: orders?.filter((o: any) => o.status === "processing").length || 0 },
    { key: "shipped", label: "শিপড", count: orders?.filter((o: any) => o.status === "shipped").length || 0 },
    { key: "delivered", label: "ডেলিভারড", count: stats.delivered },
    { key: "cancelled", label: "ক্যান্সেলড", count: orders?.filter((o: any) => o.status === "cancelled").length || 0 },
    { key: "abandoned", label: "অসম্পূর্ণ", count: orders?.filter((o: any) => o.status === "abandoned").length || 0 },
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
      </div>

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

                {/* Quick status actions for pending */}
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
