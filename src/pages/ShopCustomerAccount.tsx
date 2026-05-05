import { Link, useNavigate } from "react-router-dom";
import { useShopCustomer } from "@/hooks/useShopCustomer";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingBag, LogOut, Phone, Package, ArrowLeft, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const BRAND_GREEN = "#1f7a3a";
const toBn = (n: number | string) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

const statusLabel = (s: string) => {
  const m: Record<string, { t: string; cls: string }> = {
    pending: { t: "অপেক্ষমান", cls: "bg-amber-100 text-amber-800" },
    confirmed: { t: "নিশ্চিত", cls: "bg-blue-100 text-blue-800" },
    shipped: { t: "পাঠানো হয়েছে", cls: "bg-indigo-100 text-indigo-800" },
    delivered: { t: "ডেলিভারড", cls: "bg-green-100 text-green-800" },
    cancelled: { t: "বাতিল", cls: "bg-red-100 text-red-800" },
    returned: { t: "ফেরত", cls: "bg-gray-200 text-gray-800" },
    abandoned: { t: "অসম্পূর্ণ", cls: "bg-gray-100 text-gray-600" },
  };
  return m[s] || { t: s, cls: "bg-gray-100 text-gray-700" };
};

export default function ShopCustomerAccount() {
  const { customer, orders, loading, logout } = useShopCustomer();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !customer) nav("/shop/login", { replace: true });
  }, [loading, customer, nav]);

  if (loading || !customer) {
    return <div className="min-h-screen flex items-center justify-center">লোড হচ্ছে...</div>;
  }

  const totalSpent = orders
    .filter((o) => o.status !== "abandoned" && o.status !== "cancelled")
    .reduce((s, o) => s + Number(o.total_amount || 0), 0);

  return (
    <div className="min-h-screen bg-[#f7f5ee]" style={{ fontFamily: "'Tiro Bangla', serif" }}>
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/products" className="flex items-center gap-2 text-sm text-gray-600">
            <ArrowLeft className="h-4 w-4" /> দোকান
          </Link>
          <div className="font-bold" style={{ color: BRAND_GREEN }}>আমার অ্যাকাউন্ট</div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-red-600 gap-1">
            <LogOut className="h-4 w-4" /> লগআউট
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Profile card */}
        <div className="rounded-2xl p-5 text-white shadow-lg" style={{ background: `linear-gradient(135deg, #155c2c, ${BRAND_GREEN})` }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center font-bold text-xl">
              {(customer.full_name || "C").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="font-bold text-lg">{customer.full_name || "কাস্টমার"}</div>
              <div className="text-white/80 text-sm flex items-center gap-1">
                <Phone className="h-3 w-3" /> {toBn(customer.phone)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white/10 rounded-xl p-3 backdrop-blur">
              <div className="text-xs text-white/80">মোট অর্ডার</div>
              <div className="text-2xl font-bold">{toBn(orders.length)}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-3 backdrop-blur">
              <div className="text-xs text-white/80">মোট খরচ</div>
              <div className="text-2xl font-bold">৳{toBn(totalSpent.toFixed(0))}</div>
            </div>
          </div>
        </div>

        {/* Orders */}
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Package className="h-5 w-5" style={{ color: BRAND_GREEN }} /> আমার অর্ডার সমূহ
          </h2>
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center text-gray-500 border">
              <ShoppingBag className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              আপনার কোনো অর্ডার নেই
              <div className="mt-3">
                <Link to="/products">
                  <Button className="text-white" style={{ backgroundColor: BRAND_GREEN }}>কেনাকাটা শুরু করুন</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => {
                const sl = statusLabel(o.status);
                return (
                  <div key={o.id} className="bg-white rounded-2xl p-4 border shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 truncate">{o.product_name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          অর্ডার #{toBn(o.order_number)} · পরিমাণ: {toBn(o.quantity)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(o.created_at).toLocaleDateString("bn-BD")}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-base" style={{ color: BRAND_GREEN }}>
                          ৳{toBn(Number(o.total_amount).toFixed(0))}
                        </div>
                        <Badge className={`mt-1 ${sl.cls} border-0`}>{sl.t}</Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
