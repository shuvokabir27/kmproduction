import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Save, History, ChevronDown, ChevronRight, Users, Trash2, Pencil, Check, X, ArrowRight, Plus, Type } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const AdminAttendance = () => {
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedShooting, setSelectedShooting] = useState<string>("");
  const [attendanceData, setAttendanceData] = useState<Record<string, { present: boolean; rate: string }>>({});
  const [saving, setSaving] = useState(false);
  const [expandedShootings, setExpandedShootings] = useState<Set<string>>(new Set());
  const [deleteTimers, setDeleteTimers] = useState<Record<string, number>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editShootingId, setEditShootingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, { present: boolean; rate: string }>>({});
  const [editSaving, setEditSaving] = useState(false);

  // New flow state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedExistingId, setPickedExistingId] = useState<string>("");
  const [customName, setCustomName] = useState("");
  const [customDate, setCustomDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [creatingShooting, setCreatingShooting] = useState(false);

  // Rename shooting from history
  const [renameShootingId, setRenameShootingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);

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
      const { data: profiles } = await (supabase as any).from("profiles").select("*").eq("is_active", true).order("member_id");
      const { data: roles } = await (supabase as any).from("user_roles").select("user_id, role");
      const rolesByUser = new Map<string, string[]>();
      (roles ?? []).forEach((r: any) => {
        const arr = rolesByUser.get(r.user_id) ?? [];
        arr.push(r.role);
        rolesByUser.set(r.user_id, arr);
      });
      // Pure members only — exclude anyone with admin/client/product_admin role
      return (profiles ?? []).filter((p: any) => {
        const r = rolesByUser.get(p.user_id) ?? [];
        return r.includes("member") && !r.includes("admin") && !r.includes("client") && !r.includes("product_admin");
      });
    },
  });

  // Fetch latest attendance rates per member (from any previous shooting)
  const { data: lastRates } = useQuery({
    queryKey: ["last-attendance-rates"],
    queryFn: async () => {
      // Get the most recent attendance record per member with a non-zero rate
      const { data } = await supabase
        .from("attendance")
        .select("member_id, daily_rate, shooting_id, created_at")
        .gt("daily_rate", 0)
        .order("created_at", { ascending: false });
      const map: Record<string, number> = {};
      (data ?? []).forEach((a) => {
        if (!map[a.member_id]) {
          map[a.member_id] = Number(a.daily_rate);
        }
      });
      return map;
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
        // New attendance — pre-fill from last attendance rate, fallback to profile daily_rate
        members?.forEach((m: any) => {
          if (m.salary_type === "daily") {
            const lastRate = lastRates?.[m.id];
            const rate = lastRate ?? Number(m.daily_rate || 0);
            if (rate > 0) {
              map[m.id] = { present: false, rate: String(rate) };
            }
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
        const isMonthly = member.salary_type === "monthly";
        // Monthly members are automatically present with rate 0 (salary covers it)
        const data = isMonthly
          ? { present: true, rate: "0" }
          : (attendanceData[member.id] || { present: false, rate: "0" });
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
      toast.success("হাজিরা সেভ হয়েছে! মাসিক বেতনভুক্ত সদস্যদের হাজিরা অটো হয়েছে।");
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
            <TabsTrigger value="manage" className="gap-1.5 text-xs flex-1 md:flex-none text-red-400 bg-red-500/10 border border-red-500/20 data-[state=active]:bg-red-500/25 data-[state=active]:text-red-300"><Calendar className="h-3.5 w-3.5" /> হাজিরা দিন</TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs flex-1 md:flex-none text-violet-400 bg-violet-500/10 border border-violet-500/20 data-[state=active]:bg-violet-500/25 data-[state=active]:text-violet-300"><History className="h-3.5 w-3.5" /> হিস্ট্রি</TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-4 mt-4">
            {!selectedShooting ? (
              <Card className="bg-card border-border/30 p-8 md:p-12 flex flex-col items-center justify-center gap-4 text-center">
                <div className="h-16 w-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-red-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">আজকের হাজিরা নিন</p>
                  <p className="text-xs text-muted-foreground mt-1">শুটিং নির্বাচন করুন বা নতুন নাম দিয়ে শুরু করুন</p>
                </div>
                <Button
                  size="lg"
                  className="gap-2 bg-red-500 hover:bg-red-600 text-white"
                  onClick={() => {
                    setPickedExistingId("");
                    setCustomName("");
                    setCustomDate(new Date().toISOString().slice(0, 10));
                    setPickerOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" /> হাজিরা নিন
                </Button>
              </Card>
            ) : (
              <>
                {/* Header bar with current shooting info */}
                {(() => {
                  const current = shootings?.find((s) => s.id === selectedShooting);
                  return (
                    <Card className="bg-card border-border/30 p-3 md:p-4 flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">বর্তমান শুটিং</p>
                        <p className="font-semibold text-foreground truncate">{current?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {current?.shoot_date ? new Date(current.shoot_date).toLocaleDateString("bn-BD") : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-muted-foreground"
                          onClick={() => setSelectedShooting("")}
                        >
                          <X className="h-3.5 w-3.5" /> বাতিল
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="gap-2 bg-red-500 hover:bg-red-600 text-white" size="sm">
                          <Save className="h-4 w-4" /> {saving ? "সেভ হচ্ছে..." : "সেভ করুন"}
                        </Button>
                      </div>
                    </Card>
                  );
                })()}

                {/* Info: monthly members are auto-present */}
                {(() => {
                  const monthlyCount = (members ?? []).filter((m: any) => m.salary_type === "monthly").length;
                  if (monthlyCount === 0) return null;
                  return (
                    <Card className="bg-primary/5 border-primary/20 p-3 text-xs text-primary flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      <span>মাসিক বেতনভুক্ত {monthlyCount} জন সদস্য সব শুটিংয়ে স্বয়ংক্রিয়ভাবে উপস্থিত গণ্য হবেন।</span>
                    </Card>
                  );
                })()}

                {/* Members list — large photos (daily only) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {members?.filter((m: any) => m.salary_type !== "monthly").map((m) => {
                    const present = attendanceData[m.id]?.present || false;
                    return (
                      <Card
                        key={m.id}
                        className={`p-3 md:p-4 flex items-center gap-4 border transition-all cursor-pointer ${
                          present
                            ? "bg-red-500/10 border-red-500/40"
                            : "bg-card border-border/30 hover:border-border/60"
                        }`}
                        onClick={() => togglePresent(m.id)}
                      >
                        <div className="relative shrink-0">
                          <div className="h-20 w-20 md:h-24 md:w-24 rounded-xl bg-primary/20 border-2 border-primary/30 flex items-center justify-center overflow-hidden">
                            {m.photo_url ? (
                              <img src={m.photo_url} alt={m.full_name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-primary text-2xl font-medium">{m.full_name?.charAt(0) || "M"}</span>
                            )}
                          </div>
                          {present && (
                            <div className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-red-500 border-2 border-background flex items-center justify-center">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                          <p className="font-semibold text-foreground truncate">{m.full_name}</p>
                          <p className="text-[11px] text-muted-foreground mb-2">
                            ID: {m.member_id} • {m.salary_type === "monthly" ? "মাসিক" : "দৈনিক"}
                          </p>
                          {m.salary_type === "monthly" ? (
                            <span className="inline-block text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">মাসিক বেতনভুক্ত</span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">৳</span>
                              <Input
                                type="number"
                                value={attendanceData[m.id]?.rate || "0"}
                                onChange={(e) => setRate(m.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-24 bg-secondary border-border/30 h-9"
                              />
                              <span className="text-[10px] text-muted-foreground">/দিন</span>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Bottom save bar */}
                <div className="sticky bottom-2 z-10">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    size="lg"
                    className="w-full gap-2 bg-red-500 hover:bg-red-600 text-white shadow-lg"
                  >
                    <Save className="h-4 w-4" /> {saving ? "সেভ হচ্ছে..." : "হাজিরা সেভ করুন"}
                  </Button>
                </div>
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
                      
                      {/* Edit button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          const map: Record<string, { present: boolean; rate: string }> = {};
                          group.records.forEach((r: any) => {
                            map[r.member_id] = { present: r.is_present ?? false, rate: String(r.daily_rate || 0) };
                          });
                          setEditData(map);
                          setEditShootingId(shootingId);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      {/* Rename shooting */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:bg-red-500/10"
                        title="শুটিং নাম বদলান"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameShootingId(shootingId);
                          setRenameValue(group.shooting?.name || "");
                        }}
                      >
                        <Type className="h-4 w-4" />
                      </Button>

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

        {/* Edit Attendance Dialog */}
        <Dialog open={!!editShootingId} onOpenChange={(open) => { if (!open) setEditShootingId(null); }}>
          <DialogContent className="bg-card border-border/50 max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <Pencil className="h-4 w-4 text-primary" /> হাজিরা এডিট করুন
              </DialogTitle>
            </DialogHeader>
            {editShootingId && (() => {
              const group = groupedByShooting[editShootingId];
              if (!group) return null;
              // Members NOT in this attendance yet
              const existingMemberIds = new Set(group.records.map((r: any) => r.member_id));
              const availableMembers = (members ?? []).filter((m: any) => !existingMemberIds.has(m.id));
              return (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {group.shooting?.name} — {group.shooting?.shoot_date ? new Date(group.shooting.shoot_date).toLocaleDateString("bn-BD") : ""}
                  </p>
                  
                  {/* Existing records */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">বর্তমান হাজিরা ({group.records.length} জন)</p>
                    {group.records.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-secondary/30 border border-border/20">
                        <div className="flex items-center gap-2 min-w-0">
                          <Checkbox
                            checked={editData[r.member_id]?.present || false}
                            onCheckedChange={() => {
                              setEditData(prev => ({
                                ...prev,
                                [r.member_id]: { ...prev[r.member_id], present: !prev[r.member_id]?.present }
                              }));
                            }}
                          />
                          <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden shrink-0">
                            {r.profiles?.photo_url ? (
                              <img src={r.profiles.photo_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-primary text-[10px]">{r.profiles?.full_name?.charAt(0)}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-foreground truncate">{r.profiles?.full_name}</p>
                            <p className="text-[10px] text-muted-foreground">ID: {r.profiles?.member_id}</p>
                          </div>
                        </div>
                        {r.profiles?.salary_type === "monthly" ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">মাসিক</span>
                        ) : (
                          <Input
                            type="number"
                            value={editData[r.member_id]?.rate || "0"}
                            onChange={(e) => {
                              setEditData(prev => ({
                                ...prev,
                                [r.member_id]: { ...prev[r.member_id], rate: e.target.value }
                              }));
                            }}
                            className="w-20 bg-secondary border-border/30 h-8 text-sm text-right"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add new members */}
                  {availableMembers.length > 0 && (
                    <div className="space-y-2 border-t border-border/20 pt-3">
                      <p className="text-xs text-muted-foreground font-medium">নতুন সদস্য যুক্ত করুন</p>
                      {availableMembers.map((m: any) => {
                        const isAdded = !!editData[m.id];
                        return (
                          <div key={m.id} className={`flex items-center justify-between gap-3 p-2 rounded-lg border transition-colors ${isAdded ? "bg-red-500/5 border-red-500/20" : "bg-secondary/10 border-border/10"}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <Checkbox
                                checked={isAdded}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setEditData(prev => ({
                                      ...prev,
                                      [m.id]: { present: true, rate: m.salary_type === "daily" ? String(m.daily_rate || 0) : "0" }
                                    }));
                                  } else {
                                    setEditData(prev => {
                                      const next = { ...prev };
                                      delete next[m.id];
                                      return next;
                                    });
                                  }
                                }}
                              />
                              <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden shrink-0">
                                {m.photo_url ? (
                                  <img src={m.photo_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-primary text-[10px]">{m.full_name?.charAt(0)}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm text-foreground truncate">{m.full_name}</p>
                                <p className="text-[10px] text-muted-foreground">ID: {m.member_id}</p>
                              </div>
                            </div>
                            {isAdded && m.salary_type !== "monthly" && (
                              <Input
                                type="number"
                                value={editData[m.id]?.rate || "0"}
                                onChange={(e) => {
                                  setEditData(prev => ({
                                    ...prev,
                                    [m.id]: { ...prev[m.id], rate: e.target.value }
                                  }));
                                }}
                                className="w-20 bg-secondary border-border/30 h-8 text-sm text-right"
                              />
                            )}
                            {isAdded && m.salary_type === "monthly" && (
                              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">মাসিক</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <Button
                    className="w-full gap-2"
                    disabled={editSaving}
                    onClick={async () => {
                      setEditSaving(true);
                      try {
                        // Update existing records
                        for (const r of group.records) {
                          const d = editData[r.member_id];
                          if (d) {
                            await supabase.from("attendance").update({
                              is_present: d.present,
                              daily_rate: Number(d.rate) || 0,
                            }).eq("id", r.id);
                          }
                        }
                        // Insert new members
                        const newMembers = Object.entries(editData).filter(([id]) => !existingMemberIds.has(id));
                        if (newMembers.length > 0) {
                          const rows = newMembers.map(([memberId, d]) => ({
                            shooting_id: editShootingId,
                            member_id: memberId,
                            is_present: d.present,
                            daily_rate: Number(d.rate) || 0,
                          }));
                          await supabase.from("attendance").insert(rows);
                        }
                        toast.success("হাজিরা আপডেট হয়েছে!");
                        queryClient.invalidateQueries({ queryKey: ["all-attendance-history"] });
                        queryClient.invalidateQueries({ queryKey: ["shootings-with-attendance"] });
                        queryClient.invalidateQueries({ queryKey: ["member-balance"] });
                        setEditShootingId(null);
                      } catch (err: any) {
                        toast.error(err.message);
                      } finally {
                        setEditSaving(false);
                      }
                    }}
                  >
                    <Save className="h-4 w-4" /> {editSaving ? "সেভ হচ্ছে..." : "আপডেট করুন"}
                  </Button>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Picker dialog: choose existing shooting OR create new */}
        <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
          <DialogContent className="bg-card border-border/50 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-red-400" /> হাজিরার জন্য শুটিং
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Existing shootings without attendance */}
              {(() => {
                const available = (shootings ?? []).filter((s: any) => !shootingsWithAttendance?.has(s.id));
                if (available.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">বিদ্যমান শুটিং নির্বাচন করুন</p>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                      {available.map((s: any) => {
                        const sel = pickedExistingId === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => { setPickedExistingId(s.id); setCustomName(""); }}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${
                              sel ? "bg-red-500/15 border-red-500/40" : "bg-secondary/30 border-border/20 hover:bg-secondary/50"
                            }`}
                          >
                            <p className="text-sm font-medium text-foreground">{s.name}</p>
                            <p className="text-[11px] text-muted-foreground">{new Date(s.shoot_date).toLocaleDateString("bn-BD")}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div className="relative flex items-center gap-2">
                <div className="flex-1 h-px bg-border/30" />
                <span className="text-[10px] text-muted-foreground">অথবা</span>
                <div className="flex-1 h-px bg-border/30" />
              </div>

              {/* Custom new shooting */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">নতুন শুটিং তৈরি করুন</p>
                <Input
                  placeholder="শুটিং নাম লিখুন"
                  value={customName}
                  onChange={(e) => { setCustomName(e.target.value); if (e.target.value) setPickedExistingId(""); }}
                  className="bg-secondary border-border/30"
                />
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="bg-secondary border-border/30"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setPickerOpen(false)}>বাতিল</Button>
              <Button
                disabled={creatingShooting || (!pickedExistingId && !customName.trim())}
                className="gap-2 bg-red-500 hover:bg-red-600 text-white"
                onClick={async () => {
                  setCreatingShooting(true);
                  try {
                    let shootingId = pickedExistingId;
                    let useDate = customDate;
                    if (!shootingId) {
                      // Custom — validate no other attendance on the same date
                      useDate = customDate;
                      if (!useDate) { toast.error("তারিখ নির্বাচন করুন"); return; }
                      // find shootings on same date
                      const { data: sameDate } = await supabase.from("shootings").select("id").eq("shoot_date", useDate);
                      const sameIds = (sameDate ?? []).map((x: any) => x.id);
                      if (sameIds.length > 0) {
                        const { data: existAtt } = await supabase.from("attendance").select("shooting_id").in("shooting_id", sameIds);
                        if ((existAtt ?? []).length > 0) {
                          toast.error("এই তারিখে ইতিমধ্যে হাজিরা নেওয়া হয়েছে");
                          return;
                        }
                      }
                      const { data: created, error: cErr } = await supabase
                        .from("shootings")
                        .insert({ name: customName.trim(), shoot_date: useDate, status: "ongoing" })
                        .select("id")
                        .single();
                      if (cErr) throw cErr;
                      shootingId = created!.id;
                      queryClient.invalidateQueries({ queryKey: ["admin-shootings-for-attendance"] });
                    } else {
                      // Existing — also validate no attendance exists for this date
                      const picked = shootings?.find((s: any) => s.id === shootingId);
                      if (picked?.shoot_date) {
                        const { data: sameDate } = await supabase.from("shootings").select("id").eq("shoot_date", picked.shoot_date).neq("id", shootingId);
                        const sameIds = (sameDate ?? []).map((x: any) => x.id);
                        if (sameIds.length > 0) {
                          const { data: existAtt } = await supabase.from("attendance").select("shooting_id").in("shooting_id", sameIds);
                          if ((existAtt ?? []).length > 0) {
                            toast.error("এই তারিখে ইতিমধ্যে হাজিরা নেওয়া হয়েছে");
                            return;
                          }
                        }
                      }
                    }
                    setSelectedShooting(shootingId);
                    setPickerOpen(false);
                  } catch (err: any) {
                    toast.error(err.message);
                  } finally {
                    setCreatingShooting(false);
                  }
                }}
              >
                {creatingShooting ? "অপেক্ষা..." : (<><span>পরবর্তী</span><ArrowRight className="h-4 w-4" /></>)}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rename shooting dialog */}
        <Dialog open={!!renameShootingId} onOpenChange={(o) => { if (!o) setRenameShootingId(null); }}>
          <DialogContent className="bg-card border-border/50 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <Type className="h-4 w-4 text-red-400" /> শুটিং নাম বদলান
              </DialogTitle>
            </DialogHeader>
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="নতুন নাম"
              className="bg-secondary border-border/30"
            />
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setRenameShootingId(null)}>বাতিল</Button>
              <Button
                disabled={renameSaving || !renameValue.trim()}
                className="gap-2"
                onClick={async () => {
                  if (!renameShootingId) return;
                  setRenameSaving(true);
                  const { error } = await supabase.from("shootings").update({ name: renameValue.trim() }).eq("id", renameShootingId);
                  setRenameSaving(false);
                  if (error) { toast.error(error.message); return; }
                  toast.success("নাম আপডেট হয়েছে");
                  queryClient.invalidateQueries({ queryKey: ["all-attendance-history"] });
                  queryClient.invalidateQueries({ queryKey: ["admin-shootings-for-attendance"] });
                  setRenameShootingId(null);
                }}
              >
                <Save className="h-4 w-4" /> সেভ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default AdminAttendance;
