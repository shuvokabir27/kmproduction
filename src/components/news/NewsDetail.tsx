import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Star, Share2, Facebook, MessageCircle, Copy, Link2, Clock, ChevronRight, Newspaper } from "lucide-react";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import type { NewsItem } from "@/pages/News";

const getEmbedUrl = (url: string): string | null => {
  try {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    if (url.includes("facebook.com")) return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
    return url;
  } catch { return null; }
};

const formatInline = (text: string) => {
  const parts: (string | JSX.Element)[] = [];
  let remaining = text;
  let key = 0;
  while (remaining.length > 0) {
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    const underlineMatch = remaining.match(/__(.+?)__/);
    const matches = [
      linkMatch ? { type: "link", match: linkMatch, index: linkMatch.index! } : null,
      boldMatch ? { type: "bold", match: boldMatch, index: boldMatch.index! } : null,
      italicMatch ? { type: "italic", match: italicMatch, index: italicMatch.index! } : null,
      underlineMatch ? { type: "underline", match: underlineMatch, index: underlineMatch.index! } : null,
    ].filter(Boolean).sort((a, b) => a!.index - b!.index);
    if (matches.length === 0) { parts.push(remaining); break; }
    const first = matches[0]!;
    if (first.index > 0) parts.push(remaining.slice(0, first.index));
    if (first.type === "bold") parts.push(<strong key={key++} className="font-bold">{first.match![1]}</strong>);
    else if (first.type === "italic") parts.push(<em key={key++} className="italic">{first.match![1]}</em>);
    else if (first.type === "underline") parts.push(<span key={key++} className="underline">{first.match![1]}</span>);
    else if (first.type === "link") parts.push(<a key={key++} href={first.match![2]} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">{first.match![1]}</a>);
    remaining = remaining.slice(first.index + first.match![0].length);
  }
  return <>{parts}</>;
};

const renderFormattedContent = (text: string) => {
  return text.split("\n").map((line, i) => {
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      const meta = imgMatch[1]; const url = imgMatch[2];
      let caption = meta; let size = 100;
      if (meta.includes("|")) { const p = meta.split("|"); caption = p[0]; size = parseInt(p[1]) || 100; }
      return (
        <figure key={i} className="my-6 flex flex-col items-center">
          <img src={url} alt={caption} className="border border-gray-200 object-contain" style={{ width: `${Math.min(size, 100)}%`, maxWidth: "100%" }} />
          {caption && <figcaption className="text-[11px] text-gray-600 text-center mt-2 italic">{caption}</figcaption>}
        </figure>
      );
    }
    if (line.startsWith("# ")) return <h2 key={i} className="text-xl font-black text-gray-900 mt-6 mb-2">{line.slice(2)}</h2>;
    if (line.startsWith("## ")) return <h3 key={i} className="text-lg font-bold text-gray-900 mt-4 mb-1.5">{line.slice(3)}</h3>;
    if (line === "---") return <hr key={i} className="border-gray-200 my-6" />;
    if (line.startsWith("• ")) return <li key={i} className="ml-4 list-disc text-gray-800 leading-relaxed">{formatInline(line.slice(2))}</li>;
    if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-gray-800 leading-relaxed">{formatInline(line.replace(/^\d+\.\s/, ""))}</li>;
    if (!line.trim()) return <br key={i} />;
    return <p key={i} className="text-gray-800 leading-[1.8] text-[15px]">{formatInline(line)}</p>;
  });
};

interface Props {
  news: NewsItem;
  categories: { value: string; label: string }[];
  onBack: () => void;
  onShare: (type: string, news: NewsItem) => void;
  publisherName?: string | null;
  publisherPhoto?: string | null;
  otherNews?: NewsItem[];
  onSelectNews?: (news: NewsItem) => void;
  getPublisherName?: (pubId: string | null) => string | null;
  getPublisherPhoto?: (pubId: string | null) => string | null;
}

