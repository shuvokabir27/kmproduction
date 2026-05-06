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
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900" style={{ fontFamily: "'Tiro Bangla', serif" }}>
            ক্যাটাগরি
          </h2>
          <a href="#shop" className="text-xs font-semibold text-emerald-700 hover:underline">সব দেখুন →</a>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 md:p-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 md:gap-3">
            {cats.map((c, i) => {
              const img = c.image_url || DEMO_IMAGES[i % DEMO_IMAGES.length];
              return (
                <a
                  key={c.id}
                  href={`#shop`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
                    // Best effort: dispatch a custom event for category filter (caught by Products page if implemented)
                    window.dispatchEvent(new CustomEvent("shop:filter-category", { detail: { value: c.value } }));
                  }}
                  className="group flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-emerald-50 transition-colors"
                >
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-100 ring-1 ring-gray-200 group-hover:ring-emerald-400 transition">
                    <img
                      src={img}
                      alt={c.label}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <span
                    className="text-[11px] md:text-xs font-semibold text-gray-700 text-center leading-tight line-clamp-2"
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
