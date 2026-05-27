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
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [forgotStep, setForgotStep] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);


  const requestOtp = async () => {
    if (phone.replace(/\D/g, "").length !== 11) { toast.error("সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন"); return; }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("shop-customer-auth", {
      body: { action: "request_otp", phone: phone.replace(/\D/g, "") },
    });
    setLoading(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "OTP পাঠানো যায়নি");
      return;
    }
    toast.success("OTP পাঠানো হয়েছে আপনার মোবাইলে");
    setForgotStep("otp");
    setResendIn(60);
    const timer = setInterval(() => {
      setResendIn((s) => {
        if (s <= 1) { clearInterval(timer); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const submit = async () => {
    if (phone.replace(/\D/g, "").length !== 11) { toast.error("সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন"); return; }

    // forgot password — step 1 = send OTP, step 2 = verify + reset
    if (mode === "forgot") {
      if (forgotStep === "phone") { await requestOtp(); return; }
      if (otp.length !== 6) { toast.error("৬ ডিজিটের OTP দিন"); return; }
      if (!/^\d{6,}$/.test(password)) { toast.error("পাসওয়ার্ড কমপক্ষে ৬ ডিজিটের সংখ্যা হতে হবে"); return; }
      if (password !== confirmPassword) { toast.error("পাসওয়ার্ড মিলছে না"); return; }

      setLoading(true);
      const { data, error } = await supabase.functions.invoke("shop-customer-auth", {
        body: { action: "reset_with_otp", phone: phone.replace(/\D/g, ""), otp, new_password: password },
      });
      setLoading(false);
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || error?.message || "রিসেট ব্যর্থ");
        return;
      }
      localStorage.setItem(SHOP_TOKEN_KEY, (data as any).token);
      toast.success("পাসওয়ার্ড পরিবর্তন হয়েছে");
      nav("/shop/account");
      return;
    }

    const phoneDigits = phone.replace(/\D/g, "");

    // Special: KM Shop admin phone → route to Supabase admin auth
    if (mode === "login" && phoneDigits === "01710147613") {
      setLoading(true);
      try {
        // First call setup once (idempotent) to ensure admin user exists
        await supabase.functions.invoke("setup-shop-admin", { body: {} });
        const { data, error } = await supabase.functions.invoke("admin-phone-login", {
          body: { phone: phoneDigits, password },
        });
        if (error || (data as any)?.error) {
          toast.error((data as any)?.error || error?.message || "লগইন ব্যর্থ");
          setLoading(false);
          return;
        }
        const { access_token, refresh_token } = data as any;
        const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
        if (setErr) { toast.error(setErr.message); setLoading(false); return; }
        toast.success("অ্যাডমিন লগইন সফল");
        nav("/admin/products");
      } catch (e: any) {
        toast.error(e?.message || "লগইন ব্যর্থ");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!/^\d{6,}$/.test(password)) { toast.error("পাসওয়ার্ড কমপক্ষে ৬ ডিজিটের সংখ্যা হতে হবে"); return; }
    if (mode === "register" && !fullName.trim()) { toast.error("আপনার নাম দিন"); return; }
    if (mode === "register" && password !== confirmPassword) { toast.error("পাসওয়ার্ড মিলছে না, আবার চেক করুন"); return; }

    setLoading(true);
    const payload: Record<string, unknown> = {
      action: mode,
      phone: phone.replace(/\D/g, ""),
      password,
      full_name: fullName.trim(),
    };

    const { data, error } = await supabase.functions.invoke("shop-customer-auth", {
      body: payload,
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

  const resetForgot = () => {
    setForgotStep("phone");
    setOtp("");
    setPassword("");
    setConfirmPassword("");
    setResendIn(0);
  };

  const inputClass =
    "w-full h-12 pl-11 pr-4 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-gray-600 outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/50 transition-all duration-300";

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-10 pb-24 md:pb-10 overflow-hidden bg-[#0a0202]"
      style={{ fontFamily: "'Hind Siliguri', 'Tiro Bangla', sans-serif" }}
    >
      {/* Dynamic background blobs */}
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-900/30 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-950/40 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[36rem] w-[36rem] rounded-full bg-red-900/15 blur-[160px]" />

      <div className="relative w-full max-w-md">
        <Link to="/products" className="text-white/70 hover:text-white text-sm flex items-center gap-1 mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> দোকানে ফিরুন
        </Link>

        {/* Cinematic glass card */}
        <div className="relative w-full bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
          {/* Top decorative light */}
          <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

          {/* Brand identity */}
          <div className="relative text-center mb-6">
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white mb-4 bg-gradient-to-br from-red-600 to-red-900 shadow-lg shadow-red-900/20 ring-1 ring-white/20">
              <ShoppingBag className="h-8 w-8 drop-shadow" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide mb-1">কে এম শপ অ্যাকাউন্ট</h1>
            <p className="text-xs text-red-400/80 mt-1 inline-flex items-center gap-1 font-medium tracking-wider">
              <Sparkles className="h-3 w-3" />
              {mode === "login" ? "মোবাইল ও পাসওয়ার্ড দিয়ে লগইন করুন"
               : mode === "register" ? "নতুন প্রিমিয়াম অ্যাকাউন্ট তৈরি করুন"
               : forgotStep === "phone" ? "OTP পাঠাবো আপনার মোবাইলে"
               : "OTP ও নতুন পাসওয়ার্ড দিন"}
            </p>
          </div>

          {/* segmented switch */}
          <div className="relative grid grid-cols-2 bg-black/40 border border-white/10 rounded-full p-1 mb-5 text-xs md:text-sm font-bold gap-1">
            <button
              onClick={() => { setMode("login"); resetForgot(); }}
              className={`py-2.5 rounded-full transition-all ${mode === "login" ? "bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]" : "text-gray-400 hover:text-white"}`}
            >
              লগইন
            </button>
            <button
              onClick={() => { setMode("register"); resetForgot(); }}
              className={`py-2.5 rounded-full transition-all ${mode === "register" ? "bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]" : "text-gray-400 hover:text-white"}`}
            >
              রেজিস্টার
            </button>
          </div>

          {/* premium notice */}
          <div className="relative mb-5 rounded-2xl bg-red-500/10 border border-red-500/30 px-3.5 py-3 text-[12.5px] leading-relaxed text-red-200 font-medium flex gap-2">
            <span className="text-base leading-none">⚠️</span>
            <span>
              <span className="font-bold text-red-300">গুরুত্বপূর্ণ:</span> আপনার পূর্বের অর্ডার করা মোবাইল নম্বরটি দিয়ে রেজিস্ট্রেশন বা লগইন করুন। এতে আপনি আগের সব অর্ডারের বিস্তারিত দেখতে পাবেন এবং খুব সহজেই নতুন অর্ডার করতে পারবেন।
            </span>
          </div>

          <div className="space-y-4">
            {mode === "register" && (
              <div>
                <Label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 ml-1 mb-2">আপনার নাম</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="পূর্ণ নাম" className={inputClass} />
                </div>
              </div>
            )}
            <div>
              <Label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 ml-1 mb-2">মোবাইল নম্বর</Label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="01XXXXXXXXX"
                  className={inputClass}
                  disabled={mode === "forgot" && forgotStep === "otp"}
                />
              </div>
            </div>

            {/* OTP step input */}
            {mode === "forgot" && forgotStep === "otp" && (
              <div>
                <Label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 ml-1 mb-2">৬-ডিজিট OTP কোড</Label>
                <div className="relative">
                  <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="● ● ● ● ● ●"
                    className={inputClass + " tracking-[0.5em] text-center font-bold text-lg"}
                    autoFocus
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[11px] text-gray-500">SMS এ পাঠানো ৬-ডিজিট কোড দিন (৫ মিনিটে মেয়াদ শেষ)</p>
                  <button
                    type="button"
                    onClick={requestOtp}
                    disabled={resendIn > 0 || loading}
                    className="text-[11px] font-bold text-red-400 hover:text-red-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                  >
                    {resendIn > 0 ? `পুনরায় (${resendIn}s)` : "পুনরায় পাঠান"}
                  </button>
                </div>
              </div>
            )}

            {/* Password fields — only on login/register or forgot step 2 */}
            {(mode !== "forgot" || forgotStep === "otp") && (
              <>
                {/* Name field moved to top */}

                <div>
                  <Label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 ml-1 mb-2">
                    {mode === "forgot" ? "নতুন পাসওয়ার্ড (কমপক্ষে ৬-ডিজিট)" : "কমপক্ষে ৬-ডিজিট পাসওয়ার্ড"}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      inputMode="numeric"
                      value={password}
                      onChange={(e) => setPassword(phone.replace(/\D/g, "") === "01710147613" ? e.target.value : e.target.value.replace(/\D/g, ""))}
                      placeholder="••••••"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {mode === "login" && (
                    <div className="text-right mt-1.5">
                      <button
                        type="button"
                        onClick={() => { setMode("forgot"); resetForgot(); }}
                        className="text-[12px] font-medium text-red-400 hover:text-red-300 transition-colors"
                      >
                        পাসওয়ার্ড ভুলে গেছেন?
                      </button>
                    </div>
                  )}
                </div>

                {(mode === "register" || mode === "forgot") && (
                  <div>
                    <Label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 ml-1 mb-2">পাসওয়ার্ড নিশ্চিত করুন</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPassword.length > 0 && confirmPassword !== password && (
                      <p className="text-[11px] text-red-400 font-medium mt-1.5 ml-1">⚠️ পাসওয়ার্ড মিলছে না</p>
                    )}
                    {confirmPassword.length >= 6 && confirmPassword === password && (
                      <p className="text-[11px] text-green-400 font-medium mt-1.5 ml-1">✓ পাসওয়ার্ড মিলেছে</p>
                    )}
                  </div>
                )}
              </>
            )}

            {mode === "forgot" && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setMode("login"); resetForgot(); }}
                  className="text-[12px] font-medium text-gray-400 hover:text-white transition-colors"
                >
                  ← লগইনে ফিরে যান
                </button>
              </div>
            )}

            {(() => {
              const mismatch = (mode === "register" || (mode === "forgot" && forgotStep === "otp")) && (confirmPassword.length < 6 || confirmPassword !== password);
              const isOtpStep = mode === "forgot" && forgotStep === "otp";
              return (
                <button
                  type="button"
                  onClick={submit}
                  disabled={loading || mismatch}
                  className="w-full group relative flex items-center justify-center px-8 py-4 mt-2 font-bold text-white transition-all duration-500 bg-red-600 rounded-xl overflow-hidden hover:bg-red-500 hover:shadow-[0_0_20px_rgba(220,38,38,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="relative z-10 text-base">
                    {loading ? "অপেক্ষা করুন..."
                     : mode === "login" ? "লগইন করুন"
                     : mode === "register" ? "অ্যাকাউন্ট তৈরি করুন"
                     : isOtpStep ? "পাসওয়ার্ড রিসেট করুন"
                     : "OTP পাঠান"}
                  </span>
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </button>
              );
            })()}
          </div>

          <p className="relative text-center text-[11px] text-gray-500 mt-5">
            🔒 আপনার তথ্য সম্পূর্ণ সুরক্ষিত ও এনক্রিপ্টেড
          </p>

          {/* Bottom accent */}
          <div className="pointer-events-none absolute bottom-0 right-0 w-16 h-16 bg-red-600/10 blur-xl rounded-full" />
        </div>
      </div>

      <MobileShopNav />
    </div>
  );
}