export default function NewsDetail({ news, categories, onBack, onShare, publisherName, publisherPhoto, otherNews = [], onSelectNews, getPublisherName, getPublisherPhoto }: Props) {
  const embedUrl = news.video_url ? getEmbedUrl(news.video_url) : null;

  return (
    <div className="py-4">
      {/* Main content + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-0 lg:gap-8">
          {/* === Article === */}
          <div>
            {/* Category & date */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                {categories.find(c => c.value === news.category)?.label || news.category}
              </span>
              {news.is_featured && <Star className="h-3 w-3 text-primary fill-primary" />}
              {news.published_at && (
                <span className="text-[10px] text-gray-600 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(news.published_at), "dd MMMM yyyy, hh:mm a", { locale: bn })}
                </span>
              )}
            </div>

            {/* Headline */}
            <h1
              className="text-2xl md:text-4xl font-black text-gray-900 mb-5 leading-tight"
            >
              {news.title}
            </h1>

            {/* Divider */}
            <div className="border-t border-gray-200 mb-4" />

            {/* Publisher byline */}
            {publisherName && (
              <div className="flex items-center gap-2.5 mb-4">
                {publisherPhoto ? (
                  <img src={publisherPhoto} alt={publisherName} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                ) : (
                  <span className="text-lg">✍️</span>
                )}
                <span className="text-sm font-semibold text-gray-700">{publisherName}</span>
              </div>
            )}

            {/* Share bar */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">শেয়ার</span>
              <div className="flex gap-1.5">
                <button onClick={() => onShare("facebook", news)} className="h-7 w-7 rounded-sm bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors">
                  <Facebook className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => onShare("whatsapp", news)} className="h-7 w-7 rounded-sm bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100 transition-colors">
                  <MessageCircle className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => onShare("copy", news)} className="h-7 w-7 rounded-sm bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Featured Image */}
            {news.featured_image_url && (
              <figure className="mb-6">
                <div className="border border-gray-200 overflow-hidden">
                  <img src={news.featured_image_url} alt="" className="w-full h-56 md:h-80 object-cover" />
                </div>
              </figure>
            )}

            {/* Article body */}
            <div className="space-y-1">
              {renderFormattedContent(news.content)}
            </div>

            {/* Embedded Video */}
            {embedUrl && (
              <div className="mt-8">
                <div className="border border-gray-200 overflow-hidden aspect-video">
                  <iframe src={embedUrl} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                </div>
              </div>
            )}

            {/* Bottom share */}
            <div className="flex items-center gap-3 mt-10 pt-4 border-t border-gray-200">
              <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">শেয়ার করুন</span>
              <button onClick={() => onShare("facebook", news)} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Facebook className="h-3 w-3" /> Facebook</button>
              <button onClick={() => onShare("whatsapp", news)} className="text-xs text-green-600 hover:underline flex items-center gap-1"><MessageCircle className="h-3 w-3" /> WhatsApp</button>
              <button onClick={() => onShare("copy", news)} className="text-xs text-gray-700 hover:underline flex items-center gap-1"><Link2 className="h-3 w-3" /> লিংক কপি</button>
            </div>

            {/* Bottom rule */}
            <div className="mt-8 border-t-[3px] border-gray-900" />
          </div>

          {/* === Sidebar: Other News === */}
          {otherNews.length > 0 && (
            <aside className="mt-8 lg:mt-0">
              {/* Sidebar header */}
              <div className="border-t-[3px] border-primary mb-4 lg:mb-0" />
              <div className="lg:sticky lg:top-4">
                <h3
                  className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2 pt-3"
                >
                  <Newspaper className="h-4 w-4 text-primary" />
                  অন্যান্য সংবাদ
                </h3>
                <div className="space-y-0">
                  {otherNews.map((item, idx) => (
                    <article
                      key={item.id}
                      className={`cursor-pointer group py-3 ${idx !== 0 ? "border-t border-gray-200" : ""}`}
                      onClick={() => onSelectNews?.(item)}
                    >
                      <div className="flex gap-3">
                        {item.featured_image_url && (
                          <div className="w-20 h-16 flex-shrink-0 overflow-hidden border border-gray-200 rounded-sm">
                            <img
                              src={item.featured_image_url}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-primary/70 block mb-0.5">
                            {categories.find(c => c.value === item.category)?.label || item.category}
                          </span>
                          <h4
                            className="font-bold text-[13px] text-gray-900 leading-snug line-clamp-2 group-hover:text-primary transition-colors"
                          >
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            {getPublisherName?.(item.publisher_id) && (
                              <span className="text-[9px] text-gray-600">✍️ {getPublisherName(item.publisher_id)}</span>
                            )}
                            {item.published_at && (
                              <span className="text-[9px] text-gray-500 flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                {format(new Date(item.published_at), "dd MMM yyyy")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
  );
}
