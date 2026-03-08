import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Megaphone, Pin, Clock, MessageSquare, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";
import { NoticeComments } from "@/components/NoticeComments";
import { useIsMobile } from "@/hooks/use-mobile";

export function NoticeBoard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedNotice, setSelectedNotice] = useState<any>(null);

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

  // Fetch comment counts for all notices
  const { data: commentCounts } = useQuery({
    queryKey: ["notice-comment-counts"],
    queryFn: async () => {
      if (!notices || notices.length === 0) return {};
      const ids = notices.map((n: any) => n.id);
      const { data } = await supabase
        .from("notice_comments")
        .select("notice_id")
        .in("notice_id", ids);
      const counts: Record<string, number> = {};
      (data ?? []).forEach((c: any) => {
        counts[c.notice_id] = (counts[c.notice_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!notices && notices.length > 0,
  });

  // Realtime for comment counts
  useEffect(() => {
    const channel = supabase
      .channel("notice-comments-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "notice_comments" }, () => {
        queryClient.invalidateQueries({ queryKey: ["notice-comment-counts"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Auto-open notice from URL param
  useEffect(() => {
    const noticeId = searchParams.get("notice");
    if (noticeId && notices && notices.length > 0) {
      const found = notices.find((n: any) => n.id === noticeId);
      if (found) {
        setSelectedNotice(found);
        searchParams.delete("notice");
        setSearchParams(searchParams, { replace: true });
      } else {
        supabase.from("notices").select("*").eq("id", noticeId).maybeSingle().then(({ data }) => {
          if (data) setSelectedNotice(data);
          searchParams.delete("notice");
          setSearchParams(searchParams, { replace: true });
        });
      }
    }
  }, [notices, searchParams]);

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
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {formatDistanceToNow(new Date(notice.created_at), { addSuffix: true, locale: bn })}
                      </span>
                      {(commentCounts?.[notice.id] ?? 0) > 0 && (
                        <span className="text-[10px] text-primary flex items-center gap-1 font-medium">
                          <MessageSquare className="h-2.5 w-2.5" />
                          {commentCounts[notice.id]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Card>

      {/* Notice Detail - Fullscreen Drawer on mobile, Dialog on desktop */}
      {isMobile ? (
        <Drawer open={!!selectedNotice} onOpenChange={(v) => !v && setSelectedNotice(null)}>
          <DrawerContent className="bg-card border-border/50 h-[100dvh] max-h-[100dvh] rounded-none">
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
                <button onClick={() => setSelectedNotice(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <DrawerTitle className="text-foreground flex items-center gap-2 text-base flex-1 min-w-0">
                  {selectedNotice?.is_pinned && <Pin className="h-4 w-4 text-primary shrink-0" />}
                  <span className="truncate">{selectedNotice?.title}</span>
                </DrawerTitle>
              </div>
              <div className="flex-1 overflow-auto px-4 py-4 space-y-4">
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedNotice?.content}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedNotice && formatDistanceToNow(new Date(selectedNotice.created_at), { addSuffix: true, locale: bn })}
                </p>
                <div className="border-t border-border/30 pt-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                    <MessageSquare className="h-4 w-4 text-primary" /> মন্তব্য
                  </h4>
                  {selectedNotice && <NoticeComments noticeId={selectedNotice.id} />}
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
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
                  <MessageSquare className="h-4 w-4 text-primary" /> মন্তব্য
                </h4>
                {selectedNotice && <NoticeComments noticeId={selectedNotice.id} />}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
