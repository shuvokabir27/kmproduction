import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ShoppingCart, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const ProductCard = ({ p }: { p: any }) => {
  const navigate = useNavigate();
  const hasDiscount = p.discount_price && p.discount_price < p.price;
  const price = hasDiscount ? p.discount_price : p.price;
  return (
    <div
      onClick={() => navigate(`/products/${p.slug || p.id}`)}
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col group"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-50">
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full grid place-items-center text-slate-300"><ShoppingBag className="h-10 w-10" /></div>
        )}
        {hasDiscount && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
            -{toBn(Math.round(((p.price - p.discount_price) / p.price) * 100))}%
          </span>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="text-sm font-bold text-slate-800 line-clamp-2 min-h-[2.4rem]">{p.name}</h3>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-extrabold text-emerald-700">৳{toBn(price)}</span>
          {hasDiscount && <span className="text-xs line-through text-slate-400">৳{toBn(p.price)}</span>}
        </div>
        <Button
          size="sm"
          className="mt-3 w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
          onClick={(e) => { e.stopPropagation(); navigate(`/products/${p.slug || p.id}?order=1`); }}
        >
          <ShoppingCart className="h-3.5 w-3.5" /> অর্ডার করুন
        </Button>
      </div>
    </div>
  );
};

const SliderBlock = ({ slider, allProducts }: { slider: any; allProducts: any[] }) => {
  const autoplay = useRef(
    Autoplay({ delay: 3500, stopOnInteraction: true, stopOnMouseEnter: true })
  );

  const items = (() => {
    const ids: string[] = Array.isArray(slider.product_ids) ? slider.product_ids : [];
    if (ids.length > 0) {
      const map = new Map(allProducts.map((p) => [p.id, p]));
      return ids.map((id) => map.get(id)).filter(Boolean);
    }
    return shuffle(allProducts).slice(0, 16);
  })();

  if (items.length === 0) return null;

  return (
    <section className="px-4 py-6" style={{ fontFamily: "'Tiro Bangla', serif" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">{slider.title}</h2>
            {slider.subtitle && <p className="text-xs md:text-sm text-slate-500 mt-0.5">{slider.subtitle}</p>}
          </div>
        </div>
        <Carousel
          opts={{ align: "start", loop: items.length > 4 }}
          plugins={slider.autoplay !== false ? [autoplay.current] : []}
          className="w-full"
        >
          <CarouselContent className="-ml-3">
            {items.map((p: any) => (
              <CarouselItem key={p.id} className="pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                <ProductCard p={p} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-3 bg-white" />
          <CarouselNext className="hidden md:flex -right-3 bg-white" />
        </Carousel>
      </div>
    </section>
  );
};

export default function ProductSlidersSection() {
  const { data: sliders } = useQuery({
    queryKey: ["product-sliders-public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_sliders")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["all-active-products-min"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, discount_price, image_url, is_active")
        .eq("is_active", true)
        .limit(200);
      return data ?? [];
    },
  });

  if (!sliders || sliders.length === 0 || !products) return null;

  return (
    <>
      {sliders.map((s: any) => (
        <SliderBlock key={s.id} slider={s} allProducts={products} />
      ))}
    </>
  );
}
