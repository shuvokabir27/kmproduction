import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Star, Share2, Facebook, MessageCircle, Copy, Link2, Clock } from "lucide-react";
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
          <img src={url} alt={caption} className="border border-border/20 object-contain" style={{ width: `${Math.min(size, 100)}%`, maxWidth: "100%" }} />
          {caption && <figcaption className="text-[11px] text-muted-foreground text-center mt-2 italic">{caption}</figcaption>}
        </figure>
      );
    }
    if (line.startsWith("# ")) return <h2 key={i} className="text-xl font-black text-foreground mt-6 mb-2" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>{line.slice(2)}</h2>;
    if (line.startsWith("## ")) return <h3 key={i} className="text-lg font-bold text-foreground mt-4 mb-1.5">{line.slice(3)}</h3>;
    if (line === "---") return <hr key={i} className="border-border/20 my-6" />;
    if (line.startsWith("• ")) return <li key={i} className="ml-4 list-disc text-foreground/85 leading-relaxed">{formatInline(line.slice(2))}</li>;
    if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-foreground/85 leading-relaxed">{formatInline(line.replace(/^\d+\.\s/, ""))}</li>;
    if (!line.trim()) return <br key={i} />;
    return <p key={i} className="text-foreground/85 leading-[1.8] text-[15px]" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>{formatInline(line)}</p>;
  });
};

interface Props {
  news: NewsItem;
  categories: { value: string; label: string }[];
  onBack: () => void;
  onShare: (type: string, news: NewsItem) => void;
  publisherName?: string | null;
}

export default function NewsDetail({ news, categories, onBack, onShare, publisherName }: Props) {
  const embedUrl = news.video_url ? getEmbedUrl(news.video_url) : null;

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Top rule */}
        <div className="border-t-[3px] border-foreground/80 mb-4" />

        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 gap-1.5 text-muted-foreground hover:text-foreground -ml-2">
          <ArrowLeft className="h-4 w-4" /> সংবাদ তালিকা
        </Button>

        {/* Category & date */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            {categories.find(c => c.value === news.category)?.label || news.category}
          </span>
          {news.is_featured && <Star className="h-3 w-3 text-primary fill-primary" />}
          {news.published_at && (
            <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(news.published_at), "dd MMMM yyyy, hh:mm a", { locale: bn })}
            </span>
          )}
        </div>

        {/* Headline */}
        <h1
          className="text-2xl md:text-4xl font-black text-foreground mb-5 leading-tight"
          style={{ fontFamily: "'Hind Siliguri', sans-serif" }}
        >
          {news.title}
        </h1>

        {/* Divider */}
        <div className="border-t border-border/30 mb-5" />

        {/* Share bar */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">শেয়ার</span>
          <div className="flex gap-1.5">
            <button onClick={() => onShare("facebook", news)} className="h-7 w-7 rounded-sm bg-blue-600/10 text-blue-400 flex items-center justify-center hover:bg-blue-600/20 transition-colors">
              <Facebook className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onShare("whatsapp", news)} className="h-7 w-7 rounded-sm bg-green-600/10 text-green-400 flex items-center justify-center hover:bg-green-600/20 transition-colors">
              <MessageCircle className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onShare("copy", news)} className="h-7 w-7 rounded-sm bg-secondary text-muted-foreground flex items-center justify-center hover:bg-secondary/80 transition-colors">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Featured Image */}
        {news.featured_image_url && (
          <figure className="mb-6">
            <div className="border border-border/20 overflow-hidden">
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
            <div className="border border-border/20 overflow-hidden aspect-video">
              <iframe src={embedUrl} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
            </div>
          </div>
        )}

        {/* Bottom share */}
        <div className="flex items-center gap-3 mt-10 pt-4 border-t border-border/20">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">শেয়ার করুন</span>
          <button onClick={() => onShare("facebook", news)} className="text-xs text-blue-400 hover:underline flex items-center gap-1"><Facebook className="h-3 w-3" /> Facebook</button>
          <button onClick={() => onShare("whatsapp", news)} className="text-xs text-green-400 hover:underline flex items-center gap-1"><MessageCircle className="h-3 w-3" /> WhatsApp</button>
          <button onClick={() => onShare("copy", news)} className="text-xs text-muted-foreground hover:underline flex items-center gap-1"><Link2 className="h-3 w-3" /> লিংক কপি</button>
        </div>

        {/* Bottom rule */}
        <div className="mt-8 border-t-[3px] border-foreground/80" />
      </div>
    </div>
  );
}
