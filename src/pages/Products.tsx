import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Phone, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

const Products = () => {
  const { data: products, isLoading } = useQuery({
    queryKey: ["public-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: sections } = useQuery({
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

  const hero = sections?.find((s: any) => s.section_key === "hero");
  const benefits = sections?.filter((s: any) => s.section_key.startsWith("benefit_")) ?? [];
  const qualities = sections?.filter((s: any) => s.section_key.startsWith("quality_")) ?? [];
  const cta = sections?.find((s: any) => s.section_key === "cta");
  const categories = [...new Set((products ?? []).map((p: any) => p.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      {hero ? (
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-900/30 via-background to-amber-800/10" />
          <div className="relative max-w-5xl mx-auto px-4 py-20 md:py-32 text-center">
            <span className="text-6xl md:text-8xl block mb-6">{hero.icon}</span>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 font-['Hind_Siliguri']">
              {hero.title}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {hero.content}
            </p>
            {hero.image_url && (
              <img src={hero.image_url} alt={hero.title || ""} className="mt-8 mx-auto max-h-80 rounded-2xl object-cover shadow-2xl" />
            )}
          </div>
        </section>
      ) : (
        <div className="bg-gradient-to-br from-primary/20 via-background to-primary/5 border-b border-border/30">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <ShoppingBag className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">কে এম প্রডাক্ট</h1>
                <p className="text-muted-foreground mt-1">আমাদের বিভিন্ন প্রডাক্ট দেখুন</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Benefits Section */}
      {benefits.length > 0 && (
        <section className="py-16 md:py-24 bg-gradient-to-b from-background to-card/50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-4 font-['Hind_Siliguri']">
              তালের গুড়ের উপকারিতা
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
              প্রকৃতির এই অমূল্য উপহারের রয়েছে অসংখ্য স্বাস্থ্য উপকারিতা
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {benefits.map((b: any) => (
                <div key={b.id} className="bg-card border border-border/30 rounded-2xl p-6 hover:border-amber-500/30 transition-all duration-300 group">
                  <div className="flex items-start gap-4">
                    <span className="text-3xl flex-shrink-0 group-hover:scale-110 transition-transform">{b.icon}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">{b.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{b.content}</p>
                    </div>
                  </div>
                  {b.image_url && (
                    <img src={b.image_url} alt={b.title || ""} className="mt-4 w-full h-40 object-cover rounded-xl" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Qualities Section */}
      {qualities.length > 0 && (
        <section className="py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-4 font-['Hind_Siliguri']">
              আমাদের গুড়ের গুণাগুণ
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
              কেন আমাদের তালের গুড় সেরা
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {qualities.map((q: any) => (
                <div key={q.id} className="bg-gradient-to-br from-amber-900/20 to-card border border-amber-500/10 rounded-2xl p-6 text-center hover:border-amber-500/30 transition-all duration-300">
                  <span className="text-4xl block mb-4">{q.icon}</span>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{q.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{q.content}</p>
                  {q.image_url && (
                    <img src={q.image_url} alt={q.title || ""} className="mt-4 w-full h-36 object-cover rounded-xl" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Products Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-background to-card/30">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12 font-['Hind_Siliguri']">
            আমাদের প্রডাক্ট
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-80 bg-card animate-pulse rounded-xl" />
              ))}
            </div>
          ) : !products?.length ? (
            <div className="text-center py-20 text-muted-foreground">
              <ShoppingBag className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">এখনো কোনো প্রডাক্ট যোগ করা হয়নি</p>
            </div>
          ) : (
            <>
              {categories.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-6 justify-center">
                  {categories.map((cat) => (
                    <Badge key={cat} variant="secondary" className="text-sm">{cat}</Badge>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product: any) => (
                  <div key={product.id} className="bg-card border border-border/50 rounded-xl overflow-hidden hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300 group">
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="h-16 w-16 text-muted-foreground/20" />
                        </div>
                      )}
                      {product.is_featured && (
                        <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">ফিচার্ড</Badge>
                      )}
                      {product.stock_status === "out_of_stock" && (
                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                          <Badge variant="destructive" className="text-sm">স্টক শেষ</Badge>
                        </div>
                      )}
                    </div>
                    <div className="p-4 space-y-2">
                      {product.category && (
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{product.category}</span>
                        </div>
                      )}
                      <h3 className="font-semibold text-foreground text-lg leading-tight">{product.name}</h3>
                      {product.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        {product.discount_price ? (
                          <>
                            <span className="text-lg font-bold text-primary">৳{toBn(product.discount_price)}</span>
                            <span className="text-sm text-muted-foreground line-through">৳{toBn(product.price)}</span>
                          </>
                        ) : (
                          <span className="text-lg font-bold text-primary">৳{toBn(product.price)}</span>
                        )}
                      </div>
                      {product.contact_info && (
                        <div className="pt-2">
                          <a href={`tel:${product.contact_info}`} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                            <Phone className="h-3 w-3" /> {product.contact_info}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA Section */}
      {cta && (
        <section className="py-16 md:py-24">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <span className="text-5xl block mb-6">{cta.icon}</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-['Hind_Siliguri']">
              {cta.title}
            </h2>
            <p className="text-muted-foreground text-lg mb-8">{cta.content}</p>
            {products?.[0]?.contact_info && (
              <a href={`tel:${products[0].contact_info}`}>
                <Button size="lg" className="gap-2 bg-amber-600 hover:bg-amber-700 text-white px-8 py-6 text-lg rounded-xl">
                  <Phone className="h-5 w-5" /> যোগাযোগ করুন
                </Button>
              </a>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border/30 py-6 text-center text-muted-foreground text-sm">
        © কে এম প্রডাক্ট
      </footer>
    </div>
  );
};

export default Products;
