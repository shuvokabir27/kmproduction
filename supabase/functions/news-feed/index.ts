// Aggregates Bengali news from public RSS feeds.
// Bangladeshi sources are prioritized; important headlines bubble up;
// consecutive items from the same source are avoided.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedSource {
  name: string;
  url: string;
  weight: number;
  bangladeshi: boolean;
}

const FEEDS: FeedSource[] = [
  // Bangladeshi (highest priority)
  { name: "Prothom Alo", url: "https://www.prothomalo.com/feed", weight: 5, bangladeshi: true },
  { name: "BD Pratidin", url: "https://www.bd-pratidin.com/rss.xml", weight: 4, bangladeshi: true },
  { name: "Jugantor", url: "https://www.jugantor.com/feed/rss.xml", weight: 4, bangladeshi: true },
  { name: "Kaler Kantho", url: "https://www.kalerkantho.com/rss.xml", weight: 4, bangladeshi: true },
  { name: "BBC বাংলা", url: "https://feeds.bbci.co.uk/bengali/rss.xml", weight: 4, bangladeshi: false },
  { name: "DW বাংলা", url: "https://rss.dw.com/rdf/rss-bn-all", weight: 3, bangladeshi: false },
  { name: "Anandabazar", url: "https://www.anandabazar.com/rss/all-news", weight: 2, bangladeshi: false },
];

// Keywords that indicate "important" news — score boost
const IMPORTANT_KEYWORDS = [
  // Breaking / urgent
  "ব্রেকিং", "জরুরি", "জরুরী", "সর্বশেষ", "তাৎক্ষণিক",
  // Political / national
  "প্রধানমন্ত্রী", "রাষ্ট্রপতি", "সরকার", "নির্বাচন", "সংসদ", "মন্ত্রী",
  "বিএনপি", "আওয়ামী", "জামায়াত", "রাজনীতি",
  // Disaster / emergency
  "নিহত", "মৃত্যু", "হত্যা", "আগুন", "বিস্ফোরণ", "ভূমিকম্প", "বন্যা",
  "ঘূর্ণিঝড়", "দুর্ঘটনা", "সংঘর্ষ", "হামলা", "গ্রেপ্তার",
  // International major
  "যুক্তরাষ্ট্র", "চীন", "ভারত", "রাশিয়া", "ইসরায়েল", "ফিলিস্তিন",
  "ইউক্রেন", "যুদ্ধ", "জাতিসংঘ",
  // Economy
  "ডলার", "শেয়ার", "বাজেট", "অর্থনীতি", "মূল্যস্ফীতি",
];

function importanceScore(title: string): number {
  let score = 0;
  for (const kw of IMPORTANT_KEYWORDS) {
    if (title.includes(kw)) score += 2;
  }
  // Short, punchy headlines often = breaking news
  if (title.length < 50) score += 1;
  return score;
}

function stripTags(s: string): string {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function extractItems(xml: string): Array<{ title: string; link: string; pubDate: string }> {
  const items: Array<{ title: string; link: string; pubDate: string }> = [];
  const itemRegex = /<(item|entry)[\s\S]*?<\/(item|entry)>/gi;
  const matches = xml.match(itemRegex) || [];
  for (const block of matches.slice(0, 20)) {
    const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkMatch =
      block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) ||
      block.match(/<link[^>]*href=["']([^"']+)["']/i);
    const dateMatch =
      block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
      block.match(/<published[^>]*>([\s\S]*?)<\/published>/i) ||
      block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i);
    if (!titleMatch) continue;
    const title = stripTags(titleMatch[1]);
    if (!title || title.length < 5) continue;
    items.push({
      title,
      link: linkMatch ? stripTags(linkMatch[1]) : "",
      pubDate: dateMatch ? stripTags(dateMatch[1]) : "",
    });
  }
  return items;
}

interface EnrichedItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  bangladeshi: boolean;
  weight: number;
  importance: number;
  recencyHours: number;
}

async function fetchFeed(src: FeedSource): Promise<EnrichedItem[]> {
  try {
    const res = await fetch(src.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; KMProductionNewsBot/1.0; +https://kmproduction.lovable.app)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = extractItems(xml);
    const now = Date.now();
    return items.map((it) => {
      const ts = Date.parse(it.pubDate) || now;
      const recencyHours = Math.max(0, (now - ts) / (1000 * 60 * 60));
      return {
        ...it,
        source: src.name,
        bangladeshi: src.bangladeshi,
        weight: src.weight,
        importance: importanceScore(it.title),
        recencyHours,
      };
    });
  } catch (e) {
    console.error(`Feed failed: ${src.name}`, e instanceof Error ? e.message : e);
    return [];
  }
}

// Fisher-Yates shuffle (with optional weight bias via score-based jitter)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick items so that no two consecutive items share the same source.
 * Greedy: at each step, pick the highest-ranked item whose source != previous source.
 */
function dedupeConsecutiveSource(items: EnrichedItem[]): EnrichedItem[] {
  const pool = [...items];
  const result: EnrichedItem[] = [];
  let lastSource = "";
  while (pool.length > 0) {
    let pickIdx = pool.findIndex((x) => x.source !== lastSource);
    if (pickIdx === -1) pickIdx = 0; // only one source left — accept
    const [picked] = pool.splice(pickIdx, 1);
    result.push(picked);
    lastSource = picked.source;
  }
  return result;
}

// Cache (per cold start). Shorter cache so randomization feels fresh.
let cache: { at: number; data: unknown } | null = null;
const CACHE_MS = 3 * 60 * 1000; // 3 min

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (cache && Date.now() - cache.at < CACHE_MS) {
      return new Response(JSON.stringify(cache.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }

    const results = await Promise.all(FEEDS.map(fetchFeed));
    const all = results.flat();

    // Compute composite score:
    //   - Bangladeshi gets a big boost
    //   - importance keywords boost
    //   - source weight boost
    //   - recency boost (newer = higher)
    //   - random jitter so order varies between refreshes
    const scored = all.map((it) => {
      const bdBoost = it.bangladeshi ? 6 : 0;
      const recencyBoost = Math.max(0, 8 - it.recencyHours * 0.5); // ~8 pts when fresh, decays
      const jitter = Math.random() * 4; // 0..4
      const score = bdBoost + it.weight + it.importance * 1.5 + recencyBoost + jitter;
      return { ...it, _score: score };
    });

    // Sort by score desc
    scored.sort((a, b) => b._score - a._score);

    // Take top 60, then split: top 20 "important" stays at front (still de-duped),
    // remaining are shuffled randomly so order changes per refresh.
    const top = scored.slice(0, 20);
    const rest = shuffle(scored.slice(20, 60));
    const merged = [...top, ...rest];

    // Ensure no two consecutive items share the same source
    const final = dedupeConsecutiveSource(merged);

    const payload = {
      updatedAt: new Date().toISOString(),
      count: final.length,
      items: final.map(({ _score, importance, recencyHours, weight, ...rest }) => rest),
    };

    cache = { at: Date.now(), data: payload };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  } catch (e) {
    console.error("news-feed error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
