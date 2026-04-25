import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ibblLogo from "@/assets/bank-logos/ibbl.png";
import dbblLogo from "@/assets/bank-logos/dbbl.png";
import cityLogo from "@/assets/bank-logos/city.png";

export const BANGLADESHI_BANKS: { name: string; short: string; bg: string; text: string; logo?: string | null }[] = [
  // State-owned commercial banks
  { name: "Sonali Bank", short: "SB", bg: "#F7941D", text: "#fff" },
  { name: "Janata Bank", short: "JB", bg: "#003366", text: "#fff" },
  { name: "Agrani Bank", short: "AB", bg: "#8B0000", text: "#fff" },
  { name: "Rupali Bank", short: "RB", bg: "#1E5631", text: "#fff" },
  { name: "BASIC Bank", short: "BASIC", bg: "#00529B", text: "#fff" },
  { name: "Bangladesh Development Bank (BDBL)", short: "BDBL", bg: "#0B6E4F", text: "#fff" },
  // Specialized banks
  { name: "Bangladesh Krishi Bank", short: "BKB", bg: "#0E6E2C", text: "#fff" },
  { name: "Rajshahi Krishi Unnayan Bank (RAKUB)", short: "RAKUB", bg: "#0E6E2C", text: "#fff" },
  { name: "Probashi Kallyan Bank", short: "PKB", bg: "#1B4F72", text: "#fff" },
  { name: "Ansar VDP Unnayan Bank", short: "AVUB", bg: "#7D3C98", text: "#fff" },
  { name: "Karmasangsthan Bank", short: "KB", bg: "#117864", text: "#fff" },
  // Private commercial banks (conventional)
  { name: "AB Bank", short: "AB", bg: "#003F87", text: "#fff" },
  { name: "BRAC Bank", short: "BRAC", bg: "#E31E25", text: "#fff" },
  { name: "Bank Asia", short: "BA", bg: "#003D7A", text: "#fff" },
  { name: "City Bank", short: "CITY", bg: "#004B87", text: "#fff", logo: cityLogo },
  { name: "Dhaka Bank", short: "DB", bg: "#7B1E22", text: "#fff" },
  { name: "Dutch-Bangla Bank", short: "DBBL", bg: "#00A651", text: "#fff", logo: dbblLogo },
  { name: "Eastern Bank (EBL)", short: "EBL", bg: "#0072BC", text: "#fff" },
  { name: "IFIC Bank", short: "IFIC", bg: "#1B3A6B", text: "#fff" },
  { name: "Jamuna Bank", short: "JBL", bg: "#0F5132", text: "#fff" },
  { name: "Meghna Bank", short: "MB", bg: "#922B21", text: "#fff" },
  { name: "Mercantile Bank", short: "MBL", bg: "#1F618D", text: "#fff" },
  { name: "Midland Bank", short: "MDB", bg: "#922B21", text: "#fff" },
  { name: "Modhumoti Bank", short: "MMBL", bg: "#0E6655", text: "#fff" },
  { name: "Mutual Trust Bank (MTB)", short: "MTB", bg: "#943126", text: "#fff" },
  { name: "National Bank", short: "NBL", bg: "#1B4F72", text: "#fff" },
  { name: "National Credit & Commerce Bank (NCC)", short: "NCC", bg: "#0E6251", text: "#fff" },
  { name: "NRB Bank", short: "NRBB", bg: "#1F618D", text: "#fff" },
  { name: "NRB Commercial Bank", short: "NRBC", bg: "#0B5345", text: "#fff" },
  { name: "One Bank", short: "ONE", bg: "#7B241C", text: "#fff" },
  { name: "Padma Bank", short: "PADMA", bg: "#1A5276", text: "#fff" },
  { name: "Premier Bank", short: "PRM", bg: "#7D3C98", text: "#fff" },
  { name: "Prime Bank", short: "PB", bg: "#1B3A6B", text: "#fff" },
  { name: "Pubali Bank", short: "PBL", bg: "#2E8B57", text: "#fff" },
  { name: "Shimanto Bank", short: "SHB", bg: "#0E6251", text: "#fff" },
  { name: "South Bangla Agriculture & Commerce Bank (SBAC)", short: "SBAC", bg: "#117A65", text: "#fff" },
  { name: "Southeast Bank", short: "SEBL", bg: "#0B5394", text: "#fff" },
  { name: "Standard Bank", short: "STD", bg: "#1B4F72", text: "#fff" },
  { name: "Trust Bank", short: "TBL", bg: "#1E8449", text: "#fff" },
  { name: "United Commercial Bank (UCB)", short: "UCB", bg: "#C0392B", text: "#fff" },
  { name: "Uttara Bank", short: "UB", bg: "#1A5276", text: "#fff" },
  { name: "Bengal Commercial Bank", short: "BCB", bg: "#196F3D", text: "#fff" },
  { name: "Citizens Bank", short: "CTB", bg: "#1F618D", text: "#fff" },
  { name: "Community Bank Bangladesh", short: "CBB", bg: "#1B4F72", text: "#fff" },
  // Islamic banks
  { name: "Islami Bank Bangladesh (IBBL)", short: "IBBL", bg: "#006838", text: "#fff", logo: ibblLogo },
  { name: "Al-Arafah Islami Bank", short: "AIBL", bg: "#0E6E2C", text: "#fff" },
  { name: "Social Islami Bank (SIBL)", short: "SIBL", bg: "#0B5345", text: "#fff" },
  { name: "EXIM Bank", short: "EXIM", bg: "#196F3D", text: "#fff" },
  { name: "First Security Islami Bank", short: "FSIBL", bg: "#1E8449", text: "#fff" },
  { name: "Shahjalal Islami Bank", short: "SJIBL", bg: "#117A65", text: "#fff" },
  { name: "Union Bank", short: "UNB", bg: "#0E6251", text: "#fff" },
  { name: "Standard Chartered Saadiq", short: "SCSAADIQ", bg: "#0072BC", text: "#fff" },
  { name: "ICB Islamic Bank", short: "ICBIB", bg: "#1B4F72", text: "#fff" },
  { name: "Global Islami Bank", short: "GIB", bg: "#117864", text: "#fff" },
  // Foreign commercial banks
  { name: "Standard Chartered Bank", short: "SCB", bg: "#0072BC", text: "#fff" },
  { name: "HSBC Bangladesh", short: "HSBC", bg: "#DB0011", text: "#fff" },
  { name: "Citibank N.A.", short: "CITI", bg: "#003B70", text: "#fff" },
  { name: "Commercial Bank of Ceylon", short: "CBC", bg: "#1B4F72", text: "#fff" },
  { name: "State Bank of India", short: "SBI", bg: "#22409A", text: "#fff" },
  { name: "Habib Bank", short: "HBL", bg: "#0B6E4F", text: "#fff" },
  { name: "National Bank of Pakistan", short: "NBP", bg: "#0E6E2C", text: "#fff" },
  { name: "Woori Bank", short: "WOORI", bg: "#0072BC", text: "#fff" },
  { name: "Bank Al-Falah", short: "BAF", bg: "#00529B", text: "#fff" },
  // Digital/Other
  { name: "Bkash Digital Bank", short: "BKASH", bg: "#E2136E", text: "#fff" },
  { name: "Nagad Digital Bank", short: "NAGAD", bg: "#EE3124", text: "#fff" },
];

