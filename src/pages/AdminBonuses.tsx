import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Gift, Car, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const AdminBonuses = () => {
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [type, setType] = useState<"bonus" | "transport">("bonus");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const { data: members } = useQuery({
    queryKey: ["all-members"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, member_id").eq("is_active", true).order("full_name");
      return data ?? [];
    },
  });

  const { data: bonuses, isLoading } = useQuery({
    queryKey: ["admin-bonuses", filterType],
    queryFn: async () => {
      let q = (supabase as any).from("bonuses").select("*, profiles!bonuses_member_id_fkey(full_name, member_id)").order("bonus_date", { ascending: false });
      if (filterType === "bonus" || filterType === "transport") q = q.eq("type", filterType);
      const { data } = await q;
      return data ?? [];
    },
  });

  const addBonus = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("bonuses").insert({
        member_id: memberId,
        type,
        amount: Number(amount),
        notes: notes || null,
        given_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bonuses"] });
      queryClient.invalidateQueries({ queryKey: ["member-balance"] });
      toast({ title: "সফল", description: type === "bonus" ? "বোনাস যোগ হয়েছে" : "গাড়ি ভাড়া যোগ হয়েছে" });
      setOpen(false);
      setMemberId("");
      setAmount("");
      setNotes("");
    },
    onError: () => toast({ title: "ত্রুটি", description: "যোগ করতে ব্যর্থ", variant: "destructive" }),
  });

  const deleteBonus = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("bonuses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bonuses"] });
      queryClient.invalidateQueries({ queryKey: ["member-balance"] });
      toast({ title: "মুছে ফেলা হয়েছে" });
    },
  });

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user || !isAdmin) return <Navigate to="/login" replace />;

  const typeLabel = { bonus: "বোনাস", transport: "গাড়ি ভাড়া" };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">বোনাস ও গাড়ি ভাড়া</h1>
            <p className="text-sm text-muted-foreground">সদস্যদের বোনাস এবং গাড়ি ভাড়া ব্যবস্থাপনা</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> যোগ করুন</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>বোনাস / গাড়ি ভাড়া যোগ করুন</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">সদস্য</label>
                  <Select value={memberId} onValueChange={setMemberId}>
                    <SelectTrigger><SelectValue placeholder="সদস্য নির্বাচন করুন" /></SelectTrigger>
                    <SelectContent>
                      {members?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.full_name} (#{m.member_id})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">ধরন</label>
                  <Select value={type} onValueChange={(v) => setType(v as "bonus" | "transport")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bonus">বোনাস</SelectItem>
                      <SelectItem value="transport">গাড়ি ভাড়া</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">পরিমাণ (৳)</label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">নোট (ঐচ্ছিক)</label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="বিস্তারিত..." />
                </div>
                <Button className="w-full" disabled={!memberId || !amount || addBonus.isPending} onClick={() => addBonus.mutate()}>
                  {addBonus.isPending ? "যোগ হচ্ছে..." : "যোগ করুন"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {[
            { value: "all", label: "সব" },
            { value: "bonus", label: "বোনাস" },
            { value: "transport", label: "গাড়ি ভাড়া" },
          ].map((f) => (
            <Button key={f.value} variant={filterType === f.value ? "default" : "outline"} size="sm" onClick={() => setFilterType(f.value)}>
              {f.value === "bonus" && <Gift className="h-3.5 w-3.5 mr-1" />}
              {f.value === "transport" && <Car className="h-3.5 w-3.5 mr-1" />}
              {f.label}
            </Button>
          ))}
        </div>

        <Card className="bg-card border-border/50">
          <div className="divide-y divide-border/30">
            {isLoading && <div className="p-6 text-center text-muted-foreground">লোড হচ্ছে...</div>}
            {!isLoading && bonuses?.length === 0 && <div className="p-6 text-center text-muted-foreground">কোনো রেকর্ড নেই</div>}
            {bonuses?.map((b: any) => (
              <div key={b.id} className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${b.type === "bonus" ? "bg-success/10" : "bg-primary/10"}`}>
                    {b.type === "bonus" ? <Gift className="h-4 w-4 text-success" /> : <Car className="h-4 w-4 text-primary" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{b.profiles?.full_name} <span className="text-muted-foreground">#{b.profiles?.member_id}</span></p>
                    <p className="text-xs text-muted-foreground">
                      {typeLabel[b.type as keyof typeof typeLabel]} • {new Date(b.bonus_date).toLocaleDateString("bn-BD")}
                      {b.notes && ` • ${b.notes}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-foreground">৳{Number(b.amount).toLocaleString("bn-BD")}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteBonus.mutate(b.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AdminBonuses;
