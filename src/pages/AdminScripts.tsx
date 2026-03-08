import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Edit, Trash2, Search, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const AdminScripts = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [titleDialogOpen, setTitleDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
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

  const filtered = scripts?.filter((s: any) =>
    s.title?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

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
        navigate(`/admin/scripts/${(data as any).id}`);
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

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("scripts" as any).delete().eq("id", deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success("স্ক্রিপ্ট মুছে ফেলা হয়েছে!");
    setDeleteId(null);
    queryClient.invalidateQueries({ queryKey: ["admin-scripts"] });
  };

  const getPreview = (content: string) => {
    if (!content) return "খালি স্ক্রিপ্ট";
    // Try parsing sequence format
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

        <div className="grid gap-3">
          {filtered.length === 0 && (
            <Card className="bg-card border-border/30 p-8 text-center text-muted-foreground">
              {search ? "কোনো স্ক্রিপ্ট পাওয়া যায়নি" : "কোনো স্ক্রিপ্ট নেই। নতুন স্ক্রিপ্ট তৈরি করুন।"}
            </Card>
          )}
          {filtered.map((script: any) => (
            <Card
              key={script.id}
              className="bg-card border-border/30 p-4 hover:border-primary/30 transition-colors cursor-pointer group"
              onClick={() => navigate(`/admin/scripts/${script.id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="text-foreground font-semibold text-sm truncate">{script.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{getPreview(script.content)}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(script.updated_at).toLocaleDateString("bn-BD")}</span>
                    <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px]">{getSeqCount(script.content)} সিকুয়েন্স</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={() => openRenameScript(script)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(script.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
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

      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">স্ক্রিপ্ট মুছে ফেলুন?</AlertDialogTitle>
            <AlertDialogDescription>এটি মুছে ফেললে আর ফিরিয়ে আনা যাবে না।</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/50">বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">মুছে ফেলুন</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default AdminScripts;
