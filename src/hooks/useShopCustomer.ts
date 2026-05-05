import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ShopCustomer = { id: string; phone: string; full_name: string | null; address?: string | null };
const TOKEN_KEY = "km_shop_customer_token";

export function useShopCustomer() {
  const [customer, setCustomer] = useState<ShopCustomer | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setCustomer(null); setOrders([]); setLoading(false); return; }
    const { data, error } = await supabase.functions.invoke("shop-customer-auth", {
      body: { action: "verify", token },
    });
    if (error || (data as any)?.error) {
      localStorage.removeItem(TOKEN_KEY);
      setCustomer(null); setOrders([]);
    } else {
      setCustomer((data as any).customer);
      setOrders((data as any).orders || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const logout = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setCustomer(null); setOrders([]);
    if (token) {
      await supabase.functions.invoke("shop-customer-auth", { body: { action: "logout", token } });
    }
  }, []);

  return { customer, orders, loading, refresh, logout };
}

export const SHOP_TOKEN_KEY = TOKEN_KEY;
