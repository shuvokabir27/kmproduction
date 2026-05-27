import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { ShoppingBag, ShoppingCart, Sparkles, Truck, Tag, Star, Gift, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import QuickOrderDialog from "@/components/QuickOrderDialog";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

const accentMap: Record<string, { text: string; from: string; glow: string; ring: string; btn: string }> = {
  amber:   { text: "text-amber-400",   from: "from-amber-500",   glow: "bg-amber-500/8",   ring: "border-amber-500/30 hover:bg-amber-500/10",   btn: "bg-amber-500" },
  red:     { text: "text-blue-500",     from: "from-blue-600",     glow: "bg-blue-600/8",     ring: "border-blue-600/30 hover:bg-blue-600/10",       btn: "bg-blue-600" },
  green:   { text: "text-emerald-400", from: "from-emerald-500", glow: "bg-emerald-500/8", ring: "border-emerald-500/30 hover:bg-emerald-500/10", btn: "bg-emerald-500" },
  blue:    { text: "text-sky-400",     from: "from-sky-500",     glow: "bg-sky-500/8",     ring: "border-sky-500/30 hover:bg-sky-500/10",       btn: "bg-sky-500" },
  rose:    { text: "text-blue-600",    from: "from-slate-100",    glow: "bg-slate-100",    ring: "border-slate-200/30 hover:bg-slate-100",     btn: "bg-slate-100" },
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
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    if (!api) return;
    const update = () => {
      setCanPrev(api.canScrollPrev());
      setCanNext(api.canScrollNext());
    };
    update();
    api.on("select", update);
    api.on("reInit", update);
  }, [api]);

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
    <section className="px-4 py-6 relative">
      <div className="max-w-7xl mx-auto relative z-10 rounded-2xl px-5 py-7 md:p-7 overflow-hidden bg-white border border-slate-200">
        <Carousel setApi={setApi} opts={{ align: "start", loop: products.length > 4 }} className="w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-8 flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {section.badge_text && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-semibold">
                    <BadgeIcon className="h-3.5 w-3.5" /> {section.badge_text}
                  </div>
                )}
                {section.eyebrow && (
                  <span className="text-blue-600 text-xs font-semibold tracking-[0.3em] uppercase flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> {section.eyebrow}
                  </span>
                )}
              </div>
              <h2 className="font-display font-bold text-3xl md:text-5xl mt-1 tracking-wider text-slate-900">
                {section.title}
              </h2>
              <div className="h-1 w-20 bg-blue-600 rounded-full mt-4" />
            </div>
            <div className="flex items-center gap-2">
              {products.length > 4 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="পূর্ববর্তী"
                    onClick={() => api?.scrollPrev()}
                    disabled={!canPrev}
                    className="h-9 w-9 grid place-items-center rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="পরবর্তী"
                    onClick={() => api?.scrollNext()}
                    disabled={!canNext}
                    className="h-9 w-9 grid place-items-center rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
              {(section.cta_label || section.cta_link) && (
                <Button onClick={() => navigate(section.cta_link || "/products")} variant="outline" className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50">
                  <ShoppingBag className="h-4 w-4" /> {section.cta_label || "সব দেখুন"}
                </Button>
              )}
            </div>
          </motion.div>

          <CarouselContent className={`-ml-3 ${products.length < 5 ? "justify-center" : ""}`}>
            {products.map((p: any) => {
              // section-level discount overrides product discount when set
              const sectionDiscounted = (() => {
                if (section.discount_type === "percent" && section.discount_value > 0) {
                  return Math.max(0, Math.round(p.price * (1 - section.discount_value / 100)));
                }
                if (section.discount_type === "fixed" && section.discount_value > 0) {
                  return Math.max(0, p.price - section.discount_value);
                }
                return null;
              })();
              const productDiscounted = p.discount_price && p.discount_price < p.price ? p.discount_price : null;
              const finalPrice = sectionDiscounted ?? productDiscounted ?? p.price;
              const hasDiscount = finalPrice < p.price;
              const price = finalPrice;
              return (
                <CarouselItem key={p.id} className="pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                  <div className="glossy-card overflow-hidden group cursor-pointer h-full flex flex-col" onClick={() => navigate(`/products/${p.slug || p.id}`)}>
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
                        <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                          -{toBn(Math.round(((p.price - price) / p.price) * 100))}%
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
                          className="w-full gap-1 h-9 inline-flex items-center justify-center rounded-md text-white"
                          style={section.order_btn_color ? { backgroundColor: section.order_btn_color } : undefined}
                          onClick={(e) => { e.stopPropagation(); setOrderProduct({ ...p, discount_price: hasDiscount ? price : p.discount_price }); }}
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
        </Carousel>
      </div>
      <QuickOrderDialog product={orderProduct} open={!!orderProduct} onClose={() => setOrderProduct(null)} />
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
