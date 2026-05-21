import { Link } from "react-router-dom";
import { useProductCategories } from "@/hooks/useProductCategories";

const DEMO_IMAGES = [
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1502741338009-cac2772e18bc?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop",
];

const ShopCategoryGrid = () => {
  const { data } = useProductCategories();
  const cats = data?.tree ?? [];
  if (cats.length === 0) return null;

  return (
    <section className="px-4 py-6">
      <div className="max-w-7xl mx-auto glossy-section-indigo p-5 md:p-7">
        <div className="flex items-end justify-between mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <span className="h-8 w-1 rounded-full bg-gradient-to-b from-indigo-400 via-fuchsia-400 to-pink-400 shadow-[0_0_12px_hsl(280_80%_60%/0.6)]" />
            <h2
              className="text-xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-200 via-fuchsia-200 to-pink-200 bg-clip-text text-transparent"
              style={{ fontFamily: "'Tiro Bangla', serif" }}
            >
              ক্যাটাগরি
            </h2>
          </div>
          <a
            href="#shop"
            className="text-[11px] md:text-xs font-bold tracking-wide uppercase text-fuchsia-300/90 hover:text-fuchsia-200 transition-colors inline-flex items-center gap-1"
          >
            সব দেখুন <span aria-hidden>→</span>
          </a>
        </div>

        <div className="relative z-10 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4">
          {cats.map((c, i) => {
            const img = c.image_url || DEMO_IMAGES[i % DEMO_IMAGES.length];
            return (
              <a
                key={c.id}
                href={`#shop`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
                  window.dispatchEvent(new CustomEvent("shop:filter-category", { detail: { value: c.value } }));
                }}
                className="group relative flex flex-col items-center gap-2 p-2 rounded-2xl transition-all hover:-translate-y-1"
              >
                {/* premium ring */}
                <div className="relative w-full aspect-square rounded-2xl p-[2px] bg-gradient-to-br from-indigo-400/70 via-fuchsia-400/60 to-pink-400/70 shadow-[0_8px_24px_-10px_hsl(280_80%_50%/0.6)] group-hover:shadow-[0_14px_32px_-10px_hsl(290_85%_55%/0.85)] transition-all">
                  <div className="relative w-full h-full rounded-[14px] overflow-hidden bg-black/40 backdrop-blur">
                    <img
                      src={img}
                      alt={c.label}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {/* glossy sheen */}
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,hsl(0_0%_100%/0.18)_0%,transparent_45%)]" />
                    {/* hover gradient veil */}
                    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[linear-gradient(135deg,hsl(265_85%_50%/0.35),hsl(325_85%_55%/0.25))]" />
                  </div>
                </div>
                <span
                  className="text-[11px] md:text-xs font-bold text-foreground/90 text-center leading-tight line-clamp-2 group-hover:text-fuchsia-200 transition-colors"
                  style={{ fontFamily: "'Tiro Bangla', serif" }}
                >
                  {c.label}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ShopCategoryGrid;
