import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clapperboard, Plus, Trash2, Check, X, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  shootingId: string;
  shootingName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShootingSceneTracker({ shootingId, shootingName, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [newScene, setNewScene] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: scenes, isLoading } = useQuery({
    queryKey: ["shooting-scenes", shootingId],
    enabled: !!shootingId && open,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("shooting_scenes")
        .select("*")
        .eq("shooting_id", shootingId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const addScene = async () => {
    if (!newScene.trim()) return;
    setAdding(true);
    try {
      const nextOrder = (scenes?.length ?? 0) + 1;
      const { error } = await (supabase as any).from("shooting_scenes").insert({
        shooting_id: shootingId,
        scene_label: newScene.trim(),
        sort_order: nextOrder,
      });
      if (error) throw error;
      setNewScene("");
      queryClient.invalidateQueries({ queryKey: ["shooting-scenes", shootingId] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  const toggleShot = async (sceneId: string, currentlyShot: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from("shooting_scenes")
        .update({
          is_shot: !currentlyShot,
          shot_at: !currentlyShot ? new Date().toISOString() : null,
        })
        .eq("id", sceneId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["shooting-scenes", shootingId] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteScene = async (sceneId: string) => {
    try {
      const { error } = await (supabase as any).from("shooting_scenes").delete().eq("id", sceneId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["shooting-scenes", shootingId] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const shotCount = scenes?.filter((s: any) => s.is_shot).length ?? 0;
  const totalCount = scenes?.length ?? 0;
  const progress = totalCount > 0 ? (shotCount / totalCount) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/50 max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Clapperboard className="h-5 w-5 text-primary" />
            দৃশ্য ট্র্যাকার
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{shootingName}</p>
        </DialogHeader>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                শুট সম্পন্ন: <span className="text-primary font-semibold">{shotCount}/{totalCount}</span>
              </span>
              <span className={`font-medium ${progress === 100 ? "text-emerald-400" : "text-primary"}`}>
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? "bg-emerald-500" : "bg-primary"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Add new scene */}
        <div className="flex gap-2">
          <Input
            value={newScene}
            onChange={(e) => setNewScene(e.target.value)}
            placeholder="দৃশ্যের নাম লিখুন (যেমন: দৃশ্য ১, ওপেনিং সিন)"
            className="bg-secondary border-border/50 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") addScene();
            }}
          />
          <Button size="sm" onClick={addScene} disabled={adding || !newScene.trim()} className="shrink-0 gap-1">
            <Plus className="h-3.5 w-3.5" /> যোগ
          </Button>
        </div>

        {/* Scene list */}
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {isLoading && <p className="text-center text-muted-foreground text-sm py-4">লোড হচ্ছে...</p>}
          {!isLoading && totalCount === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Clapperboard className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">কোনো দৃশ্য যোগ করা হয়নি</p>
              <p className="text-xs mt-1">উপরে দৃশ্যের নাম লিখে যোগ করুন</p>
            </div>
          )}
          {scenes?.map((scene: any, idx: number) => (
            <div
              key={scene.id}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all ${
                scene.is_shot
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : "bg-secondary/50 border-border/30 hover:border-border/50"
              }`}
            >
              <span className="text-xs text-muted-foreground/60 w-5 text-center font-mono">{idx + 1}</span>
              <Checkbox
                checked={scene.is_shot}
                onCheckedChange={() => toggleShot(scene.id, scene.is_shot)}
                className={scene.is_shot ? "border-emerald-500 data-[state=checked]:bg-emerald-500" : ""}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${scene.is_shot ? "text-emerald-400 line-through" : "text-foreground"}`}>
                  {scene.scene_label}
                </p>
                {scene.is_shot && scene.shot_at && (
                  <p className="text-[10px] text-emerald-400/60 mt-0.5">
                    ✓ {new Date(scene.shot_at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground/40 hover:text-destructive shrink-0"
                onClick={() => deleteScene(scene.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        {/* Summary footer */}
        {totalCount > 0 && progress === 100 && (
          <div className="text-center py-2 text-emerald-400 text-sm font-medium flex items-center justify-center gap-1.5">
            <Check className="h-4 w-4" /> সব দৃশ্য শুট সম্পন্ন! 🎬
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
