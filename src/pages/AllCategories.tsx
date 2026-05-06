import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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

const BRAND_GREEN = "#1f7a3a";

export default function AllCategories() {
  const { data, isLoading } = useProductCategories();
  const navigate = useNavigate();
  const tree = data?.tree ?? [];

  const goToShop = (value: string) => {
    navigate("/products#shop");
    setTimeout(() => {
      document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
      window.dispatchEvent(new CustomEvent("shop:filter-category", { detail: { value } }));
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Tiro Bangla', serif" }}>
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/products"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-700"
            aria-label="ফিরে যান"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg md:text-2xl font-bold text-gray-900">সকল ক্যাটাগরি</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <p className="text-gray-600">লোড হচ্ছে...</p>
        ) : tree.length === 0 ? (
          <p className="text-gray-600">কোনো ক্যাটাগরি পাওয়া যায়নি।</p>
        ) : (
          <div className="space-y-6">
            {tree.map((m, i) => {
              const img = m.image_url || DEMO_IMAGES[i % DEMO_IMAGES.length];
              return (
                <section
                  key={m.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <button
                      onClick={() => goToShop(m.value)}
                      className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden ring-1 ring-gray-200 hover:ring-emerald-400 transition flex-shrink-0"
                    >
                      <img src={img} alt={m.label} className="w-full h-full object-cover" />
                    </button>
                    <div className="flex-1">
                      <button
                        onClick={() => goToShop(m.value)}
                        className="text-left text-base md:text-xl font-bold text-gray-900 hover:text-emerald-700"
                      >
                        {m.icon} {m.label}
                      </button>
                      {m.children.length > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {m.children.length} টি সাব-ক্যাটাগরি
                        </p>
                      )}
                    </div>
                  </div>

                  {m.children.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-3 border-t border-gray-100">
                      {m.children.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => goToShop(s.value)}
                          className="text-left px-3 py-2 rounded-lg bg-gray-50 hover:bg-emerald-50 text-sm font-semibold text-gray-700 hover:text-emerald-700 transition-colors"
                          style={{ borderLeft: `3px solid ${BRAND_GREEN}` }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
