import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Phone, ShoppingCart, Search, X, CheckCircle, Menu, Tag, Truck, ShieldCheck, Star, MessageCircle, User, LogIn, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useShopCustomer } from "@/hooks/useShopCustomer";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useCart } from "@/hooks/useCart";
import { useDeliverySettings } from "@/hooks/useDeliverySettings";
import { calculateDelivery } from "@/lib/delivery";
import { Truck as TruckIcon } from "lucide-react";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

const BRAND_GREEN = "#1f7a3a";
const BRAND_DARK = "#155c2c";
const ACCENT_RED = "#d6302c";

const Products = () => {
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderForm, setOrderForm] = useState({ name: "", phone: "", address: "", payment_method: "cod" as "cod" | "bkash" | "nagad" | "rocket", payment_sender_no: "", payment_trx_id: "" });
  const [phoneError, setPhoneError] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number>(-1);
  const [quantity, setQuantity] = useState<number>(1);
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroSlide, setHeroSlide] = useState(0);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const { customer: shopCustomer } = useShopCustomer();
  const { data: categoryData } = useProductCategories();
  const categoryTree = categoryData?.tree ?? [];
  const cart = useCart();
  const { settings: deliverySettings } = useDeliverySettings();

  const addProductToCart = (p: any, qty = 1, variantIdx = -1) => {
    const variants = Array.isArray(p?.variants) ? p.variants : [];
    const chosen = variants.length > 0 && variantIdx >= 0 ? variants[variantIdx] : null;
    if (variants.length > 0 && !chosen) {
      toast.error("একটি অপশন বাছাই করুন");
      return false;
    }
    const unitPrice = chosen
      ? Number(chosen.discount_price ?? chosen.price ?? 0)
      : Number(p?.discount_price || p?.price || 0);
    const variantWeight = chosen && chosen.weight_grams != null ? Number(chosen.weight_grams) : null;
    const weightGrams = variantWeight && variantWeight > 0 ? variantWeight : Number(p?.weight_grams || 0);
    cart.addItem({
      product_id: p.id,
      product_name: p.name,
      image_url: p.image_url,
      variant_label: chosen ? String(chosen.label) : null,
      unit_price: unitPrice,
      quantity: qty,
      unit_type: p.unit_type ?? null,
      weight_grams: weightGrams,
    });
    toast.success("কার্টে যুক্ত হয়েছে");
    return true;
  };

  const { data: products } = useQuery({
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

  useEffect(() => {
    const slides = (products || []).filter((p: any) => p.image_url).slice(0, 8);
    if (slides.length < 2) return;
    const id = setInterval(() => setHeroSlide((s) => (s + 1) % slides.length), 3000);
    return () => clearInterval(id);
  }, [products]);

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-products"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").single();
      return data;
    },
  });

  const contactPhone = siteSettings?.contact_phone || "";
  const whatsappNo = siteSettings?.whatsapp_no || contactPhone;

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter((p: any) =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q)
    );
  }, [products, search]);

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

    const variants = Array.isArray(selectedProduct?.variants) ? selectedProduct.variants : [];
    if (variants.length > 0 && selectedVariantIdx < 0) {
      toast.error("একটি অপশন বাছাই করুন");
      return;
    }
    const chosen = variants.length > 0 ? variants[selectedVariantIdx] : null;
    const unitPrice = chosen
      ? Number(chosen.discount_price ?? chosen.price ?? 0)
      : Number(selectedProduct?.discount_price || selectedProduct?.price || 0);
    const variantLabel = chosen ? String(chosen.label) : null;
    const qty = Math.max(1, Number(quantity) || 1);

    setSubmitting(true);
    try {
      const productName = selectedProduct?.name || "প্রডাক্ট";
      const subtotal = unitPrice * qty;
      const variantWeight = chosen && (chosen as any).weight_grams != null ? Number((chosen as any).weight_grams) : null;
      const wPer = variantWeight && variantWeight > 0 ? variantWeight : Number(selectedProduct?.weight_grams || 0);
      const totalWeight = wPer * qty;
      const dlv = calculateDelivery(subtotal, totalWeight, deliverySettings);
      const { error } = await supabase.from("orders").insert({
        customer_name: orderForm.name.trim(),
        customer_phone: orderForm.phone,
        customer_address: orderForm.address.trim(),
        product_name: variantLabel ? `${productName} (${variantLabel})` : productName,
        variant_label: variantLabel,
        quantity: qty,
        unit_price: unitPrice,
        total_amount: subtotal + dlv.charge,
        delivery_charge: dlv.charge,
        payment_method: "cod",
        shop_customer_id: shopCustomer?.id ?? null,
      } as any);
      if (error) throw error;
      setOrderSuccess(true);
      setOrderForm({ name: "", phone: "", address: "" });
    } catch {
      toast.error("অর্ডার করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setSubmitting(false);
    }
  };

  const closeOrderDialog = async () => {
    if (!orderSuccess && orderForm.phone.length === 11) {
      try {
        await supabase.from("orders").insert({
          customer_name: orderForm.name.trim() || "অজানা",
          customer_phone: orderForm.phone,
          customer_address: orderForm.address.trim() || null,
          product_name: selectedProduct?.name || "প্রডাক্ট",
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

  const openOrderDialog = (product: any) => {
    setSelectedProduct(product);
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    setSelectedVariantIdx(variants.length > 0 ? 0 : -1);
    setQuantity(1);
    setOrderSuccess(false);
    setPhoneError("");
    setOrderOpen(true);
  };

  const featured = filteredProducts.slice(0, 8);

  return (
    <div className="min-h-screen bg-[#f7f5ee]" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>

      {/* Top Strip */}
      <div className="text-white text-xs md:text-sm py-2 px-4" style={{ backgroundColor: BRAND_GREEN }}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center">
          <span>আমাদের যে কোন পণ্য অর্ডার করতে WhatsApp করুন:</span>
          {whatsappNo && (
            <a href={`https://wa.me/${whatsappNo.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="font-bold hover:underline">
              +{whatsappNo}
            </a>
          )}
          {contactPhone && (
            <>
              <span className="hidden md:inline opacity-60">|</span>
              <span>বা কল করুন:</span>
              <a href={`tel:${contactPhone}`} className="font-bold hover:underline">{contactPhone}</a>
            </>
          )}
        </div>
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/products" className="flex items-center gap-2 shrink-0 hover:opacity-90 transition-opacity">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: BRAND_GREEN }}>
              KM
            </div>
            <div className="hidden sm:block">
              <div className="font-bold text-base md:text-lg" style={{ color: BRAND_GREEN }}>কে এম শপ</div>
              <div className="text-[10px] md:text-xs text-gray-500 -mt-0.5">KM Shop · কুয়াকাটা</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-sm font-semibold text-gray-700">
            <Link to="/products" className="hover:text-gray-900 flex items-center gap-1"><Home className="h-4 w-4" /> HOME</Link>
            <a href="#shop" className="hover:text-gray-900">SHOP</a>
            <a href="#categories" className="hover:text-gray-900">ক্যাটাগরি</a>
            <a href="#about" className="hover:text-gray-900">ABOUT</a>
            <a href="#contact" className="hover:text-gray-900">CONTACT</a>
            <button
              onClick={() => featured[0] && openOrderDialog(featured[0])}
              className="text-white font-bold text-xs px-4 py-2 rounded-full flex items-center gap-1.5 shadow"
              style={{ backgroundColor: ACCENT_RED }}
            >
              🔥 OFFER
            </button>
            {shopCustomer ? (
              <Link
                to="/shop/account"
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-full border-2 font-bold"
                style={{ borderColor: BRAND_GREEN, color: BRAND_GREEN }}
              >
                <User className="h-3.5 w-3.5" />
                {shopCustomer.full_name?.split(" ")[0] || "অ্যাকাউন্ট"}
              </Link>
            ) : (
              <Link
                to="/shop/login"
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-full border-2 font-bold hover:bg-gray-50"
                style={{ borderColor: BRAND_GREEN, color: BRAND_GREEN }}
              >
                <LogIn className="h-3.5 w-3.5" /> লগইন
              </Link>
            )}
            <button
              onClick={cart.open}
              className="relative flex items-center gap-1.5 text-xs px-3 py-2 rounded-full font-bold text-white"
              style={{ backgroundColor: BRAND_GREEN }}
              aria-label="cart"
            >
              <ShoppingCart className="h-3.5 w-3.5" /> কার্ট
              {cart.count > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                  {toBn(cart.count)}
                </span>
              )}
            </button>
          </nav>

          <div className="hidden lg:flex items-center bg-gray-100 rounded-full px-4 py-2 w-72">
            <Search className="h-4 w-4 text-gray-400 mr-2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="পণ্য খুঁজুন..."
              className="bg-transparent flex-1 text-sm outline-none"
            />
          </div>

          <div className="md:hidden flex items-center gap-1">
            <button onClick={cart.open} className="relative p-2 rounded-lg hover:bg-gray-100" aria-label="cart">
              <ShoppingCart className="h-5 w-5" style={{ color: BRAND_GREEN }} />
              {cart.count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center">
                  {toBn(cart.count)}
                </span>
              )}
            </button>
            <Link
              to={shopCustomer ? "/shop/account" : "/shop/login"}
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label="login"
            >
              <User className="h-5 w-5" style={{ color: BRAND_GREEN }} />
            </Link>
            <button onClick={() => setMobileMenuOpen(v => !v)} className="p-2 rounded-lg hover:bg-gray-100">
              <Menu className="h-5 w-5 text-gray-700" />
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white px-4 py-3 space-y-2">
            <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">
              <Search className="h-4 w-4 text-gray-400 mr-2" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="পণ্য খুঁজুন..."
                className="bg-transparent flex-1 text-sm outline-none"
              />
            </div>
            <Link to="/products" className="block py-2 text-sm font-semibold flex items-center gap-1.5"><Home className="h-4 w-4" /> HOME</Link>
            <a href="#shop" className="block py-2 text-sm font-semibold">SHOP</a>
            <a href="#categories" className="block py-2 text-sm font-semibold">ক্যাটাগরি</a>
            <a href="#about" className="block py-2 text-sm font-semibold">ABOUT</a>
            <a href="#contact" className="block py-2 text-sm font-semibold">CONTACT</a>
          </div>
        )}

        {/* Categories Mega Bar */}
        <div className="hidden md:block border-t bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <ul className="flex items-stretch gap-1 text-sm font-semibold text-gray-700 overflow-x-auto">
              <li>
                <a href="#shop" className="flex items-center gap-1 px-3 py-3 hover:text-white hover:bg-[--g] transition-colors whitespace-nowrap" style={{ ['--g' as any]: BRAND_GREEN }}>
                  বেস্ট সেলার
                  <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">HOT</span>
                </a>
              </li>
              <li>
                <a href="#shop" className="flex items-center gap-1 px-3 py-3 hover:text-white hover:bg-[--g] transition-colors whitespace-nowrap" style={{ ['--g' as any]: BRAND_GREEN }}>নতুন কালেকশন</a>
              </li>
              {categoryTree.map((m) => (
                <li key={m.id} className="relative group">
                  <a
                    href="#shop"
                    className="flex items-center gap-1 px-3 py-3 hover:text-white hover:bg-[--g] transition-colors whitespace-nowrap"
                    style={{ ['--g' as any]: BRAND_GREEN }}
                  >
                    {m.icon && <span>{m.icon}</span>}
                    {m.label}
                    {m.children.length > 0 && <span className="text-xs">▾</span>}
                  </a>
                  {m.children.length > 0 && (
                    <div className="absolute left-0 top-full hidden group-hover:block bg-white shadow-xl border rounded-b-lg min-w-[220px] z-50 py-2">
                      {m.children.map((s) => (
                        <a
                          key={s.id}
                          href="#shop"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[--g]"
                          style={{ ['--g' as any]: BRAND_GREEN }}
                        >
                          {s.label}
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              ))}
              <li>
                <a href="#shop" className="flex items-center gap-1 px-3 py-3 hover:text-white hover:bg-[--g] transition-colors whitespace-nowrap" style={{ ['--g' as any]: BRAND_GREEN }}>সব পণ্য</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Mobile Categories Accordion */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white px-4 py-3 space-y-1 max-h-[60vh] overflow-y-auto">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">ক্যাটাগরি</div>
            <details className="group border-b">
              <summary className="flex items-center justify-between py-2 text-sm font-semibold cursor-pointer list-none">
                <span>বেস্ট সেলার</span>
              </summary>
            </details>
            <details className="group border-b">
              <summary className="flex items-center justify-between py-2 text-sm font-semibold cursor-pointer list-none">
                <span>নতুন কালেকশন</span>
              </summary>
            </details>
            {categoryTree.map((m) => (
              <details key={m.id} className="group border-b">
                <summary className="flex items-center justify-between py-2 text-sm font-semibold cursor-pointer list-none">
                  <span>{m.icon} {m.label}</span>
                  {m.children.length > 0 && <span className="text-xs text-gray-400 group-open:rotate-180 transition-transform">▾</span>}
                </summary>
                {m.children.length > 0 && (
                  <div className="pl-3 pb-2 space-y-1">
                    {m.children.map((s) => (
                      <a key={s.id} href="#shop" className="block py-1.5 text-xs text-gray-600">— {s.label}</a>
                    ))}
                  </div>
                )}
              </details>
            ))}
            <details className="group">
              <summary className="flex items-center justify-between py-2 text-sm font-semibold cursor-pointer list-none">
                <span>সব পণ্য</span>
              </summary>
            </details>
          </div>
        )}
      </header>

      {/* Hero Banner */}
      <section className="px-4 py-6 md:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden shadow-xl" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_50%,white,transparent_60%)]" />
            <div className="relative grid md:grid-cols-2 gap-6 items-center p-6 md:p-12">
              <div className="text-white text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-3 py-1 rounded-full text-xs mb-4">
                  <span className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse" />
                  কুয়াকাটার অথেনটিক পণ্য
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4">
                  প্রতিদিনের সুস্থতায় হোক<br />
                  <span className="text-yellow-300">খাঁটি পণ্য</span>
                </h1>
                <p className="text-white/85 text-sm md:text-base mb-6 max-w-md mx-auto md:mx-0">
                  সরাসরি কুয়াকাটার সমুদ্র সৈকত ও স্থানীয় কৃষক থেকে সংগ্রহ করা ১০০% খাঁটি ও তাজা পণ্য — শুঁটকি, মধু, তালের গুড়, হস্তশিল্প আরও অনেক কিছু।
                </p>
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  <a href="#shop">
                    <Button className="bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold rounded-full px-6 h-12 gap-2">
                      <ShoppingBag className="h-4 w-4" /> এখনই কিনুন
                    </Button>
                  </a>
                  {whatsappNo && (
                    <a href={`https://wa.me/${whatsappNo.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white font-bold rounded-full px-6 h-12 gap-2">
                        <Phone className="h-4 w-4" /> অর্ডার করুন
                      </Button>
                    </a>
                  )}
                </div>
              </div>
              <div className="relative hidden md:block">
                {(() => {
                  const slides = (products || []).filter((p: any) => p.image_url).slice(0, 8);
                  const current = slides[heroSlide % (slides.length || 1)];
                  return (
                    <>
                      <div className="aspect-square bg-white/10 rounded-3xl backdrop-blur border border-white/20 overflow-hidden relative">
                        {current ? (
                          <Link to={`/products/${current.id}`} className="block w-full h-full group">
                            {slides.map((p: any, i: number) => (
                              <img
                                key={p.id}
                                src={p.image_url}
                                alt={p.name}
                                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === (heroSlide % slides.length) ? 'opacity-100' : 'opacity-0'}`}
                              />
                            ))}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
                              <p className="font-bold text-lg line-clamp-1">{current.name}</p>
                              <p className="text-yellow-300 font-extrabold text-xl">
                                ৳{toBn(Number(current.discount_price ?? current.price ?? 0))}
                                {current.discount_price && current.discount_price < current.price && (
                                  <span className="text-xs line-through text-white/60 ml-2">৳{toBn(Number(current.price))}</span>
                                )}
                              </p>
                            </div>
                          </Link>
                        ) : (
                          <ShoppingBag className="h-32 w-32 text-white/30 m-auto" />
                        )}
                      </div>
                      {slides.length > 1 && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {slides.map((_: any, i: number) => (
                            <button
                              key={i}
                              onClick={() => setHeroSlide(i)}
                              className={`h-1.5 rounded-full transition-all ${i === (heroSlide % slides.length) ? 'w-6 bg-yellow-300' : 'w-1.5 bg-white/40'}`}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
                <div className="absolute -bottom-3 -left-3 bg-yellow-400 text-green-900 px-4 py-2 rounded-2xl shadow-lg font-bold text-sm">
                  ১০০% খাঁটি
                </div>
                <div className="absolute -top-3 -right-3 bg-white text-gray-900 px-4 py-2 rounded-2xl shadow-lg font-bold text-sm flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> ৪.৯
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="px-4 pb-2">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Truck, title: "দ্রুত ডেলিভারি", desc: "সারা দেশে" },
            { icon: ShieldCheck, title: "১০০% খাঁটি", desc: "গ্যারান্টি সহ" },
            { icon: Tag, title: "সেরা দাম", desc: "সরাসরি উৎস থেকে" },
            { icon: MessageCircle, title: "২৪/৭ সাপোর্ট", desc: "WhatsApp এ যোগাযোগ" },
          ].map((t, i) => (
            <div key={i} className="bg-white rounded-xl p-3 md:p-4 flex items-center gap-3 shadow-sm border border-gray-100">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${BRAND_GREEN}15` }}>
                <t.icon className="h-5 w-5" style={{ color: BRAND_GREEN }} />
              </div>
              <div>
                <div className="font-bold text-xs md:text-sm text-gray-900">{t.title}</div>
                <div className="text-[10px] md:text-xs text-gray-500">{t.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section id="shop" className="px-4 py-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: BRAND_GREEN }}>
              {showAllProducts ? "ALL PRODUCTS" : "FEATURED PRODUCTS"}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">
              {showAllProducts ? "ক্যাটাগরি অনুযায়ী সকল পণ্য" : "আমাদের সেরা পণ্য সমূহ"}
            </h2>
            <div className="w-16 h-1 mx-auto mt-3 rounded-full" style={{ backgroundColor: BRAND_GREEN }} />
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <ShoppingBag className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              কোনো পণ্য পাওয়া যায়নি
            </div>
          ) : (() => {
            const renderCard = (p: any) => {
              const hasDiscount = p.discount_price && p.discount_price < p.price;
              const discountPct = hasDiscount ? Math.round(((p.price - p.discount_price) / p.price) * 100) : 0;
              return (
                <div key={p.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 flex flex-col">
                  <Link to={`/products/${p.id}`} className="relative aspect-square bg-gray-100 overflow-hidden block">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                    {hasDiscount && (
                      <div className="absolute top-2 left-2 bg-white shadow text-red-600 font-bold text-xs px-2 py-1 rounded">
                        -{toBn(discountPct)}%
                      </div>
                    )}
                    <div className="absolute top-2 right-2 text-white text-[10px] font-bold px-2 py-1 rounded shadow" style={{ backgroundColor: ACCENT_RED }}>
                      HOT
                    </div>
                  </Link>
                  <div className="p-3 md:p-4 flex flex-col flex-1">
                    <Link to={`/products/${p.id}`} className="font-bold text-sm md:text-base text-gray-900 line-clamp-2 min-h-[2.5rem] hover:underline">{p.name}</Link>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-lg font-extrabold" style={{ color: BRAND_GREEN }}>
                        ৳{toBn(hasDiscount ? p.discount_price : p.price)}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-gray-400 line-through">৳{toBn(p.price)}</span>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => {
                          const variants = Array.isArray(p.variants) ? p.variants : [];
                          addProductToCart(p, 1, variants.length > 0 ? 0 : -1);
                        }}
                        variant="outline"
                        className="font-bold rounded-full text-xs h-10 gap-1 border-2"
                        style={{ borderColor: BRAND_GREEN, color: BRAND_GREEN }}
                      >
                        <ShoppingCart className="h-3.5 w-3.5" /> কার্টে
                      </Button>
                      <Button
                        onClick={() => openOrderDialog(p)}
                        className="text-white font-bold rounded-full text-xs h-10 gap-1"
                        style={{ backgroundColor: BRAND_GREEN }}
                      >
                        অর্ডার
                      </Button>
                    </div>
                  </div>
                </div>
              );
            };

            if (!showAllProducts) {
              const visible = filteredProducts.slice(0, 5);
              return (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                    {visible.map(renderCard)}
                  </div>
                  {filteredProducts.length > 5 && (
                    <div className="text-center mt-8">
                      <Button
                        onClick={() => setShowAllProducts(true)}
                        className="text-white font-bold rounded-full px-8 h-12 gap-2 shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}
                      >
                        আরো প্রডাক্ট দেখুন ({toBn(filteredProducts.length - 5)}টি)
                      </Button>
                    </div>
                  )}
                </>
              );
            }

            // Group by category
            const groups: Record<string, any[]> = {};
            filteredProducts.forEach((p: any) => {
              const cat = p.category || "অন্যান্য";
              if (!groups[cat]) groups[cat] = [];
              groups[cat].push(p);
            });
            const catNames = Object.keys(groups).sort();
            return (
              <div className="space-y-12">
                {catNames.map(cat => (
                  <div key={cat}>
                    <div className="flex items-center gap-3 mb-5">
                      <h3 className="text-xl md:text-2xl font-bold text-gray-900">{cat}</h3>
                      <span className="text-xs font-bold text-white px-2 py-1 rounded-full" style={{ backgroundColor: BRAND_GREEN }}>
                        {toBn(groups[cat].length)}
                      </span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                      {groups[cat].map(renderCard)}
                    </div>
                  </div>
                ))}
                <div className="text-center">
                  <Button
                    onClick={() => setShowAllProducts(false)}
                    variant="outline"
                    className="font-bold rounded-full px-8 h-12 border-2"
                    style={{ borderColor: BRAND_GREEN, color: BRAND_GREEN }}
                  >
                    ↑ কম দেখুন
                  </Button>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* About Strip */}
      <section id="about" className="px-4 py-12 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: BRAND_GREEN }}>ABOUT KM SHOP</span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2 mb-4">কুয়াকাটার ঐতিহ্য, আপনার দোরগোড়ায়</h2>
          <p className="text-gray-600 leading-relaxed max-w-3xl mx-auto">
            কে এম শপ কুয়াকাটার স্থানীয় কৃষক, জেলে ও কারিগরদের সাথে সরাসরি কাজ করে। আমাদের প্রতিটি পণ্য — শুঁটকি মাছ থেকে শুরু করে হস্তশিল্প, নারকেল পণ্য, তালের গুড় ও স্মৃতিচিহ্ন — যত্ন সহকারে বাছাই করা ও পরীক্ষিত। আমরা চাই কুয়াকাটার অথেনটিক স্বাদ ও সংস্কৃতি দেশের প্রতিটি কোণে পৌঁছে দিতে।
          </p>
        </div>
      </section>

      {/* Contact CTA */}
      <section id="contact" className="px-4 py-10">
        <div className="max-w-3xl mx-auto rounded-3xl p-8 text-center text-white shadow-xl" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
          <h2 className="text-xl md:text-2xl font-bold mb-2">এখনই যোগাযোগ করুন</h2>
          <p className="text-white/80 text-sm mb-5">যেকোনো প্রশ্ন বা অর্ডারের জন্য সরাসরি কল বা WhatsApp করুন</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {contactPhone && (
              <a href={`tel:${contactPhone}`}>
                <Button className="bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold rounded-full px-6 h-12 gap-2">
                  <Phone className="h-4 w-4" /> {contactPhone}
                </Button>
              </a>
            )}
            {whatsappNo && (
              <a href={`https://wa.me/${whatsappNo.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                <Button className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-full px-6 h-12 gap-2">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-white pt-10 pb-6 px-4" style={{ backgroundColor: BRAND_DARK }}>
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center font-bold">KM</div>
              <div className="font-bold text-lg">কে এম শপ</div>
            </div>
            <p className="text-white/70 leading-relaxed">কুয়াকাটার সেরা পণ্য সম্ভার, সরাসরি আপনার দোরগোড়ায় পৌঁছে দিচ্ছি।</p>
          </div>
          <div>
            <h4 className="font-bold mb-3">দ্রুত লিংক</h4>
            <ul className="space-y-2 text-white/70">
              <li><a href="#shop" className="hover:text-white">শপ</a></li>
              <li><a href="#about" className="hover:text-white">আমাদের সম্পর্কে</a></li>
              <li><a href="#contact" className="hover:text-white">যোগাযোগ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-3">যোগাযোগ</h4>
            <ul className="space-y-2 text-white/70">
              {contactPhone && <li>📞 {contactPhone}</li>}
              {whatsappNo && <li>💬 WhatsApp: +{whatsappNo}</li>}
              <li>📍 কুয়াকাটা, পটুয়াখালী</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-white/10 mt-8 pt-4 text-center text-xs text-white/60">
          © {toBn(new Date().getFullYear())} কে এম শপ। সর্বস্বত্ব সংরক্ষিত।
        </div>
      </footer>

      {/* Order Popup */}
      {orderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeOrderDialog}>
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {orderSuccess ? (
              <div className="p-8 text-center">
                <div className="relative w-20 h-20 mx-auto mb-5">
                  <div className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: `${BRAND_GREEN}33` }} />
                  <div className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
                    <CheckCircle className="h-10 w-10 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">অর্ডার সফল হয়েছে! 🎉</h3>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">আমরা শীঘ্রই আপনার সাথে যোগাযোগ করবো।<br />ধন্যবাদ আমাদের বেছে নেওয়ার জন্য!</p>
                <Button onClick={() => setOrderOpen(false)} className="w-full text-white font-bold py-4 rounded-2xl text-base shadow-lg" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
                  ঠিক আছে
                </Button>
              </div>
            ) : (
              <>
                <div className="relative px-5 py-5" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">অর্ডার করুন</h3>
                        <p className="text-white/70 text-xs">তথ্য দিয়ে অর্ডার কনফার্ম করুন</p>
                      </div>
                    </div>
                    <button onClick={closeOrderDialog} className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white/80 hover:bg-white/25">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {selectedProduct && (() => {
                  const p = selectedProduct;
                  const variants = Array.isArray(p.variants) ? p.variants : [];
                  const chosen = variants.length > 0 && selectedVariantIdx >= 0 ? variants[selectedVariantIdx] : null;
                  const basePrice = chosen
                    ? Number(chosen.discount_price ?? chosen.price ?? 0)
                    : Number(p.discount_price || p.price || 0);
                  const origPrice = chosen ? Number(chosen.price ?? 0) : Number(p.price || 0);
                  const hasDiscount = chosen
                    ? chosen.discount_price != null && Number(chosen.discount_price) < Number(chosen.price)
                    : p.discount_price && p.discount_price < p.price;
                  const total = basePrice * Math.max(1, quantity);
                  const unitLabel = p.unit_type === "kg" ? "কেজি" : p.unit_type === "size" ? "সাইজ" : "পিস";
                  const variantWeight = chosen && (chosen as any).weight_grams != null ? Number((chosen as any).weight_grams) : null;
                  const wPer = variantWeight && variantWeight > 0 ? variantWeight : Number(p.weight_grams || 0);
                  const totalWeight = wPer * Math.max(1, quantity);
                  const dlv = calculateDelivery(total, totalWeight, deliverySettings);
                  const grand = total + dlv.charge;
                  return (
                    <div className="mx-5 mt-4 space-y-3">
                      <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-4 flex items-center gap-3">
                        {p.image_url && <img src={p.image_url} alt={p.name} className="w-14 h-14 rounded-xl object-cover" />}
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">পণ্যের মূল্য</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-extrabold" style={{ color: BRAND_DARK }}>৳{toBn(total)}</span>
                            {hasDiscount && <span className="line-through text-gray-400 text-xs">৳{toBn(origPrice * Math.max(1, quantity))}</span>}
                          </div>
                          <p className="text-[11px] text-gray-500 line-clamp-1">{p.name}</p>
                        </div>
                      </div>

                      <div className="relative rounded-2xl p-[1.5px] bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 shadow-lg">
                        <div className="rounded-[14px] bg-gradient-to-br from-amber-50 via-white to-yellow-50 p-3.5 space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700 flex items-center gap-2 font-medium">
                              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                                <TruckIcon className="h-3.5 w-3.5 text-white" />
                              </span>
                              ডেলিভারি চার্জ
                            </span>
                            {dlv.isFree ? (
                              <span className="font-extrabold text-xs px-2.5 py-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow">🎉 ফ্রি</span>
                            ) : (
                              <span className="font-extrabold text-gray-900">৳{toBn(dlv.charge)}</span>
                            )}
                          </div>
                          {!dlv.isFree && deliverySettings.free_delivery_enabled && dlv.amountToFree > 0 && (
                            <div className="text-[11px] text-amber-800 bg-amber-100/70 border border-amber-200 rounded-lg px-2.5 py-1.5">
                              🚚 আর মাত্র <span className="font-extrabold">৳{toBn(dlv.amountToFree)}</span> অর্ডার করলেই <span className="font-extrabold">ফ্রি ডেলিভারি!</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t border-dashed border-amber-300">
                            <span className="font-bold text-gray-900 text-base">মোট পেমেন্ট</span>
                            <span
                              className="font-extrabold text-2xl bg-clip-text text-transparent"
                              style={{ backgroundImage: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}
                            >
                              ৳{toBn(grand)}
                            </span>
                          </div>
                          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 p-[1.5px] shadow-md">
                            <div className="rounded-[10px] bg-gradient-to-r from-emerald-50 to-green-50 px-3 py-2 flex items-center justify-center gap-2">
                              <span className="text-base">💵</span>
                              <span className="text-[12px] font-extrabold text-emerald-800 tracking-wide">
                                ক্যাশ অন ডেলিভারি
                              </span>
                              <span className="text-[11px] text-emerald-700">— পণ্য হাতে পেয়ে পেমেন্ট</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {variants.length > 0 && (
                        <div>
                          <Label className="text-gray-800 font-bold text-sm mb-2 block">
                            {p.unit_type === "kg" ? "ওজন বাছাই করুন" : p.unit_type === "size" ? "সাইজ বাছাই করুন" : "অপশন বাছাই করুন"} <span className="text-red-500">*</span>
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            {variants.map((v: any, i: number) => {
                              const vPrice = v.discount_price ?? v.price;
                              const active = selectedVariantIdx === i;
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setSelectedVariantIdx(i)}
                                  className={`text-left border-2 rounded-xl px-3 py-2 transition-all ${active ? "border-green-600 bg-green-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
                                >
                                  <div className="font-bold text-sm text-gray-900">{v.label}</div>
                                  <div className="text-xs">
                                    <span className="font-bold" style={{ color: BRAND_GREEN }}>৳{toBn(Number(vPrice))}</span>
                                    {v.discount_price != null && Number(v.discount_price) < Number(v.price) && (
                                      <span className="line-through text-gray-400 ml-1">৳{toBn(Number(v.price))}</span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div>
                        <Label className="text-gray-800 font-bold text-sm mb-2 block">পরিমাণ ({unitLabel})</Label>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}
                            className="w-10 h-10 rounded-full border-2 border-gray-200 font-bold text-lg">−</button>
                          <Input type="number" min={1} value={quantity}
                            onChange={e => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                            className="h-10 w-20 text-center rounded-xl border-2 border-gray-200" />
                          <button type="button" onClick={() => setQuantity(q => q + 1)}
                            className="w-10 h-10 rounded-full border-2 border-gray-200 font-bold text-lg">+</button>
                          <span className="text-xs text-gray-500">× ৳{toBn(basePrice)} / {unitLabel}</span>
                        </div>
                        {(p.unit_type === "piece" || p.unit_type === "kg") && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {[5, 10, 20].map(n => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setQuantity(n)}
                                className={`px-4 h-9 rounded-full border-2 text-xs font-bold transition ${
                                  quantity === n
                                    ? "bg-green-600 text-white border-green-600"
                                    : "bg-white text-gray-700 border-gray-200 hover:border-green-400"
                                }`}
                              >
                                {toBn(n)} {unitLabel}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="p-5 space-y-4">
                  <div>
                    <Label className="text-gray-800 font-bold text-sm mb-2 block">আপনার নাম <span className="text-red-500">*</span></Label>
                    <Input value={orderForm.name} onChange={e => setOrderForm(f => ({ ...f, name: e.target.value }))} placeholder="আপনার পুরো নাম" className="h-12 rounded-2xl border-2 border-gray-200 bg-gray-50/50" />
                  </div>
                  <div>
                    <Label className="text-gray-800 font-bold text-sm mb-2 block">মোবাইল নম্বর <span className="text-red-500">*</span></Label>
                    <Input value={orderForm.phone} onChange={e => handlePhoneChange(e.target.value)} placeholder="01XXXXXXXXX" maxLength={11} className={`h-12 rounded-2xl border-2 bg-gray-50/50 ${phoneError ? 'border-red-300' : 'border-gray-200'}`} />
                    {phoneError && <p className="text-red-500 text-xs mt-1.5">{phoneError}</p>}
                  </div>
                  <div>
                    <Label className="text-gray-800 font-bold text-sm mb-2 block">ঠিকানা <span className="text-red-500">*</span></Label>
                    <Textarea value={orderForm.address} onChange={e => setOrderForm(f => ({ ...f, address: e.target.value }))} placeholder="আপনার সম্পূর্ণ ঠিকানা" rows={3} className="rounded-2xl border-2 border-gray-200 bg-gray-50/50 resize-none" />
                  </div>
                  <Button onClick={handleOrderSubmit} disabled={submitting} className="w-full text-white font-bold text-base h-14 rounded-2xl gap-2 shadow-lg" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
                    <ShoppingCart className="h-5 w-5" />
                    {submitting ? "অর্ডার হচ্ছে..." : "অর্ডার কনফার্ম করুন"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const ok = addProductToCart(selectedProduct, Math.max(1, quantity), selectedVariantIdx);
                      if (ok) setOrderOpen(false);
                    }}
                    className="w-full font-bold text-sm h-12 rounded-2xl gap-2 border-2"
                    style={{ borderColor: BRAND_GREEN, color: BRAND_GREEN }}
                  >
                    <ShoppingCart className="h-4 w-4" /> কার্টে যুক্ত করুন (আরো প্রডাক্ট কিনুন)
                  </Button>
                  <p className="text-center text-gray-400 text-xs">🔒 আপনার তথ্য সম্পূর্ণ নিরাপদ</p>
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
