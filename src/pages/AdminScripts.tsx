import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Edit, Trash2, Search, Clock, RotateCcw, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminScripts = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [titleDialogOpen, setTitleDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [permanentDeleteId, setPermanentDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: scripts } = useQuery({
    queryKey: ["admin-scripts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("scripts" as any)
        .select("*")
        .order("updated_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const activeScripts = scripts?.filter((s: any) => !s.is_deleted) ?? [];
  const trashedScripts = scripts?.filter((s: any) => s.is_deleted) ?? [];

  const filtered = activeScripts.filter((s: any) =>
    s.title?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTrashed = trashedScripts.filter((s: any) =>
    s.title?.toLowerCase().includes(search.toLowerCase())
  );

  const openNewScript = () => {
    setEditingId(null);
    setNewTitle("");
    setTitleDialogOpen(true);
  };

  const openRenameScript = (script: any) => {
    setEditingId(script.id);
    setNewTitle(script.title);
    setTitleDialogOpen(true);
  };

  const handleSaveTitle = async () => {
    if (!newTitle.trim()) { toast.error("শিরোনাম দিন"); return; }
    setSubmitting(true);
    try {
      if (editingId) {
        const { error } = await supabase.from("scripts" as any).update({ title: newTitle.trim(), updated_at: new Date().toISOString() } as any).eq("id", editingId);
        if (error) throw error;
        toast.success("শিরোনাম আপডেট হয়েছে!");
      } else {
        const { data, error } = await supabase.from("scripts" as any).insert({ title: newTitle.trim() } as any).select().single();
        if (error) throw error;
        toast.success("স্ক্রিপ্ট তৈরি হয়েছে!");
        setTitleDialogOpen(false);
        navigate(`/admin/scripts/${(data as any).id}?mode=edit`);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["admin-scripts"] });
      if (editingId) setTitleDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Soft delete — move to trash
  const handleSoftDelete = async () => {
    if (!deleteId) return;
    const { error } = await (supabase as any).from("scripts").update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("id", deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success("স্ক্রিপ্ট ট্র্যাশে সরানো হয়েছে!");
    setDeleteId(null);
    queryClient.invalidateQueries({ queryKey: ["admin-scripts"] });
  };

  // Restore from trash
  const handleRestore = async (scriptId: string) => {
    const { error } = await (supabase as any).from("scripts").update({ is_deleted: false, deleted_at: null }).eq("id", scriptId);
    if (error) { toast.error(error.message); return; }
    toast.success("স্ক্রিপ্ট পুনরুদ্ধার হয়েছে!");
    queryClient.invalidateQueries({ queryKey: ["admin-scripts"] });
  };

  // Permanent delete
  const handlePermanentDelete = async () => {
    if (!permanentDeleteId) return;
    const { error } = await supabase.from("scripts" as any).delete().eq("id", permanentDeleteId);
    if (error) { toast.error(error.message); return; }
    toast.success("স্ক্রিপ্ট চিরতরে মুছে ফেলা হয়েছে!");
    setPermanentDeleteId(null);
    queryClient.invalidateQueries({ queryKey: ["admin-scripts"] });
  };

  const getPreview = (content: string) => {
    if (!content) return "খালি স্ক্রিপ্ট";
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        const allText = parsed.map((s: any) => s.content?.replace(/<[^>]+>/g, "") || "").join(" ").trim();
        return allText.length > 100 ? allText.substring(0, 100) + "..." : allText || "খালি স্ক্রিপ্ট";
      }
    } catch {}
    const text = content.replace(/<[^>]+>/g, "").trim();
    return text.length > 100 ? text.substring(0, 100) + "..." : text || "খালি স্ক্রিপ্ট";
  };

  const getSeqCount = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed.length;
    } catch {}
    return 1;
  };

  const getEpisodeCount = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        const episodes = new Set<string>();
        parsed.forEach((s: any) => {
          const match = s.title?.match(/পর্ব\s*[:\-–—]?\s*(.+)/i);
          if (match) episodes.add(match[1].trim());
          else {
            const epMatch = s.title?.match(/ep(?:isode)?\s*[:\-–—]?\s*(\d+)/i);
            if (epMatch) episodes.add(epMatch[1]);
          }
        });
        return episodes.size;
      }
    } catch {}
    return 0;
  };

  const toBn = (n: number) => String(n).replace(/\d/g, (d: string) => "০১২৩৪৫৬৭৮৯"[+d]);

  const ScriptCard = ({ script, isTrashed = false }: { script: any; isTrashed?: boolean }) => {
    const sceneCount = getSeqCount(script.content);
    const episodeCount = getEpisodeCount(script.content);

    return (
      <Card
        key={script.id}
        className={`bg-card border-border/30 p-4 transition-colors group ${isTrashed ? "opacity-70" : "hover:border-primary/30 cursor-pointer"}`}
        onClick={() => !isTrashed && navigate(`/admin/scripts/${script.id}`)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <FileText className={`h-4 w-4 shrink-0 ${isTrashed ? "text-muted-foreground" : "text-primary"}`} />
              <h3 className={`font-semibold text-sm truncate ${isTrashed ? "text-muted-foreground line-through" : "text-foreground"}`}>{script.title}</h3>
              {!isTrashed && (
                <button
                  className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => { e.stopPropagation(); openRenameScript(script); }}
                  title="শিরোনাম পরিবর্তন"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{getPreview(script.content)}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(isTrashed ? script.deleted_at : script.updated_at).toLocaleDateString("bn-BD")}</span>
              {!isTrashed && (
                <>
                  <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px]">দৃশ্য {toBn(sceneCount)} টা</span>
                  {episodeCount > 0 && <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px]">পর্ব {toBn(episodeCount)} টা</span>}
                </>
              )}
              {isTrashed && <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-[10px]">ট্র্যাশে আছে</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {isTrashed ? (
              <>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary hover:text-primary" onClick={() => handleRestore(script.id)} title="পুনরুদ্ধার">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => setPermanentDeleteId(script.id)} title="চিরতরে মুছুন">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(script.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> স্ক্রিপ্ট ম্যানেজমেন্ট
          </h1>
          <Button className="gap-2" onClick={openNewScript}>
            <Plus className="h-4 w-4" /> নতুন স্ক্রিপ্ট
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="স্ক্রিপ্ট খুঁজুন..." className="pl-9 bg-secondary border-border/50" />
        </div>

        <Tabs defaultValue="active">
          <TabsList className="bg-secondary/50 border border-border/20">
            <TabsTrigger value="active" className="gap-1.5 text-xs data-[state=active]:bg-primary/10">
              <FileText className="h-3.5 w-3.5" /> স্ক্রিপ্ট ({toBn(activeScripts.length)})
            </TabsTrigger>
            <TabsTrigger value="trash" className="gap-1.5 text-xs data-[state=active]:bg-destructive/10 data-[state=active]:text-destructive">
              <Trash className="h-3.5 w-3.5" /> ট্র্যাশ ({toBn(trashedScripts.length)})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <div className="grid gap-3 mt-3">
              {filtered.length === 0 && (
                <Card className="bg-card border-border/30 p-8 text-center text-muted-foreground">
                  {search ? "কোনো স্ক্রিপ্ট পাওয়া যায়নি" : "কোনো স্ক্রিপ্ট নেই। নতুন স্ক্রিপ্ট তৈরি করুন।"}
                </Card>
              )}
              {filtered.map((script: any) => (
                <ScriptCard key={script.id} script={script} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="trash">
            <div className="grid gap-3 mt-3">
              {filteredTrashed.length === 0 && (
                <Card className="bg-card border-border/30 p-8 text-center text-muted-foreground">
                  <Trash className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>ট্র্যাশ খালি</p>
                  <p className="text-xs mt-1">মুছে ফেলা স্ক্রিপ্ট এখানে দেখা যাবে</p>
                </Card>
              )}
              {filteredTrashed.map((script: any) => (
                <ScriptCard key={script.id} script={script} isTrashed />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={titleDialogOpen} onOpenChange={setTitleDialogOpen}>
        <DialogContent className="bg-card border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingId ? "শিরোনাম পরিবর্তন" : "নতুন স্ক্রিপ্ট"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveTitle(); }} className="space-y-4">
            <div>
              <Label className="text-foreground">শিরোনাম</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="স্ক্রিপ্টের নাম লিখুন..." className="bg-secondary border-border/50" autoFocus />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "সেভ হচ্ছে..." : editingId ? "আপডেট করুন" : "তৈরি করুন ও লিখুন"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Soft delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">স্ক্রিপ্ট ট্র্যাশে সরান?</AlertDialogTitle>
            <AlertDialogDescription>স্ক্রিপ্টটি ট্র্যাশে সরানো হবে। পরে ট্র্যাশ থেকে পুনরুদ্ধার করা যাবে।</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/50">বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={handleSoftDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">ট্র্যাশে সরান</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent delete confirmation */}
      <AlertDialog open={!!permanentDeleteId} onOpenChange={(v) => { if (!v) setPermanentDeleteId(null); }}>
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">চিরতরে মুছে ফেলুন?</AlertDialogTitle>
            <AlertDialogDescription>এটি মুছে ফেললে আর কখনো ফিরিয়ে আনা যাবে না। আপনি কি নিশ্চিত?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/50">বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={handlePermanentDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">চিরতরে মুছুন</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default AdminScripts;