import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Wifi } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function OnlineUsersBar() {
  const { user } = useAuth();

  const { data: onlineUsers = [] } = useQuery({
    queryKey: ["online-users-bar"],
    queryFn: async () => {
      const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data } = await (supabase as any).rpc("get_profiles_safe");
      return ((data as any[]) || [])
        .filter((p) => p.last_seen_at && p.last_seen_at > twoMinAgo && p.is_active)
        .map((p) => ({
          id: p.id,
          user_id: p.user_id,
          name: p.full_name || "সদস্য",
          photo: p.photo_url,
        }));
    },
    refetchInterval: 20000,
  });

  if (!user || onlineUsers.length === 0) return null;

  // Duplicate list for seamless infinite scroll if multiple
  const shouldAnimate = onlineUsers.length > 1;
  const items = shouldAnimate ? [...onlineUsers, ...onlineUsers] : onlineUsers;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative border-b border-border/30 bg-gradient-to-r from-emerald-500/8 via-card/60 to-emerald-500/8 backdrop-blur-xl overflow-hidden"
    >
      {/* Glossy top sheen */}
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
      {/* Edge fade gradients */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      <div className="relative flex items-center h-9 md:h-10">
        {/* Label */}
        <div className="shrink-0 flex items-center gap-1.5 pl-3 md:pl-4 pr-3 z-20 bg-gradient-to-r from-background via-background to-transparent">
          <div className="relative">
            <Wifi className="h-3.5 w-3.5 text-emerald-400" />
            <motion.span
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400"
            />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </div>
          <span className="text-[10px] md:text-xs font-semibold text-emerald-400 hidden sm:inline">অনলাইন</span>
          <span className="text-[10px] md:text-xs font-bold text-foreground bg-emerald-500/15 border border-emerald-500/25 rounded-full px-1.5 py-0.5">
            {onlineUsers.length.toLocaleString("bn-BD")}
          </span>
        </div>

        {/* Marquee */}
        <div className="flex-1 overflow-hidden">
          <motion.div
            className="flex items-center gap-2 whitespace-nowrap"
            animate={shouldAnimate ? { x: ["0%", "-50%"] } : undefined}
            transition={
              shouldAnimate
                ? { duration: Math.max(15, onlineUsers.length * 5), ease: "linear", repeat: Infinity }
                : undefined
            }
          >
            {items.map((u, i) => (
              <div
                key={`${u.id}-${i}`}
                className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-full
                  bg-gradient-to-br from-emerald-500/10 to-emerald-500/5
                  border border-emerald-500/20
                  shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]
                  hover:from-emerald-500/20 hover:to-emerald-500/10 transition-colors"
              >
                <div className="relative shrink-0">
                  {u.photo ? (
                    <img
                      src={u.photo}
                      alt={u.name}
                      className="h-5 w-5 rounded-full object-cover border border-emerald-500/30"
                    />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[9px] font-bold text-emerald-300">
                      {u.name.charAt(0)}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 border border-background shadow-[0_0_4px_rgba(52,211,153,0.9)]" />
                </div>
                <span className="text-[10px] md:text-xs font-medium text-foreground/90 max-w-[100px] truncate">
                  {u.name}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
