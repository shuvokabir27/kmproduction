import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Vote, CheckCircle2, Trophy, Users, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [confirmVote, setConfirmVote] = useState<{ optionId: string; optionText: string } | null>(null);

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

  // Fetch voter names (shown when poll is closed)
  const { data: voterNames } = useQuery({
    queryKey: ["poll-voter-names", poll.id],
    queryFn: async () => {
      if (!votes || votes.length === 0) return {};
      const userIds = [...new Set(votes.map((v: any) => v.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      const map: Record<string, string> = {};
      (profiles ?? []).forEach((p: any) => { map[p.user_id] = p.full_name; });
      return map;
    },
    enabled: !poll.is_active && !!votes && votes.length > 0,
  });

  const totalVotes = votes?.length ?? 0;
  const myVote = votes?.find((v: any) => v.user_id === user?.id);
  const hasVoted = !!myVote;

  const getVoteCount = (optionId: string) =>
    (votes ?? []).filter((v: any) => v.option_id === optionId).length;

  const maxVotes = options
    ? Math.max(...options.map((o: any) => getVoteCount(o.id)), 0)
    : 0;

  const handleVoteClick = (optionId: string) => {
    if (!user || hasVoted || voting) return;
    const optText = options?.find((o: any) => o.id === optionId)?.option_text ?? "";
    setConfirmVote({ optionId, optionText: optText });
  };

  const handleVoteConfirm = async () => {
    if (!confirmVote || !user) return;
    setVoting(true);
    setConfirmVote(null);
    try {
      const { error } = await supabase.from("poll_votes").insert({
        poll_id: poll.id,
        option_id: confirmVote.optionId,
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
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${poll.is_active ? "text-emerald-400 bg-emerald-500/10" : "text-destructive bg-destructive/10"}`}>
              {poll.is_active ? "ভোটিং চলছে" : "ভোটিং শেষ"}
            </span>
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
          const showResults = hasVoted || !poll.is_active;
          const isWinner = showResults && count === maxVotes && maxVotes > 0;
          const isMyVote = myVote?.option_id === opt.id;
          const optionVoterNames = !poll.is_active && voterNames
            ? (votes ?? []).filter((v: any) => v.option_id === opt.id).map((v: any) => voterNames[v.user_id] || "অজানা")
            : [];

          return (
            <div key={opt.id}>
              <motion.button
                disabled={hasVoted || voting || !poll.is_active}
                onClick={() => handleVoteClick(opt.id)}
                className={`relative w-full text-left rounded-xl overflow-hidden transition-all duration-200
                  ${showResults
                    ? "cursor-default"
                    : "cursor-pointer hover:ring-1 hover:ring-primary/30 active:scale-[0.98]"
                  }
                  ${isMyVote ? "ring-1 ring-emerald-500/40" : ""}
                  bg-secondary/50
                `}
                whileTap={!hasVoted && poll.is_active ? { scale: 0.98 } : {}}
              >
                {/* Progress bar background */}
                {showResults && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`absolute inset-y-0 left-0 bg-gradient-to-r ${barColors[idx % barColors.length]} opacity-15 rounded-xl`}
                  />
                )}

                <div className="relative flex items-center gap-3 px-3.5 py-2.5">
                  {showResults ? (
                    isMyVote ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-border/50 shrink-0" />
                    )
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                  )}

                  <span className={`text-sm flex-1 ${isMyVote ? "text-foreground font-medium" : "text-foreground/80"}`}>
                    {opt.option_text}
                  </span>

                  {showResults && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isWinner && <Trophy className="h-3.5 w-3.5 text-amber-400" />}
                      <span className={`text-xs font-bold ${isWinner ? "text-amber-400" : "text-muted-foreground"}`}>
                        {pct}%
                      </span>
                    </div>
                  )}
                </div>
              </motion.button>
              {/* Voter names when poll is closed */}
              {!poll.is_active && optionVoterNames.length > 0 && (
                <div className="mt-1 ml-3 flex flex-wrap gap-1">
                  {optionVoterNames.map((name: string, ni: number) => (
                    <span key={ni} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{name}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      {!hasVoted && poll.is_active && (
        <p className="text-[10px] text-muted-foreground/60 mt-2 ml-1">একটি অপশনে ক্লিক করে ভোট দিন</p>
      )}

      {/* Vote Confirmation Modal */}
      <AnimatePresence>
        {confirmVote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmVote(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="w-full max-w-sm rounded-2xl bg-card border border-border/50 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header gradient */}
              <div className="bg-gradient-to-r from-emerald-500/15 via-cyan-500/10 to-emerald-500/15 px-5 pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/20 ring-1 ring-emerald-500/30 flex items-center justify-center">
                    <Vote className="h-5 w-5 text-emerald-400" />
                  </div>
                  <button onClick={() => setConfirmVote(null)} className="h-8 w-8 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <h3 className="text-base font-bold text-foreground">ভোট নিশ্চিত করুন</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  আপনি <span className="font-semibold text-foreground">"{confirmVote.optionText}"</span> এ ভোট দিতে চান?
                </p>
              </div>

              {/* Warning */}
              <div className="px-5 py-3">
                <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/8 border border-amber-500/15 px-3.5 py-3">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300/90 leading-relaxed">
                    একবার ভোট দিলে আর পরিবর্তন করা যাবে না। সাবধানে নির্বাচন করুন।
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="px-5 pb-5 flex gap-2.5">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl border-border/50 h-11"
                  onClick={() => setConfirmVote(null)}
                >
                  বাতিল
                </Button>
                <Button
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0 h-11 font-semibold"
                  onClick={handleVoteConfirm}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  ভোট দিন
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
