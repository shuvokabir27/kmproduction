import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Phone, ShoppingCart, CheckCircle2, Clock, Truck, XCircle, RotateCcw, Loader2, User, MapPin } from "lucide-react";
import { toast } from "sonner";

const toBn = (n: number | string) => String(n).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[Number(d)]);

const STATUS_META: Record<string, { label: string; icon: any; cls: string }> = {
  pending: { label: "পেন্ডিং", icon: Clock, cls: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  confirmed: { label: "কনফার্মড", icon: CheckCircle2, cls: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  processing: { label: "প্রসেসিং", icon: ShoppingCart, cls: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
  shipped: { label: "শিপড", icon: Truck, cls: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
  delivered: { label: "ডেলিভারড", icon: CheckCircle2, cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  cancelled: { label: "ক্যান্সেলড", icon: XCircle, cls: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
  returned: { label: "রিটার্নড", icon: RotateCcw, cls: "text-orange-400 bg-orange-500/10 border-orange-500/30" },
  abandoned: { label: "অসম্পূর্ণ", icon: XCircle, cls: "text-zinc-400 bg-zinc-500/10 border-zinc-500/30" },
};

export default function OrderCheckByPhone() {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[] | null>(null);

  const reset = () => { setOrders(null); setPhone(""); };

  const search = async () => {
    const q = phone.trim();
    if (!/^\d{9,15}$/.test(q.replace(/\D/g, ""))) {
      toast.error("সঠিক মোবাইল নাম্বার দিন");
      return;
    }
    setLoading(true);
    const digits = q.replace(/\D/g, "");
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, customer_phone, customer_address, product_name, quantity, total_amount, status, created_at, delivery_date")
      .ilike("customer_phone", `%${digits}%`)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) { toast.error("সার্চ ব্যর্থ"); return; }
    setOrders(data || []);
  };

  const stats = (orders || []).reduce((acc: Record<string, { count: number; amount: number }>, o: any) => {
    const k = o.status || "pending";
    if (!acc[k]) acc[k] = { count: 0, amount: 0 };
    acc[k].count += 1;
    acc[k].amount += Number(o.total_amount || 0);
    return acc;
  }, {});
  const totalCount = orders?.length || 0;
  const totalAmount = (orders || []).reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
  const deliveredAmount = (orders || []).filter(o => o.status === "delivered").reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
  const lastCustomer = orders?.[0];

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200">
          <Search className="h-4 w-4" /> অর্ডার চেকিং
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-cyan-400" /> মোবাইল দিয়ে অর্ডার চেক
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 items-center">
          <Input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="মোবাইল নাম্বার লিখুন (যেমন 01XXXXXXXXX)"
            onKeyDown={e => e.key === "Enter" && search()}
            inputMode="numeric"
          />
          <Button onClick={search} disabled={loading} className="gap-2 shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            চেক
          </Button>
        </div>

        {orders !== null && (
          <div className="space-y-4 mt-2">
            {totalCount === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm border border-dashed rounded-xl">
                এই নাম্বারে কোনো অর্ডার পাওয়া যায়নি
              </div>
            ) : (
              <>
                {/* Customer header */}
                {lastCustomer && (
                  <div className="bg-card border border-border/50 rounded-xl p-3 flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-cyan-400" /><span className="font-semibold">{lastCustomer.customer_name || "—"}</span></div>
                    <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-emerald-400" />{lastCustomer.customer_phone}</div>
                    {lastCustomer.customer_address && <div className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{lastCustomer.customer_address}</div>}
                  </div>
                )}

                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="bg-primary/10 border border-primary/30 rounded-xl p-3">
                    <div className="text-[11px] text-muted-foreground">মোট অর্ডার</div>
                    <div className="text-2xl font-bold text-primary">{toBn(totalCount)}</div>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                    <div className="text-[11px] text-muted-foreground">ডেলিভারড</div>
                    <div className="text-2xl font-bold text-emerald-400">{toBn(stats.delivered?.count || 0)}</div>
                  </div>
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
                    <div className="text-[11px] text-muted-foreground">ক্যান্সেলড</div>
                    <div className="text-2xl font-bold text-rose-400">{toBn(stats.cancelled?.count || 0)}</div>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                    <div className="text-[11px] text-muted-foreground">ডেলিভারড আয়</div>
                    <div className="text-xl font-bold text-amber-400">৳{toBn(deliveredAmount)}</div>
                  </div>
                </div>

                {/* Status breakdown */}
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats).map(([k, v]) => {
                    const entry = v as { count: number; amount: number };
                    const Icon = meta.icon;
                    return (
                      <div key={k} className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 ${meta.cls}`}>
                        <Icon className="h-3.5 w-3.5" /> {meta.label}: {toBn(v.count)}
                      </div>
                    );
                  })}
                </div>

                {/* Order list */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-muted-foreground">সকল অর্ডার ({toBn(totalCount)})</div>
                  {orders.map(o => {
                    const meta = STATUS_META[o.status] || { label: o.status, icon: Clock, cls: "text-foreground bg-muted border-border" };
                    const Icon = meta.icon;
                    return (
                      <div key={o.id} className="bg-card border border-border/40 rounded-lg p-3 flex items-center justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">#{toBn(o.order_number || "")} — {o.product_name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            পরিমাণ: {toBn(o.quantity || 1)} · {new Date(o.created_at).toLocaleDateString("bn-BD")}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">৳{toBn(o.total_amount || 0)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${meta.cls}`}>
                            <Icon className="h-3 w-3" /> {meta.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
