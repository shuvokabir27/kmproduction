import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Building, Heart, Film, Camera, Megaphone, Clapperboard,
  Check, ArrowLeft, MessageCircle, Phone,
  Sparkles, Play, Monitor, Palette, Mic, Video, Lightbulb, Star,
  Timer, Gift, Percent, Clock, Minus, Plus as PlusIcon, CalendarIcon, Share2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

const iconMap: Record<string, any> = {
  Building, Heart, Film, Camera, Megaphone, Clapperboard,
  Star, MessageCircle, Phone, Sparkles, Play, Monitor,
  Palette, Mic, Video, Lightbulb,
};

const ServiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [bookingStep, setBookingStep] = useState<"idle" | "form" | "success">("idle");
  const [bookingForm, setBookingForm] = useState({ name: "", phone: "", address: "" });
  const [bookingDate, setBookingDate] = useState<Date | undefined>(undefined);
  const [bookingDays, setBookingDays] = useState(1);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [minutes, setMinutesState] = useState(1);
  const [hours, setHoursState] = useState(1);

  const { data: service, isLoading } = useQuery({
    queryKey: ["service-detail", id],
    queryFn: async () => {
      const { data } = await supabase.from("services" as any).select("*").eq("id", id).maybeSingle();
      return data as any;
    },
    enabled: !!id,
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

  // Update document title for SEO + nice link previews
  useEffect(() => {
    if (service?.title) {
      document.title = `${service.title} — ${(settings as any)?.site_name || "Kuakata Multimedia"}`;
    }
    return () => { document.title = (settings as any)?.site_name || "Kuakata Multimedia"; };
  }, [service?.title, settings]);

  const parsePriceFromLabel = (label: string): number | null => {
    const cleaned = label.replace(/[^\d.,০১২৩৪৫৬৭৮৯]/g, "");
    const banglaToEn = cleaned.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
    const num = parseFloat(banglaToEn.replace(/,/g, ""));
    return isNaN(num) ? null : num;
  };

  const getServicePrice = (s: any): number | null => {
    if (!s) return null;
    if (s.price) return Number(s.price);
    if (s.price_label) return parsePriceFromLabel(s.price_label);
    return null;
  };

  const getServiceDiscount = (s: any): number => {
    if (!s) return 0;
    if (s.discount_percentage) return Number(s.discount_percentage);
    if (activeOffer?.discount_percentage) {
      const offerServiceIds = (activeOffer.service_ids as string[]) || [];
      if (offerServiceIds.length === 0 || offerServiceIds.includes(s.id)) {
        return Number(activeOffer.discount_percentage);
      }
    }
    return 0;
  };

  const getDiscountedPrice = (price: number, discount?: number) => {
    const d = discount ?? 0;
    if (d > 0) return Math.round(price - (price * d / 100));
    return price;
  };

  const handleShare = async () => {
    if (!service) return;
    const url = window.location.href;
    const shareData = {
      title: service.title,
      text: `${service.title} — ${service.description || "কুয়াকাটা মাল্টিমিডিয়া সেবা"}`,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: t("লিংক কপি হয়েছে!", "Link copied!"), description: url });
    } catch {
      toast({ title: t("কপি করতে পারিনি", "Could not copy link"), variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-bangla">
        <div className="animate-pulse text-muted-foreground">লোড হচ্ছে...</div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 font-bangla px-4">
        <h1 className="text-2xl font-bold text-foreground">সেবাটি খুঁজে পাওয়া যায়নি</h1>
        <p className="text-muted-foreground text-center">এই লিংকটি ভুল বা সেবাটি আর উপলব্ধ নেই।</p>
        <Link to="/services">
          <Button><ArrowLeft className="h-4 w-4 mr-2" /> সব সেবা দেখুন</Button>
        </Link>
      </div>
    );
  }

  const IconComp = iconMap[service.icon] || Camera;
  const features = (service.features as string[]) || [];
  const perMin = service.price_per_minute ? Number(service.price_per_minute) : null;
  const perHour = service.price_per_hour ? Number(service.price_per_hour) : null;
  const editedPerHour = service.edited_photos_per_hour ? Number(service.edited_photos_per_hour) : 20;
  const unlimitedPhotos = service.unlimited_photos_per_hour !== false;
  const numPrice = getServicePrice(service);
  const discount = getServiceDiscount(service);
  const rawPrice = perHour ? perHour * hours : perMin ? perMin * minutes : numPrice;
  const finalPrice = rawPrice ? getDiscountedPrice(rawPrice, discount) : null;

  const buildDetails = () => {
    let d = `সেবা: ${service.title}`;
    if (perHour) d += ` | ${hours} ঘন্টা | এডিটেড: ${editedPerHour * hours}টি`;
    else if (perMin) d += ` | ${minutes} মিনিট`;
    if (finalPrice) d += ` | মূল্য: ৳${finalPrice}`;
    if (discount > 0) d += ` (${discount}% ছাড়)`;
    if (bookingDate) d += ` | তারিখ: ${format(bookingDate, "dd/MM/yyyy")}`;
    if (bookingDays > 1) d += ` | ${bookingDays} দিন`;
    return d;
  };

  const handleBookingSubmit = async () => {
    if (!bookingForm.name.trim() || !bookingForm.phone.trim()) {
      toast({ title: "নাম ও মোবাইল নম্বর দিন", variant: "destructive" });
      return;
    }
    setBookingSubmitting(true);
    const { error } = await supabase.from("bookings" as any).insert({
      service_id: service.id,
      service_title: service.title,
      customer_name: bookingForm.name.trim(),
      customer_phone: bookingForm.phone.trim(),
      customer_address: bookingForm.address.trim() || null,
      details: buildDetails(),
      booking_date: bookingDate ? format(bookingDate, "yyyy-MM-dd") : null,
      booking_days: bookingDays,
      status: "pending",
    } as any);
    setBookingSubmitting(false);
    if (error) {
      toast({ title: "সমস্যা হয়েছে", description: error.message, variant: "destructive" });
    } else {
      setBookingStep("success");
    }
  };

  const waPhone = (settings as any)?.whatsapp_no?.replace(/[^0-9]/g, "") || "";
  const waMsg = encodeURIComponent(
    `আমি "${service.title}" প্যাকেজ বুকিং করতে চাই।${finalPrice ? ` মূল্য: ৳${finalPrice}` : ""}${discount > 0 ? ` (${discount}% ডিসকাউন্ট সহ)` : ""}`
  );
  const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${waMsg}` : "";

  return (
    <div className="min-h-screen bg-background noise-bg font-bangla">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-background/60 backdrop-blur-2xl saturate-150 border-b border-border/20" />
        <div className="container max-w-4xl mx-auto relative z-10 flex items-center justify-between h-16 px-4">
          <Link to="/services" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">{t("সব সেবা", "All Services")}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button onClick={handleShare} size="sm" variant="outline" className="font-semibold">
              <Share2 className="h-4 w-4 mr-1" /> {t("শেয়ার", "Share")}
            </Button>
            {waUrl && (
              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-semibold">
                  <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                </Button>
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="pt-24 pb-20 px-4">
        <div className="container max-w-3xl mx-auto">
          {/* Hero card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border-2 border-primary/30 p-8 md:p-10 shadow-2xl"
          >
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl opacity-60" />
            <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-primary/10 rounded-full blur-3xl opacity-50" />

            <div className="relative z-10">
              <div className="flex items-start gap-4 mb-6">
                <div className="h-16 w-16 rounded-2xl bg-primary/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <IconComp className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">{service.category}</span>
                  <h1 className="text-2xl md:text-4xl font-black text-foreground mt-1 leading-tight">{service.title}</h1>
                </div>
              </div>

              {service.description && (
                <p className="text-base md:text-lg text-foreground/80 leading-relaxed mb-6">{service.description}</p>
              )}

              {/* Price */}
              {(perHour || perMin) && (
                <div className="rounded-2xl bg-background/40 backdrop-blur-sm border border-border/30 p-5 mb-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>
                      প্রতি {perHour ? "ঘন্টা" : "মিনিট"}: <span className="font-bold text-foreground">৳{(perHour || perMin)!.toLocaleString("bn-BD")}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={() => perHour ? setHoursState(Math.max(1, hours - 1)) : setMinutesState(Math.max(1, minutes - 1))}
                      className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <Input
                      type="number"
                      value={perHour ? hours : minutes}
                      onChange={(e) => {
                        const v = Math.max(1, parseInt(e.target.value) || 1);
                        perHour ? setHoursState(v) : setMinutesState(v);
                      }}
                      className="w-24 text-center h-9"
                      min={1}
                    />
                    <button
                      onClick={() => perHour ? setHoursState(hours + 1) : setMinutesState(minutes + 1)}
                      className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-muted-foreground ml-1">{perHour ? "ঘন্টা" : "মিনিট"}</span>
                  </div>

                  {perHour && (
                    <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 space-y-1.5 mb-4">
                      <div className="flex items-center gap-2 text-sm text-foreground/80">
                        <Camera className="h-4 w-4 text-primary" />
                        {unlimitedPhotos ? <span>প্রতি ঘন্টায় আনলিমিটেড ছবি তোলা হবে</span> : <span>ছবি তোলা হবে</span>}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-foreground/80">
                        <Check className="h-4 w-4 text-primary" />
                        <span><span className="font-bold text-primary">{editedPerHour * hours}টি</span> ছবি এডিট করে দেওয়া হবে</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4" />
                        <span>বাকি সব ছবি এডিট ছাড়া দেওয়া হবে</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-baseline gap-2 flex-wrap">
                    {discount > 0 && rawPrice && (
                      <span className="text-lg text-muted-foreground line-through">৳{rawPrice.toLocaleString("bn-BD")}</span>
                    )}
                    <span className="text-4xl md:text-5xl font-black text-primary">
                      ৳{(finalPrice || rawPrice)!.toLocaleString("bn-BD")}
                    </span>
                    {discount > 0 && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500 text-amber-950 font-bold">-{discount}%</span>
                    )}
                  </div>
                </div>
              )}

              {!perHour && !perMin && numPrice && (
                <div className="rounded-2xl bg-background/40 backdrop-blur-sm border border-border/30 p-5 mb-5">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("মূল্য", "Price")}</span>
                  <div className="flex items-baseline gap-2 mt-2 flex-wrap">
                    {discount > 0 && (
                      <span className="text-lg text-muted-foreground line-through">৳{numPrice.toLocaleString("bn-BD")}</span>
                    )}
                    <span className="text-4xl md:text-5xl font-black text-primary">
                      ৳{getDiscountedPrice(numPrice, discount).toLocaleString("bn-BD")}
                    </span>
                    {discount > 0 && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500 text-amber-950 font-bold">-{discount}%</span>
                    )}
                  </div>
                </div>
              )}

              {!numPrice && !perHour && !perMin && service.price_label && (
                <div className="rounded-2xl bg-background/40 backdrop-blur-sm border border-border/30 p-5 mb-5">
                  <span className="text-2xl font-bold text-foreground">{service.price_label}</span>
                </div>
              )}

              {/* Features */}
              {features.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    {t("যা থাকছে", "What's Included")}
                  </h2>
                  <div className="space-y-2.5">
                    {features.map((f: string, i: number) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm md:text-base text-foreground/85 leading-relaxed">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Booking actions */}
              {bookingStep === "idle" && (
                <div className="space-y-3 pt-2">
                  <Button
                    onClick={() => setBookingStep("form")}
                    className="w-full font-bold text-base py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                  >
                    <Sparkles className="h-5 w-5 mr-2" />
                    {t("বুকিং ফর্ম পূরণ করুন", "Fill Booking Form")}
                  </Button>
                  {waUrl && (
                    <a href={waUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <Button variant="outline" className="w-full font-bold text-base py-6 border-green-500/30 text-green-400 hover:bg-green-600/10">
                        <MessageCircle className="h-5 w-5 mr-2" />
                        {t("WhatsApp এ বুকিং দিন", "Book via WhatsApp")}
                      </Button>
                    </a>
                  )}
                </div>
              )}

              {bookingStep === "form" && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-sm">আপনার নাম *</Label>
                    <Input
                      value={bookingForm.name}
                      onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                      placeholder="পূর্ণ নাম"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">মোবাইল নম্বর *</Label>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={11}
                      value={bookingForm.phone}
                      onChange={(e) => {
                        const onlyDigits = e.target.value.replace(/[^0-9]/g, "").slice(0, 11);
                        setBookingForm({ ...bookingForm, phone: onlyDigits });
                      }}
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">ঠিকানা {perMin ? "*" : "(ঐচ্ছিক)"}</Label>
                    <Input
                      value={bookingForm.address}
                      onChange={(e) => setBookingForm({ ...bookingForm, address: e.target.value })}
                      placeholder="এলাকা / জেলা"
                    />
                  </div>
                  {/* Conditional date / days fields based on service type */}
                  {!perMin && (
                    <div className={cn("grid gap-3", perHour ? "grid-cols-1" : "grid-cols-2")}>
                      <div className="space-y-2">
                        <Label className="text-sm">তারিখ</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !bookingDate && "text-muted-foreground")}>
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              {bookingDate ? format(bookingDate, "dd/MM/yyyy") : "তারিখ নির্বাচন করুন"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={bookingDate} onSelect={setBookingDate} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>
                      {!perHour && (
                        <div className="space-y-2">
                          <Label className="text-sm">দিন সংখ্যা</Label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            value={bookingDays}
                            onChange={(e) => setBookingDays(Math.max(1, parseInt(e.target.value) || 1))}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={() => setBookingStep("idle")} className="flex-1">
                      ফিরে যান
                    </Button>
                    <Button onClick={handleBookingSubmit} disabled={bookingSubmitting} className="flex-1 bg-primary">
                      {bookingSubmitting ? "পাঠানো হচ্ছে..." : "বুকিং নিশ্চিত করুন"}
                    </Button>
                  </div>
                </div>
              )}

              {bookingStep === "success" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6 space-y-4"
                >
                  <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center shadow-xl shadow-green-500/30">
                    <Check className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-foreground">বুকিং সফল হয়েছে!</h3>
                  <p className="text-muted-foreground">আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।</p>
                  <Button onClick={() => navigate("/services")} variant="outline">
                    আরো সেবা দেখুন
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Footer note */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>{t("কোনো প্রশ্ন থাকলে আমাদের সাথে সরাসরি যোগাযোগ করুন।", "For any questions, contact us directly.")}</p>
            {(settings as any)?.contact_phone && (
              <a href={`tel:${(settings as any).contact_phone}`} className="inline-flex items-center gap-1 mt-2 text-primary hover:underline">
                <Phone className="h-4 w-4" /> {(settings as any).contact_phone}
              </a>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ServiceDetail;
