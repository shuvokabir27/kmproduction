import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Plus, Edit, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const extractYouTubeId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

interface ProductVideoManagerProps {
  /** 'home' = shows on products/home page, 'landing' = shows on landing page only */
  location?: "home" | "landing";
  heading?: string;
}

const ProductVideoManager = ({ location = "home", heading }: ProductVideoManagerProps = {}) => {
  const queryClient = useQueryClient();
  const queryKey = ["admin-popular-videos", location];
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { data: videos } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await supabase
        .from("popular_videos" as any)
        .select("*")
        .eq("location", location)
        .order("sort_order", { ascending: true });
      return (data ?? []) as any[];
    },
  });

  const resetForm = () => {
    setEditId(null);
    setTitle("");
    setDescription("");
    setVideoUrl("");
    setSortOrder(0);
    setIsActive(true);
  };

  const openAdd = () => {
    resetForm();
    setSortOrder((videos?.length ?? 0) + 1);
    setOpen(true);
  };

  const openEdit = (v: any) => {
    setEditId(v.id);
    setTitle(v.title);
    setDescription(v.description || "");
    setVideoUrl(v.video_url);
    setSortOrder(v.sort_order || 0);
    setIsActive(v.is_active);
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) { toast.error("ভিডিও লিংক দিন"); return; }
    setSubmitting(true);
    try {
      const payload = { title, description: description || null, video_url: videoUrl, sort_order: sortOrder, is_active: isActive, location };
      if (editId) {
        const { error } = await supabase.from("popular_videos" as any).update(payload).eq("id", editId);
        if (error) throw error;
        toast.success("ভিডিও আপডেট হয়েছে!");
      } else {
        const { error } = await supabase.from("popular_videos" as any).insert(payload);
        if (error) throw error;
        toast.success("ভিডিও যোগ হয়েছে!");
      }
      queryClient.invalidateQueries({ queryKey });
      setOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("popular_videos" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("ভিডিও ডিলিট হয়েছে!");
    queryClient.invalidateQueries({ queryKey });
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("popular_videos" as any).update({ is_active: !current }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(!current ? "সক্রিয় করা হয়েছে" : "নিষ্ক্রিয় করা হয়েছে");
    queryClient.invalidateQueries({ queryKey });
  };

  const moveOrder = async (id: string, currentOrder: number, direction: "up" | "down") => {
    const newOrder = direction === "up" ? currentOrder - 1 : currentOrder + 1;
    const { error } = await supabase.from("popular_videos" as any).update({ sort_order: newOrder }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" /> {heading ?? "প্রডাক্ট ভিডিও"}
        </h2>
        <Button className="gap-2 text-xs" size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" /> নতুন ভিডিও
        </Button>
      </div>

      {videos?.length === 0 && (
        <Card className="bg-card border-border/30 p-8 text-center text-muted-foreground">
          কোনো ভিডিও নেই। উপরের বাটনে ক্লিক করে যোগ করুন।
        </Card>
      )}

      <div className="space-y-3">
        {videos?.map((v: any) => {
          const youtubeId = extractYouTubeId(v.video_url);
          return (
            <Card key={v.id} className={`bg-card border-border/30 p-3 transition-opacity ${!v.is_active ? "opacity-50" : ""}`}>
              <div className="flex gap-3">
                <div className="w-28 md:w-40 shrink-0 rounded-lg overflow-hidden bg-muted/30 aspect-video">
                  {youtubeId ? (
                    <img src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`} alt={v.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm truncate">{v.title}</h3>
                  {v.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{v.description}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">{v.video_url}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => moveOrder(v.id, v.sort_order, "up")}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={() => moveOrder(v.id, v.sort_order, "down")}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Switch checked={v.is_active} onCheckedChange={() => toggleActive(v.id, v.is_active)} className="ml-2" />
                    <span className="text-[10px] text-muted-foreground ml-1">{v.is_active ? "সক্রিয়" : "নিষ্ক্রিয়"}</span>
                    <div className="flex-1" />
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" onClick={() => openEdit(v)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(v.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editId ? "ভিডিও সম্পাদনা" : "নতুন ভিডিও যোগ করুন"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-foreground">শিরোনাম</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="bg-secondary border-border/50" placeholder="ভিডিওর নাম" />
            </div>
            <div>
              <Label className="text-foreground">বিবরণ (অপশনাল)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-secondary border-border/50" placeholder="সংক্ষিপ্ত বিবরণ" />
            </div>
            <div>
              <Label className="text-foreground">ভিডিও লিংক (YouTube / Facebook)</Label>
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} required className="bg-secondary border-border/50" placeholder="https://youtu.be/... বা https://fb.watch/..." />
              {videoUrl && extractYouTubeId(videoUrl) && (
                <div className="mt-2 rounded-lg overflow-hidden aspect-video">
                  <img src={`https://img.youtube.com/vi/${extractYouTubeId(videoUrl)}/mqdefault.jpg`} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-foreground">ক্রম</Label>
                <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} className="bg-secondary border-border/50" />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/30 bg-secondary/30 p-3">
                <Label className="text-foreground text-sm">সক্রিয়</Label>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "সেভ হচ্ছে..." : editId ? "আপডেট করুন" : "সেভ করুন"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductVideoManager;
