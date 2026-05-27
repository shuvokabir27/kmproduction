import { useEffect, useState } from "react";
import { useCart } from "@/hooks/useCart";
import { useShopCustomer } from "@/hooks/useShopCustomer";
import { useDeliverySettings } from "@/hooks/useDeliverySettings";
import { calculateDelivery } from "@/lib/delivery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Trash2, Plus, Minus, ShoppingCart, CheckCircle, Truck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PaymentMethodPicker, { PaymentMethod } from "@/components/PaymentMethodPicker";

const toBn = (n: number) => Math.round(n).toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);
const BRAND_GREEN = "#3b82f6";
const BRAND_DARK = "#3b82f6";

export const CartDrawer = () => {
  const { items, count, total, totalWeightGrams, offer, isOpen, close, updateQty, removeItem, clear } = useCart();
  const { customer } = useShopCustomer();
  const { settings } = useDeliverySettings();
  const delivery = calculateDelivery(total, totalWeightGrams, settings, {
    skipThreshold: !!offer,
    forceFree: !!offer?.free_delivery,
  });
  const grandTotal = total + delivery.charge;
  const [checkout, setCheckout] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [phoneError, setPhoneError] = useState("");
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [paymentSenderNo, setPaymentSenderNo] = useState("");
  const [paymentTrxId, setPaymentTrxId] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    supabase.from("site_settings").select("*").single().then(({ data }) => setSiteSettings(data));
  }, []);

  const openCheckout = () => {
    if (!items.length) return;
    setForm({
      name: customer?.full_name || "",
      phone: customer?.phone || "",
      address: customer?.address || "",
    });
    setCheckout(true);
  };

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    setForm(f => ({ ...f, phone: digits }));
    setPhoneError(digits.length > 0 && digits.length !== 11 ? "মোবাইল নম্বর অবশ্যই ১১ ডিজিটের" : "");
  };

  const submit = async () => {
    if (!form.name.trim()) return toast.error("নাম দিন");
    if (form.phone.length !== 11) { setPhoneError("মোবাইল নম্বর অবশ্যই ১১ ডিজিটের"); return; }
    if (!form.address.trim()) return toast.error("ঠিকানা দিন");
    if (paymentMethod !== "cod") {
      if (paymentSenderNo.length !== 11) return toast.error("আপনার পেমেন্ট নম্বর ১১ ডিজিট দিন");
      if (!paymentTrxId.trim()) return toast.error("ট্রানজেকশন আইডি দিন");
    }
    setSubmitting(true);
    try {
      // Always get a shared order number so we can display it
      let sharedNumber: number | null = null;
      const { data: numData, error: numErr } = await supabase.rpc("next_order_number" as any);
      if (numErr) throw numErr;
      sharedNumber = numData as number;
      const rows = items.map((it, idx) => ({
        customer_name: form.name.trim(),
        customer_phone: form.phone,
        customer_address: form.address.trim(),
        product_id: it.product_id,
        product_name: it.variant_label ? `${it.product_name} (${it.variant_label})` : it.product_name,
        variant_label: it.variant_label || null,
        quantity: it.quantity,
        unit_price: it.unit_price,
        total_amount: it.unit_price * it.quantity,
        delivery_charge: idx === 0 ? delivery.charge : 0,
        shop_customer_id: customer?.id ?? null,
        payment_method: paymentMethod,
        payment_sender_no: paymentMethod !== "cod" ? paymentSenderNo : null,
        payment_trx_id: paymentMethod !== "cod" ? paymentTrxId : null,
        order_number: sharedNumber,
      }));
      const { error } = await supabase.from("orders").insert(rows as any);
      if (error) throw error;
      setOrderNumber(sharedNumber);
      setSuccess(true);
      clear();
    } catch (err) {
      console.error("Order submit error:", err);
      toast.error("অর্ডার করতে সমস্যা হয়েছে");
    } finally {
      setSubmitting(false);
    }
  };

  const closeAll = () => {
    setCheckout(false);
    setSuccess(false);
    setOrderNumber(null);
    close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/50 backdrop-blur-sm" onClick={closeAll}>
      <div
        className="bg-card w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ fontFamily: "'Tiro Bangla', serif" }}
      >
        <div className="flex items-center justify-between px-5 py-4 text-white" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <h3 className="font-bold text-lg">আপনার কার্ট</h3>
            <span className="bg-card/20 text-xs font-bold px-2 py-0.5 rounded-full">{toBn(count)}</span>
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && !checkout && !success && (
              <button
                onClick={() => setConfirmClear(true)}
                className="text-[11px] font-bold px-3 h-8 rounded-full bg-card/15 hover:bg-card/25 flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> সব মুছুন
              </button>
            )}
            <button onClick={closeAll} className="w-8 h-8 rounded-full bg-card/15 flex items-center justify-center hover:bg-card/25"><X className="h-4 w-4" /></button>
          </div>
        </div>

        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="relative w-20 h-20 mb-5">
              <div className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: `${BRAND_GREEN}33` }} />
              <div className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-extrabold text-foreground mb-1">ধন্যবাদ! অর্ডার সফল হয়েছে 🎉</h3>
            <p className="text-muted-foreground text-sm mb-4">আপনার অর্ডারটি গ্রহণ করা হয়েছে।</p>
            {orderNumber != null && (
              <div className="mb-4 inline-flex items-center gap-2 bg-blue-50 border-2 border-blue-200 text-blue-700 rounded-2xl px-4 py-2.5">
                <span className="text-xs font-bold">অর্ডার নম্বর</span>
                <span className="text-lg font-extrabold tracking-wider">#{toBn(orderNumber)}</span>
              </div>
            )}
            <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-3 text-sm text-amber-800 leading-relaxed">
              📞 আমাদের প্রতিনিধি শীঘ্রই আপনাকে কল দিয়ে অর্ডার <span className="font-extrabold">কনফার্ম</span> করবেন।
            </div>
            <div className="w-full bg-blue-50 border border-blue-200 rounded-2xl p-3 mb-5 text-sm text-blue-800 leading-relaxed text-left">
              📦 অর্ডার কনফার্ম হওয়ার পর আপনি আরেকটি মেসেজ পাবেন, যেখানে একটি <span className="font-extrabold">ট্র্যাকিং লিংক</span> থাকবে। লিংকে ক্লিক করলে আপনার পণ্যের <span className="font-extrabold">বর্তমান লোকেশন</span> দেখতে পারবেন।
            </div>
            <p className="text-xs font-bold mb-5" style={{ color: BRAND_DARK }}>— Kuakata Multimedia</p>
            <Button onClick={closeAll} className="w-full text-white font-bold py-4 rounded-2xl" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
              ঠিক আছে
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <ShoppingCart className="h-16 w-16 text-gray-300 mb-4" />
            <p>আপনার কার্ট খালি</p>
          </div>
        ) : !checkout ? (
          <>
            {/* Free delivery progress / hint - hidden in offer mode */}
            {!offer && settings.free_delivery_enabled && (
              <div className="mx-4 mt-4">
                {delivery.isFree ? (
                  <div className="bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> অভিনন্দন! আপনি ফ্রি ডেলিভারি পাচ্ছেন 🎉
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-xs">
                    আর মাত্র <span className="font-extrabold">৳{toBn(delivery.amountToFree)}</span> এর বাজার করলেই ফ্রি ডেলিভারি!
                    <div className="h-1.5 mt-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, (total / settings.free_delivery_threshold) * 100)}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.map(it => (
                <div key={it.id} className="flex gap-3 bg-muted rounded-2xl p-3 border border-border">
                  {it.image_url ? (
                    <img src={it.image_url} alt={it.product_name} className="w-16 h-16 rounded-xl object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center"><ShoppingCart className="h-6 w-6 text-muted-foreground" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground line-clamp-1">{it.product_name}</p>
                        {it.variant_label && <p className="text-[11px] text-muted-foreground">{it.variant_label}</p>}
                      </div>
                      <button onClick={() => removeItem(it.id)} className="text-muted-foreground hover:text-blue-600 shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 bg-card rounded-full border border-border">
                        <button onClick={() => updateQty(it.id, it.min_quantity ? Math.max(it.min_quantity, it.quantity - it.min_quantity) : it.quantity - 1)} className="w-7 h-7 flex items-center justify-center text-muted-foreground"><Minus className="h-3 w-3" /></button>
                        <span className="text-sm font-bold w-8 text-center">{toBn(it.quantity)}</span>
                        <button onClick={() => updateQty(it.id, it.min_quantity ? it.quantity + it.min_quantity : it.quantity + 1)} className="w-7 h-7 flex items-center justify-center text-muted-foreground"><Plus className="h-3 w-3" /></button>
                      </div>
                      <p className="font-extrabold text-sm" style={{ color: BRAND_GREEN }}>৳{toBn(it.unit_price * it.quantity)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border p-4 space-y-2 bg-card">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">সাবটোটাল</span>
                <span className="font-bold text-foreground">৳{toBn(total)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> ডেলিভারি চার্জ</span>
                {delivery.isFree ? (
                  <span className="font-bold text-blue-700">ফ্রি</span>
                ) : (
                  <span className="font-bold text-foreground">৳{toBn(delivery.charge)}</span>
                )}
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-muted-foreground">মোট</span>
                <span className="text-2xl font-extrabold" style={{ color: BRAND_DARK }}>৳{toBn(grandTotal)}</span>
              </div>
              <Button onClick={openCheckout} className="w-full text-white font-bold h-12 rounded-2xl gap-2" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
                <ShoppingCart className="h-4 w-4" /> চেকআউট করুন
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{toBn(count)} টি পণ্য (সাবটোটাল)</span>
                  <span className="font-bold text-foreground">৳{toBn(total)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1"><Truck className="h-3 w-3" /> ডেলিভারি চার্জ {totalWeightGrams > 0 && !delivery.isFree ? `(${toBn(totalWeightGrams / 1000)} কেজি)` : ""}</span>
                  {delivery.isFree
                    ? <span className="font-bold text-blue-700">ফ্রি</span>
                    : <span className="font-bold text-foreground">৳{toBn(delivery.charge)}</span>}
                </div>
                <div className="flex items-center justify-between border-t border-[#e2e8f0] pt-1.5">
                  <span className="text-sm font-bold text-foreground/80">মোট পরিশোধ</span>
                  <span className="text-xl font-extrabold" style={{ color: BRAND_DARK }}>৳{toBn(grandTotal)}</span>
                </div>
              </div>

              {/* Editable product list */}
              <div>
                <Label className="text-foreground font-bold text-sm mb-2 block">অর্ডার সামারি</Label>
                <div className="space-y-2">
                  {items.map(it => {
                    const unitLabel = it.unit_type === "kg" ? "কেজি" : it.unit_type === "size" ? "সাইজ" : "পিস";
                    return (
                    <div key={it.id} className="flex gap-2 bg-muted rounded-xl p-2 border border-border">
                      {it.image_url ? (
                        <img src={it.image_url} alt={it.product_name} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center"><ShoppingCart className="h-4 w-4 text-muted-foreground" /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-foreground line-clamp-1">{it.product_name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {it.variant_label ? `${it.variant_label} • ` : ""}৳{toBn(it.unit_price)} / {unitLabel}
                            </p>
                          </div>
                          <button onClick={() => removeItem(it.id)} className="text-muted-foreground hover:text-blue-600 shrink-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-1.5 gap-2">
                          <div className="flex items-center gap-1 bg-card rounded-full border border-border">
                            <button onClick={() => updateQty(it.id, it.min_quantity ? it.quantity - it.min_quantity : it.quantity - 1)} className="w-7 h-7 flex items-center justify-center text-muted-foreground"><Minus className="h-3 w-3" /></button>
                            <span className="text-sm font-bold min-w-[40px] text-center px-1 text-foreground">{toBn(it.quantity)}<span className="text-[9px] text-muted-foreground ml-0.5">{unitLabel}</span></span>
                            <button onClick={() => updateQty(it.id, it.min_quantity ? it.quantity + it.min_quantity : it.quantity + 1)} className="w-7 h-7 flex items-center justify-center text-muted-foreground"><Plus className="h-3 w-3" /></button>
                          </div>
                          <p className="font-extrabold text-xs" style={{ color: BRAND_GREEN }}>৳{toBn(it.unit_price * it.quantity)}</p>
                        </div>
                        {!it.min_quantity && (it.unit_type === "piece" || it.unit_type === "kg") && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {[5, 10, 20].map(n => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => updateQty(it.id, n)}
                                className={`px-2.5 h-6 rounded-full border text-[10px] font-bold transition ${
                                  it.quantity === n
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-card text-foreground/80 border-border hover:border-blue-500"
                                }`}
                              >
                                {toBn(n)} {unitLabel}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => updateQty(it.id, it.quantity + 1)}
                              className="px-2.5 h-6 rounded-full border border-dashed border-blue-500 text-[10px] font-bold text-blue-700 bg-slate-50"
                            >
                              + আরও
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );})}
                </div>
              </div>

              <div>
                <Label className="text-foreground font-bold text-sm mb-2 block">আপনার নাম <span className="text-blue-600">*</span></Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="পুরো নাম" className="h-12 rounded-2xl border-2 border-border" />
              </div>
              <div>
                <Label className="text-foreground font-bold text-sm mb-2 block">মোবাইল নম্বর <span className="text-blue-600">*</span></Label>
                <Input type="tel" inputMode="numeric" pattern="[0-9]*" value={form.phone} onChange={e => handlePhoneChange(e.target.value)} placeholder="01XXXXXXXXX" maxLength={11} className={`h-12 rounded-2xl border-2 ${phoneError ? 'border-slate-300' : 'border-border'}`} />
                {phoneError && <p className="text-blue-600 text-xs mt-1.5">{phoneError}</p>}
              </div>
              <div>
                <Label className="text-foreground font-bold text-sm mb-2 block">ঠিকানা <span className="text-blue-600">*</span></Label>
                <Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="সম্পূর্ণ ঠিকানা" rows={3} className="rounded-2xl border-2 border-border resize-none" />
              <PaymentMethodPicker
                settings={siteSettings}
                method={paymentMethod}
                senderNo={paymentSenderNo}
                trxId={paymentTrxId}
                onMethodChange={setPaymentMethod}
                onSenderNoChange={setPaymentSenderNo}
                onTrxIdChange={setPaymentTrxId}
              />
            </div>
            </div>
            <div className="border-t border-border p-4 space-y-2 bg-card">
              <Button onClick={submit} disabled={submitting} className="w-full text-white font-bold h-14 rounded-2xl gap-2 shadow-lg" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
                <ShoppingCart className="h-5 w-5" />
                {submitting ? "অর্ডার হচ্ছে..." : `অর্ডার কনফার্ম করুন (৳${toBn(grandTotal)})`}
              </Button>
              <button onClick={() => setCheckout(false)} className="w-full text-center text-xs text-muted-foreground py-2">← কার্টে ফিরে যান</button>
            </div>
          </>
        )}
      </div>

      {/* Custom clear-cart confirmation */}
      {confirmClear && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { e.stopPropagation(); setConfirmClear(false); }}
          style={{ fontFamily: "'Tiro Bangla', serif" }}
        >
          <div
            className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <Trash2 className="h-7 w-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1.5">কার্ট খালি করবেন?</h3>
              <p className="text-sm text-slate-500">কার্ট থেকে সব পণ্য সরিয়ে ফেলা হবে। এটি undo করা যাবে না।</p>
            </div>
            <div className="grid grid-cols-2 gap-3 px-6 pb-6">
              <button
                data-no-magenta
                onClick={() => setConfirmClear(false)}
                style={{ backgroundColor: "#10b981", color: "#fff" }}
                className="h-11 rounded-2xl font-bold text-sm shadow-sm hover:opacity-90 transition-opacity"
              >
                বাতিল
              </button>
              <button
                data-no-magenta
                onClick={() => {
                  clear();
                  setConfirmClear(false);
                  toast.success("কার্ট খালি করা হয়েছে");
                }}
                style={{ backgroundColor: "#ef4444", color: "#fff" }}
                className="h-11 rounded-2xl font-bold text-sm shadow-sm hover:opacity-90 transition-opacity"
              >
                হ্যাঁ, মুছুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartDrawer;
