import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tv, Plus, Edit, Trash2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const platformOptions = [
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "other", label: "অন্যান্য" },
];

const AdminChannels = () => {
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("youtube");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: channels } = useQuery({
    queryKey: ["admin-channels"],
    queryFn: async () => {
      const { data } = await supabase.from("channels" as any).select("*").order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  // Count published shootings per channel
  const { data: shootings } = useQuery({
    queryKey: ["channel-shootings"],
    queryFn: async () => {
      const { data } = await supabase.from("shootings").select("id, name, channel_id, status" as any).eq("status", "published");
      return (data ?? []) as any[];
    },
  });

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const resetForm = () => { setEditId(null); setName(""); setPlatform("youtube"); setUrl(""); };

  const openAdd = () => { resetForm(); setOpen(true); };

  const openEdit = (c: any) => {
    setEditId(c.id);
    setName(c.name || "");
    setPlatform(c.platform || "youtube");
    setUrl(c.url || "");
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("চ্যানেলের নাম দিন"); return; }
    setSubmitting(true);
    try {
      if (editId) {
        const { error } = await supabase.from("channels" as any).update({ name, platform, url: url || null } as any).eq("id", editId);
        if (error) throw error;
        toast.success("চ্যানেল আপডেট হয়েছে!");
      } else {
        const { error } = await supabase.from("channels" as any).insert({ name, platform, url: url || null } as any);
        if (error) throw error;
        toast.success("চ্যানেল যোগ হয়েছে!");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-channels"] });
      setOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("এই চ্যানেল মুছে ফেলতে চান?")) return;
    const { error } = await supabase.from("channels" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("চ্যানেল মুছে ফেলা হয়েছে");
    queryClient.invalidateQueries({ queryKey: ["admin-channels"] });
  };

  const getShootingCount = (channelId: string) =>
    shootings?.filter((s: any) => s.channel_id === channelId).length || 0;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Tv className="h-6 w-6 text-primary" /> চ্যানেল ম্যানেজমেন্ট
            </h1>
            <p className="text-muted-foreground text-sm">{channels?.length || 0} টি চ্যানেল</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={openAdd}><Plus className="h-4 w-4" /> চ্যানেল যোগ করুন</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border/50">
              <DialogHeader>
                <DialogTitle className="text-foreground">{editId ? "চ্যানেল সম্পাদনা" : "নতুন চ্যানেল যোগ করুন"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-foreground">চ্যানেলের নাম *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required className="bg-secondary border-border/50" placeholder="যেমন: My YouTube Channel" />
                </div>
                <div>
                  <Label className="text-foreground">প্ল্যাটফর্ম</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger className="bg-secondary border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/50">
                      {platformOptions.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-foreground">চ্যানেল URL (অপশনাল)</Label>
                  <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/@channel" className="bg-secondary border-border/50" />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "সেভ হচ্ছে..." : editId ? "আপডেট করুন" : "যোগ করুন"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels?.map((c: any) => (
            <Card key={c.id} className="bg-card border-border/50 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Tv className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{platformOptions.find(p => p.value === c.platform)?.label || c.platform}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => openEdit(c)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{getShootingCount(c.id)} টি পাবলিশ</span>
                {c.url && (
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> ভিজিট
                  </a>
                )}
              </div>
            </Card>
          ))}
          {channels?.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground">কোনো চ্যানেল নেই। উপরে "চ্যানেল যোগ করুন" বাটনে ক্লিক করুন।</div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminChannels;
