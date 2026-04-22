import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface BkashRow {
  id: string;
  account_name: string;
  account_label: string;
  balance: number;
  updated_at: string;
}

export const BkashBalanceCards = () => {
  const [openAccount, setOpenAccount] = useState<BkashRow | null>(null);

  const { data: balances } = useQuery({
    queryKey: ["bkash-balances"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("bkash_balances")
        .select("*")
        .order("account_name", { ascending: true });
      return (data as BkashRow[]) ?? [];
    },
    refetchInterval: 30000,
  });

  if (!balances || balances.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-2 justify-center">
        {balances.map((b) => (
          <button
            key={b.id}
            onClick={() => setOpenAccount(b)}
            className="group inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white border-2 border-pink-300 shadow-[0_2px_10px_-2px_rgba(236,33,114,0.35)] hover:shadow-[0_4px_14px_-2px_rgba(236,33,114,0.5)] active:scale-[0.97] transition-all"
          >
            <span
              className="h-7 w-7 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-inner"
              style={{ background: "linear-gradient(135deg, #e2136e, #b90d5c)" }}
            >
              ৳
            </span>
            <span className="text-[13px] font-semibold text-pink-700 whitespace-nowrap">
              {b.account_label} ব্যালেন্স দেখুন
            </span>
          </button>
        ))}
      </div>

      <Dialog open={!!openAccount} onOpenChange={(o) => !o && setOpenAccount(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span
                className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold shadow"
                style={{ background: "linear-gradient(135deg, #e2136e, #b90d5c)" }}
              >
                ৳
              </span>
              {openAccount?.account_label} - bKash ব্যালেন্স
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              বর্তমান ব্যালেন্স
            </p>
            <p className="text-4xl font-extrabold text-pink-600">
              ৳{Number(openAccount?.balance || 0).toLocaleString("bn-BD")}
            </p>
            {openAccount?.updated_at && (
              <p className="text-[10px] text-muted-foreground mt-3">
                সর্বশেষ আপডেট: {new Date(openAccount.updated_at).toLocaleString("bn-BD")}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
