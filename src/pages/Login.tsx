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
import { AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const Login = () => {
  const { user, isAdmin, isClient, isProductAdmin, loading } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupSubmitting, setSignupSubmitting] = useState(false);

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
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/client-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: identifier.trim(), password }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        const { error } = await supabase.auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token });
        if (error) throw error;
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
    <div
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{
        backgroundImage: [
          "radial-gradient(70% 50% at 0% 0%, hsl(0 80% 25% / 0.65), transparent 60%)",
          "radial-gradient(60% 50% at 100% 10%, hsl(350 70% 30% / 0.55), transparent 60%)",
          "radial-gradient(80% 60% at 50% 100%, hsl(0 85% 18% / 0.65), transparent 65%)",
          "linear-gradient(160deg, #1a0608 0%, #2a0a10 35%, #0d0405 70%, #1f0709 100%)",
        ].join(", "),
      }}
    >
      {/* ambient blobs */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-red-600/25 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-rose-700/25 blur-[140px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[36rem] w-[36rem] rounded-full bg-red-900/15 blur-[160px]" />
      {/* gold hairline at top */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />

      <div className="h-safe-top" />
      <div className="relative flex-1 flex flex-col items-center justify-center p-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Logo & Brand */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="relative h-16 w-16 mx-auto mb-3 rounded-2xl flex items-center justify-center shadow-[0_15px_40px_-10px_rgba(220,38,38,0.55)] ring-1 ring-white/15"
                style={{ background: "linear-gradient(140deg, #b91c1c, #4c0519)" }}
              >
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-amber-300/50 via-rose-400/40 to-red-700/60 blur-md opacity-80 -z-10" />
                <img src="/favicon.png" alt="KM" className="h-10 w-10 rounded-lg object-contain drop-shadow" />
              </motion.div>
            </Link>
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-amber-200 via-rose-100 to-amber-200 bg-clip-text text-transparent drop-shadow">স্বাগতম</h1>
            <p className="text-white/60 text-xs mt-1 tracking-wide">KM Production House</p>
          </div>

          {/* Unified Login Card — gradient ring + dark glass */}
          <div
            className="rounded-[26px] p-[1.5px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]"
            style={{ background: "linear-gradient(140deg, #fbbf24, rgba(255,255,255,0.25) 35%, #b91c1c 70%, #4c0519)" }}
          >
            <Card className="relative p-5 rounded-[24px] border-0 bg-[linear-gradient(160deg,rgba(35,8,12,0.92),rgba(15,4,6,0.95))] backdrop-blur-xl overflow-hidden text-white">
              {/* top sheen */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/10 to-transparent" />
              <div className="pointer-events-none absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="identifier" className="text-white/80 text-xs">আইডি / মোবাইল / ইমেইল</Label>
                <Input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setErrorMsg(""); }}
                  placeholder="সদস্য আইডি, মোবাইল নম্বর বা ইমেইল"
                  required
                  className="bg-white/[0.06] border-white/15 h-11 text-base text-white placeholder:text-white/40 focus-visible:ring-red-400/50"
                />
                {identifier.trim() && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    সনাক্ত হয়েছে: <span className="text-primary font-medium">{placeholderHint}</span>
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="password" className="text-white/80 text-xs">পাসওয়ার্ড</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="bg-white/[0.06] border-white/15 h-11 text-base text-white placeholder:text-white/40 focus-visible:ring-red-400/50"
                />
              </div>

              <AnimatePresence>
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                  >
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-sm text-destructive font-medium leading-snug">{errorMsg}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={submitting}>
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    অপেক্ষা করুন
                  </span>
                ) : "লগইন"}
              </Button>

              <div className="text-center text-xs text-muted-foreground mt-3 space-y-2">
                <button type="button" className="text-primary hover:underline" onClick={() => setIsSignup(true)}>
                  নতুন অ্যাকাউন্ট তৈরি করুন
                </button>
                <br />
                <Dialog open={resetOpen} onOpenChange={setResetOpen}>
                  <DialogTrigger asChild>
                    <button type="button" className="text-primary hover:underline">পাসওয়ার্ড ভুলে গেছেন?</button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle className="text-base">পাসওয়ার্ড রিসেট</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                      <p className="text-xs text-muted-foreground">
                        আপনার ইমেইল দিন — রিসেট লিংক পাঠানো হবে। অথবা এডমিনের সাথে যোগাযোগ করুন।
                      </p>
                      <Input
                        type="email"
                        placeholder="আপনার ইমেইল"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="bg-secondary border-border/30 h-10 text-sm"
                      />
                      <Button
                        className="w-full h-10 text-sm"
                        disabled={resetSending || !resetEmail.trim()}
                        onClick={async () => {
                          setResetSending(true);
                          try {
                            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
                              redirectTo: `${window.location.origin}/reset-password`,
                            });
                            if (error) throw error;
                            toast.success("রিসেট লিংক পাঠানো হয়েছে। ইমেইল চেক করুন।");
                            setResetOpen(false);
                            setResetEmail("");
                          } catch (err: any) {
                            toast.error(err.message || "লিংক পাঠানো যায়নি।");
                          } finally {
                            setResetSending(false);
                          }
                        }}
                      >
                        {resetSending ? "পাঠানো হচ্ছে..." : "রিসেট লিংক পাঠান"}
                      </Button>
                      <p className="text-[10px] text-muted-foreground text-center">
                        অথবা <span className="text-primary">এডমিনের সাথে যোগাযোগ করুন।</span>
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </form>
          </Card>
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
                  <Input
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="কমপক্ষে ৬ অক্ষর"
                    minLength={6}
                    className="bg-secondary border-border/30 h-10 text-sm"
                  />
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
