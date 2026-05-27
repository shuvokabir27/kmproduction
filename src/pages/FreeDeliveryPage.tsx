import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Truck, CheckCircle2, ShoppingBag, Sparkles, Plus, Minus, Gift, Crown } from "lucide-react";
import { useShopCustomer } from "@/hooks/useShopCustomer";

const toBn = (n: number | string) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

// Minimal light background
const DotBg = () => (
  <div className="pointer-events-none fixed inset-0 -z-10 bg-slate-50" />
);

export default function FreeDeliveryPage() {
  const navigate = useNavigate();
  const { customer } = useShopCustomer();
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [phoneCount, setPhoneCount] = useState<number>(0);

  useEffect(() => {
    if (customer) setForm((f) => ({ ...f, name: customer.full_name || "", phone: customer.phone || "", address: customer.address || "" }));
  }, [customer]);

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["fd-active-campaign"],
    queryFn: async () => {
      const { data: c } = await supabase
        .from("free_delivery_campaigns" as any)
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!c) return null;
      const cid = (c as any).id;
      const [{ data: tiers }, { data: cps }] = await Promise.all([
        supabase.from("free_delivery_campaign_tiers" as any).select("*").eq("campaign_id", cid).order("required_products"),
        supabase.from("free_delivery_campaign_products" as any).select("product_id").eq("campaign_id", cid),
      ]);
      const productIds = ((cps as any[]) ?? []).map((x) => x.product_id);
      const { data: products } = productIds.length
        ? await supabase.from("products").select("id,name,image_url,price,discount_price,unit_type").in("id", productIds).eq("is_active", true)
        : { data: [] as any[] };
      return { campaign: c as any, tiers: ((tiers as any[]) ?? []), products: products ?? [] };
    },
  });

  useEffect(() => {
    const phone = form.phone.trim();
    if (!campaign || phone.length !== 11) { setPhoneCount(0); return; }
    supabase.rpc("free_delivery_phone_order_count" as any, { _campaign_id: campaign.campaign.id, _phone: phone })
      .then(({ data }) => setPhoneCount(Number(data ?? 0)));
  }, [form.phone, campaign]);

  const distinctCount = Object.keys(selected).filter((k) => (selected[k] || 0) > 0).length;
  const tiers = campaign?.tiers ?? [];
  const sortedTiers = useMemo(() => [...tiers].sort((a: any, b: any) => a.required_products - b.required_products), [tiers]);
  const reachedTier = useMemo(() => [...sortedTiers].reverse().find((t: any) => distinctCount >= t.required_products), [sortedTiers, distinctCount]);
  const nextTier = useMemo(() => sortedTiers.find((t: any) => distinctCount < t.required_products), [sortedTiers, distinctCount]);
  const goal = nextTier?.required_products ?? sortedTiers[sortedTiers.length - 1]?.required_products ?? 1;
  const progress = Math.min(100, Math.round((distinctCount / goal) * 100));

  const totalAmount = useMemo(() => {
    if (!campaign) return 0;
    return campaign.products.reduce((sum: number, p: any) => {
      const q = selected[p.id] || 0;
      const price = Number(p.discount_price ?? p.price ?? 0);
      return sum + price * q;
    }, 0);
  }, [campaign, selected]);

  const setQty = (id: string, q: number) => {
    setSelected((s) => {
      const next = { ...s };
      if (q <= 0) delete next[id];
      else next[id] = q;
      return next;
    });
  };

  const remainingAllowed = campaign ? Math.max(0, campaign.campaign.max_orders_per_phone - phoneCount) : 0;
  const canOrder = !!reachedTier && form.phone.length === 11 && remainingAllowed > 0;

  const submit = async () => {
    if (!campaign) return;
    if (!form.name.trim()) return toast.error("নাম দিন");
    if (form.phone.length !== 11) return toast.error("১১ ডিজিটের মোবাইল নম্বর দিন");
    if (!form.address.trim()) return toast.error("ঠিকানা দিন");
    if (!reachedTier) return toast.error("লক্ষ্য পূরণ করুন");
    if (remainingAllowed <= 0) return toast.error("আপনি সর্বোচ্চ অর্ডার সংখ্যা পার করেছেন");

    setSubmitting(true);
    try {
      const { data: count } = await supabase.rpc("free_delivery_phone_order_count" as any, { _campaign_id: campaign.campaign.id, _phone: form.phone });
      if (Number(count ?? 0) >= campaign.campaign.max_orders_per_phone) {
        toast.error("এই মোবাইল নম্বর দিয়ে আর অর্ডার করা যাবে না");
        setPhoneCount(Number(count ?? 0));
        return;
      }

      const { data: numData } = await supabase.rpc("next_order_number" as any);
      const sharedNumber = numData ? Number(numData) : null;

      const items = campaign.products.filter((p: any) => (selected[p.id] || 0) > 0);
      const orderRows = items.map((p: any) => {
        const q = selected[p.id];
        const unit = Number(p.discount_price ?? p.price ?? 0);
        return {
          customer_name: form.name.trim(),
          customer_phone: form.phone.trim(),
          customer_address: form.address.trim(),
          product_id: p.id,
          product_name: p.name,
          quantity: q,
          unit_price: unit,
          total_amount: unit * q,
          variant_label: `🚚 ফ্রি ডেলিভারি অফার (${reachedTier.label})`,
          delivery_charge: 0,
          payment_method: "cod",
          ...(sharedNumber ? { order_number: sharedNumber } : {}),
        };
      });

      const { error: oErr } = await supabase.from("orders").insert(orderRows);
      if (oErr) throw oErr;

      const { error: fdErr } = await supabase.from("free_delivery_orders" as any).insert({
        campaign_id: campaign.campaign.id,
        tier_id: reachedTier.id,
        customer_phone: form.phone.trim(),
        customer_name: form.name.trim(),
        customer_address: form.address.trim(),
        shared_order_number: sharedNumber,
        product_ids: items.map((p: any) => p.id),
        total_amount: totalAmount,
      });
      if (fdErr) throw fdErr;

      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      toast.error(e.message || "অর্ডার ব্যর্থ হয়েছে");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600" style={{ fontFamily: "'Tiro Bangla', serif" }}>
        <DotBg />
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
          লোড হচ্ছে...
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center text-slate-900" style={{ fontFamily: "'Tiro Bangla', serif" }}>
        <DotBg />
        <Truck className="h-16 w-16 text-slate-300 mb-3" />
        <h1 className="text-xl font-bold mb-4">কোনো ফ্রি ডেলিভারি অফার চলছে না</h1>
        <Button onClick={() => navigate("/products")} className="bg-blue-600 hover:bg-blue-700">হোমে ফিরুন</Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center text-slate-900" style={{ fontFamily: "'Tiro Bangla', serif" }}>
        <DotBg />
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-blue-200 blur-3xl rounded-full" />
          <CheckCircle2 className="relative h-24 w-24 text-red-400" />
        </div>
        <h1 className="text-3xl font-extrabold mb-2 text-blue-600">অর্ডার সফল হয়েছে! 🎉</h1>
        <p className="text-slate-600 mb-1">ফ্রি ডেলিভারি অফারে আপনার অর্ডার গৃহীত হয়েছে</p>
        <p className="text-slate-500 text-sm mb-6">আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব</p>
        <Button onClick={() => navigate("/products")} className="bg-blue-600 hover:bg-blue-700 text-slate-900">আরও কেনাকাটা করুন</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-900 pb-28 relative" style={{ fontFamily: "'Tiro Bangla', serif" }}>
      <DotBg />

      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/90 border-b border-slate-200">
        <div className="absolute inset-x-0 top-0 h-px bg-slate-200" />
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="h-10 w-10 grid place-items-center rounded-full bg-slate-50 border border-slate-200 hover:bg-slate-100 transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-lg flex items-center gap-2 truncate">
              <span className="relative">
                <Truck className="h-5 w-5 text-blue-600" />
              </span>
              <span className="text-blue-600">{campaign.campaign.title}</span>
            </h1>
            {campaign.campaign.description && <p className="text-xs text-slate-500 truncate">{campaign.campaign.description}</p>}
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-blue-700 border border-blue-200 rounded-full px-2 py-1 bg-blue-50">
            <Crown className="h-3 w-3" /> Premium
          </span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-5 space-y-5">
        {/* Hero / Progress */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-white">
          <div className="absolute -top-24 -right-16 w-64 h-64 bg-blue-100 blur-3xl rounded-full" />
          <div className="absolute -bottom-24 -left-10 w-64 h-64 bg-blue-50 blur-3xl rounded-full" />
          <div className="relative p-5">
            <div className="flex items-center justify-between mb-3 text-sm">
              <span className="flex items-center gap-2 font-semibold text-slate-700">
                <Sparkles className="h-4 w-4 text-blue-600" /> অগ্রগতি: <span className="text-slate-900">{toBn(distinctCount)} / {toBn(goal)}</span> টি প্রডাক্ট
              </span>
              <span className="font-extrabold text-base text-blue-600">{toBn(progress)}%</span>
            </div>
            <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden ring-1 ring-slate-200">
              <div
                className="h-full bg-blue-600 transition-all duration-700 relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)] animate-[shimmer_2s_infinite]" />
              </div>
            </div>
            <style>{`@keyframes shimmer { 0% { transform: translateX(-100%);} 100% { transform: translateX(100%);} }`}</style>

            <div className="grid grid-cols-3 gap-2 mt-4">
              {sortedTiers.map((t: any) => {
                const reached = distinctCount >= t.required_products;
                return (
                  <div
                    key={t.id}
                    className={`relative text-center p-3 rounded-2xl border transition-all ${
                      reached
                        ? "bg-blue-50 border-blue-300"
                        : "bg-white/[0.03] border-slate-200"
                    }`}
                  >
                    {reached && <Gift className="absolute -top-2 -right-2 h-5 w-5 text-blue-600" />}
                    <div className={`text-xs font-bold ${reached ? "text-blue-700" : "text-slate-600"}`}>{t.label}</div>
                    <div className="text-[11px] text-slate-500">{toBn(t.required_products)} টি</div>
                    <div className={`text-[11px] font-semibold mt-1 ${reached ? "text-slate-900" : "text-slate-600"}`}>{t.reward_text}</div>
                  </div>
                );
              })}
            </div>
            {reachedTier && (
              <div className="mt-4 relative overflow-hidden rounded-xl bg-blue-50 border border-blue-200 px-4 py-2.5 text-center text-sm font-semibold text-blue-700">
                🎉 আপনি পেয়েছেন: <span className="text-slate-900 font-bold">{reachedTier.reward_text}</span>
              </div>
            )}
          </div>
        </div>

        {/* Products */}
        <div className="rounded-3xl border border-slate-200 bg-white/[0.03] backdrop-blur-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-6 w-1 rounded-full bg-blue-600" />
            <h2 className="font-extrabold text-slate-900">আপনার পছন্দের প্রডাক্ট বাছাই করুন</h2>
          </div>
          {campaign.products.length === 0 && <p className="text-sm text-slate-500">কোনো প্রডাক্ট যোগ করা হয়নি</p>}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {campaign.products.map((p: any) => {
              const q = selected[p.id] || 0;
              const price = Number(p.discount_price ?? p.price ?? 0);
              const active = q > 0;
              return (
                <div
                  key={p.id}
                  className={`group relative rounded-2xl p-2.5 transition-all duration-300 ${
                    active
                      ? "bg-blue-50 border border-blue-300"
                      : "bg-white/[0.03] border border-slate-200 hover:border-slate-300 hover:-translate-y-0.5"
                  }`}
                >
                  {active && (
                    <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">
                      ✓ যোগ
                    </span>
                  )}
                  <div className="aspect-square rounded-xl overflow-hidden mb-2 bg-slate-50 ring-1 ring-slate-200">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full grid place-items-center"><ShoppingBag className="h-10 w-10 text-slate-300" /></div>
                    )}
                  </div>
                  <p className="text-xs font-bold line-clamp-2 min-h-[2.5rem] text-slate-900">{p.name}</p>
                  <p className="text-sm font-extrabold mt-0.5 text-blue-600">৳{toBn(price)}</p>
                  {q === 0 ? (
                    <Button
                      size="sm"
                      className="w-full mt-2 h-8 bg-blue-600 hover:bg-blue-700 text-slate-900 "
                      onClick={() => setQty(p.id, 1)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> যোগ করুন
                    </Button>
                  ) : (
                    <div className="flex items-center justify-between mt-2 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                      <button onClick={() => setQty(p.id, q - 1)} className="p-1.5 hover:bg-slate-100 text-slate-900"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="font-extrabold text-sm text-slate-900">{toBn(q)}</span>
                      <button onClick={() => setQty(p.id, q + 1)} className="p-1.5 hover:bg-slate-100 text-slate-900"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Order form */}
        <div className="rounded-3xl border border-slate-200 bg-white/[0.03] backdrop-blur-xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-6 w-1 rounded-full bg-blue-600" />
            <h2 className="font-extrabold text-slate-900">অর্ডার তথ্য</h2>
          </div>
          <div>
            <Label className="text-slate-600 text-xs font-semibold">নাম *</Label>
            <Input
              className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-900/30 focus-visible:ring-amber-400/50 focus-visible:border-amber-400/40 h-11 mt-1"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="আপনার নাম"
            />
          </div>
          <div>
            <Label className="text-slate-600 text-xs font-semibold">মোবাইল নম্বর *</Label>
            <Input
              className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-900/30 focus-visible:ring-amber-400/50 focus-visible:border-amber-400/40 h-11 mt-1"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })}
              placeholder="01XXXXXXXXX"
              inputMode="numeric"
            />
            {form.phone.length === 11 && phoneCount > 0 && (
              <p className="text-xs mt-1.5 text-blue-600">
                এই নম্বরে আগে {toBn(phoneCount)} বার অর্ডার আছে। বাকি: {toBn(remainingAllowed)}
              </p>
            )}
          </div>
          <div>
            <Label className="text-slate-600 text-xs font-semibold">ঠিকানা *</Label>
            <Textarea
              className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-900/30 focus-visible:ring-amber-400/50 focus-visible:border-amber-400/40 mt-1"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="বিস্তারিত ঠিকানা"
              rows={2}
            />
          </div>
          <div className="flex items-center justify-between rounded-2xl px-4 py-3 bg-blue-50 border border-blue-200">
            <span className="text-sm text-slate-600">মোট</span>
            <span className="font-extrabold text-lg text-blue-600">
              ৳{toBn(totalAmount)} <span className="text-xs font-normal text-blue-700/80">(ডেলিভারি ফ্রি)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 z-30 backdrop-blur-xl bg-black/70 border-t border-slate-200">
        <div className="absolute inset-x-0 top-0 h-px bg-slate-200" />
        <div className="max-w-3xl mx-auto p-3">
          {!reachedTier ? (
            <Button disabled className="w-full h-12 text-base bg-slate-100 text-slate-500 border border-slate-200">
              আরও {toBn(goal - distinctCount)} টি প্রডাক্ট যোগ করুন
            </Button>
          ) : remainingAllowed <= 0 && form.phone.length === 11 ? (
            <Button disabled className="w-full h-12 text-base bg-red-900/60 text-slate-900 border border-blue-200">এই মোবাইল দিয়ে অর্ডার সীমা পূরণ</Button>
          ) : (
            <Button
              onClick={submit}
              disabled={submitting || !canOrder}
              className="w-full h-12 text-base font-extrabold text-slate-900 bg-blue-600 hover:bg-blue-700 text-slate-900"
            >
              {submitting ? "অর্ডার হচ্ছে..." : `অর্ডার কনফার্ম করুন (৳${toBn(totalAmount)})`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
