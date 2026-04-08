import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Calendar, MapPin, Users, DollarSign, FileText, CheckCircle2, Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const statusMap: Record<string, { label: string; color: string }> = {
  upcoming: { label: "আসন্ন", color: "bg-sky-500/20 text-sky-400" },
  ongoing: { label: "চলছে", color: "bg-amber-500/20 text-amber-400" },
  completed: { label: "সম্পন্ন", color: "bg-emerald-500/20 text-emerald-400" },
  paid: { label: "পেইড", color: "bg-violet-500/20 text-violet-400" },
};

export default function ClientDashboard() {
  const { user, loading } = useAuth();
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const { data: clientProfile } = useQuery({
    queryKey: ["client-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("client_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["client-projects", clientProfile?.id],
    enabled: !!clientProfile?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("freelance_projects")
        .select("*")
        .eq("client_profile_id", clientProfile.id)
        .order("project_date", { ascending: false });
      return data || [];
    },
  });

  const { data: allAssignments = [] } = useQuery({
    queryKey: ["client-assignments", clientProfile?.id],
    enabled: !!clientProfile?.id && projects.length > 0,
    queryFn: async () => {
      const projectIds = projects.map((p: any) => p.id);
      const { data } = await supabase
        .from("freelance_assignments")
        .select("*, profiles(full_name)")
        .in("project_id", projectIds);
      return data || [];
    },
  });

  const { data: allScenes = [] } = useQuery({
    queryKey: ["client-scenes", clientProfile?.id],
    enabled: !!clientProfile?.id && projects.length > 0,
    queryFn: async () => {
      const projectIds = projects.map((p: any) => p.id);
      const { data } = await (supabase as any)
        .from("freelance_scenes")
        .select("*")
        .in("project_id", projectIds)
        .order("sort_order");
      return data || [];
    },
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const getAssignments = (pid: string) => allAssignments.filter((a: any) => a.project_id === pid);
  const getScenes = (pid: string) => allScenes.filter((s: any) => s.project_id === pid);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">স্বাগতম, {clientProfile?.name || "ক্লায়েন্ট"}</h1>
              <p className="text-xs text-muted-foreground">আইডি: {clientProfile?.client_id} {clientProfile?.company && `• ${clientProfile.company}`}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()} className="gap-1.5">
            <LogOut className="h-4 w-4" /> লগআউট
          </Button>
        </div>

        {/* Projects */}
        {projects.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">কোনো প্রজেক্ট নেই</div>
        ) : (
          <div className="space-y-4">
            {projects.map((p: any) => {
              const assigns = getAssignments(p.id);
              const scenes = getScenes(p.id);
              const memberCost = assigns.reduce((s: number, a: any) => s + Number(a.rate || 0), 0);
              const totalCost = Number(p.total_expense) + memberCost;
              const profit = Number(p.total_budget) - totalCost;
              const st = statusMap[p.status] || statusMap.upcoming;
              const isOpen = expandedProject === p.id;

              return (
                <Card key={p.id} className="border-border/50 overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                    onClick={() => setExpandedProject(isOpen ? null : p.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{p.name}</h3>
                          <Badge variant="outline" className={st.color}>{st.label}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {format(new Date(p.project_date), "d MMM yyyy", { locale: bn })}</span>
                          {p.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {p.location}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-foreground">৳{Number(p.total_budget).toLocaleString("bn-BD")}</div>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-4 border-t border-border/30 pt-4">
                          {/* Financial Summary */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="rounded-lg bg-sky-500/10 p-3 text-center">
                              <div className="text-xs text-muted-foreground">বাজেট</div>
                              <div className="font-bold text-sky-400">৳{Number(p.total_budget).toLocaleString("bn-BD")}</div>
                            </div>
                            <div className="rounded-lg bg-amber-500/10 p-3 text-center">
                              <div className="text-xs text-muted-foreground">খরচ</div>
                              <div className="font-bold text-amber-400">৳{Number(p.total_expense).toLocaleString("bn-BD")}</div>
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

                          {/* Team */}
                          {assigns.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                                <Users className="h-4 w-4" /> টিম সদস্য
                              </h4>
                              <div className="space-y-1.5">
                                {assigns.map((a: any) => (
                                  <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
                                    <div>
                                      <div className="text-sm font-medium text-foreground">{a.profiles?.full_name || "—"}</div>
                                      <div className="text-xs text-muted-foreground">{a.role_label}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-bold text-foreground">৳{Number(a.rate).toLocaleString("bn-BD")}</div>
                                      <div className={`text-[10px] flex items-center gap-0.5 justify-end ${a.is_paid ? "text-emerald-400" : "text-amber-400"}`}>
                                        {a.is_paid ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                        {a.is_paid ? "পেইড" : "বাকি"}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Scenes */}
                          {scenes.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                                <FileText className="h-4 w-4" /> শুটিং লাইনআপ
                              </h4>
                              <div className="rounded-lg border border-border/30 overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-secondary/30 border-b border-border/30">
                                      <th className="text-left p-2.5 font-medium text-foreground w-14">সিন</th>
                                      <th className="text-left p-2.5 font-medium text-foreground">বিবরণ</th>
                                      <th className="text-left p-2.5 font-medium text-foreground">লোকেশন</th>
                                      <th className="text-left p-2.5 font-medium text-foreground">চরিত্র</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {scenes.map((s: any) => (
                                      <tr key={s.id} className="border-b border-border/15">
                                        <td className="p-2.5 font-bold text-foreground">{s.scene_number}</td>
                                        <td className="p-2.5 text-foreground">{s.description || "—"}</td>
                                        <td className="p-2.5 text-muted-foreground">{s.location || "—"}</td>
                                        <td className="p-2.5 text-muted-foreground">{s.characters || "—"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {p.notes && <p className="text-xs text-muted-foreground italic">নোট: {p.notes}</p>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}