interface BankSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export const BankSelect = ({ value, onChange, className, placeholder = "ব্যাংক নির্বাচন করুন" }: BankSelectProps) => {
  const selected = BANGLADESHI_BANKS.find((b) => b.name === value);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <div className="flex items-center gap-2 min-w-0">
          {selected && (
            selected.logo ? (
              <div className="h-5 w-7 rounded bg-white flex items-center justify-center shrink-0 p-0.5">
                <img src={selected.logo} alt={selected.short} className="h-full w-full object-contain" />
              </div>
            ) : (
              <span
                className="inline-flex items-center justify-center h-5 w-7 rounded text-[9px] font-bold shrink-0"
                style={{ backgroundColor: selected.bg, color: selected.text }}
              >
                {selected.short}
              </span>
            )
          )}
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {BANGLADESHI_BANKS.map((bank) => (
          <SelectItem key={bank.name} value={bank.name}>
            <div className="flex items-center gap-2">
              {bank.logo ? (
                <div className="h-5 w-7 rounded bg-white flex items-center justify-center shrink-0 p-0.5">
                  <img src={bank.logo} alt={bank.short} className="h-full w-full object-contain" />
                </div>
              ) : (
                <span
                  className="inline-flex items-center justify-center h-5 w-7 rounded text-[9px] font-bold shrink-0"
                  style={{ backgroundColor: bank.bg, color: bank.text }}
                >
                  {bank.short}
                </span>
              )}
              <span className="truncate">{bank.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
