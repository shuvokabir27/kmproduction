import { useState, useEffect } from "react";
import { Bell, Film, CreditCard, Calendar, ScrollText, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";

const typeIcons: Record<string, typeof Film> = {
  shooting: Film,
  payment: CreditCard,
  attendance: Calendar,
  script: ScrollText,
};

const typeColors: Record<string, string> = {
  shooting: "bg-primary/10 text-primary",
  payment: "bg-success/10 text-success",
  attendance: "bg-warning/10 text-warning",
  script: "bg-accent/50 text-accent-foreground",
};

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
    refetchInterval: 30000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0;

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true } as any).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true } as any).eq("user_id", user.id).eq("is_read", false);
    queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
  };

  const handleClick = (n: any) => {
    markAsRead(n.id);
    if (n.link) navigate(n.link);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground h-8 w-8 relative"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="absolute right-0 top-10 z-50 w-80 max-h-[70vh] bg-card border border-border/30 rounded-xl shadow-2xl shadow-black/20 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
                <h3 className="text-sm font-semibold text-foreground">নটিফিকেশন</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                  >
                    <CheckCheck className="h-3 w-3" /> সব পড়া হয়েছে
                  </button>
                )}
              </div>

              {/* List */}
              <div className="overflow-y-auto max-h-[calc(70vh-48px)] divide-y divide-border/10">
                {(!notifications || notifications.length === 0) && (
                  <div className="p-8 text-center">
                    <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">কোনো নটিফিকেশন নেই</p>
                  </div>
                )}
                {notifications?.map((n: any, i: number) => {
                  const Icon = typeIcons[n.type] || Bell;
                  const colorClass = typeColors[n.type] || "bg-secondary text-muted-foreground";
                  return (
                    <motion.button
                      key={n.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => handleClick(n)}
                      className={`w-full text-left px-4 py-3 hover:bg-secondary/30 transition-colors flex items-start gap-3 ${
                        !n.is_read ? "bg-primary/[0.03]" : ""
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${!n.is_read ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                          {n.title}
                        </p>
                        {n.message && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.message}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: bn })}
                        </p>
                      </div>
                      {!n.is_read && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
