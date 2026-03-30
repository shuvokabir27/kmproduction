import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Vote, CheckCircle2, Trophy, Users } from "lucide-react";

interface PollCardProps {
  poll: {
    id: string;
    question: string;
    is_active: boolean;
    created_at: string;
  };
  compact?: boolean;
}

export function PollCard({ poll, compact }: PollCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [voting, setVoting] = useState(false);

  // Fetch options
  const { data: options } = useQuery({
    queryKey: ["poll-options", poll.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("poll_options")
        .select("*")
        .eq("poll_id", poll.id)
        .order("sort_order");
      return data ?? [];
    },
  });

  // Fetch all votes for this poll
  const { data: votes } = useQuery({
    queryKey: ["poll-votes", poll.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("poll_votes")
        .select("option_id, user_id")
        .eq("poll_id", poll.id);
      return data ?? [];
    },
  });

  const totalVotes = votes?.length ?? 0;
  const myVote = votes?.find((v: any) => v.user_id === user?.id);
  const hasVoted = !!myVote;

  const getVoteCount = (optionId: string) =>
    (votes ?? []).filter((v: any) => v.option_id === optionId).length;

  const maxVotes = options
    ? Math.max(...options.map((o: any) => getVoteCount(o.id)), 0)
    : 0;

  const handleVote = async (optionId: string) => {
    if (!user || hasVoted || voting) return;
    setVoting(true);
    try {
      const { error } = await supabase.from("poll_votes").insert({
        poll_id: poll.id,
        option_id: optionId,
        user_id: user.id,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["poll-votes", poll.id] });
    } catch {
      // already voted or error
    } finally {
      setVoting(false);
    }
  };

  // Colors for bars
  const barColors = [
    "from-emerald-500 to-cyan-500",
    "from-violet-500 to-pink-500",
    "from-amber-500 to-orange-500",
    "from-blue-500 to-indigo-500",
    "from-rose-500 to-red-500",
    "from-teal-500 to-green-500",
  ];

  return (
    <div className={compact ? "" : "p-4"}>
      {/* Question */}
      <div className="flex items-start gap-2.5 mb-3">
        <div className="shrink-0 h-8 w-8 rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/20 flex items-center justify-center">
          <Vote className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm md:text-[15px] font-semibold text-foreground leading-snug">{poll.question}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded-full">ভোটিং</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Users className="h-2.5 w-2.5" /> {totalVotes} ভোট
            </span>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2 ml-0.5">
        {options?.map((opt: any, idx: number) => {
          const count = getVoteCount(opt.id);
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isWinner = hasVoted && count === maxVotes && maxVotes > 0;
          const isMyVote = myVote?.option_id === opt.id;

          return (
            <motion.button
              key={opt.id}
              disabled={hasVoted || voting || !poll.is_active}
              onClick={() => handleVote(opt.id)}
              className={`relative w-full text-left rounded-xl overflow-hidden transition-all duration-200
                ${hasVoted
                  ? "cursor-default"
                  : "cursor-pointer hover:ring-1 hover:ring-primary/30 active:scale-[0.98]"
                }
                ${isMyVote ? "ring-1 ring-emerald-500/40" : ""}
                bg-secondary/50
              `}
              whileTap={!hasVoted ? { scale: 0.98 } : {}}
            >
              {/* Progress bar background */}
              {hasVoted && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${barColors[idx % barColors.length]} opacity-15 rounded-xl`}
                />
              )}

              <div className="relative flex items-center gap-3 px-3.5 py-2.5">
                {/* Vote indicator or radio */}
                {hasVoted ? (
                  isMyVote ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-border/50 shrink-0" />
                  )
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0 group-hover:border-primary" />
                )}

                <span className={`text-sm flex-1 ${isMyVote ? "text-foreground font-medium" : "text-foreground/80"}`}>
                  {opt.option_text}
                </span>

                {hasVoted && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isWinner && <Trophy className="h-3.5 w-3.5 text-amber-400" />}
                    <span className={`text-xs font-bold ${isWinner ? "text-amber-400" : "text-muted-foreground"}`}>
                      {pct}%
                    </span>
                  </div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Footer hint */}
      {!hasVoted && poll.is_active && (
        <p className="text-[10px] text-muted-foreground/60 mt-2 ml-1">একটি অপশনে ক্লিক করে ভোট দিন</p>
      )}
    </div>
  );
}
