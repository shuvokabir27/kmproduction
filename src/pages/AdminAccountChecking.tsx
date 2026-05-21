import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useMemberBalance } from "@/hooks/useMemberBalance";
import { useState, useMemo, useRef } from "react";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  Gift,
  Briefcase,
  CreditCard,
  Search,
  User,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Download,
  Loader2,
} from "lucide-react";

const fmt = (n: number) => `৳${Number(n || 0).toLocaleString("bn-BD")}`;
const fmtDate = (d: string | null | undefined) =>
  d ? format(new Date(d), "dd MMM yyyy", { locale: bn }) : "-";

const AdminAccountChecking = () => {
  const { user, isAdmin, loading } = useAuth();
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [memberSearch, setMemberSearch] = useState("");
  const [downloading, setDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: members } = useQuery({
    queryKey: ["account-check-members"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, designation, photo_url, member_id, is_active")
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
  const balance = useMemberBalance(selectedMember || undefined);

  // Detailed breakdown queries
  const { data: attendance } = useQuery({
    queryKey: ["acc-attendance", selectedMember],
    enabled: !!selectedMember,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("id, daily_rate, is_present, created_at, shooting_id, shootings(name, shoot_date, location)")
        .eq("member_id", selectedMember)
        .eq("is_present", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["acc-payments", selectedMember],
    enabled: !!selectedMember,
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("id, amount, payment_method, payment_date, transaction_id, notes")
        .eq("member_id", selectedMember)
        .order("payment_date", { ascending: false });
      return data || [];
    },
  });

  const { data: bonuses } = useQuery({
    queryKey: ["acc-bonuses", selectedMember],
    enabled: !!selectedMember,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("bonuses")
        .select("id, amount, type, bonus_date, notes")
        .eq("member_id", selectedMember)
        .order("bonus_date", { ascending: false });
      return data || [];
    },
  });

  const { data: salaryCredits } = useQuery({
    queryKey: ["acc-salary-credits", selectedMember],
    enabled: !!selectedMember,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("salary_credits")
        .select("id, amount, credit_month, created_at")
        .eq("member_id", selectedMember)
        .order("credit_month", { ascending: false });
      return data || [];
    },
  });

  const { data: freelanceWork } = useQuery({
    queryKey: ["acc-freelance", selectedMember, selectedProfile?.full_name],
    enabled: !!selectedMember,
    queryFn: async () => {
      const { data: assignments } = await (supabase as any)
        .from("freelance_assignments")
        .select("id, rate, paid_amount, role_label, notes, project_id, freelance_projects(name, project_date, client_name)")
        .eq("member_id", selectedMember)
        .order("created_at", { ascending: false });

      let clientArtist: any[] = [];
      if (selectedProfile?.full_name) {
        const { data: ca } = await (supabase as any)
          .from("client_project_artists")
          .select("id, remuneration, paid_amount, notes, project_id, freelance_projects(name, project_date, client_name)")
          .eq("artist_name", selectedProfile.full_name)
          .order("created_at", { ascending: false });
        clientArtist = ca || [];
      }

      return {
        assignments: assignments || [],
        clientArtist,
      };
    },
  });

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const b = balance.data;

  const handleDownloadReport = async () => {
    if (!reportRef.current || !selectedProfile || !b) {
      toast.error("রিপোর্ট তৈরির জন্য প্রস্তুত নয়");
      return;
    }
    setDownloading(true);
    try {
      // Make the offscreen report visible for capture
      const node = reportRef.current;
      node.style.left = "0";
      node.style.top = "0";
      node.style.position = "fixed";
      node.style.zIndex = "-1";
      node.style.opacity = "1";

      await new Promise((r) => setTimeout(r, 100));

      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: node.scrollWidth,
        windowHeight: node.scrollHeight,
      });

      // Hide again
      node.style.left = "-99999px";
      node.style.top = "-99999px";
      node.style.opacity = "0";

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
        heightLeft -= pageH;
      }

      const filename = `একাউন্ট-রিপোর্ট-${selectedProfile.full_name}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      pdf.save(filename);
      toast.success("রিপোর্ট ডাউনলোড হয়েছে");
    } catch (err: any) {
      toast.error("ডাউনলোড ব্যর্থ: " + (err?.message || ""));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30">
              <Calculator className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">একাউন্ট চেকিং</h1>
              <p className="text-sm text-muted-foreground">সদস্যের সম্পূর্ণ আর্থিক হিসাব</p>
            </div>
          </div>
          {selectedMember && b && (
            <Button onClick={handleDownloadReport} disabled={downloading} className="gap-2">
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {downloading ? "তৈরি হচ্ছে..." : "পুরো রিপোর্ট PDF ডাউনলোড"}
            </Button>
          )}
        </div>

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
              <Select value={selectedMember} onValueChange={setSelectedMember}>
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
                          <span className="text-xs text-muted-foreground">• {m.designation}</span>
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
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/30 flex items-center justify-center overflow-hidden border">
                {selectedProfile.photo_url ? (
                  <img src={selectedProfile.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-6 w-6 text-indigo-400" />
                )}
              </div>
              <div>
                <div className="font-semibold">{selectedProfile.full_name}</div>
                <div className="text-xs text-muted-foreground">
                  {selectedProfile.designation || "সদস্য"} • ID: {selectedProfile.member_id}
                </div>
              </div>
            </div>
          )}
        </Card>

        {!selectedMember && (
          <Card className="p-10 text-center text-muted-foreground">
            <Calculator className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>একাউন্ট চেক করতে উপর থেকে একজন সদস্য নির্বাচন করুন</p>
          </Card>
        )}

        {selectedMember && b && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-4 bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/30">
                <div className="flex items-center justify-between mb-2">
                  <ArrowUpRight className="h-5 w-5 text-red-500" />
                  <Badge variant="outline" className="text-[10px] border-red-500/40 text-red-400">আয়</Badge>
                </div>
                <div className="text-xs text-muted-foreground">মোট আয় (KM)</div>
                <div className="text-lg md:text-xl font-bold text-red-400">
                  {fmt(b.totalEarned + b.totalBonuses + b.totalSalaryCredits + b.previousBalance)}
                </div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/30">
                <div className="flex items-center justify-between mb-2">
                  <ArrowDownRight className="h-5 w-5 text-rose-500" />
                  <Badge variant="outline" className="text-[10px] border-rose-500/40 text-rose-400">পরিশোধ</Badge>
                </div>
                <div className="text-xs text-muted-foreground">মোট পরিশোধ</div>
                <div className="text-lg md:text-xl font-bold text-rose-400">{fmt(b.totalPaid)}</div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/30">
                <div className="flex items-center justify-between mb-2">
                  <Briefcase className="h-5 w-5 text-blue-500" />
                  <Badge variant="outline" className="text-[10px] border-blue-500/40 text-blue-400">বাইরের</Badge>
                </div>
                <div className="text-xs text-muted-foreground">বাইরের কাজ</div>
                <div className="text-lg md:text-xl font-bold text-blue-400">{fmt(b.totalFreelance)}</div>
                <div className="text-[10px] text-muted-foreground">পরিশোধ: {fmt(b.totalFreelancePaid)}</div>
              </Card>

              <Card className="p-4 bg-gradient-to-br from-violet-500/10 to-violet-500/5 border-violet-500/30">
                <div className="flex items-center justify-between mb-2">
                  <Wallet className="h-5 w-5 text-violet-500" />
                  <Badge variant="outline" className="text-[10px] border-violet-500/40 text-violet-400">ব্যালান্স</Badge>
                </div>
                <div className="text-xs text-muted-foreground">মোট ব্যালান্স</div>
                <div className={`text-lg md:text-xl font-bold ${b.balance >= 0 ? "text-red-400" : "text-rose-400"}`}>
                  {fmt(b.balance)}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  KM: {fmt(b.kmBalance)} • ক্লায়েন্ট: {fmt(b.clientBalance)}
                </div>
              </Card>
            </div>

            {/* Detailed Breakdown Tabs */}
            <Card className="p-3 md:p-5">
              <Tabs defaultValue="summary" className="w-full">
                <div className="overflow-x-auto pb-2">
                  <TabsList className="inline-flex w-auto">
                    <TabsTrigger value="summary">সারসংক্ষেপ</TabsTrigger>
                    <TabsTrigger value="attendance">হাজিরা ({attendance?.length || 0})</TabsTrigger>
                    <TabsTrigger value="bonuses">বোনাস ({bonuses?.length || 0})</TabsTrigger>
                    <TabsTrigger value="salary">স্যালারি ({salaryCredits?.length || 0})</TabsTrigger>
                    <TabsTrigger value="freelance">বাইরের কাজ</TabsTrigger>
                    <TabsTrigger value="payments">পরিশোধ ({payments?.length || 0})</TabsTrigger>
                  </TabsList>
                </div>

                {/* Summary Tab */}
                <TabsContent value="summary" className="space-y-3 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Card className="p-4 space-y-2">
                      <div className="text-sm font-semibold flex items-center gap-2 text-red-400">
                        <TrendingUp className="h-4 w-4" /> আয়ের উৎসসমূহ
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <Row label="পূর্ববর্তী ব্যালান্স" value={fmt(b.previousBalance)} />
                        <Row label={`হাজিরা থেকে (${attendance?.length || 0} দিন)`} value={fmt(b.totalEarned)} />
                        <Row label="বোনাস" value={fmt(b.totalBonus)} />
                        <Row label="যাতায়াত" value={fmt(b.totalTransport)} />
                        <Row label="মাসিক স্যালারি ক্রেডিট" value={fmt(b.totalSalaryCredits)} />
                        <Row label="বাইরের কাজ (KM via)" value={fmt(b.totalFreelance)} />
                        <div className="border-t pt-1.5 mt-1.5">
                          <Row label="মোট আয়" value={fmt(b.totalEarned + b.totalBonuses + b.totalSalaryCredits + b.previousBalance + b.totalFreelance)} bold />
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 space-y-2">
                      <div className="text-sm font-semibold flex items-center gap-2 text-rose-400">
                        <TrendingDown className="h-4 w-4" /> পরিশোধ
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <Row label="KM পেমেন্ট" value={fmt(b.totalPaid)} />
                        <Row label="বাইরের কাজ পরিশোধ" value={fmt(b.totalFreelancePaid)} />
                        <div className="border-t pt-1.5 mt-1.5">
                          <Row label="মোট পরিশোধ" value={fmt(b.totalPaid + b.totalFreelancePaid)} bold />
                        </div>
                      </div>

                      <div className="border-t pt-3 mt-3 space-y-1.5 text-sm">
                        <div className="text-sm font-semibold text-violet-400">ব্যালান্স</div>
                        <Row label="KM ব্যালান্স" value={fmt(b.kmBalance)} />
                        <Row label="ক্লায়েন্ট ব্যালান্স" value={fmt(b.clientBalance)} />
                        <div className="border-t pt-1.5 mt-1.5">
                          <Row
                            label="মোট পাওনা"
                            value={fmt(b.balance)}
                            bold
                            className={b.balance >= 0 ? "text-red-400" : "text-rose-400"}
                          />
                        </div>
                      </div>
                    </Card>
                  </div>
                </TabsContent>

                {/* Attendance Tab */}
                <TabsContent value="attendance" className="mt-4">
                  <DataTable
                    icon={<Calendar className="h-4 w-4 text-cyan-400" />}
                    headers={["তারিখ", "শুটিং", "লোকেশন", "রেট"]}
                    rows={
                      attendance?.map((a: any) => [
                        fmtDate(a.shootings?.shoot_date || a.created_at),
                        a.shootings?.name || "-",
                        a.shootings?.location || "-",
                        <span className="font-semibold text-red-400">{fmt(a.daily_rate)}</span>,
                      ]) || []
                    }
                    total={fmt(b.totalEarned)}
                  />
                </TabsContent>

                {/* Bonuses Tab */}
                <TabsContent value="bonuses" className="mt-4">
                  <DataTable
                    icon={<Gift className="h-4 w-4 text-red-400" />}
                    headers={["তারিখ", "ধরন", "নোট", "পরিমাণ"]}
                    rows={
                      bonuses?.map((bn: any) => [
                        fmtDate(bn.bonus_date),
                        <Badge variant="outline" className="text-[10px]">
                          {bn.type === "transport" ? "যাতায়াত" : "বোনাস"}
                        </Badge>,
                        bn.notes || "-",
                        <span className="font-semibold text-red-400">{fmt(bn.amount)}</span>,
                      ]) || []
                    }
                    total={fmt(b.totalBonuses)}
                  />
                </TabsContent>

                {/* Salary Credits Tab */}
                <TabsContent value="salary" className="mt-4">
                  <DataTable
                    icon={<Wallet className="h-4 w-4 text-red-400" />}
                    headers={["মাস", "ক্রেডিট তারিখ", "পরিমাণ"]}
                    rows={
                      salaryCredits?.map((s: any) => [
                        format(new Date(s.credit_month), "MMM yyyy", { locale: bn }),
                        fmtDate(s.created_at),
                        <span className="font-semibold text-red-400">{fmt(s.amount)}</span>,
                      ]) || []
                    }
                    total={fmt(b.totalSalaryCredits)}
                  />
                </TabsContent>

                {/* Freelance Tab */}
                <TabsContent value="freelance" className="mt-4 space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-2">অ্যাসাইনমেন্ট</div>
                    <DataTable
                      icon={<Briefcase className="h-4 w-4 text-red-400" />}
                      headers={["তারিখ", "প্রজেক্ট", "ক্লায়েন্ট", "ভূমিকা", "রেট", "পরিশোধ"]}
                      rows={
                        freelanceWork?.assignments?.map((f: any) => [
                          fmtDate(f.freelance_projects?.project_date),
                          f.freelance_projects?.name || "-",
                          f.freelance_projects?.client_name || "-",
                          f.role_label || "-",
                          <span className="font-semibold text-red-400">{fmt(f.rate)}</span>,
                          <span className="text-rose-400">{fmt(f.paid_amount)}</span>,
                        ]) || []
                      }
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-2">ক্লায়েন্ট পোর্টালের কাজ</div>
                    <DataTable
                      icon={<Briefcase className="h-4 w-4 text-blue-400" />}
                      headers={["তারিখ", "প্রজেক্ট", "ক্লায়েন্ট", "পারিশ্রমিক", "পরিশোধ"]}
                      rows={
                        freelanceWork?.clientArtist?.map((c: any) => [
                          fmtDate(c.freelance_projects?.project_date),
                          c.freelance_projects?.name || "-",
                          c.freelance_projects?.client_name || "-",
                          <span className="font-semibold text-red-400">{fmt(c.remuneration)}</span>,
                          <span className="text-rose-400">{fmt(c.paid_amount)}</span>,
                        ]) || []
                      }
                    />
                  </div>
                </TabsContent>

                {/* Payments Tab */}
                <TabsContent value="payments" className="mt-4">
                  <DataTable
                    icon={<CreditCard className="h-4 w-4 text-rose-400" />}
                    headers={["তারিখ", "মাধ্যম", "ট্রানজেকশন ID", "নোট", "পরিমাণ"]}
                    rows={
                      payments?.map((p: any) => [
                        fmtDate(p.payment_date),
                        <Badge variant="outline" className="text-[10px]">{p.payment_method}</Badge>,
                        p.transaction_id || "-",
                        p.notes || "-",
                        <span className="font-semibold text-rose-400">{fmt(p.amount)}</span>,
                      ]) || []
                    }
                    total={fmt(b.totalPaid)}
                  />
                </TabsContent>
              </Tabs>
            </Card>
          </>
        )}
      </div>

      {/* Offscreen full report for PDF capture */}
      {selectedMember && b && selectedProfile && (
        <div
          ref={reportRef}
          style={{
            position: "fixed",
            left: "-99999px",
            top: "-99999px",
            opacity: 0,
            width: "794px", // A4 width @ 96dpi
            background: "#ffffff",
            color: "#0f172a",
            padding: "32px",
            fontFamily: "'Tiro Bangla', 'Hind Siliguri', sans-serif",
            fontSize: "12px",
            lineHeight: 1.6,
          }}
        >
          <ReportContent
            profile={selectedProfile}
            balance={b}
            attendance={attendance || []}
            payments={payments || []}
            bonuses={bonuses || []}
            salaryCredits={salaryCredits || []}
            freelanceWork={freelanceWork || { assignments: [], clientArtist: [] }}
          />
        </div>
      )}
    </AppLayout>
  );
};

const Row = ({
  label,
  value,
  bold,
  className,
}: {
  label: string;
  value: string;
  bold?: boolean;
  className?: string;
}) => (
  <div className="flex items-center justify-between gap-3">
    <span className={`text-muted-foreground ${bold ? "font-semibold text-foreground" : ""}`}>{label}</span>
    <span className={`tabular-nums ${bold ? "font-bold" : "font-medium"} ${className || ""}`}>{value}</span>
  </div>
);

const DataTable = ({
  icon,
  headers,
  rows,
  total,
}: {
  icon?: React.ReactNode;
  headers: string[];
  rows: (React.ReactNode[])[];
  total?: string;
}) => {
  if (!rows.length) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
        কোনো তথ্য নেই
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="text-left px-3 py-2 font-semibold text-xs text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t hover:bg-muted/30">
                {r.map((cell, j) => (
                  <td key={j} className="px-3 py-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {rows.map((r, i) => (
          <Card key={i} className="p-3 space-y-1.5 text-sm">
            {r.map((cell, j) => (
              <div key={j} className="flex items-start justify-between gap-3">
                <span className="text-xs text-muted-foreground shrink-0">{headers[j]}</span>
                <span className="text-right">{cell}</span>
              </div>
            ))}
          </Card>
        ))}
      </div>

      {total && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          {icon}
          <span className="text-sm text-muted-foreground">মোট:</span>
          <span className="text-base font-bold tabular-nums">{total}</span>
        </div>
      )}
    </div>
  );
};

// ============ Report Content for PDF ============
const ReportContent = ({
  profile,
  balance: b,
  attendance,
  payments,
  bonuses,
  salaryCredits,
  freelanceWork,
}: {
  profile: any;
  balance: any;
  attendance: any[];
  payments: any[];
  bonuses: any[];
  salaryCredits: any[];
  freelanceWork: { assignments: any[]; clientArtist: any[] };
}) => {
  const today = format(new Date(), "dd MMMM yyyy", { locale: bn });
  const totalIncome = b.totalEarned + b.totalBonuses + b.totalSalaryCredits + b.previousBalance + b.totalFreelance;
  const totalOut = b.totalPaid + b.totalFreelancePaid;

  const th: React.CSSProperties = {
    background: "#f1f5f9",
    color: "#475569",
    padding: "6px 8px",
    textAlign: "left",
    fontSize: "11px",
    fontWeight: 600,
    border: "1px solid #e2e8f0",
  };
  const td: React.CSSProperties = {
    padding: "6px 8px",
    border: "1px solid #e2e8f0",
    fontSize: "11px",
    color: "#0f172a",
  };
  const sectionTitle: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: 700,
    color: "#1e40af",
    marginTop: "20px",
    marginBottom: "8px",
    paddingBottom: "4px",
    borderBottom: "2px solid #1e40af",
  };

  const renderTable = (headers: string[], rows: (string | number)[][], emptyText = "কোনো তথ্য নেই") => {
    if (!rows.length) {
      return <div style={{ padding: "8px", color: "#94a3b8", fontSize: "11px", fontStyle: "italic" }}>{emptyText}</div>;
    }
    return (
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4px" }}>
        <thead>
          <tr>{headers.map((h, i) => <th key={i} style={th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ background: i % 2 ? "#f8fafc" : "#ffffff" }}>
              {r.map((c, j) => <td key={j} style={td}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ borderBottom: "3px solid #1e40af", paddingBottom: "12px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#1e40af" }}>কুয়াকাটা মাল্টিমিডিয়া</div>
            <div style={{ fontSize: "13px", color: "#475569", marginTop: "2px" }}>সদস্য একাউন্ট রিপোর্ট</div>
          </div>
          <div style={{ fontSize: "10px", color: "#64748b", textAlign: "right" }}>
            <div>রিপোর্ট তারিখ:</div>
            <div style={{ fontWeight: 600, color: "#0f172a" }}>{today}</div>
          </div>
        </div>
      </div>

      {/* Member info */}
      <div style={{ display: "flex", gap: "12px", padding: "12px", background: "#eff6ff", borderRadius: "8px", marginBottom: "12px", border: "1px solid #bfdbfe" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", overflow: "hidden", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #1e40af", flexShrink: 0 }}>
          {profile.photo_url ? (
            <img src={profile.photo_url} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: "24px", color: "#1e40af", fontWeight: 700 }}>{profile.full_name?.charAt(0)}</span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>{profile.full_name}</div>
          <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>{profile.designation || "সদস্য"}</div>
          <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>সদস্য আইডি: {profile.member_id ?? "—"}</div>
        </div>
      </div>

      {/* Summary */}
      <div style={sectionTitle}>আর্থিক সারসংক্ষেপ</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div style={{ padding: "10px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#15803d", marginBottom: "6px" }}>আয়ের উৎস</div>
          <SumRow label="পূর্ববর্তী ব্যালান্স" value={fmt(b.previousBalance)} />
          <SumRow label={`হাজিরা (${attendance.length} দিন)`} value={fmt(b.totalEarned)} />
          <SumRow label="বোনাস" value={fmt(b.totalBonus)} />
          <SumRow label="যাতায়াত" value={fmt(b.totalTransport)} />
          <SumRow label="স্যালারি ক্রেডিট" value={fmt(b.totalSalaryCredits)} />
          <SumRow label="বাইরের কাজ" value={fmt(b.totalFreelance)} />
          <SumRow label="মোট আয়" value={fmt(totalIncome)} bold />
        </div>
        <div style={{ padding: "10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#b91c1c", marginBottom: "6px" }}>পরিশোধ ও ব্যালান্স</div>
          <SumRow label="KM পেমেন্ট" value={fmt(b.totalPaid)} />
          <SumRow label="বাইরের কাজ পরিশোধ" value={fmt(b.totalFreelancePaid)} />
          <SumRow label="মোট পরিশোধ" value={fmt(totalOut)} bold />
          <div style={{ borderTop: "1px dashed #cbd5e1", marginTop: "6px", paddingTop: "6px" }}>
            <SumRow label="KM ব্যালান্স" value={fmt(b.kmBalance)} />
            <SumRow label="ক্লায়েন্ট ব্যালান্স" value={fmt(b.clientBalance)} />
            <SumRow label="চূড়ান্ত পাওনা" value={fmt(b.balance)} bold color={b.balance >= 0 ? "#15803d" : "#b91c1c"} />
          </div>
        </div>
      </div>

      {/* Attendance */}
      <div style={sectionTitle}>হাজিরা বিবরণ ({attendance.length})</div>
      {renderTable(
        ["তারিখ", "শুটিং", "লোকেশন", "রেট"],
        attendance.map((a: any) => [
          fmtDate(a.shootings?.shoot_date || a.created_at),
          a.shootings?.name || "-",
          a.shootings?.location || "-",
          fmt(a.daily_rate),
        ])
      )}

      {/* Bonuses */}
      <div style={sectionTitle}>বোনাস ও যাতায়াত ({bonuses.length})</div>
      {renderTable(
        ["তারিখ", "ধরন", "নোট", "পরিমাণ"],
        bonuses.map((bn: any) => [
          fmtDate(bn.bonus_date),
          bn.type === "transport" ? "যাতায়াত" : "বোনাস",
          bn.notes || "-",
          fmt(bn.amount),
        ])
      )}

      {/* Salary credits */}
      <div style={sectionTitle}>মাসিক স্যালারি ক্রেডিট ({salaryCredits.length})</div>
      {renderTable(
        ["মাস", "ক্রেডিট তারিখ", "পরিমাণ"],
        salaryCredits.map((s: any) => [
          format(new Date(s.credit_month), "MMM yyyy", { locale: bn }),
          fmtDate(s.created_at),
          fmt(s.amount),
        ])
      )}

      {/* Freelance assignments */}
      <div style={sectionTitle}>বাইরের কাজ — অ্যাসাইনমেন্ট ({freelanceWork.assignments.length})</div>
      {renderTable(
        ["তারিখ", "প্রজেক্ট", "ক্লায়েন্ট", "ভূমিকা", "রেট", "পরিশোধ"],
        freelanceWork.assignments.map((f: any) => [
          fmtDate(f.freelance_projects?.project_date),
          f.freelance_projects?.name || "-",
          f.freelance_projects?.client_name || "-",
          f.role_label || "-",
          fmt(f.rate),
          fmt(f.paid_amount),
        ])
      )}

      {/* Client artist */}
      <div style={sectionTitle}>বাইরের কাজ — ক্লায়েন্ট পোর্টাল ({freelanceWork.clientArtist.length})</div>
      {renderTable(
        ["তারিখ", "প্রজেক্ট", "ক্লায়েন্ট", "পারিশ্রমিক", "পরিশোধ"],
        freelanceWork.clientArtist.map((c: any) => [
          fmtDate(c.freelance_projects?.project_date),
          c.freelance_projects?.name || "-",
          c.freelance_projects?.client_name || "-",
          fmt(c.remuneration),
          fmt(c.paid_amount),
        ])
      )}

      {/* Payments */}
      <div style={sectionTitle}>পরিশোধ ইতিহাস ({payments.length})</div>
      {renderTable(
        ["তারিখ", "মাধ্যম", "ট্রানজেকশন ID", "নোট", "পরিমাণ"],
        payments.map((p: any) => [
          fmtDate(p.payment_date),
          p.payment_method,
          p.transaction_id || "-",
          p.notes || "-",
          fmt(p.amount),
        ])
      )}

      {/* Footer */}
      <div style={{ marginTop: "24px", paddingTop: "12px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#64748b" }}>
        <span>কুয়াকাটা মাল্টিমিডিয়া — অভ্যন্তরীণ ব্যবহারের জন্য</span>
        <span>রিপোর্ট তৈরি: {today}</span>
      </div>
    </div>
  );
};

const SumRow = ({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: "11px", borderTop: bold ? "1px solid #cbd5e1" : "none", marginTop: bold ? "4px" : 0, paddingTop: bold ? "4px" : "2px" }}>
    <span style={{ color: "#475569", fontWeight: bold ? 700 : 400 }}>{label}</span>
    <span style={{ color: color || "#0f172a", fontWeight: bold ? 700 : 600 }}>{value}</span>
  </div>
);

export default AdminAccountChecking;
