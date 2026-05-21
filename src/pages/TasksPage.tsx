import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Calendar, User, Clock, CheckCircle2, Circle, PlayCircle, XCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
type TaskPriority = "low" | "medium" | "high" | "urgent";

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; icon: string }> = {
  urgent: { label: "জরুরি", color: "bg-red-500/20 text-red-300 border-red-400/40", icon: "🔴" },
  high: { label: "উচ্চ", color: "bg-red-500/20 text-red-300 border-red-400/40", icon: "🟠" },
  medium: { label: "মাঝারি", color: "bg-red-500/20 text-red-300 border-red-400/40", icon: "🟡" },
  low: { label: "কম", color: "bg-red-500/20 text-red-300 border-red-400/40", icon: "🟢" },
};

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; Icon: typeof Circle }> = {
  todo: { label: "করতে হবে", color: "text-slate-300", Icon: Circle },
  in_progress: { label: "চলছে", color: "text-cyan-300", Icon: PlayCircle },
  done: { label: "সম্পন্ন", color: "text-red-300", Icon: CheckCircle2 },
  cancelled: { label: "বাতিল", color: "text-rose-300", Icon: XCircle },
};

export default function TasksPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"received" | "sent">("received");

  // Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");

  // All members for assignment dropdown
  const { data: members } = useQuery({
    queryKey: ["all-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, photo_url")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Tasks
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["my-tasks", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from("member_tasks")
        .select("*")
        .or(`assigned_to.eq.${profile.id},assigned_by.eq.${profile.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.id,
  });

  const memberMap = new Map((members ?? []).map((m: any) => [m.id, m]));

  const received = (tasks ?? []).filter((t: any) => t.assigned_to === profile?.id);
  const sent = (tasks ?? []).filter((t: any) => t.assigned_by === profile?.id);

  const createTask = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error("No profile");
      if (!title.trim()) throw new Error("শিরোনাম দিন");
      if (!assignTo) throw new Error("কাকে দিবেন বেছে নিন");
      const { error } = await supabase.from("member_tasks").insert({
        title: title.trim(),
        description: description.trim() || null,
        assigned_to: assignTo,
        assigned_by: profile.id,
        priority,
        due_date: dueDate || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "✅ টাস্ক তৈরি হয়েছে" });
      qc.invalidateQueries({ queryKey: ["my-tasks"] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setAssignTo("");
      setPriority("medium");
      setDueDate("");
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { error } = await supabase.from("member_tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-tasks"] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("member_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "🗑️ টাস্ক ডিলিট হয়েছে" });
      qc.invalidateQueries({ queryKey: ["my-tasks"] });
    },
    onError: (e: any) => toast({ title: "ত্রুটি", description: e.message, variant: "destructive" }),
  });

  const list = tab === "received" ? received : sent;
  const groupedByStatus: Record<TaskStatus, any[]> = {
    todo: list.filter((t: any) => t.status === "todo"),
    in_progress: list.filter((t: any) => t.status === "in_progress"),
    done: list.filter((t: any) => t.status === "done"),
    cancelled: list.filter((t: any) => t.status === "cancelled"),
  };

  const pendingReceived = received.filter((t: any) => t.status === "todo" || t.status === "in_progress").length;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              📋 টাস্ক ম্যানেজার
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {pendingReceived > 0
                ? `আপনার ${pendingReceived}টি টাস্ক বাকি আছে`
                : "সব টাস্ক সম্পন্ন! দারুণ 🎉"}
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                নতুন টাস্ক
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>নতুন টাস্ক তৈরি</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>শিরোনাম *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="যেমন: শুটিং রিপোর্ট তৈরি করুন"
                  />
                </div>
                <div>
                  <Label>বিবরণ</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="বিস্তারিত নির্দেশনা..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>কাকে দিবেন *</Label>
                  <Select value={assignTo} onValueChange={setAssignTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="সদস্য বাছুন" />
                    </SelectTrigger>
                    <SelectContent>
                      {(members ?? []).map((m: any) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.full_name}
                          {m.id === profile?.id && " (আমি)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>প্রায়োরিটি</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
                          <SelectItem key={p} value={p}>
                            {PRIORITY_CONFIG[p].icon} {PRIORITY_CONFIG[p].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>শেষ তারিখ</Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  বাতিল
                </Button>
                <Button onClick={() => createTask.mutate()} disabled={createTask.isPending}>
                  {createTask.isPending ? "তৈরি হচ্ছে..." : "তৈরি করুন"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="received" className="gap-2">
              আমাকে দেওয়া
              {pendingReceived > 0 && (
                <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {pendingReceived}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent">আমি দিয়েছি</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-6">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">লোড হচ্ছে...</div>
            ) : list.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-40" />
                {tab === "received" ? "আপনাকে কোনো টাস্ক দেওয়া হয়নি" : "আপনি কোনো টাস্ক দেননি"}
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((status) => {
                  const items = groupedByStatus[status];
                  const cfg = STATUS_CONFIG[status];
                  return (
                    <div key={status} className="space-y-2">
                      <div className={`flex items-center gap-2 text-sm font-bold ${cfg.color}`}>
                        <cfg.Icon className="h-4 w-4" />
                        {cfg.label}
                        <span className="text-muted-foreground font-normal">({items.length})</span>
                      </div>
                      <AnimatePresence>
                        {items.map((task: any) => {
                          const otherUser = memberMap.get(
                            tab === "received" ? task.assigned_by : task.assigned_to
                          );
                          const pcfg = PRIORITY_CONFIG[task.priority as TaskPriority];
                          const isOverdue =
                            task.due_date &&
                            new Date(task.due_date) < new Date() &&
                            task.status !== "done" &&
                            task.status !== "cancelled";
                          return (
                            <motion.div
                              key={task.id}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                            >
                              <Card className="p-3 hover:border-primary/50 transition-colors space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="font-semibold text-sm leading-tight flex-1">{task.title}</h3>
                                  <span
                                    className={`text-[9px] px-1.5 py-0.5 rounded border font-bold shrink-0 ${pcfg.color}`}
                                  >
                                    {pcfg.icon}
                                  </span>
                                </div>

                                {task.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                                )}

                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                  <User className="h-3 w-3" />
                                  <span className="truncate">
                                    {tab === "received" ? "থেকে: " : "প্রতি: "}
                                    {otherUser?.full_name ?? "অজানা"}
                                  </span>
                                </div>

                                {task.due_date && (
                                  <div
                                    className={`flex items-center gap-1 text-[10px] ${
                                      isOverdue ? "text-red-400 font-bold" : "text-muted-foreground"
                                    }`}
                                  >
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(task.due_date), "dd MMM yyyy")}
                                    {isOverdue && " (পার হয়েছে!)"}
                                  </div>
                                )}

                                <div className="flex items-center gap-1 pt-2 border-t border-border/30">
                                  <Select
                                    value={task.status}
                                    onValueChange={(v) =>
                                      updateStatus.mutate({ id: task.id, status: v as TaskStatus })
                                    }
                                  >
                                    <SelectTrigger className="h-7 text-[10px] flex-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => (
                                        <SelectItem key={s} value={s} className="text-xs">
                                          {STATUS_CONFIG[s].label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {task.assigned_by === profile?.id && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                      onClick={() => {
                                        if (confirm("এই টাস্ক ডিলিট করবেন?")) deleteTask.mutate(task.id);
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </Card>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                      {items.length === 0 && (
                        <div className="text-[10px] text-muted-foreground/60 italic px-1">কিছু নেই</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
