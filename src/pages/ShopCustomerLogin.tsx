import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Lock,
  Phone,
  ArrowLeft,
  User,
  AlertCircle,
  Mail,
  ShieldCheck,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SHOP_TOKEN_KEY } from "@/hooks/useShopCustomer";
import logoAsset from "@/assets/kuakata-multimedia-logo.png.asset.json";

const ADMIN_PHONE = "01710147613";
const ADMIN_EMAIL = "01710147613@kmshop.local";

export default function ShopCustomerLogin() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [forgotStep, setForgotStep] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);

  // identifier can be phone OR email (login only)
  const [identifier, setIdentifier] = useState("");
  const [phone, setPhone] = useState(""); // used for register/forgot (mobile only)

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
  const isAdminPhone = (s: string) => s.replace(/\D/g, "") === ADMIN_PHONE;

  const adminLogin = async (email: string, pwd: string) => {
    setLoading(true);
    try {
      // ensure admin user exists (idempotent)
      await supabase.functions.invoke("setup-shop-admin", { body: {} });
      const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
      if (error) {
        setErrorMsg("ইমেইল/মোবাইল অথবা পাসওয়ার্ড ভুল।");
        setLoading(false);
        return;
      }
      toast.success("অ্যাডমিন লগইন সফল");
      nav("/admin/products");
    } catch (e: any) {
      toast.error(e?.message || "লগইন ব্যর্থ");
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = async () => {
    if (phone.replace(/\D/g, "").length !== 11) {
      toast.error("সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন");
      return;
    }
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
        if (s <= 1) {
          clearInterval(timer);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const submit = async () => {
    setErrorMsg("");

    // LOGIN — accept email OR mobile (admin via either)
    if (mode === "login") {
      const id = identifier.trim();
      if (!id) {
        toast.error("মোবাইল নম্বর বা ইমেইল দিন");
        return;
      }
      if (!password) {
        toast.error("পাসওয়ার্ড দিন");
        return;
      }

      // Admin email login
      if (isEmail(id)) {
        await adminLogin(id, password);
        return;
      }

      const digits = id.replace(/\D/g, "");
      if (digits.length !== 11) {
        toast.error("সঠিক মোবাইল নম্বর অথবা ইমেইল দিন");
        return;
      }

      // Admin phone login → route to admin email
      if (digits === ADMIN_PHONE) {
        await adminLogin(ADMIN_EMAIL, password);
        return;
      }

      // Customer phone login
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("shop-customer-auth", {
        body: { action: "login", phone: digits, password },
      });
      setLoading(false);
      if (error || (data as any)?.error) {
        setErrorMsg(getErrorMessage((data as any)?.error || error));
        return;
      }
      localStorage.setItem(SHOP_TOKEN_KEY, (data as any).token);
      toast.success("সফলভাবে লগইন হয়েছে");
      nav("/shop/account");
      return;
    }

    // REGISTER / FORGOT — mobile only
    if (phone.replace(/\D/g, "").length !== 11) {
      toast.error("সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন");
      return;
    }

    if (mode === "forgot") {
      if (forgotStep === "phone") {
        await requestOtp();
        return;
      }
      if (otp.length !== 6) {
        toast.error("৬ ডিজিটের OTP দিন");
        return;
      }
      if (!/^\d{6,}$/.test(password)) {
        toast.error("পাসওয়ার্ড কমপক্ষে ৬ ডিজিটের সংখ্যা হতে হবে");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("পাসওয়ার্ড মিলছে না");
        return;
      }
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("shop-customer-auth", {
        body: {
          action: "reset_with_otp",
          phone: phone.replace(/\D/g, ""),
          otp,
          new_password: password,
        },
      });
      setLoading(false);
      if (error || (data as any)?.error) {
        setErrorMsg(getErrorMessage((data as any)?.error || error));
        return;
      }
      localStorage.setItem(SHOP_TOKEN_KEY, (data as any).token);
      toast.success("পাসওয়ার্ড পরিবর্তন হয়েছে");
      nav("/shop/account");
      return;
    }

    // register
    if (!/^\d{6,}$/.test(password)) {
      toast.error("পাসওয়ার্ড কমপক্ষে ৬ ডিজিটের সংখ্যা হতে হবে");
      return;
    }
    if (!fullName.trim()) {
      toast.error("আপনার নাম দিন");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("পাসওয়ার্ড মিলছে না");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("shop-customer-auth", {
      body: {
        action: "register",
        phone: phone.replace(/\D/g, ""),
        password,
        full_name: fullName.trim(),
      },
    });
    setLoading(false);
    if (error || (data as any)?.error) {
      setErrorMsg(getErrorMessage((data as any)?.error || error));
      return;
    }
    localStorage.setItem(SHOP_TOKEN_KEY, (data as any).token);
    toast.success("অ্যাকাউন্ট তৈরি হয়েছে");
    nav("/shop/account");
  };

  const resetForgot = () => {
    setForgotStep("phone");
    setOtp("");
    setPassword("");
    setConfirmPassword("");
    setResendIn(0);
    setErrorMsg("");
  };

  const getErrorMessage = (err: any): string => {
    const msg = err?.message?.toLowerCase?.() || String(err).toLowerCase();
    if (
      msg.includes("invalid") ||
      msg.includes("wrong") ||
      msg.includes("incorrect") ||
      msg.includes("does not match")
    )
      return "মোবাইল/ইমেইল অথবা পাসওয়ার্ড ভুল। সঠিক তথ্য দিয়ে আবার চেষ্টা করুন।";
    if (msg.includes("not found") || msg.includes("no user") || msg.includes("no account"))
      return "এই অ্যাকাউন্ট পাওয়া যায়নি। প্রথমে রেজিস্টার করুন।";
    if (msg.includes("rate limit") || msg.includes("too many") || msg.includes("try again"))
      return "অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।";
    if (/[\u0980-\u09FF]/.test(err?.message || String(err))) return err?.message || String(err);
    return "লগইন করা যায়নি। আবার চেষ্টা করুন।";
  };

  const inputBase =
    "w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all duration-300";

  const loginIdentifierIsEmail = isEmail(identifier);
  const loginIdentifierIsAdmin =
    loginIdentifierIsEmail || isAdminPhone(identifier);

  const headerTitle =
    mode === "login"
      ? "লগইন করুন"
      : mode === "register"
      ? "নতুন অ্যাকাউন্ট"
      : "পাসওয়ার্ড রিসেট";
  const headerSub =
    mode === "login"
      ? "আপনার অ্যাকাউন্টের তথ্যাদি দিয়ে প্রবেশ করুন"
      : mode === "register"
      ? "কয়েক সেকেন্ডে অ্যাকাউন্ট তৈরি করুন"
      : forgotStep === "phone"
      ? "মোবাইল নম্বর দিন, OTP পাঠাবো"
      : "OTP ও নতুন পাসওয়ার্ড দিন";

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-8 bg-slate-50"
      style={{ fontFamily: "'Hind Siliguri', 'Tiro Bangla', sans-serif" }}
    >
      <div className="relative w-full max-w-4xl">
        <Link
          to="/"
          className="text-slate-500 hover:text-slate-900 text-sm inline-flex items-center gap-1 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> দোকানে ফিরুন
        </Link>

        {/* Split card */}
        <div className="relative w-full bg-white rounded-3xl shadow-[0_20px_50px_rgba(59,130,246,0.12)] overflow-hidden flex border border-slate-100">
          {/* LEFT — blue welcome panel with glassmorphic accents */}
          <div className="hidden md:flex w-1/2 bg-blue-600 relative overflow-hidden items-center justify-center p-12">
            {/* decorative glass orbs */}
            <div className="absolute top-0 left-0 w-full h-full opacity-20">
              <div className="absolute -top-24 -left-24 w-64 h-64 bg-white rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-400 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 text-center">
              <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-8 border border-white/30 overflow-hidden">
                <img src={logoAsset.url} alt="Kuakata Multimedia" className="h-16 w-16 object-contain" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">কে এম শপ-এ স্বাগতম</h2>
              <p className="text-blue-100 text-lg leading-relaxed">
                সেরা পণ্য ও দ্রুত ডেলিভারির অভিজ্ঞতায় আপনাকে স্বাগতম। আপনার পছন্দের সব কেনাকাটা এখন এক জায়গায়।
              </p>
              <div className="mt-12 flex justify-center gap-2">
                <div className="w-12 h-1 bg-white/40 rounded-full" />
                <div className="w-4 h-1 bg-white/20 rounded-full" />
                <div className="w-4 h-1 bg-white/20 rounded-full" />
              </div>
            </div>
          </div>

          {/* RIGHT — form panel */}
          <div className="w-full md:w-1/2 p-8 md:p-14 flex flex-col justify-center">
            <div className="max-w-md mx-auto w-full">
              <div className="mb-10">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">{headerTitle}</h1>
                <p className="text-slate-500">{headerSub}</p>
              </div>

              {/* Mode indicator */}
              {mode !== "login" && (
                <button
                  onClick={() => {
                    setMode("login");
                    resetForgot();
                  }}
                  className="mb-4 text-[12px] font-medium text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> লগইনে ফিরে যান
                </button>
              )}

              {/* Notice */}
              {mode !== "login" && (
                <div className="mb-5 rounded-xl bg-blue-50 border border-blue-100 px-3.5 py-3 text-[12.5px] leading-relaxed text-slate-700 flex gap-2.5">
                  <Info className="h-4 w-4 text-blue-700 mt-0.5 shrink-0" />
                  <span>
                    <span className="font-semibold text-slate-900">গুরুত্বপূর্ণ:</span> পূর্বের অর্ডার করা মোবাইল নম্বরটি দিয়ে রেজিস্ট্রেশন করুন — আগের সব অর্ডার এক জায়গায় দেখতে পাবেন।
                  </span>
                </div>
              )}

              <div className="space-y-5">
                {mode === "register" && (
                  <div className="space-y-1.5">
                    <Label className="block text-sm font-semibold text-slate-700 ml-1">
                      আপনার নাম
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="পূর্ণ নাম"
                        className={inputBase}
                      />
                    </div>
                  </div>
                )}

                {/* Login identifier — email OR mobile */}
                {mode === "login" ? (
                  <div className="space-y-1.5">
                    <Label className="block text-sm font-semibold text-slate-700 ml-1">
                      মোবাইল নম্বর অথবা ইমেইল
                    </Label>
                    <div className="relative">
                      {loginIdentifierIsEmail ? (
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      ) : (
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      )}
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => {
                          setIdentifier(e.target.value);
                          setErrorMsg("");
                        }}
                        placeholder="01XXXXXXXXX অথবা email@example.com"
                        className={inputBase}
                        autoComplete="username"
                      />
                    </div>
                    {loginIdentifierIsAdmin && (
                      <p className="text-[11px] text-blue-800 font-medium mt-1.5 ml-0.5 inline-flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> অ্যাডমিন লগইন সনাক্ত হয়েছে
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="block text-sm font-semibold text-slate-700 ml-1">
                      মোবাইল নম্বর
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value.replace(/\D/g, ""));
                          setErrorMsg("");
                        }}
                        placeholder="01XXXXXXXXX"
                        className={inputBase}
                        disabled={mode === "forgot" && forgotStep === "otp"}
                      />
                    </div>
                  </div>
                )}

                {/* OTP */}
                {mode === "forgot" && forgotStep === "otp" && (
                  <div className="space-y-1.5">
                    <Label className="block text-sm font-semibold text-slate-700 ml-1">
                      ৬-ডিজিট OTP কোড
                    </Label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="● ● ● ● ● ●"
                      className="w-full h-14 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all duration-300 tracking-[0.5em] text-center font-bold text-lg"
                      autoFocus
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[11px] text-slate-500">SMS এ পাঠানো কোড দিন</p>
                      <button
                        type="button"
                        onClick={requestOtp}
                        disabled={resendIn > 0 || loading}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                      >
                        {resendIn > 0 ? `পুনরায় (${resendIn}s)` : "পুনরায় পাঠান"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Password */}
                {(mode !== "forgot" || forgotStep === "otp") && (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label className="block text-sm font-semibold text-slate-700 ml-1">
                          {mode === "forgot" ? "নতুন পাসওয়ার্ড" : "পাসওয়ার্ড"}
                        </Label>
                        {mode === "login" && (
                          <button
                            type="button"
                            onClick={() => {
                              setMode("forgot");
                              setIdentifier("");
                              setPassword("");
                              setErrorMsg("");
                            }}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            ভুলে গেছেন?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => {
                            // For admin login allow any chars; customer mode digits only
                            if (mode === "login" && loginIdentifierIsAdmin) {
                              setPassword(e.target.value);
                            } else {
                              setPassword(e.target.value.replace(/\D/g, ""));
                            }
                            setErrorMsg("");
                          }}
                          placeholder="••••••"
                          className={inputBase}
                          autoComplete={mode === "login" ? "current-password" : "new-password"}
                        />
                      </div>
                    </div>

                    {(mode === "register" || mode === "forgot") && (
                      <div className="space-y-1.5">
                        <Label className="block text-sm font-semibold text-slate-700 ml-1">
                          পাসওয়ার্ড নিশ্চিত করুন
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            type="password"
                            inputMode="numeric"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value.replace(/\D/g, ""))}
                            placeholder="••••••"
                            className={inputBase}
                          />
                        </div>
                        {confirmPassword.length > 0 && confirmPassword !== password && (
                          <p className="text-[11px] text-red-600 font-medium mt-1.5 ml-0.5">
                            পাসওয়ার্ড মিলছে না
                          </p>
                        )}
                        {confirmPassword.length >= 6 && confirmPassword === password && (
                          <p className="text-[11px] text-green-600 font-medium mt-1.5 ml-0.5">
                            ✓ পাসওয়ার্ড মিলেছে
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {mode === "forgot" && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        resetForgot();
                      }}
                      className="text-[12px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      ← লগইনে ফিরে যান
                    </button>
                  </div>
                )}

                <AnimatePresence>
                  {errorMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200"
                    >
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-700 font-medium leading-snug">{errorMsg}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {(() => {
                  const mismatch =
                    (mode === "register" || (mode === "forgot" && forgotStep === "otp")) &&
                    (confirmPassword.length < 6 || confirmPassword !== password);
                  const isOtpStep = mode === "forgot" && forgotStep === "otp";
                  return (
                    <button
                      type="button"
                      onClick={submit}
                      disabled={loading || mismatch}
                      className="w-full flex items-center justify-center py-4 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-lg shadow-blue-500/30 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading
                        ? "অপেক্ষা করুন..."
                        : mode === "login"
                        ? "লগইন করুন"
                        : mode === "register"
                        ? "অ্যাকাউন্ট তৈরি করুন"
                        : isOtpStep
                        ? "পাসওয়ার্ড রিসেট করুন"
                        : "OTP পাঠান"}
                    </button>
                  );
                })()}

                {mode === "login" && (
                  <>

                    <div className="text-center pt-2">
                      <p className="text-[13px] text-slate-500">
                        অ্যাকাউন্ট নেই?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setMode("register");
                            setIdentifier("");
                            setPassword("");
                            setErrorMsg("");
                          }}
                          className="font-bold text-blue-600 hover:text-blue-700 hover:underline decoration-2 underline-offset-4 transition-colors"
                        >
                          রেজিস্টার করুন
                        </button>
                      </p>
                    </div>
                  </>
                )}
              </div>

              <p className="md:hidden text-center text-[11px] text-slate-500 mt-6 inline-flex w-full items-center justify-center gap-1">
                <ShieldCheck className="h-3 w-3" /> আপনার তথ্য সুরক্ষিত ও এনক্রিপ্টেড
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
