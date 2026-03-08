import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Film, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [shootDate, setShootDate] = useState("");
  const [status, setStatus] = useState("plan");
  const [scriptUrl, setScriptUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: shootings } = useQuery({
    queryKey: ["admin-shootings"],
    queryFn: async () => {
      const { data } = await supabase.from("shootings").select("*").order("shoot_date", { ascending: false });
      return data ?? [];
    },
  });

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.from("shootings").insert({
        name, description, location, shoot_date: shootDate, status, script_url: scriptUrl || null
      } as any);
      if (error) throw error;
      toast.success("শুটিং যোগ হয়েছে!");
      queryClient.invalidateQueries({ queryKey: ["admin-shootings"] });
      setOpen(false);
      setName(""); setDescription(""); setLocation(""); setShootDate(""); setStatus("plan"); setScriptUrl("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (shootingId: string, newStatus: string) => {
    const { error } = await supabase.from("shootings").update({ status: newStatus }).eq("id", shootingId);
    if (error) { toast.error(error.message); return; }
    const info = getStatusInfo(newStatus);
    toast.success(`স্ট্যাটাস পরিবর্তন: ${info.label}`);
    queryClient.invalidateQueries({ queryKey: ["admin-shootings"] });
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Film className="h-6 w-6 text-primary" /> শুটিং ম্যানেজমেন্ট
          </h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> নতুন শুটিং</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border/50">
              <DialogHeader>
                <DialogTitle className="text-foreground">নতুন শুটিং যোগ করুন</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
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
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? "সেভ হচ্ছে..." : "সেভ করুন"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="bg-card border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left p-3 text-muted-foreground font-medium">নাম</th>
                  <th className="text-left p-3 text-muted-foreground font-medium hidden sm:table-cell">লোকেশন</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">তারিখ</th>
                  <th className="text-left p-3 text-muted-foreground font-medium hidden md:table-cell">স্ক্রিপ্ট</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">স্ট্যাটাস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {shootings?.map((s) => {
                  const info = getStatusInfo(s.status);
                  return (
                    <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="p-3">
                        <p className="text-foreground font-medium">{s.name}</p>
                        {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                      </td>
                      <td className="p-3 text-muted-foreground hidden sm:table-cell">{s.location || "—"}</td>
                      <td className="p-3 text-muted-foreground">{new Date(s.shoot_date).toLocaleDateString("bn-BD")}</td>
                      <td className="p-3">
                        <Select value={s.status || "upcoming"} onValueChange={(v) => changeStatus(s.id, v)}>
                          <SelectTrigger className="h-7 w-auto min-w-[120px] border-0 bg-transparent p-0 px-1 focus:ring-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border/50">
                            {statusOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${opt.color}`}>{opt.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AdminShootings;
