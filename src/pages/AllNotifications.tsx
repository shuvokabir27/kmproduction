import { useEffect, useState } from "react";
import { Bell, Film, CreditCard, Calendar, ScrollText, Megaphone, CheckCheck, ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";
import { AppLayout } from "@/components/AppLayout";
import { motion, AnimatePresence } from "framer-motion";

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

const typeLabels: Record<string, string> = {
  shooting: "শুটিং",
  payment: "পেমেন্ট",
  attendance: "হাজিরা",
  script: "স্ক্রিপ্ট",
  notice: "নোটিশ",
};

export default function AllNotifications() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    setExpandedId(prev => prev === n.id ? null : n.id);
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
            const isExpanded = expandedId === n.id;
            return (
              <div key={n.id}>
                <button
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
                    {!isExpanded && n.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.message}</p>
                    )}
                    {!isExpanded && (
                      <p className="text-[11px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: bn })}
                      </p>
                    )}
                  </div>
                  {!n.is_read && (
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 pt-0 ml-12 space-y-2">
                        {n.message && (
                          <p className="text-sm text-foreground/80">{n.message}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <span className={`inline-block h-2 w-2 rounded-full ${typeColors[n.type]?.split(" ")[0] || "bg-secondary"}`} />
                            {typeLabels[n.type] || n.type}
                          </span>
                          <span>{format(new Date(n.created_at), "dd MMM yyyy, hh:mm a", { locale: bn })}</span>
                        </div>
                        {n.link && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 gap-1 mt-1"
                            onClick={(e) => { e.stopPropagation(); navigate(n.link); }}
                          >
                            <ExternalLink className="h-3 w-3" /> বিস্তারিত দেখুন
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
