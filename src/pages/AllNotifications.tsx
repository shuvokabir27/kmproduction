import { useEffect } from "react";
import { Bell, Film, CreditCard, Calendar, ScrollText, Megaphone, CheckCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";
import { AppLayout } from "@/components/AppLayout";

const typeIcons: Record<string, typeof Film> = {
  shooting: Film,
  payment: CreditCard,
  attendance: Calendar,
  script: ScrollText,
  notice: Megaphone,
};

const typeColors: Record<string, string> = {
  shooting: "bg-primary/10 text-primary",
  payment: "bg-success/10 text-success",
  attendance: "bg-warning/10 text-warning",
  script: "bg-accent/50 text-accent-foreground",
  notice: "bg-destructive/10 text-destructive",
};

export default function AllNotifications() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ["all-notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0;

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true } as any).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["all-notifications", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true } as any).eq("user_id", user.id).eq("is_read", false);
    queryClient.invalidateQueries({ queryKey: ["all-notifications", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
  };

  const handleClick = (n: any) => {
    markAsRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground">সকল নটিফিকেশন</h1>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs gap-1">
              <CheckCheck className="h-3.5 w-3.5" /> সব পড়া হয়েছে
            </Button>
          )}
        </div>

        <div className="bg-card border border-border/30 rounded-xl overflow-hidden divide-y divide-border/10">
          {(!notifications || notifications.length === 0) && (
            <div className="p-12 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">কোনো নটিফিকেশন নেই</p>
            </div>
          )}
          {notifications?.map((n: any) => {
            const Icon = typeIcons[n.type] || Bell;
            const colorClass = typeColors[n.type] || "bg-secondary text-muted-foreground";
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left px-4 py-3 hover:bg-secondary/30 transition-colors flex items-start gap-3 ${
                  !n.is_read ? "bg-primary/[0.03]" : ""
                }`}
              >
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${!n.is_read ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground/60 mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: bn })}
                  </p>
                </div>
                {!n.is_read && (
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
