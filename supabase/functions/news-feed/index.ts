// Aggregates Bengali news from public RSS feeds.
// Bangladeshi sources are prioritized first.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedSource {
  name: string;
  url: string;
  // Higher weight = more priority (more items shown earlier)
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
  // International (in Bengali)
  { name: "DW বাংলা", url: "https://rss.dw.com/rdf/rss-bn-all", weight: 3, bangladeshi: false },
  { name: "Anandabazar", url: "https://www.anandabazar.com/rss/all-news", weight: 2, bangladeshi: false },
];

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
  // Match both <item>..</item> (RSS) and <entry>..</entry> (Atom)
  const itemRegex = /<(item|entry)[\s\S]*?<\/(item|entry)>/gi;
  const matches = xml.match(itemRegex) || [];
  for (const block of matches.slice(0, 15)) {
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

async function fetchFeed(src: FeedSource) {
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
    return items.map((it) => ({
      ...it,
      source: src.name,
      bangladeshi: src.bangladeshi,
      weight: src.weight,
    }));
  } catch (e) {
    console.error(`Feed failed: ${src.name}`, e instanceof Error ? e.message : e);
    return [];
  }
}

// Simple in-memory cache (per cold start)
let cache: { at: number; data: unknown } | null = null;
const CACHE_MS = 5 * 60 * 1000; // 5 min

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

    // Sort: bangladeshi first, then by weight desc, then by date desc
    all.sort((a, b) => {
      if (a.bangladeshi !== b.bangladeshi) return a.bangladeshi ? -1 : 1;
      if (a.weight !== b.weight) return b.weight - a.weight;
      const da = Date.parse(a.pubDate) || 0;
      const db = Date.parse(b.pubDate) || 0;
      return db - da;
    });

    // Interleave a bit so one source doesn't dominate the start
    const bd = all.filter((x) => x.bangladeshi);
    const intl = all.filter((x) => !x.bangladeshi);
    const interleaved: typeof all = [];
    const ratio = 3; // 3 BD per 1 international
    let i = 0, j = 0;
    while (i < bd.length || j < intl.length) {
      for (let k = 0; k < ratio && i < bd.length; k++) interleaved.push(bd[i++]);
      if (j < intl.length) interleaved.push(intl[j++]);
    }

    const payload = {
      updatedAt: new Date().toISOString(),
      count: interleaved.length,
      items: interleaved.slice(0, 60),
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
