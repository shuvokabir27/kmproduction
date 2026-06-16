import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProductCategories } from "@/hooks/useProductCategories";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Pastel ring colors cycled across categories — gives the organic vibe
const RING_COLORS = [
  "ring-emerald-200 bg-emerald-50",
  "ring-amber-200 bg-amber-50",
  "ring-rose-200 bg-rose-50",
  "ring-sky-200 bg-sky-50",
  "ring-violet-200 bg-violet-50",
  "ring-lime-200 bg-lime-50",
  "ring-orange-200 bg-orange-50",
  "ring-teal-200 bg-teal-50",
];

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&h=300&fit=crop",
  "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=300&h=300&fit=crop",
  "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=300&h=300&fit=crop",
  "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=300&h=300&fit=crop",
  "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300&h=300&fit=crop",
  "https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=300&h=300&fit=crop",
];

const OrganicCategoryCircles = () => {
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
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 240), behavior: "smooth" });
  };

  if (cats.length === 0) return null;

  return (
    <section className="px-4 py-10" style={{ fontFamily: "'Tiro Bangla', serif" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="text-emerald-600 text-[11px] font-bold tracking-[0.25em] uppercase">Categories</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">ক্যাটাগরি অনুযায়ী খুঁজুন</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollBy(-1)}
              disabled={!canLeft}
              aria-label="prev"
              className="h-9 w-9 grid place-items-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scrollBy(1)}
              disabled={!canRight}
              aria-label="next"
              className="h-9 w-9 grid place-items-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="flex gap-4 md:gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {cats.map((c, i) => {
            const ring = RING_COLORS[i % RING_COLORS.length];
            const img = c.image_url || FALLBACK_IMAGES[i % FALLBACK_IMAGES.length];
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/category/${encodeURIComponent(c.value)}`)}
                className="group snap-start shrink-0 flex flex-col items-center gap-2.5 w-[96px] md:w-[112px]"
              >
                <div
                  className={`relative w-[88px] h-[88px] md:w-[104px] md:h-[104px] rounded-full ring-2 ring-offset-2 ring-offset-white ${ring} overflow-hidden transition-transform duration-300 group-hover:scale-105`}
                >
                  <img
                    src={img}
                    alt={c.label}
                    loading="lazy"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <span className="text-xs md:text-sm font-semibold text-slate-700 text-center leading-tight line-clamp-2 group-hover:text-emerald-700 transition-colors">
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default OrganicCategoryCircles;
