import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import logoAsset from "@/assets/kuakata-multimedia-logo.png.asset.json";

const Login = () => {
  const { user, isProductAdmin, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resetSending, setResetSending] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (user && isProductAdmin) return <Navigate to="/admin/products" replace />;
  if (user) return <Navigate to="/" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      toast.success("লগইন সফল");
    } catch (err: any) {
      const msg = err?.message?.toLowerCase() || "";
      if (msg.includes("invalid")) setErrorMsg("ইমেইল বা পাসওয়ার্ড ভুল।");
      else setErrorMsg(err?.message || "লগইন করা যায়নি।");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim()) {
      toast.error("ইমেইল লিখুন");
      return;
    }
    setResetSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("রিসেট লিংক ইমেইলে পাঠানো হয়েছে।");
    } catch (err: any) {
      toast.error(err?.message || "পাঠানো যায়নি");
    } finally {
      setResetSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <div className="flex flex-col items-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <ShoppingBag className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold">KM Shop Admin</h1>
            <p className="text-xs text-muted-foreground mt-1">শপ ম্যানেজ করতে লগইন করুন</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">ইমেইল</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }}
                placeholder="admin@example.com"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">পাসওয়ার্ড</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{errorMsg}</p>
              </div>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "অপেক্ষা করুন..." : "লগইন"}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleReset}
              disabled={resetSending}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              পাসওয়ার্ড ভুলে গেছেন?
            </button>
            <Link to="/" className="text-primary hover:underline">শপে ফিরে যান</Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          কাস্টমার? <Link to="/shop/login" className="text-primary hover:underline">এখানে লগইন করুন</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
