import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Film, Plus, FileText, Edit, Trash2, Eye, EyeOff, Video, Users, Check, Lock, Clapperboard, MessageSquare, Send } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScriptEditor } from "@/components/ScriptEditor";
import { Checkbox } from "@/components/ui/checkbox";
import { ShootingSceneTracker } from "@/components/ShootingSceneTracker";
import { sendTeamSms, toBn } from "@/lib/sendTeamSms";

const statusOptions = [
  { value: "plan", label: "প্লান", color: "bg-violet-500/15 text-violet-400", tabColor: "text-violet-400 bg-violet-500/10 data-[state=active]:bg-violet-500/25 data-[state=active]:text-violet-300 border border-violet-500/20" },
  { value: "upcoming", label: "আসন্ন", color: "bg-red-500/15 text-red-400", tabColor: "text-red-400 bg-red-500/10 data-[state=active]:bg-red-500/25 data-[state=active]:text-red-300 border border-red-500/20" },
  { value: "calltime", label: "কলটাইম", color: "bg-red-500/15 text-red-400", tabColor: "text-red-400 bg-red-500/10 data-[state=active]:bg-red-500/25 data-[state=active]:text-red-300 border border-red-500/20" },
  { value: "ongoing", label: "চলছে", color: "bg-cyan-500/15 text-cyan-400", tabColor: "text-cyan-400 bg-cyan-500/10 data-[state=active]:bg-cyan-500/25 data-[state=active]:text-cyan-300 border border-cyan-500/20" },
  { value: "completed", label: "শুটিং শেষ", color: "bg-red-500/15 text-red-400", tabColor: "text-red-400 bg-red-500/10 data-[state=active]:bg-red-500/25 data-[state=active]:text-red-300 border border-red-500/20" },
  { value: "editing", label: "এডিটিং চলছে", color: "bg-pink-500/15 text-pink-400", tabColor: "text-pink-400 bg-pink-500/10 data-[state=active]:bg-pink-500/25 data-[state=active]:text-pink-300 border border-pink-500/20" },
  { value: "editing_done", label: "এডিটিং শেষ", color: "bg-red-500/15 text-red-400", tabColor: "text-red-400 bg-red-500/10 data-[state=active]:bg-red-500/25 data-[state=active]:text-red-300 border border-red-500/20" },
  { value: "published", label: "পাবলিশ হয়েছে", color: "bg-red-500/15 text-red-400", tabColor: "text-red-400 bg-red-500/10 data-[state=active]:bg-red-500/25 data-[state=active]:text-red-300 border border-red-500/20" },
];

const getStatusInfo = (status: string | null) =>
  statusOptions.find((s) => s.value === status) || statusOptions[1];

