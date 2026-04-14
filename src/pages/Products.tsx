import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Phone, ShoppingCart, Check, ChevronDown, Star, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

const Products = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-products"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").single();
      return data;
    },
  });

  const hero = sections?.find((s: any) => s.section_key === "hero");
  const benefits = sections?.filter((s: any) => s.section_key.startsWith("benefit_")) ?? [];
  const qualities = sections?.filter((s: any) => s.section_key.startsWith("quality_")) ?? [];
  const faqs = sections?.filter((s: any) => s.section_key.startsWith("faq_")) ?? [];
  const testimonials = sections?.filter((s: any) => s.section_key.startsWith("testimonial_")) ?? [];
  const cta = sections?.find((s: any) => s.section_key === "cta");

  const contactPhone = products?.[0]?.contact_info || siteSettings?.contact_phone || "";
  const whatsappNo = siteSettings?.whatsapp_no || contactPhone;

  return (
    <div className="min-h-screen bg-[#f5f5f0]" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>

      {/* Hero Section - Green gradient */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#1a7a2e] via-[#1b8a30] to-[#22a83a]">
        {/* Decorative circles */}
        <div className="absolute top-0 left-0 w-40 h-40 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-60 h-60 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />

        <div className="relative max-w-lg mx-auto px-4 pt-6 pb-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4">
            <span className="w-2 h-2 bg-yellow-400 rounded-full" />
            <span className="text-white/90 text-xs font-medium">
              {hero?.icon || "সরাসরি সৌদি থেকে আমদানিকৃত"}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
            {hero?.title || "সুক্কারী মুফাত্তাল — রাজকীয় স্বাদের সেরা খেজুর"}
          </h1>

          {/* Product image */}
          {hero?.image_url && (
            <div className="relative mt-4 mb-4">
              <img
                src={hero.image_url}
                alt={hero.title || "প্রডাক্ট"}
                className="mx-auto w-full max-w-sm rounded-2xl shadow-2xl object-cover"
              />
              {/* Premium badge */}
              <div className="absolute top-3 right-3 bg-yellow-400 text-green-900 text-xs font-bold px-3 py-1 rounded-lg shadow-md">
                <div className="text-[10px] uppercase tracking-wider">PREMIUM</div>
                <div className="text-sm">১০০% অর্গানিক</div>
              </div>
            </div>
          )}

          <p className="text-white/80 text-sm leading-relaxed mb-5 max-w-md mx-auto">
            {hero?.content || "প্রতিদিনের পুষ্টি ও শক্তির জন্য সেরা নির্বাচন। ১০০% ফ্রেশ, স্বাস্থ্যকর এবং পরিবারের জন্য নিরাপদ সরাসরি সৌদি থেকে আমদানিকৃত খেজুর!"}
          </p>

          {/* Order button */}
          <a href={contactPhone ? `tel:${contactPhone}` : "#products-section"}>
            <Button className="w-full max-w-sm bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold text-lg py-6 rounded-full shadow-lg gap-2">
              <ShoppingCart className="h-5 w-5" /> অর্ডার করতে চাই
            </Button>
          </a>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mt-5">
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center">
                {[1,2,3,4,5].map(i => <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />)}
              </div>
              <span className="text-white/70 text-xs font-medium">৪.৯/৫</span>
            </div>
            <div className="text-center">
              <div className="text-white font-bold text-lg">১০,০০০+</div>
              <span className="text-white/70 text-xs">সফল ডেলিভারি</span>
            </div>
          </div>
        </div>
      </section>

      {/* Why choose us / Qualities Section */}
      {qualities.length > 0 && (
        <section className="py-10 px-4">
          <div className="max-w-lg mx-auto">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 text-center mb-8">
              কেন সুক্কারী মুফাত্তাল খেজুর নেবেন?
            </h2>
            <div className="space-y-3">
              {qualities.map((q: any) => (
                <div key={q.id} className="bg-white rounded-xl p-4 border-l-4 border-[#22a83a] shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#e8f5e9] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-lg">{q.icon || <Check className="h-4 w-4 text-[#22a83a]" />}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{q.title}</h3>
                      <p className="text-gray-600 text-xs mt-1 leading-relaxed">{q.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order button */}
            <a href={contactPhone ? `tel:${contactPhone}` : "#products-section"}>
              <Button className="w-full mt-6 bg-[#22a83a] hover:bg-[#1b8a30] text-white font-bold text-base py-5 rounded-full shadow-lg gap-2">
                <ShoppingCart className="h-5 w-5" /> অর্ডার করতে চাই
              </Button>
            </a>
          </div>
        </section>
      )}

      {/* Product image + Why different */}
      {products && products.length > 0 && (
        <section className="py-10 px-4 bg-gradient-to-b from-[#f5f5f0] to-[#e8f5e9]" id="products-section">
          <div className="max-w-lg mx-auto">
            {/* Product cards */}
            {products.map((product: any) => (
              <div key={product.id} className="mb-6">
                <div className="relative bg-[#e0e0d8] rounded-2xl overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square flex items-center justify-center">
                      <ShoppingBag className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                  {/* Badge */}
                  <div className="absolute bottom-4 right-4">
                    <div className="bg-yellow-400 text-green-900 text-xs font-bold px-3 py-2 rounded-lg shadow-md text-center">
                      <div className="text-[10px] uppercase tracking-wider">TOP RATED</div>
                      <div className="text-sm">১০০% ফ্রেশ</div>
                    </div>
                  </div>
                </div>

                {/* Product info */}
                <div className="mt-4 text-center">
                  <h3 className="font-bold text-lg text-gray-900">{product.name}</h3>
                  {product.description && (
                    <p className="text-gray-600 text-sm mt-1">{product.description}</p>
                  )}
                  <div className="flex items-center justify-center gap-2 mt-2">
                    {product.discount_price ? (
                      <>
                        <span className="text-xl font-bold text-[#22a83a]">৳{toBn(product.discount_price)}</span>
                        <span className="text-sm text-gray-400 line-through">৳{toBn(product.price)}</span>
                      </>
                    ) : (
                      <span className="text-xl font-bold text-[#22a83a]">৳{toBn(product.price)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Why different */}
            <div className="mt-8 text-center">
              <span className="text-xs font-semibold text-[#22a83a] uppercase tracking-wider">WHY CHOOSE US</span>
              <h2 className="text-xl font-bold text-gray-900 mt-2 mb-6">
                কেন আমরা অন্য সবার থেকে <span className="text-[#22a83a]">আলাদা?</span>
              </h2>
              <div className="space-y-3 text-left">
                {(benefits.length > 0 ? benefits.slice(0, 4) : [
                  { id: '1', content: 'আমাদের খেজুরগুলো সম্পূর্ণভাবে কেমিক্যালমুক্ত এবং চিনি ছাড়া।' },
                  { id: '2', content: 'নতুন সিজনের ফ্রেশ কোয়ালিটির খেজুরা' },
                  { id: '3', content: 'খেজুরগুলো ফ্রেশবারে এবং ফ্রেশ তাই পরিবারে সবাই পছন্দ করবো' },
                  { id: '4', content: 'স্বাদ, গুণ এবং মান নিশ্চিত করে আমরা খেজুরগুলো সংগ্রহ করি' },
                ]).map((b: any) => (
                  <div key={b.id} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#22a83a] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{b.content || b.title}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Order button */}
            <a href={contactPhone ? `tel:${contactPhone}` : "#"}>
              <Button className="w-full mt-6 bg-[#22a83a] hover:bg-[#1b8a30] text-white font-bold text-base py-5 rounded-full shadow-lg gap-2">
                <ShoppingCart className="h-5 w-5" /> অর্ডার করতে চাই
              </Button>
            </a>
          </div>
        </section>
      )}

      {/* Benefits / উপকারিতা Section */}
      {benefits.length > 0 && (
        <section className="py-10 px-4">
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-1 h-8 bg-[#22a83a] rounded-full" />
                সুক্কারি খেজুরের <span className="text-[#22a83a]">উপকারিতা</span>
              </h2>
              <div className="space-y-4">
                {benefits.map((b: any, i: number) => (
                  <div key={b.id} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#22a83a] flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                      {toBn(i + 1)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{b.title}</h3>
                      <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{b.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FAQ Section */}
      {faqs.length > 0 && (
        <section className="py-10 px-4 bg-white">
          <div className="max-w-lg mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-1 h-8 bg-[#22a83a] rounded-full" />
              সাধারণ কিছু <span className="text-[#22a83a]">জিজ্ঞাসা</span>
            </h2>
            <div className="space-y-3">
              {faqs.map((faq: any, i: number) => (
                <div key={faq.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <span className="font-semibold text-gray-900 text-sm pr-4">
                      {toBn(i + 1)}. {faq.title}
                    </span>
                    <ChevronDown className={`h-5 w-5 text-[#22a83a] flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && faq.content && (
                    <div className="px-4 pb-4 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-3">
                      {faq.content}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Order button */}
            <a href={contactPhone ? `tel:${contactPhone}` : "#"}>
              <Button className="w-full mt-6 bg-[#22a83a] hover:bg-[#1b8a30] text-white font-bold text-base py-5 rounded-full shadow-lg gap-2">
                <ShoppingCart className="h-5 w-5" /> অর্ডার করতে চাই
              </Button>
            </a>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      {testimonials.length > 0 && (
        <section className="py-10 px-4">
          <div className="max-w-lg mx-auto">
            <h2 className="text-xl font-bold text-gray-900 text-center mb-6">
              সম্মানিত <span className="text-[#22a83a]">কাস্টমারদের</span> ফিডব্যাক
            </h2>
            <div className="space-y-4">
              {testimonials.map((t: any) => (
                <div key={t.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-start gap-3">
                    {t.image_url ? (
                      <img src={t.image_url} alt={t.title || ""} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#e8f5e9] flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="h-5 w-5 text-[#22a83a]" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{t.title}</h4>
                      <p className="text-gray-600 text-xs mt-1 leading-relaxed">{t.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-10 px-4">
        <div className="max-w-lg mx-auto">
          <div className="bg-gradient-to-br from-[#1a7a2e] via-[#1b8a30] to-[#22a83a] rounded-3xl p-6 text-center shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -translate-x-1/2 translate-y-1/2" />

            <div className="relative">
              <h2 className="text-lg font-bold text-yellow-300 mb-4 leading-tight">
                {cta?.title || "সেরা কোয়ালিটির সুক্কারী মুফাত্তাল এখনই অর্ডার করতে নিচের বাটনে ক্লিক করুন"}
              </h2>

              {/* Order button */}
              <a href={contactPhone ? `tel:${contactPhone}` : "#"}>
                <Button className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold text-base py-5 rounded-xl shadow-lg gap-2 mb-3">
                  <ShoppingCart className="h-5 w-5" /> অর্ডার করতে চাই
                </Button>
              </a>

              {/* Call button */}
              {contactPhone && (
                <a href={`tel:${contactPhone}`} className="block">
                  <Button className="w-full bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold text-sm py-4 rounded-xl gap-2 mb-2">
                    <Phone className="h-4 w-4" /> কল করুন
                  </Button>
                </a>
              )}

              {/* WhatsApp button */}
              {whatsappNo && (
                <a href={`https://wa.me/${whatsappNo.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="block">
                  <Button className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm py-4 rounded-xl gap-2 mb-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.687-1.228A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.24 0-4.326-.72-6.022-1.94l-.42-.317-2.788.73.746-2.727-.347-.553A9.962 9.962 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                    হোয়াটসঅ্যাপ
                  </Button>
                </a>
              )}

              {/* Facebook button */}
              {siteSettings?.facebook_url && (
                <a href={siteSettings.facebook_url} target="_blank" rel="noopener noreferrer" className="block">
                  <Button className="w-full bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-sm py-4 rounded-xl gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    ফেসবুক পেজ
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1a7a2e] py-4 text-center text-white/60 text-xs">
        © কে এম প্রডাক্ট
      </footer>
    </div>
  );
};

export default Products;
