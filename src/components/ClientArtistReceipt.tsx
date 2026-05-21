import { useRef, useCallback } from "react";
import { X, Download } from "lucide-react";
import { toJpeg } from "html-to-image";

interface ClientArtistReceiptProps {
  receiptData: {
    artistName: string;
    projectName: string;
    clientName: string;
    companyName?: string;
    amount: number;
    totalRemuneration: number;
    totalPaid: number;
    remaining: number;
    date: string;
  };
  onClose: () => void;
}

const ClientArtistReceipt = ({ receiptData, onClose }: ClientArtistReceiptProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const receiptNo = `KMP-ART-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

  const handleDownload = useCallback(async () => {
    if (!receiptRef.current) return;
    try {
      const dataUrl = await toJpeg(receiptRef.current, { quality: 0.95, backgroundColor: "#fafaf7" });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `artist-receipt-${receiptNo}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
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
          {/* Top zigzag */}
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
                {receiptData.companyName || "Kuakata Multimedia"}
              </p>
              <h2 className="text-xl font-black tracking-wider">
                আর্টিস্ট পেমেন্ট রিসিট
              </h2>
              <div className="flex justify-between text-[10px] text-gray-500 mt-2 px-2">
                <span>রিসিট #{receiptNo}</span>
                <span>
                  {now.toLocaleDateString("bn-BD")} -{" "}
                  {now.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>

            {/* Client & Project Info */}
            <div className="border-b border-dashed border-gray-300 pb-3 mb-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">ক্লায়েন্ট</span>
                <span className="font-bold text-right max-w-[60%] truncate">
                  {receiptData.clientName}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">প্রজেক্ট</span>
                <span className="font-bold text-right max-w-[60%] truncate">
                  {receiptData.projectName}
                </span>
              </div>
            </div>

            {/* Artist Info */}
            <div className="border-b border-dashed border-gray-300 pb-3 mb-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">আর্টিস্টের নাম</span>
                <span className="font-bold text-right max-w-[60%] truncate">
                  {receiptData.artistName}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">মোট পারিশ্রমিক</span>
                <span>৳{receiptData.totalRemuneration.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">পূর্ববর্তী প্রদান</span>
                <span>৳{(receiptData.totalPaid - receiptData.amount).toLocaleString()}</span>
              </div>
            </div>

            {/* Payment Amount */}
            <div className="border-b-2 border-dashed border-gray-400 pb-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm font-black">
                <span>এই পেমেন্ট</span>
                <span className="text-lg">৳{receiptData.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">মোট প্রদান</span>
                <span className="font-semibold">৳{receiptData.totalPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">
                  {receiptData.remaining > 0 ? "অবশিষ্ট বকেয়া" : receiptData.remaining < 0 ? "অতিরিক্ত" : "সমন্বয়কৃত"}
                </span>
                <span
                  className={`font-bold ${receiptData.remaining > 0 ? "text-red-600" : receiptData.remaining < 0 ? "text-red-600" : "text-blue-600"}`}
                >
                  ৳{Math.abs(receiptData.remaining).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center space-y-2">
              <p className="text-xs font-bold tracking-wider">ধন্যবাদ!</p>
              <p className="text-[9px] text-gray-400">এটি একটি কম্পিউটার জেনারেটেড রিসিট</p>

              {/* Barcode decoration */}
              <div className="flex justify-center items-end gap-[1px] pt-2 h-8">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-gray-800"
                    style={{
                      width: i % 3 === 0 ? "2px" : "1px",
                      height: `${16 + (i * 7) % 14}px`,
                    }}
                  />
                ))}
              </div>
              <p className="text-[8px] text-gray-400 font-mono tracking-[0.2em]">{receiptNo}</p>
            </div>
          </div>

          {/* Bottom zigzag */}
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
};

export default ClientArtistReceipt;
