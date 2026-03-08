import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Save, History, ChevronDown, ChevronRight, Users, Trash2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
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
  const [deleteTimers, setDeleteTimers] = useState<Record<string, number>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: shootings } = useQuery({
    queryKey: ["admin-shootings-for-attendance"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shootings")
        .select("*")
        .in("status", ["ongoing", "completed"])
        .order("shoot_date", { ascending: false });
      return data ?? [];
    },
  });

  // Check which shootings already have attendance
  const { data: shootingsWithAttendance } = useQuery({
    queryKey: ["shootings-with-attendance", shootings?.map(s => s.id)],
    enabled: !!shootings && shootings.length > 0,
    queryFn: async () => {
      const ids = shootings!.map(s => s.id);
      const { data } = await supabase.from("attendance").select("shooting_id").in("shooting_id", ids);
      return new Set((data ?? []).map(a => a.shooting_id));
    },
  });

  const { data: members } = useQuery({
    queryKey: ["admin-members-list"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("profiles").select("*").eq("is_active", true).order("member_id");
      return data ?? [];
    },
  });

  const { data: existingAttendance } = useQuery({
    queryKey: ["existing-attendance", selectedShooting],
    enabled: !!selectedShooting,
    queryFn: async () => {
      const { data } = await supabase.from("attendance").select("*").eq("shooting_id", selectedShooting);
      const map: Record<string, { present: boolean; rate: string }> = {};
      if (data && data.length > 0) {
        // Existing attendance — load saved values
        data.forEach((a) => {
          map[a.member_id] = { present: a.is_present ?? false, rate: String(a.daily_rate || 0) };
        });
      } else {
        // New attendance — pre-fill daily_rate from profile for daily members
        members?.forEach((m: any) => {
          if (m.salary_type === "daily" && Number(m.daily_rate || 0) > 0) {
            map[m.id] = { present: false, rate: String(m.daily_rate) };
          }
        });
      }
      setAttendanceData(map);
      return data ?? [];
    },
  });

  const { data: allAttendance } = useQuery({
    queryKey: ["all-attendance-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("*, profiles(full_name, member_id, photo_url, salary_type), shootings(name, shoot_date)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Countdown effect for delete timers
  useEffect(() => {
    const activeTimers = Object.entries(deleteTimers).filter(([, v]) => v > 0);
    if (activeTimers.length === 0) return;

    const interval = setInterval(() => {
      setDeleteTimers((prev) => {
        const next = { ...prev };
        for (const key in next) {
          if (next[key] > 0) next[key]--;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [deleteTimers]);

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

  // Group attendance by shooting
  const groupedByShooting = (allAttendance ?? []).reduce((acc: Record<string, { shooting: any; records: any[] }>, a: any) => {
    if (!acc[a.shooting_id]) {
      acc[a.shooting_id] = { shooting: a.shootings, records: [] };
    }
    acc[a.shooting_id].records.push(a);
    return acc;
  }, {});

  const shootingGroups = Object.entries(groupedByShooting).sort((a, b) => {
    const dateA = a[1].shooting?.shoot_date || "";
    const dateB = b[1].shooting?.shoot_date || "";
    return dateB.localeCompare(dateA);
  });

  const toggleExpand = (id: string) => {
    setExpandedShootings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Start 5-second countdown for delete
  const startDeleteTimer = (shootingId: string) => {
    setDeleteTimers((prev) => ({ ...prev, [shootingId]: 5 }));
  };

  const cancelDeleteTimer = (shootingId: string) => {
    setDeleteTimers((prev) => {
      const next = { ...prev };
      delete next[shootingId];
      return next;
    });
  };




  const handleDeleteAttendance = async (shootingId: string) => {
    if (deleteTimers[shootingId] !== 0) return;
    setDeletingId(shootingId);
    try {
      const { error } = await supabase
        .from("attendance")
        .delete()
        .eq("shooting_id", shootingId);
      if (error) throw error;
      toast.success("হাজিরা ডিলিট হয়েছে! দৈনিক রেটভুক্ত সদস্যদের ব্যালেন্স আপডেট হবে।");
      cancelDeleteTimer(shootingId);
      queryClient.invalidateQueries({ queryKey: ["all-attendance-history"] });
      queryClient.invalidateQueries({ queryKey: ["existing-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["shootings-with-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["member-balance"] });
      queryClient.invalidateQueries({ queryKey: ["admin-total-due"] });
      queryClient.invalidateQueries({ queryKey: ["admin-member-balances"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
        <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
          <Calendar className="h-5 w-5 md:h-6 md:w-6 text-primary" /> হাজিরা
        </h1>

        <Tabs defaultValue="manage" className="w-full">
          <TabsList className="bg-secondary/50 border border-border/20 w-full md:w-auto gap-1 p-1">
            <TabsTrigger value="manage" className="gap-1.5 text-xs flex-1 md:flex-none text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 data-[state=active]:bg-emerald-500/25 data-[state=active]:text-emerald-300"><Calendar className="h-3.5 w-3.5" /> হাজিরা দিন</TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs flex-1 md:flex-none text-violet-400 bg-violet-500/10 border border-violet-500/20 data-[state=active]:bg-violet-500/25 data-[state=active]:text-violet-300"><History className="h-3.5 w-3.5" /> হিস্ট্রি</TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-3 mt-3">
            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div className="flex-1 md:max-w-xs">
                <Label className="text-foreground text-xs mb-1 block">শুটিং নির্বাচন</Label>
                <Select value={selectedShooting} onValueChange={setSelectedShooting}>
                  <SelectTrigger className="bg-secondary border-border/30 h-10 md:h-9">
                    <SelectValue placeholder="শুটিং নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/30">
                    {shootings?.map((s) => {
                      const hasAtt = shootingsWithAttendance?.has(s.id);
                      return (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({new Date(s.shoot_date).toLocaleDateString("bn-BD")}) {hasAtt ? "✏️" : "🆕"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              {selectedShooting && (
                <Button onClick={handleSave} disabled={saving} className="gap-2 h-10 md:h-9" size="sm">
                  <Save className="h-4 w-4" /> {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
                </Button>
              )}
            </div>

            {selectedShooting && (
              <>
                 {/* Mobile card list */}
                 <div className="md:hidden space-y-2">
                   {members?.map((m) => (
                     <Card key={m.id} className="bg-card border-border/30 p-3">
                       <div className="flex items-center justify-between gap-3">
                         <div className="flex items-center gap-2 min-w-0">
                           <Checkbox
                             checked={attendanceData[m.id]?.present || false}
                             onCheckedChange={() => togglePresent(m.id)}
                           />
                           <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                             {m.photo_url ? (
                               <img src={m.photo_url} alt={m.full_name} className="h-full w-full object-cover" />
                             ) : (
                               <span className="text-primary text-xs font-medium">{m.full_name?.charAt(0) || "M"}</span>
                             )}
                           </div>
                           <div className="min-w-0">
                             <p className="text-sm font-medium text-foreground truncate">{m.full_name}</p>
                             <p className="text-[10px] text-muted-foreground">ID: {m.member_id}</p>
                           </div>
                         </div>
                          <Input
                            type="number"
                            value={attendanceData[m.id]?.rate || ((m as any).salary_type === "daily" && Number((m as any).daily_rate || 0) > 0 ? String((m as any).daily_rate) : "0")}
                            onChange={(e) => setRate(m.id, e.target.value)}
                            className="w-20 bg-secondary border-border/30 h-8 text-sm text-right"
                            placeholder="৳"
                          />
                        </div>
                      </Card>
                    ))}
                  </div>

                 {/* Desktop table */}
                 <Card className="bg-card border-border/30 overflow-hidden hidden md:block">
                   <div className="overflow-x-auto">
                     <table className="w-full text-sm">
                       <thead>
                         <tr className="border-b border-border/30">
                           <th className="text-left p-3 text-muted-foreground font-medium">ছবি</th>
                           <th className="text-left p-3 text-muted-foreground font-medium">আইডি</th>
                           <th className="text-left p-3 text-muted-foreground font-medium">নাম</th>
                           <th className="text-center p-3 text-muted-foreground font-medium">উপস্থিত</th>
                           <th className="text-left p-3 text-muted-foreground font-medium">রেট</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-border/20">
                         {members?.map((m) => (
                           <tr key={m.id} className="hover:bg-secondary/30 transition-colors">
                             <td className="p-3">
                               <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden">
                                 {m.photo_url ? (
                                   <img src={m.photo_url} alt={m.full_name} className="h-full w-full object-cover" />
                                 ) : (
                                   <span className="text-primary text-xs font-medium">{m.full_name?.charAt(0) || "M"}</span>
                                 )}
                               </div>
                             </td>
                             <td className="p-3 text-muted-foreground font-mono text-xs">{m.member_id}</td>
                             <td className="p-3 text-foreground">{m.full_name}</td>
                             <td className="p-3 text-center">
                               <Checkbox
                                 checked={attendanceData[m.id]?.present || false}
                                 onCheckedChange={() => togglePresent(m.id)}
                               />
                             </td>
                              <td className="p-3">
                                {m.salary_type === "monthly" ? (
                                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">মাসিক</span>
                                ) : (
                                  <Input
                                    type="number"
                                    value={attendanceData[m.id]?.rate || "0"}
                                    onChange={(e) => setRate(m.id, e.target.value)}
                                    className="w-28 bg-secondary border-border/30 h-8"
                                  />
                                )}
                              </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3 mt-4">
            {shootingGroups.length === 0 && (
              <Card className="bg-card border-border/50 p-8 text-center text-muted-foreground">কোনো হাজিরা রেকর্ড নেই</Card>
            )}
            {shootingGroups.map(([shootingId, group]) => {
              const isExpanded = expandedShootings.has(shootingId);
              const presentCount = group.records.filter((r: any) => r.is_present).length;
              const totalRate = group.records.reduce((sum: number, r: any) => sum + (r.is_present ? Number(r.daily_rate || 0) : 0), 0);
              const timerActive = deleteTimers[shootingId] !== undefined;
              const timerValue = deleteTimers[shootingId];

              return (
                <Card key={shootingId} className="bg-card border-border/50 overflow-hidden">
                  <div className="flex items-center justify-between p-4">
                    <button
                      onClick={() => toggleExpand(shootingId)}
                      className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity"
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <div>
                        <p className="font-medium text-foreground">{group.shooting?.name || "শুটিং"}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.shooting?.shoot_date ? new Date(group.shooting.shoot_date).toLocaleDateString("bn-BD") : ""}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" /> {presentCount}/{group.records.length}
                      </span>
                      <span className="text-foreground font-medium">৳{totalRate.toLocaleString("bn-BD")}</span>
                      
                      {/* Delete with timer */}
                      {!timerActive ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={(e) => { e.stopPropagation(); startDeleteTimer(shootingId); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground"
                            onClick={(e) => { e.stopPropagation(); cancelDeleteTimer(shootingId); }}
                          >
                            বাতিল
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs gap-1 min-w-[80px]"
                            disabled={timerValue > 0 || deletingId === shootingId}
                            onClick={(e) => { e.stopPropagation(); handleDeleteAttendance(shootingId); }}
                          >
                            <Trash2 className="h-3 w-3" />
                            {deletingId === shootingId ? "ডিলিট হচ্ছে..." : timerValue > 0 ? `${timerValue}s` : "ডিলিট"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border/30">
                      <table className="w-full text-sm">
                        <thead>
                         <tr className="border-b border-border/20">
                             <th className="text-left p-3 text-muted-foreground font-medium text-xs">ছবি</th>
                             <th className="text-left p-3 text-muted-foreground font-medium text-xs">আইডি</th>
                             <th className="text-left p-3 text-muted-foreground font-medium text-xs">সদস্য</th>
                             <th className="text-center p-3 text-muted-foreground font-medium text-xs">স্ট্যাটাস</th>
                             <th className="text-right p-3 text-muted-foreground font-medium text-xs">রেট (৳)</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-border/10">
                           {group.records.map((a: any) => (
                             <tr key={a.id} className="hover:bg-secondary/20 transition-colors">
                               <td className="p-3">
                                 <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden">
                                   {a.profiles?.photo_url ? (
                                     <img src={a.profiles.photo_url} alt={a.profiles?.full_name} className="h-full w-full object-cover" />
                                   ) : (
                                     <span className="text-primary text-[10px] font-medium">{a.profiles?.full_name?.charAt(0) || "M"}</span>
                                   )}
                                 </div>
                               </td>
                               <td className="p-3 text-muted-foreground font-mono text-xs">#{a.profiles?.member_id}</td>
                               <td className="p-3 text-foreground">{a.profiles?.full_name || "—"}</td>
                              <td className="p-3 text-center">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_present ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                                  {a.is_present ? "উপস্থিত" : "অনুপস্থিত"}
                                </span>
                              </td>
                               <td className="p-3 text-right text-foreground">
                                 {a.profiles?.salary_type === "monthly" ? (
                                   <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">মাসিক</span>
                                 ) : (
                                   <>৳{Number(a.daily_rate || 0).toLocaleString("bn-BD")}</>
                                 )}
                               </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default AdminAttendance;
