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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Gift, Car, Plus, Trash2, Download, ImageIcon } from "lucide-react";
import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { format } from "date-fns";
import { bn } from "date-fns/locale";

const AdminBonuses = () => {
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [type, setType] = useState<"bonus" | "transport">("bonus");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  // Card preview state
  const [cardOpen, setCardOpen] = useState(false);
  const [cardData, setCardData] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: members } = useQuery({
    queryKey: ["all-members-with-photo"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, member_id, photo_url, designation")
        .eq("is_active", true)
        .order("full_name");
      return data ?? [];
    },
  });

  const { data: bonuses, isLoading } = useQuery({
    queryKey: ["admin-bonuses", filterType],
    queryFn: async () => {
      let q = (supabase as any)
        .from("bonuses")
        .select("*, profiles!bonuses_member_id_fkey(full_name, member_id, photo_url, designation)")
        .order("bonus_date", { ascending: false });
      if (filterType === "bonus" || filterType === "transport") q = q.eq("type", filterType);
      const { data } = await q;
      return data ?? [];
    },
  });

  const addBonus = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any)
        .from("bonuses")
        .insert({
          member_id: memberId,
          type,
          amount: Number(amount),
          notes: notes || null,
          given_by: user?.id,
        })
        .select("*, profiles!bonuses_member_id_fkey(full_name, member_id, photo_url, designation)")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-bonuses"] });
      queryClient.invalidateQueries({ queryKey: ["member-balance"] });
      toast({ title: "সফল", description: type === "bonus" ? "বোনাস যোগ হয়েছে" : "গাড়ি ভাড়া যোগ হয়েছে" });
      setOpen(false);
      setMemberId("");
      setAmount("");
      setNotes("");
      // Open card preview automatically
      setCardData(data);
      setCardOpen(true);
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

  const handleDownloadPng = async () => {
    if (!cardRef.current || !cardData) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        backgroundColor: null,
        scale: 2,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const blob = await (await fetch(dataUrl)).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const label = cardData.type === "bonus" ? "বোনাস" : "গাড়ি-ভাড়া";
      a.download = `${label}-${cardData.profiles?.full_name || "সদস্য"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast({ title: "ডাউনলোড সম্পন্ন" });
    } catch (err: any) {
      toast({ title: "ডাউনলোড ব্যর্থ", description: err?.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const showCardForRow = (b: any) => {
    setCardData(b);
    setCardOpen(true);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user || !isAdmin) return <Navigate to="/login" replace />;

  const typeLabel = { bonus: "বোনাস", transport: "গাড়ি ভাড়া" };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">বোনাস ও গাড়ি ভাড়া</h1>
            <p className="text-sm text-muted-foreground">সদস্যদের বোনাস এবং গাড়ি ভাড়া ব্যবস্থাপনা — কার্ড সহ</p>
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
                  <label className="text-sm text-muted-foreground mb-1 block">নোট (ঐচ্ছিক — কার্ডে দেখাবে)</label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="বিস্তারিত বা অভিনন্দন বার্তা..." />
                </div>
                <Button className="w-full" disabled={!memberId || !amount || addBonus.isPending} onClick={() => addBonus.mutate()}>
                  {addBonus.isPending ? "যোগ হচ্ছে..." : "যোগ করুন ও কার্ড দেখুন"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {[
            { value: "all", label: "সব", color: "text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20", activeColor: "bg-blue-500/25 text-blue-300 border-blue-500/40" },
            { value: "bonus", label: "বোনাস", color: "text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20", activeColor: "bg-red-500/25 text-red-300 border-red-500/40" },
            { value: "transport", label: "গাড়ি ভাড়া", color: "text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20", activeColor: "bg-red-500/25 text-red-300 border-red-500/40" },
          ].map((f) => (
            <Button
              key={f.value}
              variant="outline"
              size="sm"
              className={`border ${filterType === f.value ? f.activeColor : f.color}`}
              onClick={() => setFilterType(f.value)}
            >
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
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${b.type === "bonus" ? "bg-red-500/15" : "bg-red-500/15"}`}>
                    {b.type === "bonus" ? <Gift className="h-4 w-4 text-red-400" /> : <Car className="h-4 w-4 text-red-400" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{b.profiles?.full_name} <span className="text-muted-foreground">#{b.profiles?.member_id}</span></p>
                    <p className="text-xs text-muted-foreground">
                      {typeLabel[b.type as keyof typeof typeLabel]} • {new Date(b.bonus_date).toLocaleDateString("bn-BD")}
                      {b.notes && ` • ${b.notes}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">৳{Number(b.amount).toLocaleString("bn-BD")}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-400" onClick={() => showCardForRow(b)} title="কার্ড দেখুন">
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteBonus.mutate(b.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Card preview dialog */}
      <Dialog open={cardOpen} onOpenChange={setCardOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {cardData?.type === "bonus" ? "🎁 বোনাস কার্ড" : "🚗 গাড়ি ভাড়া কার্ড"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-2">
            {cardData && <BonusCard cardRef={cardRef} bonus={cardData} />}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCardOpen(false)}>বন্ধ</Button>
            <Button onClick={handleDownloadPng} disabled={downloading}>
              <Download className="h-4 w-4 mr-2" />
              {downloading ? "ডাউনলোড হচ্ছে..." : "PNG ডাউনলোড"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

// ============ Downloadable bonus / transport card ============
const BonusCard = ({
  cardRef,
  bonus,
}: {
  cardRef: React.RefObject<HTMLDivElement>;
  bonus: any;
}) => {
  const isBonus = bonus.type === "bonus";
  const accent = isBonus ? "#10b981" : "#f59e0b";
  const accentSoft = isBonus ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)";

  const profile = bonus.profiles || {};
  const dateStr = format(new Date(bonus.bonus_date || bonus.created_at), "dd MMMM yyyy", { locale: bn });

  const title = isBonus ? "বোনাস প্রদান" : "গাড়ি ভাড়া প্রদান";
  const message = isBonus
    ? `প্রিয় ${profile.full_name || "সদস্য"}, আপনার নিষ্ঠা ও পরিশ্রমের স্বীকৃতি স্বরূপ ৳${Number(bonus.amount).toLocaleString("bn-BD")} বোনাস প্রদান করা হলো। ধন্যবাদ ও শুভেচ্ছা।`
    : `প্রিয় ${profile.full_name || "সদস্য"}, যাতায়াত খরচ বাবদ ৳${Number(bonus.amount).toLocaleString("bn-BD")} গাড়ি ভাড়া প্রদান করা হলো।`;

  return (
    <div
      ref={cardRef}
      style={{
        width: 420,
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        borderRadius: 16,
        padding: "24px 22px",
        border: `2px solid ${accent}`,
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Tiro Bangla', 'Hind Siliguri', serif",
      }}
    >
      {/* Decorative corners */}
      <div style={{ position: "absolute", top: 8, left: 8, width: 22, height: 22, borderTop: `2px solid ${accent}`, borderLeft: `2px solid ${accent}` }} />
      <div style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderTop: `2px solid ${accent}`, borderRight: `2px solid ${accent}` }} />
      <div style={{ position: "absolute", bottom: 8, left: 8, width: 22, height: 22, borderBottom: `2px solid ${accent}`, borderLeft: `2px solid ${accent}` }} />
      <div style={{ position: "absolute", bottom: 8, right: 8, width: 22, height: 22, borderBottom: `2px solid ${accent}`, borderRight: `2px solid ${accent}` }} />

      <div style={{ textAlign: "center", color: accent, fontSize: 11, letterSpacing: 2, marginBottom: 4 }}>
        KUAKATA MULTIMEDIA
      </div>
      <div style={{ textAlign: "center", color: "#f1f5f9", fontSize: 17, fontWeight: 700, marginBottom: 14 }}>
        ✦ {title} ✦
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            overflow: "hidden",
            background: "#1e293b",
            border: `3px solid ${accent}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 0 4px ${accentSoft}`,
          }}
        >
          {profile.photo_url ? (
            <img
              src={profile.photo_url}
              alt=""
              crossOrigin="anonymous"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ color: accent, fontSize: 28, fontWeight: 700 }}>
              {profile.full_name?.charAt(0) || "?"}
            </span>
          )}
        </div>
      </div>

      <div style={{ textAlign: "center", color: "#f1f5f9", fontSize: 16, fontWeight: 700 }}>
        {profile.full_name}
      </div>
      {profile.designation && (
        <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 11, marginBottom: 2 }}>
          {profile.designation}
        </div>
      )}
      {profile.member_id != null && (
        <div style={{ textAlign: "center", color: "#64748b", fontSize: 10, marginBottom: 12 }}>
          সদস্য আইডি: {profile.member_id}
        </div>
      )}

      {/* Amount block */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(15,23,42,0.6)",
          border: `1px solid ${accent}`,
          borderRadius: 10,
          padding: "12px 14px",
          marginBottom: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 9, color: "#64748b", letterSpacing: 1 }}>
            {isBonus ? "বোনাসের পরিমাণ" : "গাড়ি ভাড়া"}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: accent, lineHeight: 1.2 }}>
            ৳{Number(bonus.amount).toLocaleString("bn-BD")}
          </div>
        </div>
        <div
          style={{
            background: accentSoft,
            color: accent,
            padding: "8px 12px",
            borderRadius: 999,
            fontSize: 18,
          }}
        >
          {isBonus ? "🎁" : "🚗"}
        </div>
      </div>

      <div
        style={{
          background: "rgba(15,23,42,0.6)",
          border: "1px solid #334155",
          borderRadius: 8,
          padding: "11px 12px",
          color: "#e2e8f0",
          fontSize: 12,
          lineHeight: 1.7,
          textAlign: "center",
        }}
      >
        {message}
      </div>

      {bonus.notes && (
        <div
          style={{
            marginTop: 8,
            padding: "8px 10px",
            background: accentSoft,
            border: `1px dashed ${accent}`,
            borderRadius: 6,
            color: "#f1f5f9",
            fontSize: 11,
            fontStyle: "italic",
            textAlign: "center",
          }}
        >
          “{bonus.notes}”
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, color: "#64748b", fontSize: 10 }}>
        <span>তারিখ: {dateStr}</span>
        <span style={{ color: accent }}>— কর্তৃপক্ষ</span>
      </div>
    </div>
  );
};

export default AdminBonuses;
