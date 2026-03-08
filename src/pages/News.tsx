import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Newspaper, Calendar, Star, ArrowLeft, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const categories = [
  { value: "all", label: "সব নিউজ" },
  { value: "entertainment", label: "🎬 এন্টারটেইনমেন্ট" },
  { value: "funny", label: "😂 ফানি" },
  { value: "behind-the-scenes", label: "🎭 বিহাইন্ড দ্য সিন" },
  { value: "announcement", label: "📢 ঘোষণা" },
];

interface NewsItem {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  featured_image_url: string | null;
  category: string;
  is_featured: boolean;
  created_at: string;
  published_at: string | null;
}

export default function News() {
  const navigate = useNavigate();
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

  const filtered = activeCategory === "all"
    ? newsList
    : newsList?.filter((n) => n.category === activeCategory);

  const featured = filtered?.find((n) => n.is_featured);
  const rest = filtered?.filter((n) => n !== featured);

  if (selectedNews) {
    return (
      <div className="min-h-screen bg-background noise-bg">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Button variant="ghost" size="sm" onClick={() => setSelectedNews(null)} className="mb-4 gap-1.5">
            <ArrowLeft className="h-4 w-4" /> ফিরে যান
          </Button>

          {selectedNews.featured_image_url && (
            <div className="rounded-2xl overflow-hidden mb-6 border border-border/30">
              <img src={selectedNews.featured_image_url} alt="" className="w-full h-56 md:h-80 object-cover" />
            </div>
          )}

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {categories.find(c => c.value === selectedNews.category)?.label || selectedNews.category}
            </Badge>
            {selectedNews.is_featured && <Star className="h-4 w-4 text-amber-400 fill-amber-400" />}
            {selectedNews.published_at && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(selectedNews.published_at), "dd MMM yyyy, hh:mm a")}
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4 leading-tight">
            {selectedNews.title}
          </h1>

          <div className="prose prose-sm prose-invert max-w-none text-foreground/85 leading-relaxed whitespace-pre-wrap">
            {selectedNews.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background noise-bg">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Newspaper className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">নিউজ</h1>
              <p className="text-xs text-muted-foreground">এন্টারটেইনমেন্ট ও ফানি নিউজ</p>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap border transition-all ${
                activeCategory === cat.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/50 text-muted-foreground border-border/30 hover:bg-secondary"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 rounded-2xl bg-secondary/50 animate-pulse" />
            ))}
          </div>
        ) : !filtered?.length ? (
          <div className="text-center py-20 text-muted-foreground">
            <Newspaper className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">এখনো কোনো নিউজ নেই</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Featured News */}
            {featured && (
              <Card
                className="overflow-hidden cursor-pointer hover:border-primary/30 transition-all group"
                onClick={() => setSelectedNews(featured)}
              >
                <CardContent className="p-0">
                  <div className="relative">
                    {featured.featured_image_url ? (
                      <img src={featured.featured_image_url} alt="" className="w-full h-56 md:h-72 object-cover group-hover:scale-[1.02] transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-56 md:h-72 bg-gradient-to-br from-orange-500/20 to-rose-500/20 flex items-center justify-center">
                        <Newspaper className="h-16 w-16 text-muted-foreground/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-amber-500/90 text-white text-[10px]">⭐ ফিচার্ড</Badge>
                        <Badge variant="outline" className="text-[10px] bg-background/50 backdrop-blur-sm">
                          {categories.find(c => c.value === featured.category)?.label}
                        </Badge>
                      </div>
                      <h2 className="text-lg md:text-xl font-bold text-foreground leading-tight">{featured.title}</h2>
                      {featured.excerpt && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{featured.excerpt}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rest of News */}
            <div className="grid gap-4 md:grid-cols-2">
              {rest?.map((news) => (
                <Card
                  key={news.id}
                  className="overflow-hidden cursor-pointer hover:border-border/60 transition-all group"
                  onClick={() => setSelectedNews(news)}
                >
                  <CardContent className="p-0">
                    <div className="flex h-32">
                      <div className="w-32 md:w-40 flex-shrink-0 bg-secondary/40 overflow-hidden">
                        {news.featured_image_url ? (
                          <img src={news.featured_image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground/20" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                        <div>
                          <Badge variant="outline" className="text-[10px] mb-1.5">
                            {categories.find(c => c.value === news.category)?.label}
                          </Badge>
                          <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-tight">{news.title}</h3>
                        </div>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {news.published_at ? format(new Date(news.published_at), "dd MMM yyyy") : ""}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
