import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Send, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";

interface NoticeCommentsProps {
  noticeId: string;
}

export function NoticeComments({ noticeId }: NoticeCommentsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [commenting, setCommenting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);

  const queryKey = ["notice-comments", noticeId];

  const { data: members } = useQuery({
    queryKey: ["all-members-for-mention"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, photo_url")
        .eq("is_active", true)
        .order("full_name");
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: comments } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await supabase
        .from("notice_comments")
        .select("*")
        .eq("notice_id", noticeId)
        .order("created_at", { ascending: true });
      if (!data) return [];
      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, photo_url")
        .in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.user_id, p]));
      return data.map((c: any) => ({ ...c, profile: profileMap[c.user_id] }));
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`notice-comments-${noticeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notice_comments", filter: `notice_id=eq.${noticeId}` },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [noticeId, queryClient]);

  // Auto-scroll on new comments
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments?.length]);

  // Keep input visible above mobile keyboard
  useEffect(() => {
    const handleResize = () => {
      if (document.activeElement === inputRef.current) {
        setTimeout(() => {
          inputWrapperRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 100);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      return () => window.visualViewport?.removeEventListener("resize", handleResize);
    }
  }, []);

  const filteredMembers = members?.filter((m: any) =>
    m.full_name?.toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 5) ?? [];

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCommentText(value);

    // Detect @mention
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([^\s@]*)$/);

    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setShowMentions(true);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (memberName: string) => {
    const cursorPos = inputRef.current?.selectionStart ?? commentText.length;
    const textBeforeCursor = commentText.substring(0, cursorPos);
    const textAfterCursor = commentText.substring(cursorPos);
    const atMatch = textBeforeCursor.match(/@([^\s@]*)$/);

    if (atMatch) {
      const beforeAt = textBeforeCursor.substring(0, atMatch.index);
      const newText = `${beforeAt}@${memberName} ${textAfterCursor}`;
      setCommentText(newText);
    }
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) => Math.min(prev + 1, filteredMembers.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredMembers[mentionIndex].full_name);
        return;
      } else if (e.key === "Escape") {
        setShowMentions(false);
        return;
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleComment();
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || !user) return;
    setCommenting(true);
    try {
      const { error } = await supabase.from("notice_comments").insert({
        notice_id: noticeId,
        user_id: user.id,
        content: commentText.trim(),
      });
      if (error) throw error;
      setCommentText("");
    } catch {
      // silent
    } finally {
      setCommenting(false);
    }
  };

  // Render comment content with highlighted mentions
  const renderContent = (content: string) => {
    const parts = content.split(/(@[^\s@]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span key={i} className="text-primary font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="space-y-3 max-h-60 overflow-auto flex-1">
        {comments?.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">কোনো মন্তব্য নেই</p>
        )}
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
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: bn })}
                </span>
              </div>
              <p className="text-sm text-foreground/80 mt-0.5">{renderContent(c.content)}</p>
            </div>
          </div>
        ))}
        <div ref={commentsEndRef} />
      </div>

      {/* Comment input with mention */}
      <div ref={inputWrapperRef} className="relative pt-2 border-t border-border/30 mt-3 sticky bottom-0 bg-card z-10">
        {showMentions && filteredMembers.length > 0 && (
          <div
            ref={mentionListRef}
            className="absolute bottom-full mb-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-40 overflow-auto"
          >
            {filteredMembers.map((m: any, i: number) => (
              <button
                key={m.user_id}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-secondary/60 transition-colors ${
                  i === mentionIndex ? "bg-secondary" : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(m.full_name);
                }}
              >
                <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                  {m.photo_url ? (
                    <img src={m.photo_url} alt="" className="h-5 w-5 object-cover rounded-full" />
                  ) : (
                    <User className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <span className="text-foreground">{m.full_name}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={commentText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="মন্তব্য লিখুন... (@দিয়ে মেনশন)"
            rows={1}
            className="flex-1 bg-secondary border border-border/30 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <Button size="icon" onClick={handleComment} disabled={commenting || !commentText.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
