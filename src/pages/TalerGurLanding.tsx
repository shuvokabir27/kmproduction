import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Phone, Clock, ClipboardCheck, Truck, RotateCcw, ShieldCheck, Star, ChevronDown, ShoppingCart, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const TalerGurLanding = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [offerExpired, setOfferExpired] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderForm, setOrderForm] = useState({ name: "", phone: "", address: "", payment_method: "cod" });
  const [phoneError, setPhoneError] = useState("");
  // Simple kg quantity selector
  const [orderKg, setOrderKg] = useState(1);

  const weightPackages = [
    { weight: "৫০০ গ্রাম", kg: 0.5, label: "ট্রায়াল প্যাক", discount: 0 },
    { weight: "১ কেজি", kg: 1, label: "ফ্যামিলি প্যাক", discount: 0 },
    { weight: "১.৫ কেজি", kg: 1.5, label: "সুপার সেভার", discount: 8 },
    { weight: "২ কেজি", kg: 2, label: "মেগা প্যাক", discount: 12 },
  ];

  // Discount tiers based on total kg
  const getDiscount = (kg: number) => {
    if (kg >= 2) return 12;
    if (kg > 1) return 8;
    return 0;
  };

  // Fetch offer end date from site_settings
  const { data: offerSettings } = useQuery({
    queryKey: ["offer-end-date"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("offer_end_date").limit(1).single();
      return data;
    },
  });

  useEffect(() => {
    if (!offerSettings?.offer_end_date) return;
    const targetDate = new Date(offerSettings.offer_end_date);
    const tick = () => {
      const now = new Date().getTime();
      const diff = targetDate.getTime() - now;
      if (diff <= 0) {
        setOfferExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setOfferExpired(false);
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [offerSettings?.offer_end_date]);

  const { data: sections, isLoading } = useQuery({
    queryKey: ["landing-sections"],
    queryFn: async () => {
      const { data } = await supabase
        .from("landing_page_sections")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return data ?? [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["landing-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("category", "taler_gur")
        .order("sort_order", { ascending: true });
      return data ?? [];
    },
  });

  const { data: siteSettings } = useQuery({
    queryKey: ["landing-site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("free_delivery, delivery_charge, delivery_charge_per_extra_kg").limit(1).single();
      return data;
    },
  });

  const freeDelivery = siteSettings?.free_delivery ?? true;
  const baseDeliveryCharge = siteSettings?.delivery_charge ?? 130;
  const extraPerKg = siteSettings?.delivery_charge_per_extra_kg ?? 50;

  // Calculate delivery charge based on total weight
  const calcDeliveryCharge = (totalKg: number) => {
    if (freeDelivery) return 0;
    if (totalKg <= 1) return baseDeliveryCharge;
    return Math.round(baseDeliveryCharge + extraPerKg * (totalKg - 1));
  };

  // Order price calculation based on kg
  const basePrice = products?.[0]?.discount_price || products?.[0]?.price || 0;
  const orderDiscount = getDiscount(orderKg);
  const beforeDiscount = Math.round(basePrice * orderKg);
  const orderSubTotal = orderDiscount > 0 ? Math.round(beforeDiscount * (1 - orderDiscount / 100)) : beforeDiscount;
  const deliveryCharge = calcDeliveryCharge(orderKg);
  const orderGrandTotal = orderSubTotal + deliveryCharge;

  const hero = sections?.find((s: any) => s.section_key === "hero");
  const benefits = sections?.filter((s: any) => s.section_key.startsWith("benefit_")) ?? [];
  const qualities = sections?.filter((s: any) => s.section_key.startsWith("quality_")) ?? [];
  const cta = sections?.find((s: any) => s.section_key === "cta");

  const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    setOrderForm(f => ({ ...f, phone: digits }));
    if (digits.length > 0 && digits.length !== 11) {
      setPhoneError("মোবাইল নম্বর অবশ্যই ১১ ডিজিটের হতে হবে");
    } else {
      setPhoneError("");
    }
  };

  const handleOrderSubmit = async () => {
    if (!orderForm.name.trim()) { toast.error("আপনার নাম দিন"); return; }
    if (orderForm.phone.length !== 11) { setPhoneError("মোবাইল নম্বর অবশ্যই ১১ ডিজিটের হতে হবে"); return; }
    if (!orderForm.address.trim()) { toast.error("আপনার ঠিকানা দিন"); return; }
    if (orderKg <= 0) { toast.error("পরিমাণ নির্বাচন করুন"); return; }
    setSubmitting(true);
    try {
      const productName = (products?.[0]?.name || "প্রডাক্ট") + ` (${toBn(orderKg)} কেজি)`;
      const noteParts: string[] = [];
      if (orderDiscount > 0) noteParts.push(`${orderDiscount}% ডিসকাউন্ট`);
      if (!freeDelivery && deliveryCharge > 0) noteParts.push(`ডেলিভারি চার্জ: ৳${deliveryCharge} (${toBn(orderKg)} কেজি)`);
      const { error } = await supabase.from("orders").insert({
        customer_name: orderForm.name.trim(),
        customer_phone: orderForm.phone,
        customer_address: orderForm.address.trim(),
        product_name: productName,
        quantity: orderKg,
        unit_price: orderSubTotal,
        total_amount: orderGrandTotal,
        notes: noteParts.length > 0 ? noteParts.join(" | ") : null,
        payment_method: orderForm.payment_method,
      });
      if (error) throw error;
      setOrderSuccess(true);
      setOrderForm({ name: "", phone: "", address: "", payment_method: "cod" });
      setOrderKg(1);
    } catch {
      toast.error("অর্ডার করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setSubmitting(false);
    }
  };

  const closeOrderDialog = async () => {
    if (!orderSuccess && orderForm.phone.length === 11) {
      try {
        const productName = products?.[0]?.name || "প্রডাক্ট";
        await supabase.from("orders").insert({
          customer_name: orderForm.name.trim() || "অজানা",
          customer_phone: orderForm.phone,
          customer_address: orderForm.address.trim() || null,
          product_name: productName,
          quantity: 1,
          unit_price: 0,
          total_amount: 0,
          status: "abandoned" as any,
        });
      } catch (_) {}
    }
    setOrderOpen(false);
    setOrderForm({ name: "", phone: "", address: "", payment_method: "cod" });
  };

  const openOrderDialog = () => {
    setOrderSuccess(false);
    setPhoneError("");
    setOrderOpen(true);
  };

  const SectionOrderButton = () => (
    <div className="text-center mt-8">
      <Button onClick={openOrderDialog} size="lg" className="gap-2 bg-[#1a7a2e] hover:bg-[#15661f] text-white px-10 py-6 text-lg rounded-full shadow-lg font-bold">
        <ShoppingCart className="h-5 w-5" /> অর্ডার করতে চাই
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f5f0] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#1a7a2e] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f5f0] font-['Hind_Siliguri'] text-[#333]">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-50 bg-[#1a7a2e] text-white text-center py-2 px-4 text-sm font-medium">
        🔥 আজই অর্ডার করুন এই অফার আর পাবেন না |
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm py-3 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-[#1a7a2e] font-semibold text-sm md:text-base">কে এম প্রডাক্ট</span>
          <Button onClick={openOrderDialog} size="sm" className="bg-[#c0392b] hover:bg-[#a93226] text-white rounded-full px-5 text-sm font-bold shadow">
            অর্ডার করুন
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      {hero && (
        <section className="bg-[#1a7a2e] text-white py-12 md:py-20 text-center relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-3xl md:text-5xl font-extrabold mb-2 drop-shadow-lg">
              {hero.title || "কে এম প্রডাক্ট"}
            </h1>
            <p className="text-lg md:text-2xl font-medium text-amber-200 mb-4">
              {hero.content || "সেরা মানের তালের গুড়"}
            </p>

            {hero.image_url && (
              <img src={hero.image_url} alt={hero.title || ""} className="mt-6 mx-auto max-h-72 rounded-2xl object-cover shadow-2xl border-4 border-white/20" />
            )}

            {/* Product Images Gallery */}
            {products && products.length > 0 && products.some((p: any) => p.image_url) && (
              <div className="mt-8">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">PREMIUM</span>
                  <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">১০০% অর্গানিক</span>
                </div>
                <div className="flex flex-col items-center gap-4 max-w-lg mx-auto">
                  {products.filter((p: any) => p.image_url).map((p: any) => (
                    <div key={p.id} className="rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl w-full">
                      <img src={p.image_url} alt={p.name} className="w-full h-56 sm:h-72 md:h-80 object-cover" />
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-white/80 text-sm max-w-xl mx-auto leading-relaxed">
                  প্রতিদিনের পুষ্টি ও শক্তির জন্য সেরা নির্বাচন। ১০০% ফ্রেশ, স্বাস্থ্যকর এবং পরিবারের জন্য নিরাপদ।
                </p>
              </div>
            )}

            {/* Hero CTA */}
            <Button onClick={openOrderDialog} size="lg" className="mt-8 gap-2 bg-amber-500 hover:bg-amber-600 text-white px-10 py-6 text-lg rounded-full shadow-xl font-bold">
              <ShoppingCart className="h-5 w-5" /> অর্ডার করতে চাই
            </Button>
          </div>
        </section>
      )}

      {/* Countdown + Offer Section */}
      {products && products.length > 0 && (
        <section className="py-12 md:py-16 bg-[#fdf6ee]">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-[#c0392b] flex items-center justify-center gap-2 mb-2">
                <Clock className="h-6 w-6" /> এখনই অর্ডার করুন — অফার শেষ হচ্ছে!
              </h2>
              {freeDelivery && <p className="text-[#888] text-sm">ডেলিভারির সময় টেস্ট করে পছন্দ হলে পে করুন। কোনো ঝুঁকি নেই!</p>}
            </div>

            {/* Countdown Timer */}
            <div className="flex justify-center gap-3 mb-10">
              {[
                { val: timeLeft.days, label: "দিন" },
                { val: timeLeft.hours, label: "ঘণ্টা" },
                { val: timeLeft.minutes, label: "মিনিট" },
                { val: timeLeft.seconds, label: "সেকেন্ড" },
              ].map((t, i) => (
                <div key={i} className="bg-white border border-[#e0d8cc] rounded-xl w-16 h-16 flex flex-col items-center justify-center shadow-sm">
                  <span className="text-xl font-bold text-[#333]">{toBn(t.val).padStart(2, "০")}</span>
                  <span className="text-[10px] text-[#888]">{t.label}</span>
                </div>
              ))}
            </div>

            {/* Weight Package Cards */}
            <div className="grid grid-cols-2 gap-3 mb-10">
              {weightPackages.map((pkg) => {
                const bPrice = products?.[0]?.discount_price || products?.[0]?.price || 0;
                const originalPrice = products?.[0]?.price || 0;
                const bDiscount = Math.round(bPrice * pkg.kg);
                const pkgPrice = pkg.discount > 0 ? Math.round(bDiscount * (1 - pkg.discount / 100)) : bDiscount;
                const pkgOriginal = Math.round(originalPrice * pkg.kg);
                const isSelected = orderKg === pkg.kg;
                return (
                  <button
                    key={pkg.kg}
                    onClick={() => {
                      setOrderKg(pkg.kg);
                      openOrderDialog();
                    }}
                    className={`relative rounded-2xl p-4 text-center transition-all border-2 ${
                      isSelected
                        ? "border-[#1a7a2e] bg-[#1a7a2e]/5 shadow-lg scale-[1.02]"
                        : "border-[#e0d8cc] bg-white hover:border-[#1a7a2e]/50 hover:shadow-md"
                    }`}
                  >
                    {pkg.discount > 0 && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#c0392b] text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                        🔥 {toBn(pkg.discount)}% ছাড়
                      </span>
                    )}
                    <p className="text-2xl font-extrabold text-[#1a7a2e] mb-1">{pkg.weight}</p>
                    <p className="text-xs text-[#888] mb-2">{pkg.label}</p>
                    {(pkgOriginal > pkgPrice || pkg.discount > 0) ? (
                      <div>
                        <span className="text-xs line-through text-[#999]">৳{toBn(pkg.discount > 0 ? bDiscount : pkgOriginal)}</span>
                        <p className="text-lg font-bold text-[#c0392b]">৳{toBn(pkgPrice)}</p>
                      </div>
                    ) : (
                      <p className="text-lg font-bold text-[#1a7a2e]">৳{toBn(pkgPrice)}</p>
                    )}
                    <p className="mt-2 text-[10px] font-semibold text-[#1a7a2e]">
                      {isSelected ? "✅ সিলেক্টেড" : "অর্ডার করুন →"}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Product Price Cards */}
            <div className="space-y-6">
              {products.map((p: any) => {
                const hasDiscount = p.discount_price && p.discount_price < p.price;
                const discountPercent = hasDiscount ? Math.round(((p.price - p.discount_price) / p.price) * 100) : 0;
                return (
                  <div key={p.id} className="bg-white border-2 border-[#1a7a2e]/30 rounded-3xl overflow-hidden shadow-lg">
                    {p.image_url && (
                      <img src={p.image_url} alt={p.name} className="w-full h-48 md:h-64 object-cover" />
                    )}
                    <div className="p-6 md:p-8 text-center">
                      <h3 className="text-xl md:text-2xl font-bold text-[#333] mb-4">{p.name}</h3>
                      {p.description && <p className="text-[#888] text-sm mb-6 max-w-md mx-auto">{p.description}</p>}

                      <div className="bg-[#fdf6ee] border border-[#e8e0d4] rounded-2xl p-6 mb-6 max-w-sm mx-auto">
                        {hasDiscount ? (
                          <>
                            <p className="text-[#888] text-sm mb-1">
                              রেগুলার মূল্য <span className="line-through text-[#c0392b] font-bold text-lg">৳{toBn(p.price)}</span> টাকা
                            </p>
                            <p className="text-xl md:text-2xl font-bold text-[#333] mt-2">
                              সীমিত সময়ের অফার মূল্য
                            </p>
                            <div className="mt-2 flex items-center justify-center gap-2">
                              <span className="text-4xl md:text-5xl font-extrabold text-[#1a7a2e] border-2 border-[#1a7a2e] rounded-full px-5 py-1">
                                ৳{toBn(p.discount_price)}
                              </span>
                              <span className="text-xl font-bold text-[#333]">টাকা মাত্র</span>
                            </div>
                            <span className="inline-block mt-3 text-xs bg-[#c0392b]/10 text-[#c0392b] px-3 py-1 rounded-full font-semibold">
                              🔥 {toBn(discountPercent)}% ছাড়
                            </span>
                          </>
                        ) : (
                          <>
                            <p className="text-[#888] text-sm mb-1">মূল্য</p>
                            <span className="text-4xl md:text-5xl font-extrabold text-[#1a7a2e]">৳{toBn(p.price)}</span>
                            <span className="text-xl font-bold text-[#333] ml-2">টাকা</span>
                          </>
                        )}
                      </div>

                      {p.contact_info && (
                        <a href={`tel:${p.contact_info}`}>
                          <Button size="lg" className="gap-2 bg-[#1a7a2e] hover:bg-[#15661f] text-white px-10 py-6 text-lg rounded-full shadow-lg font-bold">
                            <ClipboardCheck className="h-5 w-5" /> অর্ডার করতে চাই 🔥
                          </Button>
                        </a>
                      )}
                      <p className="mt-4 text-xs text-[#c0392b] font-medium">🔴 🔴 অফার আর কিছুক্ষণ!</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Trust Badges */}
      <section className="bg-white py-6 border-b">
        <div className={`max-w-4xl mx-auto px-4 grid ${freeDelivery ? "grid-cols-3" : "grid-cols-2"} gap-4 text-center`}>
          {freeDelivery && (
            <div className="flex flex-col items-center gap-1">
              <Truck className="h-6 w-6 text-[#1a7a2e]" />
              <p className="font-bold text-sm text-[#333]">ফ্রি ডেলিভারি</p>
              <p className="text-xs text-[#888]">সারাদেশে বিনামূল্যে</p>
            </div>
          )}
          <div className="flex flex-col items-center gap-1">
            <RotateCcw className="h-6 w-6 text-[#1a7a2e]" />
            <p className="font-bold text-sm text-[#333]">ইজি রিটার্ন</p>
            <p className="text-xs text-[#888]">পছন্দ না হলে ফেরত</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ShieldCheck className="h-6 w-6 text-[#1a7a2e]" />
            <p className="font-bold text-sm text-[#333]">১০০% গ্যারান্টি</p>
            <p className="text-xs text-[#888]">মান নিশ্চিত</p>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-[#f0ebe3] py-4 border-b">
        <div className="max-w-4xl mx-auto px-4 flex justify-center gap-8 text-center">
          <div>
            <p className="text-xl font-bold text-[#1a7a2e]">৪.৯/৫</p>
            <p className="text-xs text-[#888]">কাস্টমার রিভিউ</p>
          </div>
          {freeDelivery && (
            <div>
              <p className="text-xl font-bold text-[#1a7a2e]">১০০০+</p>
              <p className="text-xs text-[#888]">সফল ডেলিভারি</p>
            </div>
          )}
        </div>
        <SectionOrderButton />
      </section>

      {/* Qualities / Feature Grid */}
      {qualities.length > 0 && (
        <section className="py-12 md:py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {qualities.map((q: any) => (
                <div key={q.id} className="bg-[#f8f5f0] border border-[#e8e0d4] rounded-xl p-5 text-center hover:shadow-md transition-all">
                  <span className="text-3xl block mb-2">{q.icon}</span>
                  <h3 className="text-sm font-bold text-[#333] mb-1">{q.title}</h3>
                  <p className="text-xs text-[#888] leading-relaxed">{q.content}</p>
                </div>
              ))}
            </div>
            <SectionOrderButton />
          </div>
        </section>
      )}

      {/* Benefits Section */}
      {benefits.length > 0 && (
        <section className="py-12 md:py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-[#333] text-center mb-3">
              কেন আমাদের গুড় নেবেন?
            </h2>
            <p className="text-[#888] text-center mb-10 max-w-xl mx-auto text-sm">
              প্রকৃতির এই অমূল্য উপহারের রয়েছে অসংখ্য স্বাস্থ্য উপকারিতা
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {benefits.map((b: any, idx: number) => (
                <div key={b.id} className="bg-[#f8f5f0] border border-[#e8e0d4] rounded-2xl p-6 hover:shadow-md transition-all group">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#1a7a2e] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {toBn(idx + 1)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#333] mb-2">{b.title}</h3>
                      <p className="text-[#888] text-sm leading-relaxed">{b.content}</p>
                    </div>
                  </div>
                  {b.image_url && (
                    <img src={b.image_url} alt={b.title || ""} className="mt-4 w-full h-36 object-cover rounded-xl" />
                  )}
                </div>
              ))}
            </div>

            {/* CTA after benefits */}
            <SectionOrderButton />
          </div>
        </section>
      )}

      {/* Why We Are Different */}
      {qualities.length > 0 && (
        <section className="py-12 md:py-16 bg-[#fdf6ee]">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="bg-[#1a7a2e] text-white text-xs font-bold px-3 py-1 rounded-full">TOP RATED</span>
              <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">১০০% ফ্রেশ</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#333] text-center mb-3">
              কেন আমরা অন্য সবার থেকে আলাদা?
            </h2>
            <div className="max-w-2xl mx-auto mt-8 space-y-4">
              {[
                "আমাদের গুড় সম্পূর্ণভাবে কেমিক্যালমুক্ত এবং প্রাকৃতিক।",
                "ঘরোয়া রেসিপিতে হাতে তৈরি ফ্রেশ তালের গুড়।",
                "ঐতিহ্যবাহী পদ্ধতিতে তৈরি তাই পরিবারে সবাই পছন্দ করবে।",
                "স্বাদ, গুণ এবং মান নিশ্চিত করে আমরা গুড় সংগ্রহ করি।",
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-[#e8e0d4]">
                  <span className="text-[#1a7a2e] font-bold text-lg mt-0.5">✓</span>
                  <p className="text-sm text-[#555]">{text}</p>
                </div>
              ))}
            </div>

            {/* Product images */}
            {products && products.some((p: any) => p.image_url) && (
              <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto mt-8">
                {products.filter((p: any) => p.image_url).slice(0, 3).map((p: any) => (
                  <div key={p.id} className="rounded-xl overflow-hidden shadow-md border border-[#e8e0d4]">
                    <img src={p.image_url} alt={p.name} className="w-full h-32 md:h-44 object-cover" />
                </div>
                ))}
              </div>
            )}
            <SectionOrderButton />
          </div>
        </section>
      )}

      {/* FAQ Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[#333] text-center mb-8">
            সাধারণ কিছু জিজ্ঞাসা
          </h2>
          <div className="space-y-3">
            {[
              { q: "তালের গুড় কী এবং কেন এটি এত জনপ্রিয়?", a: "তালের গুড় বাংলাদেশের ঐতিহ্যবাহী মিষ্টি খাবার। তালের রস থেকে প্রাকৃতিক উপায়ে তৈরি এই গুড় প্রজন্মের পর প্রজন্ম ধরে বাঙালি খাবারের অবিচ্ছেদ্য অংশ।" },
              { q: "তালের গুড় কি ডায়াবেটিস রোগীরা খেতে পারবেন?", a: "পরিমিত পরিমাণে গ্রহণ করলে এটি চিনির তুলনায় ভালো বিকল্প। তবে ডায়াবেটিস রোগীদের চিকিৎসকের পরামর্শ নেওয়া উচিত।" },
              { q: "এই গুড় কি ১০০% অরিজিনাল?", a: "হ্যাঁ, আমাদের তালের গুড় ১০০% খাঁটি এবং প্রাকৃতিক। কোনো কেমিক্যাল বা প্রিজার্ভেটিভ মেশানো হয় না।" },
              { q: "তালের গুড় কীভাবে সংরক্ষণ করবেন?", a: "শুষ্ক ও ঠান্ডা স্থানে এয়ারটাইট পাত্রে রাখুন। ফ্রিজে রাখলে দীর্ঘদিন ভালো থাকে।" },
              { q: "তালের গুড় কি প্রতিদিন খাওয়া যায়?", a: "হ্যাঁ, পরিমিত পরিমাণে প্রতিদিন খাওয়া যায়। এটি শরীরে শক্তি যোগায় এবং পুষ্টি সরবরাহ করে।" },
            ].map((faq, i) => (
              <div key={i} className="border border-[#e8e0d4] rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left bg-[#f8f5f0] hover:bg-[#f0ebe3] transition"
                >
                  <span className="font-semibold text-sm text-[#333] flex items-center gap-2">
                    <span className="text-[#1a7a2e] font-bold">{toBn(i + 1)}.</span> {faq.q}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-[#888] transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="p-4 bg-white text-sm text-[#666] leading-relaxed border-t border-[#e8e0d4]">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
          <SectionOrderButton />
        </div>
      </section>

      {/* Package / Final CTA */}
      {products && products.length > 0 && (
        <section className="py-12 md:py-16 bg-[#1a7a2e] text-white">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">সেরা কোয়ালিটির তালের গুড়</h2>
            <p className="text-white/70 text-sm mb-8">এখনই অর্ডার করতে নিচের বাটনে ক্লিক করুন</p>

            {products.map((p: any) => {
              const hasDiscount = p.discount_price && p.discount_price < p.price;
              return (
                <div key={p.id} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-6">
                  <h3 className="text-lg font-bold mb-4">{p.name}</h3>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <span className="text-3xl font-extrabold">৳{toBn(hasDiscount ? p.discount_price : p.price)}</span>
                    {hasDiscount && (
                      <span className="line-through text-white/50 text-lg">৳{toBn(p.price)}</span>
                    )}
                  </div>

                  <div className="flex justify-center gap-4 mb-6 text-xs">
                    <span className="bg-white/20 px-3 py-1 rounded-full">✅ ঘরোয়া</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full">✅ মানসম্মত</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full">✅ ফ্রেশ</span>
                  </div>

                  <p className="text-amber-300 text-xs font-medium mb-4">
                    ⚠️ অফার সীমিত সময়ের জন্য! আজ অর্ডার না করলে কাল হয়তো শেষ 😢
                  </p>

                  {p.contact_info && (
                    <a href={`tel:${p.contact_info}`}>
                      <Button size="lg" className="gap-2 bg-amber-500 hover:bg-amber-600 text-white px-10 py-6 text-lg rounded-full shadow-xl font-bold">
                        অর্ডার করুন — ৳{toBn(hasDiscount ? p.discount_price : p.price)}
                      </Button>
                    </a>
                  )}
                </div>
              );
            })}

            {/* Trust badges repeated */}
            <div className={`grid ${freeDelivery ? "grid-cols-3" : "grid-cols-2"} gap-4 mt-8 text-center`}>
              {freeDelivery && (
                <div>
                  <Truck className="h-5 w-5 mx-auto mb-1 text-amber-300" />
                  <p className="text-xs font-semibold">ফ্রি ডেলিভারি</p>
                  <p className="text-[10px] text-white/60">সারাদেশে বিনামূল্যে</p>
                </div>
              )}
              <div>
                <RotateCcw className="h-5 w-5 mx-auto mb-1 text-amber-300" />
                <p className="text-xs font-semibold">ইজি রিটার্ন</p>
                <p className="text-[10px] text-white/60">পছন্দ না হলে ফেরত</p>
              </div>
              <div>
                <ShieldCheck className="h-5 w-5 mx-auto mb-1 text-amber-300" />
                <p className="text-xs font-semibold">১০০% গ্যারান্টি</p>
                <p className="text-[10px] text-white/60">মান নিশ্চিত</p>
              </div>
            </div>

            {freeDelivery && (
              <p className="mt-6 text-white/70 text-xs max-w-md mx-auto leading-relaxed">
                প্রোডাক্ট হাতে পেয়ে ভালো লাগলে রেখে দিন, আর ভালো না লাগলে কেবল ডেলিভারি চার্জ দিয়ে রিটার্ন করে দিন — একদম নিশ্চিন্তে অর্ডার করুন! ✅
              </p>
            )}
          </div>
        </section>
      )}

      {/* Testimonials */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[#333] text-center mb-8">
            সম্মানিত কাস্টমারদের ফিডব্যাক
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: "মাইনুল হাসান", text: "আপনাদের তালের গুড়ের মান আসলেই প্রিমিয়াম। ধন্যবাদ আপনাদের। ❤️" },
              { name: "কামরুল হাসান", text: "গুড়টা তাজা আছে, স্বাদও অসাধারণ! 🔥" },
              { name: "শানজাতুল হক", text: "গুড় খুবই ভালো মানের ★★★ ধন্যবাদ" },
              { name: "তাজুল ইসলাম", text: "কোয়ালিটি অনেক ভালো। পরিবারের সবাই খুব পছন্দ করেছে।" },
            ].map((t, i) => (
              <div key={i} className="bg-[#f8f5f0] border border-[#e8e0d4] rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#1a7a2e] text-white flex items-center justify-center font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#333]">{t.name}</p>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className="h-3 w-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-[#666] leading-relaxed">{t.text}</p>
              </div>
            ))}
          </div>
          <SectionOrderButton />
        </div>
      </section>

      {/* CTA Section */}
      {cta && (
        <section className="py-12 md:py-16 bg-[#fdf6ee]">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <span className="text-5xl block mb-4">{cta.icon}</span>
            <h2 className="text-2xl md:text-3xl font-bold text-[#333] mb-3">{cta.title}</h2>
            <p className="text-[#888] text-base mb-6">{cta.content}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={openOrderDialog} size="lg" className="gap-2 bg-[#1a7a2e] hover:bg-[#15661f] text-white px-8 py-6 text-lg rounded-full font-bold">
                <ShoppingCart className="h-5 w-5" /> অর্ডার করুন
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Sticky Bottom CTA */}
      {products && products.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a7a2e] shadow-[0_-4px_20px_rgba(0,0,0,0.2)] py-3 px-4">
          <Button onClick={openOrderDialog} className="w-full max-w-lg mx-auto flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white h-12 text-base rounded-full font-bold shadow-lg">
            <ShoppingCart className="h-5 w-5 shrink-0" /> অর্ডার করুন — ৳{toBn(products[0]?.discount_price || products[0]?.price || 0)}
          </Button>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#e8e0d4] py-6 pb-20 text-center text-[#888] text-sm bg-white">
        © কে এম প্রডাক্ট
      </footer>

      {/* Order Popup */}
      {orderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeOrderDialog}>
          <div
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto animate-in zoom-in-95 fade-in duration-200"
            onClick={e => e.stopPropagation()}
          >
            {orderSuccess ? (
              <div className="p-6 text-center">
                <div className="relative w-16 h-16 mx-auto mb-3">
                  <div className="absolute inset-0 bg-[#22a83a]/20 rounded-full animate-ping" />
                  <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#22a83a] to-[#1b8a30] flex items-center justify-center shadow-lg">
                    <CheckCircle className="h-8 w-8 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">অর্ডার সফল হয়েছে! 🎉</h3>
                <p className="text-gray-500 text-xs mb-4">আমরা শীঘ্রই যোগাযোগ করবো। ধন্যবাদ!</p>
                <Button onClick={() => setOrderOpen(false)} className="w-full bg-gradient-to-r from-[#1a7a2e] to-[#22a83a] text-white font-bold py-3 rounded-2xl text-sm">
                  ঠিক আছে
                </Button>
              </div>
            ) : (
              <>
                {/* Header - compact */}
                <div className="relative bg-gradient-to-r from-[#1a7a2e] via-[#1f9535] to-[#22a83a] px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-white" />
                      <h3 className="text-base font-bold text-white">অর্ডার করুন</h3>
                    </div>
                    <button onClick={closeOrderDialog} className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/25">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="px-4 py-3 space-y-3">
                  {/* Kg Selector - inline compact */}
                  <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-600">পরিমাণ</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setOrderKg(prev => Math.max(0.5, +(prev - 0.5).toFixed(1)))}
                          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-base font-bold text-gray-500 hover:border-red-300 hover:text-red-500 bg-white"
                        >−</button>
                        <div className="text-center min-w-[50px]">
                          <span className="text-xl font-extrabold text-gray-900">{toBn(orderKg)}</span>
                          <span className="text-xs text-gray-500 ml-1">কেজি</span>
                        </div>
                        <button
                          onClick={() => setOrderKg(prev => Math.min(10, +(prev + 0.5).toFixed(1)))}
                          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-base font-bold text-gray-500 hover:border-[#22a83a] hover:text-[#22a83a] bg-white"
                        >+</button>
                      </div>
                    </div>
                    {/* Quick weight chips */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {weightPackages.map(pkg => (
                        <button
                          key={pkg.kg}
                          onClick={() => setOrderKg(pkg.kg)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all ${
                            orderKg === pkg.kg
                              ? "bg-[#1a7a2e] text-white"
                              : "bg-[#1a7a2e]/10 text-[#1a7a2e]"
                          }`}
                        >
                          {pkg.weight}
                        </button>
                      ))}
                    </div>
                    {orderDiscount > 0 && (
                      <p className="text-center mt-1.5">
                        <span className="text-[10px] bg-[#c0392b] text-white font-bold px-2 py-0.5 rounded-full">
                          🔥 {toBn(orderDiscount)}% ডিসকাউন্ট!
                        </span>
                      </p>
                    )}
                    {/* Price summary inline */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#bbf7d0]">
                      <div className="text-xs text-gray-500">
                        {orderDiscount > 0 && <span className="line-through mr-1.5">৳{toBn(beforeDiscount)}</span>}
                        <span>৳{toBn(orderSubTotal)}</span>
                        {!freeDelivery && deliveryCharge > 0 && <span className="text-gray-400"> + ৳{toBn(deliveryCharge)} ডেলি.</span>}
                        {freeDelivery && <span className="text-[#1a7a2e]"> + 🚚 ফ্রি</span>}
                      </div>
                      <span className="text-base font-bold text-[#1a7a2e]">৳{toBn(orderGrandTotal)}</span>
                    </div>
                  </div>

                  {/* Form fields - compact */}
                  <div className="grid grid-cols-1 gap-2.5">
                    <div>
                      <Label className="text-gray-700 font-semibold text-xs mb-1 block">নাম <span className="text-red-500">*</span></Label>
                      <Input
                        value={orderForm.name}
                        onChange={e => setOrderForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="আপনার পুরো নাম"
                        className="h-10 rounded-xl border border-gray-200 bg-gray-50/50 pl-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#22a83a] focus:ring-1 focus:ring-[#22a83a]/20"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 font-semibold text-xs mb-1 block">মোবাইল <span className="text-red-500">*</span></Label>
                      <Input
                        value={orderForm.phone}
                        onChange={e => handlePhoneChange(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        maxLength={11}
                        className={`h-10 rounded-xl border bg-gray-50/50 pl-3 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-1 ${
                          phoneError ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-[#22a83a] focus:ring-[#22a83a]/20'
                        }`}
                      />
                      {phoneError && <p className="text-red-500 text-[10px] mt-0.5">{phoneError}</p>}
                    </div>
                    <div>
                      <Label className="text-gray-700 font-semibold text-xs mb-1 block">ঠিকানা <span className="text-red-500">*</span></Label>
                      <Textarea
                        value={orderForm.address}
                        onChange={e => setOrderForm(f => ({ ...f, address: e.target.value }))}
                        placeholder="সম্পূর্ণ ঠিকানা"
                        rows={2}
                        className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#22a83a] focus:ring-1 focus:ring-[#22a83a]/20 resize-none"
                      />
                    </div>
                  </div>

                  {/* Payment - inline */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: "cod", label: "🚚 ক্যাশ অন ডেলিভারি" },
                      { val: "bkash", label: "📱 বিকাশ/নগদ" },
                    ].map(pm => (
                      <button
                        key={pm.val}
                        onClick={() => setOrderForm(f => ({ ...f, payment_method: pm.val }))}
                        className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all ${
                          orderForm.payment_method === pm.val
                            ? "border-[#22a83a] bg-green-50 text-[#1a7a2e]"
                            : "border-gray-200 text-gray-600"
                        }`}
                      >
                        {pm.label}
                      </button>
                    ))}
                  </div>

                  <Button
                    onClick={handleOrderSubmit}
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-[#1a7a2e] to-[#22a83a] hover:from-[#166d27] hover:to-[#1b8a30] text-white font-bold text-sm h-12 rounded-2xl gap-2 shadow-lg shadow-green-500/25 disabled:opacity-60"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {submitting ? "অর্ডার হচ্ছে..." : `অর্ডার কনফার্ম — ৳${toBn(orderGrandTotal)}`}
                  </Button>
                  <p className="text-center text-gray-400 text-[10px] pb-1">🔒 তথ্য সম্পূর্ণ নিরাপদ</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TalerGurLanding;
