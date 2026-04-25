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
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
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
} from "lucide-react";

const fmt = (n: number) => `৳${Number(n || 0).toLocaleString("bn-BD")}`;
const fmtDate = (d: string | null | undefined) =>
  d ? format(new Date(d), "dd MMM yyyy", { locale: bn }) : "-";

const AdminAccountChecking = () => {
  const { user, isAdmin, loading } = useAuth();
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [memberSearch, setMemberSearch] = useState("");

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

  return (
    <AppLayout>
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30">
            <Calculator className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">একাউন্ট চেকিং</h1>
            <p className="text-sm text-muted-foreground">সদস্যের সম্পূর্ণ আর্থিক হিসাব</p>
          </div>
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
                <SelectTrigger>
                  <SelectValue placeholder="সদস্য নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {filteredMembers.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex items-center gap-2">
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
              <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30">
                <div className="flex items-center justify-between mb-2">
                  <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                  <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400">আয়</Badge>
                </div>
                <div className="text-xs text-muted-foreground">মোট আয় (KM)</div>
                <div className="text-lg md:text-xl font-bold text-emerald-400">
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
                <div className={`text-lg md:text-xl font-bold ${b.balance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
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
                      <div className="text-sm font-semibold flex items-center gap-2 text-emerald-400">
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
                            className={b.balance >= 0 ? "text-emerald-400" : "text-rose-400"}
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
                        <span className="font-semibold text-emerald-400">{fmt(a.daily_rate)}</span>,
                      ]) || []
                    }
                    total={fmt(b.totalEarned)}
                  />
                </TabsContent>

                {/* Bonuses Tab */}
                <TabsContent value="bonuses" className="mt-4">
                  <DataTable
                    icon={<Gift className="h-4 w-4 text-green-400" />}
                    headers={["তারিখ", "ধরন", "নোট", "পরিমাণ"]}
                    rows={
                      bonuses?.map((bn: any) => [
                        fmtDate(bn.bonus_date),
                        <Badge variant="outline" className="text-[10px]">
                          {bn.type === "transport" ? "যাতায়াত" : "বোনাস"}
                        </Badge>,
                        bn.notes || "-",
                        <span className="font-semibold text-emerald-400">{fmt(bn.amount)}</span>,
                      ]) || []
                    }
                    total={fmt(b.totalBonuses)}
                  />
                </TabsContent>

                {/* Salary Credits Tab */}
                <TabsContent value="salary" className="mt-4">
                  <DataTable
                    icon={<Wallet className="h-4 w-4 text-amber-400" />}
                    headers={["মাস", "ক্রেডিট তারিখ", "পরিমাণ"]}
                    rows={
                      salaryCredits?.map((s: any) => [
                        format(new Date(s.credit_month), "MMM yyyy", { locale: bn }),
                        fmtDate(s.created_at),
                        <span className="font-semibold text-emerald-400">{fmt(s.amount)}</span>,
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
                      icon={<Briefcase className="h-4 w-4 text-orange-400" />}
                      headers={["তারিখ", "প্রজেক্ট", "ক্লায়েন্ট", "ভূমিকা", "রেট", "পরিশোধ"]}
                      rows={
                        freelanceWork?.assignments?.map((f: any) => [
                          fmtDate(f.freelance_projects?.project_date),
                          f.freelance_projects?.name || "-",
                          f.freelance_projects?.client_name || "-",
                          f.role_label || "-",
                          <span className="font-semibold text-emerald-400">{fmt(f.rate)}</span>,
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
                          <span className="font-semibold text-emerald-400">{fmt(c.remuneration)}</span>,
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

export default AdminAccountChecking;
