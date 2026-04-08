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
  const { user, isAdmin, isClient, loading } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to={isAdmin ? "/admin" : isClient ? "/client" : "/dashboard"} replace />;

  const getErrorMessage = (err: any): string => {
    const msg = err?.message?.toLowerCase() || "";
    if (msg.includes("invalid login") || msg.includes("invalid credentials") || msg.includes("wrong password"))
      return "আইডি অথবা পাসওয়ার্ড ভুল হয়েছে। আবার চেষ্টা করুন।";
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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-safe-top" />
      <div className="flex-1 flex flex-col items-center justify-center p-5">
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
                className="h-16 w-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10"
              >
                <img src="/favicon.png" alt="KM" className="h-10 w-10 rounded-lg object-contain" />
              </motion.div>
            </Link>
            <h1 className="text-xl font-bold text-foreground">স্বাগতম</h1>
            <p className="text-muted-foreground text-xs mt-1">KM Production House</p>
          </div>

          {/* Unified Login Card */}
          <Card className="p-5 bg-card border-border/30 shadow-xl shadow-primary/5">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="identifier" className="text-foreground text-xs">আইডি / মোবাইল / ইমেইল</Label>
                <Input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setErrorMsg(""); }}
                  placeholder="সদস্য আইডি, মোবাইল নম্বর বা ইমেইল"
                  required
                  className="bg-secondary border-border/30 h-11 text-base"
                />
                {identifier.trim() && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    সনাক্ত হয়েছে: <span className="text-primary font-medium">{placeholderHint}</span>
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="password" className="text-foreground text-xs">পাসওয়ার্ড</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="bg-secondary border-border/30 h-11 text-base"
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

              <div className="text-center text-xs text-muted-foreground mt-3 space-y-1">
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
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
