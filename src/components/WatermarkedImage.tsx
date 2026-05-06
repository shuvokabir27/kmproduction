import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cachedShopName: string | null = null;
let shopNamePromise: Promise<string> | null = null;

async function getShopName(): Promise<string> {
  if (cachedShopName) return cachedShopName;
  if (shopNamePromise) return shopNamePromise;
  shopNamePromise = (async () => {
    const { data } = await supabase.from("site_settings").select("shop_name").maybeSingle();
    cachedShopName = (data as any)?.shop_name || "KM Shop";
    return cachedShopName;
  })();
  return shopNamePromise;
}

interface Props {
  src: string;
  alt?: string;
  className?: string;
  loading?: "lazy" | "eager";
  /** Watermark intensity. Default true = baked into image bytes via canvas. */
  bake?: boolean;
}

/**
 * Image with shop-name watermark. When `bake` is true (default) the watermark is
 * drawn into a canvas and exported as a data URL so any download/save-as keeps
 * the trademark. Falls back to original src if the image is cross-origin and
 * cannot be tainted-exported.
 */
export function WatermarkedImage({ src, alt = "", className, loading = "lazy", bake = true }: Props) {
  const [finalSrc, setFinalSrc] = useState<string>(src);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!bake || !src) { setFinalSrc(src); return; }
    let cancelled = false;

    (async () => {
      const shopName = await getShopName();
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (cancelled) return;
        try {
          const canvas = document.createElement("canvas");
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) { setFinalSrc(src); return; }
          ctx.drawImage(img, 0, 0, w, h);

          // Repeating diagonal watermark
          const fontSize = Math.max(18, Math.round(Math.min(w, h) * 0.045));
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.fillStyle = "rgba(255,255,255,0.32)";
          ctx.strokeStyle = "rgba(0,0,0,0.22)";
          ctx.lineWidth = Math.max(1, fontSize * 0.06);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const text = `© ${shopName}`;
          const textW = ctx.measureText(text).width;
          const stepX = textW + fontSize * 3;
          const stepY = fontSize * 5;

          ctx.save();
          ctx.translate(w / 2, h / 2);
          ctx.rotate(-Math.PI / 6);
          const diag = Math.sqrt(w * w + h * h);
          for (let y = -diag; y < diag; y += stepY) {
            for (let x = -diag; x < diag; x += stepX) {
              ctx.strokeText(text, x, y);
              ctx.fillText(text, x, y);
            }
          }
          ctx.restore();

          // Bottom-right solid badge
          const badgeFont = Math.max(14, Math.round(Math.min(w, h) * 0.035));
          ctx.font = `bold ${badgeFont}px sans-serif`;
          ctx.textAlign = "right";
          ctx.textBaseline = "bottom";
          const pad = badgeFont * 0.6;
          const badgeText = `© ${shopName}`;
          const bw = ctx.measureText(badgeText).width + pad * 2;
          const bh = badgeFont + pad;
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(w - bw - pad / 2, h - bh - pad / 2, bw, bh);
          ctx.fillStyle = "#ffffff";
          ctx.fillText(badgeText, w - pad, h - pad);

          const url = canvas.toDataURL("image/jpeg", 0.9);
          if (!cancelled && mounted.current) setFinalSrc(url);
        } catch {
          // Tainted canvas (CORS) — fallback to original
          if (!cancelled && mounted.current) setFinalSrc(src);
        }
      };
      img.onerror = () => { if (!cancelled && mounted.current) setFinalSrc(src); };
      img.src = src;
    })();

    return () => { cancelled = true; };
  }, [src, bake]);

  return (
    <img
      src={finalSrc}
      alt={alt}
      className={className}
      loading={loading}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{ WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}
    />
  );
}

export default WatermarkedImage;
