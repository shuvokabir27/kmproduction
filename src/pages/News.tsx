import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Newspaper, Calendar, Star, ArrowLeft, Share2, Facebook, MessageCircle, Copy, Link2, Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import NewsDetail from "@/components/news/NewsDetail";
import NewsTicker from "@/components/news/NewsTicker";

const categories = [
  { value: "all", label: "সকল" },
  { value: "entertainment", label: "বিনোদন" },
  { value: "funny", label: "হাসির খবর" },
  { value: "behind-the-scenes", label: "নেপথ্যে" },
  { value: "announcement", label: "ঘোষণা" },
];

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  featured_image_url: string | null;
  category: string;
  is_featured: boolean;
  created_at: string;
  published_at: string | null;
  video_url: string | null;
  publisher_id: string | null;
}

export interface Publisher {
  id: string;
  name: string;
  photo_url: string | null;
}

export default function News() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { shortId } = useParams();
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

  const { data: newsList, isLoading } = useQuery({
    queryKey: ["public-news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .eq("is_published", true)
        .order("is_featured", { ascending: false })
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data as NewsItem[];
    },
  });

  const { data: tickerItems } = useQuery({
    queryKey: ["public-ticker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_ticker")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as { id: string; text: string }[];
    },
  });

  const { data: tickerSettings } = useQuery({
    queryKey: ["ticker-settings-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("ticker_speed, ticker_enabled")
        .limit(1)
        .single();
      if (error) return { ticker_speed: 30, ticker_enabled: true };
      return data;
    },
  });

  const tickerEnabled = tickerSettings?.ticker_enabled ?? true;
  const tickerSpeed = tickerSettings?.ticker_speed || 30;

  const tickerTexts = tickerItems && tickerItems.length > 0
    ? tickerItems.map((t) => ({ id: t.id, text: t.text, newsItem: null as NewsItem | null }))
    : (newsList || []).map((n) => ({ id: n.id, text: n.title, newsItem: n }));

  const filtered = activeCategory === "all"
    ? newsList
    : newsList?.filter((n) => n.category === activeCategory);

  const featured = filtered?.find((n) => n.is_featured);
  const rest = filtered?.filter((n) => n !== featured);

  // Split rest into columns for newspaper layout
  const leftColumn = rest?.filter((_, i) => i % 2 === 0) || [];
  const rightColumn = rest?.filter((_, i) => i % 2 === 1) || [];

  useEffect(() => {
    if (!newsList) return;
    const newsId = searchParams.get("id");
    if (newsId) {
      const found = newsList.find((n) => n.id === newsId);
      if (found) {
        setSelectedNews(found);
        setSearchParams({}, { replace: true });
      }
      return;
    }
    if (shortId) {
      const fullId = shortId.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
      const found = newsList.find((n) => n.id === fullId);
      if (found) setSelectedNews(found);
    }
  }, [newsList, searchParams, shortId]);

  const getShareUrl = (news: NewsItem) => {
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-news?id=${news.id}`;
  };

  const handleShare = (type: string, news: NewsItem) => {
    const url = getShareUrl(news);
    const text = news.title;
    switch (type) {
      case "facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`, "_blank");
        break;
      case "whatsapp":
        window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`, "_blank");
        break;
      case "copy":
        navigator.clipboard.writeText(url);
        toast({ title: "লিংক কপি হয়েছে!" });
        break;
    }
  };

  if (selectedNews) {
    return (
      <NewsDetail
        news={selectedNews}
        categories={categories}
        onBack={() => setSelectedNews(null)}
        onShare={handleShare}
      />
    );
  }

  const today = format(new Date(), "EEEE, dd MMMM yyyy", { locale: bn });

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <div className="max-w-6xl mx-auto px-3 md:px-6">

        {/* === NEWSPAPER MASTHEAD === */}
        <header className="relative pt-4 pb-3 md:pt-6 md:pb-4">
          {/* Back button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="absolute left-0 top-4 h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* Top rule */}
          <div className="border-t-[3px] border-foreground/80 mb-3" />

          <div className="text-center">
            {/* Date line */}
            <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-muted-foreground mb-2 font-medium">
              {today}
            </p>

            {/* Newspaper title */}
            <h1
              className="text-4xl md:text-6xl font-black text-foreground tracking-tight leading-none mb-1"
              style={{ fontFamily: "'Tiro Bangla', 'Noto Serif Bengali', serif" }}
            >
              দৈনিক ইন্তেকাল
            </h1>

            {/* Tagline */}
            <p className="text-[10px] md:text-xs text-muted-foreground tracking-widest uppercase mt-1">
              সম্পাদক: শিরু খাঁ &nbsp;•&nbsp; বাংলা ভাইরাল নিউজ পোর্টাল
            </p>
          </div>

          {/* Bottom rules */}
          <div className="mt-3 border-t border-foreground/20" />
          <div className="mt-[2px] border-t-[3px] border-foreground/80" />
        </header>

        {/* === BREAKING NEWS TICKER === */}
        {tickerEnabled && tickerTexts.length > 0 && (
          <NewsTicker
            tickerTexts={tickerTexts}
            tickerSpeed={tickerSpeed}
            onSelectNews={(item) => item.newsItem && setSelectedNews(item.newsItem)}
          />
        )}

        {/* === CATEGORY NAV === */}
        <nav className="flex gap-1 overflow-x-auto py-3 mb-1 scrollbar-hide border-b border-border/30">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
                activeCategory === cat.value
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </nav>

        {/* === CONTENT === */}
        {isLoading ? (
          <div className="py-20 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-secondary/30 animate-pulse rounded" />
            ))}
          </div>
        ) : !filtered?.length ? (
          <div className="text-center py-24 text-muted-foreground">
            <Newspaper className="h-16 w-16 mx-auto mb-4 opacity-15" />
            <p className="text-lg" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
              এখনো কোনো নিউজ প্রকাশিত হয়নি
            </p>
          </div>
        ) : (
          <div className="py-4 space-y-0">

            {/* === FEATURED / HEADLINE === */}
            {featured && (
              <article
                className="cursor-pointer group mb-6"
                onClick={() => setSelectedNews(featured)}
              >
                <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                  {/* Image */}
                  <div className="overflow-hidden border border-border/20">
                    {featured.featured_image_url ? (
                      <img
                        src={featured.featured_image_url}
                        alt=""
                        className="w-full h-48 md:h-72 object-cover group-hover:scale-[1.02] transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-48 md:h-72 bg-secondary/30 flex items-center justify-center">
                        <Newspaper className="h-12 w-12 text-muted-foreground/15" />
                      </div>
                    )}
                  </div>
                  {/* Text */}
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        {categories.find(c => c.value === featured.category)?.label || featured.category}
                      </span>
                      <Star className="h-3 w-3 text-primary fill-primary" />
                    </div>
                    <h2
                      className="text-2xl md:text-3xl font-black text-foreground leading-tight mb-3 group-hover:text-primary transition-colors"
                      style={{ fontFamily: "'Hind Siliguri', sans-serif" }}
                    >
                      {featured.title}
                    </h2>
                    {featured.excerpt && (
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-3"
                         style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
                        {featured.excerpt}
                      </p>
                    )}
                    {featured.published_at && (
                      <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(featured.published_at), "dd MMMM yyyy, hh:mm a", { locale: bn })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-4 border-t-[2px] border-foreground/10" />
              </article>
            )}

            {/* === TWO COLUMN NEWSPAPER LAYOUT === */}
            <div className="grid md:grid-cols-2 gap-0 md:divide-x divide-border/20">
              {/* Left Column */}
              <div className="md:pr-5 space-y-0">
                {leftColumn.map((news, idx) => (
                  <NewsCard
                    key={news.id}
                    news={news}
                    categories={categories}
                    isFirst={idx === 0}
                    onClick={() => setSelectedNews(news)}
                  />
                ))}
              </div>
              {/* Right Column */}
              <div className="md:pl-5 space-y-0">
                {rightColumn.map((news, idx) => (
                  <NewsCard
                    key={news.id}
                    news={news}
                    categories={categories}
                    isFirst={idx === 0}
                    onClick={() => setSelectedNews(news)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === FOOTER === */}
        <footer className="border-t-[3px] border-foreground/80 mt-8 pt-4 pb-8 text-center">
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase">
            © দৈনিক ইন্তেকাল &nbsp;•&nbsp; সর্বস্বত্ব সংরক্ষিত
          </p>
        </footer>
      </div>
    </div>
  );
}

/* === News Card for column layout === */
function NewsCard({
  news,
  categories,
  isFirst,
  onClick,
}: {
  news: NewsItem;
  categories: { value: string; label: string }[];
  isFirst: boolean;
  onClick: () => void;
}) {
  return (
    <article
      className={`cursor-pointer group py-4 ${!isFirst ? "border-t border-border/20" : ""}`}
      onClick={onClick}
    >
      <div className="flex gap-3">
        {/* Thumbnail */}
        {news.featured_image_url && (
          <div className="w-24 h-20 md:w-28 md:h-24 flex-shrink-0 overflow-hidden border border-border/10">
            <img
              src={news.featured_image_url}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        )}
        {/* Text */}
        <div className="flex-1 min-w-0">
          <span className="text-[9px] font-bold uppercase tracking-wider text-primary/70 mb-0.5 block">
            {categories.find(c => c.value === news.category)?.label || news.category}
          </span>
          <h3
            className="font-bold text-sm md:text-[15px] text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors"
            style={{ fontFamily: "'Hind Siliguri', sans-serif" }}
          >
            {news.title}
          </h3>
          {news.excerpt && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-1 hidden md:block">
              {news.excerpt}
            </p>
          )}
          {news.published_at && (
            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mt-1">
              <Clock className="h-2.5 w-2.5" />
              {format(new Date(news.published_at), "dd MMM yyyy")}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
