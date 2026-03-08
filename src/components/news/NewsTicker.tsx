import type { NewsItem } from "@/pages/News";

interface TickerItem {
  id: string;
  text: string;
  newsItem: NewsItem | null;
}

interface Props {
  tickerTexts: TickerItem[];
  tickerSpeed: number;
  onSelectNews: (item: TickerItem) => void;
}

export default function NewsTicker({ tickerTexts, tickerSpeed, onSelectNews }: Props) {
  return (
    <div className="my-3 border-y border-border/30 overflow-hidden bg-secondary/20">
      <div className="flex items-stretch">
        <div className="bg-primary text-primary-foreground px-3 py-2 flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider whitespace-nowrap z-10 shrink-0">
          <span className="animate-pulse text-xs">●</span> সর্বশেষ
        </div>
        <div className="overflow-hidden flex-1 relative">
          <div
            className="flex items-center h-full ticker-scroll"
            style={{ animationDuration: `${tickerSpeed}s` }}
          >
            <div className="flex items-center gap-8 whitespace-nowrap px-4 ticker-content">
              {tickerTexts.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectNews(item)}
                  className="text-[13px] text-foreground/80 hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-2"
                  style={{ fontFamily: "'Hind Siliguri', sans-serif" }}
                >
                  <span className="text-primary/50 text-[8px]">■</span>
                  {item.text}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-8 whitespace-nowrap px-4 ticker-content" aria-hidden="true">
              {tickerTexts.map((item) => (
                <button
                  key={`dup-${item.id}`}
                  onClick={() => onSelectNews(item)}
                  className="text-[13px] text-foreground/80 hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-2"
                  style={{ fontFamily: "'Hind Siliguri', sans-serif" }}
                >
                  <span className="text-primary/50 text-[8px]">■</span>
                  {item.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
