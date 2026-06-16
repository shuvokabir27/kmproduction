import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingCart, MessageCircle, Soup, Fish } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

export default function MobileShopNav() {
  const cart = useCart();
  const location = useLocation();
  const hash = location.hash;
  const path = location.pathname;

  // Only show on shop-related public routes
  const isShopRoute =
    path === "/" ||
    path === "/" ||
    path.startsWith("/product/") ||
    path.startsWith("/category/") ||
    path.startsWith("/categories") ||
    path.startsWith("/shop") ||
    path.startsWith("/offer") ||
    path.startsWith("/free-delivery") ||
    path.startsWith("/order");
  if (!isShopRoute) return null;

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-mobilenav"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("whatsapp_no, contact_phone").single();
      return data;
    },
  });
  const whatsappNo = siteSettings?.whatsapp_no || siteSettings?.contact_phone || "";

  const isHome = path === "/" && !hash;
  const isAchar = path === "/category/achar";
  const isShutki = path === "/category/shutki";

  const itemBase = "flex flex-col items-center justify-center py-2 gap-0.5 transition-colors text-blue-600";
  const activeText = "text-blue-700 font-semibold";
  const inactiveText = "text-blue-600";

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200"
      style={{ paddingBottom: "env(safe-area-inset-bottom)", fontFamily: "'Tiro Bangla', serif" }}
    >
      <div className="grid grid-cols-5 text-[11px] font-medium">
        <Link to="/" className={cn(itemBase, isHome ? activeText : inactiveText)}>
          <Home className="h-5 w-5" />
          <span>হোম</span>
        </Link>
        <Link to="/category/shutki" className={cn(itemBase, isShutki ? activeText : inactiveText)}>
          <Fish className="h-5 w-5" />
          <span>শুটকী</span>
        </Link>
        <Link to="/category/achar" className={cn(itemBase, isAchar ? activeText : inactiveText)}>
          <Soup className="h-5 w-5" />
          <span>আচার</span>
        </Link>
        <button
          onClick={cart.open}
          data-no-magenta
          style={{ background: "transparent" }}
          className={cn(itemBase, "relative bg-transparent", inactiveText)}
        >
          <div className="relative overflow-visible">
            <ShoppingCart className="h-5 w-5" />
            {cart.count > 0 && (
              <span className="absolute -top-2 -right-2.5 z-20 bg-blue-600 text-white text-[10px] leading-none font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center ring-2 ring-white">
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
            className={cn(itemBase, inactiveText)}
          >
            <MessageCircle className="h-5 w-5" />
            <span>WhatsApp</span>
          </a>
        ) : (
          <span className={cn(itemBase, "text-slate-300")}>
            <MessageCircle className="h-5 w-5" />
            <span>WhatsApp</span>
          </span>
        )}
      </div>
    </nav>
  );
}
