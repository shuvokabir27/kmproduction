import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Wifi } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  variant?: "bar" | "inline";
}

export function OnlineUsersBar({ variant = "bar" }: Props) {
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

  const shouldAnimate = onlineUsers.length > 1;
  const items = shouldAnimate ? [...onlineUsers, ...onlineUsers] : onlineUsers;

  // Inline premium colorful pill (for placing next to a heading)
  if (variant === "inline") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="relative inline-block max-w-full"
      >
        {/* Animated rainbow gradient border */}
        <motion.div
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-[1.5px] rounded-full opacity-90 blur-[1px]"
          style={{
            background: "linear-gradient(90deg, #f43f5e, #f59e0b, #10b981, #06b6d4, #8b5cf6, #ec4899, #f43f5e)",
            backgroundSize: "300% 100%",
          }}
        />

        <div className="relative inline-flex items-center gap-2 max-w-full overflow-hidden rounded-full
          bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-slate-950/95
          backdrop-blur-md
          shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_4px_16px_-4px_rgba(0,0,0,0.5)]
          pl-2.5 pr-1.5 py-1">
          {/* Glossy top sheen */}
          <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/12 to-transparent pointer-events-none" />
          {/* Animated rainbow shimmer sweep */}
          <motion.div
            animate={{ x: ["-150%", "250%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-y-1 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 pointer-events-none"
          />

          {/* Live label with glowing pulse */}
          <div className="relative shrink-0 flex items-center gap-1.5 z-10">
            <div className="relative">
              <motion.div
                animate={{ rotate: [0, 0, -10, 0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity, times: [0, 0.7, 0.75, 0.8, 0.85, 1] }}
              >
                <Wifi className="h-3 w-3 text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
              </motion.div>
              <motion.span
                animate={{ scale: [1, 2, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400"
              />
              <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)]" />
            </div>
            <span className="text-[10px] font-black bg-gradient-to-r from-emerald-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent tabular-nums">
              {onlineUsers.length.toLocaleString("bn-BD")}
            </span>
          </div>

          {/* Vertical gradient separator */}
          <div className="h-4 w-px bg-gradient-to-b from-transparent via-fuchsia-500/50 to-transparent shrink-0 z-10" />

          {/* Marquee names */}
          <div className="relative w-[120px] sm:w-[180px] md:w-[240px] overflow-hidden z-10">
            <motion.div
              className="flex items-center gap-2 whitespace-nowrap"
              animate={shouldAnimate ? { x: ["0%", "-50%"] } : undefined}
              transition={
                shouldAnimate
                  ? { duration: Math.max(12, onlineUsers.length * 4), ease: "linear", repeat: Infinity }
                  : undefined
              }
            >
              {items.map((u, i) => {
                // Cycle through vibrant gradient colors per user
                const colors = [
                  { ring: "ring-rose-400/60", grad: "from-rose-300 via-pink-300 to-fuchsia-300" },
                  { ring: "ring-amber-400/60", grad: "from-amber-300 via-orange-300 to-yellow-300" },
                  { ring: "ring-emerald-400/60", grad: "from-emerald-300 via-teal-300 to-cyan-300" },
                  { ring: "ring-cyan-400/60", grad: "from-cyan-300 via-sky-300 to-blue-300" },
                  { ring: "ring-violet-400/60", grad: "from-violet-300 via-purple-300 to-fuchsia-300" },
                ];
                const c = colors[i % colors.length];
                return (
                  <div key={`${u.id}-${i}`} className="shrink-0 flex items-center gap-1">
                    {u.photo ? (
                      <img
                        src={u.photo}
                        alt={u.name}
                        className={`h-4 w-4 rounded-full object-cover ring-1 ${c.ring} shadow-[0_0_6px_rgba(255,255,255,0.15)]`}
                      />
                    ) : (
                      <div className={`h-4 w-4 rounded-full bg-gradient-to-br ${c.grad} flex items-center justify-center text-[8px] font-black text-slate-900 ring-1 ${c.ring}`}>
                        {u.name.charAt(0)}
                      </div>
                    )}
                    <span className={`text-[10px] font-bold bg-gradient-to-r ${c.grad} bg-clip-text text-transparent`}>
                      {u.name}
                    </span>
                  </div>
                );
              })}
            </motion.div>
            {/* Edge fades */}
            <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-slate-950 to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none" />
          </div>
        </div>
      </motion.div>
    );
  }

  // Default full-width bar
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative border-b border-border/30 bg-gradient-to-r from-emerald-500/8 via-card/60 to-emerald-500/8 backdrop-blur-xl overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      <div className="relative flex items-center h-9 md:h-10">
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
                    <img src={u.photo} alt={u.name} className="h-5 w-5 rounded-full object-cover border border-emerald-500/30" />
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
