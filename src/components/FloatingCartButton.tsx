import { ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/useCart";

const toBn = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);

export default function FloatingCartButton() {
  const cart = useCart();

  return (
    <button
      onClick={cart.open}
      aria-label="cart"
      className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 flex-col items-center justify-center gap-1 w-[78px] py-4 rounded-l-2xl text-white shadow-[-6px_8px_24px_-6px_rgba(0,0,0,0.4)] ring-1 ring-white/15 hover:w-[86px] transition-all duration-300 group"
      style={{
        background:
          "linear-gradient(160deg, #f59e0b 0%, #ef4444 55%, #b91c1c 100%)",
      }}
    >
      <div className="relative">
        <ShoppingBag className="h-6 w-6 drop-shadow" />
        {cart.count > 0 && (
          <span className="absolute -top-2 -right-2 bg-white text-red-600 text-[10px] font-extrabold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center ring-2 ring-amber-500 shadow">
            {toBn(cart.count)}
          </span>
        )}
      </div>
      <span
        className="text-[11px] font-bold leading-none mt-1"
        style={{ fontFamily: "'Tiro Bangla', serif" }}
      >
        {toBn(cart.count)} আইটেম
      </span>
      <span className="text-[12px] font-extrabold leading-none">
        ৳{toBn(cart.total.toFixed(0))}
      </span>
    </button>
  );
}
