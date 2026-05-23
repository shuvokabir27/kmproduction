import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShoppingBag, ShoppingCart, Star, Sparkles, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProductCategories } from "@/hooks/useProductCategories";
import { Button } from "@/components/ui/button";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

export default function CategoryProducts() {
  const { value = "" } = useParams();
  const navigate = useNavigate();
  const { data: catData } = useProductCategories();

  const category = useMemo(() => {
    const all = catData?.all ?? [];
    return all.find((c) => c.value === value) || null;
  }, [catData, value]);

  // Collect this category + its child values (so parent shows sub-cat products too)
  const matchValues = useMemo(() => {
    const all = catData?.all ?? [];
    if (!category) return [value];
    const kids = all.filter((c) => c.parent_id === category.id).map((c) => c.value);
    return [category.value, ...kids];
  }, [catData, category, value]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["category-products", matchValues.join(",")],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .in("category", matchValues)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: matchValues.length > 0,
  });

  const { data: related } = useQuery({
    queryKey: ["category-related", value],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .not("category", "in", `(${matchValues.map((v) => `"${v}"`).join(",")})`)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(12);
      return data ?? [];
    },
  });

  const heading = category?.label || value;

  const ProductCard = ({ p }: { p: any }) => {
    const hasDiscount = p.discount_price && p.discount_price < p.price;
    const price = hasDiscount ? p.discount_price : p.price;
    return (
      <div
        className="group cursor-pointer rounded-2xl overflow-hidden bg-white/[0.04] border border-white/10 hover:border-red-400/40 hover:shadow-[0_18px_36px_-14px_rgba(220,38,38,0.6)] transition-all flex flex-col"
        onClick={() => navigate(`/products/${p.slug || p.id}`)}
      >
        <div className="relative aspect-square overflow-hidden bg-muted">
          {p.image_url ? (
            <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full grid place-items-center text-muted-foreground"><ShoppingBag className="h-10 w-10" /></div>
          )}
          {p.is_featured && (
            <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-amber-500/95 text-white text-[10px] font-bold flex items-center gap-1">
              <Star className="h-3 w-3" /> ফিচার্ড
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
            <span className="text-base font-bold text-red-400">৳{toBn(price)}</span>
            {hasDiscount && <span className="text-xs line-through text-muted-foreground">৳{toBn(p.price)}</span>}
          </div>
          <Button
            size="sm"
            className="mt-3 w-full gap-1 h-9 bg-red-600 hover:bg-red-700 text-white"
            onClick={(e) => { e.stopPropagation(); navigate(`/products/${p.slug || p.id}?order=1`); }}
          >
            <ShoppingCart className="h-3.5 w-3.5" /> অর্ডার করুন
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background noise-bg" style={{ fontFamily: "'Tiro Bangla', serif" }}>
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 grid place-items-center rounded-full bg-white/5 hover:bg-white/10 text-foreground"
            aria-label="ফিরে যান"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Link to="/products" className="hover:text-foreground inline-flex items-center gap-1"><Home className="h-3 w-3" /> হোম</Link>
              <span>/</span>
              <Link to="/categories" className="hover:text-foreground">ক্যাটাগরি</Link>
            </div>
            <h1 className="text-lg md:text-2xl font-extrabold text-foreground truncate flex items-center gap-2">
              {category?.icon && <span>{category.icon}</span>}
              {heading}
            </h1>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-end justify-between mb-5 gap-3">
          <div className="flex items-center gap-2 text-red-400 text-xs font-bold tracking-[0.3em] uppercase">
            <Sparkles className="h-4 w-4" /> এই ক্যাটাগরির পণ্য
          </div>
          <span className="text-sm text-muted-foreground">{toBn(products?.length ?? 0)} টি পণ্য</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (products?.length ?? 0) === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-40" />
            এই ক্যাটাগরিতে এখনো কোনো পণ্য নেই।
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products!.map((p: any) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </section>

      {related && related.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-10 border-t border-white/10">
          <div className="flex items-end justify-between mb-5 gap-3">
            <div>
              <div className="text-amber-400 text-xs font-bold tracking-[0.3em] uppercase flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Related
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground mt-1">সম্পর্কিত অন্যান্য পণ্য</h2>
            </div>
            <Button variant="outline" onClick={() => navigate("/products")} className="border-white/15 hover:bg-white/5">
              সব দেখুন
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {related.map((p: any) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
