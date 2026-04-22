import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Wallet, Save } from "lucide-react";

interface BkashRow {
  id: string;
  account_name: string;
  account_label: string;
  balance: number;
}

export const AdminBkashBalanceEditor = () => {
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const { data: balances } = useQuery({
    queryKey: ["bkash-balances-admin"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("bkash_balances")
        .select("*")
        .order("account_name", { ascending: true });
      return (data as BkashRow[]) ?? [];
    },
  });

  useEffect(() => {
    if (balances) {
      const init: Record<string, string> = {};
      balances.forEach((b) => (init[b.id] = String(b.balance)));
      setEdits(init);
    }
  }, [balances]);

  const save = async (row: BkashRow) => {
    setSaving(row.id);
    const amount = Number(edits[row.id] || 0);
    if (Number.isNaN(amount)) {
      toast.error("সঠিক অংক লিখুন");
      setSaving(null);
      return;
    }
    const { error } = await (supabase as any)
      .from("bkash_balances")
      .update({ balance: amount, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    setSaving(null);
    if (error) {
      toast.error("সেভ করা যায়নি");
    } else {
      toast.success(`${row.account_label} এর ব্যালেন্স আপডেট হয়েছে`);
      qc.invalidateQueries({ queryKey: ["bkash-balances"] });
      qc.invalidateQueries({ queryKey: ["bkash-balances-admin"] });
    }
  };

  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-9 w-9 rounded-lg bg-pink-500/10 flex items-center justify-center">
          <Wallet className="h-4 w-4 text-pink-500" />
        </div>
        <div>
          <h3 className="font-semibold">bKash অ্যাকাউন্ট ব্যালেন্স</h3>
          <p className="text-xs text-muted-foreground">মেম্বার ড্যাশবোর্ডে দেখানো হবে</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {balances?.map((row) => (
          <div key={row.id} className="rounded-lg border border-border/50 p-3 bg-card/40">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {row.account_label}
            </Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                type="number"
                inputMode="decimal"
                value={edits[row.id] ?? ""}
                onChange={(e) => setEdits((p) => ({ ...p, [row.id]: e.target.value }))}
                placeholder="0"
              />
              <Button
                size="sm"
                onClick={() => save(row)}
                disabled={saving === row.id}
              >
                <Save className="h-4 w-4 mr-1" />
                সেভ
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
