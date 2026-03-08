import { useState, useEffect } from "react";
import { Bell, Film, CreditCard, Calendar, ScrollText, CheckCheck, Megaphone, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";
import { toast } from "sonner";

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

// Map notification type to the relevant page/section
const typeRoutes: Record<string, string> = {
  payment: "/dashboard#payments",
  attendance: "/dashboard#attendance",
  shooting: "/dashboard#shootings",
  script: "/scripts",
  notice: "/dashboard",
};

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailNotification, setDetailNotification] = useState<any>(null);

  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    refetchInterval: 30000,
  });

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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["all-notifications", user?.id] });
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true } as any).eq("id", id);
    invalidate();
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true } as any).eq("user_id", user.id).eq("is_read", false);
    invalidate();
  };

  const deleteOne = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await supabase.from("notifications").delete().eq("id", id);
    if (expandedId === id) setExpandedId(null);
    invalidate();
    toast.success("নটিফিকেশন মুছে ফেলা হয়েছে");
  };

  const handleClick = (n: any) => {
    markAsRead(n.id);
    setExpandedId(prev => prev === n.id ? null : n.id);
  };

  const handleNavigate = (n: any) => {
    // For payment, attendance, shooting — show popup detail
    const popupTypes = ["payment", "attendance", "shooting"];
    if (popupTypes.includes(n.type)) {
      setDetailNotification(n);
      return;
    }
    // For notice — use link; for script — go to scripts page
    const route = n.link || typeRoutes[n.type] || "/dashboard";
    setOpen(false);
    setExpandedId(null);
    navigate(route);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-foreground h-8 w-8 relative"
        onClick={() => { setOpen(!open); setExpandedId(null); }}
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
              onClick={() => { setOpen(false); setExpandedId(null); }}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="absolute right-0 top-10 z-50 w-80 max-h-[70vh] bg-card border border-border/30 rounded-xl shadow-2xl shadow-black/20 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/20 shrink-0">
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
              <div className="overflow-y-auto flex-1 divide-y divide-border/10">
                {(!notifications || notifications.length === 0) && (
                  <div className="p-8 text-center">
                    <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">কোনো নটিফিকেশন নেই</p>
                  </div>
                )}
                {notifications?.map((n: any, i: number) => {
                  const Icon = typeIcons[n.type] || Bell;
                  const colorClass = typeColors[n.type] || "bg-secondary text-muted-foreground";
                  const isExpanded = expandedId === n.id;
                  return (
                    <div key={n.id}>
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors cursor-pointer ${
                          !n.is_read ? "bg-primary/[0.03]" : ""
                        }`}
                        onClick={() => handleClick(n)}
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
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
                            <p className="text-[10px] text-muted-foreground/60 mt-1">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: bn })}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                          {!n.is_read && (
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          )}
                          <button
                            onClick={(e) => deleteOne(e, n.id)}
                            className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="মুছুন"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </motion.div>

                      {/* Expanded detail */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-3 pt-0 ml-11 space-y-1.5">
                              {n.message && (
                                <p className="text-xs text-foreground/80">{n.message}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${typeColors[n.type]?.split(" ")[0] || "bg-secondary"}`} />
                                  {typeLabels[n.type] || n.type}
                                </span>
                                <span>{format(new Date(n.created_at), "dd MMM yyyy, hh:mm a", { locale: bn })}</span>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleNavigate(n); }}
                                className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 font-medium mt-0.5"
                              >
                                <ExternalLink className="h-3 w-3" /> বিস্তারিত দেখুন
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="border-t border-border/20 px-4 py-2.5 shrink-0">
                <button
                  onClick={() => { navigate("/notifications"); setOpen(false); setExpandedId(null); }}
                  className="w-full text-center text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  সকল নটিফিকেশন দেখুন
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Detail Popup for payment/attendance/shooting */}
      <Dialog open={!!detailNotification} onOpenChange={(o) => !o && setDetailNotification(null)}>
        <DialogContent className="bg-card border-border/50 max-w-sm">
          {detailNotification && (() => {
            const n = detailNotification;
            const Icon = typeIcons[n.type] || Bell;
            const colorClass = typeColors[n.type] || "bg-secondary text-muted-foreground";
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-foreground flex items-center gap-2 text-base">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {typeLabels[n.type] || "নটিফিকেশন"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-1">
                  <div className="rounded-lg bg-secondary/50 border border-border/30 p-3 space-y-2">
                    <p className="text-sm font-semibold text-foreground">{n.title}</p>
                    {n.message && (
                      <p className="text-sm text-foreground/80">{n.message}</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(n.created_at), "dd MMMM yyyy, hh:mm a", { locale: bn })}
                  </p>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
