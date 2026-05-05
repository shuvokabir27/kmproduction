import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ShoppingCart, Package, Truck, TrendingUp, Users, UserPlus, RotateCcw,
  Calendar, Clock, Settings
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

type NavFn = (tab: string, orderTab?: string) => void;

const ProductDashboardStats = ({ onNavigate }: { onNavigate?: NavFn } = {}) => {
  const nav: NavFn = (t, o) => onNavigate?.(t, o);
  const queryClient = useQueryClient();
  const { data: orders } = useQuery({
    queryKey: ["dashboard-orders-analytics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-delivery"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("id, free_delivery").limit(1).single();
      return data;
    },
  });

  const [togglingDelivery, setTogglingDelivery] = useState(false);
  const toggleFreeDelivery = async () => {
    if (!siteSettings) return;
    setTogglingDelivery(true);
    const newVal = !siteSettings.free_delivery;
    const { error } = await supabase.from("site_settings").update({ free_delivery: newVal }).eq("id", siteSettings.id);
    setTogglingDelivery(false);
    if (error) { toast.error(error.message); return; }
    toast.success(newVal ? "ফ্রি ডেলিভারি চালু হয়েছে" : "ফ্রি ডেলিভারি বন্ধ হয়েছে");
    queryClient.invalidateQueries({ queryKey: ["site-settings-delivery"] });
  };

  if (!orders) return <DashboardSkeleton />;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());

  // Basic stats
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const deliveredOrders = orders.filter(o => o.status === "delivered").length;
  const cancelledOrders = orders.filter(o => o.status === "cancelled").length;
  const todayOrders = orders.filter(o => new Date(o.created_at) >= today);
  const monthOrders = orders.filter(o => new Date(o.created_at) >= thisMonthStart);

  // Revenue
  const totalRevenue = orders
    .filter(o => o.status !== "cancelled" && o.status !== "abandoned")
    .reduce((s, o) => s + (o.total_amount || 0), 0);
  const monthRevenue = monthOrders
    .filter(o => o.status !== "cancelled" && o.status !== "abandoned")
    .reduce((s, o) => s + (o.total_amount || 0), 0);
  const todayRevenue = todayOrders
    .filter(o => o.status !== "cancelled" && o.status !== "abandoned")
    .reduce((s, o) => s + (o.total_amount || 0), 0);

  // Customer analytics
  const phoneMap = new Map<string, number>();
  orders.filter(o => o.status !== "abandoned").forEach(o => {
    phoneMap.set(o.customer_phone, (phoneMap.get(o.customer_phone) || 0) + 1);
  });
  const totalCustomers = phoneMap.size;
  const returnCustomers = [...phoneMap.values()].filter(c => c > 1).length;
  const newCustomers = totalCustomers - returnCustomers;
  const returnPercent = totalCustomers > 0 ? Math.round((returnCustomers / totalCustomers) * 100) : 0;

  // Peak order hours
  const hourCounts = Array(24).fill(0);
  orders.filter(o => o.status !== "abandoned").forEach(o => {
    const h = new Date(o.created_at).getHours();
    hourCounts[h]++;
  });
  const peakHourData = hourCounts.map((count, h) => {
    const ampm = h < 12 ? "AM" : "PM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return {
      hour: `${h12} ${ampm}`,
      label: h < 12 ? `সকাল ${toBn(h === 0 ? 12 : h)}` : h === 12 ? `দুপুর ১২` : `${h < 17 ? "বিকাল" : h < 20 ? "সন্ধ্যা" : "রাত"} ${toBn(h - 12)}`,
      orders: count,
    };
  }).filter(d => d.orders > 0);

  // Weekly data (last 7 days)
  const weeklyData = [];
  const dayNames = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহ", "শুক্র", "শনি"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dEnd = new Date(d);
    dEnd.setDate(dEnd.getDate() + 1);
    const dayOrders = orders.filter(o => {
      const oc = new Date(o.created_at);
      return oc >= d && oc < dEnd && o.status !== "cancelled" && o.status !== "abandoned";
    });
    weeklyData.push({
      day: dayNames[d.getDay()],
      orders: dayOrders.length,
      revenue: dayOrders.reduce((s, o) => s + (o.total_amount || 0), 0),
    });
  }

  // Monthly data (last 6 months)
  const monthlyData = [];
  const monthNames = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];
  for (let i = 5; i >= 0; i--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const mOrders = orders.filter(o => {
      const oc = new Date(o.created_at);
      return oc >= mStart && oc < mEnd && o.status !== "cancelled" && o.status !== "abandoned";
    });
    monthlyData.push({
      month: monthNames[mStart.getMonth()],
      orders: mOrders.length,
      revenue: mOrders.reduce((s, o) => s + (o.total_amount || 0), 0),
    });
  }

  // Recent customers
  const recentCustomers = orders
    .filter(o => o.status !== "abandoned")
    .slice(0, 10)
    .map(o => ({
      name: o.customer_name,
      phone: o.customer_phone,
      amount: o.total_amount,
      date: o.created_at,
      status: o.status,
      isReturn: (phoneMap.get(o.customer_phone) || 0) > 1,
    }));

  const COLORS = ["hsl(142, 76%, 36%)", "hsl(45, 93%, 47%)", "hsl(0, 84%, 60%)"];
  const customerPieData = [
    { name: "নতুন", value: newCustomers },
    { name: "রিটার্ন", value: returnCustomers },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Settings */}
      <div className="bg-card border border-border/30 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="h-5 w-5 text-emerald-400" />
          <div>
            <p className="font-semibold text-foreground text-sm">ফ্রি ডেলিভারি</p>
            <p className="text-[11px] text-muted-foreground">চালু থাকলে ল্যান্ডিং পেজে ডেলিভারি সংক্রান্ত লেখা দেখাবে</p>
          </div>
        </div>
        <Switch
          checked={siteSettings?.free_delivery ?? true}
          onCheckedChange={toggleFreeDelivery}
          disabled={togglingDelivery || !siteSettings}
        />
      </div>

      {/* Daily Focus */}
      <div className="bg-gradient-to-r from-emerald-900/30 to-amber-900/20 border border-emerald-500/20 rounded-2xl p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-5 w-5 text-emerald-400" />
          <h3 className="font-bold text-foreground">আজকের ফোকাস</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-2xl font-extrabold text-emerald-400">{toBn(todayOrders.length)}</p>
            <p className="text-[11px] text-muted-foreground">অর্ডার</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-extrabold text-amber-400">৳{toBn(todayRevenue)}</p>
            <p className="text-[11px] text-muted-foreground">আয়</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-extrabold text-sky-400">{toBn(pendingOrders)}</p>
            <p className="text-[11px] text-muted-foreground">পেন্ডিং</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={ShoppingCart} label="মোট অর্ডার" value={toBn(totalOrders)} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard icon={Clock} label="পেন্ডিং" value={toBn(pendingOrders)} color="text-yellow-400" bg="bg-yellow-500/10" />
        <StatCard icon={Truck} label="ডেলিভারড" value={toBn(deliveredOrders)} color="text-emerald-400" bg="bg-emerald-500/10" />
        <StatCard icon={TrendingUp} label="মোট আয়" value={`৳${toBn(totalRevenue)}`} color="text-amber-400" bg="bg-amber-500/10" />
      </div>

      {/* Customer Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="মোট কাস্টমার" value={toBn(totalCustomers)} color="text-purple-400" bg="bg-purple-500/10" />
        <StatCard icon={UserPlus} label="নতুন কাস্টমার" value={toBn(newCustomers)} color="text-cyan-400" bg="bg-cyan-500/10" />
        <StatCard icon={RotateCcw} label="রিটার্ন কাস্টমার" value={toBn(returnCustomers)} color="text-pink-400" bg="bg-pink-500/10" />
        <StatCard icon={RotateCcw} label="রিটার্ন %" value={`${toBn(returnPercent)}%`} color="text-orange-400" bg="bg-orange-500/10" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly Revenue */}
        <div className="bg-card border border-border/30 rounded-2xl p-4">
          <h4 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" /> মাসিক আয়
          </h4>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142,76%,36%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142,76%,36%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [`৳${toBn(v)}`, "আয়"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(142,76%,36%)" fill="url(#colorRevenue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Orders */}
        <div className="bg-card border border-border/30 rounded-2xl p-4">
          <h4 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-400" /> সাপ্তাহিক অর্ডার
          </h4>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number, name: string) => [name === "orders" ? `${toBn(v)} টি` : `৳${toBn(v)}`, name === "orders" ? "অর্ডার" : "আয়"]}
                />
                <Bar dataKey="orders" fill="hsl(217,91%,60%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Order Hours */}
        <div className="bg-card border border-border/30 rounded-2xl p-4">
          <h4 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400" /> কোন সময়ে বেশি অর্ডার
          </h4>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHourData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="hour" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  labelFormatter={(l) => peakHourData.find(d => d.hour === l)?.label || l}
                  formatter={(v: number) => [`${toBn(v)} টি`, "অর্ডার"]}
                />
                <Bar dataKey="orders" fill="hsl(45,93%,47%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Split Pie */}
        <div className="bg-card border border-border/30 rounded-2xl p-4">
          <h4 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-400" /> নতুন vs রিটার্ন কাস্টমার
          </h4>
          <div className="h-52 flex items-center justify-center">
            {totalCustomers > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={customerPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                    {customerPieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => [toBn(v), "জন"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm">এখনো কোনো কাস্টমার নেই</p>
            )}
            <div className="absolute flex flex-col gap-1">
              {customerPieData.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                  <span className="text-muted-foreground">{d.name}: {toBn(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Revenue */}
      <div className="bg-card border border-border/30 rounded-2xl p-4">
        <h4 className="font-bold text-foreground text-sm mb-3">মাসিক আয়</h4>
        <p className="text-3xl font-extrabold text-emerald-400">৳{toBn(monthRevenue)}</p>
        <p className="text-xs text-muted-foreground mt-1">{monthNames[now.getMonth()]} মাসের আয়</p>
      </div>

      {/* Recent Customers */}
      <div className="bg-card border border-border/30 rounded-2xl p-4">
        <h4 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-cyan-400" /> সাম্প্রতিক কাস্টমার
        </h4>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {recentCustomers.map((c, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center text-xs font-bold text-foreground flex-shrink-0">
                {c.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground text-sm truncate">{c.name}</span>
                  {c.isReturn && (
                    <span className="text-[10px] bg-pink-500/15 text-pink-400 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                      রিটার্ন
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{c.phone}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-foreground">৳{toBn(c.amount)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(c.date).toLocaleDateString("bn-BD", { day: "numeric", month: "short" })}
                </p>
              </div>
            </div>
          ))}
          {recentCustomers.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-6">কোনো কাস্টমার নেই</p>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, bg }: {
  icon: any; label: string; value: string; color: string; bg: string;
}) => (
  <div className={`${bg} border border-border/20 rounded-2xl p-3.5 space-y-1`}>
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${color}`} />
      <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
    </div>
    <p className={`text-xl font-extrabold ${color}`}>{value}</p>
  </div>
);

const DashboardSkeleton = () => (
  <div className="space-y-4">
    <div className="h-28 bg-card animate-pulse rounded-2xl" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-card animate-pulse rounded-2xl" />)}
    </div>
  </div>
);

export default ProductDashboardStats;
