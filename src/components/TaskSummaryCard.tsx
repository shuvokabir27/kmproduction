import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, AlertTriangle, ListTodo, ArrowRight, Send, Inbox } from "lucide-react";

function bnNum(n: number | string): string {
  const map: Record<string, string> = { "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪", "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯" };
  return String(n).split("").map((c) => map[c] ?? c).join("");
}

export function TaskSummaryCard() {
  const { profile } = useAuth();

  const { data: tasks } = useQuery({
    queryKey: ["task-summary", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_tasks")
        .select("id, title, status, priority, due_date, assigned_to, assigned_by")
        .or(`assigned_to.eq.${profile?.id},assigned_by.eq.${profile?.id}`);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.id,
    refetchInterval: 30000,
  });

  const received = (tasks ?? []).filter((t) => t.assigned_to === profile?.id);
  const sent = (tasks ?? []).filter((t) => t.assigned_by === profile?.id);

  const pending = received.filter((t) => t.status === "todo" || t.status === "in_progress");
  const inProgress = received.filter((t) => t.status === "in_progress");
  const doneToday = received.filter((t) => t.status === "done");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = pending.filter((t) => t.due_date && new Date(t.due_date) < today);

  const upcoming = pending
    .filter((t) => t.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 3);

  const priorityColor: Record<string, string> = {
    urgent: "text-red-400 bg-red-500/10 border-red-500/30",
    high: "text-orange-400 bg-orange-500/10 border-orange-500/30",
    medium: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    low: "text-muted-foreground bg-muted/30 border-border/40",
  };
  const priorityLabel: Record<string, string> = {
    urgent: "জরুরি",
    high: "উচ্চ",
    medium: "মাঝারি",
    low: "নিম্ন",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/40 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-gradient-to-r from-primary/10 via-purple-500/5 to-transparent">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <ListTodo className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">আমার টাস্ক</h3>
            <p className="text-[10px] text-muted-foreground">দৈনিক কাজের সারাংশ</p>
          </div>
        </div>
        <Link
          to="/tasks"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/15 hover:bg-primary/25 text-primary text-xs font-semibold transition-colors border border-primary/30"
        >
          সব দেখুন
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3">
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3">
          <div className="flex items-center justify-between mb-1">
            <Inbox className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-[9px] text-muted-foreground uppercase">প্রাপ্ত</span>
          </div>
          <div className="text-2xl font-extrabold text-blue-300">{bnNum(pending.length)}</div>
          <div className="text-[10px] text-muted-foreground">বাকি আছে</div>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="flex items-center justify-between mb-1">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[9px] text-muted-foreground uppercase">চলমান</span>
          </div>
          <div className="text-2xl font-extrabold text-amber-300">{bnNum(inProgress.length)}</div>
          <div className="text-[10px] text-muted-foreground">এখন কাজ চলছে</div>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="flex items-center justify-between mb-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[9px] text-muted-foreground uppercase">সম্পন্ন</span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-300">{bnNum(doneToday.length)}</div>
          <div className="text-[10px] text-muted-foreground">শেষ করা হয়েছে</div>
        </div>

        <div className={`rounded-xl border p-3 ${overdue.length > 0 ? "border-red-500/40 bg-red-500/10 animate-pulse" : "border-border/30 bg-muted/10"}`}>
          <div className="flex items-center justify-between mb-1">
            <AlertTriangle className={`h-3.5 w-3.5 ${overdue.length > 0 ? "text-red-400" : "text-muted-foreground"}`} />
            <span className="text-[9px] text-muted-foreground uppercase">মেয়াদোত্তীর্ণ</span>
          </div>
          <div className={`text-2xl font-extrabold ${overdue.length > 0 ? "text-red-300" : "text-muted-foreground"}`}>{bnNum(overdue.length)}</div>
          <div className="text-[10px] text-muted-foreground">দ্রুত করুন</div>
        </div>
      </div>

      {/* Upcoming list */}
      {upcoming.length > 0 && (
        <div className="px-3 pb-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-1.5">পরবর্তী ডেডলাইন</div>
          <div className="space-y-1.5">
            {upcoming.map((t) => {
              const due = new Date(t.due_date!);
              const isOverdue = due < today;
              const dayDiff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              return (
                <Link
                  key={t.id}
                  to="/tasks"
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-muted/20 hover:bg-muted/40 border border-border/30 transition-colors group"
                >
                  <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${priorityColor[t.priority] ?? priorityColor.medium}`}>
                    {priorityLabel[t.priority] ?? t.priority}
                  </span>
                  <span className="flex-1 text-xs text-foreground truncate group-hover:text-primary transition-colors">{t.title}</span>
                  <span className={`text-[10px] font-semibold whitespace-nowrap ${isOverdue ? "text-red-400" : dayDiff <= 1 ? "text-amber-400" : "text-muted-foreground"}`}>
                    {isOverdue ? `${bnNum(Math.abs(dayDiff))} দিন দেরি` : dayDiff === 0 ? "আজ" : dayDiff === 1 ? "কাল" : `${bnNum(dayDiff)} দিনে`}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {pending.length === 0 && (
        <div className="px-4 py-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-400/60 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">কোনো বাকি টাস্ক নেই 🎉</p>
        </div>
      )}

      {/* Sent footer */}
      {sent.length > 0 && (
        <div className="px-4 py-2 border-t border-border/30 bg-muted/10 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Send className="h-3 w-3" />
            <span>আপনি দিয়েছেন <span className="font-bold text-foreground">{bnNum(sent.length)}</span> টি টাস্ক</span>
          </div>
          <span className="text-emerald-400">{bnNum(sent.filter((t) => t.status === "done").length)} টি সম্পন্ন</span>
        </div>
      )}
    </motion.div>
  );
}
