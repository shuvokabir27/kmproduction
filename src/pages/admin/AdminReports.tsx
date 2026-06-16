import { WPAdminShell } from "@/components/admin/WPAdminShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3 } from "lucide-react";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

export default function AdminReports() {
  const { data: orders } = useQuery({
    queryKey: ["report-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (!orders) return <WPAdminShell title="রিপোর্ট"><div className="h-40 bg-white border border-slate-200 animate-pulse rounded-md" /></WPAdminShell>;

  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const valid = orders.filter((o: any) => o.status !== "cancelled" && o.status !== "abandoned");
  const thisMonthOrders = valid.filter((o: any) => new Date(o.created_at) >= thisMonth);
  const lastMonthOrders = valid.filter((o: any) => { const d = new Date(o.created_at); return d >= lastMonth && d <= lastMonthEnd; });
  const thisMonthRev = thisMonthOrders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
  const lastMonthRev = lastMonthOrders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
  const growth = lastMonthRev > 0 ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100) : 0;
  const statusCounts = valid.reduce((acc: Record<string, number>, o: any) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});
  const conversionRate = valid.length > 0 ? Math.round(((statusCounts["delivered"] || 0) / valid.length) * 100) : 0;

  const stats = [
    { label: "এই মাসের আয়", value: `৳${toBn(thisMonthRev)}` },
    { label: "গত মাসের আয়", value: `৳${toBn(lastMonthRev)}` },
    { label: "প্রবৃদ্ধি", value: `${growth >= 0 ? "+" : ""}${toBn(growth)}%` },
    { label: "ডেলিভারি রেট", value: `${toBn(conversionRate)}%` },
  ];

  return (
    <WPAdminShell title="রিপোর্ট" subtitle="বিক্রি ও অর্ডার পরিসংখ্যান">
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-md p-4">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{s.value}</p>
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <h4 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600" /> অর্ডার স্ট্যাটাস সামারি
          </h4>
          <div className="space-y-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between p-2 rounded bg-slate-50">
                <span className="text-sm text-slate-700 capitalize">{status}</span>
                <span className="text-sm font-bold text-slate-900">{toBn(count as number)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WPAdminShell>
  );
}
