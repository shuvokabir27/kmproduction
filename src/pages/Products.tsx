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
import PaymentMethodPicker from "@/components/PaymentMethodPicker";
import MobileShopNav from "@/components/MobileShopNav";
import ShopOfferBanner from "@/components/ShopOfferBanner";
import ShopCategoryGrid from "@/components/ShopCategoryGrid";
import { CustomHomeSections } from "@/components/CustomHomeSections";
import FreeDeliveryHomeCTA from "@/components/FreeDeliveryHomeCTA";
import FloatingCartButton from "@/components/FloatingCartButton";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

const BRAND_GREEN = "#dc2626";
const BRAND_DARK = "#991b1b";
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
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
    cart.setOffer(null);
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
    if (orderForm.payment_method !== "cod") {
      if (orderForm.payment_sender_no.length !== 11) { toast.error("আপনার পেমেন্ট নম্বর দিন (১১ ডিজিট)"); return; }
      if (!orderForm.payment_trx_id.trim()) { toast.error("ট্রানজেকশন আইডি দিন"); return; }
    }

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
        payment_method: orderForm.payment_method,
        payment_sender_no: orderForm.payment_method !== "cod" ? orderForm.payment_sender_no : null,
        payment_trx_id: orderForm.payment_method !== "cod" ? orderForm.payment_trx_id.trim() : null,
        shop_customer_id: shopCustomer?.id ?? null,
      } as any);
      if (error) throw error;
      setOrderSuccess(true);
      setOrderForm({ name: "", phone: "", address: "", payment_method: "cod", payment_sender_no: "", payment_trx_id: "" });
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
    setOrderForm({ name: "", phone: "", address: "", payment_method: "cod", payment_sender_no: "", payment_trx_id: "" });
  };

  const openOrderDialog = (product: any) => {
    setSelectedProduct(product);
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    setSelectedVariantIdx(variants.length > 0 ? 0 : -1);
    setQuantity(1);
    setOrderSuccess(false);
    setPhoneError("");
    if (shopCustomer) {
      setOrderForm(f => ({
        ...f,
        name: shopCustomer.full_name || f.name,
        phone: shopCustomer.phone || f.phone,
        address: shopCustomer.address || f.address,
      }));
    }
    setOrderOpen(true);
  };

  const featured = filteredProducts.slice(0, 8);

  return (
    <div className="min-h-screen bg-background noise-bg pb-16 md:pb-0" style={{ fontFamily: "'Tiro Bangla', serif" }}>

      {/* Top Strip — Scrolling Marquee */}
      {siteSettings?.top_strip_enabled !== false && (siteSettings?.top_strip_text || whatsappNo || contactPhone) && (
        <div
          className="relative overflow-hidden text-white text-xs md:text-sm py-2"
          style={{
            backgroundImage: "linear-gradient(90deg, #4a0a0a 0%, #b91c1c 25%, #e11d48 50%, #b91c1c 75%, #4a0a0a 100%)",
          }}
        >
          <div className="pointer-events-none absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
          <div className="pointer-events-none absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />

          <div
            className="flex whitespace-nowrap will-change-transform"
            style={{ animation: `kmTopMarquee ${siteSettings?.top_strip_speed || 30}s linear infinite` }}
          >
            {[0, 1].map((k) => (
              <div key={k} className="flex items-center gap-6 px-6 shrink-0 font-medium" aria-hidden={k === 1}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <span key={i} className="inline-flex items-center gap-3">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_2px_rgba(252,211,77,0.6)]" />
                    <span>{siteSettings?.top_strip_text || "আমাদের যে কোন পণ্য অর্ডার করতে WhatsApp অথবা কল করুন।"}</span>
                    {whatsappNo && (
                      <a
                        href={`https://wa.me/${whatsappNo.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-extrabold px-2.5 py-0.5 rounded-full bg-white/15 ring-1 ring-white/30 hover:bg-white/25 transition-colors text-amber-100"
                      >
                        WhatsApp: +{whatsappNo}
                      </a>
                    )}
                    {contactPhone && (
                      <a
                        href={`tel:${contactPhone}`}
                        className="font-extrabold px-2.5 py-0.5 rounded-full bg-white/15 ring-1 ring-white/30 hover:bg-white/25 transition-colors text-amber-100"
                      >
                        কল: {contactPhone}
                      </a>
                    )}
                    <span className="text-amber-200/60">◆</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
          <style>{`@keyframes kmTopMarquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
        </div>
      )}

      {/* Header — Premium */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[linear-gradient(115deg,hsl(0_70%_8%/0.92)_0%,hsl(340_60%_10%/0.9)_35%,hsl(260_50%_10%/0.88)_70%,hsl(210_60%_10%/0.92)_100%)] backdrop-blur-2xl shadow-[0_10px_40px_-12px_hsl(0_0%_0%/0.7),inset_0_-1px_0_0_hsl(40_90%_55%/0.18)]">
        {/* ambient color blooms */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-10 w-72 h-40 bg-rose-500/20 blur-3xl rounded-full" />
          <div className="absolute -top-20 left-1/3 w-72 h-40 bg-fuchsia-500/15 blur-3xl rounded-full" />
          <div className="absolute -top-24 right-10 w-72 h-40 bg-amber-400/15 blur-3xl rounded-full" />
          <div className="absolute inset-0 bg-[radial-gradient(120%_60%_at_50%_-20%,rgba(255,255,255,0.06),transparent_60%)]" />
        </div>
        {/* top hairline accent — gold→rose→indigo */}
        <div className="relative h-px w-full bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-rose-500/0 via-rose-400/60 to-indigo-400/0" />
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/products" className="flex items-center gap-2.5 shrink-0 group">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-red-500/60 via-rose-500/40 to-red-700/60 blur-md opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-extrabold text-sm bg-gradient-to-br from-red-500 via-rose-600 to-red-800 ring-1 ring-white/20 shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.35),inset_0_-1px_0_0_hsl(0_0%_0%/0.35)]">
                KM
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="font-extrabold text-base md:text-lg leading-tight bg-gradient-to-r from-red-300 via-rose-200 to-red-300 bg-clip-text text-transparent" style={{ fontFamily: "'Tiro Bangla', serif" }}>কে এম শপ</div>
              <div className="text-[10px] md:text-xs text-muted-foreground tracking-wide">KM Shop · কুয়াকাটা</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm font-semibold text-foreground/75">
            <Link to="/products" className="px-3 py-2 rounded-full hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"><Home className="h-4 w-4" /> হোম</Link>
            <a href="#shop" className="px-3 py-2 rounded-full hover:text-white hover:bg-white/5 transition-colors">শপ</a>
            <Link to="/categories" className="px-3 py-2 rounded-full hover:text-white hover:bg-white/5 transition-colors">ক্যাটাগরি</Link>
            <a href="#about" className="px-3 py-2 rounded-full hover:text-white hover:bg-white/5 transition-colors">আমাদের সম্পর্কে</a>
            <a href="#contact" className="px-3 py-2 rounded-full hover:text-white hover:bg-white/5 transition-colors">যোগাযোগ</a>

            {whatsappNo && (
              <a
                href={`https://wa.me/${whatsappNo.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="flex items-center justify-center h-9 w-9 rounded-full text-white shadow-md hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#25D366" }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M20.52 3.48A11.86 11.86 0 0 0 12.04 0C5.5 0 .2 5.3.2 11.84c0 2.09.55 4.13 1.6 5.93L0 24l6.38-1.67a11.86 11.86 0 0 0 5.66 1.44h.01c6.54 0 11.84-5.3 11.84-11.84 0-3.16-1.23-6.13-3.37-8.45zM12.05 21.4h-.01a9.55 9.55 0 0 1-4.87-1.33l-.35-.21-3.78.99 1.01-3.69-.23-.38a9.54 9.54 0 0 1-1.46-5.06c0-5.27 4.29-9.56 9.57-9.56 2.56 0 4.95.99 6.76 2.81a9.52 9.52 0 0 1 2.81 6.77c0 5.27-4.29 9.56-9.45 9.66zm5.25-7.16c-.29-.14-1.7-.84-1.96-.94-.26-.1-.45-.14-.64.14-.19.29-.74.94-.91 1.13-.17.19-.34.21-.62.07-.29-.14-1.21-.45-2.31-1.42-.85-.76-1.43-1.7-1.6-1.99-.17-.29-.02-.45.13-.59.13-.13.29-.34.43-.51.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.14-.64-1.54-.88-2.11-.23-.55-.47-.48-.64-.49l-.55-.01c-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.38 0 1.41 1.03 2.77 1.17 2.96.14.19 2.02 3.09 4.9 4.33.69.3 1.22.47 1.64.6.69.22 1.32.19 1.81.12.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.33z"/>
                </svg>
              </a>
            )}
            {contactPhone && (
              <a
                href={`tel:${contactPhone.replace(/\s/g, "")}`}
                aria-label="Call"
                className="flex items-center justify-center h-9 w-9 rounded-full text-white shadow-md hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#1e3a8a" }}
              >
                <Phone className="h-4 w-4" />
              </a>
            )}

            <div className="mx-2 h-6 w-px bg-white/10" />


            <button
              onClick={() => featured[0] && openOrderDialog(featured[0])}
              className="glossy-btn-amber font-bold text-xs px-4 h-9 rounded-full inline-flex items-center gap-1.5"
            >
              🔥 অফার
            </button>
            {shopCustomer ? (
              <Link
                to="/shop/account"
                className="glossy-btn-ghost flex items-center gap-1.5 text-xs px-3.5 h-9 rounded-full font-bold"
              >
                <User className="h-3.5 w-3.5" />
                {shopCustomer.full_name?.split(" ")[0] || "অ্যাকাউন্ট"}
              </Link>
            ) : (
              <Link
                to="/shop/login"
                className="glossy-btn-ghost flex items-center gap-1.5 text-xs px-3.5 h-9 rounded-full font-bold"
              >
                <LogIn className="h-3.5 w-3.5" /> লগইন
              </Link>
            )}
            <div className="relative overflow-visible">
              <button
                onClick={cart.open}
                className="glossy-btn flex items-center justify-center h-9 w-9 rounded-full font-bold"
                aria-label="cart"
              >
                <ShoppingCart className="h-4 w-4" />
              </button>
              {cart.count > 0 && (
                <span className="pointer-events-none absolute -top-2 -right-2 z-20 bg-amber-300 text-amber-950 text-[10px] leading-none font-extrabold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center ring-2 ring-background shadow-lg">
                  {toBn(cart.count)}
                </span>
              )}
            </div>
          </nav>

          <div className="hidden lg:flex items-center bg-white/[0.04] hover:bg-white/[0.07] focus-within:bg-white/[0.07] border border-white/10 hover:border-white/20 focus-within:border-red-400/40 transition-all rounded-full px-4 h-10 w-72 shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.05)]">
            <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="পণ্য খুঁজুন..."
              className="bg-transparent flex-1 text-sm outline-none text-foreground placeholder:text-muted-foreground/70"
            />
          </div>

          <div className="md:hidden flex items-center gap-1">
            {whatsappNo && (
              <a
                href={`https://wa.me/${whatsappNo.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="flex items-center justify-center h-9 w-9 rounded-full text-white shadow-md"
                style={{ backgroundColor: "#25D366" }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M20.52 3.48A11.86 11.86 0 0 0 12.04 0C5.5 0 .2 5.3.2 11.84c0 2.09.55 4.13 1.6 5.93L0 24l6.38-1.67a11.86 11.86 0 0 0 5.66 1.44h.01c6.54 0 11.84-5.3 11.84-11.84 0-3.16-1.23-6.13-3.37-8.45zM12.05 21.4h-.01a9.55 9.55 0 0 1-4.87-1.33l-.35-.21-3.78.99 1.01-3.69-.23-.38a9.54 9.54 0 0 1-1.46-5.06c0-5.27 4.29-9.56 9.57-9.56 2.56 0 4.95.99 6.76 2.81a9.52 9.52 0 0 1 2.81 6.77c0 5.27-4.29 9.56-9.45 9.66zm5.25-7.16c-.29-.14-1.7-.84-1.96-.94-.26-.1-.45-.14-.64.14-.19.29-.74.94-.91 1.13-.17.19-.34.21-.62.07-.29-.14-1.21-.45-2.31-1.42-.85-.76-1.43-1.7-1.6-1.99-.17-.29-.02-.45.13-.59.13-.13.29-.34.43-.51.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.14-.64-1.54-.88-2.11-.23-.55-.47-.48-.64-.49l-.55-.01c-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.38 0 1.41 1.03 2.77 1.17 2.96.14.19 2.02 3.09 4.9 4.33.69.3 1.22.47 1.64.6.69.22 1.32.19 1.81.12.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.33z"/>
                </svg>
              </a>
            )}
            {contactPhone && (
              <a
                href={`tel:${contactPhone.replace(/\s/g, "")}`}
                aria-label="Call"
                className="flex items-center justify-center h-9 w-9 rounded-full text-white shadow-md"
                style={{ backgroundColor: "#1e3a8a" }}
              >
                <Phone className="h-4 w-4" />
              </a>
            )}
            <button onClick={() => setMobileSearchOpen(v => !v)} className="p-2 rounded-full hover:bg-white/5 transition-colors text-foreground/80" aria-label="search">
              <Search className="h-5 w-5" />
            </button>

            <button onClick={cart.open} className="relative p-2.5 rounded-full hover:bg-white/5 transition-colors text-foreground/80" aria-label="cart">
              <ShoppingCart className="h-5 w-5" />
              {cart.count > 0 && (
                <span className="absolute -top-1 -right-1 z-20 bg-amber-300 text-amber-950 text-[10px] leading-none font-extrabold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center ring-2 ring-background shadow-lg">
                  {toBn(cart.count)}
                </span>
              )}
            </button>
            <Link
              to={shopCustomer ? "/shop/account" : "/shop/login"}
              className="p-2 rounded-full hover:bg-white/5 transition-colors text-foreground/80"
              aria-label="login"
            >
              <User className="h-5 w-5" />
            </Link>
            <button onClick={() => setMobileMenuOpen(v => !v)} className="p-2 rounded-full hover:bg-white/5 transition-colors text-foreground/80">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileSearchOpen && (
          <div className="md:hidden border-t bg-card px-4 py-3">
            <div className="flex items-center bg-muted rounded-full px-4 py-2">
              <Search className="h-4 w-4 text-muted-foreground mr-2" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    setMobileSearchOpen(false);
                    setTimeout(() => {
                      document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
                    }, 50);
                  }
                }}
                placeholder="পণ্য খুঁজুন..."
                className="bg-transparent flex-1 text-sm outline-none text-foreground placeholder:text-muted-foreground"
              />
              {search && (
                <button onClick={() => setSearch("")} className="ml-2 p-1 hover:bg-muted rounded-full"><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
              )}
            </div>
            {search.trim() && (
              <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border bg-card shadow-sm divide-y">
                {filteredProducts.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">কোন পণ্য পাওয়া যায়নি</div>
                ) : (
                  filteredProducts.slice(0, 8).map((p: any) => (
                    <Link
                      key={p.id}
                      to={`/products/${p.id}`}
                      onClick={() => {
                        setMobileSearchOpen(false);
                        setSearch("");
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted"
                    >
                      {p.image_url && (
                        <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                        {p.price != null && (
                          <div className="text-xs text-muted-foreground">৳ {toBn(Number(p.discount_price ?? p.price))}</div>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
        )}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-card px-4 py-3 space-y-1">
            <div className="flex items-center bg-muted rounded-full px-4 py-2 mb-2">
              <Search className="h-4 w-4 text-muted-foreground mr-2" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="পণ্য খুঁজুন..."
                className="bg-transparent flex-1 text-sm outline-none text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Link to="/products" onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-2 rounded-lg text-sm font-semibold text-foreground hover:bg-muted flex items-center gap-2"><Home className="h-4 w-4" style={{ color: BRAND_GREEN }} /> হোম</Link>
            <a href="#shop" onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-2 rounded-lg text-sm font-semibold text-foreground hover:bg-muted flex items-center gap-2"><ShoppingBag className="h-4 w-4" style={{ color: BRAND_GREEN }} /> শপ</a>
            <Link to="/categories" onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-2 rounded-lg text-sm font-semibold text-foreground hover:bg-muted flex items-center gap-2"><Tag className="h-4 w-4" style={{ color: BRAND_GREEN }} /> ক্যাটাগরি</Link>
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-2 rounded-lg text-sm font-semibold text-foreground hover:bg-muted flex items-center gap-2"><ShieldCheck className="h-4 w-4" style={{ color: BRAND_GREEN }} /> আমাদের সম্পর্কে</a>
            <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-2 rounded-lg text-sm font-semibold text-foreground hover:bg-muted flex items-center gap-2"><Phone className="h-4 w-4" style={{ color: BRAND_GREEN }} /> যোগাযোগ</a>
            {shopCustomer ? (
              <Link to="/shop/account" onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-2 rounded-lg text-sm font-semibold text-foreground hover:bg-muted flex items-center gap-2"><User className="h-4 w-4" style={{ color: BRAND_GREEN }} /> অ্যাকাউন্ট</Link>
            ) : (
              <Link to="/shop/login" onClick={() => setMobileMenuOpen(false)} className="py-2.5 px-2 rounded-lg text-sm font-semibold text-foreground hover:bg-muted flex items-center gap-2"><LogIn className="h-4 w-4" style={{ color: BRAND_GREEN }} /> লগইন / রেজিস্টার</Link>
            )}
          </div>
        )}

        {/* Categories Mega Bar — hidden */}
        <div className="hidden">
          <div className="max-w-7xl mx-auto px-4">
            <ul className="flex items-stretch gap-1 text-sm font-semibold text-foreground/80 overflow-x-auto">
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
                    <div className="absolute left-0 top-full hidden group-hover:block bg-card shadow-xl border rounded-b-lg min-w-[220px] z-50 py-2">
                      {m.children.map((s) => (
                        <a
                          key={s.id}
                          href="#shop"
                          className="block px-4 py-2 text-sm text-foreground/80 hover:bg-muted hover:text-[--g]"
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
          <div className="md:hidden border-t bg-card px-4 py-3 space-y-1 max-h-[60vh] overflow-y-auto">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">ক্যাটাগরি</div>
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
                  {m.children.length > 0 && <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">▾</span>}
                </summary>
                {m.children.length > 0 && (
                  <div className="pl-3 pb-2 space-y-1">
                    {m.children.map((s) => (
                      <a key={s.id} href="#shop" className="block py-1.5 text-xs text-muted-foreground">— {s.label}</a>
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

      <ShopOfferBanner />

      {/* Hero Banner — Premium */}
      <section className="px-4 py-6 md:py-10">
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-[28px] overflow-hidden">
            {/* layered premium background */}
            <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_20%_20%,hsl(0_90%_55%/0.95),transparent_60%),radial-gradient(70%_70%_at_85%_90%,hsl(355_85%_38%/0.95),transparent_65%),linear-gradient(135deg,hsl(0_85%_42%)_0%,hsl(355_80%_30%)_60%,hsl(0_60%_18%)_100%)]" />
            {/* fine grain noise */}
            <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22140%22 height=%22140%22><filter id=%22n%22><feTurbulence baseFrequency=%220.9%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%220.6%22/></svg>')]" />
            {/* top sheen */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(180deg,hsl(0_0%_100%/0.18)_0%,transparent_80%)] pointer-events-none" />
            {/* gold hairline ring */}
            <div className="absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/15 pointer-events-none" />
            <div className="absolute inset-0 rounded-[28px] shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.25),inset_0_-1px_0_0_hsl(0_0%_0%/0.4),0_30px_80px_-20px_hsl(0_85%_30%/0.6)] pointer-events-none" />
            {/* soft floating orbs */}
            <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 right-1/4 w-80 h-80 rounded-full bg-rose-400/20 blur-3xl pointer-events-none" />

            <div className="relative grid md:grid-cols-2 gap-8 items-center p-7 md:p-14" style={{ fontFamily: "'Tiro Bangla', serif" }}>
              <div className="text-white text-center md:text-left order-2 md:order-1">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] tracking-wide mb-5 border border-white/25 bg-white/10 backdrop-blur-xl shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.25)]" style={{ fontFamily: "'Tiro Bangla', serif" }}>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-60 animate-ping" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-200" />
                  </span>
                  <span className="font-semibold text-white/95">কুয়াকাটার অথেনটিক পণ্য</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-black leading-[1.05] mb-5 drop-shadow-[0_2px_20px_rgba(0,0,0,0.35)]" style={{ fontFamily: "'Tiro Bangla', serif" }}>
                  প্রতিদিনের সুস্থতায় হোক
                  <br />
                  <span className="bg-gradient-to-r from-amber-200 via-rose-100 to-amber-300 bg-clip-text text-transparent">
                    খাঁটি পণ্য
                  </span>
                </h1>
                <div className="h-px w-24 mx-auto md:mx-0 mb-5 bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" />
                <p className="text-white/85 text-sm md:text-base mb-7 max-w-md mx-auto md:mx-0 leading-relaxed" style={{ fontFamily: "'Tiro Bangla', serif" }}>
                  সরাসরি কুয়াকাটার সমুদ্র সৈকত ও স্থানীয় কৃষক থেকে সংগ্রহ করা ১০০% খাঁটি ও তাজা পণ্য — শুঁটকি, মধু, তালের গুড়, হস্তশিল্প আরও অনেক কিছু।
                </p>
                <div className="flex flex-wrap gap-3 justify-center md:justify-start items-center" style={{ fontFamily: "'Tiro Bangla', serif" }}>
                  <a href="#shop">
                    <Button className="h-12 rounded-full px-7 gap-2 font-bold">
                      <ShoppingBag className="h-4 w-4" /> এখনই কিনুন
                    </Button>
                  </a>
                  {whatsappNo && (
                    <a href={`https://wa.me/${whatsappNo.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="h-12 rounded-full px-7 gap-2 font-bold">
                        <Phone className="h-4 w-4" /> অর্ডার করুন
                      </Button>
                    </a>
                  )}
                  <div className="hidden md:flex items-center gap-3 pl-3 ml-1 border-l border-white/20">
                    <div className="flex -space-x-2">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full ring-2 ring-white/30 bg-gradient-to-br from-amber-300 to-rose-400" />
                      ))}
                    </div>
                    <div className="text-[11px] leading-tight text-white/90">
                      <div className="flex items-center gap-0.5">
                        {[0,1,2,3,4].map(i => <Star key={i} className="h-3 w-3 fill-amber-300 text-amber-300" />)}
                      </div>
                      <span className="text-white/70">১০,০০০+ খুশি গ্রাহক</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative block mt-4 md:mt-0 order-1 md:order-2">
                {(() => {
                  const slides = (products || []).filter((p: any) => p.image_url).slice(0, 8);
                  const current = slides[heroSlide % (slides.length || 1)];
                  return (
                    <>
                      {/* premium gradient frame */}
                      <div className="relative rounded-[26px] p-[1.5px] bg-gradient-to-br from-amber-300/70 via-white/10 to-rose-400/60 shadow-[0_30px_60px_-20px_hsl(0_70%_15%/0.6)]">
                        <div className="aspect-square rounded-[24px] overflow-hidden relative bg-black/30 backdrop-blur-xl border border-white/10">
                          {current ? (
                            <Link to={`/products/${current.id}`} className="block w-full h-full group">
                              {slides.map((p: any, i: number) => (
                                <img
                                  key={p.id}
                                  src={p.image_url}
                                  alt={p.name}
                                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-[1200ms] ${i === (heroSlide % slides.length) ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
                                />
                              ))}
                              {/* glossy sheen */}
                              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,hsl(0_0%_100%/0.15)_0%,transparent_40%)]" />
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-5 text-white">
                                <p className="font-bold text-lg line-clamp-1 drop-shadow">{current.name}</p>
                                <p className="text-amber-200 font-extrabold text-2xl mt-0.5">
                                  ৳{toBn(Number(current.discount_price ?? current.price ?? 0))}
                                  {current.discount_price && current.discount_price < current.price && (
                                    <span className="text-xs line-through text-white/55 ml-2 font-medium">৳{toBn(Number(current.price))}</span>
                                  )}
                                </p>
                              </div>
                            </Link>
                          ) : (
                            <ShoppingBag className="h-32 w-32 text-white/30 m-auto" />
                          )}
                        </div>
                      </div>
                      {slides.length > 1 && (
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/30 backdrop-blur px-3 py-1.5 rounded-full border border-white/15">
                          {slides.map((_: any, i: number) => (
                            <button
                              key={i}
                              onClick={() => setHeroSlide(i)}
                              aria-label={`slide ${i + 1}`}
                              className={`h-1.5 rounded-full transition-all ${i === (heroSlide % slides.length) ? 'w-6 bg-gradient-to-r from-amber-200 to-rose-200' : 'w-1.5 bg-white/40'}`}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
                {/* premium badges */}
                <div className="absolute -bottom-4 -left-4 px-4 py-2 rounded-2xl text-sm font-bold text-amber-950 shadow-xl bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400 ring-1 ring-amber-100/60 shadow-[inset_0_1px_0_0_hsl(45_100%_95%/0.8),0_10px_24px_-8px_hsl(38_90%_40%/0.6)]">
                  ১০০% খাঁটি
                </div>
                <div className="absolute -top-4 -right-4 px-4 py-2 rounded-2xl text-sm font-extrabold text-slate-900 bg-white/95 backdrop-blur shadow-[inset_0_1px_0_0_hsl(0_0%_100%),0_10px_24px_-8px_hsl(0_0%_0%/0.45)] ring-1 ring-black/5 flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> <span>৪.৯</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Free Delivery CTA */}
      <FreeDeliveryHomeCTA />

      {/* Categories Grid */}
      <ShopCategoryGrid />

      {/* Trust Bar */}
      <section className="px-4 pb-2 pt-4">
        <div className="max-w-7xl mx-auto glossy-section-amber p-4 md:p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
            {[
              { icon: Truck, title: "দ্রুত ডেলিভারি", desc: "সারা দেশে" },
              { icon: ShieldCheck, title: "১০০% খাঁটি", desc: "গ্যারান্টি সহ" },
              { icon: Tag, title: "সেরা দাম", desc: "সরাসরি উৎস থেকে" },
              { icon: MessageCircle, title: "২৪/৭ সাপোর্ট", desc: "WhatsApp এ যোগাযোগ" },
            ].map((t, i) => (
              <div key={i} className="glossy-card p-3 md:p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/15">
                  <t.icon className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <div className="font-bold text-xs md:text-sm text-foreground">{t.title}</div>
                  <div className="text-[10px] md:text-xs text-muted-foreground">{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section id="shop" className="px-4 py-10">
        <div className="max-w-7xl mx-auto glossy-section-violet p-6 md:p-10">
          <div className="text-center mb-8">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: BRAND_GREEN }}>
              {showAllProducts ? "ALL PRODUCTS" : "FEATURED PRODUCTS"}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-2">
              {showAllProducts ? "ক্যাটাগরি অনুযায়ী সকল পণ্য" : "আমাদের সেরা পণ্য সমূহ"}
            </h2>
            <div className="w-16 h-1 mx-auto mt-3 rounded-full" style={{ backgroundColor: BRAND_GREEN }} />
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShoppingBag className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              কোনো পণ্য পাওয়া যায়নি
            </div>
          ) : (() => {
            const renderCard = (p: any) => {
              const hasDiscount = p.discount_price && p.discount_price < p.price;
              const discountPct = hasDiscount ? Math.round(((p.price - p.discount_price) / p.price) * 100) : 0;
              return (
                <div key={p.id} className="group glossy-card overflow-hidden flex flex-col">
                  <Link to={`/products/${p.id}`} className="relative aspect-square bg-muted overflow-hidden block">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                    {hasDiscount && (
                      <div className="absolute top-2 left-2 bg-card shadow text-red-600 font-bold text-xs px-2 py-1 rounded">
                        -{toBn(discountPct)}%
                      </div>
                    )}
                    <div className="absolute top-2 right-2 text-white text-[10px] font-bold px-2 py-1 rounded shadow" style={{ backgroundColor: ACCENT_RED }}>
                      HOT
                    </div>
                  </Link>
                  <div className="p-3 md:p-4 flex flex-col flex-1">
                    <Link to={`/products/${p.id}`} className="font-bold text-sm md:text-base text-foreground line-clamp-2 min-h-[2.5rem] hover:underline">{p.name}</Link>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-lg font-extrabold" style={{ color: BRAND_GREEN }}>
                        ৳{toBn(hasDiscount ? p.discount_price : p.price)}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-muted-foreground line-through">৳{toBn(p.price)}</span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                      <Button
                        onClick={() => openOrderDialog(p)}
                        className="w-full font-bold tracking-wide text-sm h-10 rounded-md"
                      >
                        এখনই কিনুন
                      </Button>
                      <Button
                        onClick={() => {
                          const variants = Array.isArray(p.variants) ? p.variants : [];
                          addProductToCart(p, 1, variants.length > 0 ? 0 : -1);
                        }}
                        className="glossy-btn-amber w-full font-bold tracking-wide text-sm h-10 rounded-md gap-1.5 inline-flex items-center justify-center"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" /> কার্টে যোগ করুন
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

            // Map category slug → bangla label
            const catLabelMap: Record<string, string> = {};
            (categoryData?.all ?? []).forEach((c: any) => { catLabelMap[c.value] = c.label; });
            // Group by category
            const groups: Record<string, any[]> = {};
            filteredProducts.forEach((p: any) => {
              const cat = p.category || "others";
              if (!groups[cat]) groups[cat] = [];
              groups[cat].push(p);
            });
            const catNames = Object.keys(groups).sort();
            return (
              <div className="space-y-12">
                {catNames.map(cat => (
                  <div key={cat}>
                    <div className="flex items-center gap-3 mb-5">
                      <h3 className="text-xl md:text-2xl font-bold text-foreground">{catLabelMap[cat] || cat}</h3>
                      <span className="text-xs font-bold text-white px-2 py-1 rounded-full" style={{ backgroundColor: BRAND_GREEN }}>
                        {toBn(groups[cat].length)}
                      </span>
                      <div className="flex-1 h-px bg-muted" />
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
      <section id="about" className="px-4 py-12">
        <div className="max-w-5xl mx-auto glossy-section-cyan p-8 md:p-12 text-center">
          <span className="text-xs font-bold tracking-widest uppercase text-cyan-400">ABOUT KM SHOP</span>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mt-2 mb-4 relative z-10">কুয়াকাটার ঐতিহ্য, আপনার দোরগোড়ায়</h2>
          <p className="text-muted-foreground leading-relaxed max-w-3xl mx-auto relative z-10">
            কে এম শপ কুয়াকাটার স্থানীয় কৃষক, জেলে ও কারিগরদের সাথে সরাসরি কাজ করে। আমাদের প্রতিটি পণ্য — শুঁটকি মাছ থেকে শুরু করে হস্তশিল্প, নারকেল পণ্য, তালের গুড় ও স্মৃতিচিহ্ন — যত্ন সহকারে বাছাই করা ও পরীক্ষিত। আমরা চাই কুয়াকাটার অথেনটিক স্বাদ ও সংস্কৃতি দেশের প্রতিটি কোণে পৌঁছে দিতে।
          </p>
        </div>
      </section>

      {/* Contact CTA */}
      <section id="contact" className="px-4 py-10">
        <div className="max-w-3xl mx-auto glossy-section-pink p-8 text-center text-white shadow-xl">
          <h2 className="text-xl md:text-2xl font-bold mb-2">এখনই যোগাযোগ করুন</h2>
          <p className="text-white/80 text-sm mb-5">যেকোনো প্রশ্ন বা অর্ডারের জন্য সরাসরি কল বা WhatsApp করুন</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {contactPhone && (
              <a href={`tel:${contactPhone}`}>
                <Button className="bg-red-400 hover:bg-red-500 text-red-900 font-bold rounded-full px-6 h-12 gap-2">
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

      {/* Footer — Premium */}
      <footer
        className="relative text-white pt-14 pb-6 px-4 overflow-hidden border-t border-white/10"
        style={{
          backgroundImage: [
            "radial-gradient(60% 50% at 10% 0%, hsl(0 80% 30% / 0.55), transparent 60%)",
            "radial-gradient(50% 50% at 90% 10%, hsl(340 70% 35% / 0.45), transparent 60%)",
            "radial-gradient(80% 60% at 50% 100%, hsl(0 75% 20% / 0.6), transparent 65%)",
            "linear-gradient(160deg, #1a0608 0%, #2a0a10 35%, #0d0405 70%, #2a0a10 100%)",
          ].join(", "),
        }}
      >
        {/* gold hairline */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
        {/* ambient blobs */}
        <div className="pointer-events-none absolute -top-20 -left-16 w-80 h-80 rounded-full bg-rose-600/25 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 w-96 h-96 rounded-full bg-red-800/30 blur-[140px]" />

        <div className="relative max-w-7xl mx-auto grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-amber-300/60 via-rose-400/50 to-red-700/60 blur-md opacity-80" />
                <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-red-500 via-rose-600 to-red-800 ring-1 ring-white/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),inset_0_-1px_0_0_rgba(0,0,0,0.35)] flex items-center justify-center font-extrabold">KM</div>
              </div>
              <div className="font-extrabold text-lg bg-gradient-to-r from-amber-200 via-rose-100 to-amber-200 bg-clip-text text-transparent">
                {siteSettings?.shop_name || "কে এম শপ"}
              </div>
            </div>
            <p className="text-white/75 leading-relaxed">{siteSettings?.shop_tagline || "কুয়াকাটার সেরা পণ্য সম্ভার, সরাসরি আপনার দোরগোড়ায় পৌঁছে দিচ্ছি।"}</p>
            <Link
              to="/media"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm text-white bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 ring-1 ring-amber-200/40 shadow-[0_8px_20px_-6px_rgba(244,63,94,0.55),inset_0_1px_0_0_rgba(255,255,255,0.35)] hover:shadow-[0_12px_28px_-8px_rgba(244,63,94,0.7),inset_0_1px_0_0_rgba(255,255,255,0.4)] hover:-translate-y-0.5 transition-all"
            >
              <Star className="h-4 w-4 fill-white text-white" />
              KM Production ভিজিট করুন
            </Link>
          </div>
          <div>
            <h4 className="font-extrabold mb-3 text-amber-200/95 tracking-wide uppercase text-xs">দ্রুত লিংক</h4>
            <ul className="space-y-2 text-white/75">
              <li><a href="#shop" className="hover:text-amber-200 transition-colors">শপ</a></li>
              <li><a href="#about" className="hover:text-amber-200 transition-colors">আমাদের সম্পর্কে</a></li>
              <li><a href="#contact" className="hover:text-amber-200 transition-colors">যোগাযোগ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-extrabold mb-3 text-amber-200/95 tracking-wide uppercase text-xs">যোগাযোগ</h4>
            <ul className="space-y-2 text-white/75">
              {contactPhone && <li>📞 {contactPhone}</li>}
              {whatsappNo && <li>💬 WhatsApp: +{whatsappNo}</li>}
              {(siteSettings as any)?.shop_email && <li>✉️ {(siteSettings as any).shop_email}</li>}
              {((siteSettings as any)?.shop_address || true) && <li>📍 {(siteSettings as any)?.shop_address || "কুয়াকাটা, পটুয়াখালী"}</li>}
            </ul>
          </div>
        </div>
        <div className="relative max-w-7xl mx-auto mt-10 pt-4 text-center text-xs text-white/60">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-300/30 to-transparent" />
          © {toBn(new Date().getFullYear())} {(siteSettings as any)?.shop_copyright || "কে এম শপ। সর্বস্বত্ব সংরক্ষিত।"}
        </div>
      </footer>

      <FloatingCartButton />

      {/* Order Popup */}
      {orderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={closeOrderDialog}>
          <div className="bg-card w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {orderSuccess ? (
              <div className="p-8 text-center">
                <div className="relative w-20 h-20 mx-auto mb-5">
                  <div className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: `${BRAND_GREEN}33` }} />
                  <div className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
                    <CheckCircle className="h-10 w-10 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">অর্ডার সফল হয়েছে! 🎉</h3>
                <p className="text-muted-foreground text-sm mb-6 leading-relaxed">আমরা শীঘ্রই আপনার সাথে যোগাযোগ করবো।<br />ধন্যবাদ আমাদের বেছে নেওয়ার জন্য!</p>
                <Button onClick={() => setOrderOpen(false)} className="w-full text-white font-bold py-4 rounded-2xl text-base shadow-lg" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
                  ঠিক আছে
                </Button>
              </div>
            ) : (
              <>
                <div className="relative px-5 py-5" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-card/20 rounded-xl flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">অর্ডার করুন</h3>
                        <p className="text-white/70 text-xs">তথ্য দিয়ে অর্ডার কনফার্ম করুন</p>
                      </div>
                    </div>
                    <button onClick={closeOrderDialog} className="w-8 h-8 rounded-full bg-card/15 flex items-center justify-center text-white/80 hover:bg-card/25">
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
                      <div className="bg-[#fef2f2] border border-[#fecaca] rounded-2xl p-4 flex items-center gap-3">
                        {p.image_url && <img src={p.image_url} alt={p.name} className="w-14 h-14 rounded-xl object-cover" />}
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">পণ্যের মূল্য</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-extrabold" style={{ color: BRAND_DARK }}>৳{toBn(total)}</span>
                            {hasDiscount && <span className="line-through text-muted-foreground text-xs">৳{toBn(origPrice * Math.max(1, quantity))}</span>}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">{p.name}</p>
                        </div>
                      </div>

                      {variants.length > 0 && (
                        <div>
                          <Label className="text-foreground font-bold text-sm mb-2 block">
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
                                  className={`text-left border-2 rounded-xl px-3 py-2 transition-all ${active ? "border-red-600 bg-red-50" : "border-border bg-card hover:border-border"}`}
                                >
                                  <div className="font-bold text-sm text-foreground">{v.label}</div>
                                  <div className="text-xs">
                                    <span className="font-bold" style={{ color: BRAND_GREEN }}>৳{toBn(Number(vPrice))}</span>
                                    {v.discount_price != null && Number(v.discount_price) < Number(v.price) && (
                                      <span className="line-through text-muted-foreground ml-1">৳{toBn(Number(v.price))}</span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div>
                        <Label className="text-foreground font-bold text-sm mb-2 block">পরিমাণ ({unitLabel})</Label>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}
                            className="w-10 h-10 rounded-full border-2 border-border font-bold text-lg">−</button>
                          <Input type="number" min={1} value={quantity}
                            onChange={e => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                            className="h-10 w-20 text-center rounded-xl border-2 border-border" />
                          <button type="button" onClick={() => setQuantity(q => q + 1)}
                            className="w-10 h-10 rounded-full border-2 border-border font-bold text-lg">+</button>
                          <span className="text-xs text-muted-foreground">× ৳{toBn(basePrice)} / {unitLabel}</span>
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
                                    ? "bg-red-600 text-white border-red-600"
                                    : "bg-card text-foreground/80 border-border hover:border-red-400"
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
                    <Label className="text-foreground font-bold text-sm mb-2 block">আপনার নাম <span className="text-red-500">*</span></Label>
                    <Input value={orderForm.name} onChange={e => setOrderForm(f => ({ ...f, name: e.target.value }))} placeholder="আপনার পুরো নাম" className="h-12 rounded-2xl border-2 border-border bg-card text-foreground placeholder:text-muted-foreground" />
                  </div>
                  <div>
                    <Label className="text-foreground font-bold text-sm mb-2 block">মোবাইল নম্বর <span className="text-red-500">*</span></Label>
                    <Input type="tel" inputMode="numeric" pattern="[0-9]*" value={orderForm.phone} onChange={e => handlePhoneChange(e.target.value)} placeholder="01XXXXXXXXX" maxLength={11} className={`h-12 rounded-2xl border-2 bg-card text-foreground placeholder:text-muted-foreground ${phoneError ? 'border-red-300' : 'border-border'}`} />
                    {phoneError && <p className="text-red-500 text-xs mt-1.5">{phoneError}</p>}
                  </div>
                  <div>
                    <Label className="text-foreground font-bold text-sm mb-2 block">ঠিকানা <span className="text-red-500">*</span></Label>
                    <Textarea value={orderForm.address} onChange={e => setOrderForm(f => ({ ...f, address: e.target.value }))} placeholder="আপনার সম্পূর্ণ ঠিকানা" rows={3} className="rounded-2xl border-2 border-border bg-card text-foreground placeholder:text-muted-foreground resize-none" />
                  </div>
                  <PaymentMethodPicker
                    settings={siteSettings}
                    method={orderForm.payment_method}
                    senderNo={orderForm.payment_sender_no}
                    trxId={orderForm.payment_trx_id}
                    onMethodChange={(m) => setOrderForm(f => ({ ...f, payment_method: m }))}
                    onSenderNoChange={(v) => setOrderForm(f => ({ ...f, payment_sender_no: v }))}
                    onTrxIdChange={(v) => setOrderForm(f => ({ ...f, payment_trx_id: v }))}
                  />

                  {selectedProduct && (() => {
                    const p = selectedProduct;
                    const variants = Array.isArray(p.variants) ? p.variants : [];
                    const chosen = variants.length > 0 && selectedVariantIdx >= 0 ? variants[selectedVariantIdx] : null;
                    const basePrice = chosen
                      ? Number(chosen.discount_price ?? chosen.price ?? 0)
                      : Number(p.discount_price || p.price || 0);
                    const total = basePrice * Math.max(1, quantity);
                    const variantWeight = chosen && (chosen as any).weight_grams != null ? Number((chosen as any).weight_grams) : null;
                    const wPer = variantWeight && variantWeight > 0 ? variantWeight : Number(p.weight_grams || 0);
                    const totalWeight = wPer * Math.max(1, quantity);
                    const dlv = calculateDelivery(total, totalWeight, deliverySettings);
                    const grand = total + dlv.charge;
                    return (
                      <div className="relative rounded-2xl p-[1.5px] bg-gradient-to-br from-red-300 via-red-400 to-red-500 shadow-lg">
                        <div className="rounded-[14px] bg-gradient-to-br from-red-50 via-white to-red-50 p-3.5 space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-foreground/80 flex items-center gap-2 font-medium">
                              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center shadow-sm">
                                <TruckIcon className="h-3.5 w-3.5 text-white" />
                              </span>
                              ডেলিভারি চার্জ
                            </span>
                            {dlv.isFree ? (
                              <span className="font-extrabold text-xs px-2.5 py-1 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white shadow">🎉 ফ্রি</span>
                            ) : (
                              <span className="font-extrabold text-foreground">৳{toBn(dlv.charge)}</span>
                            )}
                          </div>
                          {!dlv.isFree && deliverySettings.free_delivery_enabled && dlv.amountToFree > 0 && (
                            <div className="text-[11px] text-red-800 bg-red-100/70 border border-red-200 rounded-lg px-2.5 py-1.5">
                              🚚 আর মাত্র <span className="font-extrabold">৳{toBn(dlv.amountToFree)}</span> অর্ডার করলেই <span className="font-extrabold">ফ্রি ডেলিভারি!</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t border-dashed border-red-300">
                            <span className="font-bold text-foreground text-base">মোট পেমেন্ট</span>
                            <span
                              className="font-extrabold text-2xl bg-clip-text text-transparent"
                              style={{ backgroundImage: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}
                            >
                              ৳{toBn(grand)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

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
                  <p className="text-center text-muted-foreground text-xs">🔒 আপনার তথ্য সম্পূর্ণ নিরাপদ</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <MobileShopNav />
    </div>
  );
};

export default Products;
