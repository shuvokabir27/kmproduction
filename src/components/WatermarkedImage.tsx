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
}

/**
 * Displays a clean image to the viewer, but any download / "save image as" /
 * drag captures the watermarked version (baked into pixel data via canvas).
 *
 * How it works:
 *  - Bottom layer: <img> with watermarked data URL (this is the actual DOM
 *    image — what right-click "Save image as" saves).
 *  - Top layer: clean <img> with pointer-events:none so right-clicks pass
 *    through to the watermarked one underneath.
 */
export function WatermarkedImage({ src, alt = "", className, loading = "lazy" }: Props) {
  const [watermarked, setWatermarked] = useState<string>(src);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    setWatermarked(src); // fallback while baking

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
          if (!ctx) return;
          ctx.drawImage(img, 0, 0, w, h);

          const fontSize = Math.max(22, Math.round(Math.min(w, h) * 0.06));
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.strokeStyle = "rgba(0,0,0,0.45)";
          ctx.lineWidth = Math.max(1, fontSize * 0.07);
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const text = `© ${shopName}`;
          const textW = ctx.measureText(text).width;
          const stepX = textW + fontSize * 2.2;
          const stepY = fontSize * 4;

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
          const badgeFont = Math.max(16, Math.round(Math.min(w, h) * 0.04));
          ctx.font = `bold ${badgeFont}px sans-serif`;
          ctx.textAlign = "right";
          ctx.textBaseline = "bottom";
          const pad = badgeFont * 0.6;
          const badgeText = `© ${shopName}`;
          const bw = ctx.measureText(badgeText).width + pad * 2;
          const bh = badgeFont + pad;
          ctx.fillStyle = "rgba(0,0,0,0.7)";
          ctx.fillRect(w - bw - pad / 2, h - bh - pad / 2, bw, bh);
          ctx.fillStyle = "#ffffff";
          ctx.fillText(badgeText, w - pad, h - pad);

          const url = canvas.toDataURL("image/jpeg", 0.9);
          if (!cancelled && mounted.current) setWatermarked(url);
        } catch {
          // CORS-tainted; bottom layer stays as original src
        }
      };
      img.onerror = () => {};
      img.src = src;
    })();

    return () => { cancelled = true; };
  }, [src]);

  return (
    <div className={`relative ${className ?? ""}`} style={{ overflow: "hidden" }}>
      {/* Bottom: watermarked — this is what gets saved */}
      <img
        src={watermarked}
        alt={alt}
        loading={loading}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
        style={{ WebkitUserSelect: "none", userSelect: "none" }}
      />
      {/* Top: clean image, pointer-events disabled so right-click hits the
          watermarked layer below. Visually this is what the user sees. */}
      <img
        src={src}
        alt=""
        aria-hidden
        loading={loading}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
        style={{
          pointerEvents: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
          WebkitTouchCallout: "none",
        }}
      />
    </div>
  );
}

export default WatermarkedImage;
