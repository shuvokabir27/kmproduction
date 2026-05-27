import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { ShoppingCart, Phone, MessageCircle, Minus, Plus, ChevronLeft, ChevronRight, Share2, ShieldCheck, Truck, Tag, X, CheckCircle, Home, ShoppingBag, Star } from "lucide-react";
import { SHOP_TOKEN_KEY } from "@/hooks/useShopCustomer";
import { Truck as TruckIcon } from "lucide-react";
import { useDeliverySettings } from "@/hooks/useDeliverySettings";
import { calculateDelivery } from "@/lib/delivery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import PaymentMethodPicker from "@/components/PaymentMethodPicker";
import MobileShopNav from "@/components/MobileShopNav";
import FloatingCartButton from "@/components/FloatingCartButton";
import { Label } from "@/components/ui/label";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { useCart } from "@/hooks/useCart";
import { useShopCustomer } from "@/hooks/useShopCustomer";
import WatermarkedImage from "@/components/WatermarkedImage";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

const BRAND_GREEN = "#3b82f6";
const BRAND_DARK = "#3b82f6";
const ACCENT_RED = "#d6302c";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cart = useCart();
  const { customer: shopCustomer, orders: customerOrders } = useShopCustomer();
  const [searchParams] = useSearchParams();
  const { settings: deliverySettings } = useDeliverySettings();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (searchParams.get("order") === "1") setOrderOpen(true);
  }, [searchParams]);

  useEffect(() => {
    setSelectedVariantIdx(-1);
  }, [id]);

  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [tab, setTab] = useState<"desc" | "reviews">("desc");
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderForm, setOrderForm] = useState({ name: "", phone: "", address: "", payment_method: "cod" as "cod" | "bkash" | "nagad" | "rocket", payment_sender_no: "", payment_trx_id: "" });
  const [phoneError, setPhoneError] = useState("");
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number>(-1);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const isUuid = !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const query = supabase.from("products").select("*");
      const { data } = await (isUuid ? query.eq("id", id!) : query.eq("slug", id!)).maybeSingle();
      return data;
    },
  });


  useEffect(() => {
    const v: any[] = Array.isArray((product as any)?.variants) ? (product as any).variants : [];
    if (v.length > 0) setSelectedVariantIdx(prev => (prev < 0 ? 0 : prev));
  }, [product]);

  const { data: related } = useQuery({
    queryKey: ["related-products", product?.id, product?.category, (product as any)?.suggested_product_ids],
    enabled: !!product,
    queryFn: async () => {
      const suggested: string[] = Array.isArray((product as any)?.suggested_product_ids)
        ? (product as any).suggested_product_ids
        : [];
      if (suggested.length > 0) {
        const { data } = await supabase
          .from("products")
          .select("*")
          .in("id", suggested)
          .eq("is_active", true);
        if (data && data.length > 0) return data;
      }
      const q = supabase.from("products").select("*").eq("is_active", true).neq("id", product!.id).limit(4);
      if (product?.category) q.eq("category", product.category);
      const { data } = await q;
      return data ?? [];
    },
  });

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-pd"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").single();
      return data;
    },
  });

  const { data: categoryMap } = useQuery({
    queryKey: ["product-categories-map"],
    queryFn: async () => {
      const { data } = await supabase.from("product_categories").select("value,label");
      const m: Record<string, string> = {};
      (data || []).forEach((c: any) => { m[c.value] = c.label; });
      return m;
    },
  });
  const categoryLabel = product?.category ? (categoryMap?.[product.category] || product.category) : "";

  const { data: reviews = [], refetch: refetchReviews } = useQuery({
    queryKey: ["product-reviews", product?.id],
    enabled: !!product?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_reviews")
        .select("id,rating,comment,customer_name,created_at,shop_customer_id")
        .eq("product_id", product!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const hasPurchased = !!shopCustomer && !!product && (customerOrders || []).some((o: any) => o.product_id === product.id);

  const myReview = reviews.find((r: any) => r.shop_customer_id === shopCustomer?.id);

  useEffect(() => {
    if (myReview) {
      setReviewRating(myReview.rating);
      setReviewComment(myReview.comment || "");
    }
  }, [myReview?.id]);

  const submitReview = async () => {
    const token = localStorage.getItem(SHOP_TOKEN_KEY);
    if (!token || !product?.id) return;
    setSubmittingReview(true);
    const { error } = await supabase.rpc("submit_product_review", {
      _token: token,
      _product_id: product.id,
      _rating: reviewRating,
      _comment: reviewComment,
    });
    setSubmittingReview(false);
    if (error) {
      toast.error(error.message || "রিভিউ জমা দিতে ব্যর্থ");
      return;
    }
    toast.success("রিভিউ জমা হয়েছে");
    refetchReviews();
  };

  const contactPhone = product?.contact_info || siteSettings?.contact_phone || "";
  const whatsappNo = siteSettings?.whatsapp_no || contactPhone;

  const images = useMemo<string[]>(() => {
    if (!product) return [];
    const arr: string[] = [];
    if (product.image_url) arr.push(product.image_url);
    if (Array.isArray(product.images)) {
      for (const im of product.images as any[]) {
        if (typeof im === "string" && im && !arr.includes(im)) arr.push(im);
      }
    }
    return arr.length ? arr : [""];
  }, [product]);

  const variants: any[] = Array.isArray((product as any)?.variants) ? (product as any).variants : [];
  const chosenVariant = variants.length > 0 && selectedVariantIdx >= 0 ? variants[selectedVariantIdx] : null;
  const baseHasDiscount = product?.discount_price && product.discount_price < product.price;
  const variantHasDiscount = chosenVariant && chosenVariant.discount_price != null && Number(chosenVariant.discount_price) < Number(chosenVariant.price);
  const hasDiscount = chosenVariant ? variantHasDiscount : baseHasDiscount;
  const origPrice = chosenVariant ? Number(chosenVariant.price ?? 0) : Number(product?.price ?? 0);
  const unitPrice = chosenVariant
    ? Number(chosenVariant.discount_price ?? chosenVariant.price ?? 0)
    : (baseHasDiscount ? product!.discount_price! : product?.price ?? 0);
  const total = unitPrice * qty;
  const discountPct = hasDiscount && origPrice > 0 ? Math.round(((origPrice - unitPrice) / origPrice) * 100) : 0;
  const variantWeight = chosenVariant && chosenVariant.weight_grams != null ? Number(chosenVariant.weight_grams) : null;
  const wPer = variantWeight && variantWeight > 0 ? variantWeight : Number(product?.weight_grams || 0);
  const totalWeight = wPer * qty;
  const dlv = calculateDelivery(total, totalWeight, deliverySettings);
  const grandTotal = total + dlv.charge;

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    setOrderForm(f => ({ ...f, phone: digits }));
    setPhoneError(digits.length > 0 && digits.length !== 11 ? "মোবাইল নম্বর অবশ্যই ১১ ডিজিটের হতে হবে" : "");
  };

  const handleOrderSubmit = async () => {
    if (!orderForm.name.trim()) return toast.error("আপনার নাম দিন");
    if (orderForm.phone.length !== 11) { setPhoneError("মোবাইল নম্বর অবশ্যই ১১ ডিজিটের হতে হবে"); return; }
    if (!orderForm.address.trim()) return toast.error("আপনার ঠিকানা দিন");
    if (variants.length > 0 && !chosenVariant) return toast.error("একটি অপশন বাছাই করুন");
    if (orderForm.payment_method !== "cod") {
      if (orderForm.payment_sender_no.length !== 11) return toast.error("আপনার পেমেন্ট নম্বর দিন (১১ ডিজিট)");
      if (!orderForm.payment_trx_id.trim()) return toast.error("ট্রানজেকশন আইডি দিন");
    }
    setSubmitting(true);
    try {
      const variantLabel = chosenVariant ? String(chosenVariant.label) : null;
      const baseName = product?.name || "প্রডাক্ট";
      const { error } = await supabase.from("orders").insert({
        customer_name: orderForm.name.trim(),
        customer_phone: orderForm.phone,
        customer_address: orderForm.address.trim(),
        product_name: variantLabel ? `${baseName} (${variantLabel})` : baseName,
        variant_label: variantLabel,
        quantity: qty,
        unit_price: unitPrice,
        total_amount: grandTotal,
        delivery_charge: dlv.charge,
        payment_method: orderForm.payment_method,
        payment_sender_no: orderForm.payment_method !== "cod" ? orderForm.payment_sender_no : null,
        payment_trx_id: orderForm.payment_method !== "cod" ? orderForm.payment_trx_id.trim() : null,
      } as any);
      if (error) throw error;
      setOrderSuccess(true);
      setOrderForm({ name: "", phone: "", address: "", payment_method: "cod", payment_sender_no: "", payment_trx_id: "" });
    } catch {
      toast.error("অর্ডার করতে সমস্যা হয়েছে");
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
          product_name: product?.name || "প্রডাক্ট",
          quantity: qty,
          unit_price: 0,
          total_amount: 0,
          status: "abandoned" as any,
        });
      } catch {}
    }
    setOrderOpen(false);
    setOrderForm({ name: "", phone: "", address: "", payment_method: "cod", payment_sender_no: "", payment_trx_id: "" });
  };

  const openOrder = () => {
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

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: product?.name, url });
      else { await navigator.clipboard.writeText(url); toast.success("লিংক কপি হয়েছে"); }
    } catch {}
  };

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  }
  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <ShoppingBag className="h-16 w-16 text-gray-300" />
        <p className="text-muted-foreground">পণ্য পাওয়া যায়নি</p>
        <Button onClick={() => navigate("/products")} style={{ backgroundColor: BRAND_GREEN }} className="text-white rounded-full">
          শপে ফিরে যান
        </Button>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen pb-16 md:pb-0 text-slate-900 bg-white"
      style={{ fontFamily: "'Tiro Bangla', serif" }}
    >
      <div className="relative z-10">


      {/* Top Strip */}
      <div className="text-white text-xs md:text-sm py-2 px-4" style={{ backgroundColor: BRAND_GREEN }}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center">
          <span>WhatsApp করুন:</span>
          {whatsappNo && (
            <a href={`https://wa.me/${whatsappNo.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="font-bold hover:underline">
              +{whatsappNo}
            </a>
          )}
          {contactPhone && <><span className="opacity-60 hidden md:inline">|</span><span>কল:</span><a href={`tel:${contactPhone}`} className="font-bold hover:underline">{contactPhone}</a></>}
        </div>
      </div>

      {/* Header */}
      <header className="bg-card shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/products" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: BRAND_GREEN }}>KM</div>
            <div>
              <div className="font-bold text-base" style={{ color: BRAND_GREEN }}>কে এম শপ</div>
              <div className="text-[10px] text-muted-foreground -mt-0.5">কুয়াকাটা</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={cart.open} className="relative p-2.5 rounded-full hover:bg-muted transition-colors text-foreground/80" aria-label="cart">
              <ShoppingCart className="h-5 w-5" />
              {cart.count > 0 && (
                <span className="absolute -top-1 -right-1 z-20 bg-primary text-primary-foreground text-[10px] leading-none font-extrabold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center ring-2 ring-card shadow-lg">
                  {toBn(cart.count)}
                </span>
              )}
            </button>
            <Link to="/products">
              <Button variant="outline" size="sm" className="rounded-full text-xs gap-1">
                <ChevronLeft className="h-3 w-3" /> শপে ফিরুন
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 pt-4 text-xs md:text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
        <Link to="/products" className="hover:text-foreground flex items-center gap-1"><Home className="h-3 w-3" /> হোম</Link>
        <span>/</span>
        {product.category && <><span className="hover:text-foreground">{categoryLabel}</span><span>/</span></>}
        <span className="text-foreground font-medium line-clamp-1">{product.name}</span>
      </div>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="relative grid md:grid-cols-2 gap-6 md:gap-10 rounded-2xl p-4 md:p-6 bg-white border border-slate-200">



          {/* Image gallery */}
          <div>
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted mb-3">
              {images[activeImg] ? (
                <WatermarkedImage src={images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-20 w-20 text-gray-300" /></div>
              )}
              {hasDiscount && (
                <div className="absolute top-3 left-3 bg-card shadow text-blue-600 font-bold text-sm px-3 py-1.5 rounded">
                  -{toBn(discountPct)}%
                </div>
              )}
              <div className="absolute top-3 right-3 text-white text-xs font-bold px-3 py-1.5 rounded shadow" style={{ backgroundColor: ACCENT_RED }}>HOT</div>

              {images.length > 1 && (
                <>
                  <button onClick={() => setActiveImg((activeImg - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-card/90 rounded-full shadow flex items-center justify-center hover:bg-card">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={() => setActiveImg((activeImg + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-card/90 rounded-full shadow flex items-center justify-center hover:bg-card">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((im, i) => (
                  <button key={i} onClick={() => setActiveImg(i)} className={`shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition-all ${activeImg === i ? 'border-[#3b82f6]' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                    {im ? <img src={im} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-muted" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">{product.name}</h1>

            <div className="flex items-baseline gap-3 mt-4 pb-4 border-b">
              {hasDiscount && <span className="text-lg text-muted-foreground line-through">৳{toBn(origPrice)}</span>}
              <span className="text-3xl font-extrabold" style={{ color: BRAND_GREEN }}>৳{toBn(unitPrice)}</span>
              {hasDiscount && (
                <span className="text-xs font-bold text-blue-600 bg-slate-50 px-2 py-0.5 rounded">
                  সাশ্রয় ৳{toBn(origPrice - unitPrice)}
                </span>
              )}
            </div>

            {((product as any).short_description_html || (product as any).short_description) && (
              (product as any).short_description_html ? (
                <div
                  className="rich-desc text-sm text-foreground leading-relaxed mt-4 max-w-none
                    [&_h1]:text-xl [&_h1]:font-bold [&_h1]:my-2 [&_h1]:text-foreground
                    [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:my-2 [&_h2]:text-foreground
                    [&_p]:my-1.5
                    [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5
                    [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5
                    [&_strong]:font-bold [&_em]:italic [&_u]:underline
                    [&_a]:text-blue-600 [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: (product as any).short_description_html }}
                />
              ) : (
                <p className="text-foreground/80 text-sm leading-relaxed mt-4 whitespace-pre-wrap">{(product as any).short_description}</p>
              )
            )}

            {/* Stock */}
            <div className="flex items-center gap-2 mt-4 text-xs">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold ${product.stock_status === 'out_of_stock' ? 'bg-slate-50 text-blue-600' : 'bg-slate-50 text-blue-700'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${product.stock_status === 'out_of_stock' ? 'bg-blue-600' : 'bg-blue-600'}`} />
                {product.stock_status === 'out_of_stock' ? 'স্টক শেষ' : 'স্টকে আছে'}
              </span>
              {product.category && <span className="text-muted-foreground">ক্যাটাগরি: <span className="text-foreground font-medium">{categoryLabel}</span></span>}
            </div>

            {/* Variants (size / weight / option) */}
            {variants.length > 0 && (
              <div className="mt-6">
                <Label className="text-sm font-semibold text-foreground block mb-2">
                  {(product as any).unit_type === "kg" ? "ওজন বাছাই করুন" : (product as any).unit_type === "size" ? "সাইজ বাছাই করুন" : "অপশন বাছাই করুন"}
                  <span className="text-blue-600"> *</span>
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {variants.map((v: any, i: number) => {
                    const vPrice = v.discount_price ?? v.price;
                    const vDiscount = v.discount_price != null && Number(v.discount_price) < Number(v.price);
                    const active = selectedVariantIdx === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedVariantIdx(i)}
                        className={`text-left border-2 rounded-xl px-3 py-2 transition-all ${active ? "border-blue-600 bg-gradient-to-br from-red-950/80 via-slate-900/60 to-slate-100/50 shadow-[0_8px_20px_-8px_rgba(220,38,38,0.55)]" : "border-border bg-card hover:border-blue-600/40"}`}
                      >
                        <div className="font-bold text-sm text-foreground">{v.label}</div>
                        <div className="text-xs">
                          <span className="font-bold" style={{ color: BRAND_GREEN }}>৳{toBn(Number(vPrice))}</span>
                          {vDiscount && <span className="line-through text-muted-foreground ml-1">৳{toBn(Number(v.price))}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mt-6">
              <Label className="text-sm font-semibold text-foreground block mb-2">পরিমাণ</Label>
              <div className="flex items-center gap-3">
                <div className="flex items-center border-2 border-border rounded-full overflow-hidden">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-muted">
                    <Minus className="h-4 w-4" />
                  </button>
                  <input type="number" value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} className="w-12 h-10 text-center font-bold outline-none bg-card text-foreground" />
                  <button onClick={() => setQty(qty + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-muted">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-sm text-muted-foreground">
                  মোট: <span className="font-bold text-base" style={{ color: BRAND_GREEN }}>৳{toBn(total)}</span>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <Button
                onClick={() => {
                  if (variants.length > 0 && !chosenVariant) { toast.error("একটি অপশন বাছাই করুন"); return; }
                  cart.setOffer(null);
                  cart.addItem({
                    product_id: product!.id,
                    product_name: chosenVariant ? `${product!.name} (${chosenVariant.label})` : product!.name,
                    image_url: product!.image_url,
                    variant_label: chosenVariant ? String(chosenVariant.label) : null,
                    unit_price: unitPrice,
                    quantity: qty,
                    unit_type: (product as any)?.unit_type ?? null,
                    weight_grams: wPer,
                  });
                  toast.success("কার্টে যুক্ত হয়েছে");
                  cart.open();
                }}
                className="glossy-btn-amber h-12 rounded-full font-bold gap-2 inline-flex items-center justify-center px-6"
              >
                <ShoppingCart className="h-4 w-4" /> কার্টে যোগ করুন
              </Button>
              <Button
                onClick={() => {
                  if (variants.length > 0 && !chosenVariant) { toast.error("একটি অপশন বাছাই করুন"); return; }
                  openOrder();
                }}
                className="h-12 rounded-full font-bold gap-2"
              >
                এখনই কিনুন
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              {contactPhone && (
                <a href={`tel:${contactPhone}`}>
                  <Button className="w-full h-11 text-white font-bold rounded-full gap-2" style={{ backgroundColor: BRAND_GREEN }}>
                    <Phone className="h-4 w-4" /> কল করুন
                  </Button>
                </a>
              )}
              {whatsappNo && (
                <a href={`https://wa.me/${whatsappNo.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full h-11 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-full gap-2">
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </Button>
                </a>
              )}
            </div>

            {/* Trust */}
            <div className="grid grid-cols-3 gap-2 mt-6 pt-6 border-t">
              {[
                { icon: Truck, t: "দ্রুত ডেলিভারি" },
                { icon: ShieldCheck, t: "১০০% খাঁটি" },
                { icon: Tag, t: "সেরা দাম" },
              ].map((it, i) => (
                <div key={i} className="text-center">
                  <div className="w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-1" style={{ backgroundColor: `${BRAND_GREEN}15` }}>
                    <it.icon className="h-5 w-5" style={{ color: BRAND_GREEN }} />
                  </div>
                  <div className="text-[11px] text-muted-foreground font-medium">{it.t}</div>
                </div>
              ))}
            </div>

            {/* Share */}
            <button onClick={handleShare} className="mt-5 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground self-start">
              <Share2 className="h-3.5 w-3.5" /> শেয়ার করুন
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-card rounded-2xl mt-6 border border-border shadow-sm overflow-hidden">
          <div className="flex border-b">
            {[{k:"desc",l:"DESCRIPTION"},{k:"reviews",l:`REVIEWS (${toBn(reviews.length)})`}].map(t => (
              <button key={t.k} onClick={() => setTab(t.k as any)} className={`px-6 py-4 text-sm font-bold border-b-2 transition-colors ${tab === t.k ? 'border-[#3b82f6] text-[#3b82f6]' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {t.l}
              </button>
            ))}
          </div>
          <div className="p-6 text-sm text-foreground leading-relaxed">
            {tab === "desc" ? (
              <div className="space-y-3">
                <h3 className="font-bold text-base text-foreground">{product.name}</h3>
                {(product as any).description_html ? (
                  <div
                    className="rich-desc max-w-none
                      [&_h1]:text-xl [&_h1]:font-bold [&_h1]:my-2 [&_h1]:text-foreground
                      [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:my-2 [&_h2]:text-foreground
                      [&_p]:my-1.5
                      [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5
                      [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5
                      [&_strong]:font-bold [&_em]:italic [&_u]:underline
                      [&_a]:text-blue-600 [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: (product as any).description_html }}
                  />
                ) : (
                  <p className="whitespace-pre-wrap">{product.description || "এই পণ্যটি কুয়াকাটা থেকে সংগ্রহ করা ১০০% খাঁটি ও তাজা। আমরা সরাসরি স্থানীয় উৎস থেকে সংগ্রহ করি, তাই গুণগত মান নিশ্চিত।"}</p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {reviews.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">এখনো কোনো রিভিউ নেই</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((r: any) => {
                      const name = (r.customer_name || "গ্রাহক").trim();
                      const initial = name.charAt(0).toUpperCase();
                      const colors = ["#3b82f6","#7c3aed","#0891b2","#ea580c","#3b82f6","#db2777","#2563eb","#ca8a04"];
                      const hue = colors[(name.charCodeAt(0) || 0) % colors.length];
                      return (
                        <div key={r.id} className="border border-border rounded-xl p-4 bg-background/40">
                          <div className="flex items-start gap-3 mb-2">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm"
                              style={{ backgroundColor: hue }}
                              aria-hidden
                            >
                              {initial}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="font-semibold text-foreground text-sm truncate">{name}</div>
                                <div className="text-[11px] text-muted-foreground shrink-0">{new Date(r.created_at).toLocaleDateString("bn-BD")}</div>
                              </div>
                              <div className="flex gap-0.5 mt-1">
                                {[1,2,3,4,5].map(n => (
                                  <Star key={n} className={`h-3.5 w-3.5 ${n <= r.rating ? 'fill-[#3b82f6] text-[#3b82f6]' : 'text-muted-foreground/40'}`} />
                                ))}
                              </div>
                            </div>
                          </div>
                          {r.comment && <p className="text-sm text-foreground/90 whitespace-pre-wrap pl-[52px]">{r.comment}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="border-t border-border pt-5">
                  {!shopCustomer ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground text-sm mb-3">রিভিউ দিতে হলে লগইন করুন</p>
                      <Link to="/shop/login" className="inline-flex items-center px-5 py-2 rounded-lg bg-[#3b82f6] text-white text-sm font-semibold hover:brightness-110">লগইন</Link>
                    </div>
                  ) : !hasPurchased ? (
                    <p className="text-center text-muted-foreground text-sm py-4">শুধুমাত্র যারা এই পণ্যটি কিনেছেন তারাই রিভিউ দিতে পারবেন।</p>
                  ) : (
                    <div className="space-y-3">
                      <h4 className="font-bold text-foreground text-sm">{myReview ? "আপনার রিভিউ আপডেট করুন" : "আপনার রিভিউ দিন"}</h4>
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map(n => (
                          <button key={n} type="button" onClick={() => setReviewRating(n)} className="p-1">
                            <Star className={`h-6 w-6 transition ${n <= reviewRating ? 'fill-[#3b82f6] text-[#3b82f6]' : 'text-muted-foreground/40'}`} />
                          </button>
                        ))}
                      </div>
                      <Textarea
                        placeholder="পণ্য সম্পর্কে আপনার মতামত লিখুন..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        rows={3}
                      />
                      <Button onClick={submitReview} disabled={submittingReview} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                        {submittingReview ? "জমা হচ্ছে..." : myReview ? "আপডেট করুন" : "জমা দিন"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related */}
        {related && related.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold text-foreground mb-4">সম্পর্কিত পণ্য</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map((p: any) => {
                const hd = p.discount_price && p.discount_price < p.price;
                return (
                  <Link key={p.id} to={`/products/${p.slug || p.id}`} className="group bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-border">
                    <div className="aspect-square bg-muted overflow-hidden">
                      {p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-10 w-10 text-gray-300" /></div>}
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-sm text-foreground line-clamp-2 min-h-[2.5rem]">{p.name}</h3>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-base font-extrabold" style={{ color: BRAND_GREEN }}>৳{toBn(hd ? p.discount_price : p.price)}</span>
                        {hd && <span className="text-xs text-muted-foreground line-through">৳{toBn(p.price)}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <footer className="text-white py-6 text-center text-xs mt-10" style={{ backgroundColor: BRAND_DARK }}>
        © {toBn(new Date().getFullYear())} কে এম শপ। সর্বস্বত্ব সংরক্ষিত।
      </footer>

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
                <h3 className="text-2xl font-bold text-foreground mb-2">অর্ডার সফল! 🎉</h3>
                <p className="text-muted-foreground text-sm mb-6">আমরা শীঘ্রই আপনার সাথে যোগাযোগ করবো।</p>
                <Button onClick={() => setOrderOpen(false)} className="w-full text-white font-bold py-4 rounded-2xl" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>ঠিক আছে</Button>
              </div>
            ) : (
              <>
                <div className="relative px-5 py-5" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-card/20 rounded-xl flex items-center justify-center"><ShoppingCart className="h-5 w-5 text-white" /></div>
                      <div>
                        <h3 className="text-lg font-bold text-white">অর্ডার করুন</h3>
                        <p className="text-white/70 text-xs">তথ্য দিয়ে কনফার্ম করুন</p>
                      </div>
                    </div>
                    <button onClick={closeOrderDialog} className="w-8 h-8 rounded-full bg-card/15 flex items-center justify-center text-white/80"><X className="h-4 w-4" /></button>
                  </div>
                </div>

                <div className="mx-5 mt-4 space-y-3">
                  <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl p-4 flex items-center gap-3">
                    {product.image_url && <img src={product.image_url} alt="" className="w-14 h-14 rounded-xl object-cover" />}
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">পণ্যের মূল্য</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-extrabold" style={{ color: BRAND_DARK }}>৳{toBn(total)}</span>
                        {hasDiscount && <span className="line-through text-muted-foreground text-xs">৳{toBn(origPrice * qty)}</span>}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {product.name}{chosenVariant ? ` — ${chosenVariant.label}` : ""}
                      </p>
                    </div>
                  </div>

                </div>


                <div className="p-5 space-y-4">
                  <div>
                    <Label className="text-foreground font-bold text-sm mb-2 block">আপনার নাম <span className="text-blue-600">*</span></Label>
                    <Input value={orderForm.name} onChange={e => setOrderForm(f => ({ ...f, name: e.target.value }))} placeholder="পুরো নাম" className="h-12 rounded-2xl border-2 border-border bg-card text-foreground placeholder:text-muted-foreground" />
                  </div>
                  <div>
                    <Label className="text-foreground font-bold text-sm mb-2 block">মোবাইল <span className="text-blue-600">*</span></Label>
                    <Input type="tel" inputMode="numeric" pattern="[0-9]*" value={orderForm.phone} onChange={e => handlePhoneChange(e.target.value)} placeholder="01XXXXXXXXX" maxLength={11} className={`h-12 rounded-2xl border-2 bg-card text-foreground placeholder:text-muted-foreground ${phoneError ? 'border-slate-300' : 'border-border'}`} />
                    {phoneError && <p className="text-blue-600 text-xs mt-1.5">{phoneError}</p>}
                  </div>
                  <div>
                    <Label className="text-foreground font-bold text-sm mb-2 block">ঠিকানা <span className="text-blue-600">*</span></Label>
                    <Textarea value={orderForm.address} onChange={e => setOrderForm(f => ({ ...f, address: e.target.value }))} placeholder="সম্পূর্ণ ঠিকানা" rows={3} className="rounded-2xl border-2 border-border bg-card text-foreground placeholder:text-muted-foreground resize-none" />
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

                  <div className="relative rounded-2xl p-[1.5px] bg-gradient-to-br from-slate-300 via-blue-500 to-blue-600 shadow-lg">
                    <div className="rounded-[14px] bg-gradient-to-br from-slate-50 via-white to-slate-50 p-3.5 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-foreground/80 flex items-center gap-2 font-medium">
                          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                            <TruckIcon className="h-3.5 w-3.5 text-white" />
                          </span>
                          ডেলিভারি চার্জ
                        </span>
                        {dlv.isFree ? (
                          <span className="font-extrabold text-xs px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-600 to-blue-600 text-white shadow">🎉 ফ্রি</span>
                        ) : (
                          <span className="font-extrabold text-foreground">৳{toBn(dlv.charge)}</span>
                        )}
                      </div>
                      {!dlv.isFree && deliverySettings.free_delivery_enabled && dlv.amountToFree > 0 && (
                        <div className="text-[11px] text-slate-900 bg-slate-100/70 border border-slate-200 rounded-lg px-2.5 py-1.5">
                          🚚 আর মাত্র <span className="font-extrabold">৳{toBn(dlv.amountToFree)}</span> অর্ডার করলেই <span className="font-extrabold">ফ্রি ডেলিভারি!</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-300">
                        <span className="font-bold text-foreground text-base">মোট পেমেন্ট</span>
                        <span className="font-extrabold text-2xl bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
                          ৳{toBn(grandTotal)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleOrderSubmit} disabled={submitting} className="w-full text-white font-bold text-base h-14 rounded-2xl gap-2 shadow-lg" style={{ background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})` }}>
                    <ShoppingCart className="h-5 w-5" />
                    {submitting ? "অর্ডার হচ্ছে..." : "অর্ডার কনফার্ম করুন"}
                  </Button>
                  {whatsappNo && (
                    <Button
                      type="button"
                      onClick={() => {
                        const lines = [
                          `🛒 *নতুন অর্ডার*`,
                          ``,
                          `📦 পণ্য: ${product?.name || ""}`,
                          `🔢 পরিমাণ: ${toBn(qty)}`,
                          `💰 একক মূল্য: ৳${toBn(unitPrice)}`,
                          `🧾 সাবটোটাল: ৳${toBn(total)}`,
                          `🚚 ডেলিভারি: ${dlv.isFree ? "ফ্রি" : `৳${toBn(dlv.charge)}`}`,
                          `✅ মোট পেমেন্ট: ৳${toBn(grandTotal)}`,
                          `💵 পেমেন্ট: ক্যাশ অন ডেলিভারি`,
                          ``,
                          `👤 নাম: ${orderForm.name || "-"}`,
                          `📱 মোবাইল: ${orderForm.phone || "-"}`,
                          `📍 ঠিকানা: ${orderForm.address || "-"}`,
                        ];
                        const url = `https://wa.me/${whatsappNo.replace(/\D/g, "")}?text=${encodeURIComponent(lines.join("\n"))}`;
                        window.open(url, "_blank");
                      }}
                      className="w-full text-white font-bold text-base h-14 rounded-2xl gap-2 shadow-lg bg-[#25D366] hover:bg-[#1ebe57]"
                    >
                      <MessageCircle className="h-5 w-5" />
                      WhatsApp এ অর্ডার পাঠান
                    </Button>
                  )}
                  <p className="text-center text-muted-foreground text-xs">🔒 আপনার তথ্য সম্পূর্ণ নিরাপদ</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <MobileShopNav />
      <FloatingCartButton />
      </div>
    </div>
  );
};

export default ProductDetail;
