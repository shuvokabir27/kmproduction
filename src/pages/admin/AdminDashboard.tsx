import { WPAdminShell, WPCard } from "@/components/admin/WPAdminShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ShoppingCart, Package, Users, TrendingUp, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const toBn = (n: number | string) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

export default function AdminDashboard() {
  const { isOrderManager, isProductAdmin } = useAuth();
  const showOrders = isProductAdmin || isOrderManager;

  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [orders, products, customers] = await Promise.all([
        supabase.from("orders").select("status,total_amount,created_at"),
        supabase.from("products").select("id,is_active"),
        supabase.from("shop_customers").select("id"),
      ]);
      const o = (orders.data || []).filter((x: any) => x.status !== "cancelled" && x.status !== "abandoned");
      const revenue = o.reduce((s: number, x: any) => s + (x.total_amount || 0), 0);
      const pending = (orders.data || []).filter((x: any) => x.status === "pending").length;
      const delivered = (orders.data || []).filter((x: any) => x.status === "delivered").length;
      return {
        totalOrders: (orders.data || []).length,
        pending,
        delivered,
        revenue,
        totalProducts: (products.data || []).length,
        activeProducts: (products.data || []).filter((p: any) => p.is_active).length,
        totalCustomers: (customers.data || []).length,
      };
    },
    enabled: showOrders,
  });

  const cards = [
    { label: "মোট অর্ডার", value: stats?.totalOrders ?? 0, icon: ShoppingCart, to: "/admin/orders" },
    { label: "পেন্ডিং", value: stats?.pending ?? 0, icon: TrendingUp, to: "/admin/orders" },
    { label: "ডেলিভারড", value: stats?.delivered ?? 0, icon: Package, to: "/admin/orders" },
    { label: "মোট আয়", value: `৳${toBn(stats?.revenue ?? 0)}`, icon: TrendingUp, to: "/admin/orders/reports" },
  ];

  return (
    <WPAdminShell title="ড্যাশবোর্ড" subtitle="সংক্ষিপ্ত রিপোর্ট ও দ্রুত নেভিগেশন">
      <div className="space-y-6">
        {showOrders && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map((c) => (
              <Link key={c.label} to={c.to}>
                <WPCard className="p-4 hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-slate-500">{c.label}</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{typeof c.value === "string" ? c.value : toBn(c.value)}</p>
                    </div>
                    <c.icon className="h-5 w-5 text-blue-600" />
                  </div>
                </WPCard>
              </Link>
            ))}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <QuickLinks
            title="অর্ডার ম্যানেজমেন্ট"
            links={[
              { to: "/admin/orders", label: "সকল অর্ডার দেখুন" },
              { to: "/admin/orders/customers", label: "কাস্টমার তালিকা" },
              { to: "/admin/orders/reports", label: "বিক্রির রিপোর্ট" },
              { to: "/admin/orders/delivery", label: "ডেলিভারি সেটিংস" },
            ]}
            show={showOrders}
          />
          <QuickLinks
            title="সাইট কাস্টমাইজেশন"
            links={[
              { to: "/admin/site/products", label: "প্রডাক্ট ম্যানেজ" },
              { to: "/admin/site/home-sections", label: "হোম সেকশন" },
              { to: "/admin/site/offers", label: "অফার" },
              { to: "/admin/site/footer", label: "ফুটার" },
            ]}
            show={isProductAdmin || useAuth().isSiteManager}
          />
        </div>
      </div>
    </WPAdminShell>
  );
}

function QuickLinks({ title, links, show }: { title: string; links: { to: string; label: string }[]; show: boolean }) {
  if (!show) return null;
  return (
    <WPCard className="p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">{title}</h3>
      <ul className="space-y-1">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="flex items-center justify-between text-sm text-slate-700 hover:text-blue-600 hover:bg-slate-50 px-2 py-1.5 rounded">
              <span>{l.label}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </li>
        ))}
      </ul>
    </WPCard>
  );
}
