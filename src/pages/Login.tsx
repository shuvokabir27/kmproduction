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

const Login = () => {
  const { user, isAdmin, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Member login state
  const [memberId, setMemberId] = useState("");
  const [memberPassword, setMemberPassword] = useState("");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">লোড হচ্ছে...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("সফলভাবে লগইন হয়েছে!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/member-login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ member_id: memberId, password: memberPassword }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      // Set the session from the tokens returned
      const { error } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });
      if (error) throw error;
      toast.success("সফলভাবে লগইন হয়েছে!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold">TF</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">লগইন করুন</h1>
          <p className="text-muted-foreground text-sm mt-1">TeamFlow-এ স্বাগতম</p>
        </div>

        <Card className="p-6 bg-card border-border/50">
          <Tabs defaultValue="member" className="w-full">
            <TabsList className="w-full bg-secondary/50 border border-border/30 mb-4">
              <TabsTrigger value="member" className="flex-1 text-sm">সদস্য লগইন</TabsTrigger>
              <TabsTrigger value="admin" className="flex-1 text-sm">এডমিন লগইন</TabsTrigger>
            </TabsList>

            <TabsContent value="member">
              <form onSubmit={handleMemberLogin} className="space-y-4">
                <div>
                  <Label htmlFor="member-id" className="text-foreground">সদস্য আইডি</Label>
                  <Input
                    id="member-id"
                    type="number"
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    placeholder="যেমন: 20201"
                    required
                    className="bg-secondary border-border/50"
                  />
                </div>
                <div>
                  <Label htmlFor="member-password" className="text-foreground">পাসওয়ার্ড</Label>
                  <Input
                    id="member-password"
                    type="password"
                    value={memberPassword}
                    onChange={(e) => setMemberPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="bg-secondary border-border/50"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "অপেক্ষা করুন..." : "লগইন"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="admin">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <Label htmlFor="admin-email" className="text-foreground">ইমেইল</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    required
                    className="bg-secondary border-border/50"
                  />
                </div>
                <div>
                  <Label htmlFor="admin-password" className="text-foreground">পাসওয়ার্ড</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="bg-secondary border-border/50"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "অপেক্ষা করুন..." : "লগইন"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Login;
