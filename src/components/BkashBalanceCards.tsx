import { useState } from "react";

interface Props {
  kmBalance?: number;
  clientBalance?: number;
}

type AccountType = "km" | "saddam";

export const BkashBalanceCards = ({ kmBalance = 0, clientBalance = 0 }: Props) => {
  const [opened, setOpened] = useState<Record<AccountType, boolean>>({
    km: false,
    saddam: false,
  });

  const accounts: { key: AccountType; label: string; balance: number }[] = [
    { key: "km", label: "KM", balance: kmBalance },
    { key: "saddam", label: "সাদ্দাম", balance: clientBalance },
  ];

  const toggle = (key: AccountType) =>
    setOpened((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className="flex flex-wrap gap-2 mt-2 justify-center">
      {accounts.map((acc) => {
        const isOpen = opened[acc.key];
        return (
          <button
            key={acc.key}
            onClick={() => toggle(acc.key)}
            className="group relative inline-flex items-center gap-2 pl-1 pr-2 py-1 rounded-full overflow-hidden border border-pink-200/70 active:scale-[0.97] transition-all duration-300"
            style={{
              background:
                "linear-gradient(135deg, #ffffff 0%, #fff0f6 45%, #ffe1ee 100%)",
              boxShadow:
                "0 6px 18px -6px rgba(226,19,110,0.45), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -2px 6px rgba(226,19,110,0.08)",
            }}
          >
            {/* glossy highlight */}
            <span
              className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full opacity-70"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 100%)",
              }}
            />
            {/* shimmer sweep */}
            <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out">
              <span
                className="block h-full w-1/3 skew-x-12"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
                }}
              />
            </span>

            <span
              className="relative h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{
                background:
                  "radial-gradient(circle at 30% 25%, #ff5ea0 0%, #e2136e 45%, #a30b51 100%)",
                boxShadow:
                  "inset 0 2px 3px rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.25), 0 2px 6px rgba(226,19,110,0.5)",
              }}
            >
              ৳
            </span>

            <span className="relative text-[13px] font-bold whitespace-nowrap bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(180deg, #b80a59 0%, #e2136e 100%)" }}>
              {isOpen
                ? `${acc.label}: ৳${Number(acc.balance || 0).toLocaleString("bn-BD")}`
                : `${acc.label} ব্যালেন্স দেখুন`}
            </span>

            {/* sliding reveal indicator */}
            <span
              className={`relative ml-1 inline-block h-2 w-2 rounded-full transition-all duration-500 ${
                isOpen ? "bg-pink-600 scale-110 shadow-[0_0_8px_rgba(226,19,110,0.8)]" : "bg-pink-300"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};
