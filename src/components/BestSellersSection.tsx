import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ShoppingBag, Flame, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

export function BestSellersSection() {
  const navigate = useNavigate();

  const { data: bestSellers } = useQuery({
    queryKey: ["best-sellers-home"],
    queryFn: async () => {
      const [{ data: orders }, { data: products }] = await Promise.all([
        supabase.from("orders").select("product_id, product_name, quantity, status"),
        supabase.from("products").select("*").eq("is_active", true),
      ]);
      const counts = new Map<string, number>();
      (orders ?? []).forEach((o: any) => {
        if (o.status === "cancelled") return;
        const key = o.product_id || o.product_name;
        if (!key) return;
        counts.set(key, (counts.get(key) || 0) + Number(o.quantity || 0));
      });
      const ranked = (products ?? []).map((p: any) => {
        const byId = counts.get(p.id) || 0;
        const byNameKeys = Array.from(counts.keys()).filter(
          (k) => typeof k === "string" && (k === p.name || k.startsWith(p.name + " ("))
        );
        const byName = byNameKeys.reduce((s, k) => s + (counts.get(k) || 0), 0);
        return { ...p, sold: byId + byName };
      });
      ranked.sort((a, b) => b.sold - a.sold);
      return ranked.filter((p) => p.sold > 0).slice(0, 12);
    },
  });

  if (!bestSellers || bestSellers.length === 0) return null;

  return (
    <section className="py-20 px-4 relative" id="best-sellers">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orange-500/8 rounded-full blur-[140px]" />
      <div className="container max-w-6xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10 flex items-end justify-between flex-wrap gap-4">
          <div>
            <span className="text-orange-400 text-xs font-bold tracking-[0.3em] uppercase flex items-center gap-2">
              <Flame className="h-4 w-4" /> Best Sellers
            </span>
            <h2 className="font-display text-4xl md:text-5xl text-foreground mt-3 tracking-wider">সর্বাধিক বিক্রিত পণ্য</h2>
            <div className="h-1 w-20 bg-gradient-to-r from-orange-500 to-orange-500/30 rounded-full mt-4" />
          </div>
          <Button onClick={() => navigate("/products")} variant="outline" className="border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500/50 gap-2">
            <ShoppingBag className="h-4 w-4" /> সব প্রডাক্ট দেখুন
          </Button>
        </motion.div>

        <Carousel opts={{ align: "start", loop: bestSellers.length > 4 }} className="w-full">
          <CarouselContent className="-ml-3">
            {bestSellers.map((p: any) => {
              const hasDiscount = p.discount_price && p.discount_price < p.price;
              const price = hasDiscount ? p.discount_price : p.price;
              return (
                <CarouselItem key={p.id} className="pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                  <div className="premium-card rounded-2xl overflow-hidden group cursor-pointer h-full flex flex-col" onClick={() => navigate(`/products/${p.id}`)}>
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ShoppingBag className="h-10 w-10" /></div>
                      )}
                      <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-orange-500/95 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur">
                        <Flame className="h-3 w-3" /> {toBn(p.sold)} বিক্রি
                      </div>
                      {hasDiscount && (
                        <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                          -{toBn(Math.round(((p.price - p.discount_price) / p.price) * 100))}%
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex-1 flex flex-col">
                      <h3 className="font-bold text-foreground text-sm line-clamp-2 min-h-[2.5rem]">{p.name}</h3>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-base font-bold text-primary">৳{toBn(price)}</span>
                        {hasDiscount && <span className="text-xs line-through text-muted-foreground">৳{toBn(p.price)}</span>}
                      </div>
                      <Button
                        size="sm"
                        className="mt-3 w-full bg-orange-500 hover:bg-orange-600 text-white gap-1 h-9"
                        onClick={(e) => { e.stopPropagation(); navigate(`/products/${p.id}?order=1`); }}
                      >
                        <ShoppingCart className="h-3.5 w-3.5" /> অর্ডার করুন
                      </Button>
                    </div>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-4" />
          <CarouselNext className="hidden md:flex -right-4" />
        </Carousel>
      </div>
    </section>
  );
}
