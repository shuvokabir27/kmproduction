import { forwardRef, useRef, useCallback } from "react";
import { X, Download } from "lucide-react";
import { toJpeg } from "html-to-image";

interface PaymentReceiptProps {
  receiptData: {
    memberName: string;
    memberId: number;
    amount: number;
    method: string;
    transactionId?: string | null;
    notes?: string | null;
    date: string;
    paidBy?: string;
    totalEarned?: number;
    totalPaid?: number;
    balance?: number;
  };
  onClose: () => void;
}

const methodLabel: Record<string, string> = {
  bank: "ব্যাংক ট্রান্সফার",
  bkash: "বিকাশ",
  nagad: "নগদ",
  cash: "ক্যাশ",
};

const PaymentReceipt = forwardRef<HTMLDivElement, PaymentReceiptProps>(
  ({ receiptData, onClose }, ref) => {
    const receiptRef = useRef<HTMLDivElement>(null);
    const now = new Date();
    const receiptNo = `KMP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

    const handleDownload = useCallback(async () => {
      if (!receiptRef.current) return;
      try {
        const dataUrl = await toJpeg(receiptRef.current, { quality: 0.95, backgroundColor: "#fafaf7" });
        const link = document.createElement("a");
        link.download = `receipt-${receiptNo}.jpg`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error("Download failed", err);
      }
    }, [receiptNo]);

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-sm">
          <div className="absolute -top-3 right-6 z-10 flex gap-2">
            <button
              onClick={handleDownload}
              className="bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg hover:scale-110 transition-transform"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="bg-destructive text-destructive-foreground rounded-full p-1.5 shadow-lg hover:scale-110 transition-transform"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            ref={receiptRef}
            className="bg-[#fafaf7] text-[#1a1a1a] rounded-lg overflow-hidden shadow-2xl"
            style={{
              fontFamily: "'Courier New', Courier, monospace",
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(0,0,0,0.03) 28px, rgba(0,0,0,0.03) 29px)",
            }}
          >
            {/* Top zigzag edge */}
            <div
              className="h-4 w-full"
              style={{
                background:
                  "linear-gradient(135deg, #fafaf7 33.33%, transparent 33.33%) 0 0, linear-gradient(225deg, #fafaf7 33.33%, transparent 33.33%) 0 0",
                backgroundSize: "12px 100%",
                backgroundColor: "transparent",
              }}
            />

            <div className="px-6 pb-6 pt-2">
              {/* Header */}
              <div className="text-center border-b-2 border-dashed border-gray-400 pb-4 mb-4">
                <p className="text-[10px] tracking-[0.3em] text-gray-500 uppercase mb-1">
                  Kuakata Multimedia
                </p>
                <h2 className="text-2xl font-black tracking-wider">
                  *** রিসিট ***
                </h2>
                <div className="flex justify-between text-[10px] text-gray-500 mt-2 px-2">
                  <span>রিসিট #{receiptNo}</span>
                  <span>
                    {now.toLocaleDateString("bn-BD")} -{" "}
                    {now.toLocaleTimeString("bn-BD", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {/* Member Info */}
              <div className="border-b border-dashed border-gray-300 pb-3 mb-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">সদস্যের নাম</span>
                  <span className="font-bold text-right max-w-[60%] truncate">
                    {receiptData.memberName}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">মেম্বার আইডি</span>
                  <span className="font-bold">#{receiptData.memberId}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="border-b border-dashed border-gray-300 pb-3 mb-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">পেমেন্ট মাধ্যম</span>
                  <span className="font-semibold">
                    {methodLabel[receiptData.method] || receiptData.method}
                  </span>
                </div>
                {receiptData.transactionId && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">ট্রানজেকশন আইডি</span>
                    <span className="font-mono font-semibold text-[11px]">
                      {receiptData.transactionId}
                    </span>
                  </div>
                )}
                {receiptData.notes && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">নোট</span>
                    <span className="text-right max-w-[60%] text-[11px]">
                      {receiptData.notes}
                    </span>
                  </div>
                )}
              </div>

              {/* Financial Summary */}
              <div className="border-b border-dashed border-gray-300 pb-3 mb-3 space-y-1.5">
                {receiptData.totalEarned !== undefined && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">মোট আয়</span>
                    <span>৳{receiptData.totalEarned.toLocaleString()}</span>
                  </div>
                )}
                {receiptData.totalPaid !== undefined && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">পূর্ববর্তী প্রদান</span>
                    <span>
                      ৳
                      {(
                        receiptData.totalPaid - receiptData.amount
                      ).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="border-b-2 border-dashed border-gray-400 pb-4 mb-4 space-y-2">
                <div className="flex justify-between text-sm font-black">
                  <span>প্রদানের পরিমাণ</span>
                  <span className="text-lg">
                    ৳{receiptData.amount.toLocaleString()}
                  </span>
                </div>
                {receiptData.balance !== undefined && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">অবশিষ্ট বকেয়া</span>
                    <span
                      className={`font-bold ${receiptData.balance > 0 ? "text-red-600" : "text-green-600"}`}
                    >
                      ৳{receiptData.balance.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="text-center space-y-2">
                <p className="text-xs font-bold tracking-wider">
                  ধন্যবাদ আপনার সেবায়!
                </p>
                <p className="text-[9px] text-gray-400">
                  এটি একটি কম্পিউটার জেনারেটেড রিসিট
                </p>

                {/* Barcode-style decoration */}
                <div className="flex justify-center items-end gap-[1px] pt-2 h-8">
                  {Array.from({ length: 40 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-gray-800"
                      style={{
                        width: Math.random() > 0.5 ? "2px" : "1px",
                        height: `${16 + Math.random() * 14}px`,
                      }}
                    />
                  ))}
                </div>
                <p className="text-[8px] text-gray-400 font-mono tracking-[0.2em]">
                  {receiptNo}
                </p>
              </div>
            </div>

            {/* Bottom zigzag edge */}
            <div
              className="h-4 w-full"
              style={{
                background:
                  "linear-gradient(315deg, #fafaf7 33.33%, transparent 33.33%) 0 0, linear-gradient(45deg, #fafaf7 33.33%, transparent 33.33%) 0 0",
                backgroundSize: "12px 100%",
                backgroundColor: "transparent",
              }}
            />
          </div>
        </div>
      </div>
    );
  }
);

PaymentReceipt.displayName = "PaymentReceipt";

export default PaymentReceipt;
