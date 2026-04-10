import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Save, Loader2, Film, GripVertical } from "lucide-react";

interface Scene {
  id: string;
  scene_number: number;
  description: string | null;
  location: string | null;
  characters: string | null;
  project_id: string;
  sort_order: number | null;
}

interface Props {
  projectId: string;
  scenes: Scene[];
  onUpdate: () => void;
}

export function ClientSceneEditor({ projectId, scenes, onUpdate }: Props) {
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [newScene, setNewScene] = useState({ description: "", location: "", characters: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ description: "", location: "", characters: "" });

  const handleAdd = async () => {
    if (!newScene.description.trim()) {
      toast.error("সিনের বিবরণ লিখুন");
      return;
    }
    setSaving("new");
    const nextNumber = scenes.length > 0 ? Math.max(...scenes.map(s => s.scene_number)) + 1 : 1;
    const { error } = await (supabase as any)
      .from("freelance_scenes")
      .insert({
        project_id: projectId,
        scene_number: nextNumber,
        description: newScene.description.trim(),
        location: newScene.location.trim() || null,
        characters: newScene.characters.trim() || null,
        sort_order: nextNumber,
      });
    setSaving(null);
    if (error) {
      toast.error("সিন যোগ করতে সমস্যা হয়েছে");
    } else {
      toast.success("সিন যোগ হয়েছে");
      setNewScene({ description: "", location: "", characters: "" });
      setAdding(false);
      onUpdate();
    }
  };

  const handleUpdate = async (sceneId: string) => {
    setSaving(sceneId);
    const { error } = await (supabase as any)
      .from("freelance_scenes")
      .update({
        description: editData.description.trim() || null,
        location: editData.location.trim() || null,
        characters: editData.characters.trim() || null,
      })
      .eq("id", sceneId);
    setSaving(null);
    if (error) {
      toast.error("আপডেট করতে সমস্যা হয়েছে");
    } else {
      toast.success("সিন আপডেট হয়েছে");
      setEditingId(null);
      onUpdate();
    }
  };

  const handleDelete = async (sceneId: string) => {
    if (!confirm("এই সিনটি মুছে ফেলতে চান?")) return;
    setDeleting(sceneId);
    const { error } = await (supabase as any)
      .from("freelance_scenes")
      .delete()
      .eq("id", sceneId);
    setDeleting(null);
    if (error) {
      toast.error("মুছতে সমস্যা হয়েছে");
    } else {
      toast.success("সিন মুছে ফেলা হয়েছে");
      onUpdate();
    }
  };

  const startEdit = (scene: Scene) => {
    setEditingId(scene.id);
    setEditData({
      description: scene.description || "",
      location: scene.location || "",
      characters: scene.characters || "",
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-1.5">
          <Film className="h-4 w-4 text-primary" /> সিন বাই সিন লাইনআপ ({scenes.length})
        </h4>
        <Button size="sm" variant="outline" onClick={() => setAdding(!adding)} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> সিন যোগ করুন
        </Button>
      </div>

      {/* Add new scene form */}
      {adding && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
          <Textarea
            placeholder="সিনের বিবরণ লিখুন..."
            value={newScene.description}
            onChange={(e) => setNewScene({ ...newScene, description: e.target.value })}
            rows={2}
            className="text-sm resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="লোকেশন"
              value={newScene.location}
              onChange={(e) => setNewScene({ ...newScene, location: e.target.value })}
              className="text-sm"
            />
            <Input
              placeholder="চরিত্র"
              value={newScene.characters}
              onChange={(e) => setNewScene({ ...newScene, characters: e.target.value })}
              className="text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={saving === "new"} className="gap-1.5 text-xs">
              {saving === "new" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              সেভ করুন
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="text-xs">বাতিল</Button>
          </div>
        </div>
      )}

      {/* Scene list */}
      {scenes.length > 0 && (
        <div className="rounded-lg border border-border/30 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/30 border-b border-border/30">
                <th className="text-left p-2.5 font-medium text-foreground w-14">সিন</th>
                <th className="text-left p-2.5 font-medium text-foreground">বিবরণ</th>
                <th className="text-left p-2.5 font-medium text-foreground hidden sm:table-cell">লোকেশন</th>
                <th className="text-left p-2.5 font-medium text-foreground hidden sm:table-cell">চরিত্র</th>
                <th className="p-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {scenes.map((s) => (
                <tr key={s.id} className="border-b border-border/15">
                  {editingId === s.id ? (
                    <>
                      <td className="p-2 font-bold text-foreground align-top">{s.scene_number}</td>
                      <td className="p-2" colSpan={3}>
                        <div className="space-y-2">
                          <Textarea
                            value={editData.description}
                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            rows={2}
                            placeholder="বিবরণ"
                            className="text-xs resize-none"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={editData.location}
                              onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                              placeholder="লোকেশন"
                              className="text-xs"
                            />
                            <Input
                              value={editData.characters}
                              onChange={(e) => setEditData({ ...editData, characters: e.target.value })}
                              placeholder="চরিত্র"
                              className="text-xs"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-2 align-top">
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleUpdate(s.id)} disabled={saving === s.id}>
                            {saving === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 text-emerald-400" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                            <span className="text-xs">✕</span>
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-2.5 font-bold text-foreground">{s.scene_number}</td>
                      <td className="p-2.5 text-foreground">{s.description || "—"}</td>
                      <td className="p-2.5 text-muted-foreground hidden sm:table-cell">{s.location || "—"}</td>
                      <td className="p-2.5 text-muted-foreground hidden sm:table-cell">{s.characters || "—"}</td>
                      <td className="p-2.5">
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(s)}>
                            <Save className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(s.id)} disabled={deleting === s.id}>
                            {deleting === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
                          </Button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {scenes.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground text-center py-3">কোনো সিন নেই। "সিন যোগ করুন" বাটনে ক্লিক করে সিন লিখুন।</p>
      )}
    </div>
  );
}
