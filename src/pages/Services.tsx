import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Building, Heart, Film, Camera, Megaphone, Clapperboard,
  ChevronRight, Check, Star, ArrowLeft, MessageCircle, Phone,
  Sparkles, Play, Monitor, Palette, Mic, Video, Lightbulb, Timer, Gift, Percent, Clock, Minus, Plus as PlusIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogContent, AlertDialogTitle,
  AlertDialogDescription, AlertDialogCancel,
} from "@/components/ui/alert-dialog";

const iconMap: Record<string, any> = {
  Building, Heart, Film, Camera, Megaphone, Clapperboard,
  Star, MessageCircle, Phone, Sparkles, Play, Monitor,
  Palette, Mic, Video, Lightbulb,
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

const Services = () => {
  const { t } = useLanguage();
  const [bookingService, setBookingService] = useState<any | null>(null);
  const [bookingStep, setBookingStep] = useState<'options' | 'form'>('options');
  const [bookingForm, setBookingForm] = useState({ name: '', phone: '', address: '' });
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [minuteSelections, setMinuteSelections] = useState<Record<string, number>>({});
  const [hourSelections, setHourSelections] = useState<Record<string, number>>({});

  const { data: services } = useQuery({
    queryKey: ["public-services"],
    queryFn: async () => {
      const { data } = await supabase.from("services" as any).select("*").eq("is_active", true).order("sort_order", { ascending: true });
      return (data ?? []) as any[];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").limit(1).single();
      return data;
    },
  });

  const { data: activeOffer } = useQuery({
    queryKey: ["active-service-offer"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("service_offers")
        .select("*")
        .eq("is_active", true)
        .gte("offer_end_date", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    if (!activeOffer?.offer_end_date) return;
    const calc = () => {
      const diff = new Date(activeOffer.offer_end_date).getTime() - Date.now();
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    };
    setTimeLeft(calc());
    const interval = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(interval);
  }, [activeOffer?.offer_end_date]);

  const getWaUrl = (serviceTitle: string, discount: number, price?: number, perMinuteInfo?: { rate: number; minutes: number }, perHourInfo?: { rate: number; hours: number; editedPhotos: number }) => {
    const phone = (settings as any)?.whatsapp_no?.replace(/[^0-9]/g, '') || '';
    const offerText = discount > 0 ? ` (${discount}% ডিসকাউন্ট সহ)` : '';
    let priceText = '';
    if (perHourInfo) {
      const total = perHourInfo.rate * perHourInfo.hours;
      const finalPrice = getDiscountedPrice(total, discount);
      priceText = ` • ${perHourInfo.hours} ঘন্টা • এডিটেড ছবি: ${perHourInfo.editedPhotos * perHourInfo.hours}টি • মূল্য: ৳${finalPrice}`;
    } else if (perMinuteInfo) {
      const total = perMinuteInfo.rate * perMinuteInfo.minutes;
      const finalPrice = getDiscountedPrice(total, discount);
      priceText = ` • ${perMinuteInfo.minutes} মিনিট • মূল্য: ৳${finalPrice}`;
    } else if (price) {
      priceText = ` • মূল্য: ৳${getDiscountedPrice(price, discount)}`;
    }
    return `https://wa.me/${phone}?text=${encodeURIComponent(`আমি "${serviceTitle}" প্যাকেজ বুকিং করতে চাই।${priceText}${offerText}`)}`;
  };

  const setMinutes = (serviceId: string, val: number) => {
    setMinuteSelections(prev => ({ ...prev, [serviceId]: Math.max(1, val) }));
  };
  const setHours = (serviceId: string, val: number) => {
    setHourSelections(prev => ({ ...prev, [serviceId]: Math.max(1, val) }));
  };

  const parsePriceFromLabel = (label: string): number | null => {
    const cleaned = label.replace(/[^\d.,০১২৩৪৫৬৭৮৯]/g, '');
    const banglaToEn = cleaned.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
    const num = parseFloat(banglaToEn.replace(/,/g, ''));
    return isNaN(num) ? null : num;
  };

  const getServicePrice = (service: any): number | null => {
    if (service.price) return Number(service.price);
    if (service.price_label) return parsePriceFromLabel(service.price_label);
    return null;
  };

  const getServiceDiscount = (service: any): number => {
    // 1. Per-service discount takes priority
    if (service.discount_percentage) return Number(service.discount_percentage);
    // 2. Active offer discount (if offer applies to this service)
    if (activeOffer?.discount_percentage) {
      const offerServiceIds = (activeOffer.service_ids as string[]) || [];
      // If no services selected in offer, applies to all
      if (offerServiceIds.length === 0 || offerServiceIds.includes(service.id)) {
        return Number(activeOffer.discount_percentage);
      }
    }
    return 0;
  };

  const getDiscountedPrice = (price: number, discount?: number) => {
    const d = discount ?? 0;
    if (d > 0) {
      return Math.round(price - (price * d / 100));
    }
    return price;
  };

  const featured = services?.filter((s: any) => s.is_featured) ?? [];
  const others = services?.filter((s: any) => !s.is_featured) ?? [];

  return (
    <div className="min-h-screen bg-background noise-bg font-bangla">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-background/60 backdrop-blur-2xl saturate-150 border-b border-border/20" />
        <div className="container max-w-6xl mx-auto relative z-10 flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img src="/favicon.png" alt="KM Production House" className="h-10 w-10 rounded-xl object-contain relative z-10" />
              <div className="absolute inset-0 bg-primary/30 rounded-xl blur-lg group-hover:bg-primary/50 transition-colors" />
            </div>
            <span className="font-bold text-foreground text-lg tracking-tight hidden sm:inline">{settings?.site_name || "KM Production House"}</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <ArrowLeft className="h-4 w-4 mr-1" /> {t("হোম", "Home")}
              </Button>
            </Link>
            {(settings as any)?.whatsapp_no && (
              <a href={`https://wa.me/${(settings as any).whatsapp_no.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-semibold">
                  <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                </Button>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-primary/8 rounded-full blur-[180px]" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[140px]" />
        </div>
        <div className="container max-w-4xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wider uppercase mb-6">
              {t("আমাদের সেবাসমূহ", "Our Services")}
            </span>
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl text-foreground tracking-wider leading-tight">
              {t("আপনার প্রোডাকশনের", "Your Production's")}
              <br />
              <span className="gradient-text">{t("সম্পূর্ণ সমাধান", "Complete Solution")}</span>
            </h1>
            <p className="text-muted-foreground text-lg mt-6 max-w-2xl mx-auto leading-relaxed">
              আমরা <span className="font-bold text-amber-400">কুয়াকাটা মাল্টিমিডিয়া টিম</span> — <span className="font-bold text-cyan-400">দীর্ঘ ৭ বছর</span> ধরে এই সেক্টরে অভিজ্ঞ ও দক্ষ টিম নিয়ে কাজ করে আসছি। বিজ্ঞাপন, বিয়ে বাড়ি, নাটক নির্মাণ থেকে শুরু করে ভিডিও এডিটিং — সবকিছুর জন্য আমরা আপনার পাশে।
            </p>
          </motion.div>
        </div>
      </section>

      {/* Offer Countdown Banner */}
      {activeOffer && (timeLeft.days > 0 || timeLeft.hours > 0 || timeLeft.minutes > 0 || timeLeft.seconds > 0) && (
        <section className="px-3 sm:px-4 -mt-4 sm:-mt-6 mb-6 sm:mb-8 relative z-20">
          <div className="container max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, type: "spring" }}
              className="relative overflow-hidden rounded-xl sm:rounded-2xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-red-500/15 backdrop-blur-xl p-4 sm:p-6 md:p-8"
            >
              {/* Animated bg dots */}
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <div className="absolute -top-10 -left-10 w-28 sm:w-40 h-28 sm:h-40 bg-amber-500/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -right-10 w-28 sm:w-40 h-28 sm:h-40 bg-red-500/20 rounded-full blur-3xl" />

              <div className="relative z-10 text-center">
                <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 mb-3 sm:mb-4">
                  <Gift className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
                  <span className="text-xs sm:text-sm font-bold text-amber-300">{activeOffer.title}</span>
                  <Percent className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
                </div>

                <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-foreground mb-1.5 sm:mb-2">
                  <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
                    {activeOffer.discount_percentage}% ডিসকাউন্ট
                  </span>
                </h3>
                {activeOffer.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-5 max-w-lg mx-auto">{activeOffer.description}</p>
                )}

                {/* Countdown */}
                <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-5">
                  {[
                    { value: timeLeft.days, label: t("দিন", "Days"), color: "from-amber-500 to-amber-600" },
                    { value: timeLeft.hours, label: t("ঘণ্টা", "Hours"), color: "from-orange-500 to-orange-600" },
                    { value: timeLeft.minutes, label: t("মিনিট", "Min"), color: "from-red-500 to-red-600" },
                    { value: timeLeft.seconds, label: t("সেকেন্ড", "Sec"), color: "from-pink-500 to-pink-600" },
                  ].map((unit, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <motion.div
                        key={unit.value}
                        initial={{ scale: 1.2, opacity: 0.5 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className={`h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-xl sm:rounded-2xl bg-gradient-to-br ${unit.color} flex items-center justify-center shadow-lg shadow-amber-500/10`}
                      >
                        <span className="text-xl sm:text-2xl md:text-3xl font-black text-white tabular-nums">
                          {String(unit.value).padStart(2, '0')}
                        </span>
                      </motion.div>
                      <span className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground mt-1 sm:mt-1.5 font-medium">{unit.label}</span>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] sm:text-xs text-muted-foreground mt-3 sm:mt-4 flex items-center justify-center gap-1">
                  <Timer className="h-3 w-3" />
                  {t("সীমিত সময়ের অফার — এখনই বুকিং দিন!", "Limited time offer — Book now!")}
                </p>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Featured Services */}
      {featured.length > 0 && (
        <section className="py-16 px-4">
          <div className="container max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12 text-center"
            >
              <span className="text-primary text-xs font-bold tracking-[0.3em] uppercase">Featured</span>
              <h2 className="font-display text-3xl md:text-4xl text-foreground mt-2 tracking-wider">{t("জনপ্রিয় প্যাকেজ", "Popular Packages")}</h2>
            </motion.div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {featured.map((service: any, index: number) => {
                const IconComp = iconMap[service.icon] || Camera;
                const features = (service.features as string[]) || [];
                return (
                  <motion.div key={service.id} variants={item}>
                    <div className={`relative rounded-2xl overflow-hidden h-full ${
                      index === 1
                        ? "bg-gradient-to-b from-primary/20 via-primary/5 to-card border-2 border-primary/30 shadow-xl shadow-primary/10"
                        : "premium-card"
                    }`}>
                      {index === 1 && (
                        <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center py-1.5 text-xs font-bold tracking-wider uppercase">
                          ★ {t("সবচেয়ে জনপ্রিয়", "Most Popular")}
                        </div>
                      )}
                      <div className={`p-6 ${index === 1 ? "pt-10" : ""}`}>
                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-5 ${
                          index === 1 ? "bg-primary/20" : "bg-primary/10"
                        }`}>
                          <IconComp className="h-7 w-7 text-primary" />
                        </div>
                        <div className="mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{service.category}</span>
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">{service.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{service.description}</p>
                        
                        {/* Price Display */}
                        {(() => {
                          const numPrice = getServicePrice(service);
                          const perMin = service.price_per_minute ? Number(service.price_per_minute) : null;
                          const perHour = service.price_per_hour ? Number(service.price_per_hour) : null;
                          const editedPerHour = service.edited_photos_per_hour ? Number(service.edited_photos_per_hour) : 20;
                          const unlimitedPhotos = service.unlimited_photos_per_hour !== false;
                          const discount = getServiceDiscount(service);
                          
                          if (perHour) {
                            const hrs = hourSelections[service.id] || 1;
                            const totalPrice = perHour * hrs;
                            return (
                              <div className="mb-5 space-y-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4 text-primary" />
                                  <span>প্রতি ঘন্টা: <span className="font-bold text-foreground">৳{perHour.toLocaleString('bn-BD')}</span></span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => setHours(service.id, hrs - 1)} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <Input type="number" value={hrs} onChange={(e) => setHours(service.id, parseInt(e.target.value) || 1)} className="w-20 text-center h-8 text-sm" min={1} />
                                  <button onClick={() => setHours(service.id, hrs + 1)} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                                    <PlusIcon className="h-4 w-4" />
                                  </button>
                                  <span className="text-xs text-muted-foreground">ঘন্টা</span>
                                </div>
                                <div className="rounded-lg bg-primary/5 border border-primary/10 p-2.5 space-y-1">
                                  <div className="flex items-center gap-1.5 text-xs text-foreground/80">
                                    <Camera className="h-3.5 w-3.5 text-primary" />
                                    {unlimitedPhotos ? <span>প্রতি ঘন্টায় আনলিমিটেড ছবি</span> : <span>ছবি তোলা হবে</span>}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-foreground/80">
                                    <Check className="h-3.5 w-3.5 text-primary" />
                                    <span><span className="font-bold text-primary">{editedPerHour * hrs}টি</span> ছবি এডিট করে দেওয়া হবে</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Check className="h-3.5 w-3.5" />
                                    <span>বাকি সব ছবি এডিট ছাড়া দেওয়া হবে</span>
                                  </div>
                                </div>
                                {discount > 0 ? (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-base text-muted-foreground line-through">৳{totalPrice.toLocaleString('bn-BD')}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-3xl font-black text-primary">৳{getDiscountedPrice(totalPrice, discount).toLocaleString('bn-BD')}</span>
                                      <span className="text-xs px-2 py-1 rounded-full bg-amber-500 text-amber-950 font-bold">-{discount}%</span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-3xl font-black text-foreground">৳{totalPrice.toLocaleString('bn-BD')}</span>
                                )}
                              </div>
                            );
                          }

                          if (perMin) {
                            const mins = minuteSelections[service.id] || 1;
                            const totalPrice = perMin * mins;
                            return (
                              <div className="mb-5 space-y-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4 text-primary" />
                                  <span>প্রতি মিনিট: <span className="font-bold text-foreground">৳{perMin.toLocaleString('bn-BD')}</span></span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => setMinutes(service.id, mins - 1)} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <Input type="number" value={mins} onChange={(e) => setMinutes(service.id, parseInt(e.target.value) || 1)} className="w-20 text-center h-8 text-sm" min={1} />
                                  <button onClick={() => setMinutes(service.id, mins + 1)} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                                    <PlusIcon className="h-4 w-4" />
                                  </button>
                                  <span className="text-xs text-muted-foreground">মিনিট</span>
                                </div>
                                {discount > 0 ? (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-base text-muted-foreground line-through">৳{totalPrice.toLocaleString('bn-BD')}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-3xl font-black text-primary">৳{getDiscountedPrice(totalPrice, discount).toLocaleString('bn-BD')}</span>
                                      <span className="text-xs px-2 py-1 rounded-full bg-amber-500 text-amber-950 font-bold">-{discount}%</span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-3xl font-black text-foreground">৳{totalPrice.toLocaleString('bn-BD')}</span>
                                )}
                              </div>
                            );
                          }
                          
                          if (numPrice) {
                            return (
                              <div className="mb-5">
                                {discount > 0 ? (
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xl text-muted-foreground line-through">৳{numPrice.toLocaleString('bn-BD')}</span>
                                      <span className="text-xs px-2 py-1 rounded-full bg-amber-500 text-amber-950 font-bold">-{discount}%</span>
                                    </div>
                                    <span className="text-3xl font-black text-primary">৳{getDiscountedPrice(numPrice, discount).toLocaleString('bn-BD')}</span>
                                  </div>
                                ) : (
                                  <span className="text-3xl font-black text-foreground">৳{numPrice.toLocaleString('bn-BD')}</span>
                                )}
                              </div>
                            );
                          }
                          if (service.price_label) {
                            return (
                              <div className="mb-5">
                                <span className="text-lg font-bold text-muted-foreground">{service.price_label}</span>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        <div className="space-y-2.5 mb-6">
                          {features.map((f: string, i: number) => (
                            <div key={i} className="flex items-center gap-2.5">
                              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Check className="h-3 w-3 text-primary" />
                              </div>
                              <span className="text-sm text-foreground/80">{f}</span>
                            </div>
                          ))}
                        </div>

                        {(settings as any)?.whatsapp_no ? (
                          <Button
                            onClick={() => setBookingService(service)}
                            className={`w-full font-bold text-base py-5 shadow-lg transition-all duration-300 ${index === 1 ? "bg-green-600 hover:bg-green-700 text-white shadow-green-600/30 hover:shadow-green-600/50 hover:scale-[1.02]" : "bg-green-600 hover:bg-green-700 text-white shadow-green-600/20 hover:shadow-green-600/40 hover:scale-[1.02]"}`}
                          >
                            <MessageCircle className="h-5 w-5 mr-2" />
                            {t("বুকিং করুন", "Book Now")}
                          </Button>
                        ) : (
                          <Button className="w-full bg-secondary hover:bg-secondary/80 text-foreground" disabled>
                            {t("বুকিং করুন", "Book Now")}
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>
      )}

      {/* Other Services */}
      {others.length > 0 && (
        <section className="py-16 px-4">
          <div className="container max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12 text-center"
            >
              <span className="text-primary text-xs font-bold tracking-[0.3em] uppercase">More Services</span>
              <h2 className="font-display text-3xl md:text-4xl text-foreground mt-2 tracking-wider">{t("আরো সেবাসমূহ", "More Services")}</h2>
            </motion.div>

            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 justify-items-center"
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
            >
              {others.map((service: any, index: number) => {
                const IconComp = iconMap[service.icon] || Camera;
                const features = (service.features as string[]) || [];
                const totalOthers = others.length;
                const remainder = totalOthers % 3;
                const isLastRow = index >= totalOthers - remainder;
                const shouldCenter = remainder === 1 && isLastRow;
                return (
                  <motion.div
                    key={service.id}
                    variants={item}
                    className={`w-full ${shouldCenter ? "sm:col-span-2 lg:col-span-1 lg:col-start-2" : ""}`}
                  >
                    <div className="premium-card rounded-2xl p-6 h-full flex flex-col">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <IconComp className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{service.category}</span>
                          <h3 className="text-lg font-bold text-foreground">{service.title}</h3>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3 flex-1">{service.description}</p>
                      
                      {/* Price Display */}
                      {(() => {
                        const numPrice = getServicePrice(service);
                        const perMin = service.price_per_minute ? Number(service.price_per_minute) : null;
                        const perHour = service.price_per_hour ? Number(service.price_per_hour) : null;
                        const editedPerHour = service.edited_photos_per_hour ? Number(service.edited_photos_per_hour) : 20;
                        const unlimitedPhotos = service.unlimited_photos_per_hour !== false;
                        const discount = getServiceDiscount(service);
                        
                        if (perHour) {
                          const hrs = hourSelections[service.id] || 1;
                          const totalPrice = perHour * hrs;
                          return (
                            <div className="mb-3 space-y-2">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3.5 w-3.5 text-primary" />
                                <span>প্রতি ঘন্টা: <span className="font-bold text-foreground">৳{perHour.toLocaleString('bn-BD')}</span></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => setHours(service.id, hrs - 1)} className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <Input type="number" value={hrs} onChange={(e) => setHours(service.id, parseInt(e.target.value) || 1)} className="w-16 text-center h-7 text-xs" min={1} />
                                <button onClick={() => setHours(service.id, hrs + 1)} className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                                  <PlusIcon className="h-3.5 w-3.5" />
                                </button>
                                <span className="text-[10px] text-muted-foreground">ঘন্টা</span>
                              </div>
                              <div className="rounded-lg bg-primary/5 border border-primary/10 p-2 space-y-0.5">
                                <div className="flex items-center gap-1.5 text-[10px] text-foreground/80">
                                  <Camera className="h-3 w-3 text-primary" />
                                  {unlimitedPhotos ? <span>আনলিমিটেড ছবি</span> : <span>ছবি তোলা</span>}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-foreground/80">
                                  <Check className="h-3 w-3 text-primary" />
                                  <span><span className="font-bold text-primary">{editedPerHour * hrs}টি</span> এডিটেড ছবি</span>
                                </div>
                              </div>
                              {discount > 0 ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-sm text-muted-foreground line-through">৳{totalPrice.toLocaleString('bn-BD')}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-2xl font-black text-primary">৳{getDiscountedPrice(totalPrice, discount).toLocaleString('bn-BD')}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-amber-950 font-bold">-{discount}%</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-2xl font-black text-foreground">৳{totalPrice.toLocaleString('bn-BD')}</span>
                              )}
                            </div>
                          );
                        }

                        if (perMin) {
                          const mins = minuteSelections[service.id] || 1;
                          const totalPrice = perMin * mins;
                          return (
                            <div className="mb-3 space-y-2">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3.5 w-3.5 text-primary" />
                                <span>প্রতি মিনিট: <span className="font-bold text-foreground">৳{perMin.toLocaleString('bn-BD')}</span></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => setMinutes(service.id, mins - 1)} className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <Input type="number" value={mins} onChange={(e) => setMinutes(service.id, parseInt(e.target.value) || 1)} className="w-16 text-center h-7 text-xs" min={1} />
                                <button onClick={() => setMinutes(service.id, mins + 1)} className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
                                  <PlusIcon className="h-3.5 w-3.5" />
                                </button>
                                <span className="text-[10px] text-muted-foreground">মিনিট</span>
                              </div>
                              {discount > 0 ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-sm text-muted-foreground line-through">৳{totalPrice.toLocaleString('bn-BD')}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-2xl font-black text-primary">৳{getDiscountedPrice(totalPrice, discount).toLocaleString('bn-BD')}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-amber-950 font-bold">-{discount}%</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-2xl font-black text-foreground">৳{totalPrice.toLocaleString('bn-BD')}</span>
                              )}
                            </div>
                          );
                        }
                        
                        if (numPrice) {
                          return (
                            <div className="mb-3">
                              {discount > 0 ? (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-base text-muted-foreground line-through">৳{numPrice.toLocaleString('bn-BD')}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500 text-amber-950 font-bold">-{discount}%</span>
                                  </div>
                                  <span className="text-2xl font-black text-primary">৳{getDiscountedPrice(numPrice, discount).toLocaleString('bn-BD')}</span>
                                </div>
                              ) : (
                                <span className="text-2xl font-black text-foreground">৳{numPrice.toLocaleString('bn-BD')}</span>
                              )}
                            </div>
                          );
                        }
                        if (service.price_label) {
                          return (
                            <div className="mb-3">
                              <span className="text-sm font-bold text-muted-foreground">{service.price_label}</span>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <div className="space-y-2 mb-5">
                        {features.slice(0, 3).map((f: string, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            <span className="text-xs text-foreground/70">{f}</span>
                          </div>
                        ))}
                        {features.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{features.length - 3} {t("আরো", "more")}</span>
                        )}
                      </div>

                      {(settings as any)?.whatsapp_no ? (
                        <Button
                          size="sm"
                          className="w-full font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 hover:shadow-green-600/40 hover:scale-[1.02] transition-all duration-300"
                          onClick={() => setBookingService(service)}
                        >
                          <MessageCircle className="h-4 w-4 mr-1" /> {t("বুকিং করুন", "Book Now")}
                        </Button>
                      ) : (
                        <Button size="sm" className="w-full" disabled>
                          {t("বুকিং করুন", "Book Now")}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div className="container max-w-3xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="premium-card rounded-3xl p-10 md:p-14 text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
            <h2 className="font-display text-3xl md:text-4xl text-foreground tracking-wider mb-4">
              {t("আপনার প্রজেক্ট নিয়ে কথা বলুন", "Let's Talk About Your Project")}
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              {t("আমাদের টিম আপনার প্রয়োজন অনুযায়ী কাস্টম প্যাকেজ তৈরি করে দেবে। এখনই যোগাযোগ করুন।", "Our team will create a custom package tailored to your needs. Contact us now.")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {(settings as any)?.whatsapp_no && (
                <a
                  href={`https://wa.me/${(settings as any).whatsapp_no.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8">
                    <MessageCircle className="h-5 w-5 mr-2" /> {t("WhatsApp এ মেসেজ করুন", "Message on WhatsApp")}
                  </Button>
                </a>
              )}
              {settings?.contact_phone && (
                <a href={`tel:${settings.contact_phone}`}>
                  <Button size="lg" variant="outline" className="font-semibold px-8">
                    <Phone className="h-5 w-5 mr-2" /> {t("কল করুন", "Call Us")}
                  </Button>
                </a>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 py-8 px-4">
        <div className="container max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="KM Production House" className="h-8 w-8 object-contain" />
            <span className="font-semibold text-foreground">{settings?.site_name || "KM Production House"}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {settings?.site_name || "KM Production House"}. {t("সর্বস্বত্ব সংরক্ষিত।", "All rights reserved.")}
          </p>
        </div>
      </footer>
      {/* Booking Detail Dialog */}
      <AlertDialog open={!!bookingService} onOpenChange={(open) => !open && setBookingService(null)}>
        <AlertDialogContent className="max-w-md p-0 overflow-hidden">
          {bookingService && (() => {
            const IconComp = iconMap[bookingService.icon] || Camera;
            const features = (bookingService.features as string[]) || [];
            const perMin = bookingService.price_per_minute ? Number(bookingService.price_per_minute) : null;
            const perHour = bookingService.price_per_hour ? Number(bookingService.price_per_hour) : null;
            const editedPerHour = bookingService.edited_photos_per_hour ? Number(bookingService.edited_photos_per_hour) : 20;
            const unlimitedPhotos = bookingService.unlimited_photos_per_hour !== false;
            const numPrice = getServicePrice(bookingService);
            const mins = minuteSelections[bookingService.id] || 1;
            const hrs = hourSelections[bookingService.id] || 1;
            const discount = getServiceDiscount(bookingService);
            const rawPrice = perHour ? perHour * hrs : perMin ? perMin * mins : numPrice;
            const finalPrice = rawPrice ? getDiscountedPrice(rawPrice, discount) : null;
            const waUrl = perHour
              ? getWaUrl(bookingService.title, discount, undefined, undefined, { rate: perHour, hours: hrs, editedPhotos: editedPerHour })
              : perMin
                ? getWaUrl(bookingService.title, discount, undefined, { rate: perMin, minutes: mins })
                : getWaUrl(bookingService.title, discount, numPrice || undefined);
            const phone = settings?.contact_phone;

            return (
              <>
                {/* Header */}
                <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 pb-4 border-b border-border/20">
                  <div className="flex items-start gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <IconComp className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{bookingService.category}</span>
                      <AlertDialogTitle className="text-xl font-bold text-foreground">{bookingService.title}</AlertDialogTitle>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                  {bookingService.description && (
                    <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
                      {bookingService.description}
                    </AlertDialogDescription>
                  )}

                  {/* Features */}
                  {features.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("সুবিধাসমূহ", "Features")}</span>
                      <div className="space-y-1.5">
                        {features.map((f: string, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Check className="h-2.5 w-2.5 text-primary" />
                            </div>
                            <span className="text-sm text-foreground/80">{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price Summary */}
                  {(finalPrice || rawPrice) && (
                    <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("মূল্য", "Price")}</span>
                      {perHour && (
                        <>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> প্রতি ঘন্টা ৳{perHour.toLocaleString('bn-BD')} × {hrs} ঘন্টা
                          </p>
                          <div className="mt-2 rounded-lg bg-primary/5 border border-primary/10 p-2.5 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-foreground/80">
                              <Camera className="h-3.5 w-3.5 text-primary" />
                              {unlimitedPhotos ? <span>প্রতি ঘন্টায় আনলিমিটেড ছবি তোলা হবে</span> : <span>ছবি তোলা হবে</span>}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-foreground/80">
                              <Check className="h-3.5 w-3.5 text-primary" />
                              <span><span className="font-bold text-primary">{editedPerHour * hrs}টি</span> ছবি এডিট করে দেওয়া হবে</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Check className="h-3.5 w-3.5" />
                              <span>বাকি সব ছবি এডিট ছাড়া দেওয়া হবে</span>
                            </div>
                          </div>
                        </>
                      )}
                      {perMin && !perHour && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> প্রতি মিনিট ৳{perMin.toLocaleString('bn-BD')} × {mins} মিনিট
                        </p>
                      )}
                      <div className="flex items-baseline gap-2 mt-1">
                        {discount > 0 && rawPrice && (
                          <span className="text-base text-muted-foreground line-through">
                            ৳{rawPrice.toLocaleString('bn-BD')}
                          </span>
                        )}
                        <span className="text-3xl font-black text-primary">৳{(finalPrice || rawPrice)!.toLocaleString('bn-BD')}</span>
                        {discount > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500 text-amber-950 font-bold">-{discount}%</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="p-6 pt-0 space-y-2">
                  {(settings as any)?.whatsapp_no && (
                    <a href={waUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-5 text-base shadow-lg shadow-green-600/20">
                        <MessageCircle className="h-5 w-5 mr-2" /> {t("WhatsApp এ বুকিং করুন", "Book via WhatsApp")}
                      </Button>
                    </a>
                  )}
                  {phone && (
                    <a href={`tel:${phone}`} className="block">
                      <Button variant="outline" className="w-full font-bold py-5 text-base">
                        <Phone className="h-5 w-5 mr-2" /> {t("কল করুন", "Call Us")}
                      </Button>
                    </a>
                  )}
                  <AlertDialogCancel className="w-full mt-1">{t("বন্ধ করুন", "Close")}</AlertDialogCancel>
                </div>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Services;
