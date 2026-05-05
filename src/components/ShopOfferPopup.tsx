import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Sparkles, X, ShoppingBag, Truck, Tag, Clock } from "lucide-react";

const toBn = (n: number | string) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

export default function ShopOfferPopup() {
  const [closed, setClosed] = useState(false);
  const [now, setNow] = useState(Date.now());

  const { data: offers } = useQuery({
    queryKey: ["active-shop-offers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shop_offers" as any)
        .select("*, products(name, image_url, price, discount_price)")
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

  // session-based dismissal per offer
  useEffect(() => {
    if (!offer) return;
    const dismissed = sessionStorage.getItem(`offer_dismissed_${offer.id}`);
    if (dismissed) setClosed(true);
    else setClosed(false);
  }, [offer?.id]);

  // delay show 1.5s
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!offer || closed) { setShow(false); return; }
    const t = setTimeout(() => setShow(true), 1200);
    return () => clearTimeout(t);
  }, [offer?.id, closed]);

  // countdown ticker
  useEffect(() => {
    if (!offer?.ends_at) return;
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [offer?.ends_at]);

  if (!offer || !show || closed) return null;

  const dismiss = () => {
    sessionStorage.setItem(`offer_dismissed_${offer.id}`, "1");
    setClosed(true);
  };

  const product = (offer as any).products;
  const isFree = offer.discount_type === "free_delivery";
  const isPct = offer.discount_type === "percentage";
  const discountText = isFree
    ? "ফ্রি ডেলিভারি"
    : isPct
      ? `${toBn(offer.discount_value)}% ছাড়`
      : `৳${toBn(offer.discount_value)} ছাড়`;

  // Countdown
  let countdown = "";
  if (offer.ends_at) {
    const diff = new Date(offer.ends_at).getTime() - now;
    if (diff > 0) {
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      countdown = d > 0
        ? `${toBn(d)}দিন ${toBn(h)}ঘ ${toBn(m)}মি`
        : `${toBn(h.toString().padStart(2,"0"))}:${toBn(m.toString().padStart(2,"0"))}:${toBn(s.toString().padStart(2,"0"))}`;
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-md bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-amber-950 dark:via-slate-900 dark:to-orange-950 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "'Hind Siliguri', 'Tiro Bangla', serif" }}
      >
        {/* sparkle bg */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-4 left-6 text-3xl animate-pulse">✨</div>
          <div className="absolute top-12 right-8 text-2xl animate-pulse" style={{ animationDelay: "300ms" }}>⭐</div>
          <div className="absolute bottom-20 left-10 text-xl animate-pulse" style={{ animationDelay: "600ms" }}>💫</div>
          <div className="absolute bottom-6 right-12 text-2xl animate-pulse" style={{ animationDelay: "900ms" }}>🎉</div>
        </div>

        <button
          onClick={dismiss}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center text-slate-700 transition"
          aria-label="বন্ধ"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Top ribbon */}
        <div className="relative bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 px-6 py-3 text-center">
          <div className="inline-flex items-center gap-2 text-white font-bold text-sm tracking-wide">
            <Sparkles className="h-4 w-4 animate-pulse" />
            {offer.badge_text || "বিশেষ অফার"}
            <Sparkles className="h-4 w-4 animate-pulse" />
          </div>
        </div>

        <div className="relative p-6 space-y-4 text-center">
          {(offer.image_url || product?.image_url) && (
            <div className="mx-auto w-32 h-32 rounded-2xl overflow-hidden shadow-lg ring-4 ring-amber-300/40">
              <img src={offer.image_url || product?.image_url} alt={offer.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-amber-50 leading-tight">{offer.title}</h2>
            {offer.description && <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">{offer.description}</p>}
          </div>

          {/* Discount banner */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-600 text-white font-extrabold text-xl px-6 py-3 rounded-full shadow-lg">
            {isFree ? <Truck className="h-5 w-5" /> : <Tag className="h-5 w-5" />}
            {discountText}
          </div>

          {product && (
            <div className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold">{product.name}</span>
            </div>
          )}

          {countdown && (
            <div className="inline-flex items-center gap-2 bg-slate-900/90 dark:bg-amber-100 text-amber-300 dark:text-slate-900 font-mono font-bold px-4 py-2 rounded-xl text-sm">
              <Clock className="h-4 w-4" />
              শেষ হবে: {countdown}
            </div>
          )}

          <Link
            to={offer.product_id ? `/products/${offer.product_id}` : "/products"}
            onClick={dismiss}
            className="block w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3.5 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
          >
            <span className="inline-flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              এখনই অর্ডার করুন
            </span>
          </Link>

          <button onClick={dismiss} className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400">
            পরে দেখব
          </button>
        </div>
      </div>
    </div>
  );
}
