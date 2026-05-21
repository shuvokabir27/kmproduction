import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Send, MessageSquare, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";

interface ProfileReviewsProps {
  profileId: string;
  profileName: string;
}

export function ProfileReviews({ profileId, profileName }: ProfileReviewsProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Fetch approved comments
  const { data: comments } = useQuery({
    queryKey: ["profile-comments", profileId],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_approved_profile_comments", { _profile_id: profileId });
      return (data ?? []) as any[];
    },
  });

  // Fetch ratings
  const { data: ratings } = useQuery({
    queryKey: ["profile-ratings", profileId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profile_ratings" as any)
        .select("*")
        .eq("profile_id", profileId);
      return (data ?? []) as any[];
    },
  });

  const avgRating = ratings?.length
    ? (ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !comment.trim() || rating === 0) {
      toast({ title: "সব তথ্য পূরণ করুন", description: "নাম, রেটিং ও মন্তব্য আবশ্যক", variant: "destructive" });
      return;
    }
    if (name.trim().length > 100 || comment.trim().length > 1000) {
      toast({ title: "টেক্সট খুব বড়", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // Insert comment
      const { error: commentError } = await supabase.from("profile_comments" as any).insert({
        profile_id: profileId,
        commenter_name: name.trim(),
        commenter_email: email.trim() || null,
        content: comment.trim(),
      } as any);

      if (commentError) throw commentError;

      // Insert/update rating
      if (email.trim()) {
        const { error: ratingError } = await supabase.from("profile_ratings" as any).upsert(
          {
            profile_id: profileId,
            rater_name: name.trim(),
            rater_email: email.trim(),
            rating,
          } as any,
          { onConflict: "profile_id,rater_email" }
        );
        if (ratingError && !ratingError.message.includes("duplicate")) {
          console.error("Rating error:", ratingError);
        }
      } else {
        // No email, just insert rating
        await supabase.from("profile_ratings" as any).insert({
          profile_id: profileId,
          rater_name: name.trim(),
          rater_email: null,
          rating,
        } as any);
      }

      toast({ title: "ধন্যবাদ! ✨", description: "আপনার মন্তব্য অনুমোদনের পর দেখানো হবে।" });
      setName("");
      setEmail("");
      setComment("");
      setRating(0);
      queryClient.invalidateQueries({ queryKey: ["profile-ratings", profileId] });
      queryClient.invalidateQueries({ queryKey: ["profile-comments", profileId] });
    } catch (err: any) {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="space-y-6">
      {/* Average Rating Summary */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`h-5 w-5 ${
                avgRating && s <= Math.round(Number(avgRating))
                  ? "fill-red-400 text-red-400"
                  : "text-muted-foreground/30"
              }`}
            />
          ))}
        </div>
        {avgRating && (
          <span className="text-foreground font-bold text-lg">{avgRating}</span>
        )}
        <span className="text-muted-foreground text-sm">
          ({ratings?.length || 0} রেটিং)
        </span>
      </div>

      {/* Submit Form */}
      <form onSubmit={handleSubmit} className="premium-card rounded-2xl p-4 md:p-5 space-y-4">
        <h3 className="text-foreground font-semibold text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          মন্তব্য ও রেটিং দিন
        </h3>

        {/* Star Rating Input */}
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground text-xs mr-2">রেটিং:</span>
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              onMouseEnter={() => setHoverRating(s)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-0.5 transition-transform hover:scale-125"
            >
              <Star
                className={`h-6 w-6 transition-colors ${
                  s <= displayRating
                    ? "fill-red-400 text-red-400"
                    : "text-muted-foreground/40 hover:text-red-300"
                }`}
              />
            </button>
          ))}
          {displayRating > 0 && (
            <span className="text-red-400 text-sm font-medium ml-1">{displayRating}/5</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            placeholder="আপনার নাম *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
            className="bg-background/50"
          />
          <Input
            placeholder="ইমেইল (ঐচ্ছিক)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={255}
            className="bg-background/50"
          />
        </div>

        <Textarea
          placeholder={`${profileName} সম্পর্কে মন্তব্য লিখুন...`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          required
          rows={3}
          className="bg-background/50 resize-none"
        />

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-[10px]">{comment.length}/1000</span>
          <Button type="submit" disabled={submitting} size="sm" className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            {submitting ? "পাঠানো হচ্ছে..." : "পাঠান"}
          </Button>
        </div>
      </form>

      {/* Comments List */}
      {comments && comments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-foreground font-semibold text-sm">
            মন্তব্য ({comments.length})
          </h3>
          <AnimatePresence>
            {comments.map((c: any, i: number) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="premium-card rounded-xl p-3 md:p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-foreground font-medium text-sm">{c.commenter_name}</span>
                      <span className="text-muted-foreground text-[10px]">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: bn })}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm mt-1 whitespace-pre-wrap break-words">{c.content}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
