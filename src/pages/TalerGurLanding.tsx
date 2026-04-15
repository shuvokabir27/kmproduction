import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Phone, Clock, ClipboardCheck, Truck, RotateCcw, ShieldCheck, Star, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const TalerGurLanding = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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

  const contactNumber = products?.[0]?.contact_info || "";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f5f0] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#1a7a2e] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f5f0] font-['Hind_Siliguri'] text-[#333]">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-50 bg-[#1a7a2e] text-white text-center py-2 px-4 text-sm font-medium">
        🔥 আজই অর্ডার করুন এই অফার আর পাবেন না |
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm py-3 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {contactNumber && (
            <a href={`tel:${contactNumber}`} className="flex items-center gap-2 text-[#1a7a2e] font-semibold text-sm md:text-base">
              <Phone className="h-4 w-4" /> {contactNumber}
            </a>
          )}
          {contactNumber && (
            <a href={`tel:${contactNumber}`}>
              <Button size="sm" className="bg-[#c0392b] hover:bg-[#a93226] text-white rounded-full px-5 text-sm font-bold shadow">
                অর্ডার করুন
              </Button>
            </a>
          )}
        </div>
      </header>

      {/* Call Button Bar */}
      {contactNumber && (
        <div className="bg-white border-b py-2 text-center">
          <a href={`tel:${contactNumber}`} className="inline-flex items-center gap-2 border border-[#ccc] rounded-full px-6 py-2 text-sm text-[#555] hover:bg-gray-50 transition">
            <Phone className="h-4 w-4" /> কল করুন — {contactNumber}
          </a>
        </div>
      )}

      {/* Hero Section */}
      {hero && (
        <section className="bg-[#1a7a2e] text-white py-12 md:py-20 text-center relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-3xl md:text-5xl font-extrabold mb-2 drop-shadow-lg">
              {hero.title || "কে এম প্রডাক্ট"}
            </h1>
            <p className="text-lg md:text-2xl font-medium text-amber-200 mb-4">
              {hero.content || "সেরা মানের তালের গুড়"}
            </p>

            {hero.image_url && (
              <img src={hero.image_url} alt={hero.title || ""} className="mt-6 mx-auto max-h-72 rounded-2xl object-cover shadow-2xl border-4 border-white/20" />
            )}

            {/* Product Images Gallery */}
            {products && products.length > 0 && products.some((p: any) => p.image_url) && (
              <div className="mt-8">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">PREMIUM</span>
                  <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">১০০% অর্গানিক</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
                  {products.filter((p: any) => p.image_url).map((p: any) => (
                    <div key={p.id} className="rounded-xl overflow-hidden border-2 border-white/20 shadow-lg">
                      <img src={p.image_url} alt={p.name} className="w-full h-40 md:h-52 object-cover" />
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-white/80 text-sm max-w-xl mx-auto leading-relaxed">
                  প্রতিদিনের পুষ্টি ও শক্তির জন্য সেরা নির্বাচন। ১০০% ফ্রেশ, স্বাস্থ্যকর এবং পরিবারের জন্য নিরাপদ।
                </p>
              </div>
            )}

            {/* Hero CTA */}
            {contactNumber && (
              <a href={`tel:${contactNumber}`}>
                <Button size="lg" className="mt-8 gap-2 bg-amber-500 hover:bg-amber-600 text-white px-10 py-6 text-lg rounded-full shadow-xl font-bold">
                  <ClipboardCheck className="h-5 w-5" /> অর্ডার করতে চাই
                </Button>
              </a>
            )}
          </div>
        </section>
      )}

      {/* Countdown + Offer Section */}
      {products && products.length > 0 && (
        <section className="py-12 md:py-16 bg-[#fdf6ee]">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-[#c0392b] flex items-center justify-center gap-2 mb-2">
                <Clock className="h-6 w-6" /> এখনই অর্ডার করুন — অফার শেষ হচ্ছে!
              </h2>
              <p className="text-[#888] text-sm">ডেলিভারির সময় টেস্ট করে পছন্দ হলে পে করুন। কোনো ঝুঁকি নেই!</p>
            </div>

            {/* Countdown Timer */}
            <div className="flex justify-center gap-3 mb-10">
              {[
                { val: timeLeft.days, label: "দিন" },
                { val: timeLeft.hours, label: "ঘণ্টা" },
                { val: timeLeft.minutes, label: "মিনিট" },
                { val: timeLeft.seconds, label: "সেকেন্ড" },
              ].map((t, i) => (
                <div key={i} className="bg-white border border-[#e0d8cc] rounded-xl w-16 h-16 flex flex-col items-center justify-center shadow-sm">
                  <span className="text-xl font-bold text-[#333]">{toBn(t.val).padStart(2, "০")}</span>
                  <span className="text-[10px] text-[#888]">{t.label}</span>
                </div>
              ))}
            </div>

            {/* Product Price Cards */}
            <div className="space-y-6">
              {products.map((p: any) => {
                const hasDiscount = p.discount_price && p.discount_price < p.price;
                const discountPercent = hasDiscount ? Math.round(((p.price - p.discount_price) / p.price) * 100) : 0;
                return (
                  <div key={p.id} className="bg-white border-2 border-[#1a7a2e]/30 rounded-3xl overflow-hidden shadow-lg">
                    {p.image_url && (
                      <img src={p.image_url} alt={p.name} className="w-full h-48 md:h-64 object-cover" />
                    )}
                    <div className="p-6 md:p-8 text-center">
                      <h3 className="text-xl md:text-2xl font-bold text-[#333] mb-4">{p.name}</h3>
                      {p.description && <p className="text-[#888] text-sm mb-6 max-w-md mx-auto">{p.description}</p>}

                      <div className="bg-[#fdf6ee] border border-[#e8e0d4] rounded-2xl p-6 mb-6 max-w-sm mx-auto">
                        {hasDiscount ? (
                          <>
                            <p className="text-[#888] text-sm mb-1">
                              রেগুলার মূল্য <span className="line-through text-[#c0392b] font-bold text-lg">৳{toBn(p.price)}</span> টাকা
                            </p>
                            <p className="text-xl md:text-2xl font-bold text-[#333] mt-2">
                              সীমিত সময়ের অফার মূল্য
                            </p>
                            <div className="mt-2 flex items-center justify-center gap-2">
                              <span className="text-4xl md:text-5xl font-extrabold text-[#1a7a2e] border-2 border-[#1a7a2e] rounded-full px-5 py-1">
                                ৳{toBn(p.discount_price)}
                              </span>
                              <span className="text-xl font-bold text-[#333]">টাকা মাত্র</span>
                            </div>
                            <span className="inline-block mt-3 text-xs bg-[#c0392b]/10 text-[#c0392b] px-3 py-1 rounded-full font-semibold">
                              🔥 {toBn(discountPercent)}% ছাড়
                            </span>
                          </>
                        ) : (
                          <>
                            <p className="text-[#888] text-sm mb-1">মূল্য</p>
                            <span className="text-4xl md:text-5xl font-extrabold text-[#1a7a2e]">৳{toBn(p.price)}</span>
                            <span className="text-xl font-bold text-[#333] ml-2">টাকা</span>
                          </>
                        )}
                      </div>

                      {p.contact_info && (
                        <a href={`tel:${p.contact_info}`}>
                          <Button size="lg" className="gap-2 bg-[#1a7a2e] hover:bg-[#15661f] text-white px-10 py-6 text-lg rounded-full shadow-lg font-bold">
                            <ClipboardCheck className="h-5 w-5" /> অর্ডার করতে চাই 🔥
                          </Button>
                        </a>
                      )}
                      <p className="mt-4 text-xs text-[#c0392b] font-medium">🔴 🔴 অফার আর কিছুক্ষণ!</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Trust Badges */}
      <section className="bg-white py-6 border-b">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center gap-1">
            <Truck className="h-6 w-6 text-[#1a7a2e]" />
            <p className="font-bold text-sm text-[#333]">ফ্রি ডেলিভারি</p>
            <p className="text-xs text-[#888]">সারাদেশে বিনামূল্যে</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <RotateCcw className="h-6 w-6 text-[#1a7a2e]" />
            <p className="font-bold text-sm text-[#333]">ইজি রিটার্ন</p>
            <p className="text-xs text-[#888]">পছন্দ না হলে ফেরত</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ShieldCheck className="h-6 w-6 text-[#1a7a2e]" />
            <p className="font-bold text-sm text-[#333]">১০০% গ্যারান্টি</p>
            <p className="text-xs text-[#888]">মান নিশ্চিত</p>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-[#f0ebe3] py-4 border-b">
        <div className="max-w-4xl mx-auto px-4 flex justify-center gap-8 text-center">
          <div>
            <p className="text-xl font-bold text-[#1a7a2e]">৪.৯/৫</p>
            <p className="text-xs text-[#888]">কাস্টমার রিভিউ</p>
          </div>
          <div>
            <p className="text-xl font-bold text-[#1a7a2e]">১০০০+</p>
            <p className="text-xs text-[#888]">সফল ডেলিভারি</p>
          </div>
        </div>
      </section>

      {/* Qualities / Feature Grid */}
      {qualities.length > 0 && (
        <section className="py-12 md:py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {qualities.map((q: any) => (
                <div key={q.id} className="bg-[#f8f5f0] border border-[#e8e0d4] rounded-xl p-5 text-center hover:shadow-md transition-all">
                  <span className="text-3xl block mb-2">{q.icon}</span>
                  <h3 className="text-sm font-bold text-[#333] mb-1">{q.title}</h3>
                  <p className="text-xs text-[#888] leading-relaxed">{q.content}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Benefits Section */}
      {benefits.length > 0 && (
        <section className="py-12 md:py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-[#333] text-center mb-3">
              কেন আমাদের গুড় নেবেন?
            </h2>
            <p className="text-[#888] text-center mb-10 max-w-xl mx-auto text-sm">
              প্রকৃতির এই অমূল্য উপহারের রয়েছে অসংখ্য স্বাস্থ্য উপকারিতা
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {benefits.map((b: any, idx: number) => (
                <div key={b.id} className="bg-[#f8f5f0] border border-[#e8e0d4] rounded-2xl p-6 hover:shadow-md transition-all group">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#1a7a2e] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {toBn(idx + 1)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#333] mb-2">{b.title}</h3>
                      <p className="text-[#888] text-sm leading-relaxed">{b.content}</p>
                    </div>
                  </div>
                  {b.image_url && (
                    <img src={b.image_url} alt={b.title || ""} className="mt-4 w-full h-36 object-cover rounded-xl" />
                  )}
                </div>
              ))}
            </div>

            {/* CTA after benefits */}
            {contactNumber && (
              <div className="text-center mt-10">
                <a href={`tel:${contactNumber}`}>
                  <Button size="lg" className="gap-2 bg-[#1a7a2e] hover:bg-[#15661f] text-white px-10 py-6 text-lg rounded-full shadow-lg font-bold">
                    <ClipboardCheck className="h-5 w-5" /> অর্ডার করতে চাই
                  </Button>
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Why We Are Different */}
      {qualities.length > 0 && (
        <section className="py-12 md:py-16 bg-[#fdf6ee]">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="bg-[#1a7a2e] text-white text-xs font-bold px-3 py-1 rounded-full">TOP RATED</span>
              <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">১০০% ফ্রেশ</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#333] text-center mb-3">
              কেন আমরা অন্য সবার থেকে আলাদা?
            </h2>
            <div className="max-w-2xl mx-auto mt-8 space-y-4">
              {[
                "আমাদের গুড় সম্পূর্ণভাবে কেমিক্যালমুক্ত এবং প্রাকৃতিক।",
                "ঘরোয়া রেসিপিতে হাতে তৈরি ফ্রেশ তালের গুড়।",
                "ঐতিহ্যবাহী পদ্ধতিতে তৈরি তাই পরিবারে সবাই পছন্দ করবে।",
                "স্বাদ, গুণ এবং মান নিশ্চিত করে আমরা গুড় সংগ্রহ করি।",
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-4 border border-[#e8e0d4]">
                  <span className="text-[#1a7a2e] font-bold text-lg mt-0.5">✓</span>
                  <p className="text-sm text-[#555]">{text}</p>
                </div>
              ))}
            </div>

            {/* Product images */}
            {products && products.some((p: any) => p.image_url) && (
              <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto mt-8">
                {products.filter((p: any) => p.image_url).slice(0, 3).map((p: any) => (
                  <div key={p.id} className="rounded-xl overflow-hidden shadow-md border border-[#e8e0d4]">
                    <img src={p.image_url} alt={p.name} className="w-full h-32 md:h-44 object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* FAQ Section */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[#333] text-center mb-8">
            সাধারণ কিছু জিজ্ঞাসা
          </h2>
          <div className="space-y-3">
            {[
              { q: "তালের গুড় কী এবং কেন এটি এত জনপ্রিয়?", a: "তালের গুড় বাংলাদেশের ঐতিহ্যবাহী মিষ্টি খাবার। তালের রস থেকে প্রাকৃতিক উপায়ে তৈরি এই গুড় প্রজন্মের পর প্রজন্ম ধরে বাঙালি খাবারের অবিচ্ছেদ্য অংশ।" },
              { q: "তালের গুড় কি ডায়াবেটিস রোগীরা খেতে পারবেন?", a: "পরিমিত পরিমাণে গ্রহণ করলে এটি চিনির তুলনায় ভালো বিকল্প। তবে ডায়াবেটিস রোগীদের চিকিৎসকের পরামর্শ নেওয়া উচিত।" },
              { q: "এই গুড় কি ১০০% অরিজিনাল?", a: "হ্যাঁ, আমাদের তালের গুড় ১০০% খাঁটি এবং প্রাকৃতিক। কোনো কেমিক্যাল বা প্রিজার্ভেটিভ মেশানো হয় না।" },
              { q: "তালের গুড় কীভাবে সংরক্ষণ করবেন?", a: "শুষ্ক ও ঠান্ডা স্থানে এয়ারটাইট পাত্রে রাখুন। ফ্রিজে রাখলে দীর্ঘদিন ভালো থাকে।" },
              { q: "তালের গুড় কি প্রতিদিন খাওয়া যায়?", a: "হ্যাঁ, পরিমিত পরিমাণে প্রতিদিন খাওয়া যায়। এটি শরীরে শক্তি যোগায় এবং পুষ্টি সরবরাহ করে।" },
            ].map((faq, i) => (
              <div key={i} className="border border-[#e8e0d4] rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left bg-[#f8f5f0] hover:bg-[#f0ebe3] transition"
                >
                  <span className="font-semibold text-sm text-[#333] flex items-center gap-2">
                    <span className="text-[#1a7a2e] font-bold">{toBn(i + 1)}.</span> {faq.q}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-[#888] transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="p-4 bg-white text-sm text-[#666] leading-relaxed border-t border-[#e8e0d4]">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Package / Final CTA */}
      {products && products.length > 0 && (
        <section className="py-12 md:py-16 bg-[#1a7a2e] text-white">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">সেরা কোয়ালিটির তালের গুড়</h2>
            <p className="text-white/70 text-sm mb-8">এখনই অর্ডার করতে নিচের বাটনে ক্লিক করুন</p>

            {products.map((p: any) => {
              const hasDiscount = p.discount_price && p.discount_price < p.price;
              return (
                <div key={p.id} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-6">
                  <h3 className="text-lg font-bold mb-4">{p.name}</h3>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <span className="text-3xl font-extrabold">৳{toBn(hasDiscount ? p.discount_price : p.price)}</span>
                    {hasDiscount && (
                      <span className="line-through text-white/50 text-lg">৳{toBn(p.price)}</span>
                    )}
                  </div>

                  <div className="flex justify-center gap-4 mb-6 text-xs">
                    <span className="bg-white/20 px-3 py-1 rounded-full">✅ ঘরোয়া</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full">✅ মানসম্মত</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full">✅ ফ্রেশ</span>
                  </div>

                  <p className="text-amber-300 text-xs font-medium mb-4">
                    ⚠️ অফার সীমিত সময়ের জন্য! আজ অর্ডার না করলে কাল হয়তো শেষ 😢
                  </p>

                  {p.contact_info && (
                    <a href={`tel:${p.contact_info}`}>
                      <Button size="lg" className="gap-2 bg-amber-500 hover:bg-amber-600 text-white px-10 py-6 text-lg rounded-full shadow-xl font-bold">
                        অর্ডার করুন — ৳{toBn(hasDiscount ? p.discount_price : p.price)}
                      </Button>
                    </a>
                  )}
                </div>
              );
            })}

            {/* Trust badges repeated */}
            <div className="grid grid-cols-3 gap-4 mt-8 text-center">
              <div>
                <Truck className="h-5 w-5 mx-auto mb-1 text-amber-300" />
                <p className="text-xs font-semibold">ফ্রি ডেলিভারি</p>
                <p className="text-[10px] text-white/60">সারাদেশে বিনামূল্যে</p>
              </div>
              <div>
                <RotateCcw className="h-5 w-5 mx-auto mb-1 text-amber-300" />
                <p className="text-xs font-semibold">ইজি রিটার্ন</p>
                <p className="text-[10px] text-white/60">পছন্দ না হলে ফেরত</p>
              </div>
              <div>
                <ShieldCheck className="h-5 w-5 mx-auto mb-1 text-amber-300" />
                <p className="text-xs font-semibold">১০০% গ্যারান্টি</p>
                <p className="text-[10px] text-white/60">মান নিশ্চিত</p>
              </div>
            </div>

            <p className="mt-6 text-white/70 text-xs max-w-md mx-auto leading-relaxed">
              প্রোডাক্ট হাতে পেয়ে ভালো লাগলে রেখে দিন, আর ভালো না লাগলে কেবল ডেলিভারি চার্জ দিয়ে রিটার্ন করে দিন — একদম নিশ্চিন্তে অর্ডার করুন! ✅
            </p>
          </div>
        </section>
      )}

      {/* Testimonials */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[#333] text-center mb-8">
            সম্মানিত কাস্টমারদের ফিডব্যাক
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: "মাইনুল হাসান", text: "আপনাদের তালের গুড়ের মান আসলেই প্রিমিয়াম। ধন্যবাদ আপনাদের। ❤️" },
              { name: "কামরুল হাসান", text: "গুড়টা তাজা আছে, স্বাদও অসাধারণ! 🔥" },
              { name: "শানজাতুল হক", text: "গুড় খুবই ভালো মানের ★★★ ধন্যবাদ" },
              { name: "তাজুল ইসলাম", text: "কোয়ালিটি অনেক ভালো। পরিবারের সবাই খুব পছন্দ করেছে।" },
            ].map((t, i) => (
              <div key={i} className="bg-[#f8f5f0] border border-[#e8e0d4] rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#1a7a2e] text-white flex items-center justify-center font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#333]">{t.name}</p>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className="h-3 w-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-[#666] leading-relaxed">{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {cta && (
        <section className="py-12 md:py-16 bg-[#fdf6ee]">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <span className="text-5xl block mb-4">{cta.icon}</span>
            <h2 className="text-2xl md:text-3xl font-bold text-[#333] mb-3">{cta.title}</h2>
            <p className="text-[#888] text-base mb-6">{cta.content}</p>
            {contactNumber && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href={`tel:${contactNumber}`}>
                  <Button size="lg" className="gap-2 bg-[#1a7a2e] hover:bg-[#15661f] text-white px-8 py-6 text-lg rounded-full font-bold">
                    <Phone className="h-5 w-5" /> কল করুন
                  </Button>
                </a>
                <a href={`https://wa.me/${contactNumber.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="gap-2 border-[#1a7a2e] text-[#1a7a2e] hover:bg-[#1a7a2e] hover:text-white px-8 py-6 text-lg rounded-full font-bold">
                    হোয়াটসঅ্যাপ
                  </Button>
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Sticky Bottom CTA */}
      {contactNumber && products && products.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a7a2e] shadow-[0_-4px_20px_rgba(0,0,0,0.2)] py-3 px-4">
          <a href={`tel:${contactNumber}`} className="block max-w-lg mx-auto">
            <Button className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white py-5 text-base rounded-full font-bold shadow-lg">
              <ClipboardCheck className="h-5 w-5" /> অর্ডার করুন — ৳{toBn(products[0]?.discount_price || products[0]?.price || 0)}
            </Button>
          </a>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#e8e0d4] py-6 pb-20 text-center text-[#888] text-sm bg-white">
        © কে এম প্রডাক্ট
      </footer>
    </div>
  );
};

export default TalerGurLanding;
