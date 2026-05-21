import { Link } from "react-router-dom";
import { Home, ShoppingBag, ShoppingCart, MessageCircle } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const BRAND_GREEN = "#dc2626";
const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

export default function MobileShopNav() {
  const cart = useCart();
  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-mobilenav"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("whatsapp_no, contact_phone").single();
      return data;
    },
  });
  const whatsappNo = siteSettings?.whatsapp_no || siteSettings?.contact_phone || "";

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-[0_-2px_10px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)", fontFamily: "'Tiro Bangla', serif" }}
    >
      <div className="grid grid-cols-4 text-[11px] font-semibold text-gray-700">
        <Link to="/products" className="flex flex-col items-center justify-center py-2 gap-0.5 active:bg-gray-50">
          <Home className="h-5 w-5" style={{ color: BRAND_GREEN }} />
          <span>হোম</span>
        </Link>
        <Link to="/products#shop" className="flex flex-col items-center justify-center py-2 gap-0.5 active:bg-gray-50">
          <ShoppingBag className="h-5 w-5" style={{ color: BRAND_GREEN }} />
          <span>শপ</span>
        </Link>
        <button onClick={cart.open} className="relative flex flex-col items-center justify-center py-2 gap-0.5 active:bg-gray-50">
          <div className="relative">
            <ShoppingCart className="h-5 w-5" style={{ color: BRAND_GREEN }} />
            {cart.count > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center">
                {toBn(cart.count)}
              </span>
            )}
          </div>
          <span>কার্ট</span>
        </button>
        {whatsappNo ? (
          <a
            href={`https://wa.me/${whatsappNo.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center py-2 gap-0.5 active:bg-gray-50"
          >
            <MessageCircle className="h-5 w-5 text-red-600" />
            <span>WhatsApp</span>
          </a>
        ) : (
          <span className="flex flex-col items-center justify-center py-2 gap-0.5 text-gray-400">
            <MessageCircle className="h-5 w-5" />
            <span>WhatsApp</span>
          </span>
        )}
      </div>
    </nav>
  );
}
