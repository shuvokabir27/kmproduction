import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const Login = () => {
  const { user, isAdmin, isClient, isProductAdmin, loading } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupName, setSignupName] = useState("");
  const [signupSubmitting, setSignupSubmitting] = useState(false);

  // OTP reset state (for member / client)
  const [resetIdent, setResetIdent] = useState("");
  const [resetStep, setResetStep] = useState<"ident" | "otp">("ident");
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPass, setResetNewPass] = useState("");
  const [resetConfirmPass, setResetConfirmPass] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetMaskedPhone, setResetMaskedPhone] = useState("");
  const [resetScope, setResetScope] = useState<"member" | "client">("member");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to={isAdmin ? "/admin" : isProductAdmin ? "/admin/products" : isClient ? "/client" : "/dashboard"} replace />;

  const getErrorMessage = (err: any): string => {
    const msg = err?.message?.toLowerCase() || "";
    if (msg.includes("invalid login") || msg.includes("invalid credentials") || msg.includes("wrong password"))
      return "আপনার পাসওয়ার্ড ভুল। সঠিক পাসওয়ার্ড দিয়ে চেষ্টা করুন।";
    if (msg.includes("email not confirmed"))
      return "আপনার ইমেইল ভেরিফাই করা হয়নি।";
    if (msg.includes("user not found") || msg.includes("no user"))
      return "এই তথ্যে কোনো অ্যাকাউন্ট পাওয়া যায়নি।";
    if (msg.includes("rate limit") || msg.includes("too many"))
      return "অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।";
    if (/[\u0980-\u09FF]/.test(err?.message || "")) return err.message;
    return "লগইন করা যায়নি। আবার চেষ্টা করুন।";
  };

  const detectType = (val: string): "member" | "client" | "admin" => {
    const trimmed = val.trim();
    // Pure digits and looks like member ID (5 digits starting with 2)
    if (/^\d{4,6}$/.test(trimmed) && trimmed.startsWith("2")) return "member";
    // Phone number pattern (starts with 0 or +)
    if (/^(\+?\d{10,15}|0\d{9,11})$/.test(trimmed)) return "client";
    // Email
    if (trimmed.includes("@")) return "admin";
    // Fallback: if all digits, try member
    if (/^\d+$/.test(trimmed)) return "member";
    return "admin";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    const type = detectType(identifier);

    try {
      if (type === "member") {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/member-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ member_id: identifier.trim(), password }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        const { error } = await supabase.auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token });
        if (error) throw error;
      } else if (type === "client") {
        // First try admin-phone-login (some admins log in by phone)
        const adminRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-phone-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: identifier.trim(), password }),
        });
        if (adminRes.ok) {
          const adminResult = await adminRes.json();
          const { error } = await supabase.auth.setSession({ access_token: adminResult.access_token, refresh_token: adminResult.refresh_token });
          if (error) throw error;
        } else if (adminRes.status === 401) {
          // Phone matched an admin but password was wrong — surface that error
          const adminResult = await adminRes.json();
          throw new Error(adminResult.error || "পাসওয়ার্ড ভুল");
        } else {
          // Not an admin phone — fall back to client login
          const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: identifier.trim(), password }),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error);
          const { error } = await supabase.auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token });
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: identifier.trim(), password });
        if (error) throw error;
      }
      toast.success("সফলভাবে লগইন হয়েছে!");
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const currentType = detectType(identifier);
  const placeholderHint = currentType === "member" ? "সদস্য আইডি" : currentType === "client" ? "মোবাইল নম্বর" : "ইমেইল";

  return (
    <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-[#0a0202]">
      {/* Dynamic background blobs */}
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-900/30 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-950/40 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[36rem] w-[36rem] rounded-full bg-red-900/15 blur-[160px]" />

      <div className="h-safe-top" />
      <div className="relative flex-1 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Main Login Card — cinematic glass */}
          <div className="relative w-full bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden">
            {/* Top decorative light */}
            <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

            {/* Brand identity */}
            <div className="flex flex-col items-center mb-8">
              <Link to="/" className="inline-block">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center mb-4 shadow-lg shadow-red-900/20 ring-1 ring-white/20"
                >
                  <img src="/favicon.png" alt="KM" className="h-10 w-10 rounded-lg object-contain drop-shadow" />
                </motion.div>
              </Link>
              <h1 className="text-3xl font-bold text-white tracking-wide mb-1">স্বাগতম</h1>
              <p className="text-red-400/80 text-xs font-medium tracking-widest uppercase">KM Production House</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Label htmlFor="identifier" className="block text-xs font-semibold text-gray-400 mb-2 ml-1 uppercase tracking-wider">
                  আইডি / মোবাইল / ইমেইল
                </Label>
                <Input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setErrorMsg(""); }}
                  placeholder="সদস্য আইডি, মোবাইল নম্বর বা ইমেইল"
                  required
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 h-12 text-white placeholder:text-gray-600 focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:border-red-500/50 transition-all duration-300"
                />
                {identifier.trim() && (
                  <p className="text-[10px] text-gray-500 mt-1.5 ml-1">
                    সনাক্ত হয়েছে: <span className="text-red-400 font-medium">{placeholderHint}</span>
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="password" className="block text-xs font-semibold text-gray-400 mb-2 ml-1 uppercase tracking-wider">
                  পাসওয়ার্ড
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 pr-12 h-12 text-white placeholder:text-gray-600 focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:border-red-500/50 transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/30"
                  >
                    <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-300 font-medium leading-snug">{errorMsg}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={submitting}
                className="w-full group relative flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-500 bg-red-600 rounded-xl overflow-hidden hover:bg-red-500 hover:shadow-[0_0_20px_rgba(220,38,38,0.5)] disabled:opacity-70"
              >
                <span className="relative z-10 text-base">
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      অপেক্ষা করুন
                    </span>
                  ) : "লগইন"}
                </span>
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>
            </form>

            <div className="mt-8 space-y-3 text-center">
              <button type="button" onClick={() => setIsSignup(true)} className="block w-full text-sm text-red-400 hover:text-red-300 transition-colors duration-300 font-medium">
                নতুন অ্যাকাউন্ট তৈরি করুন
              </button>
              <div className="w-8 h-px bg-white/10 mx-auto" />
              <Dialog open={resetOpen} onOpenChange={(open) => {
                setResetOpen(open);
                if (!open) {
                  setResetStep("ident"); setResetIdent(""); setResetOtp("");
                  setResetNewPass(""); setResetConfirmPass(""); setResetEmail("");
                  setShowResetPassword(false); setShowResetConfirm(false);
                }
              }}>
                <DialogTrigger asChild>
                  <button type="button" className="block w-full text-xs text-gray-500 hover:text-gray-300 transition-colors duration-300">
                    পাসওয়ার্ড ভুলে গেছেন?
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-base">পাসওয়ার্ড রিসেট</DialogTitle>
                  </DialogHeader>
                  {resetStep === "ident" ? (
                    <div className="space-y-3 pt-2">
                      <p className="text-xs text-muted-foreground">
                        আপনার <span className="text-foreground font-medium">সদস্য আইডি / মোবাইল নম্বর / ইমেইল</span> দিন।
                        সদস্য বা ক্লায়েন্ট হলে মোবাইলে OTP পাঠানো হবে। এডমিন হলে ইমেইলে লিংক যাবে।
                      </p>
                      <Input
                        type="text"
                        placeholder="সদস্য আইডি, মোবাইল বা ইমেইল"
                        value={resetIdent}
                        onChange={(e) => setResetIdent(e.target.value)}
                        className="bg-secondary border-border/30 h-10 text-sm"
                      />
                      <Button
                        className="w-full h-10 text-sm"
                        disabled={resetSending || !resetIdent.trim()}
                        onClick={async () => {
                          const trimmed = resetIdent.trim();
                          const type = detectType(trimmed);
                          setResetSending(true);
                          try {
                            if (type === "admin") {
                              // email reset link
                              const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
                                redirectTo: `${window.location.origin}/reset-password`,
                              });
                              if (error) throw error;
                              toast.success("রিসেট লিংক পাঠানো হয়েছে। ইমেইল চেক করুন।");
                              setResetOpen(false);
                            } else {
                              // member or client — OTP via SMS
                              const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/password-reset-otp`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "request_otp", scope: type, identifier: trimmed }),
                              });
                              const result = await res.json();
                              if (!res.ok) throw new Error(result.error || "OTP পাঠানো যায়নি");
                              setResetScope(type);
                              setResetMaskedPhone(result.masked_phone || "");
                              setResetStep("otp");
                              toast.success("OTP পাঠানো হয়েছে আপনার মোবাইলে");
                            }
                          } catch (err: any) {
                            toast.error(err.message || "চেষ্টা ব্যর্থ হয়েছে");
                          } finally {
                            setResetSending(false);
                          }
                        }}
                      >
                        {resetSending ? "পাঠানো হচ্ছে..." : "পরবর্তী"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2">
                      <p className="text-xs text-muted-foreground">
                        <span className="text-foreground font-medium">{resetMaskedPhone}</span> নম্বরে পাঠানো ৬ ডিজিটের OTP এবং নতুন পাসওয়ার্ড দিন।
                      </p>
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="৬ ডিজিটের OTP"
                        value={resetOtp}
                        onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ""))}
                        className="bg-secondary border-border/30 h-10 text-sm tracking-widest text-center"
                      />
                      <div className="relative">
                        <Input
                          type={showResetPassword ? "text" : "password"}
                          placeholder="নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)"
                          value={resetNewPass}
                          onChange={(e) => setResetNewPass(e.target.value)}
                          minLength={6}
                          className="bg-secondary border-border/30 h-10 text-sm pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                        >
                          {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          type={showResetConfirm ? "text" : "password"}
                          placeholder="পাসওয়ার্ড নিশ্চিত করুন"
                          value={resetConfirmPass}
                          onChange={(e) => setResetConfirmPass(e.target.value)}
                          minLength={6}
                          className="bg-secondary border-border/30 h-10 text-sm pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetConfirm((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                        >
                          {showResetConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {resetNewPass && resetConfirmPass && resetNewPass !== resetConfirmPass && (
                        <p className="text-xs text-destructive">পাসওয়ার্ড মিলছে না</p>
                      )}
                      <Button
                        className="w-full h-10 text-sm"
                        disabled={resetSending || resetOtp.length !== 6 || resetNewPass.length < 6 || resetNewPass !== resetConfirmPass}
                        onClick={async () => {
                          if (resetNewPass !== resetConfirmPass) {
                            toast.error("পাসওয়ার্ড মিলছে না!");
                            return;
                          }
                          setResetSending(true);
                          try {
                            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/password-reset-otp`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                action: "reset_with_otp",
                                scope: resetScope,
                                identifier: resetIdent.trim(),
                                otp: resetOtp,
                                new_password: resetNewPass,
                              }),
                            });
                            const result = await res.json();
                            if (!res.ok) throw new Error(result.error || "রিসেট ব্যর্থ");
                            toast.success("পাসওয়ার্ড রিসেট হয়েছে। এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।");
                            setResetOpen(false);
                          } catch (err: any) {
                            toast.error(err.message || "রিসেট ব্যর্থ হয়েছে");
                          } finally {
                            setResetSending(false);
                          }
                        }}
                      >
                        {resetSending ? "রিসেট হচ্ছে..." : "পাসওয়ার্ড রিসেট করুন"}
                      </Button>
                      <button
                        type="button"
                        onClick={() => { setResetStep("ident"); setResetOtp(""); setResetNewPass(""); setResetConfirmPass(""); setShowResetPassword(false); setShowResetConfirm(false); }}
                        className="block w-full text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        ← পিছনে যান
                      </button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            {/* Bottom accent */}
            <div className="pointer-events-none absolute bottom-0 right-0 w-16 h-16 bg-red-600/10 blur-xl rounded-full" />
          </div>


          {/* Signup Dialog */}
          <Dialog open={isSignup} onOpenChange={setIsSignup}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-base">নতুন অ্যাকাউন্ট তৈরি</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div>
                  <Label className="text-xs">নাম</Label>
                  <Input
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="আপনার নাম"
                    className="bg-secondary border-border/30 h-10 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">ইমেইল</Label>
                  <Input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="আপনার ইমেইল"
                    className="bg-secondary border-border/30 h-10 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">পাসওয়ার্ড</Label>
                  <div className="relative">
                    <Input
                      type={showSignupPassword ? "text" : "password"}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="কমপক্ষে ৬ অক্ষর"
                      minLength={6}
                      className="bg-secondary border-border/30 h-10 text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  className="w-full h-10 text-sm"
                  disabled={signupSubmitting || !signupEmail.trim() || !signupPassword.trim() || !signupName.trim()}
                  onClick={async () => {
                    setSignupSubmitting(true);
                    try {
                      const { error } = await supabase.auth.signUp({
                        email: signupEmail.trim(),
                        password: signupPassword,
                        options: {
                          data: { full_name: signupName.trim() },
                          emailRedirectTo: window.location.origin,
                        },
                      });
                      if (error) throw error;
                      toast.success("অ্যাকাউন্ট তৈরি হয়েছে! ইমেইল ভেরিফাই করুন।");
                      setIsSignup(false);
                      setSignupEmail("");
                      setSignupPassword("");
                      setSignupName("");
                    } catch (err: any) {
                      toast.error(err.message || "অ্যাকাউন্ট তৈরি করা যায়নি।");
                    } finally {
                      setSignupSubmitting(false);
                    }
                  }}
                >
                  {signupSubmitting ? "তৈরি হচ্ছে..." : "অ্যাকাউন্ট তৈরি করুন"}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  ইমেইলে ভেরিফিকেশন লিংক পাঠানো হবে
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
