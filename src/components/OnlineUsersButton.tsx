import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Wifi } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function OnlineUsersButton() {
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
          name: p.full_name || "সদস্য",
          photo: p.photo_url,
          memberId: p.member_id,
        }));
    },
    refetchInterval: 20000,
  });

  if (!user) return null;

  const count = onlineUsers.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={`${count} জন অনলাইন`}
          className="relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors"
        >
          <span className="relative flex items-center">
            <Wifi className="h-3.5 w-3.5 text-emerald-400" />
            <motion.span
              animate={{ scale: [1, 1.6, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400"
            />
            <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
          </span>
          <span className="text-[11px] font-bold text-emerald-300 tabular-nums">
            {count.toLocaleString("bn-BD")}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0 bg-card border-border/60">
        <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">অনলাইন সদস্য</span>
          <span className="text-[10px] font-bold text-emerald-400">{count.toLocaleString("bn-BD")} জন</span>
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-border/30">
          {count === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">এখন কেউ অনলাইন নেই</p>
          ) : (
            onlineUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-2 px-3 py-2">
                {u.photo ? (
                  <img src={u.photo} alt={u.name} className="h-7 w-7 rounded-full object-cover border border-emerald-500/30" />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold text-emerald-300">
                    {u.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{u.name}</p>
                  {u.memberId && (
                    <p className="text-[10px] text-muted-foreground">ID: {u.memberId}</p>
                  )}
                </div>
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
