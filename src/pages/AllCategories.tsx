import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Sparkles, Search } from "lucide-react";
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
      className="min-h-screen bg-gradient-to-b from-slate-50/40 via-white to-white"
      style={{ fontFamily: "'Tiro Bangla', serif" }}
    >
      {/* Header */}
      <header className="bg-white/85 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/products"
            className="h-10 w-10 grid place-items-center rounded-full bg-slate-50 hover:bg-slate-100 text-blue-700 transition"
            aria-label="ফিরে যান"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-base md:text-2xl font-bold text-gray-900 leading-tight">সকল ক্যাটাগরি</h1>
            <p className="hidden md:block text-xs text-gray-500">আমাদের সম্পূর্ণ পণ্য সংগ্রহ ব্রাউজ করুন</p>
          </div>
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ক্যাটাগরি খুঁজুন..."
              className="pl-9 pr-4 py-2 w-56 md:w-72 rounded-full border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:border-blue-500"
            />
          </div>
        </div>
        {/* Mobile search */}
        <div className="sm:hidden px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ক্যাটাগরি খুঁজুন..."
              className="pl-9 pr-4 py-2 w-full rounded-full border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:border-blue-500"
            />
          </div>
        </div>
      </header>

      {/* Hero strip */}
      <section className="max-w-7xl mx-auto px-4 pt-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900 text-white p-6 md:p-10 shadow-xl">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-10 -bottom-10 h-44 w-44 rounded-full bg-slate-300/20 blur-2xl" />
          <div className="relative flex items-center gap-2 text-slate-200 text-xs font-bold tracking-widest uppercase">
            <Sparkles className="h-4 w-4" /> Premium Collection
          </div>
          <h2 className="relative mt-2 text-2xl md:text-4xl font-bold leading-tight">
            বিশেষভাবে নির্বাচিত পণ্যের সমাহার
          </h2>
          <p className="relative mt-2 text-slate-50/90 text-sm md:text-base max-w-xl">
            প্রতিটি ক্যাটাগরিতে রয়েছে আমাদের সেরা মানের পণ্য। নিচ থেকে আপনার পছন্দের ক্যাটাগরি বেছে নিন।
          </p>
        </div>
      </section>

      {/* Categories */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 rounded-3xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-500">কোনো ক্যাটাগরি পাওয়া যায়নি।</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((m, i) => {
              const img = m.image_url || DEMO_IMAGES[i % DEMO_IMAGES.length];
              return (
                <article
                  key={m.id}
                  className="group relative rounded-3xl bg-white border border-gray-100 shadow-[0_4px_20px_-8px_rgba(16,185,129,0.15)] hover:shadow-[0_12px_32px_-12px_rgba(16,185,129,0.35)] transition-all duration-300 overflow-hidden"
                >
                  {/* Banner */}
                  <button
                    onClick={() => goToShop(m.value)}
                    className="block w-full text-left"
                  >
                    <div className="relative h-36 md:h-44 overflow-hidden">
                      <img
                        src={img}
                        alt={m.label}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/95 text-blue-700 text-[11px] font-bold shadow">
                        {m.children.length > 0 ? `${m.children.length} টি সাব-ক্যাটাগরি` : "ব্রাউজ করুন"}
                      </div>
                      <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                        <div>
                          <div className="text-2xl md:text-3xl drop-shadow">{m.icon}</div>
                          <h3 className="text-white text-lg md:text-2xl font-bold leading-tight drop-shadow-md mt-0.5">
                            {m.label}
                          </h3>
                        </div>
                        <span className="h-10 w-10 grid place-items-center rounded-full bg-white text-blue-700 shadow-lg group-hover:translate-x-1 transition-transform">
                          <ChevronRight className="h-5 w-5" />
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Sub-categories */}
                  {m.children.length > 0 && (
                    <div className="p-4 md:p-5">
                      <div className="flex flex-wrap gap-2">
                        {m.children.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => goToShop(s.value)}
                            className="group/chip inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-slate-50/70 hover:bg-blue-600 text-slate-900 hover:text-white text-sm font-semibold border border-slate-100 hover:border-blue-600 transition-colors"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 group-hover/chip:bg-white" />
                            {s.label}
                          </button>
                        ))}
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
