import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, Calendar, MapPin, Users, DollarSign, FileText, Download, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { toPng } from "html-to-image";
import { useRef } from "react";

const statusMap: Record<string, string> = {
  upcoming: "আসন্ন",
  ongoing: "চলছে",
  completed: "সম্পন্ন",
  paid: "পেইড",
};

export default function FreelanceClientView() {
  const { token } = useParams<{ token: string }>();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: project, isLoading, error } = useQuery({
    queryKey: ["client-project", token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("freelance_projects")
        .select("*")
        .eq("share_token", token!)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Project not found");
      return data;
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["client-assignments", project?.id],
    enabled: !!project?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("freelance_assignments")
        .select("*, profiles(full_name)")
        .eq("project_id", project!.id)
        .order("created_at");
      return data || [];
    },
  });

  const { data: scenes = [] } = useQuery({
    queryKey: ["client-scenes", project?.id],
    enabled: !!project?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("freelance_scenes")
        .select("*")
        .eq("project_id", project!.id)
        .order("sort_order");
      return data || [];
    },
  });

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    try {
      const dataUrl = await toPng(printRef.current, { 
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        style: { color: "#000000" }
      });
      const link = document.createElement("a");
      link.download = `${project?.name || "lineup"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">লোড হচ্ছে...</div>;
  if (error || !project) return <div className="min-h-screen flex items-center justify-center bg-background text-destructive">প্রজেক্ট পাওয়া যায়নি</div>;

  const memberCost = assignments.reduce((s: number, a: any) => s + Number(a.rate || 0), 0);
  const totalCost = Number(project.total_expense) + memberCost;
  const profit = Number(project.total_budget) - totalCost;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{project.name}</h1>
              <p className="text-sm text-muted-foreground">{project.client_name}</p>
            </div>
          </div>
          <Badge variant="outline">{statusMap[project.status] || project.status}</Badge>
        </div>

        {/* Project Info */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {format(new Date(project.project_date), "d MMMM yyyy", { locale: bn })}</span>
              {project.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {project.location}</span>}
              {project.client_phone && <span className="flex items-center gap-1.5">📞 {project.client_phone}</span>}
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> আর্থিক সামারি
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg bg-sky-500/10 p-3 text-center">
                <div className="text-xs text-muted-foreground">বাজেট</div>
                <div className="font-bold text-sky-400">৳{Number(project.total_budget).toLocaleString("bn-BD")}</div>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-3 text-center">
                <div className="text-xs text-muted-foreground">অন্যান্য খরচ</div>
                <div className="font-bold text-amber-400">৳{Number(project.total_expense).toLocaleString("bn-BD")}</div>
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
          </CardContent>
        </Card>

        {/* Team Members */}
        {assignments.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> টিম সদস্য
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {assignments.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div>
                    <div className="text-sm font-medium text-foreground">{a.profiles?.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{a.role_label}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-foreground">৳{Number(a.rate).toLocaleString("bn-BD")}</div>
                    <div className={`text-[10px] ${a.is_paid ? "text-emerald-400" : "text-amber-400"}`}>
                      {a.is_paid ? "✅ পেমেন্ট সম্পন্ন" : "⏳ বাকি আছে"}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Shooting Lineup */}
        {scenes.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> শুটিং লাইনআপ
              </h2>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-1.5">
                <Download className="h-4 w-4" /> ডাউনলোড
              </Button>
            </div>

            {/* Printable area */}
            <div ref={printRef} className="space-y-0">
              <div className="bg-card border border-border/50 rounded-lg overflow-hidden">
                {/* Print header */}
                <div className="bg-primary/5 p-4 border-b border-border/30" style={{ color: "#000" }}>
                  <h3 className="font-bold text-lg" style={{ color: "#000" }}>{project.name}</h3>
                  <p className="text-sm" style={{ color: "#555" }}>
                    {project.client_name} • {format(new Date(project.project_date), "d MMMM yyyy", { locale: bn })}
                    {project.location && ` • ${project.location}`}
                  </p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 bg-secondary/30">
                      <th className="text-left p-3 font-medium text-foreground w-16">সিন</th>
                      <th className="text-left p-3 font-medium text-foreground">বিবরণ</th>
                      <th className="text-left p-3 font-medium text-foreground">লোকেশন</th>
                      <th className="text-left p-3 font-medium text-foreground">চরিত্র</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenes.map((scene: any, i: number) => (
                      <tr key={scene.id} className={`border-b border-border/15 ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                        <td className="p-3 font-bold text-foreground">{scene.scene_number}</td>
                        <td className="p-3 text-foreground">{scene.description || "—"}</td>
                        <td className="p-3 text-muted-foreground">{scene.location || "—"}</td>
                        <td className="p-3 text-muted-foreground">{scene.characters || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Financial summary in print */}
                <div className="p-4 border-t border-border/30 bg-secondary/10">
                  <div className="flex flex-wrap gap-4 text-sm" style={{ color: "#000" }}>
                    <span>বাজেট: <strong>৳{Number(project.total_budget).toLocaleString("bn-BD")}</strong></span>
                    <span>খরচ: <strong>৳{totalCost.toLocaleString("bn-BD")}</strong></span>
                    <span>লাভ: <strong className={profit >= 0 ? "text-emerald-600" : "text-red-600"}>৳{profit.toLocaleString("bn-BD")}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {scenes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">কোনো শুটিং লাইনআপ যুক্ত হয়নি</div>
        )}
      </div>
    </div>
  );
}