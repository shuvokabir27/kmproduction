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
        .eq("is_active", true)
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
      <style>{`
        @keyframes noticeSpin {
          0% { transform: rotate(0deg); filter: drop-shadow(0 0 8px #ff0040) drop-shadow(0 0 20px #8000ff); }
          25% { filter: drop-shadow(0 0 12px #ffef00) drop-shadow(0 0 25px #00ff80); }
          50% { filter: drop-shadow(0 0 10px #00bfff) drop-shadow(0 0 22px #ff00ff); }
          75% { filter: drop-shadow(0 0 14px #ff8c00) drop-shadow(0 0 28px #00ffff); }
          100% { transform: rotate(360deg); filter: drop-shadow(0 0 8px #ff0040) drop-shadow(0 0 20px #8000ff); }
        }
        @keyframes balloonBurst {
          0% { transform: scale(0) translate(var(--tx), var(--ty)); opacity: 1; }
          50% { opacity: 1; }
          100% { transform: scale(1) translate(calc(var(--tx) * 3), calc(var(--ty) * 3)); opacity: 0; }
        }
        .balloon-particle {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: balloonBurst 2s ease-out infinite;
          pointer-events: none;
        }
        @keyframes flyAcross {
          0% { left: -5%; opacity: 0; transform: translateY(var(--fly-y)) scale(0.5); }
          10% { opacity: 1; transform: translateY(var(--fly-y)) scale(1); }
          90% { opacity: 1; }
          100% { left: 105%; opacity: 0; transform: translateY(calc(var(--fly-y) + var(--drift))) scale(0.3); }
        }
        .light-firefly {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          animation: flyAcross var(--duration) ease-in-out infinite;
          animation-delay: var(--delay);
          z-index: 10;
        }
      `}</style>

      <div className="relative rounded-xl p-[2px] overflow-visible">
        {/* Flying light particles */}
        {[
          { color: "#ffef00", size: 5, y: "20%", drift: "-15px", duration: "4s", delay: "0s" },
          { color: "#00ffcc", size: 4, y: "50%", drift: "10px", duration: "5s", delay: "1s" },
          { color: "#ff80ff", size: 6, y: "35%", drift: "-20px", duration: "3.5s", delay: "2s" },
          { color: "#80d0ff", size: 4, y: "70%", drift: "12px", duration: "6s", delay: "0.5s" },
          { color: "#ffaa00", size: 5, y: "15%", drift: "-8px", duration: "4.5s", delay: "1.5s" },
          { color: "#00ff88", size: 3, y: "60%", drift: "18px", duration: "5.5s", delay: "3s" },
        ].map((p, i) => (
          <div
            key={`fly-${i}`}
            className="light-firefly"
            style={{
              width: p.size,
              height: p.size,
              top: p.y,
              background: p.color,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}, 0 0 ${p.size * 4}px ${p.color}80`,
              "--fly-y": "0px",
              "--drift": p.drift,
              "--duration": p.duration,
              "--delay": p.delay,
            } as React.CSSProperties}
          />
        ))}

        {/* Balloon burst particles */}
        {[
          { color: "#ff0040", tx: "-30px", ty: "-40px", delay: "0s", top: "0", left: "20%" },
          { color: "#ffef00", tx: "25px", ty: "-35px", delay: "0.3s", top: "0", left: "50%" },
          { color: "#00ff80", tx: "40px", ty: "-20px", delay: "0.6s", top: "0", left: "75%" },
          { color: "#00bfff", tx: "-35px", ty: "-25px", delay: "0.9s", top: "0", left: "35%" },
          { color: "#ff00ff", tx: "20px", ty: "-45px", delay: "1.2s", top: "0", left: "60%" },
          { color: "#ff8c00", tx: "-20px", ty: "-30px", delay: "1.5s", top: "0", left: "85%" },
          { color: "#8000ff", tx: "30px", ty: "-38px", delay: "0.4s", top: "0", left: "10%" },
          { color: "#00ffff", tx: "-15px", ty: "-42px", delay: "0.8s", top: "0", left: "45%" },
        ].map((p, i) => (
          <div
            key={i}
            className="balloon-particle"
            style={{
              background: p.color,
              top: p.top,
              left: p.left,
              animationDelay: p.delay,
              // @ts-ignore
              "--tx": p.tx,
              "--ty": p.ty,
              boxShadow: `0 0 6px ${p.color}, 0 0 12px ${p.color}50`,
              zIndex: 10,
            } as React.CSSProperties}
          />
        ))}

        {/* Rotating rainbow border with drop shadow */}
        <div className="absolute inset-0 rounded-xl overflow-hidden">
          <div
            style={{
              position: "absolute",
              inset: "-50%",
              background: "conic-gradient(from 0deg, #ff0040, #ff8c00, #ffef00, #00ff80, #00bfff, #8000ff, #ff00ff, #ff0040)",
              animation: "noticeSpin 3s linear infinite",
            }}
          />
        </div>
        {/* Secondary reverse glow */}
        <div className="absolute inset-0 rounded-xl overflow-hidden opacity-40">
          <div
            style={{
              position: "absolute",
              inset: "-50%",
              background: "conic-gradient(from 180deg, #00ffff, #ff00ff, #ffff00, #00ff00, #ff6600, #0066ff, #00ffff)",
              animation: "noticeSpin 5s linear infinite reverse",
              filter: "blur(6px)",
            }}
          />
        </div>
        {/* Inner background */}
        <div className="absolute inset-[2px] rounded-[10px] bg-card z-[1]" />
      <Card className="relative z-[2] bg-gradient-to-br from-card via-card to-primary/5 border-0 overflow-hidden shadow-lg shadow-primary/5">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-border/30 flex items-center gap-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/20 shadow-sm shadow-primary/10">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-base md:text-lg">নোটিশ বোর্ড</h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">{notices.length}টি নোটিশ</p>
          </div>
        </div>

        {/* Notice List */}
        <div className="divide-y divide-border/15">
          <AnimatePresence>
            {notices.map((notice: any, i: number) => (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, type: "spring", stiffness: 200 }}
                className={`p-3.5 md:p-4 cursor-pointer transition-all duration-200 group
                  ${notice.is_pinned
                    ? "bg-gradient-to-r from-amber-500/8 via-transparent to-transparent border-l-[3px] border-l-amber-400 hover:from-amber-500/15"
                    : "hover:bg-primary/5 border-l-[3px] border-l-transparent"
                  }`}
                onClick={() => setSelectedNotice(notice)}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`mt-0.5 shrink-0 h-8 w-8 md:h-9 md:w-9 rounded-lg flex items-center justify-center ${
                    notice.is_pinned
                      ? "bg-amber-500/15 ring-1 ring-amber-500/20"
                      : "bg-primary/10 ring-1 ring-primary/10 group-hover:ring-primary/20"
                  }`}>
                    {notice.is_pinned
                      ? <Pin className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-400" />
                      : <Megaphone className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary/70 group-hover:text-primary" />
                    }
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm md:text-[15px] font-semibold leading-snug ${
                      notice.is_pinned ? "text-amber-300" : "text-foreground group-hover:text-primary"
                    } transition-colors`}>
                      {notice.is_pinned && <span className="text-[10px] font-medium text-amber-400/80 uppercase tracking-wider mr-1.5">পিন করা</span>}
                      {notice.title}
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{notice.content}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] md:text-xs text-muted-foreground/70 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5 md:h-3 md:w-3" />
                        {formatDistanceToNow(new Date(notice.created_at), { addSuffix: true, locale: bn })}
                      </span>
                      {(commentCounts?.[notice.id] ?? 0) > 0 && (
                        <span className="text-[10px] md:text-xs text-primary flex items-center gap-1 font-semibold bg-primary/10 px-1.5 py-0.5 rounded-full">
                          <MessageSquare className="h-2.5 w-2.5 md:h-3 md:w-3" />
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
      </div>

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
