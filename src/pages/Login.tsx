import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";

const Login = () => {
  const { user, isAdmin, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;

  const getErrorMessage = (err: any): string => {
    const msg = err?.message?.toLowerCase() || "";
    if (msg.includes("invalid login") || msg.includes("invalid credentials") || msg.includes("wrong password"))
      return "ইমেইল অথবা পাসওয়ার্ড ভুল হয়েছে। আবার চেষ্টা করুন।";
    if (msg.includes("email not confirmed"))
      return "আপনার ইমেইল ভেরিফাই করা হয়নি।";
    if (msg.includes("user not found") || msg.includes("no user"))
      return "এই তথ্যে কোনো অ্যাকাউন্ট পাওয়া যায়নি।";
    if (msg.includes("rate limit") || msg.includes("too many"))
      return "অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।";
    return err?.message || "লগইন করা যায়নি। আবার চেষ্টা করুন।";
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("সফলভাবে লগইন হয়েছে!");
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/member-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId, password: memberPassword }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const { error } = await supabase.auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token });
      if (error) throw error;
      toast.success("সফলভাবে লগইন হয়েছে!");
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Status bar spacer for mobile */}
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

          {/* Login Card */}
          <Card className="p-5 bg-card border-border/30 shadow-xl shadow-primary/5">
            <Tabs defaultValue="member" className="w-full" onValueChange={() => setErrorMsg("")}>
              <TabsList className="w-full bg-secondary/50 border border-border/20 mb-5 h-10">
                <TabsTrigger value="member" className="flex-1 text-xs font-medium">সদস্য</TabsTrigger>
                <TabsTrigger value="admin" className="flex-1 text-xs font-medium">এডমিন</TabsTrigger>
              </TabsList>

              <TabsContent value="member">
                <form onSubmit={handleMemberLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="member-id" className="text-foreground text-xs">সদস্য আইডি</Label>
                    <Input
                      id="member-id"
                      type="number"
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      placeholder="যেমন: 20201"
                      required
                      className="bg-secondary border-border/30 h-11 text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="member-password" className="text-foreground text-xs">পাসওয়ার্ড</Label>
                    <Input
                      id="member-password"
                      type="password"
                      value={memberPassword}
                      onChange={(e) => setMemberPassword(e.target.value)}
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
                </form>
              </TabsContent>

              <TabsContent value="admin">
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="admin-email" className="text-foreground text-xs">ইমেইল</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      required
                      className="bg-secondary border-border/30 h-11 text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin-password" className="text-foreground text-xs">পাসওয়ার্ড</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="bg-secondary border-border/30 h-11 text-base"
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={submitting}>
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        অপেক্ষা করুন
                      </span>
                    ) : "লগইন"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
