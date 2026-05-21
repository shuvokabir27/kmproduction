import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShoppingBag, Lock, Phone, ArrowLeft, User, Sparkles, Eye, EyeOff } from "lucide-react";
import { SHOP_TOKEN_KEY } from "@/hooks/useShopCustomer";
import MobileShopNav from "@/components/MobileShopNav";

const BRAND_GREEN = "#b91c1c"; // primary red (kept name for minimal diff)
const BRAND_DARK = "#1a0608";  // deep black-red
const BRAND_GOLD = "#fbbf24";

export default function ShopCustomerLogin() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (phone.replace(/\D/g, "").length !== 11) { toast.error("সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন"); return; }
    if (!/^\d{6,}$/.test(password)) { toast.error("পাসওয়ার্ড কমপক্ষে ৬ ডিজিটের সংখ্যা হতে হবে"); return; }
    if (mode === "register" && !fullName.trim()) { toast.error("আপনার নাম দিন"); return; }
    if (mode === "register" && password !== confirmPassword) { toast.error("পাসওয়ার্ড মিলছে না, আবার চেক করুন"); return; }

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

  const inputClass =
    "w-full h-12 pl-11 pr-4 rounded-xl bg-white/80 backdrop-blur border border-white/60 text-gray-900 placeholder:text-gray-400 outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.05),0_1px_0_rgba(255,255,255,0.9)] focus:border-red-400 focus:ring-2 focus:ring-red-200 transition";

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-10 pb-24 md:pb-10 overflow-hidden"
      style={{
        fontFamily: "'Tiro Bangla', serif",
        background: `
          radial-gradient(1200px 700px at 0% 0%, rgba(185,28,28,0.45), transparent 60%),
          radial-gradient(900px 600px at 100% 100%, rgba(251,191,36,0.18), transparent 60%),
          radial-gradient(600px 400px at 50% 50%, rgba(76,5,25,0.55), transparent 70%),
          linear-gradient(135deg, #1a0608 0%, #2a0a10 35%, #0a0203 70%, #000000 100%)
        `,
      }}
    >
      {/* premium grain overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
        }}
      />
      {/* gold hairline top */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />
      {/* glossy blobs */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-red-500/25 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-rose-700/25 blur-[140px]" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-amber-500/10 blur-[100px]" />


      <div className="relative w-full max-w-md">
        <Link to="/products" className="text-white/80 hover:text-white text-sm flex items-center gap-1 mb-4">
          <ArrowLeft className="h-4 w-4" /> দোকানে ফিরুন
        </Link>

        {/* gradient border wrapper */}
        <div
          className="rounded-[28px] p-[1.5px] shadow-[0_25px_60px_-20px_rgba(0,0,0,0.6)]"
          style={{ background: `linear-gradient(140deg, ${BRAND_GOLD}, rgba(255,255,255,0.4) 40%, ${BRAND_GREEN})` }}
        >
          <div className="relative rounded-[26px] bg-white/85 backdrop-blur-xl p-6 md:p-8 overflow-hidden">
            {/* glossy highlight */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/80 to-transparent" />

            <div className="relative text-center mb-6">
              <div
                className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white mb-3 shadow-lg ring-1 ring-white/40"
                style={{ background: `linear-gradient(140deg, ${BRAND_GREEN}, ${BRAND_DARK})` }}
              >
                <ShoppingBag className="h-8 w-8 drop-shadow" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: BRAND_DARK }}>
                কে এম শপ অ্যাকাউন্ট
              </h1>
              <p className="text-xs text-gray-500 mt-1.5 inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" style={{ color: BRAND_GOLD }} />
                {mode === "login" ? "মোবাইল ও পাসওয়ার্ড দিয়ে লগইন করুন" : "নতুন প্রিমিয়াম অ্যাকাউন্ট তৈরি করুন"}
              </p>
            </div>

            {/* segmented switch */}
            <div className="relative grid grid-cols-2 bg-gradient-to-b from-gray-100 to-gray-200/70 rounded-full p-1 mb-5 text-xs md:text-sm font-bold ring-1 ring-black/5 shadow-inner gap-1">
              <button
                onClick={() => setMode("login")}
                className={`py-2.5 rounded-full transition-all ${mode === "login" ? "text-white shadow-md" : "text-gray-500"}`}
                style={mode === "login" ? { background: `linear-gradient(140deg, ${BRAND_GREEN}, ${BRAND_DARK})` } : {}}
              >
                লগইন
              </button>
              <button
                onClick={() => setMode("register")}
                className={`py-2.5 rounded-full transition-all ${mode === "register" ? "text-white shadow-md" : "text-gray-500"}`}
                style={mode === "register" ? { background: `linear-gradient(140deg, ${BRAND_GREEN}, ${BRAND_DARK})` } : {}}
              >
                রেজিস্টার
              </button>
            </div>

            {/* premium notice */}
            <div
              className="relative mb-5 rounded-2xl p-[1.2px] shadow-md"
              style={{ background: "linear-gradient(135deg, #ef4444, #f59e0b, #ef4444)" }}
            >
              <div className="rounded-[14px] bg-gradient-to-br from-red-50 via-white to-red-50 px-3.5 py-3 text-[12.5px] leading-relaxed text-red-700 font-semibold flex gap-2">
                <span className="text-base leading-none">⚠️</span>
                <span>
                  <span className="font-extrabold text-red-800">গুরুত্বপূর্ণ:</span> আপনার পূর্বের অর্ডার করা মোবাইল নম্বরটি দিয়ে রেজিস্ট্রেশন বা লগইন করুন। এতে আপনি আগের সব অর্ডারের বিস্তারিত দেখতে পাবেন এবং খুব সহজেই নতুন অর্ডার করতে পারবেন।
                </span>
              </div>
            </div>

            <div className="space-y-3.5">
              {mode === "register" && (
                <div>
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 ml-1">আপনার নাম</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="পূর্ণ নাম" className={inputClass} />
                  </div>
                </div>
              )}
              <div>
                <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 ml-1">মোবাইল নম্বর</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="01XXXXXXXXX"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 ml-1">কমপক্ষে ৬-ডিজিট পাসওয়ার্ড</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    inputMode="numeric"
                    value={password}
                    onChange={(e) => setPassword(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {mode === "register" && (
                <div>
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 ml-1">পাসওয়ার্ড নিশ্চিত করুন</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      inputMode="numeric"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value.replace(/\D/g, ""))}
                      placeholder="••••••"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && confirmPassword !== password && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1 ml-1">⚠️ পাসওয়ার্ড মিলছে না</p>
                  )}
                  {confirmPassword.length >= 6 && confirmPassword === password && (
                    <p className="text-[11px] text-green-600 font-semibold mt-1 ml-1">✓ পাসওয়ার্ড মিলেছে</p>
                  )}
                </div>
              )}


              {(() => {
                const mismatch = mode === "register" && (confirmPassword.length < 6 || confirmPassword !== password);
                return (
                  <Button
                    onClick={submit}
                    disabled={loading || mismatch}
                    className="relative w-full h-12 mt-1 font-extrabold rounded-xl text-white text-base shadow-lg overflow-hidden ring-1 ring-white/30 hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100"
                    style={{ background: `linear-gradient(140deg, ${BRAND_GREEN}, ${BRAND_DARK})` }}
                  >
                    <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
                    <span className="relative">
                      {loading ? "অপেক্ষা করুন..." : mode === "login" ? "লগইন করুন" : "অ্যাকাউন্ট তৈরি করুন"}
                    </span>
                  </Button>
                );
              })()}
            </div>

            <p className="relative text-center text-[11px] text-gray-400 mt-5">
              🔒 আপনার তথ্য সম্পূর্ণ সুরক্ষিত ও এনক্রিপ্টেড
            </p>

            {/* divider */}
            <div className="relative my-4 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

            {/* media login */}
            <button
              onClick={() => nav("/login")}
              className="relative w-full h-11 rounded-xl text-white text-sm font-bold shadow-md ring-1 ring-white/20 hover:brightness-110 transition inline-flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(140deg, #b91c1c, #4c0519)" }}
              title="KM Production মিডিয়া টিম লগইন"
            >
              🎬 মিডিয়া লগইন
            </button>
          </div>
        </div>
      </div>
      <MobileShopNav />
    </div>
  );
}
