import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, Search, Download, Phone, MapPin, ShoppingCart, TrendingUp,
} from "lucide-react";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

const CustomerCRM = () => {
  const [search, setSearch] = useState("");

  const { data: orders } = useQuery({
    queryKey: ["crm-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Aggregate customers from orders
  const customerMap = new Map<string, {
    name: string;
    phone: string;
    address: string;
    totalOrders: number;
    totalSpent: number;
    lastOrder: string;
    statuses: string[];
  }>();

  orders?.filter(o => o.status !== "abandoned").forEach(o => {
    const existing = customerMap.get(o.customer_phone);
    if (existing) {
      existing.totalOrders++;
      existing.totalSpent += o.total_amount || 0;
      if (new Date(o.created_at) > new Date(existing.lastOrder)) {
        existing.lastOrder = o.created_at;
        existing.address = o.customer_address || existing.address;
      }
      if (!existing.statuses.includes(o.status)) existing.statuses.push(o.status);
    } else {
      customerMap.set(o.customer_phone, {
        name: o.customer_name,
        phone: o.customer_phone,
        address: o.customer_address || "",
        totalOrders: 1,
        totalSpent: o.total_amount || 0,
        lastOrder: o.created_at,
        statuses: [o.status],
      });
    }
  });

  const customers = [...customerMap.values()].sort((a, b) =>
    new Date(b.lastOrder).getTime() - new Date(a.lastOrder).getTime()
  );

  const filtered = search
    ? customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search)
      )
    : customers;

  const exportCSV = () => {
    const headers = ["নাম", "ফোন", "ঠিকানা", "মোট অর্ডার", "মোট খরচ", "শেষ অর্ডার"];
    const rows = customers.map(c => [
      c.name,
      c.phone,
      c.address,
      String(c.totalOrders),
      String(c.totalSpent),
      new Date(c.lastOrder).toLocaleDateString("bn-BD"),
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">কাস্টমার তালিকা</h2>
            <p className="text-xs text-muted-foreground">মোট {toBn(customers.length)} জন কাস্টমার</p>
          </div>
        </div>
        <Button onClick={exportCSV} variant="outline" size="sm" className="gap-1.5">
          <Download className="h-4 w-4" /> CSV ডাউনলোড
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{toBn(customers.length)}</p>
          <p className="text-xs text-muted-foreground">মোট কাস্টমার</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-500">
            {toBn(customers.filter(c => c.totalOrders > 1).length)}
          </p>
          <p className="text-xs text-muted-foreground">রিটার্ন কাস্টমার</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">
            ৳{toBn(customers.reduce((s, c) => s + c.totalSpent, 0))}
          </p>
          <p className="text-xs text-muted-foreground">মোট বিক্রয়</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="নাম বা ফোন দিয়ে খুঁজুন..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Customer List */}
      {!filtered.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>কোনো কাস্টমার পাওয়া যায়নি</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c, i) => (
            <div key={c.phone} className="bg-card border border-border/50 rounded-xl p-4 hover:border-primary/20 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center text-sm font-bold text-foreground flex-shrink-0">
                    {c.name?.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">{c.name}</span>
                      {c.totalOrders > 1 && (
                        <span className="text-[10px] bg-pink-500/15 text-pink-500 px-1.5 py-0.5 rounded-full font-medium">
                          রিটার্ন ×{toBn(c.totalOrders)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</span>
                      {c.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.address.slice(0, 30)}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-primary">৳{toBn(c.totalSpent)}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                    <ShoppingCart className="h-3 w-3" /> {toBn(c.totalOrders)} অর্ডার
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerCRM;
