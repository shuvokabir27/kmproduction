import { Link, useNavigate } from "react-router-dom";
import { useShopCustomer, SHOP_TOKEN_KEY } from "@/hooks/useShopCustomer";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShoppingBag, LogOut, Phone, Package, ArrowLeft, Calendar, MapPin, User, Save, Pencil, RefreshCw, XCircle, Truck, CheckCircle2, Clock, X, ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import MobileShopNav from "@/components/MobileShopNav";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BRAND_GREEN = "#1f7a3a";
const toBn = (n: number | string) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

const statusLabel = (s: string) => {
  const m: Record<string, { t: string; cls: string }> = {
    pending: { t: "অপেক্ষমান", cls: "bg-amber-100 text-amber-800" },
    confirmed: { t: "নিশ্চিত", cls: "bg-blue-100 text-blue-800" },
    shipped: { t: "পাঠানো হয়েছে", cls: "bg-indigo-100 text-indigo-800" },
    delivered: { t: "ডেলিভারড", cls: "bg-green-100 text-green-800" },
    cancelled: { t: "বাতিল", cls: "bg-red-100 text-red-800" },
    returned: { t: "ফেরত", cls: "bg-gray-200 text-gray-800" },
    abandoned: { t: "অসম্পূর্ণ", cls: "bg-gray-100 text-gray-600" },
  };
  return m[s] || { t: s, cls: "bg-gray-100 text-gray-700" };
};

