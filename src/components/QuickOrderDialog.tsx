import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShoppingCart, X, CheckCircle, Truck as TruckIcon, MessageCircle, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useDeliverySettings } from "@/hooks/useDeliverySettings";
import { calculateDelivery } from "@/lib/delivery";
import { useShopCustomer } from "@/hooks/useShopCustomer";
import PaymentMethodPicker from "@/components/PaymentMethodPicker";
import { sendTeamSms } from "@/lib/sendTeamSms";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);
const BRAND_GREEN = "#3b82f6";
const BRAND_DARK = "#3b82f6";

interface Props {
  product: any | null;
  open: boolean;
  onClose: () => void;
}

export default function QuickOrderDialog({ product, open, onClose }: Props) {
  const { customer: shopCustomer } = useShopCustomer();
  const { settings: deliverySettings } = useDeliverySettings();
  const [qty, setQty] = useState(1);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number>(-1);
  const [orderForm, setOrderForm] = useState({
    name: "", phone: "", address: "",
    payment_method: "cod" as "cod" | "bkash" | "nagad" | "rocket",
    payment_sender_no: "", payment_trx_id: "",
  });

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").single();
      return data;
    },
  });

  const variants: any[] = Array.isArray(product?.variants) ? product.variants : [];

  useEffect(() => {
    if (open) {
      setOrderSuccess(false);
      setPhoneError("");
      setQty(1);
      setSelectedVariantIdx(variants.length > 0 ? 0 : -1);
      if (shopCustomer) {
        setOrderForm((f) => ({
          ...f,
          name: shopCustomer.full_name || "",
          phone: shopCustomer.phone || "",
          address: shopCustomer.address || "",
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  const chosenVariant = variants.length > 0 && selectedVariantIdx >= 0 ? variants[selectedVariantIdx] : null;
  const baseHasDiscount = product?.discount_price && product.discount_price < product.price;
  const variantHasDiscount = chosenVariant && chosenVariant.discount_price != null && Number(chosenVariant.discount_price) < Number(chosenVariant.price);
  const hasDiscount = chosenVariant ? variantHasDiscount : baseHasDiscount;
  const origPrice = chosenVariant ? Number(chosenVariant.price ?? 0) : Number(product?.price ?? 0);
  const unitPrice = chosenVariant
    ? Number(chosenVariant.discount_price ?? chosenVariant.price ?? 0)
    : (baseHasDiscount ? product.discount_price : product?.price ?? 0);
  const total = unitPrice * qty;
  const variantWeight = chosenVariant && chosenVariant.weight_grams != null ? Number(chosenVariant.weight_grams) : null;
  const wPer = variantWeight && variantWeight > 0 ? variantWeight : Number(product?.weight_grams || 0);
  const totalWeight = wPer * qty;
  const dlv = useMemo(() => calculateDelivery(total, totalWeight, deliverySettings), [total, totalWeight, deliverySettings]);
  const grandTotal = total + dlv.charge;
  const whatsappNo = siteSettings?.whatsapp_no || product?.contact_info || siteSettings?.contact_phone || "";

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    setOrderForm((f) => ({ ...f, phone: digits }));
    setPhoneError(digits.length > 0 && digits.length !== 11 ? "মোবাইল নম্বর অবশ্যই ১১ ডিজিটের হতে হবে" : "");
  };

  const handleSubmit = async () => {
    if (!product) return;
    if (!orderForm.name.trim()) return toast.error("আপনার নাম দিন");
    if (orderForm.phone.length !== 11) { setPhoneError("মোবাইল নম্বর অবশ্যই ১১ ডিজিটের হতে হবে"); return; }
    if (!orderForm.address.trim()) return toast.error("আপনার ঠিকানা দিন");
    if (variants.length > 0 && !chosenVariant) return toast.error("একটি অপশন বাছাই করুন");
    if (orderForm.payment_method !== "cod") {
      if (orderForm.payment_sender_no.length !== 11) return toast.error("আপনার পেমেন্ট নম্বর দিন (১১ ডিজিট)");
      if (!orderForm.payment_trx_id.trim()) return toast.error("ট্রানজেকশন আইডি দিন");
    }
    setSubmitting(true);
    try {
      const variantLabel = chosenVariant ? String(chosenVariant.label) : null;
      const baseName = product.name || "প্রডাক্ট";
      const { data: inserted, error } = await supabase.from("orders").insert({
        customer_name: orderForm.name.trim(),
        customer_phone: orderForm.phone,
        customer_address: orderForm.address.trim(),
        product_name: variantLabel ? `${baseName} (${variantLabel})` : baseName,
        variant_label: variantLabel,
        quantity: qty,
        unit_price: unitPrice,
        total_amount: grandTotal,
        delivery_charge: dlv.charge,
        payment_method: orderForm.payment_method,
        payment_sender_no: orderForm.payment_method !== "cod" ? orderForm.payment_sender_no : null,
        payment_trx_id: orderForm.payment_method !== "cod" ? orderForm.payment_trx_id.trim() : null,
      } as any).select("order_number").single();
      if (error) throw error;
      const oNum = (inserted as any)?.order_number ?? null;
      setOrderNumber(oNum);
      setOrderSuccess(true);
      if (oNum) {
        sendTeamSms({
          phone: orderForm.phone,
          message: `Dhonnobad! Apnar order #${oNum} grohon kora hoyeche. Amader protinidi sigroi call diye confirm korben. - Kuakata Multimedia`,
        });
      }
    } catch {
      toast.error("অর্ডার করতে সমস্যা হয়েছে");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!orderSuccess && orderForm.phone.length === 11 && product) {
      try {
        await supabase.from("orders").insert({
          customer_name: orderForm.name.trim() || "অজানা",
          customer_phone: orderForm.phone,
          customer_address: orderForm.address.trim() || null,
          product_name: product.name || "প্রডাক্ট",
          quantity: qty,
          unit_price: 0,
          total_amount: 0,
          status: "abandoned" as any,
        });
      } catch {}
    }
    setOrderForm({ name: "", phone: "", address: "", payment_method: "cod", payment_sender_no: "", payment_trx_id: "" });
    onClose();
  };

  if (!open || !product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={handleClose}>
      <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {orderSuccess ? (
          <div className="p-8 text-center" style={{ fontFamily: "'Tiro Bangla', serif" }}>
            <div className="relative w-20 h-20 mx-auto mb-5">
              <div className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: `${BRAND_GREEN}33` }} />
              <div className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-extrabold text-foreground mb-1">ধন্যবাদ! অর্ডার সফল হয়েছে 🎉</h3>
            <p className="text-muted-foreground text-sm mb-4">আপনার অর্ডারটি গ্রহণ করা হয়েছে।</p>
            {orderNumber != null && (
              <div className="mx-auto mb-4 inline-flex items-center gap-2 bg-blue-50 border-2 border-blue-200 text-blue-700 rounded-2xl px-4 py-2.5">
                <span className="text-xs font-bold">অর্ডার নম্বর</span>
                <span className="text-lg font-extrabold tracking-wider">#{toBn(orderNumber)}</span>
              </div>
            )}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-3 text-sm text-amber-800 leading-relaxed">
              📞 আমাদের প্রতিনিধি শীঘ্রই আপনাকে কল দিয়ে অর্ডার <span className="font-extrabold">কনফার্ম</span> করবেন।
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 mb-5 text-sm text-blue-800 leading-relaxed text-left">
              📦 অর্ডার কনফার্ম হওয়ার পর আপনি আরেকটি মেসেজ পাবেন, যেখানে একটি <span className="font-extrabold">ট্র্যাকিং লিংক</span> থাকবে। লিংকে ক্লিক করলে আপনার পণ্যের <span className="font-extrabold">বর্তমান লোকেশন</span> দেখতে পারবেন।
            </div>
            <p className="text-xs font-bold mb-5" style={{ color: BRAND_DARK }}>— Kuakata Multimedia</p>
            <Button onClick={onClose} className="w-full text-white font-bold py-4 rounded-2xl" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>ঠিক আছে</Button>
          </div>
        ) : (
          <>
            <div className="relative px-5 py-5" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-card/20 rounded-xl flex items-center justify-center"><ShoppingCart className="h-5 w-5 text-white" /></div>
                  <div>
                    <h3 className="text-lg font-bold text-white">অর্ডার করুন</h3>
                    <p className="text-white/70 text-xs">তথ্য দিয়ে কনফার্ম করুন</p>
                  </div>
                </div>
                <button onClick={handleClose} className="w-8 h-8 rounded-full bg-card/15 flex items-center justify-center text-white/80"><X className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="mx-5 mt-4">
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-4 flex items-center gap-3">
                {product.image_url && <img src={product.image_url} alt="" className="w-14 h-14 rounded-xl object-cover" />}
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">পণ্যের মূল্য</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-extrabold" style={{ color: BRAND_DARK }}>৳{toBn(total)}</span>
                    {hasDiscount && <span className="line-through text-muted-foreground text-xs">৳{toBn(origPrice * qty)}</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {product.name}{chosenVariant ? ` — ${chosenVariant.label}` : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {variants.length > 0 && (
                <div>
                  <Label className="text-foreground font-bold text-sm mb-2 block">অপশন বাছাই করুন <span className="text-blue-600">*</span></Label>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((v, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedVariantIdx(i)}
                        className={`px-3 py-2 rounded-xl border-2 text-sm font-medium ${
                          selectedVariantIdx === i ? "border-blue-600 bg-slate-50 text-blue-700" : "border-border bg-card text-foreground"
                        }`}
                      >
                        {v.label} — ৳{toBn(Number(v.discount_price ?? v.price ?? 0))}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-foreground font-bold text-sm mb-2 block">পরিমাণ</Label>
                <div className="inline-flex items-center gap-2 border-2 border-border rounded-2xl p-1.5">
                  <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-xl" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-10 text-center font-bold text-foreground">{toBn(qty)}</span>
                  <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-xl" onClick={() => setQty((q) => q + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-foreground font-bold text-sm mb-2 block">আপনার নাম <span className="text-blue-600">*</span></Label>
                <Input value={orderForm.name} onChange={(e) => setOrderForm((f) => ({ ...f, name: e.target.value }))} placeholder="পুরো নাম" className="h-12 rounded-2xl border-2 border-border bg-card text-foreground placeholder:text-muted-foreground" />
              </div>
              <div>
                <Label className="text-foreground font-bold text-sm mb-2 block">মোবাইল <span className="text-blue-600">*</span></Label>
                <Input type="tel" inputMode="numeric" pattern="[0-9]*" value={orderForm.phone} onChange={(e) => handlePhoneChange(e.target.value)} placeholder="01XXXXXXXXX" maxLength={11} className={`h-12 rounded-2xl border-2 bg-card text-foreground placeholder:text-muted-foreground ${phoneError ? "border-slate-300" : "border-border"}`} />
                {phoneError && <p className="text-blue-600 text-xs mt-1.5">{phoneError}</p>}
              </div>
              <div>
                <Label className="text-foreground font-bold text-sm mb-2 block">ঠিকানা <span className="text-blue-600">*</span></Label>
                <Textarea value={orderForm.address} onChange={(e) => setOrderForm((f) => ({ ...f, address: e.target.value }))} placeholder="সম্পূর্ণ ঠিকানা" rows={3} className="rounded-2xl border-2 border-border bg-card text-foreground placeholder:text-muted-foreground resize-none" />
              </div>
              <PaymentMethodPicker
                settings={siteSettings}
                method={orderForm.payment_method}
                senderNo={orderForm.payment_sender_no}
                trxId={orderForm.payment_trx_id}
                onMethodChange={(m) => setOrderForm((f) => ({ ...f, payment_method: m }))}
                onSenderNoChange={(v) => setOrderForm((f) => ({ ...f, payment_sender_no: v }))}
                onTrxIdChange={(v) => setOrderForm((f) => ({ ...f, payment_trx_id: v }))}
              />

              <div className="relative rounded-2xl p-[1.5px] bg-gradient-to-br from-slate-300 via-blue-500 to-blue-600 shadow-lg">
                <div className="rounded-[14px] bg-gradient-to-br from-slate-50 via-white to-slate-50 p-3.5 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground/80 flex items-center gap-2 font-medium">
                      <span className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                        <TruckIcon className="h-3.5 w-3.5 text-white" />
                      </span>
                      ডেলিভারি চার্জ
                    </span>
                    {dlv.isFree ? (
                      <span className="font-extrabold text-xs px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-600 to-blue-600 text-white shadow">🎉 ফ্রি</span>
                    ) : (
                      <span className="font-extrabold text-foreground">৳{toBn(dlv.charge)}</span>
                    )}
                  </div>
                  {!dlv.isFree && deliverySettings.free_delivery_enabled && dlv.amountToFree > 0 && (
                    <div className="text-[11px] text-slate-900 bg-slate-100/70 border border-slate-200 rounded-lg px-2.5 py-1.5">
                      🚚 আর মাত্র <span className="font-extrabold">৳{toBn(dlv.amountToFree)}</span> অর্ডার করলেই <span className="font-extrabold">ফ্রি ডেলিভারি!</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-300">
                    <span className="font-bold text-foreground text-base">মোট পেমেন্ট</span>
                    <span className="font-extrabold text-2xl bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
                      ৳{toBn(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              <Button onClick={handleSubmit} disabled={submitting} className="w-full text-white font-bold text-base h-14 rounded-2xl gap-2 shadow-lg" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
                <ShoppingCart className="h-5 w-5" />
                {submitting ? "অর্ডার হচ্ছে..." : "অর্ডার কনফার্ম করুন"}
              </Button>
              {whatsappNo && (
                <Button
                  type="button"
                  onClick={() => {
                    const lines = [
                      `🛒 *নতুন অর্ডার*`,
                      ``,
                      `📦 পণ্য: ${product?.name || ""}${chosenVariant ? ` (${chosenVariant.label})` : ""}`,
                      `🔢 পরিমাণ: ${toBn(qty)}`,
                      `💰 একক মূল্য: ৳${toBn(unitPrice)}`,
                      `🧾 সাবটোটাল: ৳${toBn(total)}`,
                      `🚚 ডেলিভারি: ${dlv.isFree ? "ফ্রি" : `৳${toBn(dlv.charge)}`}`,
                      `✅ মোট পেমেন্ট: ৳${toBn(grandTotal)}`,
                      ``,
                      `👤 নাম: ${orderForm.name || "-"}`,
                      `📱 মোবাইল: ${orderForm.phone || "-"}`,
                      `📍 ঠিকানা: ${orderForm.address || "-"}`,
                    ];
                    const url = `https://wa.me/${whatsappNo.replace(/\D/g, "")}?text=${encodeURIComponent(lines.join("\n"))}`;
                    window.open(url, "_blank");
                  }}
                  className="w-full text-white font-bold text-base h-14 rounded-2xl gap-2 shadow-lg bg-[#25D366] hover:bg-[#1ebe57]"
                >
                  <MessageCircle className="h-5 w-5" />
                  WhatsApp এ অর্ডার পাঠান
                </Button>
              )}
              <p className="text-center text-muted-foreground text-xs">🔒 আপনার তথ্য সম্পূর্ণ নিরাপদ</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
