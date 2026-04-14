import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Phone, ShoppingCart, Check, ChevronDown, Star, MessageCircle, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

const Products = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderForm, setOrderForm] = useState({ name: "", phone: "", address: "" });
  const [phoneError, setPhoneError] = useState("");

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

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    setOrderForm(f => ({ ...f, phone: digits }));
    if (digits.length > 0 && digits.length !== 11) {
      setPhoneError("মোবাইল নম্বর অবশ্যই ১১ ডিজিটের হতে হবে");
    } else {
      setPhoneError("");
    }
  };

  const handleOrderSubmit = async () => {
    if (!orderForm.name.trim()) { toast.error("আপনার নাম দিন"); return; }
    if (orderForm.phone.length !== 11) { setPhoneError("মোবাইল নম্বর অবশ্যই ১১ ডিজিটের হতে হবে"); return; }
    if (!orderForm.address.trim()) { toast.error("আপনার ঠিকানা দিন"); return; }

    setSubmitting(true);
    try {
      const productName = products?.[0]?.name || "প্রডাক্ট";
      const unitPrice = products?.[0]?.discount_price || products?.[0]?.price || 0;
      const { error } = await supabase.from("orders").insert({
        customer_name: orderForm.name.trim(),
        customer_phone: orderForm.phone,
        customer_address: orderForm.address.trim(),
        product_name: productName,
        quantity: 1,
        unit_price: unitPrice,
        total_amount: unitPrice,
      });
      if (error) throw error;
      setOrderSuccess(true);
      setOrderForm({ name: "", phone: "", address: "" });
    } catch (err: any) {
      toast.error("অর্ডার করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setSubmitting(false);
    }
  };

  // Save abandoned order when user closes popup with phone number entered
  const closeOrderDialog = async () => {
    if (!orderSuccess && orderForm.phone.length === 11) {
      try {
        const productName = products?.[0]?.name || "প্রডাক্ট";
        await supabase.from("orders").insert({
          customer_name: orderForm.name.trim() || "অজানা",
          customer_phone: orderForm.phone,
          customer_address: orderForm.address.trim() || null,
          product_name: productName,
          quantity: 1,
          unit_price: 0,
          total_amount: 0,
          status: "abandoned" as any,
        });
      } catch (_) {}
    }
    setOrderOpen(false);
    setOrderForm({ name: "", phone: "", address: "" });
  };

  const openOrderDialog = () => {
    setOrderSuccess(false);
    setPhoneError("");
    setOrderOpen(true);
  };

  // Reusable order button
  const OrderButton = ({ variant = "green" }: { variant?: "green" | "yellow" | "white" }) => {
    const styles = {
      green: "bg-[#22a83a] hover:bg-[#1b8a30] text-white",
      yellow: "bg-yellow-400 hover:bg-yellow-500 text-green-900",
      white: "bg-white hover:bg-gray-100 text-gray-900",
    };
    return (
      <Button
        onClick={openOrderDialog}
        className={`w-full font-bold text-base py-5 rounded-full shadow-lg gap-2 ${styles[variant]}`}
      >
        <ShoppingCart className="h-5 w-5" /> অর্ডার করতে চাই
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0]" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#1a7a2e] via-[#1b8a30] to-[#22a83a]">
        <div className="absolute top-0 left-0 w-40 h-40 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-60 h-60 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
        <div className="relative max-w-lg mx-auto px-4 pt-6 pb-8 text-center">
          <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4">
            <span className="w-2 h-2 bg-yellow-400 rounded-full" />
            <span className="text-white/90 text-xs font-medium">
              {hero?.icon || "সরাসরি সৌদি থেকে আমদানিকৃত"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
            {hero?.title || "সুক্কারী মুফাত্তাল — রাজকীয় স্বাদের সেরা খেজুর"}
          </h1>
          {hero?.image_url && (
            <div className="relative mt-4 mb-4">
              <img src={hero.image_url} alt={hero.title || "প্রডাক্ট"} className="mx-auto w-full max-w-sm rounded-2xl shadow-2xl object-cover" />
              <div className="absolute top-3 right-3 bg-yellow-400 text-green-900 text-xs font-bold px-3 py-1 rounded-lg shadow-md">
                <div className="text-[10px] uppercase tracking-wider">PREMIUM</div>
                <div className="text-sm">১০০% অর্গানিক</div>
              </div>
            </div>
          )}
          <p className="text-white/80 text-sm leading-relaxed mb-5 max-w-md mx-auto">
            {hero?.content || "প্রতিদিনের পুষ্টি ও শক্তির জন্য সেরা নির্বাচন।"}
          </p>
          <OrderButton variant="yellow" />
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

      {/* Qualities Section */}
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
            <div className="mt-6"><OrderButton /></div>
          </div>
        </section>
      )}

      {/* Products + Why different */}
      {products && products.length > 0 && (
        <section className="py-10 px-4 bg-gradient-to-b from-[#f5f5f0] to-[#e8f5e9]" id="products-section">
          <div className="max-w-lg mx-auto">
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
                  <div className="absolute bottom-4 right-4">
                    <div className="bg-yellow-400 text-green-900 text-xs font-bold px-3 py-2 rounded-lg shadow-md text-center">
                      <div className="text-[10px] uppercase tracking-wider">TOP RATED</div>
                      <div className="text-sm">১০০% ফ্রেশ</div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <h3 className="font-bold text-lg text-gray-900">{product.name}</h3>
                  {product.description && <p className="text-gray-600 text-sm mt-1">{product.description}</p>}
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
            <div className="mt-6"><OrderButton /></div>
          </div>
        </section>
      )}

      {/* Benefits */}
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
            <div className="mt-6"><OrderButton /></div>
          </div>
        </section>
      )}

      {/* FAQ */}
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
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left">
                    <span className="font-semibold text-gray-900 text-sm pr-4">{toBn(i + 1)}. {faq.title}</span>
                    <ChevronDown className={`h-5 w-5 text-[#22a83a] flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && faq.content && (
                    <div className="px-4 pb-4 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-3">{faq.content}</div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6"><OrderButton /></div>
          </div>
        </section>
      )}

      {/* Testimonials */}
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
            <div className="mt-6"><OrderButton /></div>
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
              <OrderButton variant="white" />
              {contactPhone && (
                <a href={`tel:${contactPhone}`} className="block mt-3">
                  <Button className="w-full bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold text-sm py-4 rounded-xl gap-2">
                    <Phone className="h-4 w-4" /> কল করুন
                  </Button>
                </a>
              )}
              {whatsappNo && (
                <a href={`https://wa.me/${whatsappNo.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="block mt-2">
                  <Button className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm py-4 rounded-xl gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.687-1.228A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.24 0-4.326-.72-6.022-1.94l-.42-.317-2.788.73.746-2.727-.347-.553A9.962 9.962 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                    হোয়াটসঅ্যাপ
                  </Button>
                </a>
              )}
              {siteSettings?.facebook_url && (
                <a href={siteSettings.facebook_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
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

      <footer className="bg-[#1a7a2e] py-4 text-center text-white/60 text-xs">
        © কে এম প্রডাক্ট
      </footer>

      {/* Order Popup */}
      {orderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setOrderOpen(false)}>
          <div
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {orderSuccess ? (
              <div className="p-8 text-center">
                <div className="relative w-20 h-20 mx-auto mb-5">
                  <div className="absolute inset-0 bg-[#22a83a]/20 rounded-full animate-ping" />
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#22a83a] to-[#1b8a30] flex items-center justify-center shadow-lg">
                    <CheckCircle className="h-10 w-10 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">অর্ডার সফল হয়েছে! 🎉</h3>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">আমরা শীঘ্রই আপনার সাথে যোগাযোগ করবো।<br/>ধন্যবাদ আমাদের বেছে নেওয়ার জন্য!</p>
                <Button onClick={() => setOrderOpen(false)} className="w-full bg-gradient-to-r from-[#1a7a2e] to-[#22a83a] hover:from-[#166d27] hover:to-[#1b8a30] text-white font-bold py-4 rounded-2xl text-base shadow-lg">
                  ঠিক আছে
                </Button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="relative bg-gradient-to-r from-[#1a7a2e] via-[#1f9535] to-[#22a83a] px-5 py-5">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2" />
                  <div className="flex items-center justify-between relative">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <ShoppingCart className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">অর্ডার করুন</h3>
                        <p className="text-white/60 text-xs">তথ্য দিয়ে অর্ডার কনফার্ম করুন</p>
                      </div>
                    </div>
                    <button onClick={() => setOrderOpen(false)} className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/25 hover:text-white transition-all">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Form */}
                <div className="p-5 space-y-5">
                  <div>
                    <Label className="text-gray-800 font-bold text-sm mb-2 block">আপনার নাম <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        value={orderForm.name}
                        onChange={e => setOrderForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="আপনার পুরো নাম লিখুন"
                        className="h-12 rounded-2xl border-2 border-gray-200 bg-gray-50/50 pl-4 text-gray-900 placeholder:text-gray-400 focus:border-[#22a83a] focus:bg-white focus:ring-2 focus:ring-[#22a83a]/20 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-800 font-bold text-sm mb-2 block">মোবাইল নম্বর <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        value={orderForm.phone}
                        onChange={e => handlePhoneChange(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        maxLength={11}
                        className={`h-12 rounded-2xl border-2 bg-gray-50/50 pl-4 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 transition-all ${
                          phoneError ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-[#22a83a] focus:ring-[#22a83a]/20'
                        }`}
                      />
                    </div>
                    {phoneError && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                        <span className="w-1 h-1 bg-red-500 rounded-full" /> {phoneError}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-gray-400 text-xs">১১ ডিজিটের মোবাইল নম্বর দিন</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        orderForm.phone.length === 11 ? 'bg-green-100 text-green-700' : orderForm.phone.length > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {toBn(orderForm.phone.length)}/১১
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-800 font-bold text-sm mb-2 block">ঠিকানা <span className="text-red-500">*</span></Label>
                    <Textarea
                      value={orderForm.address}
                      onChange={e => setOrderForm(f => ({ ...f, address: e.target.value }))}
                      placeholder="আপনার সম্পূর্ণ ঠিকানা লিখুন"
                      rows={3}
                      className="rounded-2xl border-2 border-gray-200 bg-gray-50/50 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-[#22a83a] focus:bg-white focus:ring-2 focus:ring-[#22a83a]/20 transition-all resize-none"
                    />
                  </div>

                  <Button
                    onClick={handleOrderSubmit}
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-[#1a7a2e] to-[#22a83a] hover:from-[#166d27] hover:to-[#1b8a30] text-white font-bold text-base h-14 rounded-2xl gap-2 shadow-lg shadow-green-500/25 transition-all disabled:opacity-60"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {submitting ? "অর্ডার হচ্ছে..." : "অর্ডার কনফার্ম করুন"}
                  </Button>

                  <p className="text-center text-gray-400 text-xs">
                    🔒 আপনার তথ্য সম্পূর্ণ নিরাপদ
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
