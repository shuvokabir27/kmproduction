import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollText, Eye, ArrowLeft, Send, User, MessageSquare, Clock, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";

const MemberScripts = () => {
  const { user, profile, loading, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedScript, setSelectedScript] = useState<any>(null);

  const { data: permittedScripts } = useQuery({
    queryKey: ["my-scripts", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("scripts").select("*").order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;

  if (selectedScript) {
    return (
      <AppLayout>
        <ScriptView script={selectedScript} onBack={() => setSelectedScript(null)} />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-primary" /> স্ক্রিপ্ট সমূহ
          </h1>
          <p className="text-sm text-muted-foreground mt-1">আপনার অ্যাক্সেস পাওয়া স্ক্রিপ্টগুলো এখানে দেখুন</p>
        </div>

        {(!permittedScripts || permittedScripts.length === 0) ? (
          <Card className="p-12 bg-card border-border/50 text-center">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground font-medium">আপনাকে কোনো স্ক্রিপ্ট পড়ার অনুমতি দেওয়া হয়নি</p>
            <p className="text-xs text-muted-foreground mt-1">অ্যাডমিন আপনাকে স্ক্রিপ্ট অ্যাক্সেস দিলে এখানে দেখা যাবে</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {permittedScripts.map((script: any, i: number) => (
              <motion.div
                key={script.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className="p-4 bg-card border-border/50 cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.98]"
                  onClick={() => setSelectedScript(script)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{script.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {script.updated_at ? formatDistanceToNow(new Date(script.updated_at), { addSuffix: true, locale: bn }) : ""}
                      </p>
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

// Script View with content + comments
function ScriptView({ script, onBack }: { script: any; onBack: () => void }) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">{script.title}</h1>
          <p className="text-xs text-muted-foreground">
            {script.updated_at ? formatDistanceToNow(new Date(script.updated_at), { addSuffix: true, locale: bn }) : ""}
          </p>
        </div>
      </div>

      {/* Script Content */}
      <Card className="bg-card border-border/50 overflow-hidden">
        <div className="p-4 md:p-6">
          {script.content ? (
            <div
              className="prose prose-invert max-w-none text-foreground
                [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3
                [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-2
                [&_p]:mb-2 [&_p]:leading-relaxed
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2
                [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2
                [&_li]:mb-1"
              dangerouslySetInnerHTML={{ __html: script.content }}
            />
          ) : (
            <p className="text-muted-foreground text-center py-8">কোনো স্ক্রিপ্ট কন্টেন্ট নেই</p>
          )}
        </div>
      </Card>

      {/* Comments */}
      <Card className="bg-card border-border/50">
        <div className="p-4 border-b border-border/30">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" /> মন্তব্য
          </h2>
        </div>
        <div className="p-4">
          <ScriptComments scriptId={script.id} />
        </div>
      </Card>
    </div>
  );
}

// Script Comments Component
function ScriptComments({ scriptId }: { scriptId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [commenting, setCommenting] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);

  const queryKey = ["script-comments", scriptId];

  const { data: comments } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await supabase
        .from("script_comments" as any)
        .select("*")
        .eq("script_id", scriptId)
        .order("created_at", { ascending: true });
      if (!data || data.length === 0) return [];
      const userIds = [...new Set((data as any[]).map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, photo_url")
        .in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.user_id, p]));
      return (data as any[]).map((c: any) => ({ ...c, profile: profileMap[c.user_id] }));
    },
  });

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`script-comments-${scriptId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "script_comments", filter: `script_id=eq.${scriptId}` }, () => {
        queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [scriptId, queryClient]);

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

  const handleComment = async () => {
    if (!commentText.trim() || !user) return;
    setCommenting(true);
    try {
      const { error } = await supabase.from("script_comments" as any).insert({
        script_id: scriptId,
        user_id: user.id,
        content: commentText.trim(),
      } as any);
      if (error) throw error;
      setCommentText("");
    } catch {
      // silent
    } finally {
      setCommenting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleComment();
    }
  };

  return (
    <div className="flex flex-col">
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
              <p className="text-sm text-foreground/80 mt-0.5">{c.content}</p>
            </div>
          </div>
        ))}
        <div ref={commentsEndRef} />
      </div>

      <div ref={inputWrapperRef} className="relative pt-2 border-t border-border/30 mt-3 sticky bottom-0 bg-card z-10">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setTimeout(() => {
                inputWrapperRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
              }, 300);
            }}
            placeholder="মন্তব্য লিখুন..."
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

export default MemberScripts;
