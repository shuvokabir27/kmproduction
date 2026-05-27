import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ShoppingBag, Sparkles, ShoppingCart, Star } from "lucide-react";
import { motion } from "framer-motion";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

export function FeaturedProductsSection() {
  const navigate = useNavigate();

  const { data: featured } = useQuery({
    queryKey: ["featured-products-home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("is_featured", true)
        .order("sort_order", { ascending: true })
        .limit(12);
      return data ?? [];
    },
  });

  if (!featured || featured.length === 0) return null;

  return (
    <section className="py-20 px-4 relative" id="featured-products">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/8 rounded-full blur-[140px]" />
      <div className="container max-w-6xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10 flex items-end justify-between flex-wrap gap-4">
          <div>
            <span className="text-amber-400 text-xs font-bold tracking-[0.3em] uppercase flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Featured
            </span>
            <h2 className="font-display text-4xl md:text-5xl text-foreground mt-3 tracking-wider">বাছাইকৃত পণ্য</h2>
            <div className="h-1 w-20 bg-gradient-to-r from-amber-500 to-amber-500/30 rounded-full mt-4" />
          </div>
          <Button onClick={() => navigate("/products")} variant="outline" className="border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500/50 gap-2">
            <ShoppingBag className="h-4 w-4" /> সব প্রডাক্ট দেখুন
          </Button>
        </motion.div>

        <Carousel opts={{ align: "start", loop: featured.length > 4 }} className="w-full">
          <CarouselContent className="-ml-3">
            {featured.map((p: any) => {
              const hasDiscount = p.discount_price && p.discount_price < p.price;
              const price = hasDiscount ? p.discount_price : p.price;
              return (
                <CarouselItem key={p.id} className="pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                  <div className="glossy-card overflow-hidden group cursor-pointer h-full flex flex-col" onClick={() => navigate(`/products/${p.slug || p.id}`)}>
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ShoppingBag className="h-10 w-10" /></div>
                      )}
                      <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-amber-500/95 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur">
                        <Star className="h-3 w-3" /> ফিচার্ড
                      </div>
                      {hasDiscount && (
                        <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold">
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
                        className="glossy-btn-emerald mt-3 w-full gap-1 h-9 inline-flex items-center justify-center rounded-md"
                        onClick={(e) => { e.stopPropagation(); navigate(`/products/${p.slug || p.id}?order=1`); }}
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
