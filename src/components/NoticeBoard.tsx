import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Megaphone, Pin, Clock, MessageSquare, Send, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";

export function NoticeBoard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedNotice, setSelectedNotice] = useState<any>(null);
  const [commentText, setCommentText] = useState("");
  const [commenting, setCommenting] = useState(false);

  const { data: notices } = useQuery({
    queryKey: ["member-notices"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notices")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  // Auto-open notice from URL param (e.g., /dashboard?notice=<id>)
  useEffect(() => {
    const noticeId = searchParams.get("notice");
    if (noticeId && notices && notices.length > 0) {
      const found = notices.find((n: any) => n.id === noticeId);
      if (found) {
        setSelectedNotice(found);
        // Clean up URL param
        searchParams.delete("notice");
        setSearchParams(searchParams, { replace: true });
      } else {
        // Notice not in current list, fetch it directly
        supabase.from("notices").select("*").eq("id", noticeId).maybeSingle().then(({ data }) => {
          if (data) setSelectedNotice(data);
          searchParams.delete("notice");
          setSearchParams(searchParams, { replace: true });
        });
      }
    }
  }, [notices, searchParams]);

  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ["notice-comments-member", selectedNotice?.id],
    enabled: !!selectedNotice?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("notice_comments")
        .select("*")
        .eq("notice_id", selectedNotice!.id)
        .order("created_at", { ascending: true });
      if (!data) return [];
      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, photo_url")
        .in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.user_id, p]));
      return data.map((c: any) => ({ ...c, profile: profileMap[c.user_id] }));
    },
  });

  const handleComment = async () => {
    if (!commentText.trim() || !selectedNotice || !user) return;
    setCommenting(true);
    try {
      const { error } = await supabase.from("notice_comments").insert({
        notice_id: selectedNotice.id,
        user_id: user.id,
        content: commentText.trim(),
      });
      if (error) throw error;
      setCommentText("");
      refetchComments();
    } catch {
      // silent
    } finally {
      setCommenting(false);
    }
  };

  if (!notices || notices.length === 0) return null;

  return (
    <>
      <Card className="bg-card border-border/50 overflow-hidden">
        <div className="p-4 border-b border-border/30 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Megaphone className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-semibold text-foreground">নোটিশ বোর্ড</h2>
        </div>
        <div className="divide-y divide-border/20">
          <AnimatePresence>
            {notices.map((notice: any, i: number) => (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 hover:bg-secondary/30 transition-colors cursor-pointer"
                onClick={() => setSelectedNotice(notice)}
              >
                <div className="flex items-start gap-3">
                  {notice.is_pinned && (
                    <Pin className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-semibold text-foreground ${notice.is_pinned ? "text-primary" : ""}`}>
                      {notice.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notice.content}</p>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1.5">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDistanceToNow(new Date(notice.created_at), { addSuffix: true, locale: bn })}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Card>

      {/* Notice Detail Dialog */}
      <Dialog open={!!selectedNotice} onOpenChange={(v) => !v && setSelectedNotice(null)}>
        <DialogContent className="bg-card border-border/50 max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              {selectedNotice?.is_pinned && <Pin className="h-4 w-4 text-primary" />}
              {selectedNotice?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto space-y-4">
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {selectedNotice?.content}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedNotice && formatDistanceToNow(new Date(selectedNotice.created_at), { addSuffix: true, locale: bn })}
            </p>

            <div className="border-t border-border/30 pt-4">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-primary" /> মন্তব্য ({comments?.length || 0})
              </h4>
              <div className="space-y-3 max-h-60 overflow-auto">
                {comments?.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">কোনো মন্তব্য নেই</p>}
                {comments?.map((c: any) => (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                      {c.profile?.photo_url ? (
                        <img src={c.profile.photo_url} alt="" className="h-7 w-7 object-cover rounded-full" />
                      ) : (
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">{c.profile?.full_name || "সদস্য"}</span>
                        <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: bn })}</span>
                      </div>
                      <p className="text-sm text-foreground/80 mt-0.5">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-border/30">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="মন্তব্য লিখুন..."
              className="bg-secondary border-border/30 flex-1"
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleComment()}
            />
            <Button size="icon" onClick={handleComment} disabled={commenting || !commentText.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
