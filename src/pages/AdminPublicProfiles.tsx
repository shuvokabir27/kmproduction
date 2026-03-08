import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

const AdminPublicProfiles = () => {
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();

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
  });

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const togglePublic = async (id: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ show_on_public: !current } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(!current ? "পাবলিক সাইটে দেখাবে" : "পাবলিক সাইট থেকে লুকানো হয়েছে");
    queryClient.invalidateQueries({ queryKey: ["admin-public-profiles"] });
  };

  const moveOrder = async (id: string, direction: "up" | "down") => {
    if (!members) return;
    const idx = members.findIndex((m: any) => m.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= members.length) return;

    const current = members[idx];
    const swap = members[swapIdx];

    await Promise.all([
      supabase.from("profiles").update({ public_display_order: swap.public_display_order } as any).eq("id", current.id),
      supabase.from("profiles").update({ public_display_order: current.public_display_order } as any).eq("id", swap.id),
    ]);

    queryClient.invalidateQueries({ queryKey: ["admin-public-profiles"] });
  };

  const reorderAll = async () => {
    if (!members) return;
    const updates = members.map((m: any, i: number) =>
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
              কার প্রোফাইল পাবলিক সাইটে দেখাবে এবং কোন ক্রমে দেখাবে সেটা নির্ধারণ করুন
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={reorderAll} className="text-xs">
            ক্রম রিসেট
          </Button>
        </div>

        <div className="space-y-2">
          {members?.map((m: any, idx: number) => (
            <Card
              key={m.id}
              className={`p-3 flex items-center gap-3 transition-all ${
                m.show_on_public !== false
                  ? "bg-card border-border/30"
                  : "bg-muted/30 border-border/10 opacity-60"
              }`}
            >
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  disabled={idx === 0}
                  onClick={() => moveOrder(m.id, "up")}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  disabled={idx === (members?.length ?? 0) - 1}
                  onClick={() => moveOrder(m.id, "down")}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>

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
