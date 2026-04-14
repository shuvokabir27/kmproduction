import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Phone, Clock, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const TalerGurLanding = () => {
  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    targetDate.setHours(23, 59, 59, 0);

    const tick = () => {
      const now = new Date().getTime();
      const diff = targetDate.getTime() - now;
      if (diff <= 0) return;
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);
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

      {/* Product Images after Hero */}
      {products && products.length > 0 && products.some((p: any) => p.image_url) && (
        <section className="py-10 md:py-16">
          <div className="max-w-5xl mx-auto px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.filter((p: any) => p.image_url).map((p: any) => (
                <div key={p.id} className="rounded-2xl overflow-hidden border border-border/30 shadow-lg">
                  <img src={p.image_url} alt={p.name} className="w-full h-56 md:h-64 object-cover" />
                  <div className="p-3 bg-card text-center">
                    <h3 className="font-semibold text-foreground text-sm">{p.name}</h3>
                  </div>
                </div>
              ))}
            </div>
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

      {/* Pricing / Offer Section */}
      {products && products.length > 0 && (
        <section className="py-12 md:py-20">
          <div className="max-w-5xl mx-auto px-4">
            {/* Urgency Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-destructive flex items-center justify-center gap-2 font-['Hind_Siliguri'] mb-2">
                <Clock className="h-6 w-6" /> এখনই অর্ডার করুন — অফার শেষ হচ্ছে!
              </h2>
              <p className="text-muted-foreground text-sm">ডেলিভারির সময় টেষ্ট করে পছন্দ হলে পে করুন। কোনো ঝুঁকি নেই!</p>
            </div>

            {/* Countdown Timer */}
            <div className="flex justify-center gap-3 mb-10">
              {[
                { val: timeLeft.days, label: "দিন" },
                { val: timeLeft.hours, label: "ঘণ্টা" },
                { val: timeLeft.minutes, label: "মিনিট" },
                { val: timeLeft.seconds, label: "সেকেন্ড" },
              ].map((t, i) => (
                <div key={i} className="bg-card border border-border/40 rounded-xl w-16 h-16 flex flex-col items-center justify-center shadow-sm">
                  <span className="text-xl font-bold text-foreground">{toBn(t.val).padStart(2, "০")}</span>
                  <span className="text-[10px] text-muted-foreground">{t.label}</span>
                </div>
              ))}
            </div>

            {/* Product Price Cards */}
            <div className="space-y-6">
              {products.map((p: any) => {
                const hasDiscount = p.discount_price && p.discount_price < p.price;
                const discountPercent = hasDiscount ? Math.round(((p.price - p.discount_price) / p.price) * 100) : 0;
                return (
                  <div key={p.id} className="bg-card border-2 border-amber-500/30 rounded-3xl overflow-hidden shadow-lg">
                    {p.image_url && (
                      <img src={p.image_url} alt={p.name} className="w-full h-48 md:h-64 object-cover" />
                    )}
                    <div className="p-6 md:p-8 text-center">
                      <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4 font-['Hind_Siliguri']">{p.name}</h3>
                      {p.description && <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">{p.description}</p>}

                      {/* Price Display */}
                      <div className="bg-accent/30 border border-border/30 rounded-2xl p-6 mb-6 max-w-sm mx-auto">
                        {hasDiscount ? (
                          <>
                            <p className="text-muted-foreground text-sm mb-1">
                              রেগুলার মূল্য <span className="line-through text-destructive font-bold text-lg">৳{toBn(p.price)}</span> টাকা
                            </p>
                            <p className="text-xl md:text-2xl font-bold text-foreground mt-2 font-['Hind_Siliguri']">
                              সীমিত সময়ের অফার মূল্য
                            </p>
                            <div className="mt-2 flex items-center justify-center gap-2">
                              <span className="text-4xl md:text-5xl font-extrabold text-[#1a7a2e] border-2 border-[#1a7a2e] rounded-full px-5 py-1">
                                ৳{toBn(p.discount_price)}
                              </span>
                              <span className="text-xl font-bold text-foreground">টাকা মাত্র</span>
                            </div>
                            <span className="inline-block mt-3 text-xs bg-destructive/15 text-destructive px-3 py-1 rounded-full font-semibold">
                              🔥 {toBn(discountPercent)}% ছাড়
                            </span>
                          </>
                        ) : (
                          <>
                            <p className="text-muted-foreground text-sm mb-1">মূল্য</p>
                            <span className="text-4xl md:text-5xl font-extrabold text-amber-500">৳{toBn(p.price)}</span>
                            <span className="text-xl font-bold text-foreground ml-2">টাকা</span>
                          </>
                        )}
                      </div>

                      {/* Order Button */}
                      {p.contact_info && (
                        <a href={`tel:${p.contact_info}`}>
                          <Button size="lg" className="gap-2 bg-[#1a7a2e] hover:bg-[#15661f] text-white px-10 py-6 text-lg rounded-full shadow-lg">
                            <ClipboardCheck className="h-5 w-5" /> অর্ডার করতে চাই 🔥
                          </Button>
                        </a>
                      )}

                      <p className="mt-4 text-xs text-destructive font-medium">🔴 🔴 অফার আর কিছুক্ষণ!</p>
                    </div>
                  </div>
                );
              })}
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
