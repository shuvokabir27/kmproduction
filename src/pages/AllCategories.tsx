import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useProductCategories } from "@/hooks/useProductCategories";

const DEMO_IMAGES = [
  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1471193945509-9ad0617afabf?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1502741338009-cac2772e18bc?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&h=600&fit=crop",
];

export default function AllCategories() {
  const { data, isLoading } = useProductCategories();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const tree = data?.tree ?? [];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return tree;
    return tree
      .map((m) => {
        const matchMain = m.label.toLowerCase().includes(term);
        const kids = m.children.filter((s) => s.label.toLowerCase().includes(term));
        if (matchMain || kids.length) return { ...m, children: matchMain ? m.children : kids };
        return null;
      })
      .filter(Boolean) as typeof tree;
  }, [q, tree]);

  const goToShop = (value: string) => {
    navigate(`/category/${encodeURIComponent(value)}`);
  };

  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: "'Tiro Bangla', serif" }}
    >
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            to="/"
            className="h-9 w-9 grid place-items-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
            aria-label="ফিরে যান"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-xl font-semibold text-slate-900 leading-tight truncate">সকল ক্যাটাগরি</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="খুঁজুন..."
              className="pl-9 pr-3 py-2 w-40 sm:w-64 rounded-md border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>
        </div>
      </header>

      {/* Page intro */}
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-6">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-blue-600 mb-2">Collection</p>
        <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 leading-snug">
          আমাদের পণ্যের ক্যাটাগরি সমূহ
        </h2>
        <p className="mt-2 text-sm md:text-base text-slate-500 max-w-2xl">
          আপনার পছন্দের ক্যাটাগরি বেছে নিন এবং সংগ্রহ ব্রাউজ করুন।
        </p>
        <div className="mt-6 h-px bg-slate-200" />
      </section>

      {/* Categories */}
      <main className="max-w-6xl mx-auto px-4 pb-16">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-56 rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500">কোনো ক্যাটাগরি পাওয়া যায়নি।</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {filtered.map((m, i) => {
              const img = m.image_url || DEMO_IMAGES[i % DEMO_IMAGES.length];
              return (
                <article
                  key={m.id}
                  className="group rounded-lg border border-slate-200 bg-white hover:border-blue-500 hover:shadow-sm transition-all overflow-hidden flex flex-col"
                >
                  <button
                    onClick={() => goToShop(m.value)}
                    className="block w-full text-left"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
                      <img
                        src={img}
                        alt={m.label}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-3 md:p-4 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm md:text-base font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          {m.label}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {m.children.length > 0 ? `${m.children.length} টি সাব-ক্যাটাগরি` : "ব্রাউজ করুন"}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 shrink-0 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>

                  {m.children.length > 0 && (
                    <div className="px-3 md:px-4 pb-3 md:pb-4 -mt-1">
                      <div className="flex flex-wrap gap-1.5">
                        {m.children.slice(0, 4).map((s) => (
                          <button
                            key={s.id}
                            onClick={(e) => { e.stopPropagation(); goToShop(s.value); }}
                            className="text-xs text-slate-600 hover:text-blue-600 px-2 py-1 rounded border border-slate-200 hover:border-blue-500 transition-colors"
                          >
                            {s.label}
                          </button>
                        ))}
                        {m.children.length > 4 && (
                          <span className="text-xs text-slate-400 px-2 py-1">
                            +{m.children.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
