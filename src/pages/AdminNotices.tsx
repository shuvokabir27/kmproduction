import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pin, Trash2, MessageSquare, Clock, Eye, EyeOff, Vote, Users, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { bn } from "date-fns/locale";
import { NoticeComments } from "@/components/NoticeComments";
import { AdminPollCreate } from "@/components/AdminPollCreate";

const AdminNotices = () => {
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [pollCreateOpen, setPollCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<any>(null);
  const [selectedPoll, setSelectedPoll] = useState<any>(null);

  const { data: notices } = useQuery({
    queryKey: ["admin-notices"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notices")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Fetch comment counts
  const { data: commentCounts } = useQuery({
    queryKey: ["admin-notice-comment-counts"],
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

  // Fetch polls
  const { data: polls } = useQuery({
    queryKey: ["admin-polls"],
    queryFn: async () => {
      const { data } = await supabase
        .from("polls")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Fetch poll options and votes for all polls
  const { data: pollOptions } = useQuery({
    queryKey: ["admin-poll-options"],
    queryFn: async () => {
      if (!polls || polls.length === 0) return {};
      const ids = polls.map((p: any) => p.id);
      const { data } = await supabase.from("poll_options").select("*").in("poll_id", ids).order("sort_order");
      const map: Record<string, any[]> = {};
      (data ?? []).forEach((o: any) => {
        if (!map[o.poll_id]) map[o.poll_id] = [];
        map[o.poll_id].push(o);
      });
      return map;
    },
    enabled: !!polls && polls.length > 0,
  });

  // Fetch votes with voter names for admin
  const { data: pollVoteDetails } = useQuery({
    queryKey: ["admin-poll-vote-details"],
    queryFn: async () => {
      if (!polls || polls.length === 0) return {};
      const ids = polls.map((p: any) => p.id);
      const { data } = await supabase
        .from("poll_votes")
        .select("poll_id, option_id, user_id")
        .in("poll_id", ids);
      // Get unique user_ids
      const userIds = [...new Set((data ?? []).map((v: any) => v.user_id))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        (profiles ?? []).forEach((p: any) => { profileMap[p.user_id] = p.full_name; });
      }
      // Group by poll_id -> option_id -> { count, names[] }
      const map: Record<string, Record<string, { count: number; names: string[] }>> = {};
      (data ?? []).forEach((v: any) => {
        if (!map[v.poll_id]) map[v.poll_id] = {};
        if (!map[v.poll_id][v.option_id]) map[v.poll_id][v.option_id] = { count: 0, names: [] };
        map[v.poll_id][v.option_id].count++;
        map[v.poll_id][v.option_id].names.push(profileMap[v.user_id] || "অজানা");
      });
      return map;
    },
    enabled: !!polls && polls.length > 0,
  });

  // Realtime for comment counts
  useEffect(() => {
    const channel = supabase
      .channel("admin-notice-comments-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "notice_comments" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-notice-comment-counts"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-poll-vote-details"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (!user || !isAdmin) return <Navigate to="/login" replace />;

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) { toast.error("শিরোনাম ও বিস্তারিত লিখুন"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("notices").insert({
        title: title.trim(),
        content: content.trim(),
        is_pinned: isPinned,
        created_by: user.id,
      });
      if (error) throw error;
      toast.success("নোটিশ প্রকাশ হয়েছে!");
      setTitle(""); setContent(""); setIsPinned(false);
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-notices"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("নোটিশটি মুছে ফেলতে চান?")) return;
    const { error } = await supabase.from("notices").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("নোটিশ মুছে ফেলা হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["admin-notices"] });
      if (selectedNotice?.id === id) setSelectedNotice(null);
    }
  };

  const togglePin = async (id: string, current: boolean) => {
    const { error } = await supabase.from("notices").update({ is_pinned: !current }).eq("id", id);
    if (error) toast.error(error.message);
    else queryClient.invalidateQueries({ queryKey: ["admin-notices"] });
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("notices").update({ is_active: !current }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(!current ? "নোটিশ চালু করা হয়েছে" : "নোটিশ বন্ধ করা হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["admin-notices"] });
    }
  };

  const handleDeletePoll = async (id: string) => {
    if (!confirm("ভোটিং মুছে ফেলতে চান?")) return;
    const { error } = await supabase.from("polls").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("ভোটিং মুছে ফেলা হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["admin-polls"] });
    }
  };

  const closePoll = async (id: string) => {
    if (!confirm("ভোটিং বন্ধ করতে চান? একবার বন্ধ করলে আর চালু করা যাবে না।")) return;
    const { error } = await supabase.from("polls").update({ is_active: false }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("ভোটিং বন্ধ করা হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["admin-polls"] });
    }
  };

  const togglePollPin = async (id: string, current: boolean) => {
    const { error } = await supabase.from("polls").update({ is_pinned: !current }).eq("id", id);
    if (error) toast.error(error.message);
    else queryClient.invalidateQueries({ queryKey: ["admin-polls"] });
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 via-pink-400 to-violet-400 bg-clip-text text-transparent">নোটিশ বোর্ড</h1>
            <p className="text-sm text-muted-foreground">সকল সদস্যদের জন্য নোটিশ প্রকাশ করুন</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white border-0" size="sm">
            <Plus className="h-4 w-4" /> নোটিশ
          </Button>
          <Button onClick={() => setPollCreateOpen(true)} className="gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white border-0" size="sm">
            <Vote className="h-4 w-4" /> ভোটিং
          </Button>
        </div>

        {/* Notice List */}
        <div className="space-y-3">
          {notices?.length === 0 && (
            <Card className="p-8 text-center bg-card border-border/50">
              <p className="text-muted-foreground">কোনো নোটিশ নেই</p>
            </Card>
          )}
          {notices?.map((notice: any) => (
            <motion.div key={notice.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card
                className={`p-4 bg-card cursor-pointer hover:border-violet-500/30 transition-all border-border/50 ${!notice.is_active ? "opacity-50" : ""}`}
                onClick={() => setSelectedNotice(notice)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {notice.is_pinned && <Pin className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                      {!notice.is_active && <EyeOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                      <h3 className="font-semibold text-foreground truncate">{notice.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{notice.content}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(notice.created_at), { addSuffix: true, locale: bn })}
                      </span>
                      <span className="text-xs text-cyan-400 flex items-center gap-1 font-medium">
                        <MessageSquare className="h-3 w-3" />
                        {commentCounts?.[notice.id] ?? 0}
                      </span>
                      {!notice.is_active && (
                        <span className="text-xs text-destructive font-medium">বন্ধ</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      title={notice.is_active ? "নোটিশ বন্ধ করুন" : "নোটিশ চালু করুন"}
                      onClick={(e) => { e.stopPropagation(); toggleActive(notice.id, notice.is_active); }}
                    >
                      {notice.is_active ? <Eye className="h-3.5 w-3.5 text-green-500" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); togglePin(notice.id, notice.is_pinned); }}
                    >
                      <Pin className={`h-3.5 w-3.5 ${notice.is_pinned ? "text-primary" : "text-muted-foreground"}`} />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleDelete(notice.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Polls Section */}
        {polls && polls.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Vote className="h-5 w-5 text-emerald-400" /> ভোটিং সমূহ
            </h2>
            {polls.map((poll: any) => {
              const opts = pollOptions?.[poll.id] ?? [];
              const detailsMap = pollVoteDetails?.[poll.id] ?? {};
              const totalVotes = Object.values(detailsMap).reduce((a: number, b: any) => a + (b as any).count, 0) as number;
              const maxCount = opts.length > 0 ? Math.max(...opts.map((o: any) => detailsMap[o.id]?.count ?? 0), 0) : 0;

              return (
                <motion.div key={poll.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className={`p-4 bg-card border-border/50 ${!poll.is_active ? "opacity-60" : ""}`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        {poll.is_pinned && <Pin className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                        <Vote className="h-4 w-4 text-emerald-400 shrink-0" />
                        <h3 className="font-semibold text-foreground text-sm">{poll.question}</h3>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {poll.is_active && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="ভোটিং বন্ধ করুন"
                            onClick={() => closePoll(poll.id)}>
                            <EyeOff className="h-3.5 w-3.5 text-orange-400" />
                          </Button>
                        )}
                        {!poll.is_active && (
                          <span className="text-[10px] text-destructive font-medium mr-1">বন্ধ</span>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => togglePollPin(poll.id, poll.is_pinned)}>
                          <Pin className={`h-3.5 w-3.5 ${poll.is_pinned ? "text-primary" : "text-muted-foreground"}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeletePoll(poll.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Results bars with voter names */}
                    <div className="space-y-2">
                      {opts.map((opt: any) => {
                        const detail = detailsMap[opt.id] ?? { count: 0, names: [] };
                        const pct = totalVotes > 0 ? Math.round((detail.count / totalVotes) * 100) : 0;
                        const isWinner = detail.count === maxCount && maxCount > 0;
                        return (
                          <div key={opt.id}>
                            <div className="relative rounded-lg overflow-hidden bg-secondary/50">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8 }}
                                className={`absolute inset-y-0 left-0 ${isWinner ? "bg-emerald-500/20" : "bg-primary/10"} rounded-lg`}
                              />
                              <div className="relative flex items-center justify-between px-3 py-2">
                                <span className="text-xs text-foreground flex items-center gap-1.5">
                                  {isWinner && <Trophy className="h-3 w-3 text-amber-400" />}
                                  {opt.option_text}
                                </span>
                                <span className="text-xs font-bold text-muted-foreground">{pct}% ({detail.count})</span>
                              </div>
                            </div>
                            {/* Voter names */}
                            {detail.names.length > 0 && (
                              <div className="mt-1 ml-3 flex flex-wrap gap-1">
                                {detail.names.map((name: string, ni: number) => (
                                  <span key={ni} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{name}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" /> মোট {totalVotes} ভোট
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(poll.created_at), { addSuffix: true, locale: bn })}
                      </span>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Create Notice Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="bg-card border-border/50 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-foreground">নতুন নোটিশ</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-foreground text-xs">শিরোনাম</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="নোটিশের শিরোনাম" className="bg-secondary border-border/30" />
              </div>
              <div>
                <Label className="text-foreground text-xs">বিস্তারিত</Label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="নোটিশের বিস্তারিত লিখুন..." rows={6} className="bg-secondary border-border/30" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} className="rounded border-border" />
                <span className="text-sm text-foreground">পিন করুন (সবার উপরে থাকবে)</span>
              </label>
              <Button onClick={handleCreate} disabled={saving} className="w-full">
                {saving ? "প্রকাশ হচ্ছে..." : "নোটিশ প্রকাশ করুন"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Poll Create Dialog */}
        <AdminPollCreate open={pollCreateOpen} onOpenChange={setPollCreateOpen} userId={user.id} />

        {/* Notice Detail + Comments Dialog */}
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
      </div>
    </AppLayout>
  );
};

export default AdminNotices;