export default function ShopCustomerAccount() {
  const { customer, orders, loading, logout, refresh } = useShopCustomer();
  const nav = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", address: "" });
  const [productMap, setProductMap] = useState<Record<string, { id: string; stock_status: string; is_active: boolean }>>({});
  const [productByName, setProductByName] = useState<Record<string, { id: string; stock_status: string; is_active: boolean }>>({});
  const [trackOrder, setTrackOrder] = useState<any | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!loading && !customer) nav("/shop/login", { replace: true });
  }, [loading, customer, nav]);

  // Live status: poll every 8s while visible + on focus/visibility change
  useEffect(() => {
    if (!customer) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 8000);
    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", onVis);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onVis);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [customer, refresh]);

  // Keep tracking modal in sync with latest order data
  useEffect(() => {
    if (!trackOrder) return;
    const fresh = orders.find((o) => o.id === trackOrder.id);
    if (fresh && fresh.status !== trackOrder.status) setTrackOrder(fresh);
  }, [orders, trackOrder]);

  useEffect(() => {
    if (customer) setForm({
      full_name: customer.full_name || "",
      phone: customer.phone || "",
      address: customer.address || "",
    });
  }, [customer]);

  useEffect(() => {
    if (orders.length === 0) { setProductMap({}); setProductByName({}); return; }
    (async () => {
      const { data: allProducts } = await supabase.from("products").select("id, name, stock_status, is_active");
      const mapId: Record<string, any> = {};
      const mapName: Record<string, any> = {};
      (allProducts || []).forEach((p: any) => {
        mapId[p.id] = p;
        mapName[p.name.trim().toLowerCase()] = p;
      });
      setProductMap(mapId);
      setProductByName(mapName);
    })();
  }, [orders]);

  const findProduct = (o: any) => {
    if (o.product_id && productMap[o.product_id]) return productMap[o.product_id];
    const raw = (o.product_name || "").trim().toLowerCase();
    if (productByName[raw]) return productByName[raw];
    const base = raw.replace(/\s*\([^)]*\)\s*$/, "").trim();
    if (base && productByName[base]) return productByName[base];
    // partial: order name starts with product name
    for (const key of Object.keys(productByName)) {
      if (raw.startsWith(key) || key.startsWith(base)) return productByName[key];
    }
    return null;
  };

  const saveProfile = async () => {
    if (!form.full_name.trim()) { toast.error("নাম দিন"); return; }
    if (form.phone.replace(/\D/g, "").length !== 11) { toast.error("সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন"); return; }
    if (!form.address.trim()) { toast.error("ঠিকানা দিন"); return; }
    const token = localStorage.getItem(SHOP_TOKEN_KEY);
    if (!token) return;
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("shop-customer-auth", {
      body: { action: "update_profile", token, full_name: form.full_name.trim(), phone: form.phone.replace(/\D/g, ""), address: form.address.trim() },
    });
    setSaving(false);
    if (error || (data as any)?.error) { toast.error((data as any)?.error || error?.message || "ত্রুটি"); return; }
    toast.success("প্রোফাইল আপডেট হয়েছে");
    setEditing(false);
    await refresh();
  };

  if (loading || !customer) {
    return <div className="min-h-screen flex items-center justify-center">লোড হচ্ছে...</div>;
  }

  const totalSpent = orders
    .filter((o) => o.status !== "abandoned" && o.status !== "cancelled")
    .reduce((s, o) => s + Number(o.total_amount || 0), 0);

  return (
    <div className="min-h-screen bg-[#f7f5ee] pb-16 md:pb-0" style={{ fontFamily: "'Tiro Bangla', serif" }}>
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/products" className="flex items-center gap-2 text-sm text-gray-600">
            <ArrowLeft className="h-4 w-4" /> দোকান
          </Link>
          <div className="font-bold" style={{ color: BRAND_GREEN }}>আমার অ্যাকাউন্ট</div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-red-600 gap-1">
            <LogOut className="h-4 w-4" /> লগআউট
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Profile card */}
        <div className="rounded-2xl p-5 text-white shadow-lg" style={{ background: `linear-gradient(135deg, #155c2c, ${BRAND_GREEN})` }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center font-bold text-xl">
              {(customer.full_name || "C").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="font-bold text-lg">{customer.full_name || "কাস্টমার"}</div>
              <div className="text-white/80 text-sm flex items-center gap-1">
                <Phone className="h-3 w-3" /> {toBn(customer.phone)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white/10 rounded-xl p-3 backdrop-blur">
              <div className="text-xs text-white/80">মোট অর্ডার</div>
              <div className="text-2xl font-bold">{toBn(orders.length)}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 backdrop-blur">
              <div className="text-xs text-white/80">মোট খরচ</div>
              <div className="text-2xl font-bold">৳{toBn(totalSpent.toFixed(0))}</div>
            </div>
          </div>
        </div>

        {/* Profile settings */}
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <User className="h-5 w-5" style={{ color: BRAND_GREEN }} /> প্রোফাইল ও ডেলিভারি ঠিকানা
            </h2>
            {!editing ? (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-1">
                <Pencil className="h-3.5 w-3.5" /> এডিট
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setForm({ full_name: customer.full_name || "", phone: customer.phone || "", address: customer.address || "" }); }}>
                বাতিল
              </Button>
            )}
          </div>

          {!editing ? (
            <div className="space-y-2.5 text-sm">
              <div className="flex items-start gap-2"><User className="h-4 w-4 text-gray-400 mt-0.5" /><span className="text-gray-500 w-24 shrink-0">নাম:</span><span className="font-semibold text-gray-900">{customer.full_name || "—"}</span></div>
              <div className="flex items-start gap-2"><Phone className="h-4 w-4 text-gray-400 mt-0.5" /><span className="text-gray-500 w-24 shrink-0">মোবাইল:</span><span className="font-semibold text-gray-900">{toBn(customer.phone)}</span></div>
              <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-gray-400 mt-0.5" /><span className="text-gray-500 w-24 shrink-0">ঠিকানা:</span><span className="font-semibold text-gray-900 flex-1">{customer.address || <span className="text-gray-400 font-normal">এখনো ঠিকানা যোগ করা হয়নি — অর্ডার করার আগে যোগ করুন</span>}</span></div>
              <p className="text-[11px] text-gray-400 mt-2">💡 অর্ডার করার সময় এই তথ্য স্বয়ংক্রিয়ভাবে যোগ হবে।</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold text-gray-700">নাম</Label>
                <Input value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} className="h-11 mt-1 bg-white text-gray-900" placeholder="পূর্ণ নাম" />
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-700">মোবাইল নম্বর</Label>
                <Input type="tel" pattern="[0-9]*" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "") }))} maxLength={11} inputMode="numeric" className="h-11 mt-1 bg-white text-gray-900" placeholder="01XXXXXXXXX" />
              </div>
              <div>
                <Label className="text-xs font-bold text-gray-700">ডেলিভারি ঠিকানা</Label>
                <Textarea value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} rows={3} className="mt-1 bg-white text-gray-900 resize-none" placeholder="বাড়ি, রাস্তা, এলাকা, থানা, জেলা" />
              </div>
              <Button onClick={saveProfile} disabled={saving} className="w-full h-11 text-white gap-2" style={{ backgroundColor: BRAND_GREEN }}>
                <Save className="h-4 w-4" /> {saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
              </Button>
            </div>
          )}
        </div>

        {/* Orders */}
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Package className="h-5 w-5" style={{ color: BRAND_GREEN }} /> আমার অর্ডার সমূহ
          </h2>
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center text-gray-500 border">
              <ShoppingBag className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              আপনার কোনো অর্ডার নেই
              <div className="mt-3">
                <Link to="/products">
                  <Button className="text-white" style={{ backgroundColor: BRAND_GREEN }}>কেনাকাটা শুরু করুন</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => {
                const sl = statusLabel(o.status);
                const prod = findProduct(o);
                const productAvailable = !!prod && prod.is_active && prod.stock_status === "in_stock";
                const outOfStock = !!prod && (!prod.is_active || prod.stock_status !== "in_stock");
                return (
                  <div key={o.id} className="bg-white rounded-2xl p-4 border shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 truncate">{o.product_name}</div>
                        <div className="text-xs mt-1 flex items-center gap-2">
                          <span className="font-extrabold tracking-wide px-2 py-0.5 rounded-md text-white" style={{ backgroundColor: BRAND_GREEN }}>
                            #{toBn(o.order_number)}
                          </span>
                          <span className="text-gray-500">পরিমাণ: {toBn(o.quantity)}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(o.created_at).toLocaleDateString("bn-BD")}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-base" style={{ color: BRAND_GREEN }}>
                          ৳{toBn(Number(o.total_amount).toFixed(0))}
                        </div>
                        <Badge className={`mt-1 ${sl.cls} border-0`}>{sl.t}</Badge>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t flex items-center gap-2 flex-wrap">
                      {o.status !== "delivered" && o.status !== "cancelled" && o.status !== "returned" && o.status !== "abandoned" && (
                        <Button size="sm" variant="outline" onClick={() => setTrackOrder(o)} className="gap-1.5 h-9 rounded-xl flex-1 border-blue-200 text-blue-700 hover:bg-blue-50">
                          <Truck className="h-3.5 w-3.5" /> অর্ডার ট্র্যাকিং
                        </Button>
                      )}
                      {o.status === "delivered" && productAvailable && prod && (
                        <Button size="sm" onClick={() => nav(`/products/${prod.id}?order=1`)} className="text-white gap-1.5 h-9 rounded-xl flex-1" style={{ backgroundColor: BRAND_GREEN }}>
                          <RefreshCw className="h-3.5 w-3.5" /> পুনরায় অর্ডার
                        </Button>
                      )}
                      {o.status === "delivered" && outOfStock && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-2 rounded-xl flex-1 justify-center">
                          <XCircle className="h-3.5 w-3.5" /> Out of stock
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <MobileShopNav />

      <Dialog open={!!trackOrder} onOpenChange={(o) => !o && setTrackOrder(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-0 rounded-3xl" style={{ fontFamily: "'Tiro Bangla', serif" }}>
          {trackOrder && (() => {
            const steps = [
              { key: "pending", label: "অর্ডার গৃহীত", sub: "আপনার অর্ডার আমাদের কাছে পৌঁছেছে", icon: Clock },
              { key: "confirmed", label: "নিশ্চিত হয়েছে", sub: "অর্ডার প্রস্তুত হচ্ছে", icon: CheckCircle2 },
              { key: "shipped", label: "পাঠানো হয়েছে", sub: "ডেলিভারির পথে রয়েছে", icon: Truck },
              { key: "delivered", label: "ডেলিভারড", sub: "সফলভাবে পৌঁছেছে", icon: Package },
            ];
            const cancelled = trackOrder.status === "cancelled" || trackOrder.status === "returned" || trackOrder.status === "abandoned";
            // Map any backend status to our 4-step flow
            const statusAlias: Record<string, string> = {
              pending: "pending",
              confirmed: "confirmed",
              processing: "confirmed",
              shipped: "shipped",
              out_for_delivery: "shipped",
              delivered: "delivered",
            };
            const normalized = statusAlias[trackOrder.status] || "pending";
            const currentIdx = cancelled ? -1 : Math.max(0, steps.findIndex((s) => s.key === normalized));
            const progressPct = currentIdx >= 0 ? (currentIdx / (steps.length - 1)) * 100 : 0;
            return (
              <>
                {/* Premium gradient header */}
                <div className="relative px-6 pt-6 pb-8 text-white overflow-hidden" style={{ background: `linear-gradient(135deg, #0d3a1d 0%, ${BRAND_GREEN} 60%, #2da159 100%)` }}>
                  <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
                  <div className="absolute -bottom-12 -left-8 w-32 h-32 rounded-full bg-amber-300/20 blur-2xl" />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center ring-1 ring-white/30">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-white/70 font-bold">Order Tracking</div>
                        <div className="font-bold text-base leading-tight">অর্ডার ট্র্যাকিং</div>
                      </div>
                    </div>
                    <button onClick={() => setTrackOrder(null)} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="relative mt-4 bg-white/10 backdrop-blur rounded-2xl p-3.5 ring-1 ring-white/20">
                    <div className="text-[15px] font-bold leading-snug">{trackOrder.product_name}</div>
                    <div className="flex items-center justify-between mt-1.5 text-xs text-white/80">
                      <span>অর্ডার #{toBn(trackOrder.order_number)}</span>
                      <span className="font-bold text-amber-200 text-sm">৳{toBn(Number(trackOrder.total_amount).toFixed(0))}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white px-6 py-6">
                  {cancelled ? (
                    <div className="flex flex-col items-center text-center py-6">
                      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-3">
                        <X className="h-8 w-8 text-red-600" />
                      </div>
                      <div className="font-bold text-lg text-red-700">{statusLabel(trackOrder.status).t}</div>
                      <div className="text-xs text-gray-500 mt-1">এই অর্ডারটি আর সক্রিয় নেই</div>
                    </div>
                  ) : (
                    <>
                      {/* Horizontal stepper with progress bar */}
                      <div className="relative">
                        <div className="absolute left-0 right-0 top-5 h-1 bg-gray-100 rounded-full mx-5" />
                        <div className="absolute left-5 top-5 h-1 rounded-full transition-all duration-700" style={{ width: `calc((100% - 2.5rem) * ${progressPct / 100})`, background: `linear-gradient(90deg, ${BRAND_GREEN}, #2da159)` }} />
                        <div className="relative grid grid-cols-4 gap-1">
                          {steps.map((s, i) => {
                            const done = currentIdx >= i;
                            const active = currentIdx === i;
                            const Icon = s.icon;
                            return (
                              <div key={s.key} className="flex flex-col items-center">
                                <div className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all ${done ? "text-white shadow-lg" : "bg-white text-gray-300 border-2 border-gray-200"}`} style={done ? { background: `linear-gradient(135deg, ${BRAND_GREEN}, #2da159)`, boxShadow: `0 8px 20px -6px ${BRAND_GREEN}80` } : {}}>
                                  {active && <span className="absolute inset-0 rounded-full animate-ping opacity-40" style={{ backgroundColor: BRAND_GREEN }} />}
                                  <Icon className="h-4.5 w-4.5 relative" />
                                </div>
                                <div className={`text-[10px] font-bold mt-2 text-center leading-tight ${done ? "text-gray-900" : "text-gray-400"}`}>{s.label}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Active step details */}
                      {currentIdx >= 0 && (
                        <div className="mt-6 rounded-2xl p-4 border-2" style={{ borderColor: `${BRAND_GREEN}30`, background: `linear-gradient(135deg, ${BRAND_GREEN}08, ${BRAND_GREEN}15)` }}>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full mt-1.5 animate-pulse" style={{ backgroundColor: BRAND_GREEN }} />
                            <div className="flex-1">
                              <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: BRAND_GREEN }}>বর্তমান অবস্থা</div>
                              <div className="font-bold text-gray-900 mt-0.5">{steps[currentIdx].label}</div>
                              <div className="text-xs text-gray-600 mt-0.5">{steps[currentIdx].sub}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Status timeline */}
                      <div className="mt-5 rounded-2xl border border-gray-100 bg-white overflow-hidden">
                        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">স্ট্যাটাস টাইমলাইন</div>
                        </div>
                        <div className="px-4 py-3 space-y-3">
                          {steps.map((s, i) => {
                            const done = currentIdx >= i;
                            const active = currentIdx === i;
                            const Icon = s.icon;
                            const doneText: Record<string, string> = {
                              pending: "অর্ডার গৃহীত হয়েছে",
                              confirmed: "অর্ডার কনফার্ম হয়েছে",
                              shipped: "অর্ডার শিপড করা হয়েছে",
                              delivered: "অর্ডার ডেলিভার্ড হয়েছে",
                            };
                            const pendingText: Record<string, string> = {
                              pending: "অর্ডার গ্রহণের অপেক্ষায়",
                              confirmed: "কনফার্মের অপেক্ষায়",
                              shipped: "শিপিংয়ের অপেক্ষায়",
                              delivered: "ডেলিভারির অপেক্ষায়",
                            };
                            return (
                              <div key={s.key} className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${done ? "text-white" : "bg-gray-100 text-gray-300"}`} style={done ? { background: `linear-gradient(135deg, ${BRAND_GREEN}, #2da159)` } : {}}>
                                  {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-sm font-bold leading-tight ${done ? "text-gray-900" : "text-gray-400"}`}>
                                    {done ? doneText[s.key] : pendingText[s.key]}
                                  </div>
                                  <div className={`text-[11px] mt-0.5 ${done ? "text-gray-500" : "text-gray-300"}`}>{s.sub}</div>
                                </div>
                                {active && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: BRAND_GREEN }}>চলমান</span>
                                )}
                                {done && !active && (
                                  <CheckCircle2 className="h-4 w-4" style={{ color: BRAND_GREEN }} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Delivery address */}
                      {trackOrder.customer_address && (
                        <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-gray-50">
                          <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                          <div className="text-xs text-gray-600 leading-relaxed">{trackOrder.customer_address}</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
