import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ShoppingBag, ShoppingCart, Sparkles, Truck, Tag, Star, Gift, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { useState } from "react";
import QuickOrderDialog from "@/components/QuickOrderDialog";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

const accentMap: Record<string, { text: string; from: string; glow: string; ring: string; btn: string }> = {
  amber:   { text: "text-amber-400",   from: "from-amber-500",   glow: "bg-amber-500/8",   ring: "border-amber-500/30 hover:bg-amber-500/10",   btn: "bg-amber-500" },
  red:     { text: "text-red-400",     from: "from-red-500",     glow: "bg-red-500/8",     ring: "border-red-500/30 hover:bg-red-500/10",       btn: "bg-red-500" },
  green:   { text: "text-emerald-400", from: "from-emerald-500", glow: "bg-emerald-500/8", ring: "border-emerald-500/30 hover:bg-emerald-500/10", btn: "bg-emerald-500" },
  blue:    { text: "text-sky-400",     from: "from-sky-500",     glow: "bg-sky-500/8",     ring: "border-sky-500/30 hover:bg-sky-500/10",       btn: "bg-sky-500" },
  rose:    { text: "text-rose-400",    from: "from-rose-500",    glow: "bg-rose-500/8",    ring: "border-rose-500/30 hover:bg-rose-500/10",     btn: "bg-rose-500" },
  violet:  { text: "text-violet-400",  from: "from-violet-500",  glow: "bg-violet-500/8",  ring: "border-violet-500/30 hover:bg-violet-500/10", btn: "bg-violet-500" },
};

const iconForBadge = (text?: string | null) => {
  if (!text) return Tag;
  const t = text.toLowerCase();
  if (t.includes("free") || t.includes("ফ্রি") || t.includes("ডেলিভারি")) return Truck;
  if (t.includes("gift") || t.includes("গিফট")) return Gift;
  if (t.includes("hot") || t.includes("featured") || t.includes("ফিচার")) return Star;
  return Sparkles;
};

function SectionBlock({ section }: { section: any }) {
  const navigate = useNavigate();
  const accent = accentMap[section.accent_color] || accentMap.amber;
  const badgeAccent = accentMap[section.badge_color] || accent;
  const BadgeIcon = iconForBadge(section.badge_text);
  const { addItem, open: openCart } = useCart();
  const [orderProduct, setOrderProduct] = useState<any | null>(null);

  const { data: products } = useQuery({
    queryKey: ["home-section-products", section.id, section.section_type, section.category_value, section.max_items],
    queryFn: async () => {
      const limit = Math.max(1, Math.min(48, section.max_items || 12));
      if (section.section_type === "category" && section.category_value) {
        const { data } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .eq("category", section.category_value)
          .order("sort_order", { ascending: true })
          .limit(limit);
        return data ?? [];
      }
      // manual
      const { data: links } = await (supabase as any)
        .from("home_section_products")
        .select("product_id, sort_order")
        .eq("section_id", section.id)
        .order("sort_order", { ascending: true })
        .limit(limit);
      const ids = (links ?? []).map((l: any) => l.product_id);
      if (ids.length === 0) return [];
      const { data: prods } = await supabase
        .from("products")
        .select("*")
        .in("id", ids)
        .eq("is_active", true);
      // preserve sort order
      const order: Record<string, number> = {};
      ids.forEach((id: string, i: number) => { order[id] = i; });
      return (prods ?? []).sort((a: any, b: any) => (order[a.id] ?? 0) - (order[b.id] ?? 0));
    },
  });

  if (!products || products.length === 0) return null;

  return (
    <section className="py-16 px-4 relative">
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] ${accent.glow} rounded-full blur-[140px]`} />
      <div className="container max-w-6xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-8 flex items-end justify-between flex-wrap gap-4">
          <div>
            {section.eyebrow && (
              <span className={`${accent.text} text-xs font-bold tracking-[0.3em] uppercase flex items-center gap-2`}>
                <Sparkles className="h-4 w-4" /> {section.eyebrow}
              </span>
            )}
            <h2 className="font-display text-3xl md:text-5xl text-foreground mt-3 tracking-wider">{section.title}</h2>
            <div className={`h-1 w-20 bg-gradient-to-r ${accent.from} to-transparent rounded-full mt-4`} />
            {section.badge_text && (
              <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full ${badgeAccent.btn} text-white text-xs font-bold shadow`}>
                <BadgeIcon className="h-3.5 w-3.5" /> {section.badge_text}
              </div>
            )}
          </div>
          {(section.cta_label || section.cta_link) && (
            <Button onClick={() => navigate(section.cta_link || "/products")} variant="outline" className={`${accent.ring} gap-2`}>
              <ShoppingBag className="h-4 w-4" /> {section.cta_label || "সব দেখুন"}
            </Button>
          )}
        </motion.div>

        <Carousel opts={{ align: "start", loop: products.length > 4 }} className="w-full">
          <CarouselContent className="-ml-3">
            {products.map((p: any) => {
              const hasDiscount = p.discount_price && p.discount_price < p.price;
              const price = hasDiscount ? p.discount_price : p.price;
              return (
                <CarouselItem key={p.id} className="pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                  <div className="glossy-card overflow-hidden group cursor-pointer h-full flex flex-col" onClick={() => navigate(`/products/${p.id}`)}>
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ShoppingBag className="h-10 w-10" /></div>
                      )}
                      {section.badge_text && (
                        <div className={`absolute top-2 left-2 px-2 py-1 rounded-full ${badgeAccent.btn} text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur shadow`}>
                          <BadgeIcon className="h-3 w-3" /> {section.badge_text}
                        </div>
                      )}
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
                      <div className="mt-3 grid grid-cols-[1fr_auto] gap-1.5">
                        <Button
                          size="sm"
                          className="glossy-btn-emerald w-full gap-1 h-9 inline-flex items-center justify-center rounded-md"
                          onClick={(e) => { e.stopPropagation(); setOrderProduct(p); }}
                        >
                          <ShoppingCart className="h-3.5 w-3.5" /> অর্ডার করুন
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`h-9 w-9 p-0 ${accent.ring}`}
                          title="কার্টে যোগ করুন"
                          onClick={(e) => {
                            e.stopPropagation();
                            addItem({
                              product_id: p.id,
                              product_name: p.name,
                              image_url: p.image_url,
                              unit_price: price,
                              quantity: 1,
                              unit_type: p.unit_type,
                              weight_grams: p.weight_grams,
                            });
                            toast.success("কার্টে যোগ হয়েছে");
                            openCart();
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

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

export function CustomHomeSections() {
  const { data: sections } = useQuery({
    queryKey: ["home-sections-active"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("home_sections")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      return data ?? [];
    },
  });

  if (!sections || sections.length === 0) return null;
  return (
    <>
      {sections.map((s: any) => <SectionBlock key={s.id} section={s} />)}
    </>
  );
}
