import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ShoppingBag, Truck, Tag, Clock, Package, ArrowLeft, Check } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";

const toBn = (n: number | string) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

export default function ShopOfferPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const { data: offer, isLoading } = useQuery({
    queryKey: ["shop-offer", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("shop_offers" as any).select("*").eq("id", id).maybeSingle();
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
      <div className="relative bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 text-white">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {heroImage && (
            <div className="w-full h-56 md:h-72 rounded-2xl overflow-hidden ring-4 ring-white/40 shadow-2xl">
              <img src={heroImage} alt={offer.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              {offer.badge_text || "বিশেষ অফার"}
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold drop-shadow">{offer.title}</h2>
            {offer.description && <p className="text-white/90 text-sm md:text-base">{offer.description}</p>}

            <div className="inline-flex items-center gap-2 bg-white text-red-700 font-extrabold text-xl px-5 py-2 rounded-full shadow-xl">
              {isFree ? <Truck className="h-5 w-5" /> : isCombo ? <Package className="h-5 w-5" /> : <Tag className="h-5 w-5" />}
              {isFree ? "ফ্রি ডেলিভারি"
                : isCombo ? (comboPrice ? `৳${toBn(comboPrice)} মাত্র` : "কম্বো অফার")
                : isPct ? `${toBn(offer.discount_value)}% ছাড়`
                : `৳${toBn(offer.discount_value)} ছাড়`}
            </div>

            {hasCountdown && (
              <div className="flex items-center gap-2 justify-center pt-2">
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
              <Package className="h-5 w-5 text-amber-600" /> কম্বোতে যা যা থাকছে
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
                  <span className="font-extrabold text-green-600">৳{toBn(comboPrice)}</span>
                </div>
              )}
              {savings > 0 && (
                <div className="flex justify-between text-sm bg-green-50 dark:bg-green-950/30 rounded-lg p-2">
                  <span className="text-green-700 dark:text-green-400 font-bold">আপনার সাশ্রয়:</span>
                  <span className="text-green-700 dark:text-green-400 font-extrabold">৳{toBn(savings)} ({toBn(savingsPct)}%)</span>
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
              <p className="text-amber-600 font-extrabold text-lg">৳{toBn(Number(productsData[0].discount_price ?? productsData[0].price ?? 0))}</p>
            </div>
          </div>
        ) : null}

        <ul className="space-y-1 text-sm text-muted-foreground pt-2">
          <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> অরিজিনাল পণ্যের নিশ্চয়তা</li>
          <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> ক্যাশ অন ডেলিভারি</li>
          {(offer.combo_free_delivery || isFree) && (
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-600" /> ডেলিভারি চার্জ ফ্রি</li>
          )}
        </ul>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t p-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="flex-1">
            {isCombo && comboPrice > 0 ? (
              <p className="text-xl font-extrabold text-amber-600">৳{toBn(comboPrice)}</p>
            ) : (
              <p className="text-lg font-bold">এখনই অর্ডার করুন</p>
            )}
          </div>
          <button
            onClick={isCombo ? handleOrderCombo : handleOrderSingle}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-extrabold px-6 py-3 rounded-2xl shadow-xl"
          >
            <ShoppingBag className="h-5 w-5" />
            অর্ডার করুন
          </button>
        </div>
      </div>
    </div>
  );
}
