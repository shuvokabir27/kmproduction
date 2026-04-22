import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface MemberBadgesProps {
  memberId: string;
  size?: "sm" | "md" | "lg";
  max?: number;
  className?: string;
}

const COLOR_MAP: Record<string, string> = {
  amber: "from-amber-500/30 to-yellow-500/20 border-amber-400/50 text-amber-200",
  blue: "from-blue-500/30 to-cyan-500/20 border-blue-400/50 text-blue-200",
  purple: "from-purple-500/30 to-fuchsia-500/20 border-purple-400/50 text-purple-200",
  rose: "from-rose-500/30 to-pink-500/20 border-rose-400/50 text-rose-200",
  green: "from-emerald-500/30 to-green-500/20 border-emerald-400/50 text-emerald-200",
  cyan: "from-cyan-500/30 to-teal-500/20 border-cyan-400/50 text-cyan-200",
  indigo: "from-indigo-500/30 to-violet-500/20 border-indigo-400/50 text-indigo-200",
  pink: "from-pink-500/30 to-rose-500/20 border-pink-400/50 text-pink-200",
};

const SIZE_MAP = {
  sm: { wrap: "px-1.5 py-0.5 gap-1 text-[9px]", icon: "text-xs" },
  md: { wrap: "px-2 py-1 gap-1.5 text-[10px]", icon: "text-sm" },
  lg: { wrap: "px-2.5 py-1.5 gap-2 text-xs", icon: "text-lg" },
};

export function MemberBadges({ memberId, size = "md", max = 6, className = "" }: MemberBadgesProps) {
  const { data: badges } = useQuery({
    queryKey: ["member-achievements", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_achievements")
        .select("*")
        .eq("member_id", memberId)
        .order("earned_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!memberId,
  });

  if (!badges || badges.length === 0) return null;

  const visible = badges.slice(0, max);
  const remaining = badges.length - visible.length;
  const sz = SIZE_MAP[size];

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {visible.map((b, i) => (
        <motion.div
          key={b.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          title={b.description ?? b.badge_label}
          className={`inline-flex items-center rounded-full bg-gradient-to-br border font-bold shadow-sm ${sz.wrap} ${COLOR_MAP[b.badge_color] ?? COLOR_MAP.amber}`}
        >
          <span className={sz.icon}>{b.badge_icon}</span>
          <span>{b.badge_label}</span>
        </motion.div>
      ))}
      {remaining > 0 && (
        <span className={`inline-flex items-center rounded-full bg-muted/40 border border-border/40 text-muted-foreground font-bold ${sz.wrap}`}>
          +{remaining}
        </span>
      )}
    </div>
  );
}
