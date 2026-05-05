import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "sonner";
import { Search, Trash2, Phone, Calendar, ShoppingBag, Users } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const toBn = (n: number | string) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

export default function ShopCustomersAdmin() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["shop-customers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shop_customers")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: orderCounts = {} } = useQuery({
    queryKey: ["shop-customer-order-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("shop_customer_id, total_amount");
      const map: Record<string, { count: number; total: number }> = {};
      (data || []).forEach((o: any) => {
        if (!o.shop_customer_id) return;
        if (!map[o.shop_customer_id]) map[o.shop_customer_id] = { count: 0, total: 0 };
        map[o.shop_customer_id].count += 1;
        map[o.shop_customer_id].total += Number(o.total_amount || 0);
      });
      return map;
    },
  });

  const filtered = customers.filter((c: any) => {
    const q = search.toLowerCase();
    return !q || (c.phone || "").includes(q) || (c.full_name || "").toLowerCase().includes(q);
  });

  const toggleActive = async (id: string, val: boolean) => {
    const { error } = await supabase.from("shop_customers")
      .update({ is_active: val }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("আপডেট হয়েছে"); qc.invalidateQueries({ queryKey: ["shop-customers"] }); }
  };

  const deleteCustomer = async (id: string) => {
    const { error } = await supabase.from("shop_customers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("মুছে ফেলা হয়েছে"); qc.invalidateQueries({ queryKey: ["shop-customers"] }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> KM Shop ইউজার ({toBn(customers.length)})
          </h2>
          <p className="text-xs text-muted-foreground">মোবাইল + ৬-ডিজিট পাসওয়ার্ড দিয়ে রেজিস্টার করা কাস্টমার</p>
        </div>
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="নাম বা মোবাইল খুঁজুন..."
            className="pl-8 h-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">লোড হচ্ছে...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border rounded-xl bg-card">
          <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">কোনো ইউজার নেই</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c: any) => {
            const stats = orderCounts[c.id] || { count: 0, total: 0 };
            return (
              <div key={c.id} className="bg-card border rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {(c.full_name || "C").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{c.full_name || "নামহীন"}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {toBn(c.phone)}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(c.created_at).toLocaleDateString("bn-BD")}</span>
                      {!c.is_active && <Badge variant="destructive" className="h-4 text-[10px]">নিষ্ক্রিয়</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <ShoppingBag className="h-3 w-3" /> {toBn(stats.count)} অর্ডার
                    </div>
                    <div className="font-bold text-primary">৳{toBn(stats.total.toFixed(0))}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={c.is_active} onCheckedChange={(v) => toggleActive(c.id, v)} />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>ইউজার মুছবেন?</AlertDialogTitle>
                          <AlertDialogDescription>
                            এই ইউজারের অ্যাকাউন্ট মুছে যাবে (অর্ডার থাকবে)। এটি বাতিল করা যাবে না।
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>বাতিল</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteCustomer(c.id)} className="bg-destructive">
                            মুছুন
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
