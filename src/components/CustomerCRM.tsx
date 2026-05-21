import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Users, Search, Download, Phone, MapPin, ShoppingCart, TrendingUp,
  MessageCircle, PhoneCall, Settings2, Image, Save, Upload,
} from "lucide-react";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

const CustomerCRM = () => {
  const [search, setSearch] = useState("");
  const [showOfferSettings, setShowOfferSettings] = useState(false);
  const [offerMsg, setOfferMsg] = useState("");
  const [offerImg, setOfferImg] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: orders } = useQuery({
    queryKey: ["crm-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-offer"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .limit(1)
        .single();
      if (data) {
        setOfferMsg((data as any).whatsapp_offer_message || "");
        setOfferImg((data as any).whatsapp_offer_image || "");
      }
      return data;
    },
  });

  // Aggregate customers from orders
  const customerMap = new Map<string, {
    name: string;
    phone: string;
    address: string;
    totalOrders: number;
    totalSpent: number;
    lastOrder: string;
    statuses: string[];
  }>();

  orders?.filter(o => o.status !== "abandoned").forEach(o => {
    const existing = customerMap.get(o.customer_phone);
    if (existing) {
      existing.totalOrders++;
      existing.totalSpent += o.total_amount || 0;
      if (new Date(o.created_at) > new Date(existing.lastOrder)) {
        existing.lastOrder = o.created_at;
        existing.address = o.customer_address || existing.address;
      }
      if (!existing.statuses.includes(o.status)) existing.statuses.push(o.status);
    } else {
      customerMap.set(o.customer_phone, {
        name: o.customer_name,
        phone: o.customer_phone,
        address: o.customer_address || "",
        totalOrders: 1,
        totalSpent: o.total_amount || 0,
        lastOrder: o.created_at,
        statuses: [o.status],
      });
    }
  });

  const customers = [...customerMap.values()].sort((a, b) =>
    new Date(b.lastOrder).getTime() - new Date(a.lastOrder).getTime()
  );

  const filtered = search
    ? customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search)
      )
    : customers;

  const exportCSV = () => {
    const headers = ["নাম", "ফোন", "ঠিকানা", "মোট অর্ডার", "মোট খরচ", "শেষ অর্ডার"];
    const rows = customers.map(c => [
      c.name,
      c.phone,
      c.address,
      String(c.totalOrders),
      String(c.totalSpent),
      new Date(c.lastOrder).toLocaleDateString("bn-BD"),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const bdPhone = cleanPhone.startsWith("0") ? "88" + cleanPhone : cleanPhone;
    const currentOfferMsg = offerMsg || (siteSettings as any)?.whatsapp_offer_message || "";
    const currentOfferImg = offerImg || (siteSettings as any)?.whatsapp_offer_image || "";

    let message = currentOfferMsg;
    if (currentOfferImg) {
      message = message ? `${message}\n\n${currentOfferImg}` : currentOfferImg;
    }
    const url = `https://wa.me/${bdPhone}${message ? "?text=" + encodeURIComponent(message) : ""}`;
    window.open(url, "_blank");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `offer-images/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      setOfferImg(urlData.publicUrl);
      toast.success("ছবি আপলোড হয়েছে");
    } catch (err: any) {
      toast.error("আপলোড ব্যর্থ: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const saveOfferSettings = async () => {
    const { error } = await supabase.from("site_settings").update({
      whatsapp_offer_message: offerMsg,
      whatsapp_offer_image: offerImg,
    } as any).eq("id", (siteSettings as any)?.id);
    if (error) {
      toast.error("সেভ ব্যর্থ: " + error.message);
    } else {
      toast.success("অফার সেটিংস সেভ হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["site-settings-offer"] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">কাস্টমার তালিকা</h2>
            <p className="text-xs text-muted-foreground">মোট {toBn(customers.length)} জন কাস্টমার</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowOfferSettings(!showOfferSettings)} variant="outline" size="sm" className="gap-1.5">
            <Settings2 className="h-4 w-4" /> অফার সেটিংস
          </Button>
          <Button onClick={exportCSV} variant="outline" size="sm" className="gap-1.5">
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      {/* Offer Settings Panel */}
      {showOfferSettings && (
        <div className="bg-card border border-red-500/20 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="h-4 w-4 text-red-500" />
            <h3 className="font-bold text-foreground text-sm">WhatsApp অফার ম্যাসেজ সেটিংস</h3>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2">
            কাস্টমার লিস্ট থেকে WhatsApp বাটনে ক্লিক করলে এই ম্যাসেজ পাঠানো হবে।
          </p>

          <div className="space-y-2">
            <Label className="text-xs">অফার ম্যাসেজ</Label>
            <Textarea
              placeholder="যেমন: 🎉 স্পেশাল অফার! খাঁটি তালের গুড় এখন ২০% ডিসকাউন্টে..."
              value={offerMsg}
              onChange={e => setOfferMsg(e.target.value)}
              rows={4}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">প্রডাক্ট ছবি</Label>
            <div className="flex items-center gap-3">
              {offerImg && (
                <img src={offerImg} alt="offer" className="w-16 h-16 object-cover rounded-lg border border-border" />
              )}
              <div className="flex gap-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Upload className="h-3 w-3" /> {uploading ? "আপলোড হচ্ছে..." : "ছবি আপলোড"}
                </Button>
                {offerImg && (
                  <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => setOfferImg("")}>
                    সরাও
                  </Button>
                )}
              </div>
            </div>
            {offerImg && (
              <Input
                value={offerImg}
                onChange={e => setOfferImg(e.target.value)}
                placeholder="অথবা সরাসরি ছবির URL দিন"
                className="text-xs"
              />
            )}
          </div>

          <Button onClick={saveOfferSettings} size="sm" className="gap-1.5 bg-red-600 hover:bg-red-700">
            <Save className="h-3 w-3" /> সেভ করুন
          </Button>

          {/* Preview */}
          {(offerMsg || offerImg) && (
            <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 mt-2">
              <p className="text-[10px] text-muted-foreground mb-1">প্রিভিউ:</p>
              {offerMsg && <p className="text-xs text-foreground whitespace-pre-wrap">{offerMsg}</p>}
              {offerImg && <p className="text-[10px] text-red-500 mt-1">🖼️ প্রডাক্ট দেখুন: {offerImg.slice(0, 50)}...</p>}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{toBn(customers.length)}</p>
          <p className="text-xs text-muted-foreground">মোট কাস্টমার</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-500">
            {toBn(customers.filter(c => c.totalOrders > 1).length)}
          </p>
          <p className="text-xs text-muted-foreground">রিটার্ন কাস্টমার</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">
            ৳{toBn(customers.reduce((s, c) => s + c.totalSpent, 0))}
          </p>
          <p className="text-xs text-muted-foreground">মোট বিক্রয়</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="নাম বা ফোন দিয়ে খুঁজুন..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Customer List */}
      {!filtered.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>কোনো কাস্টমার পাওয়া যায়নি</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const cleanPhone = c.phone.replace(/\D/g, "");
            const bdPhone = cleanPhone.startsWith("0") ? "88" + cleanPhone : cleanPhone;
            return (
              <div key={c.phone} className="bg-card border border-border/50 rounded-xl p-4 hover:border-primary/20 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center text-sm font-bold text-foreground flex-shrink-0">
                      {c.name?.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{c.name}</span>
                        {c.totalOrders > 1 && (
                          <span className="text-[10px] bg-pink-500/15 text-pink-500 px-1.5 py-0.5 rounded-full font-medium">
                            রিটার্ন ×{toBn(c.totalOrders)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</span>
                        {c.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.address.slice(0, 30)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-primary">৳{toBn(c.totalSpent)}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                      <ShoppingCart className="h-3 w-3" /> {toBn(c.totalOrders)} অর্ডার
                    </p>
                  </div>
                </div>
                {/* Action Buttons */}
                <div className="flex gap-2 mt-3 pt-2 border-t border-border/30">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-8 gap-1.5 text-red-600 border-red-500/30 hover:bg-red-500/10"
                    onClick={() => openWhatsApp(c.phone)}
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </Button>
                  <a href={`tel:${c.phone}`} className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-8 gap-1.5 text-blue-500 border-blue-500/30 hover:bg-blue-500/10"
                    >
                      <PhoneCall className="h-3.5 w-3.5" /> কল
                    </Button>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomerCRM;