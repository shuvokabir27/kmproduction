import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ShoppingBag,
  Lock,
  Phone,
  ArrowLeft,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Mail,
  ShieldCheck,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SHOP_TOKEN_KEY } from "@/hooks/useShopCustomer";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    "w-full h-12 pl-11 pr-4 rounded-full bg-blue-50/60 border border-blue-100 text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-all";

  const loginIdentifierIsEmail = isEmail(identifier);
  const loginIdentifierIsAdmin =
    loginIdentifierIsEmail || isAdminPhone(identifier);

  const headerTitle =
    mode === "login"
      ? "স্বাগতম"
      : mode === "register"
      ? "নতুন অ্যাকাউন্ট"
      : "পাসওয়ার্ড রিসেট";
  const headerSub =
    mode === "login"
      ? "আপনার অ্যাকাউন্টে লগইন করে চালিয়ে যান"
      : mode === "register"
      ? "কয়েক সেকেন্ডে অ্যাকাউন্ট তৈরি করুন"
      : forgotStep === "phone"
      ? "মোবাইল নম্বর দিন, OTP পাঠাবো"
      : "OTP ও নতুন পাসওয়ার্ড দিন";

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-8 bg-slate-100"
      style={{ fontFamily: "'Hind Siliguri', 'Tiro Bangla', sans-serif" }}
    >
      <div className="relative w-full max-w-4xl">
        <Link
          to="/"
          className="text-slate-600 hover:text-slate-900 text-sm inline-flex items-center gap-1 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> দোকানে ফিরুন
        </Link>

        {/* Split card */}
        <div className="relative w-full bg-white rounded-[28px] shadow-xl overflow-hidden grid md:grid-cols-2">
          {/* LEFT — green welcome panel with curved cutout */}
          <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 text-white p-8 md:p-10 min-h-[220px] md:min-h-[560px] flex flex-col">
            {/* curved white cutout (desktop right edge, mobile bottom) */}
            <div className="hidden md:block absolute -right-24 top-1/2 -translate-y-1/2 w-64 h-[140%] bg-white rounded-full" />
            <div className="md:hidden absolute -bottom-24 left-1/2 -translate-x-1/2 w-[140%] h-48 bg-white rounded-[50%]" />

            <div className="relative z-10 flex flex-col h-full">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-6 ring-1 ring-white/30">
                <ShoppingBag className="h-7 w-7 text-white" />
              </div>
              <div className="text-[11px] font-bold tracking-[0.2em] uppercase opacity-80 mb-2">কে এম শপ</div>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-3">
                আবার স্বাগতম!
              </h2>
              <p className="text-[13.5px] leading-relaxed text-blue-50/90 max-w-[260px]">
                আমাদের সাথে যুক্ত থাকতে অনুগ্রহ করে আপনার অ্যাকাউন্টে লগইন করুন।
              </p>

              <div className="mt-auto hidden md:flex items-center gap-2 text-[11.5px] text-blue-50/80 pt-8">
                <ShieldCheck className="h-3.5 w-3.5" /> আপনার তথ্য সুরক্ষিত ও এনক্রিপ্টেড
              </div>
            </div>
          </div>

          {/* RIGHT — form panel */}
          <div className="relative p-6 md:p-10">
          <div className="text-center md:text-left mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              {headerTitle}
            </h1>
            <p className="text-[13px] text-slate-500 mt-1">{headerSub}</p>
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
            <div className="mb-5 rounded-xl bg-emerald-50 border border-emerald-100 px-3.5 py-3 text-[12.5px] leading-relaxed text-slate-700 flex gap-2.5">
              <Info className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <span>
                <span className="font-semibold text-slate-900">গুরুত্বপূর্ণ:</span> পূর্বের অর্ডার করা মোবাইল নম্বরটি দিয়ে রেজিস্ট্রেশন করুন — আগের সব অর্ডার এক জায়গায় দেখতে পাবেন।
              </span>
            </div>
          )}

          <div className="space-y-4">
            {mode === "register" && (
              <div>
                <Label className="block text-[12px] font-semibold text-slate-700 ml-0.5 mb-1.5">
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
              <div>
                <Label className="block text-[12px] font-semibold text-slate-700 ml-0.5 mb-1.5">
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
                  <p className="text-[11px] text-emerald-700 font-medium mt-1.5 ml-0.5 inline-flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> অ্যাডমিন লগইন সনাক্ত হয়েছে
                  </p>
                )}
              </div>
            ) : (
              <div>
                <Label className="block text-[12px] font-semibold text-slate-700 ml-0.5 mb-1.5">
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
              <div>
                <Label className="block text-[12px] font-semibold text-slate-700 ml-0.5 mb-1.5">
                  ৬-ডিজিট OTP কোড
                </Label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="● ● ● ● ● ●"
                  className="w-full h-12 px-4 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all tracking-[0.5em] text-center font-bold text-lg"
                  autoFocus
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[11px] text-slate-500">SMS এ পাঠানো কোড দিন</p>
                  <button
                    type="button"
                    onClick={requestOtp}
                    disabled={resendIn > 0 || loading}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    {resendIn > 0 ? `পুনরায় (${resendIn}s)` : "পুনরায় পাঠান"}
                  </button>
                </div>
              </div>
            )}

            {/* Password */}
            {(mode !== "forgot" || forgotStep === "otp") && (
              <>
                <div>
                  <Label className="block text-[12px] font-semibold text-slate-700 ml-0.5 mb-1.5">
                    {mode === "forgot" ? "নতুন পাসওয়ার্ড" : "পাসওয়ার্ড"}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
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
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {mode === "login" && (
                    <div className="text-right mt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setMode("forgot");
                          resetForgot();
                        }}
                        className="text-[12px] font-medium text-slate-500 hover:text-slate-800 bg-transparent"
                      >
                        পাসওয়ার্ড ভুলে গেছেন?
                      </button>
                    </div>
                  )}
                </div>

                {(mode === "register" || mode === "forgot") && (
                  <div>
                    <Label className="block text-[12px] font-semibold text-slate-700 ml-0.5 mb-1.5">
                      পাসওয়ার্ড নিশ্চিত করুন
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        inputMode="numeric"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value.replace(/\D/g, ""))}
                        placeholder="••••••"
                        className={inputBase}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
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
                  className="text-[12px] font-medium text-slate-500 hover:text-slate-900"
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
                  className="w-full flex items-center justify-center px-8 h-12 mt-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="pt-1 space-y-2">
                <p className="text-center text-[13px] text-slate-500">নতুন অ্যাকাউন্ট?</p>
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    resetForgot();
                  }}
                  className="w-full h-11 rounded-md border-2 border-emerald-600 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors rounded-full"
                >
                  রেজিস্টার করুন
                </button>
              </div>
            )}
          </div>

          <p className="md:hidden text-center text-[11px] text-slate-500 mt-5 inline-flex w-full items-center justify-center gap-1">
            <ShieldCheck className="h-3 w-3" /> আপনার তথ্য সুরক্ষিত ও এনক্রিপ্টেড
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}
