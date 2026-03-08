import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { useRef, useState, useCallback } from "react";

const AdminPublicProfiles = () => {
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [localMembers, setLocalMembers] = useState<any[] | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const { data: members } = useQuery({
    queryKey: ["admin-public-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, photo_url, designation, member_id, is_active, show_on_public, public_display_order" as any)
        .eq("is_active", true)
        .order("public_display_order" as any);
      return (data as any[]) ?? [];
    },
    onSuccess: (data: any[]) => {
      setLocalMembers(data);
    },
  } as any);

  });

  const displayMembers: any[] = localMembers ?? members ?? [];

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const togglePublic = async (id: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ show_on_public: !current } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(!current ? "পাবলিক সাইটে দেখাবে" : "পাবলিক সাইট থেকে লুকানো হয়েছে");
    queryClient.invalidateQueries({ queryKey: ["admin-public-profiles"] });
  };

  const saveOrder = async (reordered: any[]) => {
    const updates = reordered.map((m: any, i: number) =>
      supabase.from("profiles").update({ public_display_order: i } as any).eq("id", m.id)
    );
    await Promise.all(updates);
    queryClient.invalidateQueries({ queryKey: ["admin-public-profiles"] });
  };

  const handleDragStart = (idx: number) => {
    dragItem.current = idx;
    setDraggingIdx(idx);
  };

  const handleDragEnter = (idx: number) => {
    dragOverItem.current = idx;
  };

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
      setDraggingIdx(null);
      return;
    }
    const reordered = [...displayMembers];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);
    setLocalMembers(reordered);
    setDraggingIdx(null);
    dragItem.current = null;
    dragOverItem.current = null;
    toast.success("ক্রম আপডেট হচ্ছে...");
    await saveOrder(reordered);
  };

  // Touch drag support
  const touchStartY = useRef<number>(0);
  const touchItemIdx = useRef<number | null>(null);

  const handleTouchStart = (idx: number, e: React.TouchEvent) => {
    touchItemIdx.current = idx;
    touchStartY.current = e.touches[0].clientY;
    dragItem.current = idx;
    setDraggingIdx(idx);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchItemIdx.current === null) return;
    const currentY = e.touches[0].clientY;
    const elements = document.querySelectorAll("[data-drag-idx]");
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (currentY >= rect.top && currentY <= rect.bottom) {
        const idx = Number(el.getAttribute("data-drag-idx"));
        dragOverItem.current = idx;
      }
    });
  };

  const handleTouchEnd = async () => {
    await handleDragEnd();
    touchItemIdx.current = null;
  };

  const reorderAll = async () => {
    if (!displayMembers.length) return;
    const updates = displayMembers.map((m: any, i: number) =>
      supabase.from("profiles").update({ public_display_order: i } as any).eq("id", m.id)
    );
    await Promise.all(updates);
    toast.success("ক্রমানুসারে সাজানো হয়েছে");
    queryClient.invalidateQueries({ queryKey: ["admin-public-profiles"] });
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              <Globe className="h-5 w-5 md:h-6 md:w-6 text-primary" /> পাবলিক প্রোফাইল সাজানো
            </h1>
            <p className="text-muted-foreground text-xs">
              ড্র্যাগ করে প্রোফাইলের ক্রম সাজান · সুইচ দিয়ে দৃশ্যমানতা নিয়ন্ত্রণ করুন
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={reorderAll} className="text-xs">
            ক্রম রিসেট
          </Button>
        </div>

        <div className="space-y-2">
          {displayMembers.map((m: any, idx: number) => (
            <Card
              key={m.id}
              data-drag-idx={idx}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragEnter={() => handleDragEnter(idx)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              onTouchStart={(e) => handleTouchStart(idx, e)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={`p-3 flex items-center gap-3 transition-all cursor-grab active:cursor-grabbing select-none ${
                draggingIdx === idx
                  ? "opacity-50 scale-95 border-primary/50"
                  : m.show_on_public !== false
                    ? "bg-card border-border/30"
                    : "bg-muted/30 border-border/10 opacity-60"
              }`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

              <span className="text-xs text-muted-foreground font-mono w-6 text-center">{idx + 1}</span>

              <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden shrink-0">
                {m.photo_url ? (
                  <img src={m.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-primary text-sm font-semibold">{m.full_name?.charAt(0)}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{m.full_name}</p>
                <p className="text-[10px] text-muted-foreground">{m.designation || "সদস্য"} · ID: {m.member_id}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                  {m.show_on_public !== false ? "দৃশ্যমান" : "লুকানো"}
                </span>
                <Switch
                  checked={m.show_on_public !== false}
                  onCheckedChange={() => togglePublic(m.id, m.show_on_public !== false)}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminPublicProfiles;
