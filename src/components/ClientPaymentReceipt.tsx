import { forwardRef, useRef, useCallback } from "react";
import { X, Download } from "lucide-react";
import { toJpeg } from "html-to-image";
import { format } from "date-fns";
import { bn } from "date-fns/locale";

interface ClientPaymentReceiptProps {
  receiptData: {
    clientName: string;
    company?: string;
    amount: number;
    paymentType: "artist" | "expense";
    details: any;
    date: string;
  };
  onClose: () => void;
}

const ClientPaymentReceipt = forwardRef<HTMLDivElement, ClientPaymentReceiptProps>(
  ({ receiptData, onClose }, ref) => {
    const receiptRef = useRef<HTMLDivElement>(null);
    const now = new Date();
    const receiptNo = `KMP-C-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

    const handleDownload = useCallback(async () => {
      if (!receiptRef.current) return;
      try {
        const dataUrl = await toJpeg(receiptRef.current, { quality: 0.95, backgroundColor: "#fafaf7" });
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `receipt-${receiptNo}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } catch (err) {
        console.error("Download failed", err);
      }
    }, [receiptNo]);

    const details = receiptData.details || {};
    const typeLabel = receiptData.paymentType === "artist" ? "আর্টিস্ট পেমেন্ট" : "শুটিং খরচ পেমেন্ট";

    // Build detail lines
    const detailLines: { label: string; value: string }[] = [];
    if (details.artist_name) {
      detailLines.push({ label: "আর্টিস্ট", value: details.artist_name });
    }
    if (details.expense_count) {
      detailLines.push({ label: "আইটেম সংখ্যা", value: `${details.expense_count} টি` });
    }
    if (details.updates && Array.isArray(details.updates)) {
      detailLines.push({ label: "আইটেম সংখ্যা", value: `${details.updates.length} টি` });
    }
    if (details.expense_ids && Array.isArray(details.expense_ids)) {
      detailLines.push({ label: "আইটেম সংখ্যা", value: `${details.expense_ids.length} টি` });
    }

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
                    {format(new Date(receiptData.date), "d MMM yyyy", { locale: bn })}
                  </span>
                </div>
              </div>

              {/* Client Info */}
              <div className="border-b border-dashed border-gray-300 pb-3 mb-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">প্রজেক্ট ডিরেক্টর</span>
                  <span className="font-bold text-right max-w-[60%] truncate">
                    {receiptData.clientName}
                  </span>
                </div>
                {receiptData.company && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">প্রতিষ্ঠান</span>
                    <span className="font-bold text-right max-w-[60%] truncate">
                      {receiptData.company}
                    </span>
                  </div>
                )}
              </div>

              {/* Payment Details */}
              <div className="border-b border-dashed border-gray-300 pb-3 mb-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">পেমেন্ট ধরন</span>
                  <span className="font-semibold">{typeLabel}</span>
                </div>
                {detailLines.map((line, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-600">{line.label}</span>
                    <span className="font-semibold text-right max-w-[60%]">{line.value}</span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-b-2 border-dashed border-gray-400 pb-4 mb-4 space-y-2">
                <div className="flex justify-between text-sm font-black">
                  <span>পেমেন্টের পরিমাণ</span>
                  <span className="text-lg">
                    ৳{receiptData.amount.toLocaleString("bn-BD")}
                  </span>
                </div>
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

ClientPaymentReceipt.displayName = "ClientPaymentReceipt";

export default ClientPaymentReceipt;
