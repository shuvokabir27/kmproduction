import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reads site_settings once at app start and applies the favicon
 * and document.title dynamically.
 */
export default function SiteIdentityApplier() {
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("shop_name, favicon_url")
        .limit(1)
        .maybeSingle();
      if (!data) return;
      if (data.shop_name) document.title = data.shop_name;
      if (data.favicon_url) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.href = data.favicon_url;
      }
    })();
  }, []);
  return null;
}
