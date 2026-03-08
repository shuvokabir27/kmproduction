import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Newspaper, Calendar, Star, ArrowLeft, Image as ImageIcon, Share2, Facebook, MessageCircle, Copy, Link2 } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

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
  video_url: string | null;
}

const getEmbedUrl = (url: string): string | null => {
  try {
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    // Facebook video
    if (url.includes("facebook.com")) return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
    // Direct embed
    return url;
  } catch { return null; }
};

const renderFormattedContent = (text: string) => {
  return text.split("\n").map((line, i) => {
    // Inline image: ![caption|size](url) or ![caption](url)
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      const meta = imgMatch[1];
      const url = imgMatch[2];
      let caption = meta;
      let size = 100;
      if (meta.includes("|")) {
        const parts = meta.split("|");
        caption = parts[0];
        size = parseInt(parts[1]) || 100;
      }
      return (
        <figure key={i} className="my-4 flex flex-col items-center">
          <img
            src={url}
            alt={caption}
            className="rounded-xl border border-border/30 object-contain"
            style={{ width: `${Math.min(size, 100)}%`, maxWidth: "100%" }}
          />
          {caption && (
            <figcaption className="text-xs text-muted-foreground text-center mt-2 italic">{caption}</figcaption>
          )}
        </figure>
      );
    }
    if (line.startsWith("# ")) return <h2 key={i} className="text-xl font-bold text-foreground mt-4 mb-2">{line.slice(2)}</h2>;
    if (line.startsWith("## ")) return <h3 key={i} className="text-lg font-semibold text-foreground mt-3 mb-1.5">{line.slice(3)}</h3>;
    if (line === "---") return <hr key={i} className="border-border/30 my-4" />;
    if (line.startsWith("• ")) return <li key={i} className="ml-4 list-disc text-foreground/85">{formatInline(line.slice(2))}</li>;
    if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-foreground/85">{formatInline(line.replace(/^\d+\.\s/, ""))}</li>;
    if (!line.trim()) return <br key={i} />;
    return <p key={i} className="text-foreground/85 leading-relaxed">{formatInline(line)}</p>;
  });
};

const formatInline = (text: string) => {
  // Process bold, italic, underline, links
  const parts: (string | JSX.Element)[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Links [text](url)
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    // Bold **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Italic *text*
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    // Underline __text__
    const underlineMatch = remaining.match(/__(.+?)__/);

    const matches = [
      linkMatch ? { type: "link", match: linkMatch, index: linkMatch.index! } : null,
      boldMatch ? { type: "bold", match: boldMatch, index: boldMatch.index! } : null,
      italicMatch ? { type: "italic", match: italicMatch, index: italicMatch.index! } : null,
      underlineMatch ? { type: "underline", match: underlineMatch, index: underlineMatch.index! } : null,
    ].filter(Boolean).sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const first = matches[0]!;
    if (first.index > 0) parts.push(remaining.slice(0, first.index));

    if (first.type === "bold") {
      parts.push(<strong key={key++} className="font-bold">{first.match![1]}</strong>);
    } else if (first.type === "italic") {
      parts.push(<em key={key++} className="italic">{first.match![1]}</em>);
    } else if (first.type === "underline") {
      parts.push(<span key={key++} className="underline">{first.match![1]}</span>);
    } else if (first.type === "link") {
      parts.push(<a key={key++} href={first.match![2]} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">{first.match![1]}</a>);
    }

    remaining = remaining.slice(first.index + first.match![0].length);
  }

  return <>{parts}</>;
};

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

  const filtered = activeCategory === "all"
    ? newsList
    : newsList?.filter((n) => n.category === activeCategory);

  const featured = filtered?.find((n) => n.is_featured);
  const rest = filtered?.filter((n) => n !== featured);

  // Auto-open news from shared link (query param or short ID route)
  useEffect(() => {
    if (!newsList) return;
    
    // Check query param first
    const newsId = searchParams.get("id");
    if (newsId) {
      const found = newsList.find((n) => n.id === newsId);
      if (found) {
        setSelectedNews(found);
        setSearchParams({}, { replace: true });
      }
      return;
    }
    
    // Check short ID from route (UUID without dashes)
    if (shortId) {
      const fullId = shortId.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
      const found = newsList.find((n) => n.id === fullId);
      if (found) {
        setSelectedNews(found);
      }
    }
  }, [newsList, searchParams, shortId]);

  const getShareUrl = (news: NewsItem) => {
    // Short ID: remove dashes from UUID for cleaner URL
    const shortId = news.id.replace(/-/g, "");
    return `https://kmproduction.lovable.app/news/${shortId}`;
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
    const embedUrl = selectedNews.video_url ? getEmbedUrl(selectedNews.video_url) : null;

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

          {/* Share Buttons */}
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border/30">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Share2 className="h-3.5 w-3.5" /> শেয়ার:
            </span>
            <button
              onClick={() => handleShare("facebook", selectedNews)}
              className="h-8 w-8 rounded-full bg-blue-600/15 text-blue-400 flex items-center justify-center hover:bg-blue-600/25 transition-colors"
            >
              <Facebook className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleShare("whatsapp", selectedNews)}
              className="h-8 w-8 rounded-full bg-green-600/15 text-green-400 flex items-center justify-center hover:bg-green-600/25 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleShare("copy", selectedNews)}
              className="h-8 w-8 rounded-full bg-secondary text-muted-foreground flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>

          {/* Formatted Content */}
          <div className="prose prose-sm max-w-none space-y-1">
            {renderFormattedContent(selectedNews.content)}
          </div>

          {/* Embedded Video */}
          {embedUrl && (
            <div className="mt-8">
              <div className="rounded-xl overflow-hidden border border-border/30 aspect-video">
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            </div>
          )}

          {/* Bottom Share */}
          <div className="flex items-center gap-2 mt-8 pt-4 border-t border-border/30">
            <span className="text-xs text-muted-foreground">শেয়ার করুন:</span>
            <button onClick={() => handleShare("facebook", selectedNews)} className="text-xs text-blue-400 hover:underline flex items-center gap-1">
              <Facebook className="h-3 w-3" /> Facebook
            </button>
            <button onClick={() => handleShare("whatsapp", selectedNews)} className="text-xs text-green-400 hover:underline flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> WhatsApp
            </button>
            <button onClick={() => handleShare("copy", selectedNews)} className="text-xs text-muted-foreground hover:underline flex items-center gap-1">
              <Link2 className="h-3 w-3" /> লিংক কপি
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background noise-bg">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Masthead */}
        <div className="text-center mb-6 pb-5 border-b border-border/30">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="absolute left-4 top-6 h-8 w-8 md:relative md:left-0 md:top-0 md:hidden">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center justify-center gap-2 mb-1">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-8 w-8 hidden md:flex">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight" style={{ fontFamily: "'Noto Serif Bengali', serif" }}>
              দৈনিক ইন্তেকাল
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            সম্পাদক: <span className="font-semibold text-foreground/80">শিরু খাঁ</span>
          </p>
          <p className="text-[11px] text-primary/80 mt-1.5 font-medium">
            ✨ বাংলা ভাইরাল নিউজ দেখতে আমাদের ফলো করুন
          </p>
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
