import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useMemberBalance } from "@/hooks/useMemberBalance";
import { Wallet, Calendar, CreditCard, TrendingUp, Film, ExternalLink, FileText, ScrollText, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { ScriptEditor } from "@/components/ScriptEditor";
import { NoticeBoard } from "@/components/NoticeBoard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const MemberDashboard = () => {
  const { user, profile, loading, isAdmin } = useAuth();
  const [viewScriptOpen, setViewScriptOpen] = useState(false);
  const [viewShooting, setViewShooting] = useState<any>(null);

  // Profile extra fields
  const [extraFields, setExtraFields] = useState({
    address: "", education: "", achievements: "", short_bio: "",
    favorite_actor: "", favorite_actress: "", favorite_color: "",
    favorite_dress: "", favorite_food: "", date_of_birth: "",
    full_name_en: "", designation_en: "", short_bio_en: "",
    address_en: "", education_en: "", achievements_en: "",
    favorite_actor_en: "", favorite_actress_en: "", favorite_color_en: "",
    favorite_dress_en: "", favorite_food_en: "",
  });
  const [editTab, setEditTab] = useState<"bn" | "en">("bn");

  // Favorite works
  const [works, setWorks] = useState<FavoriteWork[]>([]);

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

  const { data: favoriteWorks } = useQuery({
    queryKey: ["my-favorite-works", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("favorite_works" as any).select("*").eq("member_id", profile!.id).order("sort_order");
      return (data ?? []) as any[];
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

  const [viewScriptData, setViewScriptData] = useState<any>(null);

  useEffect(() => {
    if (profile) {
      setExtraFields({
        address: (profile as any).address || "",
        education: (profile as any).education || "",
        achievements: (profile as any).achievements || "",
        short_bio: (profile as any).short_bio || "",
        favorite_actor: (profile as any).favorite_actor || "",
        favorite_actress: (profile as any).favorite_actress || "",
        favorite_color: (profile as any).favorite_color || "",
        favorite_dress: (profile as any).favorite_dress || "",
        favorite_food: (profile as any).favorite_food || "",
        date_of_birth: (profile as any).date_of_birth || "",
        full_name_en: (profile as any).full_name_en || "",
        designation_en: (profile as any).designation_en || "",
        short_bio_en: (profile as any).short_bio_en || "",
        address_en: (profile as any).address_en || "",
        education_en: (profile as any).education_en || "",
        achievements_en: (profile as any).achievements_en || "",
        favorite_actor_en: (profile as any).favorite_actor_en || "",
        favorite_actress_en: (profile as any).favorite_actress_en || "",
        favorite_color_en: (profile as any).favorite_color_en || "",
        favorite_dress_en: (profile as any).favorite_dress_en || "",
        favorite_food_en: (profile as any).favorite_food_en || "",
      });
    }
  }, [profile]);

  useEffect(() => {
    if (favoriteWorks) {
      setWorks(favoriteWorks.map((w: any) => ({ id: w.id, title: w.title, video_url: w.video_url || "", description: w.description || "" })));
    }
  }, [favoriteWorks]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;

  const paymentMethodLabel: Record<string, string> = { bank: "ব্যাংক", bkash: "বিকাশ", nagad: "নগদ", cash: "ক্যাশ" };

  const setExtra = (key: string, value: string) => setExtraFields(f => ({ ...f, [key]: value }));

  const addWork = () => {
    if (works.length >= 5) { toast.error("সর্বোচ্চ ৫টি কাজ যোগ করা যায়"); return; }
    setWorks([...works, { title: "", video_url: "", description: "" }]);
  };

  const updateWork = (idx: number, field: keyof FavoriteWork, value: string) => {
    setWorks(ws => ws.map((w, i) => i === idx ? { ...w, [field]: value } : w));
  };

  const removeWork = (idx: number) => {
    setWorks(ws => ws.filter((_, i) => i !== idx));
  };

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${profile!.id}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("member-photos").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: pub } = supabase.storage.from("member-photos").getPublicUrl(path);
    return pub.publicUrl;
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const updates: any = {
        address: extraFields.address || null,
        education: extraFields.education || null,
        achievements: extraFields.achievements || null,
        short_bio: extraFields.short_bio || null,
        favorite_actor: extraFields.favorite_actor || null,
        favorite_actress: extraFields.favorite_actress || null,
        favorite_color: extraFields.favorite_color || null,
        favorite_dress: extraFields.favorite_dress || null,
        favorite_food: extraFields.favorite_food || null,
        date_of_birth: extraFields.date_of_birth || null,
        full_name_en: extraFields.full_name_en || null,
        designation_en: extraFields.designation_en || null,
        short_bio_en: extraFields.short_bio_en || null,
        address_en: extraFields.address_en || null,
        education_en: extraFields.education_en || null,
        achievements_en: extraFields.achievements_en || null,
        favorite_actor_en: extraFields.favorite_actor_en || null,
        favorite_actress_en: extraFields.favorite_actress_en || null,
        favorite_color_en: extraFields.favorite_color_en || null,
        favorite_dress_en: extraFields.favorite_dress_en || null,
        favorite_food_en: extraFields.favorite_food_en || null,
      };

      if (photoFile) {
        updates.photo_url = await uploadFile(photoFile, "profiles");
      }
      if (coverFile) {
        updates.cover_url = await uploadFile(coverFile, "covers");
      }

      const { error } = await supabase.from("profiles").update(updates).eq("id", profile.id);
      if (error) throw error;

      // Delete old works and insert new ones
      await supabase.from("favorite_works" as any).delete().eq("member_id", profile.id);
      const validWorks = works.filter(w => w.title.trim());
      if (validWorks.length > 0) {
        const { error: wErr } = await supabase.from("favorite_works" as any).insert(
          validWorks.map((w, i) => ({
            member_id: profile.id,
            title: w.title,
            video_url: w.video_url || null,
            description: w.description || null,
            sort_order: i,
          }))
        );
        if (wErr) throw wErr;
      }

      toast.success("প্রোফাইল আপডেট হয়েছে!");
      setPhotoFile(null); setCoverFile(null);
      setPhotoPreview(null); setCoverPreview(null);
      queryClient.invalidateQueries({ queryKey: ["my-favorite-works"] });
      setProfileEditOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Notice Board - Prominent at top */}
        <NoticeBoard />

        <div>
          <h1 className="text-2xl font-bold text-foreground">স্বাগতম, {profile?.full_name}</h1>
          <p className="text-muted-foreground text-sm">আইডি: {profile?.member_id}</p>
        </div>

        {/* Balance Cards */}
        <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-4" variants={container} initial="hidden" animate="show">
          <motion.div variants={item}>
            <Card className="p-5 bg-card border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-success" /></div>
                <div><p className="text-xs text-muted-foreground">মোট আয়</p><p className="text-2xl font-bold text-foreground">৳{balance?.totalEarned?.toLocaleString("bn-BD") || "০"}</p></div>
              </div>
            </Card>
          </motion.div>
          <motion.div variants={item}>
            <Card className="p-5 bg-card border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><CreditCard className="h-5 w-5 text-primary" /></div>
                <div><p className="text-xs text-muted-foreground">মোট প্রদান</p><p className="text-2xl font-bold text-foreground">৳{balance?.totalPaid?.toLocaleString("bn-BD") || "০"}</p></div>
              </div>
            </Card>
          </motion.div>
          <motion.div variants={item}>
            <Card className="p-5 bg-card border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center"><Wallet className="h-5 w-5 text-warning" /></div>
                <div><p className="text-xs text-muted-foreground">বকেয়া ব্যালেন্স</p><p className="text-2xl font-bold text-foreground">৳{balance?.balance?.toLocaleString("bn-BD") || "০"}</p></div>
              </div>
            </Card>
          </motion.div>
        </motion.div>

        {/* Shootings */}
        <Card className="bg-card border-border/50">
          <div className="p-4 border-b border-border/30">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><Film className="h-4 w-4 text-primary" /> শুটিং তালিকা</h2>
          </div>
          <div className="divide-y divide-border/30 max-h-80 overflow-auto">
            {shootings?.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">কোনো শুটিং নেই</div>}
            {shootings?.map((s: any) => {
              const statusMap: Record<string, { label: string; color: string }> = {
                plan: { label: "প্লান", color: "bg-muted/50 text-muted-foreground" },
                upcoming: { label: "আসন্ন", color: "bg-warning/10 text-warning" },
                ongoing: { label: "চলছে", color: "bg-primary/10 text-primary" },
                completed: { label: "শুটিং শেষ", color: "bg-success/10 text-success" },
                editing: { label: "এডিটিং চলছে", color: "bg-accent/50 text-accent-foreground" },
                editing_done: { label: "এডিটিং শেষ", color: "bg-success/15 text-success" },
                published: { label: "পাবলিশ হয়েছে", color: "bg-success/10 text-success" },
              };
              const info = statusMap[s.status] || statusMap.upcoming;
              return (
                <div key={s.id} className="p-3 flex items-center justify-between">
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
        </Card>

        {/* Permitted Scripts */}
        <Card className="bg-card border-border/50">
          <div className="p-4 border-b border-border/30">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><ScrollText className="h-4 w-4 text-primary" /> স্ক্রিপ্ট সমূহ</h2>
          </div>
          <div className="divide-y divide-border/30 max-h-80 overflow-auto">
            {(!permittedScripts || permittedScripts.length === 0) && <div className="p-4 text-sm text-muted-foreground text-center">কোনো স্ক্রিপ্ট অ্যাক্সেস নেই</div>}
            {permittedScripts?.map((script: any) => (
              <div key={script.id} className="p-3 flex items-center justify-between hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => setViewScriptData(script)}>
                <div>
                  <p className="text-sm text-foreground font-medium">{script.title}</p>
                  <p className="text-xs text-muted-foreground">{script.updated_at ? new Date(script.updated_at).toLocaleDateString("bn-BD") : ""}</p>
                </div>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card border-border/50">
            <div className="p-4 border-b border-border/30"><h2 className="font-semibold text-foreground flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> পেমেন্ট হিস্ট্রি</h2></div>
            <div className="divide-y divide-border/30 max-h-80 overflow-auto">
              {recentPayments?.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">কোনো পেমেন্ট নেই</div>}
              {recentPayments?.map((p) => (
                <div key={p.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground">৳{Number(p.amount).toLocaleString("bn-BD")}</p>
                    <p className="text-xs text-muted-foreground">{paymentMethodLabel[p.payment_method] || p.payment_method} • {new Date(p.payment_date).toLocaleDateString("bn-BD")}</p>
                  </div>
                  {p.transaction_id && <span className="text-xs text-muted-foreground">#{p.transaction_id}</span>}
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-card border-border/50">
            <div className="p-4 border-b border-border/30"><h2 className="font-semibold text-foreground flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> হাজিরা হিস্ট্রি</h2></div>
            <div className="divide-y divide-border/30 max-h-80 overflow-auto">
              {recentAttendance?.length === 0 && <div className="p-4 text-sm text-muted-foreground text-center">কোনো হাজিরা নেই</div>}
              {recentAttendance?.map((a: any) => (
                <div key={a.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground">{a.shootings?.name || "শুটিং"}</p>
                    <p className="text-xs text-muted-foreground">{a.shootings?.shoot_date ? new Date(a.shootings.shoot_date).toLocaleDateString("bn-BD") : ""}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_present ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{a.is_present ? "উপস্থিত" : "অনুপস্থিত"}</span>
                    {a.daily_rate > 0 && <p className="text-xs text-muted-foreground mt-0.5">৳{Number(a.daily_rate).toLocaleString("bn-BD")}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
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

      {/* Script View Dialog — A4 style */}
      <Dialog open={!!viewScriptData} onOpenChange={(open) => !open && setViewScriptData(null)}>
        <DialogContent className="bg-muted/50 border-none max-w-[900px] w-[95vw] max-h-[95vh] p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/20 bg-card/80 backdrop-blur">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-primary" />
              {viewScriptData?.title}
            </h2>
          </div>
          <div className="overflow-y-auto p-4 md:p-8 flex justify-center" style={{ maxHeight: "calc(95vh - 56px)" }}>
            {/* A4 Page */}
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
              {/* Title */}
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