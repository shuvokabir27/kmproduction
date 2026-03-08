import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Building, Heart, Film, Camera, Megaphone, Clapperboard,
  ChevronRight, Check, Star, ArrowLeft, MessageCircle, Phone,
  Sparkles, Play, Monitor, Palette, Mic, Video, Lightbulb,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
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
  const [bookingService, setBookingService] = useState<{ title: string; waUrl: string } | null>(null);

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

  const getWaUrl = (serviceTitle: string) => {
    const phone = (settings as any)?.whatsapp_no?.replace(/[^0-9]/g, '') || '';
    return `https://wa.me/${phone}?text=${encodeURIComponent(`আমি "${serviceTitle}" প্যাকেজ সম্পর্কে বিস্তারিত ও মূল্য জানতে চাই।`)}`;
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
              {t(
                "আমরা কুয়াকাটা মাল্টিমিডিয়া টিম — দীর্ঘ ৭ বছর ধরে এই সেক্টরে অভিজ্ঞ ও দক্ষ টিম নিয়ে কাজ করে আসছি। বিজ্ঞাপন, বিয়ে বাড়ি, নাটক নির্মাণ থেকে শুরু করে ভিডিও এডিটিং — সবকিছুর জন্য আমরা আপনার পাশে।",
                "We are the Kuakata Multimedia team — working with an experienced and skilled team in this sector for over 7 years. From ads, weddings, drama production to video editing — we are by your side for everything."
              )}
            </p>
            </p>
          </motion.div>
        </div>
      </section>

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
              <h2 className="font-display text-3xl md:text-4xl text-foreground mt-2 tracking-wider">জনপ্রিয় প্যাকেজ</h2>
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
                          ★ সবচেয়ে জনপ্রিয়
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
                        <p className="text-sm text-muted-foreground leading-relaxed mb-5">{service.description}</p>
                        
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
                            onClick={() => setBookingService({ title: service.title, waUrl: getWaUrl(service.title) })}
                            className={`w-full ${index === 1 ? "bg-primary hover:bg-primary/90" : "bg-secondary hover:bg-secondary/80 text-foreground"}`}
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            {service.price_label || "বুকিং করুন"}
                          </Button>
                        ) : (
                          <Button className="w-full bg-secondary hover:bg-secondary/80 text-foreground" disabled>
                            {service.price_label || "বুকিং করুন"}
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
              <h2 className="font-display text-3xl md:text-4xl text-foreground mt-2 tracking-wider">আরো সেবাসমূহ</h2>
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
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">{service.description}</p>
                      
                      <div className="space-y-2 mb-5">
                        {features.slice(0, 3).map((f: string, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            <span className="text-xs text-foreground/70">{f}</span>
                          </div>
                        ))}
                        {features.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{features.length - 3} আরো</span>
                        )}
                      </div>

                      {(settings as any)?.whatsapp_no ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setBookingService({ title: service.title, waUrl: getWaUrl(service.title) })}
                        >
                          <MessageCircle className="h-4 w-4 mr-1" /> বুকিং করুন
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="w-full" disabled>
                          বুকিং করুন
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
              আপনার প্রজেক্ট নিয়ে কথা বলুন
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              আমাদের টিম আপনার প্রয়োজন অনুযায়ী কাস্টম প্যাকেজ তৈরি করে দেবে। এখনই যোগাযোগ করুন।
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {(settings as any)?.whatsapp_no && (
                <a
                  href={`https://wa.me/${(settings as any).whatsapp_no.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8">
                    <MessageCircle className="h-5 w-5 mr-2" /> WhatsApp এ মেসেজ করুন
                  </Button>
                </a>
              )}
              {settings?.contact_phone && (
                <a href={`tel:${settings.contact_phone}`}>
                  <Button size="lg" variant="outline" className="font-semibold px-8">
                    <Phone className="h-5 w-5 mr-2" /> কল করুন
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
            © {new Date().getFullYear()} {settings?.site_name || "KM Production House"}. সর্বস্বত্ব সংরক্ষিত।
          </p>
        </div>
      </footer>
      {/* Booking Confirmation Dialog */}
      <AlertDialog open={!!bookingService} onOpenChange={(open) => !open && setBookingService(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-lg">
              📩 বুকিং ও মূল্য জানতে
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm leading-relaxed">
              <strong className="text-foreground">"{bookingService?.title}"</strong> প্যাকেজের মূল্য ও বিস্তারিত জানতে আমাদের WhatsApp এ মেসেজ করুন। আমরা দ্রুত আপনাকে জানাবো।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <AlertDialogCancel className="w-full sm:w-auto">বাতিল</AlertDialogCancel>
            <AlertDialogAction asChild className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
              <a href={bookingService?.waUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2">
                <MessageCircle className="h-4 w-4" /> WhatsApp এ মেসেজ করুন
              </a>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Services;
