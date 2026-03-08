import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, Eye } from "lucide-react";
import { Link } from "react-router-dom";

const AdminMembers = () => {
  const { user, isAdmin, loading } = useAuth();

  const { data: members } = useQuery({
    queryKey: ["admin-members"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("member_id");
      return data ?? [];
    },
  });

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" /> সদস্য ম্যানেজমেন্ট
            </h1>
            <p className="text-muted-foreground text-sm">{members?.length || 0} জন সদস্য</p>
          </div>
        </div>

        <Card className="bg-card border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left p-3 text-muted-foreground font-medium">আইডি</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">নাম</th>
                  <th className="text-left p-3 text-muted-foreground font-medium hidden sm:table-cell">পদবী</th>
                  <th className="text-left p-3 text-muted-foreground font-medium hidden md:table-cell">ফোন</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">স্ট্যাটাস</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {members?.map((m) => (
                  <tr key={m.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="p-3 text-foreground font-mono text-xs">{m.member_id}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center">
                          <span className="text-primary text-xs font-medium">{m.full_name.charAt(0)}</span>
                        </div>
                        <span className="text-foreground">{m.full_name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground hidden sm:table-cell">{m.designation || "—"}</td>
                    <td className="p-3 text-muted-foreground hidden md:table-cell">{m.phone || "—"}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${m.is_active ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                        {m.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Link to={`/member/${m.member_id}`}>
                        <Button variant="ghost" size="sm" className="text-muted-foreground">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AdminMembers;
