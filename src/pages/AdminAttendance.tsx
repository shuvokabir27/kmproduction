import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Save, History, ChevronDown, ChevronRight, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminAttendance = () => {
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedShooting, setSelectedShooting] = useState<string>("");
  const [attendanceData, setAttendanceData] = useState<Record<string, { present: boolean; rate: string }>>({});
  const [saving, setSaving] = useState(false);
  const [expandedShootings, setExpandedShootings] = useState<Set<string>>(new Set());

  const { data: shootings } = useQuery({
    queryKey: ["admin-shootings-list"],
    queryFn: async () => {
      const { data } = await supabase.from("shootings").select("*").order("shoot_date", { ascending: false });
      return data ?? [];
    },
  });

  const { data: members } = useQuery({
    queryKey: ["admin-members-list"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("is_active", true).order("member_id");
      return data ?? [];
    },
  });

  const { data: existingAttendance } = useQuery({
    queryKey: ["existing-attendance", selectedShooting],
    enabled: !!selectedShooting,
    queryFn: async () => {
      const { data } = await supabase.from("attendance").select("*").eq("shooting_id", selectedShooting);
      if (data) {
        const map: Record<string, { present: boolean; rate: string }> = {};
        data.forEach((a) => {
          map[a.member_id] = { present: a.is_present ?? false, rate: String(a.daily_rate || 0) };
        });
        setAttendanceData(map);
      }
      return data ?? [];
    },
  });

  const { data: allAttendance } = useQuery({
    queryKey: ["all-attendance-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("*, profiles(full_name, member_id), shootings(name, shoot_date)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const togglePresent = (memberId: string) => {
    setAttendanceData((prev) => ({
      ...prev,
      [memberId]: {
        present: !prev[memberId]?.present,
        rate: prev[memberId]?.rate || "0",
      },
    }));
  };

  const setRate = (memberId: string, rate: string) => {
    setAttendanceData((prev) => ({
      ...prev,
      [memberId]: {
        present: prev[memberId]?.present ?? false,
        rate,
      },
    }));
  };

  const handleSave = async () => {
    if (!selectedShooting) return;
    setSaving(true);
    try {
      for (const member of members ?? []) {
        const data = attendanceData[member.id] || { present: false, rate: "0" };
        const existing = existingAttendance?.find((a) => a.member_id === member.id);

        if (existing) {
          await supabase.from("attendance").update({
            is_present: data.present,
            daily_rate: Number(data.rate) || 0,
          }).eq("id", existing.id);
        } else {
          await supabase.from("attendance").insert({
            shooting_id: selectedShooting,
            member_id: member.id,
            is_present: data.present,
            daily_rate: Number(data.rate) || 0,
          });
        }
      }
      toast.success("হাজিরা সেভ হয়েছে!");
      queryClient.invalidateQueries({ queryKey: ["existing-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["all-attendance-history"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredHistory = (allAttendance ?? []).filter((a: any) => {
    if (historyShootingFilter !== "all" && a.shooting_id !== historyShootingFilter) return false;
    if (historyMemberFilter !== "all" && a.member_id !== historyMemberFilter) return false;
    return true;
  });

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" /> হাজিরা ম্যানেজমেন্ট
        </h1>

        <Tabs defaultValue="manage" className="w-full">
          <TabsList className="bg-secondary border border-border/30">
            <TabsTrigger value="manage" className="gap-2"><Calendar className="h-4 w-4" /> হাজিরা দিন</TabsTrigger>
            <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> হিস্ট্রি</TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-4 mt-4">
            <div className="flex items-end gap-4">
              <div className="flex-1 max-w-xs">
                <Label className="text-foreground mb-1 block">শুটিং নির্বাচন করুন</Label>
                <Select value={selectedShooting} onValueChange={setSelectedShooting}>
                  <SelectTrigger className="bg-secondary border-border/50">
                    <SelectValue placeholder="শুটিং নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/50">
                    {shootings?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({new Date(s.shoot_date).toLocaleDateString("bn-BD")})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedShooting && (
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" /> {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
                </Button>
              )}
            </div>

            {selectedShooting && (
              <Card className="bg-card border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left p-3 text-muted-foreground font-medium">আইডি</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">নাম</th>
                        <th className="text-center p-3 text-muted-foreground font-medium">উপস্থিত</th>
                        <th className="text-left p-3 text-muted-foreground font-medium">দৈনিক রেট (৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {members?.map((m) => (
                        <tr key={m.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="p-3 text-muted-foreground font-mono text-xs">{m.member_id}</td>
                          <td className="p-3 text-foreground">{m.full_name}</td>
                          <td className="p-3 text-center">
                            <Checkbox
                              checked={attendanceData[m.id]?.present || false}
                              onCheckedChange={() => togglePresent(m.id)}
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              value={attendanceData[m.id]?.rate || "0"}
                              onChange={(e) => setRate(m.id, e.target.value)}
                              className="w-28 bg-secondary border-border/50 h-8"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-3">
              <div className="w-48">
                <Label className="text-foreground mb-1 block text-xs">শুটিং ফিল্টার</Label>
                <Select value={historyShootingFilter} onValueChange={setHistoryShootingFilter}>
                  <SelectTrigger className="bg-secondary border-border/50 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/50">
                    <SelectItem value="all">সব শুটিং</SelectItem>
                    {shootings?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Label className="text-foreground mb-1 block text-xs">সদস্য ফিল্টার</Label>
                <Select value={historyMemberFilter} onValueChange={setHistoryMemberFilter}>
                  <SelectTrigger className="bg-secondary border-border/50 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/50">
                    <SelectItem value="all">সব সদস্য</SelectItem>
                    {members?.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card className="bg-card border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left p-3 text-muted-foreground font-medium">সদস্য</th>
                      <th className="text-left p-3 text-muted-foreground font-medium">শুটিং</th>
                      <th className="text-left p-3 text-muted-foreground font-medium hidden sm:table-cell">তারিখ</th>
                      <th className="text-center p-3 text-muted-foreground font-medium">স্ট্যাটাস</th>
                      <th className="text-right p-3 text-muted-foreground font-medium">রেট (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {filteredHistory.length === 0 && (
                      <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">কোনো হাজিরা রেকর্ড নেই</td></tr>
                    )}
                    {filteredHistory.map((a: any) => (
                      <tr key={a.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="p-3">
                          <p className="text-foreground">{a.profiles?.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground font-mono">#{a.profiles?.member_id}</p>
                        </td>
                        <td className="p-3 text-foreground">{a.shootings?.name || "—"}</td>
                        <td className="p-3 text-muted-foreground hidden sm:table-cell">
                          {a.shootings?.shoot_date ? new Date(a.shootings.shoot_date).toLocaleDateString("bn-BD") : "—"}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_present ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                            {a.is_present ? "উপস্থিত" : "অনুপস্থিত"}
                          </span>
                        </td>
                        <td className="p-3 text-right text-foreground">৳{Number(a.daily_rate || 0).toLocaleString("bn-BD")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default AdminAttendance;
