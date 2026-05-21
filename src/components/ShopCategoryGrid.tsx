import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const updateArrows = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [cats.length]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.8, 240);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  // Auto-scroll every 1 second, loop back to start when reaching end
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || cats.length === 0) return;
    const id = setInterval(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const step = 140;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: step, behavior: "smooth" });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [paused, cats.length]);

  if (cats.length === 0) return null;

  return (
    <section className="px-4 py-6">
      <div className="max-w-7xl mx-auto glossy-section-indigo p-5 md:p-7">
        {/* Header */}
        <div className="flex items-end justify-between mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <span className="h-8 w-1 rounded-full bg-gradient-to-b from-indigo-400 via-fuchsia-400 to-pink-400 shadow-[0_0_12px_hsl(280_80%_60%/0.6)]" />
            <h2
              className="text-xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-200 via-fuchsia-200 to-pink-200 bg-clip-text text-transparent"
              style={{ fontFamily: "'Tiro Bangla', serif" }}
            >
              ফিচার্ড ক্যাটাগরি
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="পূর্ববর্তী"
              onClick={() => scrollBy(-1)}
              disabled={!canLeft}
              className="h-9 w-9 grid place-items-center rounded-full bg-white/10 border border-white/20 text-fuchsia-100 hover:bg-fuchsia-500/30 hover:border-fuchsia-300/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="পরবর্তী"
              onClick={() => scrollBy(1)}
              disabled={!canRight}
              className="h-9 w-9 grid place-items-center rounded-full bg-white/10 border border-white/20 text-fuchsia-100 hover:bg-fuchsia-500/30 hover:border-fuchsia-300/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Horizontal scroller */}
        <div className="relative z-10">
          {/* edge fade */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-3 w-8 bg-gradient-to-r from-[#1a0b2e]/80 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-3 w-8 bg-gradient-to-l from-[#1a0b2e]/80 to-transparent z-10" />

          <div
            ref={scrollerRef}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => setPaused(false)}
            className="flex gap-3 md:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {cats.map((c, i) => {
              const img = c.image_url || DEMO_IMAGES[i % DEMO_IMAGES.length];
              return (
                <a
                  key={c.id}
                  href="#shop"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
                    window.dispatchEvent(new CustomEvent("shop:filter-category", { detail: { value: c.value } }));
                  }}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="group cat-card-enter snap-start shrink-0 w-[120px] sm:w-[140px] md:w-[160px] flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-fuchsia-300/40 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_18px_36px_-14px_hsl(290_85%_55%/0.7)]"
                >
                  <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl p-[2px] bg-gradient-to-br from-indigo-400/70 via-fuchsia-400/60 to-pink-400/70 shadow-[0_8px_24px_-10px_hsl(280_80%_50%/0.6)] group-hover:shadow-[0_14px_32px_-10px_hsl(290_85%_55%/0.95)] transition-all">
                    <div className="relative w-full h-full rounded-[14px] overflow-hidden bg-black/40 backdrop-blur">
                      <img
                        src={img}
                        alt={c.label}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-125 group-hover:rotate-3"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,hsl(0_0%_100%/0.18)_0%,transparent_45%)]" />
                      <div className="pointer-events-none absolute -inset-y-full -left-1/2 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:translate-x-[400%] transition-transform duration-700 ease-out" />
                      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_50%_50%,hsl(290_85%_60%/0.35),transparent_70%)]" />
                    </div>
                  </div>
                  <span
                    className="text-xs md:text-sm font-bold text-foreground/90 text-center leading-tight line-clamp-2 group-hover:text-fuchsia-200 transition-colors"
                    style={{ fontFamily: "'Tiro Bangla', serif" }}
                  >
                    {c.label}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShopCategoryGrid;
