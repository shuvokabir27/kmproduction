import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Film, Plus, FileText, Edit, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScriptEditor } from "@/components/ScriptEditor";

const statusOptions = [
  { value: "plan", label: "প্লান", color: "bg-muted/50 text-muted-foreground" },
  { value: "upcoming", label: "আসন্ন", color: "bg-warning/10 text-warning" },
  { value: "ongoing", label: "চলছে", color: "bg-primary/10 text-primary" },
  { value: "completed", label: "শুটিং শেষ", color: "bg-success/10 text-success" },
  { value: "editing", label: "এডিটিং চলছে", color: "bg-accent/50 text-accent-foreground" },
  { value: "editing_done", label: "এডিটিং শেষ", color: "bg-success/15 text-success" },
  { value: "published", label: "পাবলিশ হয়েছে", color: "bg-success/10 text-success" },
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
  const [selectedScriptId, setSelectedScriptId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [scriptEditorOpen, setScriptEditorOpen] = useState(false);
  const [scriptEditShooting, setScriptEditShooting] = useState<any>(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishShootingId, setPublishShootingId] = useState<string>("");
  const [publishChannelId, setPublishChannelId] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteShootingId, setDeleteShootingId] = useState<string>("");
  const [deleteShootingName, setDeleteShootingName] = useState<string>("");
  const [deleteTimer, setDeleteTimer] = useState(5);
  const [deleteTimerActive, setDeleteTimerActive] = useState(false);

  const { data: shootings } = useQuery({
    queryKey: ["admin-shootings"],
    queryFn: async () => {
      const { data } = await supabase.from("shootings").select("*, channels(name, platform)" as any).order("shoot_date", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  // Delete timer effect - must be before early returns
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
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const resetForm = () => {
    setEditId(null);
    setName(""); setDescription(""); setLocation(""); setShootDate(""); setStatus("plan"); setScriptUrl(""); setSelectedScriptId("");
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
          name, description, location, shoot_date: shootDate, status, script_url: scriptUrl || null, script_id: scriptId
        } as any).eq("id", editId);
        if (error) throw error;
        toast.success("শুটিং আপডেট হয়েছে!");
      } else {
        const scriptId2 = selectedScriptId && selectedScriptId !== "none" ? selectedScriptId : null;
        const { error } = await supabase.from("shootings").insert({
          name, description, location, shoot_date: shootDate, status, script_url: scriptUrl || null, script_id: scriptId2
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

  const changeStatus = async (shootingId: string, newStatus: string) => {
    if (newStatus === "published") {
      setPublishShootingId(shootingId);
      setPublishChannelId("");
      setPublishDialogOpen(true);
      return;
    }
    const { error } = await supabase.from("shootings").update({ status: newStatus }).eq("id", shootingId);
    if (error) { toast.error(error.message); return; }
    const info = getStatusInfo(newStatus);
    toast.success(`স্ট্যাটাস পরিবর্তন: ${info.label}`);
    queryClient.invalidateQueries({ queryKey: ["admin-shootings"] });
  };

  const confirmPublish = async () => {
    if (!publishChannelId) { toast.error("চ্যানেল নির্বাচন করুন"); return; }
    const { error } = await supabase.from("shootings").update({
      status: "published", channel_id: publishChannelId
    } as any).eq("id", publishShootingId);
    if (error) { toast.error(error.message); return; }
    toast.success("পাবলিশ হয়েছে!");
    setPublishDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["admin-shootings"] });
  };

  const openScriptEditor = (shooting: any) => {
    setScriptEditShooting(shooting);
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
                  <Select value={selectedScriptId} onValueChange={setSelectedScriptId}>
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
            <TabsTrigger value="all" className="text-xs">সব ({shootings?.length || 0})</TabsTrigger>
            {statusOptions.map((s) => {
              const count = shootings?.filter((sh) => (sh.status || "upcoming") === s.value).length || 0;
              return (
                <TabsTrigger key={s.value} value={s.value} className="text-[10px] md:text-xs px-2">
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
                    const hasScript = !!(s as any).script_content || !!(s as any).script_url;
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
                             <Button variant="ghost" size="sm" className={`h-7 w-7 p-0 ${hasScript ? "text-primary" : "text-muted-foreground"}`} onClick={() => openScriptEditor(s)}>
                               <FileText className="h-3.5 w-3.5" />
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
                          <th className="text-right p-3 text-muted-foreground font-medium">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {filtered?.length === 0 && (
                          <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">কোনো শুটিং নেই</td></tr>
                        )}
                        {filtered?.map((s) => {
                          const info = getStatusInfo(s.status);
                          const hasScript = !!(s as any).script_content || !!(s as any).script_url;
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
                                    <FileText className="h-3.5 w-3.5" /> {hasScript ? "এডিট" : "লিখুন"}
                                  </Button>
                                </div>
                              </td>
                              <td className="p-3">
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
                              </td>
                              <td className="p-3 text-right">
                                 <div className="flex items-center justify-end gap-1">
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
          open={scriptEditorOpen}
          onOpenChange={setScriptEditorOpen}
          title={`স্ক্রিপ্ট — ${scriptEditShooting.name}`}
          initialContent={(scriptEditShooting as any).script_content || ""}
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
            <Button onClick={confirmPublish} className="w-full" disabled={!publishChannelId}>
              পাবলিশ করুন
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default AdminShootings;
