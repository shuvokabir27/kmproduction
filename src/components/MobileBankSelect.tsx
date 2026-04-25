import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const MOBILE_BANKS: { name: string; short: string; bg: string; text: string }[] = [
  { name: "বিকাশ (Bkash)", short: "bKash", bg: "#E2136E", text: "#fff" },
  { name: "নগদ (Nagad)", short: "Nagad", bg: "#EE3124", text: "#fff" },
  { name: "রকেট (Rocket)", short: "Rocket", bg: "#8E2DE2", text: "#fff" },
  { name: "উপায় (Upay)", short: "Upay", bg: "#00A651", text: "#fff" },
  { name: "ট্যাপ (Tap)", short: "Tap", bg: "#1B4F72", text: "#fff" },
  { name: "ট্যালিক্যাশ (TeleCash)", short: "TC", bg: "#0072BC", text: "#fff" },
  { name: "মাইক্যাশ (MyCash)", short: "MyCash", bg: "#117864", text: "#fff" },
  { name: "শিউরক্যাশ (SureCash)", short: "Sure", bg: "#922B21", text: "#fff" },
  { name: "ইসলামিক ওয়ালেট (Islamic Wallet)", short: "iW", bg: "#006838", text: "#fff" },
  { name: "ট্যাপ‘এন পে (TapNPay)", short: "TNP", bg: "#7D3C98", text: "#fff" },
];

interface MobileBankSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export const MobileBankSelect = ({ value, onChange, className, placeholder = "মোবাইল ব্যাংকিং নির্বাচন করুন" }: MobileBankSelectProps) => {
  const selected = MOBILE_BANKS.find((b) => b.name === value);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <div className="flex items-center gap-2 min-w-0">
          {selected && (
            <span
              className="inline-flex items-center justify-center h-5 px-1.5 rounded text-[9px] font-bold shrink-0"
              style={{ backgroundColor: selected.bg, color: selected.text }}
            >
              {selected.short}
            </span>
          )}
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {MOBILE_BANKS.map((bank) => (
          <SelectItem key={bank.name} value={bank.name}>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center h-5 px-1.5 rounded text-[9px] font-bold shrink-0"
                style={{ backgroundColor: bank.bg, color: bank.text }}
              >
                {bank.short}
              </span>
              <span className="truncate">{bank.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
