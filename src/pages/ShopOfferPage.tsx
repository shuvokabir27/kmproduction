import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ShoppingBag, Truck, Tag, Clock, Package, ArrowLeft, Check, CheckCircle2, User, Phone, MapPin } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useShopCustomer } from "@/hooks/useShopCustomer";
import { toast } from "sonner";

const toBn = (n: number | string) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

export default function ShopOfferPage() {
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const { customer } = useShopCustomer();
  const [now, setNow] = useState(Date.now());
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [phoneError, setPhoneError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (customer) {
      setForm(f => ({
        name: f.name || customer.full_name || "",
        phone: f.phone || customer.phone || "",
        address: f.address || customer.address || "",
      }));
    }
  }, [customer]);

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const { data: offer, isLoading } = useQuery({
    queryKey: ["shop-offer", id || slug],
    enabled: !!(id || slug),
    queryFn: async () => {
      const q = supabase.from("shop_offers" as any).select("*");
      const { data } = slug
        ? await q.eq("slug", slug).maybeSingle()
        : await q.eq("id", id).maybeSingle();
      return data as any;
    },
  });

  const isCombo = offer?.discount_type === "combo";
  const comboItems: any[] = isCombo && Array.isArray(offer?.combo_products) ? offer.combo_products : [];
  const comboIds = comboItems.map((c: any) => c.product_id).filter(Boolean);
  const singleId = offer?.product_id;
  const allIds = Array.from(new Set([...(singleId ? [singleId] : []), ...comboIds]));

  const { data: productsData } = useQuery({
    queryKey: ["offer-products", allIds],
    enabled: allIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id,name,image_url,price,discount_price,weight_grams,unit_type,description").in("id", allIds);
      return data ?? [];
    },
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">লোড হচ্ছে...</div>;
  }
  if (!offer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-lg font-bold">অফারটি পাওয়া যায়নি</p>
        <Link to="/" className="text-primary underline">হোমে ফিরে যান</Link>
      </div>
    );
  }

  const isFree = offer.discount_type === "free_delivery";
  const isPct = offer.discount_type === "percentage";

  const comboTotal = comboItems.reduce((sum: number, c: any) => {
    const p = productsData?.find(x => x.id === c.product_id);
    if (!p) return sum;
    return sum + Number(p.discount_price ?? p.price ?? 0) * (c.quantity || 1);
  }, 0);
  const comboPrice = Number(offer.combo_price || 0);
  const savings = isCombo && comboPrice > 0 && comboTotal > comboPrice ? comboTotal - comboPrice : 0;
  const savingsPct = comboTotal > 0 ? Math.round((savings / comboTotal) * 100) : 0;

  // Countdown
  let dd = 0, hh = 0, mm = 0, ss = 0, hasCountdown = false;
  if (offer.ends_at) {
    const diff = new Date(offer.ends_at).getTime() - now;
    if (diff > 0) {
      hasCountdown = true;
      dd = Math.floor(diff / 86400000);
      hh = Math.floor((diff % 86400000) / 3600000);
      mm = Math.floor((diff % 3600000) / 60000);
      ss = Math.floor((diff % 60000) / 1000);
    }
  }

  const handleOrderCombo = () => {
    if (!productsData || productsData.length === 0) {
      toast.error("প্রডাক্ট লোড হচ্ছে");
      return;
    }
    cart.clear();
    let added = 0;
    comboItems.forEach((c: any) => {
      const p = productsData.find(x => x.id === c.product_id);
      if (!p) return;
      const baseQty = c.quantity || 1;
      const unitPrice = comboPrice > 0 && comboTotal > 0
        ? Math.round((Number(p.discount_price ?? p.price ?? 0) * (comboPrice / comboTotal)) * 100) / 100
        : Number(p.discount_price ?? p.price ?? 0);
      cart.addItem({
        product_id: p.id,
        product_name: p.name,
        image_url: p.image_url,
        variant_label: `কম্বো: ${offer.title}`,
        unit_price: unitPrice,
        quantity: baseQty,
        min_quantity: baseQty,
        unit_type: p.unit_type ?? null,
        weight_grams: Number(p.weight_grams || 0),
      });
      added++;
    });
    if (added === 0) {
      toast.error("কোনো প্রডাক্ট কার্টে যোগ হয়নি");
      return;
    }
    cart.setOffer({ offer_id: offer.id, title: offer.title, free_delivery: !!offer.combo_free_delivery, is_combo: true });
    toast.success("কম্বো অর্ডার কার্টে যোগ হয়েছে");
    cart.open();
  };

  const handleOrderSingle = () => {
    const p = productsData?.find(x => x.id === singleId);
    if (!p) { toast.error("প্রডাক্ট পাওয়া যায়নি"); return; }
    const base = Number(p.discount_price ?? p.price ?? 0);
    let unit = base;
    if (isPct) unit = Math.max(0, base - (base * Number(offer.discount_value || 0)) / 100);
    else if (offer.discount_type === "fixed") unit = Math.max(0, base - Number(offer.discount_value || 0));
    cart.clear();
    cart.addItem({
      product_id: p.id,
      product_name: p.name,
      image_url: p.image_url,
      variant_label: `অফার: ${offer.title}`,
      unit_price: unit,
      quantity: 1,
      unit_type: p.unit_type ?? null,
      weight_grams: Number(p.weight_grams || 0),
    });
    cart.setOffer({ offer_id: offer.id, title: offer.title, free_delivery: !!offer.combo_free_delivery });
    toast.success("অফার কার্টে যোগ হয়েছে");
    cart.open();
  };

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    setForm(f => ({ ...f, phone: digits }));
    setPhoneError(digits.length > 0 && digits.length !== 11 ? "মোবাইল নম্বর ১১ ডিজিটের হতে হবে" : "");
  };

  const handleSubmitOrder = async () => {
    if (!productsData || productsData.length === 0) { toast.error("প্রডাক্ট লোড হচ্ছে"); return; }
    if (!form.name.trim()) return toast.error("নাম দিন");
    if (form.phone.length !== 11) { setPhoneError("মোবাইল নম্বর ১১ ডিজিটের হতে হবে"); return; }
    if (!form.address.trim()) return toast.error("ঠিকানা দিন");

    let rows: any[] = [];
    if (isCombo) {
      rows = comboItems.map((c: any) => {
        const p = productsData.find(x => x.id === c.product_id);
        if (!p) return null;
        const baseQty = c.quantity || 1;
        const unitPrice = comboPrice > 0 && comboTotal > 0
          ? Math.round((Number(p.discount_price ?? p.price ?? 0) * (comboPrice / comboTotal)) * 100) / 100
          : Number(p.discount_price ?? p.price ?? 0);
        return {
          product_id: p.id,
          product_name: `${p.name} (কম্বো: ${offer.title})`,
          variant_label: `কম্বো: ${offer.title}`,
          quantity: baseQty,
          unit_price: unitPrice,
          total_amount: unitPrice * baseQty,
        };
      }).filter(Boolean);
    } else {
      const p = productsData.find(x => x.id === singleId);
      if (!p) { toast.error("প্রডাক্ট পাওয়া যায়নি"); return; }
      const base = Number(p.discount_price ?? p.price ?? 0);
      let unit = base;
      if (isPct) unit = Math.max(0, base - (base * Number(offer.discount_value || 0)) / 100);
      else if (offer.discount_type === "fixed") unit = Math.max(0, base - Number(offer.discount_value || 0));
      rows = [{
        product_id: p.id,
        product_name: `${p.name} (অফার: ${offer.title})`,
        variant_label: `অফার: ${offer.title}`,
        quantity: 1,
        unit_price: unit,
        total_amount: unit,
      }];
    }

    if (rows.length === 0) { toast.error("অর্ডার তৈরি করা যায়নি"); return; }

    setSubmitting(true);
    try {
      let sharedNumber: number | null = null;
      if (rows.length > 1) {
        const { data: numData, error: numErr } = await supabase.rpc("next_order_number" as any);
        if (numErr) throw numErr;
        sharedNumber = numData as number;
      }
      const insertRows = rows.map((r, idx) => ({
        ...r,
        customer_name: form.name.trim(),
        customer_phone: form.phone,
        customer_address: form.address.trim(),
        delivery_charge: 0,
        shop_customer_id: customer?.id ?? null,
        payment_method: "cod",
        ...(sharedNumber ? { order_number: sharedNumber } : {}),
      }));
      const { error } = await supabase.from("orders").insert(insertRows as any);
      if (error) throw error;
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Offer order error:", err);
      toast.error("অর্ডার করতে সমস্যা হয়েছে");
    } finally {
      setSubmitting(false);
    }
  };

  const TimeBox = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center bg-white/15 backdrop-blur rounded-xl px-3 py-2 min-w-[60px] border border-white/30">
      <span className="text-2xl md:text-3xl font-extrabold text-white font-mono leading-none">{toBn(value.toString().padStart(2, "0"))}</span>
      <span className="text-[10px] text-white/80 mt-1 font-semibold">{label}</span>
    </div>
  );

  const heroImage = offer.image_url || productsData?.[0]?.image_url;

  return (
    <div className="min-h-screen bg-background pb-24" style={{ fontFamily: "'Hind Siliguri', 'Tiro Bangla', serif" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-bold truncate">{offer.title}</h1>
        </div>
      </div>

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-red-500 via-red-600 to-red-600 text-white">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
          {heroImage && (
            <div className="w-full rounded-2xl overflow-hidden ring-2 ring-white/40 shadow-2xl bg-black/20 flex items-center justify-center">
              <img src={heroImage} alt={offer.title} className="w-full h-auto max-h-[42vh] md:max-h-[50vh] object-contain" />
            </div>
          )}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              {offer.badge_text || "বিশেষ অফার"}
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold drop-shadow leading-tight">{offer.title}</h2>
            {offer.description && <p className="text-white/90 text-xs md:text-sm line-clamp-2">{offer.description}</p>}

            <div className="inline-flex items-center gap-2 bg-white text-red-700 font-extrabold text-lg px-4 py-1.5 rounded-full shadow-xl">
              {isFree ? <Truck className="h-5 w-5" /> : isCombo ? <Package className="h-5 w-5" /> : <Tag className="h-5 w-5" />}
              {isFree ? "ফ্রি ডেলিভারি"
                : isCombo ? (comboPrice ? `৳${toBn(comboPrice)} মাত্র` : "কম্বো অফার")
                : isPct ? `${toBn(offer.discount_value)}% ছাড়`
                : `৳${toBn(offer.discount_value)} ছাড়`}
            </div>

            {hasCountdown && (
              <div className="flex items-center gap-2 justify-center pt-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-bold">শেষ হবে:</span>
                <div className="flex gap-1.5">
                  {dd > 0 && <TimeBox value={dd} label="দিন" />}
                  <TimeBox value={hh} label="ঘণ্টা" />
                  <TimeBox value={mm} label="মিনিট" />
                  <TimeBox value={ss} label="সেকেন্ড" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Combo product list with prices */}
      <div className="max-w-3xl mx-auto px-4 mt-6 space-y-3">
        {isCombo ? (
          <>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-red-600" /> কম্বোতে যা যা থাকছে
            </h3>
            <div className="space-y-2">
              {comboItems.map((c: any, idx: number) => {
                const p = productsData?.find(x => x.id === c.product_id);
                if (!p) return null;
                const qty = c.quantity || 1;
                const unitLabel = p.unit_type === "kg" ? "কেজি" : p.unit_type === "size" ? "সাইজ" : "পিস";
                return (
                  <div key={idx} className="flex items-center gap-3 bg-card border rounded-xl p-3">
                    {p.image_url && <img src={p.image_url} alt={p.name} className="w-16 h-16 rounded-lg object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">পরিমাণ: {toBn(qty)} {unitLabel}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-card border rounded-xl p-4 space-y-2">
              {comboTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">আগের মোট মূল্য:</span>
                  <span className="font-bold line-through opacity-70">৳{toBn(comboTotal)}</span>
                </div>
              )}
              {comboPrice > 0 && (
                <div className="flex justify-between text-lg">
                  <span className="font-bold">কম্বো মূল্য:</span>
                  <span className="font-extrabold text-red-600">৳{toBn(comboPrice)}</span>
                </div>
              )}
              {savings > 0 && (
                <div className="flex justify-between text-sm bg-red-50 dark:bg-red-950/30 rounded-lg p-2">
                  <span className="text-red-700 dark:text-red-400 font-bold">আপনার সাশ্রয়:</span>
                  <span className="text-red-700 dark:text-red-400 font-extrabold">৳{toBn(savings)} ({toBn(savingsPct)}%)</span>
                </div>
              )}
              {offer.combo_free_delivery && (
                <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                  <Truck className="h-4 w-4" /> ফ্রি ডেলিভারি
                </div>
              )}
            </div>
          </>
        ) : singleId && productsData?.[0] ? (
          <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
            {productsData[0].image_url && <img src={productsData[0].image_url} className="w-20 h-20 rounded-lg object-cover" alt={productsData[0].name} />}
            <div className="flex-1">
              <p className="font-bold">{productsData[0].name}</p>
              <p className="text-red-600 font-extrabold text-lg">৳{toBn(Number(productsData[0].discount_price ?? productsData[0].price ?? 0))}</p>
            </div>
          </div>
        ) : null}

        <ul className="space-y-1 text-sm text-muted-foreground pt-2">
          <li className="flex items-center gap-2"><Check className="h-4 w-4 text-red-600" /> অরিজিনাল পণ্যের নিশ্চয়তা</li>
          <li className="flex items-center gap-2"><Check className="h-4 w-4 text-red-600" /> ক্যাশ অন ডেলিভারি</li>
          {(offer.combo_free_delivery || isFree) && (
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-red-600" /> ডেলিভারি চার্জ ফ্রি</li>
          )}
        </ul>

        {/* Inline Order Form */}
        <div id="offer-order-form" className="bg-card border-2 border-red-500/30 rounded-2xl p-5 mt-6 shadow-xl">
          {success ? (
            <div className="flex flex-col items-center text-center py-6 gap-3">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <CheckCircle2 className="h-9 w-9 text-red-600" />
              </div>
              <h3 className="text-2xl font-extrabold text-red-700">অর্ডার সফল! 🎉</h3>
              <p className="text-muted-foreground text-sm">আমরা শীঘ্রই আপনার সাথে যোগাযোগ করবো।</p>
              <button
                onClick={() => navigate("/products")}
                className="mt-2 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl"
              >
                আরও কেনাকাটা করুন
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-extrabold mb-1 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-red-600" /> অর্ডার করতে নিচের তথ্য দিন
              </h3>
              <p className="text-xs text-muted-foreground mb-4">ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে টাকা দিন</p>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-bold mb-1.5 flex items-center gap-1.5"><User className="h-4 w-4" /> আপনার নাম <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="পুরো নাম"
                    maxLength={100}
                    className="w-full h-11 px-3 rounded-xl border-2 border-border bg-background focus:border-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold mb-1.5 flex items-center gap-1.5"><Phone className="h-4 w-4" /> মোবাইল নম্বর <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={form.phone}
                    onChange={e => handlePhoneChange(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    maxLength={11}
                    className={`w-full h-11 px-3 rounded-xl border-2 bg-background focus:border-red-500 outline-none ${phoneError ? "border-red-400" : "border-border"}`}
                  />
                  {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
                </div>
                <div>
                  <label className="text-sm font-bold mb-1.5 flex items-center gap-1.5"><MapPin className="h-4 w-4" /> ঠিকানা <span className="text-red-500">*</span></label>
                  <textarea
                    value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="সম্পূর্ণ ঠিকানা (গ্রাম/রোড, পোস্ট, থানা, জেলা)"
                    rows={3}
                    maxLength={500}
                    className="w-full px-3 py-2 rounded-xl border-2 border-border bg-background focus:border-red-500 outline-none resize-none"
                  />
                </div>

                <button
                  onClick={handleSubmitOrder}
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-60 text-white font-extrabold py-3.5 rounded-2xl shadow-xl text-base"
                >
                  <ShoppingBag className="h-5 w-5" />
                  {submitting ? "অর্ডার হচ্ছে..." : isCombo && comboPrice > 0 ? `অর্ডার কনফার্ম করুন (৳${toBn(comboPrice)})` : "অর্ডার কনফার্ম করুন"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sticky CTA */}
      {!success && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t p-3">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <div className="flex-1">
              {isCombo && comboPrice > 0 ? (
                <p className="text-xl font-extrabold text-red-600">৳{toBn(comboPrice)}</p>
              ) : (
                <p className="text-lg font-bold">এখনই অর্ডার করুন</p>
              )}
            </div>
            <button
              onClick={() => {
                document.getElementById("offer-order-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-extrabold px-6 py-3 rounded-2xl shadow-xl"
            >
              <ShoppingBag className="h-5 w-5" />
              অর্ডার করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
