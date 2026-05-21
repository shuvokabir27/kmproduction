import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";
import { toast } from "sonner";

export type PaymentMethod = "cod" | "bkash" | "nagad" | "rocket";

interface Props {
  settings: any;
  method: PaymentMethod;
  senderNo: string;
  trxId: string;
  onMethodChange: (m: PaymentMethod) => void;
  onSenderNoChange: (v: string) => void;
  onTrxIdChange: (v: string) => void;
}

const META: Record<Exclude<PaymentMethod, "cod">, { label: string; emoji: string; bg: string; ring: string }> = {
  bkash: { label: "বিকাশ", emoji: "📱", bg: "bg-pink-50", ring: "ring-pink-400" },
  nagad: { label: "নগদ", emoji: "📲", bg: "bg-red-50", ring: "ring-red-400" },
  rocket: { label: "রকেট", emoji: "🚀", bg: "bg-purple-50", ring: "ring-purple-400" },
};

export default function PaymentMethodPicker({
  settings, method, senderNo, trxId,
  onMethodChange, onSenderNoChange, onTrxIdChange,
}: Props) {
  const bkashOn = !!settings?.bkash_enabled;
  const nagadOn = !!settings?.nagad_enabled;
  const rocketOn = !!settings?.rocket_enabled;

  const options: { val: PaymentMethod; label: string; emoji: string }[] = [
    { val: "cod", label: "ক্যাশ অন ডেলিভারি", emoji: "💵" },
    ...(bkashOn ? [{ val: "bkash" as const, label: "বিকাশ", emoji: "📱" }] : []),
    ...(nagadOn ? [{ val: "nagad" as const, label: "নগদ", emoji: "📲" }] : []),
    ...(rocketOn ? [{ val: "rocket" as const, label: "রকেট", emoji: "🚀" }] : []),
  ];

  const numbers: Record<string, string | undefined> = {
    bkash: settings?.bkash_payment_no,
    nagad: settings?.nagad_payment_no,
    rocket: settings?.rocket_payment_no,
  };

  const showAcc = method !== "cod";
  const accNo = numbers[method];
  const m = method !== "cod" ? META[method] : null;

  const copy = () => {
    if (!accNo) return;
    navigator.clipboard.writeText(accNo);
    toast.success("নম্বর কপি হয়েছে");
  };

  return (
    <div>
      <Label className="text-gray-800 font-bold text-sm mb-2 block">
        পেমেন্ট পদ্ধতি <span className="text-red-500">*</span>
      </Label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => {
          const active = method === o.val;
          return (
            <button
              key={o.val}
              type="button"
              onClick={() => onMethodChange(o.val)}
              className={`px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                active ? "border-red-600 bg-red-50 text-red-800" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              <span>{o.emoji}</span>
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>

      {showAcc && (
        <div className={`mt-3 rounded-xl border-2 ${m?.bg ?? ""} border-red-200 p-3 space-y-2.5`}>
          {accNo ? (
            <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-red-300">
              <div>
                <p className="text-[11px] text-gray-500 leading-tight">{m?.label} মার্চেন্ট/পার্সোনাল নম্বর</p>
                <p className="text-base font-extrabold tracking-wider text-gray-900">{accNo}</p>
              </div>
              <button type="button" onClick={copy} className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold flex items-center gap-1">
                <Copy className="h-3 w-3" /> কপি
              </button>
            </div>
          ) : (
            <p className="text-xs text-red-600">এই পেমেন্ট নম্বরটি এখনও সেট করা হয়নি</p>
          )}
          <p className="text-[11px] text-gray-700 leading-snug">
            উপরের নম্বরে <span className="font-bold">Send Money</span> করে নিচে আপনার নম্বর ও ট্রানজেকশন আইডি দিন।
          </p>
          <div>
            <Label className="text-[11px] text-gray-700 mb-1 block">আপনার {m?.label} নম্বর</Label>
            <Input
              value={senderNo}
              onChange={(e) => onSenderNoChange(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="01XXXXXXXXX"
              maxLength={11}
              className="h-10 rounded-lg bg-white"
            />
          </div>
          <div>
            <Label className="text-[11px] text-gray-700 mb-1 block">ট্রানজেকশন আইডি (TrxID)</Label>
            <Input
              value={trxId}
              onChange={(e) => onTrxIdChange(e.target.value.trim().toUpperCase())}
              placeholder="যেমন: 8N7A2B5C9D"
              className="h-10 rounded-lg bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
