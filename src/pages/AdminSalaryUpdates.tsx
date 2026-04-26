import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  User as UserIcon,
  Wallet,
  Download,
  Loader2,
  History,
  ArrowRight,
  Save,
} from "lucide-react";

const fmt = (n: number | null | undefined) =>
  `৳${Number(n || 0).toLocaleString("bn-BD")}`;
const fmtDate = (d: string | null | undefined) =>
  d ? format(new Date(d), "dd MMM yyyy, hh:mm a", { locale: bn }) : "-";

type ChangeType = "amount_increase" | "amount_decrease" | "type_change";

const AdminSalaryUpdates = () => {
  const { user, isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [salaryType, setSalaryType] = useState<"daily" | "monthly">("daily");
  const [newAmount, setNewAmount] = useState<string>("");
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [latestChange, setLatestChange] = useState<any>(null);

  const cardRef = useRef<HTMLDivElement>(null);

  const { data: members } = useQuery({
    queryKey: ["salary-update-members"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select(
          "id, full_name, full_name_en, designation, photo_url, member_id, salary_type, daily_rate, monthly_salary, is_active"
        )
        .order("full_name");
      return data || [];
    },
  });

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m: any) =>
        m.full_name?.toLowerCase().includes(q) ||
        m.designation?.toLowerCase().includes(q) ||
        String(m.member_id || "").includes(q)
    );
  }, [members, memberSearch]);

  const selectedProfile = members?.find((m: any) => m.id === selectedMember);

  const { data: history } = useQuery({
    queryKey: ["salary-changes", selectedMember],
    enabled: !!selectedMember,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("salary_changes")
        .select("*")
        .eq("member_id", selectedMember)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // When selecting a member, prefill current values
  const handleSelectMember = (id: string) => {
    setSelectedMember(id);
    setLatestChange(null);
    const m = members?.find((x: any) => x.id === id);
    if (m) {
      setSalaryType((m.salary_type as any) || "daily");
      const cur =
        m.salary_type === "monthly" ? m.monthly_salary : m.daily_rate;
      setNewAmount(cur ? String(cur) : "");
      setAdminNote("");
    }
  };

  const currentAmount = useMemo(() => {
    if (!selectedProfile) return 0;
    return selectedProfile.salary_type === "monthly"
      ? Number(selectedProfile.monthly_salary || 0)
      : Number(selectedProfile.daily_rate || 0);
  }, [selectedProfile]);

  const oldType = (selectedProfile?.salary_type as any) || "daily";
  const newAmt = Number(newAmount || 0);
  const isTypeChanged = selectedProfile && oldType !== salaryType;
  const diff = newAmt - currentAmount;

  const changeKind: ChangeType | null = useMemo(() => {
    if (!selectedProfile) return null;
    if (isTypeChanged) return "type_change";
    if (newAmt > currentAmount) return "amount_increase";
    if (newAmt < currentAmount) return "amount_decrease";
    return null;
  }, [selectedProfile, isTypeChanged, newAmt, currentAmount]);

  const handleSubmit = async () => {
    if (!selectedProfile) {
      toast.error("একজন সদস্য নির্বাচন করুন");
      return;
    }
    if (!newAmount || isNaN(newAmt) || newAmt < 0) {
      toast.error("সঠিক বেতনের পরিমাণ দিন");
      return;
    }
    if (!changeKind) {
      toast.info("কোনো পরিবর্তন নেই");
      return;
    }

    setSubmitting(true);
    try {
      // 1) Update profile
      const profileUpdate: any = {
        salary_type: salaryType,
      };
      if (isTypeChanged) {
        profileUpdate.salary_type_changed_at = new Date().toISOString();
      }
      if (salaryType === "monthly") {
        profileUpdate.monthly_salary = newAmt;
      } else {
        profileUpdate.daily_rate = newAmt;
      }
      const { error: pErr } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", selectedProfile.id);
      if (pErr) throw pErr;

      // 2) Insert salary_changes record
      const insertRow: any = {
        member_id: selectedProfile.id,
        change_type: changeKind,
        old_salary_type: oldType,
        new_salary_type: salaryType,
        old_amount: currentAmount,
        new_amount: newAmt,
        diff_amount: Math.abs(diff),
        admin_note: adminNote.trim() || null,
        changed_by: user?.id || null,
      };
      const { data: inserted, error: cErr } = await (supabase as any)
        .from("salary_changes")
        .insert(insertRow)
        .select()
        .single();
      if (cErr) throw cErr;

      toast.success("বেতন আপডেট সম্পন্ন হয়েছে");
      setLatestChange(inserted);
      qc.invalidateQueries({ queryKey: ["salary-changes", selectedProfile.id] });
      qc.invalidateQueries({ queryKey: ["salary-update-members"] });
    } catch (err: any) {
      toast.error(err?.message || "আপডেট ব্যর্থ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPng = async () => {
    if (!cardRef.current) return;
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
      a.download = `বেতন-আপডেট-${selectedProfile?.full_name || "সদস্য"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("কার্ড ডাউনলোড হয়েছে");
    } catch (err: any) {
      toast.error("ডাউনলোড ব্যর্থ: " + (err?.message || ""));
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <AppLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-emerald-500/30">
            <Wallet className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">বেতন আপডেট</h1>
            <p className="text-sm text-muted-foreground">
              মাসিক/দৈনিক বেতন বাড়ান বা কমান এবং স্বয়ংক্রিয় কার্ড পান
            </p>
          </div>
        </div>

        <Tabs defaultValue="update" className="w-full">
          <TabsList>
            <TabsTrigger value="update" className="gap-2">
              <Save className="h-4 w-4" /> আপডেট
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="gap-2"
              disabled={!selectedMember}
            >
              <History className="h-4 w-4" /> ইতিহাস ({history?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="update" className="space-y-4 mt-4">
            {/* Member selector */}
            <Card className="p-4 md:p-5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="সদস্য খুঁজুন..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Select
                    value={selectedMember}
                    onValueChange={handleSelectMember}
                  >
                    <SelectTrigger className="h-auto min-h-10">
                      <SelectValue placeholder="সদস্য নির্বাচন করুন" />
                    </SelectTrigger>
                    <SelectContent
                      className="max-h-[60vh]"
                      position="popper"
                      sideOffset={4}
                    >
                      {filteredMembers.map((m: any) => (
                        <SelectItem key={m.id} value={m.id} className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0 border">
                              {m.photo_url ? (
                                <img src={m.photo_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-semibold text-muted-foreground">
                                  {(m.full_name || "?").charAt(0)}
                                </span>
                              )}
                            </div>
                            <span className="font-medium">{m.full_name}</span>
                            {m.designation && (
                              <span className="text-xs text-muted-foreground">
                                • {m.designation}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedProfile && (
                <div className="flex items-center gap-3 pt-2 border-t">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500/30 to-amber-500/30 flex items-center justify-center overflow-hidden border">
                    {selectedProfile.photo_url ? (
                      <img
                        src={selectedProfile.photo_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserIcon className="h-6 w-6 text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">
                      {selectedProfile.full_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedProfile.designation || "সদস্য"} • ID:{" "}
                      {selectedProfile.member_id}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-[10px]">
                      বর্তমান: {oldType === "monthly" ? "মাসিক" : "দৈনিক"}
                    </Badge>
                    <div className="text-sm font-semibold mt-1">
                      {fmt(currentAmount)}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Update form */}
            {selectedProfile && (
              <Card className="p-4 md:p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">বেতনের ধরন</Label>
                    <Select
                      value={salaryType}
                      onValueChange={(v: any) => setSalaryType(v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">দৈনিক হাজিরা</SelectItem>
                        <SelectItem value="monthly">মাসিক বেতন</SelectItem>
                      </SelectContent>
                    </Select>
                    {isTypeChanged && (
                      <p className="text-[10px] text-amber-400 mt-1">
                        ⚠️ ধরন পরিবর্তন হচ্ছে: {oldType === "monthly" ? "মাসিক" : "দৈনিক"} → {salaryType === "monthly" ? "মাসিক" : "দৈনিক"}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs">
                      নতুন {salaryType === "monthly" ? "মাসিক বেতন" : "দৈনিক হাজিরা"} (৳)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      placeholder="পরিমাণ লিখুন"
                    />
                  </div>
                </div>

                {/* Diff preview */}
                {changeKind && !isTypeChanged && (
                  <div
                    className={`p-3 rounded-lg border ${
                      changeKind === "amount_increase"
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-rose-500/10 border-rose-500/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      {changeKind === "amount_increase" ? (
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-rose-400" />
                      )}
                      <span className="text-muted-foreground">পরিবর্তন:</span>
                      <span className="font-mono">{fmt(currentAmount)}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono font-semibold">{fmt(newAmt)}</span>
                      <Badge
                        variant="outline"
                        className={
                          changeKind === "amount_increase"
                            ? "ml-auto border-emerald-500/40 text-emerald-400"
                            : "ml-auto border-rose-500/40 text-rose-400"
                        }
                      >
                        {changeKind === "amount_increase" ? "+" : "-"}
                        {fmt(Math.abs(diff))}
                      </Badge>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs">অতিরিক্ত নোট (ঐচ্ছিক)</Label>
                  <Textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="কার্ডে অতিরিক্ত বার্তা যোগ করতে চাইলে লিখুন..."
                    rows={2}
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !changeKind}
                  className="w-full gap-2"
                  size="lg"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {submitting ? "সংরক্ষণ হচ্ছে..." : "আপডেট সংরক্ষণ ও কার্ড তৈরি করুন"}
                </Button>
              </Card>
            )}

            {/* Generated Card */}
            {latestChange && selectedProfile && (
              <Card className="p-4 md:p-5 space-y-3">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <Sparkle /> তৈরি হওয়া কার্ড
                </div>
                <div className="flex justify-center">
                  <SalaryChangeCard
                    cardRef={cardRef}
                    profile={selectedProfile}
                    change={latestChange}
                  />
                </div>
                <Button
                  onClick={handleDownloadPng}
                  disabled={downloading}
                  className="w-full gap-2"
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {downloading ? "ডাউনলোড হচ্ছে..." : "PNG ডাউনলোড করুন"}
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card className="p-4 md:p-5">
              {!history?.length ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  এই সদস্যের কোনো বেতন পরিবর্তনের ইতিহাস নেই
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((h: any) => (
                    <HistoryItem key={h.id} change={h} />
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

const Sparkle = () => (
  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
);

const HistoryItem = ({ change }: { change: any }) => {
  const isUp = change.change_type === "amount_increase";
  const isDown = change.change_type === "amount_decrease";
  const isType = change.change_type === "type_change";
  const tone = isUp
    ? "border-emerald-500/30 bg-emerald-500/5"
    : isDown
    ? "border-rose-500/30 bg-rose-500/5"
    : "border-blue-500/30 bg-blue-500/5";
  return (
    <div className={`p-3 rounded-lg border ${tone}`}>
      <div className="flex items-center gap-2 text-sm">
        {isUp && <TrendingUp className="h-4 w-4 text-emerald-400" />}
        {isDown && <TrendingDown className="h-4 w-4 text-rose-400" />}
        {isType && <RefreshCw className="h-4 w-4 text-blue-400" />}
        <span className="font-medium">
          {isUp && "বেতন বৃদ্ধি"}
          {isDown && "বেতন হ্রাস"}
          {isType && "ধরন পরিবর্তন"}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          {fmtDate(change.created_at)}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
        <span className="text-muted-foreground">
          {change.old_salary_type === "monthly" ? "মাসিক" : "দৈনিক"} {fmt(change.old_amount)}
        </span>
        <ArrowRight className="h-3 w-3" />
        <span className="font-semibold">
          {change.new_salary_type === "monthly" ? "মাসিক" : "দৈনিক"} {fmt(change.new_amount)}
        </span>
        {!isType && (
          <Badge
            variant="outline"
            className={
              isUp
                ? "border-emerald-500/40 text-emerald-400"
                : "border-rose-500/40 text-rose-400"
            }
          >
            {isUp ? "+" : "-"}
            {fmt(change.diff_amount)}
          </Badge>
        )}
      </div>
      {change.admin_note && (
        <p className="text-xs text-muted-foreground mt-2 italic">"{change.admin_note}"</p>
      )}
    </div>
  );
};

// ============ The downloadable salary change card ============
const SalaryChangeCard = ({
  cardRef,
  profile,
  change,
}: {
  cardRef: React.RefObject<HTMLDivElement>;
  profile: any;
  change: any;
}) => {
  const isUp = change.change_type === "amount_increase";
  const isDown = change.change_type === "amount_decrease";
  const isType = change.change_type === "type_change";

  const accent = isUp ? "#10b981" : isDown ? "#f43f5e" : "#3b82f6";
  const accentSoft = isUp
    ? "rgba(16,185,129,0.15)"
    : isDown
    ? "rgba(244,63,94,0.15)"
    : "rgba(59,130,246,0.15)";

  const today = format(new Date(change.created_at), "dd MMMM yyyy", {
    locale: bn,
  });

  const title = isUp
    ? "বেতন বৃদ্ধির ঘোষণা"
    : isDown
    ? "বেতন হ্রাসের নোটিশ"
    : "বেতনের ধরন পরিবর্তন";

  const message = isUp
    ? `প্রিয় ${profile.full_name}, আপনার কাজের ক্রমাগত উন্নতি দেখে আমরা আনন্দিত। স্বীকৃতি স্বরূপ আপনার ${
        change.new_salary_type === "monthly" ? "মাসিক বেতন" : "দৈনিক হাজিরা"
      } ৳${Number(change.diff_amount).toLocaleString("bn-BD")} বৃদ্ধি করা হলো। এভাবেই এগিয়ে চলুন।`
    : isDown
    ? `প্রিয় ${profile.full_name}, আপনার কাছ থেকে যে আউটপুট আমরা আশা করি, সম্প্রতি সেই মান বজায় থাকছে না। বিষয়টি বিবেচনা করে আপনার ${
        change.new_salary_type === "monthly" ? "মাসিক বেতন" : "দৈনিক হাজিরা"
      } ৳${Number(change.diff_amount).toLocaleString("bn-BD")} কমানো হলো। দ্রুত উন্নতির প্রত্যাশা রইল।`
    : `প্রিয় ${profile.full_name}, আপনার বেতনের ধরন ${
        change.old_salary_type === "monthly" ? "মাসিক" : "দৈনিক"
      } থেকে ${
        change.new_salary_type === "monthly" ? "মাসিক" : "দৈনিক"
      } করা হলো। নতুন কাঠামো অনুযায়ী হিসাব পরিচালিত হবে।`;

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

      {/* Amount diff visualization */}
      {!isType && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 10,
            background: "rgba(15,23,42,0.6)",
            border: `1px solid ${accent}`,
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 10,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "#64748b" }}>পূর্বের</div>
            <div style={{ fontSize: 13, color: "#cbd5e1", textDecoration: "line-through" }}>
              ৳{Number(change.old_amount).toLocaleString("bn-BD")}
            </div>
          </div>
          <div style={{ color: accent, fontSize: 18 }}>→</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "#64748b" }}>নতুন</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: accent }}>
              ৳{Number(change.new_amount).toLocaleString("bn-BD")}
            </div>
          </div>
          <div
            style={{
              marginLeft: "auto",
              background: accentSoft,
              color: accent,
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {isUp ? "▲ +" : "▼ -"}৳{Number(change.diff_amount).toLocaleString("bn-BD")}
          </div>
        </div>
      )}

      {isType && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            background: "rgba(15,23,42,0.6)",
            border: `1px solid ${accent}`,
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 10,
          }}
        >
          <div style={{ color: "#cbd5e1", fontSize: 13 }}>
            {change.old_salary_type === "monthly" ? "মাসিক বেতন" : "দৈনিক হাজিরা"}
          </div>
          <div style={{ color: accent, fontSize: 16 }}>→</div>
          <div style={{ color: accent, fontSize: 13, fontWeight: 700 }}>
            {change.new_salary_type === "monthly" ? "মাসিক বেতন" : "দৈনিক হাজিরা"}
          </div>
        </div>
      )}

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

      {change.admin_note && (
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
          “{change.admin_note}”
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, color: "#64748b", fontSize: 10 }}>
        <span>তারিখ: {today}</span>
        <span style={{ color: accent }}>— কর্তৃপক্ষ</span>
      </div>
    </div>
  );
};

export default AdminSalaryUpdates;