const AdminShootings = () => {
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [shootDate, setShootDate] = useState("");
  const [status, setStatus] = useState("plan");
  const [scriptUrl, setScriptUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [showOnPublic, setShowOnPublic] = useState(false);
  const [selectedScriptId, setSelectedScriptId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [scriptEditorOpen, setScriptEditorOpen] = useState(false);
  const [scriptEditShooting, setScriptEditShooting] = useState<any>(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishShootingId, setPublishShootingId] = useState<string>("");
  const [publishChannelId, setPublishChannelId] = useState<string>("");
  const [publishVideoUrl, setPublishVideoUrl] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteShootingId, setDeleteShootingId] = useState<string>("");
  const [deleteShootingName, setDeleteShootingName] = useState<string>("");
  const [deleteTimer, setDeleteTimer] = useState(5);
  const [deleteTimerActive, setDeleteTimerActive] = useState(false);
  // Ongoing member selection
  const [ongoingDialogOpen, setOngoingDialogOpen] = useState(false);
  const [ongoingShootingId, setOngoingShootingId] = useState<string>("");
  const [ongoingShootingName, setOngoingShootingName] = useState<string>("");
  const [ongoingCallTime, setOngoingCallTime] = useState<string>("");
  const [ongoingLocation, setOngoingLocation] = useState<string>("");
  const [ongoingShootDate, setOngoingShootDate] = useState<string>("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberDetails, setMemberDetails] = useState<Record<string, { costume: string; props: string; character_name: string }>>({});
  const [ongoingSubmitting, setOngoingSubmitting] = useState(false);
  const [ongoingIsEdit, setOngoingIsEdit] = useState(false);
  // Status revert password protection
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);
  const [revertPassword, setRevertPassword] = useState("");
  const [revertShootingId, setRevertShootingId] = useState<string>("");
  const [revertNewStatus, setRevertNewStatus] = useState<string>("");
  const [revertVerifying, setRevertVerifying] = useState(false);
  // Scene tracker
  const [sceneTrackerOpen, setSceneTrackerOpen] = useState(false);
  const [sceneTrackerShootingId, setSceneTrackerShootingId] = useState("");
  const [sceneTrackerShootingName, setSceneTrackerShootingName] = useState("");
  // SMS broadcast to shooting participants
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [smsShootingName, setSmsShootingName] = useState("");
  const [smsMessage, setSmsMessage] = useState("");
  const [smsMembers, setSmsMembers] = useState<any[]>([]);
  const [smsSelected, setSmsSelected] = useState<string[]>([]);
  const [smsSending, setSmsSending] = useState(false);
  const [smsSearch, setSmsSearch] = useState("");
  const [smsFromDate, setSmsFromDate] = useState("");
  const [smsToDate, setSmsToDate] = useState("");
  const [smsCallTime, setSmsCallTime] = useState("");
  const [smsLocation, setSmsLocation] = useState("");

  const { data: shootings } = useQuery({
    queryKey: ["admin-shootings"],
    queryFn: async () => {
      const { data } = await supabase.from("shootings").select("*, channels(name, platform), scripts(id, title, content)" as any).order("shoot_date", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const { data: channels } = useQuery({
    queryKey: ["channels-list"],
    queryFn: async () => {
      const { data } = await supabase.from("channels" as any).select("*").order("name");
      return (data ?? []) as any[];
    },
  });

  const { data: savedScripts } = useQuery({
    queryKey: ["scripts-list"],
    queryFn: async () => {
      const { data } = await supabase.from("scripts" as any).select("id, title").order("updated_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  // Fetch all active members for ongoing selection
  const { data: allMembers } = useQuery({
    queryKey: ["all-members-list"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, member_id, photo_url").eq("is_active", true).order("full_name");
      return (data ?? []) as any[];
    },
  });

  useEffect(() => {
    if (!deleteTimerActive || deleteTimer <= 0) return;
    const interval = setInterval(() => {
      setDeleteTimer((t) => {
        if (t <= 1) { setDeleteTimerActive(false); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [deleteTimerActive, deleteTimer]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const resetForm = () => {
    setEditId(null);
    setName(""); setDescription(""); setLocation(""); setShootDate(""); setStatus("plan"); setScriptUrl(""); setVideoUrl(""); setShowOnPublic(false); setSelectedScriptId("");
  };

  const openAdd = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (s: any) => {
    setEditId(s.id);
    setName(s.name || "");
    setDescription(s.description || "");
    setLocation(s.location || "");
    setShootDate(s.shoot_date || "");
    setStatus(s.status || "plan");
    setScriptUrl((s as any).script_url || "");
    setVideoUrl((s as any).video_url || "");
    setShowOnPublic((s as any).show_on_public || false);
    setSelectedScriptId((s as any).script_id || "");
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editId) {
        const scriptId = selectedScriptId && selectedScriptId !== "none" ? selectedScriptId : null;
        const { error } = await supabase.from("shootings").update({
          name, description, location, shoot_date: shootDate, status, script_url: scriptUrl || null, script_id: scriptId, video_url: videoUrl || null, show_on_public: showOnPublic
        } as any).eq("id", editId);
        if (error) throw error;
        toast.success("শুটিং আপডেট হয়েছে!");
      } else {
        const scriptId2 = selectedScriptId && selectedScriptId !== "none" ? selectedScriptId : null;
        const { error } = await supabase.from("shootings").insert({
          name, description, location, shoot_date: shootDate, status, script_url: scriptUrl || null, script_id: scriptId2, video_url: videoUrl || null, show_on_public: showOnPublic
        } as any);
        if (error) throw error;
        toast.success("শুটিং যোগ হয়েছে!");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-shootings"] });
      setOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const statusOrder = statusOptions.map(s => s.value);

  const autoCreateAttendance = async (shootingId: string) => {
    try {
      const { data: existing } = await supabase.from("attendance").select("id").eq("shooting_id", shootingId).limit(1);
      if (existing && existing.length > 0) return;

      const { data: shootingRow } = await (supabase as any).from("shootings").select("name").eq("id", shootingId).maybeSingle();
      const shootName = shootingRow?.name || "শুটিং";

      const { data: participants } = await (supabase as any).from("shooting_participants").select("member_id").eq("shooting_id", shootingId);
      
      if (participants && participants.length > 0) {
        const memberIds = participants.map((p: any) => p.member_id);
        const { data: profiles } = await (supabase as any).from("profiles").select("id, full_name, daily_rate, salary_type").in("id", memberIds);
        const rateMap: Record<string, number> = {};
        const nameMap: Record<string, string> = {};
        const typeMap: Record<string, string> = {};
        profiles?.forEach((p: any) => {
          rateMap[p.id] = p.salary_type === "daily" ? Number(p.daily_rate || 0) : 0;
          nameMap[p.id] = p.full_name;
          typeMap[p.id] = p.salary_type;
        });

        const rows = participants.map((p: any) => ({
          shooting_id: shootingId,
          member_id: p.member_id,
          is_present: true,
          daily_rate: rateMap[p.member_id] || 0,
          check_in_time: new Date().toISOString(),
        }));
        await supabase.from("attendance").insert(rows);
        toast.success(`${rows.length} জন সদস্যের অটো হাজিরা যুক্ত হয়েছে!`);
        // SMS notify each present (daily) member
        for (const p of participants) {
          if (typeMap[p.member_id] === "monthly") continue;
          const rate = rateMap[p.member_id] || 0;
          const rateText = rate > 0 ? ` (৳${toBn(rate)})` : "";
          sendTeamSms({
            member_id: p.member_id,
            message: `প্রিয় ${nameMap[p.member_id] || ""}, আজকের শুটিং "${shootName}"-এ আপনার হাজিরা${rateText} গ্রহণ করা হয়েছে। ধন্যবাদ। - Kuakata Multimedia`,
          });
        }
      } else {
        const { data: allMembers } = await (supabase as any).from("profiles").select("id, daily_rate, salary_type").eq("is_active", true);
        if (allMembers && allMembers.length > 0) {
          const rows = allMembers.map((m: any) => ({
            shooting_id: shootingId,
            member_id: m.id,
            is_present: false,
            daily_rate: m.salary_type === "daily" ? Number(m.daily_rate || 0) : 0,
          }));
          await supabase.from("attendance").insert(rows);
          toast.info(`${rows.length} জন সদস্যের হাজিরা তৈরি হয়েছে — হাজিরা পেজ থেকে আপডেট করুন।`);
        }
      }
    } catch (err: any) {
      console.error("Auto attendance error:", err);
      toast.error("অটো হাজিরা তৈরিতে সমস্যা। হাজিরা পেজ থেকে ম্যানুয়ালি দিন।");
    }
  };

  const changeStatus = async (shootingId: string, newStatus: string) => {
    // Check if going backward
    const shooting = shootings?.find((s) => s.id === shootingId);
    const currentStatus = shooting?.status || "plan";
    const currentIndex = statusOrder.indexOf(currentStatus);
    const newIndex = statusOrder.indexOf(newStatus);

    if (newIndex < currentIndex) {
      // Going backward - require password
      setRevertShootingId(shootingId);
      setRevertNewStatus(newStatus);
      setRevertPassword("");
      setRevertDialogOpen(true);
      return;
    }

    if (newStatus === "published") {
      setPublishShootingId(shootingId);
      setPublishChannelId((shooting as any)?.channel_id || "");
      setPublishVideoUrl((shooting as any)?.video_url || "");
      setPublishDialogOpen(true);
      return;
    }
    if (newStatus === "calltime") {
      openCalltimeDialog(shooting, false);
      return;
    }
    const { error } = await supabase.from("shootings").update({ status: newStatus }).eq("id", shootingId);
    if (error) { toast.error(error.message); return; }
    
    // Auto-create attendance when status becomes "completed"
    if (newStatus === "completed") {
      await autoCreateAttendance(shootingId);
    }
    
    const info = getStatusInfo(newStatus);
    toast.success(`স্ট্যাটাস পরিবর্তন: ${info.label}`);
    queryClient.invalidateQueries({ queryKey: ["admin-shootings"] });
    queryClient.invalidateQueries({ queryKey: ["admin-shootings-for-attendance"] });
  };

  const handleRevertWithPassword = async () => {
    if (!revertPassword) { toast.error("পাসওয়ার্ড দিন"); return; }
    setRevertVerifying(true);
    try {
      // Get current user email and re-authenticate
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser?.email) throw new Error("ইউজার পাওয়া যায়নি");

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: revertPassword,
      });
      if (authError) {
        toast.error("পাসওয়ার্ড ভুল হয়েছে!");
        return;
      }

      // Password verified - proceed with status revert
      const { error } = await supabase.from("shootings").update({ status: revertNewStatus }).eq("id", revertShootingId);
      if (error) { toast.error(error.message); return; }
      const info = getStatusInfo(revertNewStatus);
      toast.success(`স্ট্যাটাস পরিবর্তন: ${info.label}`);
      queryClient.invalidateQueries({ queryKey: ["admin-shootings"] });
      setRevertDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRevertVerifying(false);
    }
  };

  const confirmPublish = async () => {
    if (!publishChannelId) { toast.error("চ্যানেল নির্বাচন করুন"); return; }
    const { error } = await supabase.from("shootings").update({
      status: "published", channel_id: publishChannelId, video_url: publishVideoUrl || null
    } as any).eq("id", publishShootingId);
    if (error) { toast.error(error.message); return; }
    toast.success("পাবলিশ হয়েছে!");
    setPublishDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["admin-shootings"] });
  };

  const openCalltimeDialog = async (shooting: any, isEdit: boolean) => {
    setOngoingShootingId(shooting.id);
    setOngoingShootingName(shooting?.name || "");
    setOngoingCallTime((shooting as any)?.call_time || "");
    setOngoingLocation(shooting?.location || "");
    setOngoingShootDate(shooting?.shoot_date || "");
    setOngoingIsEdit(isEdit);

    if (isEdit) {
      // Load existing participants
      const { data: existing } = await (supabase as any)
        .from("shooting_participants")
        .select("member_id, costume, props, character_name")
        .eq("shooting_id", shooting.id);
      if (existing && existing.length > 0) {
        setSelectedMemberIds(existing.map((p: any) => p.member_id));
        const details: Record<string, { costume: string; props: string; character_name: string }> = {};
        existing.forEach((p: any) => {
          details[p.member_id] = {
            costume: p.costume || "",
            props: p.props || "",
            character_name: p.character_name || "",
          };
        });
        setMemberDetails(details);
      } else {
        setSelectedMemberIds([]);
        setMemberDetails({});
      }
    } else {
      setSelectedMemberIds([]);
      setMemberDetails({});
    }
    setOngoingDialogOpen(true);
  };

  const confirmOngoing = async () => {
    if (selectedMemberIds.length === 0) {
      toast.error("অন্তত একজন সদস্য নির্বাচন করুন");
      return;
    }
    setOngoingSubmitting(true);
    try {
      // Delete existing participants for this shooting
      await (supabase as any).from("shooting_participants").delete().eq("shooting_id", ongoingShootingId);
      // Insert selected participants with costume/props/character
      const rows = selectedMemberIds.map((mid) => ({
        shooting_id: ongoingShootingId,
        member_id: mid,
        costume: memberDetails[mid]?.costume || null,
        props: memberDetails[mid]?.props || null,
        character_name: memberDetails[mid]?.character_name || null,
      }));
      const { error: insertErr } = await (supabase as any).from("shooting_participants").insert(rows);
      if (insertErr) throw insertErr;
      // Update shooting status + call_time (only set status if not editing)
      const updateData: any = {
        call_time: ongoingCallTime || null,
        location: ongoingLocation || null,
        shoot_date: ongoingShootDate || undefined,
      };
      if (!ongoingIsEdit) {
        updateData.status = "calltime";
      }
      const { error } = await supabase.from("shootings").update(updateData as any).eq("id", ongoingShootingId);
      if (error) throw error;
      toast.success(ongoingIsEdit ? "কলটাইম তথ্য আপডেট হয়েছে!" : "শুটিং কলটাইম নোটিশ দেওয়া হয়েছে!");
      setOngoingDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-shootings"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setOngoingSubmitting(false);
    }
  };

  const buildSmsMessage = (opts: { name?: string; from?: string; to?: string; callTime?: string; location?: string }) => {
    const fromStr = opts.from ? new Date(opts.from).toLocaleDateString("bn-BD") : "";
    const toStr = opts.to ? new Date(opts.to).toLocaleDateString("bn-BD") : "";
    let dateLine = "";
    if (fromStr && toStr && fromStr !== toStr) dateLine = `📅 তারিখ: ${fromStr} - ${toStr}`;
    else if (fromStr) dateLine = `📅 তারিখ: ${fromStr}`;
    const parts = [
      `প্রিয় সদস্য,`,
      opts.name ? `"${opts.name}" শুটিংয়ের তথ্য:` : `শুটিংয়ের তথ্য:`,
      dateLine,
      opts.callTime ? `⏰ কলটাইম: ${opts.callTime}` : "",
      opts.location ? `📍 লোকেশন: ${opts.location}` : "",
      `সময়মতো উপস্থিত থাকুন।`,
      `- Kuakata Multimedia`,
    ].filter(Boolean);
    return parts.join("\n");
  };

  const regenerateSmsMessage = () => {
    setSmsMessage(buildSmsMessage({ name: smsShootingName, from: smsFromDate, to: smsToDate, callTime: smsCallTime, location: smsLocation }));
  };

  const openSmsDialog = async (shooting: any) => {
    const name = shooting?.name || "";
    const from = shooting?.shoot_date || "";
    const to = (shooting as any)?.shoot_end_date || shooting?.shoot_date || "";
    const callTime = (shooting as any)?.call_time || "";
    const loc = shooting?.location || "";
    setSmsShootingName(name);
    setSmsFromDate(from);
    setSmsToDate(to);
    setSmsCallTime(callTime);
    setSmsLocation(loc);
    setSmsSearch("");
    setSmsMessage(buildSmsMessage({ name, from, to, callTime, location: loc }));

    const { data: participants } = await (supabase as any)
      .from("shooting_participants").select("member_id").eq("shooting_id", shooting.id);
    const pids: string[] = (participants || []).map((p: any) => p.member_id);
    const mems = (allMembers || []).filter((m: any) => pids.includes(m.id));
    const list = mems.length > 0 ? mems : (allMembers || []);
    setSmsMembers(list);
    setSmsSelected(mems.length > 0 ? mems.map((m: any) => m.id) : []);
    setSmsDialogOpen(true);
  };

  const openBroadcastSmsDialog = () => {
    setSmsShootingName("");
    setSmsFromDate("");
    setSmsToDate("");
    setSmsCallTime("");
    setSmsLocation("");
    setSmsSearch("");
    setSmsMessage(buildSmsMessage({}));
    const list = (allMembers || []);
    setSmsMembers(list);
    setSmsSelected([]);
    setSmsDialogOpen(true);
  };

  const toggleSmsMember = (id: string) => {
    setSmsSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const sendShootingSms = async () => {
    if (smsSelected.length === 0) { toast.error("অন্তত একজন সদস্য নির্বাচন করুন"); return; }
    if (!smsMessage.trim()) { toast.error("বার্তা লিখুন"); return; }
    setSmsSending(true);
    try {
      await sendTeamSms({ member_ids: smsSelected, message: smsMessage.trim() });
      toast.success(`${smsSelected.length} জন সদস্যকে SMS পাঠানো হয়েছে`);
      setSmsDialogOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "SMS পাঠাতে ব্যর্থ");
    } finally {
      setSmsSending(false);
    }
  };

  const openScriptEditor = (shooting: any) => {
    // If shooting has linked script content from scripts table, use it as initial content
    const linkedScriptContent = shooting.scripts?.content || "";
    const shootingScript = shooting.script_content || "";
    const initialContent = shootingScript || linkedScriptContent;
    setScriptEditShooting({ ...shooting, script_content: initialContent });
    setScriptEditorOpen(true);
  };

  const saveScript = async (content: string) => {
    if (!scriptEditShooting) return;
    const { error } = await supabase.from("shootings").update({
      script_content: content
    } as any).eq("id", scriptEditShooting.id);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["admin-shootings"] });
  };

  const openDeleteDialog = (s: any) => {
    setDeleteShootingId(s.id);
    setDeleteShootingName(s.name);
    setDeleteTimer(5);
    setDeleteTimerActive(true);
    setDeleteDialogOpen(true);
  };

  const togglePublicVisibility = async (shootingId: string, current: boolean) => {
    const { error } = await supabase.from("shootings").update({ show_on_public: !current } as any).eq("id", shootingId);
    if (error) { toast.error(error.message); return; }
    toast.success(!current ? "পাবলিক সাইটে দেখানো হবে" : "পাবলিক সাইট থেকে লুকানো হবে");
    queryClient.invalidateQueries({ queryKey: ["admin-shootings"] });
  };



  const handleDelete = async () => {
    if (!deleteShootingId) return;
    try {
      // Delete related attendance first
      await supabase.from("attendance").delete().eq("shooting_id", deleteShootingId);
      const { error } = await supabase.from("shootings").delete().eq("id", deleteShootingId);
      if (error) throw error;
      toast.success("শুটিং ডিলিট হয়েছে!");
      queryClient.invalidateQueries({ queryKey: ["admin-shootings"] });
      setDeleteDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <Film className="h-5 w-5 md:h-6 md:w-6 text-primary" /> শুটিং
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 text-xs md:text-sm border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300" onClick={openBroadcastSmsDialog}>
              <MessageSquare className="h-4 w-4" /> ব্রডকাস্ট SMS
            </Button>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2 text-xs md:text-sm" size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> নতুন শুটিং</Button>
              </DialogTrigger>
            <DialogContent className="bg-card border-border/50">
              <DialogHeader>
                <DialogTitle className="text-foreground">{editId ? "শুটিং সম্পাদনা" : "নতুন শুটিং যোগ করুন"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-foreground">নাম</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required className="bg-secondary border-border/50" />
                </div>
                <div>
                  <Label className="text-foreground">বিবরণ</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-secondary border-border/50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-foreground">লোকেশন</Label>
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} className="bg-secondary border-border/50" />
                  </div>
                  <div>
                    <Label className="text-foreground">তারিখ</Label>
                    <Input type="date" value={shootDate} onChange={(e) => setShootDate(e.target.value)} required className="bg-secondary border-border/50" />
                  </div>
                </div>
                <div>
                  <Label className="text-foreground">স্ট্যাটাস</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="bg-secondary border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/50">
                      {statusOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-foreground">স্ক্রিপ্ট লিংক (অপশনাল)</Label>
                  <Input value={scriptUrl} onChange={(e) => setScriptUrl(e.target.value)} placeholder="https://drive.google.com/..." className="bg-secondary border-border/50" />
                </div>
                <div>
                  <Label className="text-foreground">সেভ করা স্ক্রিপ্ট যুক্ত করুন (অপশনাল)</Label>
                  <Select value={selectedScriptId} onValueChange={(val) => {
                    setSelectedScriptId(val);
                    const script = savedScripts?.find((s: any) => s.id === val);
                    if (script && !name.trim()) {
                      setName(script.title);
                    }
                  }}>
                    <SelectTrigger className="bg-secondary border-border/50">
                      <SelectValue placeholder="স্ক্রিপ্ট নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/50">
                      <SelectItem value="none">কোনো স্ক্রিপ্ট নেই</SelectItem>
                      {savedScripts?.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-foreground">ভিডিও লিংক (YouTube/Facebook)</Label>
                  <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtu.be/... বা https://fb.watch/..." className="bg-secondary border-border/50" />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/30 bg-secondary/30 p-3">
                  <div>
                    <Label className="text-foreground text-sm">পাবলিক সাইটে দেখান</Label>
                    <p className="text-xs text-muted-foreground">হোম পেজে এই শুটিং প্রদর্শিত হবে</p>
                  </div>
                  <Switch checked={showOnPublic} onCheckedChange={setShowOnPublic} />
                </div>
                <p className="text-xs text-muted-foreground">💡 স্ক্রিপ্ট লিখতে চাইলে সাইডবারে "স্ক্রিপ্ট" মেনু থেকে নতুন স্ক্রিপ্ট তৈরি করুন</p>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "সেভ হচ্ছে..." : editId ? "আপডেট করুন" : "সেভ করুন"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-secondary/50 border border-border/20 flex-wrap h-auto gap-0.5 p-0.5 md:p-1 md:gap-1">
            <TabsTrigger value="all" className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 data-[state=active]:bg-blue-500/25 data-[state=active]:text-blue-300">সব ({shootings?.length || 0})</TabsTrigger>
            {statusOptions.map((s) => {
              const count = shootings?.filter((sh) => (sh.status || "upcoming") === s.value).length || 0;
              return (
                <TabsTrigger key={s.value} value={s.value} className={`text-[10px] md:text-xs px-2 ${s.tabColor}`}>
                  {s.label} ({count})
                </TabsTrigger>
              );
            })}
          </TabsList>

          {["all", ...statusOptions.map((s) => s.value)].map((tab) => {
            const filtered = tab === "all" ? shootings : shootings?.filter((sh) => (sh.status || "upcoming") === tab);
            return (
              <TabsContent key={tab} value={tab}>
                {/* Mobile card list */}
                <div className="md:hidden space-y-2 mt-3">
                  {filtered?.length === 0 && (
                    <Card className="bg-card border-border/30 p-6 text-center text-muted-foreground text-sm">কোনো শুটিং নেই</Card>
                  )}
                  {filtered?.map((s) => {
                    const info = getStatusInfo(s.status);
                    const hasScript = !!(s as any).script_content || !!(s as any).script_url || !!(s as any).scripts?.content;
                    return (
                      <Card key={s.id} className="bg-card border-border/30 p-3 active:scale-[0.99] transition-transform">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
                              <span className="text-[10px] text-muted-foreground">{new Date(s.shoot_date).toLocaleDateString("bn-BD")}</span>
                            </div>
                            {s.location && <p className="text-[10px] text-muted-foreground mt-1">📍 {s.location}</p>}
                            {s.channels && <p className="text-[10px] text-primary mt-0.5">📺 {(s as any).channels.name}</p>}
                          </div>
                           <div className="flex items-center gap-0.5 shrink-0">
                             {(s.status === "calltime" || s.status === "ongoing") && (
                               <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-cyan-400" onClick={() => openCalltimeDialog(s, true)} title="কলটাইম সম্পাদনা">
                                 <Users className="h-3.5 w-3.5" />
                               </Button>
                             )}
                             {(s.status === "calltime" || s.status === "ongoing" || s.status === "upcoming") && (
                               <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-400" onClick={() => openSmsDialog(s)} title="সদস্যদের SMS পাঠান">
                                 <MessageSquare className="h-3.5 w-3.5" />
                               </Button>
                             )}
                             <Button variant="ghost" size="sm" className={`h-7 w-7 p-0 ${(s as any).show_on_public ? "text-primary" : "text-muted-foreground/40"}`} onClick={() => togglePublicVisibility(s.id, (s as any).show_on_public)} title={(s as any).show_on_public ? "পাবলিক সাইটে দেখাচ্ছে" : "পাবলিক সাইটে লুকানো"}>
                               {(s as any).show_on_public ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                             </Button>
                              <Button variant="ghost" size="sm" className={`h-7 px-2 text-[10px] gap-1 ${hasScript ? "text-primary" : "text-muted-foreground"}`} onClick={() => openScriptEditor(s)}>
                                <FileText className="h-3.5 w-3.5" />
                                <span>স্ক্রিপ্ট</span>
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] gap-1 text-red-400" onClick={() => { setSceneTrackerShootingId(s.id); setSceneTrackerShootingName(s.name); setSceneTrackerOpen(true); }} title="দৃশ্য ট্র্যাকার">
                                <Clapperboard className="h-3.5 w-3.5" />
                                <span>দৃশ্য</span>
                              </Button>
                             <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => openEdit(s)}>
                               <Edit className="h-3.5 w-3.5" />
                             </Button>
                             <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive/70" onClick={() => openDeleteDialog(s)}>
                               <Trash2 className="h-3.5 w-3.5" />
                             </Button>
                           </div>
                        </div>
                        {/* Status changer */}
                        <div className="mt-2 pt-2 border-t border-border/20">
                          {s.status === "published" ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Lock className="h-3 w-3 text-red-400/60" />
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
                                <span className="text-[9px] text-muted-foreground">(স্ট্যাটাস লক)</span>
                              </div>
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-primary gap-1 px-2" onClick={() => {
                                setPublishShootingId(s.id);
                                setPublishChannelId((s as any)?.channel_id || "");
                                setPublishVideoUrl((s as any)?.video_url || "");
                                setPublishDialogOpen(true);
                              }}>
                                <Edit className="h-3 w-3" /> চ্যানেল/লিংক
                              </Button>
                            </div>
                          ) : (
                            <Select value={s.status || "upcoming"} onValueChange={(v) => changeStatus(s.id, v)}>
                              <SelectTrigger className="h-7 border-border/20 bg-secondary/30 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-card border-border/30">
                                {statusOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${opt.color}`}>{opt.label}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Desktop table */}
                <Card className="bg-card border-border/30 overflow-hidden hidden md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/30">
                          <th className="text-left p-3 text-muted-foreground font-medium">নাম</th>
                          <th className="text-left p-3 text-muted-foreground font-medium">লোকেশন</th>
                          <th className="text-left p-3 text-muted-foreground font-medium">তারিখ</th>
                          <th className="text-left p-3 text-muted-foreground font-medium">স্ক্রিপ্ট</th>
                          <th className="text-left p-3 text-muted-foreground font-medium">স্ট্যাটাস</th>
                          <th className="text-center p-3 text-muted-foreground font-medium">পাবলিক</th>
                          <th className="text-right p-3 text-muted-foreground font-medium">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {filtered?.length === 0 && (
                          <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">কোনো শুটিং নেই</td></tr>
                        )}
                        {filtered?.map((s) => {
                          const info = getStatusInfo(s.status);
                          const hasScript = !!(s as any).script_content || !!(s as any).script_url || !!(s as any).scripts?.content;
                          return (
                            <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                              <td className="p-3">
                                <p className="text-foreground font-medium">{s.name}</p>
                                {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                                {s.channels && <p className="text-xs text-primary mt-0.5">📺 {(s as any).channels.name}</p>}
                              </td>
                              <td className="p-3 text-muted-foreground">{s.location || "—"}</td>
                              <td className="p-3 text-muted-foreground">{new Date(s.shoot_date).toLocaleDateString("bn-BD")}</td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm" className={`h-7 text-xs gap-1 ${hasScript ? "text-primary" : "text-muted-foreground"}`} onClick={() => openScriptEditor(s)}>
                                    <FileText className="h-3.5 w-3.5" /> {hasScript ? ((s as any).scripts?.title || "এডিট") : "লিখুন"}
                                  </Button>
                                </div>
                              </td>
                              <td className="p-3">
                                {s.status === "published" ? (
                                  <div className="flex items-center gap-1.5">
                                    <Lock className="h-3 w-3 text-red-400/60" />
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
                                    <Button variant="ghost" size="sm" className="h-6 text-[10px] text-primary gap-1 px-1.5 ml-1" onClick={() => {
                                      setPublishShootingId(s.id);
                                      setPublishChannelId((s as any)?.channel_id || "");
                                      setPublishVideoUrl((s as any)?.video_url || "");
                                      setPublishDialogOpen(true);
                                    }}>
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <Select value={s.status || "upcoming"} onValueChange={(v) => changeStatus(s.id, v)}>
                                    <SelectTrigger className="h-7 w-auto min-w-[120px] border-0 bg-transparent p-0 px-1 focus:ring-0">
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border/30">
                                      {statusOptions.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                          <span className={`text-xs px-2 py-0.5 rounded-full ${opt.color}`}>{opt.label}</span>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <Button variant="ghost" size="sm" className={`h-7 w-7 p-0 ${(s as any).show_on_public ? "text-primary" : "text-muted-foreground/40"}`} onClick={() => togglePublicVisibility(s.id, (s as any).show_on_public)}>
                                  {(s as any).show_on_public ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                </Button>
                              </td>
                              <td className="p-3 text-right">
                                 <div className="flex items-center justify-end gap-1">
                                   {(s.status === "calltime" || s.status === "ongoing") && (
                                     <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300" onClick={() => openCalltimeDialog(s, true)} title="কলটাইম সম্পাদনা">
                                       <Users className="h-4 w-4" />
                                     </Button>
                                   )}
                                   {(s.status === "calltime" || s.status === "ongoing" || s.status === "upcoming") && (
                                     <Button variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300 gap-1" onClick={() => openSmsDialog(s)} title="সদস্যদের SMS পাঠান">
                                       <MessageSquare className="h-4 w-4" />
                                       <span className="text-xs">SMS</span>
                                     </Button>
                                   )}
                                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 gap-1" onClick={() => { setSceneTrackerShootingId(s.id); setSceneTrackerShootingName(s.name); setSceneTrackerOpen(true); }} title="দৃশ্য ট্র্যাকার">
                                      <Clapperboard className="h-4 w-4" />
                                      <span className="text-xs">দৃশ্য</span>
                                    </Button>
                                   <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => openEdit(s)}>
                                     <Edit className="h-4 w-4" />
                                   </Button>
                                   <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => openDeleteDialog(s)}>
                                     <Trash2 className="h-4 w-4" />
                                   </Button>
                                 </div>
                               </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      {scriptEditShooting && (
        <ScriptEditor
          key={(scriptEditShooting as any).id || "shooting-script-editor"}
          open={scriptEditorOpen}
          onOpenChange={setScriptEditorOpen}
          title={`স্ক্রিপ্ট — ${scriptEditShooting.name}`}
          initialContent={(scriptEditShooting as any).script_content || (scriptEditShooting as any).scripts?.content || ""}
          onSave={saveScript}
        />
      )}

      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="bg-card border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">পাবলিশ — চ্যানেল নির্বাচন</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-foreground mb-1 block">চ্যানেল নির্বাচন করুন *</Label>
              <Select value={publishChannelId} onValueChange={setPublishChannelId}>
                <SelectTrigger className="bg-secondary border-border/50">
                  <SelectValue placeholder="চ্যানেল নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/50">
                  {channels?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.platform})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {channels?.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">কোনো চ্যানেল নেই। আগে চ্যানেল যোগ করুন।</p>
              )}
            </div>
            <div>
              <Label className="text-foreground mb-1 block">নাটকের লিংক (YouTube/Facebook)</Label>
              <Input
                value={publishVideoUrl}
                onChange={(e) => setPublishVideoUrl(e.target.value)}
                placeholder="https://youtu.be/... বা https://fb.watch/..."
                className="bg-secondary border-border/50"
              />
              <p className="text-xs text-muted-foreground mt-1">পাবলিক সাইটে এই লিংক দেখানো হবে</p>
            </div>
            <Button onClick={confirmPublish} className="w-full" disabled={!publishChannelId}>
              পাবলিশ করুন
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog with Timer */}
      <Dialog open={deleteDialogOpen} onOpenChange={(v) => { if (!v) { setDeleteTimerActive(false); } setDeleteDialogOpen(v); }}>
        <DialogContent className="bg-card border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> শুটিং ডিলিট করুন
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              আপনি কি <span className="font-semibold text-foreground">"{deleteShootingName}"</span> শুটিংটি ডিলিট করতে চান? এই শুটিংয়ের সকল হাজিরা ডেটাও মুছে যাবে।
            </p>
            <p className="text-xs text-destructive/80">⚠️ এই কাজটি অপরিবর্তনীয়!</p>

            {deleteTimer > 0 && (
              <div className="flex items-center justify-center">
                <div className="relative h-16 w-16">
                  <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-border/30" strokeWidth="2" />
                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-destructive" strokeWidth="2" strokeDasharray={`${(deleteTimer / 5) * 100.53} 100.53`} strokeLinecap="round" style={{ transition: "stroke-dasharray 1s linear" }} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-destructive">{deleteTimer}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 border-border/30" onClick={() => { setDeleteDialogOpen(false); setDeleteTimerActive(false); }}>
                ক্যানসেল
              </Button>
              <Button variant="destructive" className="flex-1" disabled={deleteTimer > 0} onClick={handleDelete}>
                {deleteTimer > 0 ? `অপেক্ষা করুন (${deleteTimer}স)` : "ডিলিট করুন"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ongoing Member Selection Dialog */}
      <Dialog open={ongoingDialogOpen} onOpenChange={setOngoingDialogOpen}>
        <DialogContent className="bg-card border-border/50 max-w-lg max-h-[95vh] flex flex-col p-0">
          <DialogHeader className="px-5 pt-5 pb-0">
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-400" />
              শুটিং কলটাইম নোটিশ
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto flex-1 px-5 pb-5 space-y-4">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-cyan-400">{ongoingShootingName}</span> — কলটাইম, লোকেশন এবং সদস্যদের পোশাক/প্রপস নির্ধারণ করুন
            </p>

            {/* Call Time, Date & Location */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-foreground text-xs">কলটাইম *</Label>
                <Input
                  type="time"
                  value={ongoingCallTime}
                  onChange={(e) => setOngoingCallTime(e.target.value)}
                  className="bg-secondary border-border/50 h-9"
                />
                {/* Quick time presets */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {["06:00", "07:00", "08:00", "09:00", "10:00", "14:00", "16:00"].map((t) => {
                    const hour = parseInt(t.split(":")[0]);
                    const label = hour < 12 ? `সকাল ${hour}টা` : hour === 12 ? `দুপুর ১২টা` : hour <= 16 ? `বিকাল ${hour - 12}টা` : `সন্ধ্যা ${hour - 12}টা`;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setOngoingCallTime(t)}
                        className={`text-[9px] px-1.5 py-0.5 rounded-md border transition-colors ${ongoingCallTime === t ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300" : "bg-secondary/50 border-border/30 text-muted-foreground hover:border-cyan-500/30"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label className="text-foreground text-xs">তারিখ</Label>
                <Input
                  type="date"
                  value={ongoingShootDate}
                  onChange={(e) => setOngoingShootDate(e.target.value)}
                  className="bg-secondary border-border/50 h-9"
                />
              </div>
              <div>
                <Label className="text-foreground text-xs">লোকেশন</Label>
                <Input
                  value={ongoingLocation}
                  onChange={(e) => setOngoingLocation(e.target.value)}
                  placeholder="শুটিং স্পট"
                  className="bg-secondary border-border/50 h-9"
                />
              </div>
            </div>

            {/* Member Selection Header */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs h-7 border-border/30"
                onClick={() => setSelectedMemberIds(allMembers?.map((m: any) => m.id) || [])}>
                সবাই সিলেক্ট
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7 border-border/30"
                onClick={() => { setSelectedMemberIds([]); setMemberDetails({}); }}>
                সব বাদ
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">
                {selectedMemberIds.length}/{allMembers?.length || 0} জন
              </span>
            </div>

            {/* Member List with Costume/Props */}
            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
              {allMembers?.map((member: any) => {
                const isSelected = selectedMemberIds.includes(member.id);
                return (
                  <div key={member.id} className={`rounded-lg transition-all ${
                    isSelected
                      ? "bg-cyan-500/10 ring-1 ring-cyan-500/25"
                      : "bg-secondary/30"
                  }`}>
                    {/* Member row */}
                    <label className="flex items-center gap-3 p-2.5 cursor-pointer">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          setSelectedMemberIds((prev) =>
                            checked ? [...prev, member.id] : prev.filter((id) => id !== member.id)
                          );
                          if (!checked) {
                            setMemberDetails((prev) => {
                              const next = { ...prev };
                              delete next[member.id];
                              return next;
                            });
                          }
                        }}
                        className="border-border/50 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                      />
                      {member.photo_url ? (
                        <img src={member.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-bold">
                          {member.full_name?.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{member.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">ID: {member.member_id}</p>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-cyan-400 shrink-0" />}
                    </label>
                    {/* Costume, Props & Character inputs (shown when selected) */}
                    {isSelected && (
                      <div className="px-3 pb-3 pt-0 space-y-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">চরিত্র</Label>
                          <Input
                            value={memberDetails[member.id]?.character_name || ""}
                            onChange={(e) => setMemberDetails((prev) => ({
                              ...prev,
                              [member.id]: { ...prev[member.id], character_name: e.target.value, costume: prev[member.id]?.costume || "", props: prev[member.id]?.props || "" }
                            }))}
                            placeholder="যেমন: রহিম চাচা"
                            className="bg-secondary/50 border-border/30 h-7 text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">পোশাক</Label>
                            <Input
                              value={memberDetails[member.id]?.costume || ""}
                              onChange={(e) => setMemberDetails((prev) => ({
                                ...prev,
                                [member.id]: { ...prev[member.id], costume: e.target.value, props: prev[member.id]?.props || "", character_name: prev[member.id]?.character_name || "" }
                              }))}
                              placeholder="যেমন: সাদা পাঞ্জাবি"
                              className="bg-secondary/50 border-border/30 h-7 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">প্রপস</Label>
                            <Input
                              value={memberDetails[member.id]?.props || ""}
                              onChange={(e) => setMemberDetails((prev) => ({
                                ...prev,
                                [member.id]: { ...prev[member.id], props: e.target.value, costume: prev[member.id]?.costume || "", character_name: prev[member.id]?.character_name || "" }
                              }))}
                              placeholder="যেমন: ছাতা, ব্যাগ"
                              className="bg-secondary/50 border-border/30 h-7 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Button
              onClick={confirmOngoing}
              disabled={ongoingSubmitting || selectedMemberIds.length === 0}
              className="w-full bg-cyan-600 hover:bg-cyan-700"
            >
              {ongoingSubmitting ? "সেভ হচ্ছে..." : ongoingIsEdit ? `আপডেট করুন (${selectedMemberIds.length} জন)` : `কলটাইম নোটিশ দিন (${selectedMemberIds.length} জন)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revert Status Password Dialog */}
      <Dialog open={revertDialogOpen} onOpenChange={setRevertDialogOpen}>
        <DialogContent className="bg-card border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Lock className="h-5 w-5 text-red-400" />
              স্ট্যাটাস পেছনে নেওয়া
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-red-500/10 border border-red-500/15 p-3">
              <p className="text-[11px] text-red-300/90 leading-relaxed">
                ⚠️ আপনি স্ট্যাটাস পেছনে নিয়ে যেতে চাচ্ছেন। এই কাজটি সম্পন্ন করতে আপনার এডমিন পাসওয়ার্ড প্রয়োজন।
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>পরিবর্তন:</span>
              <span className={`px-2 py-0.5 rounded-full ${getStatusInfo(shootings?.find(s => s.id === revertShootingId)?.status)?.color}`}>
                {getStatusInfo(shootings?.find(s => s.id === revertShootingId)?.status)?.label}
              </span>
              <span>→</span>
              <span className={`px-2 py-0.5 rounded-full ${getStatusInfo(revertNewStatus)?.color}`}>
                {getStatusInfo(revertNewStatus)?.label}
              </span>
            </div>
            <div>
              <Label className="text-foreground text-xs">এডমিন পাসওয়ার্ড *</Label>
              <Input
                type="password"
                value={revertPassword}
                onChange={(e) => setRevertPassword(e.target.value)}
                placeholder="পাসওয়ার্ড লিখুন"
                className="bg-secondary border-border/50 mt-1"
                onKeyDown={(e) => e.key === "Enter" && handleRevertWithPassword()}
              />
            </div>
            <Button onClick={handleRevertWithPassword} disabled={revertVerifying} className="w-full">
              {revertVerifying ? "যাচাই হচ্ছে..." : "নিশ্চিত করুন"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SMS Broadcast Dialog */}
      <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
        <DialogContent className="bg-card border-border/50 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-400" />
              SMS পাঠান — {smsShootingName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-foreground text-xs mb-1 block">বার্তা *</Label>
              <Textarea
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                rows={7}
                className="bg-secondary border-border/50 text-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-1">তারিখ, কলটাইম ও লোকেশন স্বয়ংক্রিয় ভাবে যুক্ত হয়েছে — প্রয়োজনে এডিট করুন।</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-foreground text-xs">সদস্য নির্বাচন ({smsSelected.length}/{smsMembers.length})</Label>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setSmsSelected(smsMembers.map((m: any) => m.id))}>সব</Button>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setSmsSelected([])}>কেউ না</Button>
                </div>
              </div>
              <Input
                placeholder="সদস্য খুঁজুন..."
                value={smsSearch}
                onChange={(e) => setSmsSearch(e.target.value)}
                className="bg-secondary border-border/50 h-8 text-xs mb-2"
              />
              <div className="max-h-56 overflow-y-auto border border-border/30 rounded-lg divide-y divide-border/20">
                {smsMembers.length === 0 && (
                  <p className="p-3 text-xs text-center text-muted-foreground">কোনো সদস্য নেই</p>
                )}
                {smsMembers
                  .filter((m: any) => !smsSearch || (m.full_name || "").toLowerCase().includes(smsSearch.toLowerCase()) || (m.member_id || "").toLowerCase().includes(smsSearch.toLowerCase()))
                  .map((m: any) => (
                    <label key={m.id} className="flex items-center gap-2 p-2 hover:bg-secondary/40 cursor-pointer">
                      <Checkbox checked={smsSelected.includes(m.id)} onCheckedChange={() => toggleSmsMember(m.id)} />
                      <span className="text-xs text-foreground flex-1 truncate">{m.full_name}</span>
                      <span className="text-[10px] text-muted-foreground">#{m.member_id}</span>
                    </label>
                  ))}
              </div>
            </div>

            <Button onClick={sendShootingSms} disabled={smsSending || smsSelected.length === 0} className="w-full gap-2 bg-emerald-500 hover:bg-emerald-600 text-white">
              <Send className="h-4 w-4" />
              {smsSending ? "পাঠানো হচ্ছে..." : `SMS পাঠান (${smsSelected.length} জন)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ShootingSceneTracker
        shootingId={sceneTrackerShootingId}
        shootingName={sceneTrackerShootingName}
        open={sceneTrackerOpen}
        onOpenChange={setSceneTrackerOpen}
      />
    </AppLayout>
  );
};

export default AdminShootings;
