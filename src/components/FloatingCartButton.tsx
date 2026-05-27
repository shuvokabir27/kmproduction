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
      className="fixed right-0 top-1/2 -translate-y-1/2 z-40 w-[64px] md:w-[78px] rounded-l-2xl overflow-hidden shadow-lg hover:w-[72px] md:hover:w-[86px] transition-all duration-300 text-white"
    >
      {/* Top: blue with icon + item count */}
      <div className="bg-blue-600 hover:bg-blue-700 flex flex-col items-center justify-center gap-1 py-3">
        <div className="relative">
          <ShoppingBag className="h-6 w-6" />
          {cart.count > 0 && (
            <span className="absolute -top-2 -right-2 bg-white text-blue-600 text-[10px] font-extrabold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center ring-2 ring-blue-600 shadow">
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
      </div>
      {/* Bottom: orange with total price */}
      <div className="bg-orange-500 py-2 flex items-center justify-center">
        <span className="text-[13px] font-extrabold leading-none">
          ৳{toBn(cart.total.toFixed(0))}
        </span>
      </div>
    </button>
  );
}
