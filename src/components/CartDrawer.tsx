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
const BRAND_GREEN = "#1f7a3a";
const BRAND_DARK = "#155c2c";

export const CartDrawer = () => {
  const { items, total, totalWeightGrams, isOpen, close, updateQty, removeItem, clear } = useCart();
  const { customer } = useShopCustomer();
  const { settings } = useDeliverySettings();
  const delivery = calculateDelivery(total, totalWeightGrams, settings);
  const grandTotal = total + delivery.charge;
  const [checkout, setCheckout] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [phoneError, setPhoneError] = useState("");
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [paymentSenderNo, setPaymentSenderNo] = useState("");
  const [paymentTrxId, setPaymentTrxId] = useState("");

  useEffect(() => {
    supabase.from("site_settings").select("*").single().then(({ data }) => setSiteSettings(data));
  }, []);

  const openCheckout = () => {
    if (!items.length) return;
    setForm({
      name: customer?.full_name || "",
      phone: customer?.phone || "",
      address: "",
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
      }));
      const { error } = await supabase.from("orders").insert(rows as any);
      if (error) throw error;
      setSuccess(true);
      clear();
    } catch {
      toast.error("অর্ডার করতে সমস্যা হয়েছে");
    } finally {
      setSubmitting(false);
    }
  };

  const closeAll = () => {
    setCheckout(false);
    setSuccess(false);
    close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/50 backdrop-blur-sm" onClick={closeAll}>
      <div
        className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ fontFamily: "'Hind Siliguri', sans-serif" }}
      >
        <div className="flex items-center justify-between px-5 py-4 text-white" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <h3 className="font-bold text-lg">আপনার কার্ট</h3>
            <span className="bg-white/20 text-xs font-bold px-2 py-0.5 rounded-full">{toBn(items.length)}</span>
          </div>
          <button onClick={closeAll} className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25"><X className="h-4 w-4" /></button>
        </div>

        {success ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 shadow-lg" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">অর্ডার সফল! 🎉</h3>
            <p className="text-gray-500 text-sm mb-6">আমরা শীঘ্রই আপনার সাথে যোগাযোগ করবো।</p>
            <Button onClick={closeAll} className="w-full text-white font-bold py-4 rounded-2xl" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
              ঠিক আছে
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500">
            <ShoppingCart className="h-16 w-16 text-gray-300 mb-4" />
            <p>আপনার কার্ট খালি</p>
          </div>
        ) : !checkout ? (
          <>
            {/* Free delivery progress / hint */}
            {settings.free_delivery_enabled && (
              <div className="mx-4 mt-4">
                {delivery.isFree ? (
                  <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> অভিনন্দন! আপনি ফ্রি ডেলিভারি পাচ্ছেন 🎉
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2 text-xs">
                    আর মাত্র <span className="font-extrabold">৳{toBn(delivery.amountToFree)}</span> এর বাজার করলেই ফ্রি ডেলিভারি!
                    <div className="h-1.5 mt-1.5 bg-amber-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, (total / settings.free_delivery_threshold) * 100)}%` }} />
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.map(it => (
                <div key={it.id} className="flex gap-3 bg-gray-50 rounded-2xl p-3 border border-gray-100">
                  {it.image_url ? (
                    <img src={it.image_url} alt={it.product_name} className="w-16 h-16 rounded-xl object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-200 flex items-center justify-center"><ShoppingCart className="h-6 w-6 text-gray-400" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-gray-900 line-clamp-1">{it.product_name}</p>
                        {it.variant_label && <p className="text-[11px] text-gray-500">{it.variant_label}</p>}
                      </div>
                      <button onClick={() => removeItem(it.id)} className="text-gray-400 hover:text-red-500 shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 bg-white rounded-full border border-gray-200">
                        <button onClick={() => updateQty(it.id, it.quantity - 1)} className="w-7 h-7 flex items-center justify-center text-gray-600"><Minus className="h-3 w-3" /></button>
                        <span className="text-sm font-bold w-6 text-center">{toBn(it.quantity)}</span>
                        <button onClick={() => updateQty(it.id, it.quantity + 1)} className="w-7 h-7 flex items-center justify-center text-gray-600"><Plus className="h-3 w-3" /></button>
                      </div>
                      <p className="font-extrabold text-sm" style={{ color: BRAND_GREEN }}>৳{toBn(it.unit_price * it.quantity)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 p-4 space-y-2 bg-white">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">সাবটোটাল</span>
                <span className="font-bold text-gray-900">৳{toBn(total)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> ডেলিভারি চার্জ</span>
                {delivery.isFree ? (
                  <span className="font-bold text-green-700">ফ্রি</span>
                ) : (
                  <span className="font-bold text-gray-900">৳{toBn(delivery.charge)}</span>
                )}
              </div>
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-gray-600">মোট</span>
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
              <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{toBn(items.length)} টি পণ্য (সাবটোটাল)</span>
                  <span className="font-bold text-gray-900">৳{toBn(total)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 flex items-center gap-1"><Truck className="h-3 w-3" /> ডেলিভারি চার্জ {totalWeightGrams > 0 && !delivery.isFree ? `(${toBn(totalWeightGrams / 1000)} কেজি)` : ""}</span>
                  {delivery.isFree
                    ? <span className="font-bold text-green-700">ফ্রি</span>
                    : <span className="font-bold text-gray-900">৳{toBn(delivery.charge)}</span>}
                </div>
                <div className="flex items-center justify-between border-t border-[#bbf7d0] pt-1.5">
                  <span className="text-sm font-bold text-gray-700">মোট পরিশোধ</span>
                  <span className="text-xl font-extrabold" style={{ color: BRAND_DARK }}>৳{toBn(grandTotal)}</span>
                </div>
              </div>

              {/* Editable product list */}
              <div>
                <Label className="text-gray-800 font-bold text-sm mb-2 block">অর্ডার সামারি</Label>
                <div className="space-y-2">
                  {items.map(it => {
                    const unitLabel = it.unit_type === "kg" ? "কেজি" : it.unit_type === "size" ? "সাইজ" : "পিস";
                    return (
                    <div key={it.id} className="flex gap-2 bg-gray-50 rounded-xl p-2 border border-gray-100">
                      {it.image_url ? (
                        <img src={it.image_url} alt={it.product_name} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center"><ShoppingCart className="h-4 w-4 text-gray-400" /></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-gray-900 line-clamp-1">{it.product_name}</p>
                            <p className="text-[10px] text-gray-500">
                              {it.variant_label ? `${it.variant_label} • ` : ""}৳{toBn(it.unit_price)} / {unitLabel}
                            </p>
                          </div>
                          <button onClick={() => removeItem(it.id)} className="text-gray-400 hover:text-red-500 shrink-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-1.5 gap-2">
                          <div className="flex items-center gap-1 bg-white rounded-full border border-gray-200">
                            <button onClick={() => updateQty(it.id, it.quantity - 1)} className="w-7 h-7 flex items-center justify-center text-gray-600"><Minus className="h-3 w-3" /></button>
                            <span className="text-xs font-bold w-7 text-center">{toBn(it.quantity)} <span className="text-[9px] text-gray-500">{unitLabel}</span></span>
                            <button onClick={() => updateQty(it.id, it.quantity + 1)} className="w-7 h-7 flex items-center justify-center text-gray-600"><Plus className="h-3 w-3" /></button>
                          </div>
                          <p className="font-extrabold text-xs" style={{ color: BRAND_GREEN }}>৳{toBn(it.unit_price * it.quantity)}</p>
                        </div>
                        {(it.unit_type === "piece" || it.unit_type === "kg") && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {[5, 10, 20].map(n => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => updateQty(it.id, n)}
                                className={`px-2.5 h-6 rounded-full border text-[10px] font-bold transition ${
                                  it.quantity === n
                                    ? "bg-green-600 text-white border-green-600"
                                    : "bg-white text-gray-700 border-gray-200 hover:border-green-400"
                                }`}
                              >
                                {toBn(n)} {unitLabel}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => updateQty(it.id, it.quantity + 1)}
                              className="px-2.5 h-6 rounded-full border border-dashed border-green-400 text-[10px] font-bold text-green-700 bg-green-50"
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
                <Label className="text-gray-800 font-bold text-sm mb-2 block">আপনার নাম <span className="text-red-500">*</span></Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="পুরো নাম" className="h-12 rounded-2xl border-2 border-gray-200" />
              </div>
              <div>
                <Label className="text-gray-800 font-bold text-sm mb-2 block">মোবাইল নম্বর <span className="text-red-500">*</span></Label>
                <Input value={form.phone} onChange={e => handlePhoneChange(e.target.value)} placeholder="01XXXXXXXXX" maxLength={11} className={`h-12 rounded-2xl border-2 ${phoneError ? 'border-red-300' : 'border-gray-200'}`} />
                {phoneError && <p className="text-red-500 text-xs mt-1.5">{phoneError}</p>}
              </div>
              <div>
                <Label className="text-gray-800 font-bold text-sm mb-2 block">ঠিকানা <span className="text-red-500">*</span></Label>
                <Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="সম্পূর্ণ ঠিকানা" rows={3} className="rounded-2xl border-2 border-gray-200 resize-none" />
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
            <div className="border-t border-gray-100 p-4 space-y-2 bg-white">
              <Button onClick={submit} disabled={submitting} className="w-full text-white font-bold h-14 rounded-2xl gap-2 shadow-lg" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
                <ShoppingCart className="h-5 w-5" />
                {submitting ? "অর্ডার হচ্ছে..." : `অর্ডার কনফার্ম করুন (৳${toBn(grandTotal)})`}
              </Button>
              <button onClick={() => setCheckout(false)} className="w-full text-center text-xs text-gray-500 py-2">← কার্টে ফিরে যান</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
