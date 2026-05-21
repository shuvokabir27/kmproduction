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
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-[0_-2px_10px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)", fontFamily: "'Tiro Bangla', serif" }}
    >
      <div className="grid grid-cols-4 text-[11px] font-semibold text-foreground/80">
        <Link to="/products" className="flex flex-col items-center justify-center py-2 gap-0.5 active:bg-muted">
          <Home className="h-5 w-5" style={{ color: BRAND_GREEN }} />
          <span>হোম</span>
        </Link>
        <Link to="/products#shop" className="flex flex-col items-center justify-center py-2 gap-0.5 active:bg-muted">
          <ShoppingBag className="h-5 w-5" style={{ color: BRAND_GREEN }} />
          <span>শপ</span>
        </Link>
        <button onClick={cart.open} className="relative flex flex-col items-center justify-center py-2 gap-0.5 active:bg-muted">
          <div className="relative overflow-visible">
            <ShoppingCart className="h-5 w-5" style={{ color: BRAND_GREEN }} />
            {cart.count > 0 && (
              <span className="absolute -top-2.5 -right-3 z-20 bg-red-500 text-white text-[10px] leading-none font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center ring-2 ring-card shadow-lg">
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
            className="flex flex-col items-center justify-center py-2 gap-0.5 active:bg-muted"
          >
            <MessageCircle className="h-5 w-5 text-red-600" />
            <span>WhatsApp</span>
          </a>
        ) : (
          <span className="flex flex-col items-center justify-center py-2 gap-0.5 text-muted-foreground">
            <MessageCircle className="h-5 w-5" />
            <span>WhatsApp</span>
          </span>
        )}
      </div>
    </nav>
  );
}
