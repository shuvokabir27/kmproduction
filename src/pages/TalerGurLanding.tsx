import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

const TalerGurLanding = () => {
  const { data: sections, isLoading } = useQuery({
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

  const { data: products } = useQuery({
    queryKey: ["landing-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
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

  const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      {hero && (
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
                <div
                  key={b.id}
                  className="bg-card border border-border/30 rounded-2xl p-6 hover:border-amber-500/30 transition-all duration-300 group"
                >
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
                <div
                  key={q.id}
                  className="bg-gradient-to-br from-amber-900/20 to-card border border-amber-500/10 rounded-2xl p-6 text-center hover:border-amber-500/30 transition-all duration-300"
                >
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
      {products && products.length > 0 && (
        <section className="py-16 md:py-24 bg-gradient-to-b from-background to-card/30">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12 font-['Hind_Siliguri']">
              আমাদের প্রডাক্ট
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p: any) => (
                <div key={p.id} className="bg-card border border-border/30 rounded-2xl overflow-hidden hover:border-amber-500/30 transition-all">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-48 object-cover" />
                  ) : (
                    <div className="w-full h-48 bg-muted flex items-center justify-center">
                      <ShoppingBag className="h-12 w-12 text-muted-foreground/20" />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-foreground mb-1">{p.name}</h3>
                    {p.description && <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{p.description}</p>}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-amber-400">৳{toBn(p.price)}</span>
                        {p.discount_price && (
                          <span className="text-sm text-muted-foreground line-through">৳{toBn(p.discount_price)}</span>
                        )}
                      </div>
                      {p.contact_info && (
                        <a href={`tel:${p.contact_info}`}>
                          <Button size="sm" variant="outline" className="gap-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                            <Phone className="h-3 w-3" /> কল
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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

export default TalerGurLanding;
