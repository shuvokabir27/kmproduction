import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  kmBalance?: number;
  clientBalance?: number;
}

type AccountType = "km" | "saddam";

export const BkashBalanceCards = ({ kmBalance = 0, clientBalance = 0 }: Props) => {
  const [open, setOpen] = useState<AccountType | null>(null);

  const accounts: { key: AccountType; label: string; balance: number; source: string }[] = [
    { key: "km", label: "KM", balance: kmBalance, source: "হাজিরা + বোনাস + স্যালারি − পেমেন্ট" },
    { key: "saddam", label: "সাদ্দাম", balance: clientBalance, source: "বাইরের কাজ থেকে আয় − পেমেন্ট" },
  ];

  const current = accounts.find((a) => a.key === open);

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-2 justify-center">
        {accounts.map((acc) => (
          <button
            key={acc.key}
            onClick={() => setOpen(acc.key)}
            className="group inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white border-2 border-pink-300 shadow-[0_2px_10px_-2px_rgba(236,33,114,0.35)] hover:shadow-[0_4px_14px_-2px_rgba(236,33,114,0.5)] active:scale-[0.97] transition-all"
          >
            <span
              className="h-7 w-7 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-inner"
              style={{ background: "linear-gradient(135deg, #e2136e, #b90d5c)" }}
            >
              ৳
            </span>
            <span className="text-[13px] font-semibold text-pink-700 whitespace-nowrap">
              {acc.label} ব্যালেন্স দেখুন
            </span>
          </button>
        ))}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span
                className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold shadow"
                style={{ background: "linear-gradient(135deg, #e2136e, #b90d5c)" }}
              >
                ৳
              </span>
              {current?.label} - বকেয়া ব্যালেন্স
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              বকেয়া ব্যালেন্স
            </p>
            <p className="text-4xl font-extrabold text-pink-600">
              ৳{Number(current?.balance || 0).toLocaleString("bn-BD")}
            </p>
            <p className="text-[10px] text-muted-foreground mt-3">{current?.source}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
