import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Sparkles, ShoppingBag, Truck, Tag, Clock, Package } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";

const toBn = (n: number | string) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

export default function ShopOfferBanner() {
  const [now, setNow] = useState(Date.now());
  const [previewProduct, setPreviewProduct] = useState<any>(null);
  const cart = useCart();

  const { data: offers } = useQuery({
    queryKey: ["active-shop-offers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shop_offers" as any)
        .select("*")
        .eq("is_active", true)
        .eq("show_popup", true)
        .order("popup_priority", { ascending: false })
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
    staleTime: 60_000,
  });

  const offer = offers?.find(o => {
    const startOk = !o.starts_at || new Date(o.starts_at).getTime() <= now;
    const endOk = !o.ends_at || new Date(o.ends_at).getTime() > now;
    return startOk && endOk;
  });

  const isCombo = offer?.discount_type === "combo";
  const comboItems: any[] = isCombo && Array.isArray(offer?.combo_products) ? offer.combo_products : [];
  const comboIds = comboItems.map((c: any) => c.product_id).filter(Boolean);

  const { data: offerProduct } = useQuery({
    queryKey: ["offer-product", offer?.product_id],
    enabled: !!offer?.product_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,image_url,price,discount_price")
        .eq("id", offer.product_id)
        .maybeSingle();
      return data;
    },
  });

  const { data: comboProducts } = useQuery({
    queryKey: ["combo-products", comboIds],
    enabled: comboIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id,name,image_url,price,discount_price,weight_grams,unit_type").in("id", comboIds);
      return data ?? [];
    },
  });

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  if (!offer) return null;

  const product = offerProduct;
  const isFree = offer.discount_type === "free_delivery";
  const isPct = offer.discount_type === "percentage";
  const discountText = isFree
    ? "ফ্রি ডেলিভারি"
    : isCombo
      ? (offer.combo_price ? `৳${toBn(offer.combo_price)} মাত্র` : "কম্বো অফার")
      : isPct
        ? `${toBn(offer.discount_value)}% ছাড়`
        : `৳${toBn(offer.discount_value)} ছাড়`;

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

  const comboOriginalTotal = comboItems.reduce((sum: number, c: any) => {
    const p = comboProducts?.find(x => x.id === c.product_id);
    if (!p) return sum;
    const price = Number(p.discount_price ?? p.price ?? 0);
    return sum + price * (c.quantity || 1);
  }, 0);

  const handleOrderCombo = () => {
    if (!comboProducts || comboProducts.length === 0) {
      toast.error("কম্বো প্রডাক্ট লোড হচ্ছে");
      return;
    }
    cart.clear();
    comboItems.forEach((c: any) => {
      const p = comboProducts.find(x => x.id === c.product_id);
      if (!p) return;
      const unitPrice = Number(p.discount_price ?? p.price ?? 0);
      cart.addItem({
        product_id: p.id,
        product_name: p.name,
        image_url: p.image_url,
        variant_label: `কম্বো: ${offer.title}`,
        unit_price: unitPrice,
        quantity: c.quantity || 1,
        unit_type: p.unit_type ?? null,
        weight_grams: Number(p.weight_grams || 0),
      });
    });
    toast.success("কম্বো কার্টে যোগ হয়েছে");
    cart.open();
  };

  const ctaLink = offer.product_id ? `/products/${offer.product_id}` : "/products";
  const heroImage = offer.image_url || product?.image_url || comboProducts?.[0]?.image_url;

  const TimeBox = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center bg-white/15 backdrop-blur rounded-xl px-3 py-2 min-w-[60px] border border-white/30">
      <span className="text-2xl md:text-3xl font-extrabold text-white font-mono leading-none">{toBn(value.toString().padStart(2, "0"))}</span>
      <span className="text-[10px] text-white/80 mt-1 font-semibold">{label}</span>
    </div>
  );

  return (
    <>
    <section
      className="relative w-full px-4 py-20"
      style={{ fontFamily: "'Hind Siliguri', 'Tiro Bangla', serif" }}
    >
      <div className="relative max-w-6xl mx-auto rounded-3xl overflow-hidden bg-gradient-to-br from-red-500 via-red-600 to-red-600 dark:from-red-700 dark:via-red-800 dark:to-red-800 shadow-xl">
        {/* sparkle bg */}
        <div className="absolute inset-0 pointer-events-none opacity-20 select-none">
          <div className="absolute top-4 left-[10%] text-3xl animate-pulse">✨</div>
          <div className="absolute top-12 right-[15%] text-2xl animate-pulse" style={{ animationDelay: "300ms" }}>⭐</div>
          <div className="absolute bottom-6 left-[20%] text-2xl animate-pulse" style={{ animationDelay: "600ms" }}>💫</div>
          <div className="absolute bottom-10 right-[10%] text-3xl animate-pulse" style={{ animationDelay: "900ms" }}>🎉</div>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col md:flex-row items-center gap-5 md:gap-8">
            {heroImage && (
              <div className="shrink-0 w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden shadow-2xl ring-4 ring-white/40">
                <img src={heroImage} alt={offer.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex-1 text-center md:text-left text-white space-y-3">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-bold">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                {offer.badge_text || "বিশেষ অফার"}
              </div>

              <h2 className="text-2xl md:text-4xl font-extrabold leading-tight drop-shadow">{offer.title}</h2>

              {offer.description && (
                <p className="text-white/90 text-sm md:text-base">{offer.description}</p>
              )}

              <div className="inline-flex items-center gap-2 bg-white text-red-700 font-extrabold text-lg md:text-2xl px-5 py-2 rounded-full shadow-xl">
                {isFree ? <Truck className="h-5 w-5" /> : isCombo ? <Package className="h-5 w-5" /> : <Tag className="h-5 w-5" />}
                {discountText}
              </div>

              {/* Combo product cards (enlarged, clickable for original price) */}
              {isCombo && comboProducts && comboProducts.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    {comboItems.map((c: any, idx: number) => {
                      const p = comboProducts.find(x => x.id === c.product_id);
                      if (!p) return null;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPreviewProduct({ ...p, qty: c.quantity || 1 })}
                          className="group flex flex-col items-center gap-1 bg-white/20 hover:bg-white/30 backdrop-blur rounded-2xl p-2 w-[100px] md:w-[120px] transition-all hover:scale-105"
                          title="মূল্য দেখতে ক্লিক করুন"
                        >
                          {p.image_url && (
                            <div className="relative w-full aspect-square rounded-xl overflow-hidden ring-2 ring-white/40 shadow-lg">
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                              <div className="absolute top-1 right-1 bg-white/90 text-red-700 text-[10px] font-extrabold rounded-full px-1.5 py-0.5">×{toBn(c.quantity || 1)}</div>
                            </div>
                          )}
                          <span className="text-[11px] md:text-xs font-bold text-white text-center line-clamp-2 leading-tight">{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    {offer.combo_price && comboOriginalTotal > Number(offer.combo_price) && (
                      <div className="inline-flex items-center gap-1.5 bg-red-500 rounded-full px-3 py-1 text-xs font-bold">
                        <span className="line-through opacity-80">৳{toBn(comboOriginalTotal)}</span>
                        <span>{toBn(Math.round(((comboOriginalTotal - Number(offer.combo_price)) / comboOriginalTotal) * 100))}% সাশ্রয়</span>
                      </div>
                    )}
                    {offer.combo_free_delivery && (
                      <div className="inline-flex items-center gap-1.5 bg-blue-500 rounded-full px-3 py-1 text-xs font-bold">
                        <Truck className="h-3 w-3" /> ফ্রি ডেলিভারি
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Countdown */}
              {hasCountdown && (
                <div className="flex items-center gap-2 justify-center md:justify-start pt-1">
                  <Clock className="h-4 w-4 text-white/90" />
                  <span className="text-xs font-bold text-white/90">শেষ হবে:</span>
                  <div className="flex gap-1.5">
                    {dd > 0 && <TimeBox value={dd} label="দিন" />}
                    <TimeBox value={hh} label="ঘণ্টা" />
                    <TimeBox value={mm} label="মিনিট" />
                    <TimeBox value={ss} label="সেকেন্ড" />
                  </div>
                </div>
              )}

              <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                <Link
                  to={offer.slug ? `/o/${offer.slug}` : `/offer/${offer.id}`}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-extrabold px-7 py-3 rounded-2xl shadow-2xl hover:scale-105 transition-all"
                >
                  <ShoppingBag className="h-5 w-5" />
                  অফার দেখুন ও অর্ডার করুন
                </Link>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    const url = `${window.location.origin}${offer.slug ? `/o/${offer.slug}` : `/offer/${offer.id}`}`;
                    try {
                      if (navigator.share) {
                        await navigator.share({ title: offer.title, text: offer.description || offer.title, url });
                      } else {
                        await navigator.clipboard.writeText(url);
                        toast.success("লিংক কপি হয়েছে");
                      }
                    } catch {}
                  }}
                  className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur text-white font-bold px-5 py-3 rounded-2xl border border-white/30 transition-all"
                >
                  শেয়ার
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {previewProduct && (
      <div
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        onClick={() => setPreviewProduct(null)}
      >
        <div
          className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          style={{ fontFamily: "'Hind Siliguri', 'Tiro Bangla', serif" }}
        >
          {previewProduct.image_url && (
            <div className="aspect-square bg-gray-100">
              <img src={previewProduct.image_url} alt={previewProduct.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-4 space-y-3">
            <h3 className="font-extrabold text-lg text-gray-900">{previewProduct.name}</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-gray-500">নিয়মিত মূল্য</p>
                <p className="text-2xl font-extrabold text-red-600">
                  ৳{toBn(Number(previewProduct.discount_price ?? previewProduct.price ?? 0))}
                  {previewProduct.discount_price && previewProduct.discount_price < previewProduct.price && (
                    <span className="text-sm text-gray-400 line-through ml-2 font-semibold">৳{toBn(Number(previewProduct.price))}</span>
                  )}
                </p>
              </div>
              <div className="bg-red-100 text-red-700 font-bold px-3 py-1.5 rounded-xl text-sm">
                কম্বোতে × {toBn(previewProduct.qty)}
              </div>
            </div>
            <button
              onClick={() => setPreviewProduct(null)}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-3 rounded-2xl"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
