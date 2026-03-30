import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useMemberBalance } from "@/hooks/useMemberBalance";
import { Wallet, Calendar, CreditCard, TrendingUp, Film, ExternalLink, FileText, ScrollText, Eye, Gift, Car, Banknote, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import { ScriptEditor } from "@/components/ScriptEditor";
import { NoticeBoard } from "@/components/NoticeBoard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const MemberDashboard = () => {
  const { user, profile, loading, isAdmin } = useAuth();
  const [viewScriptOpen, setViewScriptOpen] = useState(false);
  const [viewShooting, setViewShooting] = useState<any>(null);
  const [paymentDetailOpen, setPaymentDetailOpen] = useState(false);

  const { data: balance } = useMemberBalance(profile?.id);

  const { data: recentPayments } = useQuery({
    queryKey: ["my-payments", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("*").eq("member_id", profile!.id).order("payment_date", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const { data: recentAttendance } = useQuery({
    queryKey: ["my-attendance", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("attendance").select("*, shootings(name, shoot_date)").eq("member_id", profile!.id).order("created_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const { data: shootings } = useQuery({
    queryKey: ["member-shootings"],
    queryFn: async () => {
      const { data } = await supabase.from("shootings").select("*").order("shoot_date", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const { data: permittedScripts } = useQuery({
    queryKey: ["my-scripts", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("scripts").select("*").order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: myBonuses } = useQuery({
    queryKey: ["my-bonuses", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await (supabase as any).from("bonuses").select("*").eq("member_id", profile!.id).order("bonus_date", { ascending: false });
      return data ?? [];
    },
  });

  const [viewScriptData, setViewScriptData] = useState<any>(null);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;

  const paymentMethodLabel: Record<string, string> = { bank: "ব্যাংক", bkash: "বিকাশ", nagad: "নগদ", cash: "ক্যাশ" };

  const balanceCards = [
    { label: "বর্তমান ব্যালেন্স", value: balance?.balance, icon: Wallet, gradient: "from-violet-500/20 to-violet-500/5", iconColor: "text-violet-400", iconBg: "bg-violet-500/10", onClick: undefined as (() => void) | undefined },
    { label: "মোট পেমেন্ট", value: balance?.totalPaid, icon: CreditCard, gradient: "from-rose-500/20 to-rose-500/5", iconColor: "text-rose-400", iconBg: "bg-rose-500/10", onClick: () => setPaymentDetailOpen(true) },
    { label: "মোট বোনাস", value: balance?.totalBonus, icon: Gift, gradient: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-400", iconBg: "bg-emerald-500/10", onClick: undefined },
    { label: "মোট গাড়ি ভাড়া", value: balance?.totalTransport, icon: Car, gradient: "from-cyan-500/20 to-cyan-500/5", iconColor: "text-cyan-400", iconBg: "bg-cyan-500/10", onClick: undefined },
    { label: "মাসিক বেতন", value: balance?.totalSalaryCredits, icon: Banknote, gradient: "from-amber-500/20 to-amber-500/5", iconColor: "text-amber-400", iconBg: "bg-amber-500/10", onClick: undefined },
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Notice Board */}
        <NoticeBoard />

        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">স্বাগতম, {profile?.full_name}</h1>
            <p className="text-muted-foreground text-xs mt-1">আইডি: {profile?.member_id}</p>
          </div>
          <Link to="/" className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors border border-primary/20">
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">পাবলিক সাইট দেখুন</span>
            <span className="sm:hidden">সাইট</span>
          </Link>
        </motion.div>

        {/* Balance Cards */}
        <motion.div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4" variants={container} initial="hidden" animate="show">
          {balanceCards.map((card) => (
            <motion.div key={card.label} variants={item}>
              <div className="premium-card rounded-2xl p-4 md:p-5 relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-60`} />
                <div className="relative z-10">
                  <div className={`h-9 w-9 rounded-xl ${card.iconBg} flex items-center justify-center mb-3`}>
                    <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                  </div>
                  <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">{card.label}</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground mt-1">৳{card.value?.toLocaleString("bn-BD") || "০"}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Shootings */}
        <div className="premium-card rounded-2xl overflow-hidden">
          <div className="p-4 md:p-5 border-b border-border/15 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <Film className="h-4 w-4 text-rose-400" />
            </div>
            <h2 className="font-semibold text-foreground text-sm md:text-base">শুটিং তালিকা</h2>
          </div>
          <div className="divide-y divide-border/10 max-h-80 overflow-auto">
            {shootings?.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">কোনো শুটিং নেই</div>}
            {shootings?.map((s: any) => {
              const statusMap: Record<string, { label: string; color: string }> = {
                plan: { label: "প্লান", color: "bg-muted/50 text-muted-foreground" },
                upcoming: { label: "আসন্ন", color: "bg-warning/10 text-warning" },
                calltime: { label: "কলটাইম", color: "bg-orange-500/10 text-orange-400" },
                ongoing: { label: "চলছে", color: "bg-primary/10 text-primary" },
                completed: { label: "শুটিং শেষ", color: "bg-success/10 text-success" },
                editing: { label: "এডিটিং চলছে", color: "bg-accent/50 text-accent-foreground" },
                editing_done: { label: "এডিটিং শেষ", color: "bg-success/15 text-success" },
                published: { label: "পাবলিশ হয়েছে", color: "bg-success/10 text-success" },
              };
              const info = statusMap[s.status] || statusMap.upcoming;
              return (
                <div key={s.id} className="p-3.5 flex items-center justify-between hover:bg-secondary/15 transition-colors">
                  <div>
                    <p className="text-sm text-foreground font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(s.shoot_date).toLocaleDateString("bn-BD")}{s.location && ` • ${s.location}`}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.script_content && <button onClick={() => { setViewShooting(s); setViewScriptOpen(true); }} className="text-primary hover:text-primary/80"><FileText className="h-3.5 w-3.5" /></button>}
                    {s.script_url && <a href={s.script_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80"><ExternalLink className="h-3.5 w-3.5" /></a>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scripts */}
        <div className="premium-card rounded-2xl overflow-hidden">
          <div className="p-4 md:p-5 border-b border-border/15 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-fuchsia-500/10 flex items-center justify-center">
              <ScrollText className="h-4 w-4 text-fuchsia-400" />
            </div>
            <h2 className="font-semibold text-foreground text-sm md:text-base">স্ক্রিপ্ট সমূহ</h2>
          </div>
          <div className="divide-y divide-border/10 max-h-80 overflow-auto">
            {(!permittedScripts || permittedScripts.length === 0) && <div className="p-6 text-sm text-muted-foreground text-center">কোনো স্ক্রিপ্ট অ্যাক্সেস নেই</div>}
            {permittedScripts?.map((script: any) => (
              <div key={script.id} className="p-3.5 flex items-center justify-between hover:bg-secondary/15 transition-colors cursor-pointer" onClick={() => setViewScriptData(script)}>
                <div>
                  <p className="text-sm text-foreground font-medium">{script.title}</p>
                  <p className="text-xs text-muted-foreground">{script.updated_at ? new Date(script.updated_at).toLocaleDateString("bn-BD") : ""}</p>
                </div>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>

        {/* Bonus & Transport */}
        <div className="premium-card rounded-2xl overflow-hidden">
          <div className="p-4 md:p-5 border-b border-border/15 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Gift className="h-4 w-4 text-emerald-400" />
            </div>
            <h2 className="font-semibold text-foreground text-sm md:text-base">বোনাস ও গাড়ি ভাড়া</h2>
          </div>
          <div className="divide-y divide-border/10 max-h-80 overflow-auto">
            {(!myBonuses || myBonuses.length === 0) && <div className="p-6 text-sm text-muted-foreground text-center">কোনো বোনাস/গাড়ি ভাড়া নেই</div>}
            {myBonuses?.map((b: any) => (
              <div key={b.id} className="p-3.5 flex items-center justify-between hover:bg-secondary/15 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg ${b.type === "bonus" ? "bg-success/10" : "bg-primary/10"} flex items-center justify-center`}>
                    {b.type === "bonus" ? <Gift className="h-4 w-4 text-success" /> : <Car className="h-4 w-4 text-primary" />}
                  </div>
                  <div>
                    <p className="text-sm text-foreground font-medium">{b.type === "bonus" ? "বোনাস" : "গাড়ি ভাড়া"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(b.bonus_date).toLocaleDateString("bn-BD")}{b.notes && ` • ${b.notes}`}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-foreground">৳{Number(b.amount).toLocaleString("bn-BD")}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment & Attendance History */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="premium-card rounded-2xl overflow-hidden">
            <div className="p-4 md:p-5 border-b border-border/15 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-amber-400" />
              </div>
              <h2 className="font-semibold text-foreground text-sm md:text-base">পেমেন্ট হিস্ট্রি</h2>
            </div>
            <div className="divide-y divide-border/10 max-h-80 overflow-auto">
              {recentPayments?.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">কোনো পেমেন্ট নেই</div>}
              {recentPayments?.map((p) => (
                <div key={p.id} className="p-3.5 flex items-center justify-between hover:bg-secondary/15 transition-colors">
                  <div>
                    <p className="text-sm text-foreground font-medium">৳{Number(p.amount).toLocaleString("bn-BD")}</p>
                    <p className="text-xs text-muted-foreground">{paymentMethodLabel[p.payment_method] || p.payment_method} • {new Date(p.payment_date).toLocaleDateString("bn-BD")}</p>
                  </div>
                  {p.transaction_id && <span className="text-xs text-muted-foreground">#{p.transaction_id}</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="premium-card rounded-2xl overflow-hidden">
            <div className="p-4 md:p-5 border-b border-border/15 flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-cyan-400" />
              </div>
              <h2 className="font-semibold text-foreground text-sm md:text-base">হাজিরা হিস্ট্রি</h2>
            </div>
            <div className="divide-y divide-border/10 max-h-80 overflow-auto">
              {recentAttendance?.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">কোনো হাজিরা নেই</div>}
              {recentAttendance?.map((a: any) => (
                <div key={a.id} className="p-3.5 flex items-center justify-between hover:bg-secondary/15 transition-colors">
                  <div>
                    <p className="text-sm text-foreground font-medium">{a.shootings?.name || "শুটিং"}</p>
                    <p className="text-xs text-muted-foreground">{a.shootings?.shoot_date ? new Date(a.shootings.shoot_date).toLocaleDateString("bn-BD") : ""}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_present ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{a.is_present ? "উপস্থিত" : "অনুপস্থিত"}</span>
                    {a.daily_rate > 0 && <p className="text-xs text-muted-foreground mt-0.5">৳{Number(a.daily_rate).toLocaleString("bn-BD")}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {viewShooting && (
        <ScriptEditor
          open={viewScriptOpen}
          onOpenChange={setViewScriptOpen}
          title={`স্ক্রিপ্ট — ${viewShooting.name}`}
          initialContent={viewShooting.script_content || ""}
          onSave={async () => {}}
          readOnly
        />
      )}

      {/* Script View Dialog */}
      <Dialog open={!!viewScriptData} onOpenChange={(open) => !open && setViewScriptData(null)}>
        <DialogContent className="bg-muted/50 border-none max-w-[900px] w-[95vw] max-h-[95vh] p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/20 bg-card/80 backdrop-blur">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-primary" />
              {viewScriptData?.title}
            </h2>
          </div>
          <div className="overflow-y-auto p-4 md:p-8 flex justify-center" style={{ maxHeight: "calc(95vh - 56px)" }}>
            <div
              className="bg-white shadow-2xl rounded-sm w-full"
              style={{
                maxWidth: "210mm",
                minHeight: "297mm",
                padding: "20mm 25mm",
                color: "#1a1a1a",
                fontFamily: "'Noto Sans Bengali', 'SolaimanLipi', sans-serif",
                lineHeight: 1.8,
                fontSize: "14px",
              }}
            >
              <h1 style={{ fontSize: "22px", fontWeight: 700, textAlign: "center", marginBottom: "24px", color: "#000", borderBottom: "2px solid #e5e5e5", paddingBottom: "16px" }}>
                {viewScriptData?.title}
              </h1>
              {(() => {
                const content = viewScriptData?.content;
                if (!content) return <p style={{ color: "#999", textAlign: "center" }}>কোনো কন্টেন্ট নেই</p>;
                try {
                  const parsed = JSON.parse(content);
                  if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].title !== undefined) {
                    return parsed.map((seq: any, i: number) => (
                      <div key={seq.id || i} style={{ marginBottom: "28px" }}>
                        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#333", marginBottom: "10px", borderLeft: "3px solid #2563eb", paddingLeft: "12px" }}>
                          {seq.title}
                        </h2>
                        <div
                          style={{ color: "#1a1a1a" }}
                          className="prose prose-sm max-w-none [&_*]:!text-[#1a1a1a] [&_h1]:!text-[#000] [&_h2]:!text-[#222] [&_h3]:!text-[#333] [&_strong]:!text-[#000] [&_p]:!my-2 [&_ul]:!my-2 [&_ol]:!my-2"
                          dangerouslySetInnerHTML={{ __html: seq.content || "" }}
                        />
                      </div>
                    ));
                  }
                } catch {}
                return (
                  <div
                    className="prose prose-sm max-w-none [&_*]:!text-[#1a1a1a] [&_h1]:!text-[#000] [&_h2]:!text-[#222] [&_strong]:!text-[#000]"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                );
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default MemberDashboard;
