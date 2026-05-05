import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShoppingBag, Lock, Phone, ArrowLeft } from "lucide-react";
import { SHOP_TOKEN_KEY } from "@/hooks/useShopCustomer";
import MobileShopNav from "@/components/MobileShopNav";

const BRAND_GREEN = "#1f7a3a";
const BRAND_DARK = "#155c2c";

export default function ShopCustomerLogin() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (phone.replace(/\D/g, "").length !== 11) { toast.error("সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন"); return; }
    if (!/^\d{6}$/.test(password)) { toast.error("পাসওয়ার্ড অবশ্যই ৬ ডিজিট সংখ্যা"); return; }
    if (mode === "register" && !fullName.trim()) { toast.error("আপনার নাম দিন"); return; }

    setLoading(true);
    const { data, error } = await supabase.functions.invoke("shop-customer-auth", {
      body: {
        action: mode,
        phone: phone.replace(/\D/g, ""),
        password,
        full_name: fullName.trim(),
      },
    });
    setLoading(false);

    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "ত্রুটি");
      return;
    }
    localStorage.setItem(SHOP_TOKEN_KEY, (data as any).token);
    toast.success(mode === "login" ? "সফলভাবে লগইন হয়েছে" : "অ্যাকাউন্ট তৈরি হয়েছে");
    nav("/shop/account");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        fontFamily: "'Tiro Bangla', serif",
        background: `linear-gradient(135deg, ${BRAND_DARK}, ${BRAND_GREEN})`,
      }}
    >
      <div className="w-full max-w-md">
        <Link to="/products" className="text-white/80 hover:text-white text-sm flex items-center gap-1 mb-4">
          <ArrowLeft className="h-4 w-4" /> দোকানে ফিরুন
        </Link>

        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-white font-bold mb-3" style={{ backgroundColor: BRAND_GREEN }}>
              <ShoppingBag className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">কে এম শপ অ্যাকাউন্ট</h1>
            <p className="text-xs text-gray-500 mt-1">
              {mode === "login" ? "মোবাইল ও পাসওয়ার্ড দিয়ে লগইন করুন" : "নতুন অ্যাকাউন্ট তৈরি করুন"}
            </p>
          </div>

          <div className="flex bg-gray-100 rounded-full p-1 mb-5 text-sm font-semibold">
            <button onClick={() => setMode("login")} className={`flex-1 py-2 rounded-full transition ${mode === "login" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>লগইন</button>
            <button onClick={() => setMode("register")} className={`flex-1 py-2 rounded-full transition ${mode === "register" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>রেজিস্টার</button>
          </div>

          <div className="mb-4 rounded-xl border-2 border-red-400 bg-red-50 px-3 py-3 text-[12px] leading-relaxed text-red-700 font-semibold shadow-[0_0_0_3px_rgba(239,68,68,0.15)] animate-pulse">
            ⚠️ <span className="font-bold">গুরুত্বপূর্ণ:</span> আপনার পূর্বের অর্ডার করা মোবাইল নম্বরটি দিয়ে রেজিস্ট্রেশন বা লগইন করুন। এতে আপনি আপনার আগের সব অর্ডারের বিস্তারিত দেখতে পাবেন এবং খুব সহজেই নতুন অর্ডার করতে পারবেন।
          </div>

          <div className="space-y-3">
            {mode === "register" && (
              <div>
                <Label className="text-xs">আপনার নাম</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="পূর্ণ নাম" />
              </div>
            )}
            <div>
              <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> মোবাইল নম্বর</Label>
              <Input
                inputMode="numeric"
                maxLength={11}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="01XXXXXXXXX"
              />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><Lock className="h-3 w-3" /> ৬-ডিজিট পাসওয়ার্ড</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
              />
            </div>
            <Button
              onClick={submit}
              disabled={loading}
              className="w-full h-11 font-bold rounded-full text-white"
              style={{ backgroundColor: BRAND_GREEN }}
            >
              {loading ? "অপেক্ষা করুন..." : mode === "login" ? "লগইন করুন" : "অ্যাকাউন্ট তৈরি করুন"}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
