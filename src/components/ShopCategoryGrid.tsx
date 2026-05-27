import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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
      <div className="max-w-7xl mx-auto rounded-2xl border border-slate-200 bg-white p-5 md:p-7">
        {/* Header */}
        <div className="flex items-end justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="h-6 w-1 rounded-full bg-blue-600" />
            <h2
              className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900"
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
              className="h-9 w-9 grid place-items-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="পরবর্তী"
              onClick={() => scrollBy(1)}
              disabled={!canRight}
              className="h-9 w-9 grid place-items-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Horizontal scroller */}
        <div className="relative">
          <div
            ref={scrollerRef}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => setPaused(false)}
            className="flex gap-3 md:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {cats.map((c, i) => {
              const img = c.image_url || DEMO_IMAGES[i % DEMO_IMAGES.length];
              return (
                <a
                  key={c.id}
                  href={`/category/${encodeURIComponent(c.value)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/category/${encodeURIComponent(c.value)}`);
                  }}
                  className="group snap-start shrink-0 w-[120px] sm:w-[140px] md:w-[160px] flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                    <img
                      src={img}
                      alt={c.label}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <span
                    className="text-xs md:text-sm font-bold text-slate-700 text-center leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors"
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
