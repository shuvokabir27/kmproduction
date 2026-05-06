import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Truck, CheckCircle2, ShoppingBag, Sparkles, Plus, Minus } from "lucide-react";
import { useShopCustomer } from "@/hooks/useShopCustomer";

const toBn = (n: number | string) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

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

  // Check phone usage
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
      // Re-check
      const { data: count } = await supabase.rpc("free_delivery_phone_order_count" as any, { _campaign_id: campaign.campaign.id, _phone: form.phone });
      if (Number(count ?? 0) >= campaign.campaign.max_orders_per_phone) {
        toast.error("এই মোবাইল নম্বর দিয়ে আর অর্ডার করা যাবে না");
        setPhoneCount(Number(count ?? 0));
        return;
      }

      // shared order number
      const { data: numData } = await supabase.rpc("next_order_number" as any);
      const sharedNumber = numData ? Number(numData) : null;

      // Insert one row per product into orders table
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
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">লোড হচ্ছে...</div>;
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <Truck className="h-16 w-16 text-gray-300 mb-3" />
        <h1 className="text-xl font-bold mb-2">কোনো ফ্রি ডেলিভারি অফার চলছে না</h1>
        <Button onClick={() => navigate("/products")}>হোমে ফিরুন</Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle2 className="h-20 w-20 text-green-600 mb-3" />
        <h1 className="text-2xl font-bold mb-2 text-green-700">অর্ডার সফল হয়েছে! 🎉</h1>
        <p className="text-gray-600 mb-1">ফ্রি ডেলিভারি অফারে আপনার অর্ডার গৃহীত হয়েছে</p>
        <p className="text-gray-500 text-sm mb-6">আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব</p>
        <Button onClick={() => navigate("/products")} className="bg-green-700 hover:bg-green-800">আরও কেনাকাটা করুন</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24" style={{ fontFamily: "'Tiro Bangla', serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gradient-to-r from-green-700 to-emerald-600 text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-white/10 rounded-lg"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex-1">
            <h1 className="font-bold text-lg flex items-center gap-2 text-white"><Truck className="h-5 w-5" /> {campaign.campaign.title}</h1>
            {campaign.campaign.description && <p className="text-xs text-white/80">{campaign.campaign.description}</p>}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        {/* Progress */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 text-gray-900">
          <div className="flex items-center justify-between mb-2 text-sm font-semibold">
            <span className="flex items-center gap-1.5 text-gray-800"><Sparkles className="h-4 w-4 text-amber-500" /> অগ্রগতি: {toBn(distinctCount)} / {toBn(goal)} টি প্রডাক্ট</span>
            <span className="text-green-700 font-bold">{toBn(progress)}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {sortedTiers.map((t: any) => {
              const reached = distinctCount >= t.required_products;
              return (
                <div key={t.id} className={`text-center p-2 rounded-lg border ${reached ? "bg-green-50 border-green-300" : "bg-gray-50 border-gray-200"}`}>
                  <div className={`text-xs font-bold ${reached ? "text-green-700" : "text-gray-700"}`}>{t.label}</div>
                  <div className="text-[11px] text-gray-600">{toBn(t.required_products)} টি</div>
                  <div className="text-[11px] font-semibold mt-0.5 text-gray-800">{t.reward_text}</div>
                </div>
              );
            })}
          </div>
          {reachedTier && (
            <div className="mt-3 bg-green-100 text-green-800 text-sm font-semibold rounded-lg px-3 py-2 text-center">
              🎉 আপনি পেয়েছেন: {reachedTier.reward_text}
            </div>
          )}
        </div>

        {/* Products */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 text-gray-900">
          <h2 className="font-bold mb-3 text-gray-900">আপনার পছন্দের প্রডাক্ট বাছাই করুন</h2>
          {campaign.products.length === 0 && <p className="text-sm text-gray-500">কোনো প্রডাক্ট যোগ করা হয়নি</p>}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {campaign.products.map((p: any) => {
              const q = selected[p.id] || 0;
              const price = Number(p.discount_price ?? p.price ?? 0);
              const active = q > 0;
              return (
                <div key={p.id} className={`border rounded-xl p-2 transition-all ${active ? "border-green-500 bg-green-50/50 ring-2 ring-green-200" : "border-gray-200 bg-white"}`}>
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
                    {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <ShoppingBag className="h-10 w-10 m-auto text-gray-300" />}
                  </div>
                  <p className="text-xs font-bold line-clamp-2 min-h-[2.5rem] text-gray-900">{p.name}</p>
                  <p className="text-sm font-bold text-green-700">৳{toBn(price)}</p>
                  {q === 0 ? (
                    <Button size="sm" className="w-full mt-1.5 h-8 bg-green-600 hover:bg-green-700 text-white" onClick={() => setQty(p.id, 1)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> যোগ করুন
                    </Button>
                  ) : (
                    <div className="flex items-center justify-between mt-1.5 bg-white border rounded-lg text-gray-900">
                      <button onClick={() => setQty(p.id, q - 1)} className="p-1.5 hover:bg-gray-100 rounded-l-lg"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="font-bold text-sm">{toBn(q)}</span>
                      <button onClick={() => setQty(p.id, q + 1)} className="p-1.5 hover:bg-gray-100 rounded-r-lg"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Order form */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-3 text-gray-900">
          <h2 className="font-bold text-gray-900">অর্ডার তথ্য</h2>
          <div><Label className="text-gray-800">নাম *</Label><Input className="bg-white text-gray-900" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="আপনার নাম" /></div>
          <div>
            <Label className="text-gray-800">মোবাইল নম্বর *</Label>
            <Input className="bg-white text-gray-900" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })} placeholder="01XXXXXXXXX" inputMode="numeric" />
            {form.phone.length === 11 && phoneCount > 0 && (
              <p className={`text-xs mt-1 ${remainingAllowed > 0 ? "text-amber-600" : "text-red-600"}`}>
                এই নম্বরে আগে {toBn(phoneCount)} বার অর্ডার আছে। বাকি: {toBn(remainingAllowed)}
              </p>
            )}
          </div>
          <div><Label className="text-gray-800">ঠিকানা *</Label><Textarea className="bg-white text-gray-900" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="বিস্তারিত ঠিকানা" rows={2} /></div>
          <div className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2">
            <span className="text-sm text-gray-800">মোট</span>
            <span className="font-bold text-green-700">৳{toBn(totalAmount)} <span className="text-xs font-normal">(ডেলিভারি ফ্রি)</span></span>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t shadow-lg p-3 z-30">
        <div className="max-w-3xl mx-auto">
          {!reachedTier ? (
            <Button disabled className="w-full h-12 text-base bg-gray-300 text-gray-700">
              আরও {toBn(goal - distinctCount)} টি প্রডাক্ট যোগ করুন
            </Button>
          ) : remainingAllowed <= 0 && form.phone.length === 11 ? (
            <Button disabled className="w-full h-12 text-base bg-red-500 text-white">এই মোবাইল দিয়ে অর্ডার সীমা পূরণ</Button>
          ) : (
            <Button onClick={submit} disabled={submitting || !canOrder} className="w-full h-12 text-base bg-green-600 hover:bg-green-700 text-white font-bold">
              {submitting ? "অর্ডার হচ্ছে..." : `অর্ডার কনফার্ম করুন (৳${toBn(totalAmount)})`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
