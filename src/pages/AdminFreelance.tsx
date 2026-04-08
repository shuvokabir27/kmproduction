import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import {
  Plus, Briefcase, MapPin, Phone, Calendar, Users, DollarSign,
  CheckCircle2, XCircle, ChevronDown, ChevronUp, Trash2, Edit, TrendingUp,
  Link2, FileText, Copy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type FreelanceProject = {
  id: string;
  name: string;
  client_name: string;
  client_phone: string | null;
  project_date: string;
  location: string | null;
  total_budget: number;
  total_expense: number;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  share_token: string | null;
};

type FreelanceAssignment = {
  id: string;
  project_id: string;
  member_id: string;
  role_label: string;
  rate: number;
  is_paid: boolean;
  paid_amount: number;
  notes: string | null;
  created_at: string;
  profiles?: { full_name: string; photo_url: string | null } | null;
};

const statusMap: Record<string, { label: string; color: string }> = {
  upcoming: { label: "আসন্ন", color: "bg-sky-500/20 text-sky-400 border-sky-500/30" },
  ongoing: { label: "চলছে", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  completed: { label: "সম্পন্ন", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  paid: { label: "পেইড", color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
};

export default function AdminFreelance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [openProject, setOpenProject] = useState<string | null>(null);
  const [projectDialog, setProjectDialog] = useState(false);
  const [editProject, setEditProject] = useState<FreelanceProject | null>(null);
  const [assignDialog, setAssignDialog] = useState<string | null>(null);
  const [lineupDialog, setLineupDialog] = useState<string | null>(null);
  const [sceneForm, setSceneForm] = useState({ scene_number: "", description: "", location: "", characters: "" });

  // Form state
  const [form, setForm] = useState({ name: "", client_name: "", client_phone: "", project_date: "", location: "", total_budget: "", notes: "" });
  const [assignForm, setAssignForm] = useState({ member_id: "", role_label: "", rate: "" });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["freelance-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("freelance_projects")
        .select("*")
        .order("project_date", { ascending: false });
      if (error) throw error;
      return data as FreelanceProject[];
    },
  });

  const { data: allAssignments = [] } = useQuery({
    queryKey: ["freelance-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("freelance_assignments")
        .select("*, profiles(full_name, photo_url)")
        .order("created_at");
      if (error) throw error;
      return data as FreelanceAssignment[];
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members-list"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, photo_url").eq("is_active", true).order("full_name");
      return data || [];
    },
  });

  const { data: allScenes = [] } = useQuery({
    queryKey: ["freelance-scenes"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("freelance_scenes").select("*").order("sort_order");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (isEdit: boolean) => {
      const payload = {
        name: form.name,
        client_name: form.client_name,
        client_phone: form.client_phone || null,
        project_date: form.project_date,
        location: form.location || null,
        total_budget: Number(form.total_budget) || 0,
        notes: form.notes || null,
        ...(isEdit ? {} : { created_by: user?.id || null }),
      };
      if (isEdit && editProject) {
        const { error } = await supabase.from("freelance_projects").update(payload).eq("id", editProject.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("freelance_projects").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["freelance-projects"] });
      setProjectDialog(false);
      setEditProject(null);
      setForm({ name: "", client_name: "", client_phone: "", project_date: "", location: "", total_budget: "", notes: "" });
      toast({ title: "সফল!", description: "প্রজেক্ট সেভ হয়েছে" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("freelance_projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["freelance-projects"] });
      toast({ title: "মুছে ফেলা হয়েছে" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("freelance_projects").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["freelance-projects"] }),
  });

  const assignMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.from("freelance_assignments").insert({
        project_id: projectId,
        member_id: assignForm.member_id,
        role_label: assignForm.role_label,
        rate: Number(assignForm.rate) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["freelance-assignments"] });
      setAssignDialog(null);
      setAssignForm({ member_id: "", role_label: "", rate: "" });
      toast({ title: "সদস্য যুক্ত হয়েছে" });
    },
  });

  const togglePaidMutation = useMutation({
    mutationFn: async ({ id, is_paid, rate }: { id: string; is_paid: boolean; rate: number }) => {
      const { error } = await supabase.from("freelance_assignments").update({
        is_paid: !is_paid,
        paid_amount: !is_paid ? rate : 0,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["freelance-assignments"] }),
  });

  const removeAssignMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("freelance_assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["freelance-assignments"] }),
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, total_expense }: { id: string; total_expense: number }) => {
      const { error } = await supabase.from("freelance_projects").update({ total_expense }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["freelance-projects"] }),
  });

  const addSceneMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const projectScenes = allScenes.filter((s: any) => s.project_id === projectId);
      const { error } = await (supabase as any).from("freelance_scenes").insert({
        project_id: projectId,
        scene_number: Number(sceneForm.scene_number) || (projectScenes.length + 1),
        description: sceneForm.description || null,
        location: sceneForm.location || null,
        characters: sceneForm.characters || null,
        sort_order: projectScenes.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["freelance-scenes"] });
      setSceneForm({ scene_number: "", description: "", location: "", characters: "" });
      toast({ title: "সিন যুক্ত হয়েছে" });
    },
  });

  const deleteSceneMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("freelance_scenes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["freelance-scenes"] }),
  });

  const generateShareToken = useMutation({
    mutationFn: async (projectId: string) => {
      const token = crypto.randomUUID().replace(/-/g, "").substring(0, 12);
      const { error } = await supabase.from("freelance_projects").update({ share_token: token } as any).eq("id", projectId);
      if (error) throw error;
      return token;
    },
    onSuccess: (token) => {
      qc.invalidateQueries({ queryKey: ["freelance-projects"] });
      const url = `${window.location.origin}/project/${token}`;
      navigator.clipboard.writeText(url);
      toast({ title: "লিংক কপি হয়েছে!", description: url });
    },
  });

  const openEditDialog = (p: FreelanceProject) => {
    setEditProject(p);
    setForm({
      name: p.name,
      client_name: p.client_name,
      client_phone: p.client_phone || "",
      project_date: p.project_date,
      location: p.location || "",
      total_budget: String(p.total_budget),
      notes: p.notes || "",
    });
    setProjectDialog(true);
  };

  const getAssignments = (projectId: string) => allAssignments.filter(a => a.project_id === projectId);
  const getScenes = (projectId: string) => allScenes.filter((s: any) => s.project_id === projectId);

  const totalMemberCost = (projectId: string) => getAssignments(projectId).reduce((s, a) => s + a.rate, 0);

  // Monthly summary
  const monthlySummary = projects.reduce((acc, p) => {
    const month = p.project_date.substring(0, 7);
    if (!acc[month]) acc[month] = { budget: 0, expense: 0, memberCost: 0, count: 0 };
    acc[month].budget += p.total_budget;
    acc[month].expense += p.total_expense;
    acc[month].memberCost += totalMemberCost(p.id);
    acc[month].count += 1;
    return acc;
  }, {} as Record<string, { budget: number; expense: number; memberCost: number; count: number }>);

  const sortedMonths = Object.keys(monthlySummary).sort().reverse();

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">বাইরের কাজ</h1>
              <p className="text-xs text-muted-foreground">ফ্রিল্যান্স প্রজেক্ট ম্যানেজমেন্ট</p>
            </div>
          </div>
          <Button onClick={() => { setEditProject(null); setForm({ name: "", client_name: "", client_phone: "", project_date: "", location: "", total_budget: "", notes: "" }); setProjectDialog(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> নতুন প্রজেক্ট
          </Button>
        </div>

        <Tabs defaultValue="projects">
          <TabsList>
            <TabsTrigger value="projects">প্রজেক্ট সমূহ</TabsTrigger>
            <TabsTrigger value="summary">মাসিক হিসাব</TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">লোড হচ্ছে...</div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">কোনো প্রজেক্ট নেই। নতুন প্রজেক্ট তৈরি করুন।</div>
            ) : (
              <div className="grid gap-4">
                {projects.map((p) => {
                  const assigns = getAssignments(p.id);
                  const memberCost = assigns.reduce((s, a) => s + a.rate, 0);
                  const totalCost = p.total_expense + memberCost;
                  const profit = p.total_budget - totalCost;
                  const isOpen = openProject === p.id;
                  const st = statusMap[p.status] || statusMap.upcoming;

                  return (
                    <motion.div key={p.id} layout>
                      <Card className="border-border/50 overflow-hidden">
                        <div
                          className="p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                          onClick={() => setOpenProject(isOpen ? null : p.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-foreground">{p.name}</h3>
                                <Badge variant="outline" className={st.color}>{st.label}</Badge>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{p.client_name}</span>
                                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(new Date(p.project_date), "d MMM yyyy", { locale: bn })}</span>
                                {p.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{p.location}</span>}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-sm font-medium text-foreground">বাজেট: ৳{p.total_budget.toLocaleString("bn-BD")}</div>
                              <div className={`text-xs ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                লাভ: ৳{profit.toLocaleString("bn-BD")}
                              </div>
                              {isOpen ? <ChevronUp className="h-4 w-4 mt-1 ml-auto text-muted-foreground" /> : <ChevronDown className="h-4 w-4 mt-1 ml-auto text-muted-foreground" />}
                            </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-4">
                                {/* Summary */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <div className="rounded-lg bg-sky-500/10 p-3 text-center">
                                    <div className="text-xs text-muted-foreground">বাজেট</div>
                                    <div className="font-bold text-sky-400">৳{p.total_budget.toLocaleString("bn-BD")}</div>
                                  </div>
                                  <div className="rounded-lg bg-amber-500/10 p-3 text-center">
                                    <div className="text-xs text-muted-foreground">অন্যান্য খরচ</div>
                                    <div className="font-bold text-amber-400">৳{p.total_expense.toLocaleString("bn-BD")}</div>
                                  </div>
                                  <div className="rounded-lg bg-violet-500/10 p-3 text-center">
                                    <div className="text-xs text-muted-foreground">সদস্য খরচ</div>
                                    <div className="font-bold text-violet-400">৳{memberCost.toLocaleString("bn-BD")}</div>
                                  </div>
                                  <div className={`rounded-lg p-3 text-center ${profit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                                    <div className="text-xs text-muted-foreground">লাভ</div>
                                    <div className={`font-bold ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>৳{profit.toLocaleString("bn-BD")}</div>
                                  </div>
                                </div>

                                {/* Expense input */}
                                <div className="flex items-center gap-2">
                                  <Label className="text-sm shrink-0">অন্যান্য খরচ:</Label>
                                  <Input
                                    type="number"
                                    className="w-32"
                                    defaultValue={p.total_expense}
                                    onBlur={(e) => {
                                      const val = Number(e.target.value);
                                      if (val !== p.total_expense) {
                                        updateExpenseMutation.mutate({ id: p.id, total_expense: val });
                                      }
                                    }}
                                  />
                                </div>

                                {/* Assignments */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-medium text-foreground">টিম সদস্য</h4>
                                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setAssignDialog(p.id); }} className="gap-1 h-7 text-xs">
                                      <Plus className="h-3 w-3" /> যুক্ত
                                    </Button>
                                  </div>
                                  {assigns.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">কোনো সদস্য যুক্ত হয়নি</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {assigns.map((a) => (
                                        <div key={a.id} className="flex items-center gap-3 rounded-lg bg-secondary/30 p-2.5">
                                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                            {a.profiles?.full_name?.charAt(0) || "?"}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-foreground truncate">{a.profiles?.full_name || "—"}</div>
                                            <div className="text-xs text-muted-foreground">{a.role_label || "—"} • ৳{a.rate.toLocaleString("bn-BD")}</div>
                                          </div>
                                          <Button
                                            size="sm"
                                            variant={a.is_paid ? "default" : "outline"}
                                            className={`h-7 text-xs gap-1 ${a.is_paid ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                                            onClick={() => togglePaidMutation.mutate({ id: a.id, is_paid: a.is_paid, rate: a.rate })}
                                          >
                                            {a.is_paid ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                            {a.is_paid ? "পেইড" : "আনপেইড"}
                                          </Button>
                                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeAssignMutation.mutate(a.id)}>
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
                                  <Select value={p.status} onValueChange={(v) => statusMutation.mutate({ id: p.id, status: v })}>
                                    <SelectTrigger className="w-32 h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="upcoming">আসন্ন</SelectItem>
                                      <SelectItem value="ongoing">চলছে</SelectItem>
                                      <SelectItem value="completed">সম্পন্ন</SelectItem>
                                      <SelectItem value="paid">পেইড</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => openEditDialog(p)}>
                                    <Edit className="h-3 w-3" /> এডিট
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setLineupDialog(p.id)}>
                                    <FileText className="h-3 w-3" /> লাইনআপ
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs gap-1"
                                    onClick={() => {
                                      if ((p as any).share_token) {
                                        const url = `${window.location.origin}/project/${(p as any).share_token}`;
                                        navigator.clipboard.writeText(url);
                                        toast({ title: "লিংক কপি হয়েছে!", description: url });
                                      } else {
                                        generateShareToken.mutate(p.id);
                                      }
                                    }}
                                  >
                                    {(p as any).share_token ? <Copy className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                                    {(p as any).share_token ? "লিংক কপি" : "শেয়ার লিংক"}
                                  </Button>
                                  <Button size="sm" variant="destructive" className="h-8 text-xs gap-1" onClick={() => { if (confirm("মুছে ফেলতে চান?")) deleteMutation.mutate(p.id); }}>
                                    <Trash2 className="h-3 w-3" /> মুছুন
                                  </Button>
                                </div>

                                {p.notes && <p className="text-xs text-muted-foreground italic">নোট: {p.notes}</p>}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="summary" className="mt-4">
            {sortedMonths.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">কোনো ডাটা নেই</div>
            ) : (
              <div className="space-y-4">
                {sortedMonths.map((month) => {
                  const s = monthlySummary[month];
                  const totalCost = s.expense + s.memberCost;
                  const profit = s.budget - totalCost;
                  return (
                    <Card key={month} className="border-border/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          {format(new Date(month + "-01"), "MMMM yyyy", { locale: bn })}
                          <Badge variant="secondary" className="ml-auto">{s.count} প্রজেক্ট</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="rounded-lg bg-sky-500/10 p-3 text-center">
                            <div className="text-xs text-muted-foreground">মোট আয়</div>
                            <div className="font-bold text-sky-400">৳{s.budget.toLocaleString("bn-BD")}</div>
                          </div>
                          <div className="rounded-lg bg-amber-500/10 p-3 text-center">
                            <div className="text-xs text-muted-foreground">অন্যান্য খরচ</div>
                            <div className="font-bold text-amber-400">৳{s.expense.toLocaleString("bn-BD")}</div>
                          </div>
                          <div className="rounded-lg bg-violet-500/10 p-3 text-center">
                            <div className="text-xs text-muted-foreground">সদস্য খরচ</div>
                            <div className="font-bold text-violet-400">৳{s.memberCost.toLocaleString("bn-BD")}</div>
                          </div>
                          <div className={`rounded-lg p-3 text-center ${profit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                            <div className="text-xs text-muted-foreground">মোট লাভ</div>
                            <div className={`font-bold ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>৳{profit.toLocaleString("bn-BD")}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Project Create/Edit Dialog */}
        <Dialog open={projectDialog} onOpenChange={setProjectDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editProject ? "প্রজেক্ট এডিট" : "নতুন প্রজেক্ট"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label>প্রজেক্টের নাম *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="যেমন: রাজু নাটক শুটিং" /></div>
              <div><Label>ক্লায়েন্ট *</Label><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} placeholder="ক্লায়েন্টের নাম" /></div>
              <div><Label>ফোন</Label><Input value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} placeholder="ফোন নম্বর" /></div>
              <div><Label>তারিখ *</Label><Input type="date" value={form.project_date} onChange={(e) => setForm({ ...form, project_date: e.target.value })} /></div>
              <div><Label>লোকেশন</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
              <div><Label>বাজেট (৳)</Label><Input type="number" value={form.total_budget} onChange={(e) => setForm({ ...form, total_budget: e.target.value })} placeholder="0" /></div>
              <div><Label>নোট</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              <Button
                className="w-full"
                disabled={!form.name || !form.client_name || !form.project_date}
                onClick={() => saveMutation.mutate(!!editProject)}
              >
                {editProject ? "আপডেট করুন" : "তৈরি করুন"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Assign Member Dialog */}
        <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>সদস্য যুক্ত করুন</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>সদস্য *</Label>
                <Select value={assignForm.member_id} onValueChange={(v) => setAssignForm({ ...assignForm, member_id: v })}>
                  <SelectTrigger><SelectValue placeholder="সদস্য নির্বাচন" /></SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>ভূমিকা</Label><Input value={assignForm.role_label} onChange={(e) => setAssignForm({ ...assignForm, role_label: e.target.value })} placeholder="ক্যামেরাম্যান, প্রডাকশন..." /></div>
              <div><Label>রেট (৳)</Label><Input type="number" value={assignForm.rate} onChange={(e) => setAssignForm({ ...assignForm, rate: e.target.value })} placeholder="0" /></div>
              <Button className="w-full" disabled={!assignForm.member_id} onClick={() => assignDialog && assignMutation.mutate(assignDialog)}>
                যুক্ত করুন
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
