// Aggregates Bengali news from public RSS feeds.
// Bangladeshi sources are prioritized; international (English) headlines are
// translated to Bengali using Lovable AI Gateway. Important headlines bubble up;
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
  /** If true, headlines are in English and need to be translated to Bengali. */
  translate?: boolean;
}

const FEEDS: FeedSource[] = [
  // ========= Bangladeshi major newspapers (Bangla — highest priority) =========
  { name: "Prothom Alo", url: "https://www.prothomalo.com/feed", weight: 5, bangladeshi: true },
  { name: "BD Pratidin", url: "https://www.bd-pratidin.com/rss.xml", weight: 5, bangladeshi: true },
  { name: "Jugantor", url: "https://www.jugantor.com/feed/rss.xml", weight: 5, bangladeshi: true },
  { name: "Kaler Kantho", url: "https://www.kalerkantho.com/rss.xml", weight: 5, bangladeshi: true },
  { name: "Ittefaq", url: "https://www.ittefaq.com.bd/rss.xml", weight: 4, bangladeshi: true },
  { name: "Samakal", url: "https://samakal.com/rss.xml", weight: 4, bangladeshi: true },
  { name: "Manab Zamin", url: "https://mzamin.com/rss.xml", weight: 4, bangladeshi: true },
  { name: "Janakantha", url: "https://www.dailyjanakantha.com/rss.xml", weight: 3, bangladeshi: true },
  { name: "Inqilab", url: "https://www.dailyinqilab.com/rss.xml", weight: 3, bangladeshi: true },
  { name: "Naya Diganta", url: "https://www.dailynayadiganta.com/rss.xml", weight: 4, bangladeshi: true },
  { name: "Jaijaidin", url: "https://www.jaijaidinbd.com/rss.xml", weight: 3, bangladeshi: true },
  { name: "Amader Shomoy", url: "https://www.dainikamadershomoy.com/rss.xml", weight: 3, bangladeshi: true },
  { name: "Bhorer Kagoj", url: "https://www.bhorerkagoj.com/rss.xml", weight: 3, bangladeshi: true },
  { name: "Sangbad", url: "https://sangbad.net.bd/rss.xml", weight: 3, bangladeshi: true },
  { name: "Bangla Tribune", url: "https://www.banglatribune.com/feed", weight: 4, bangladeshi: true },
  { name: "BDNews24 Bangla", url: "https://bangla.bdnews24.com/?widgetName=rssfeed&widgetId=1150&getXmlFeed=true", weight: 4, bangladeshi: true },
  { name: "Jago News", url: "https://www.jagonews24.com/rss/rss.xml", weight: 4, bangladeshi: true },
  { name: "Risingbd", url: "https://www.risingbd.com/rss/rss.xml", weight: 3, bangladeshi: true },
  { name: "Banglanews24", url: "https://www.banglanews24.com/rss/rss.xml", weight: 3, bangladeshi: true },
  { name: "Dhaka Post", url: "https://www.dhakapost.com/rss/rss.xml", weight: 3, bangladeshi: true },
  { name: "Daily Bangladesh", url: "https://www.daily-bangladesh.com/rss/rss.xml", weight: 3, bangladeshi: true },
  { name: "Channel 24", url: "https://www.channel24bd.tv/rss/rss.xml", weight: 4, bangladeshi: true },
  { name: "Somoy News", url: "https://www.somoynews.tv/rss/rss.xml", weight: 5, bangladeshi: true },
  { name: "Jamuna TV", url: "https://jamuna.tv/feed", weight: 4, bangladeshi: true },
  { name: "NTV BD", url: "https://www.ntvbd.com/rss.xml", weight: 4, bangladeshi: true },
  { name: "RTV Online", url: "https://www.rtvonline.com/rss/rss.xml", weight: 3, bangladeshi: true },
  { name: "Independent TV", url: "https://www.independent24.com/rss/rss.xml", weight: 3, bangladeshi: true },
  { name: "DBC News", url: "https://dbcnews.tv/feed", weight: 3, bangladeshi: true },
  { name: "ATN News", url: "https://www.atnnewstv.com/feed", weight: 3, bangladeshi: true },
  { name: "Ekattor TV", url: "https://ekattor.tv/feed", weight: 3, bangladeshi: true },
  { name: "News24 BD", url: "https://www.news24bd.tv/rss.xml", weight: 3, bangladeshi: true },
  { name: "Daily Star (BD)", url: "https://www.thedailystar.net/frontpage/rss.xml", weight: 4, bangladeshi: true, translate: true },
  { name: "Dhaka Tribune", url: "https://www.dhakatribune.com/feed", weight: 3, bangladeshi: true, translate: true },
  { name: "New Age BD", url: "https://www.newagebd.net/rss.xml", weight: 3, bangladeshi: true, translate: true },
  { name: "Financial Express BD", url: "https://thefinancialexpress.com.bd/?service=rss", weight: 2, bangladeshi: true, translate: true },
  { name: "Business Standard BD", url: "https://www.tbsnews.net/rss.xml", weight: 3, bangladeshi: true, translate: true },

  // ========= Indian Bangla newspapers =========
  { name: "Anandabazar", url: "https://www.anandabazar.com/rss/all-news", weight: 4, bangladeshi: false },
  { name: "Bartaman", url: "https://bartamanpatrika.com/rss.xml", weight: 3, bangladeshi: false },
  { name: "Ei Samay", url: "https://eisamay.indiatimes.com/rssfeedstopstories.cms", weight: 3, bangladeshi: false },
  { name: "Sangbad Pratidin", url: "https://www.sangbadpratidin.in/feed/", weight: 3, bangladeshi: false },
  { name: "Zee 24 Ghanta", url: "https://zeenews.india.com/bengali/rss/news_xml.xml", weight: 3, bangladeshi: false },
  { name: "ABP Ananda", url: "https://bengali.abplive.com/news/feed", weight: 3, bangladeshi: false },
  { name: "News18 Bangla", url: "https://bengali.news18.com/rss/", weight: 3, bangladeshi: false },
  { name: "Hindustan Times Bangla", url: "https://bangla.hindustantimes.com/rss/feed", weight: 2, bangladeshi: false },

  // ========= Bangla-language international (already in Bangla) =========
  { name: "BBC বাংলা", url: "https://feeds.bbci.co.uk/bengali/rss.xml", weight: 4, bangladeshi: false },
  { name: "DW বাংলা", url: "https://rss.dw.com/rdf/rss-bn-all", weight: 3, bangladeshi: false },
  { name: "VOA বাংলা", url: "https://www.voabangla.com/api/zmgqoeyvyi", weight: 3, bangladeshi: false },

  // ========= Asia (English) — auto-translated to Bengali =========
  // South Asia — India
  { name: "Times of India", url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", weight: 3, bangladeshi: false, translate: true },
  { name: "Hindustan Times", url: "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml", weight: 3, bangladeshi: false, translate: true },
  { name: "The Hindu", url: "https://www.thehindu.com/news/national/feeder/default.rss", weight: 3, bangladeshi: false, translate: true },
  { name: "NDTV", url: "https://feeds.feedburner.com/ndtvnews-world-news", weight: 3, bangladeshi: false, translate: true },
  { name: "India Today", url: "https://www.indiatoday.in/rss/1206578", weight: 2, bangladeshi: false, translate: true },
  // Pakistan
  { name: "Dawn", url: "https://www.dawn.com/feeds/home", weight: 3, bangladeshi: false, translate: true },
  { name: "Geo News", url: "https://www.geo.tv/rss/1/53", weight: 2, bangladeshi: false, translate: true },
  { name: "The News Pakistan", url: "https://www.thenews.com.pk/rss/1/1", weight: 2, bangladeshi: false, translate: true },
  { name: "ARY News", url: "https://arynews.tv/feed/", weight: 2, bangladeshi: false, translate: true },
  // Other South Asia
  { name: "Kathmandu Post", url: "https://kathmandupost.com/rss", weight: 2, bangladeshi: false, translate: true },
  { name: "Daily Mirror SL", url: "https://www.dailymirror.lk/RSS_Feeds/breaking-news", weight: 2, bangladeshi: false, translate: true },
  // East Asia
  { name: "Japan Times", url: "https://www.japantimes.co.jp/feed/", weight: 2, bangladeshi: false, translate: true },
  { name: "South China Morning Post", url: "https://www.scmp.com/rss/91/feed", weight: 2, bangladeshi: false, translate: true },
  { name: "Korea Herald", url: "https://www.koreaherald.com/rss/02000000.xml", weight: 2, bangladeshi: false, translate: true },
  // Southeast Asia
  { name: "Channel News Asia", url: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml", weight: 2, bangladeshi: false, translate: true },
  { name: "Bangkok Post", url: "https://www.bangkokpost.com/rss/data/topstories.xml", weight: 2, bangladeshi: false, translate: true },
  { name: "Jakarta Post", url: "https://www.thejakartapost.com/rss", weight: 2, bangladeshi: false, translate: true },
  // Middle East / West Asia
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", weight: 3, bangladeshi: false, translate: true },
  { name: "Arab News", url: "https://www.arabnews.com/rss.xml", weight: 2, bangladeshi: false, translate: true },
  { name: "Times of Israel", url: "https://www.timesofisrael.com/feed/", weight: 2, bangladeshi: false, translate: true },

  // ========= Major world (English) — auto-translated to Bengali =========
  { name: "BBC World", url: "http://feeds.bbci.co.uk/news/world/rss.xml", weight: 3, bangladeshi: false, translate: true },
  { name: "CNN World", url: "http://rss.cnn.com/rss/edition_world.rss", weight: 2, bangladeshi: false, translate: true },
  { name: "NYT World", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", weight: 2, bangladeshi: false, translate: true },
  { name: "The Guardian", url: "https://www.theguardian.com/world/rss", weight: 2, bangladeshi: false, translate: true },
  { name: "AP News", url: "https://apnews.com/index.rss", weight: 3, bangladeshi: false, translate: true },
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
  needsTranslation?: boolean;
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
        needsTranslation: src.translate === true,
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

/**
 * Translate a batch of English headlines to Bengali using Lovable AI Gateway.
 * Returns a map of original -> translated. Falls back to originals on failure.
 */
async function translateHeadlines(titles: string[]): Promise<Record<string, string>> {
  if (titles.length === 0) return {};
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.warn("LOVABLE_API_KEY missing — skipping translation");
    return {};
  }
  console.log(`[translate] starting for ${titles.length} headlines`);

  // De-duplicate
  const unique = Array.from(new Set(titles));
  const numbered = unique.map((t, i) => `${i + 1}. ${t}`).join("\n");

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "You translate news headlines into natural, concise Bengali (বাংলা) suitable for a scrolling news ticker. " +
              "RULES:\n" +
              "1. Keep proper nouns transliterated naturally (USA→যুক্তরাষ্ট্র, Trump→ট্রাম্প, Iran→ইরান, China→চীন).\n" +
              "2. Use ENGLISH numerals (1, 2, 3) for the line numbers — NOT Bengali numerals.\n" +
              "3. Output format: each line MUST start with 'N. ' where N is the English number, then the Bengali translation.\n" +
              "4. Output exactly the same number of lines as input, in the same order.\n" +
              "5. NO commentary, NO English in translations, NO empty lines.\n" +
              "6. Keep each headline short and punchy — under 80 characters where possible.",
          },
          { role: "user", content: numbered },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[translate] AI failed:", res.status, errText);
      return {};
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    console.log(`[translate] received content sample:`, content.slice(0, 300));
    const lines = content
      .split("\n")
      .map((l: string) => l.trim())
      .filter(Boolean);

    // Convert Bengali numerals to English for parsing
    const bnToEn = (s: string) =>
      s.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));

    const map: Record<string, string> = {};
    for (const line of lines) {
      const normalized = bnToEn(line);
      // Accept "1. text", "1) text", "1: text", or "1 - text"
      const m = normalized.match(/^(\d+)\s*[.):\-]\s*(.+)$/);
      if (!m) continue;
      const idx = parseInt(m[1], 10) - 1;
      if (idx >= 0 && idx < unique.length) {
        // Take the translation from the ORIGINAL line (preserving Bengali text),
        // just stripping the numbered prefix.
        const stripped = line.replace(/^[\d০-৯]+\s*[.):\-]\s*/, "").trim();
        if (stripped) map[unique[idx]] = stripped;
      }
    }
    console.log(`[translate] parsed ${Object.keys(map).length}/${unique.length} translations`);
    return map;
  } catch (e) {
    console.error("translateHeadlines error", e instanceof Error ? e.message : e);
    return {};
  }
}

// Cache (per cold start). Shorter cache so randomization feels fresh.
let cache: { at: number; data: unknown } | null = null;
const CACHE_MS = 5 * 60 * 1000; // 5 min (translations cost AI credits)

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

    // Guarantee international coverage: reserve slots for international (English) news.
    // Bangladeshi feeds remain dominant but world headlines are always present.
    const intl = scored.filter((it) => it.needsTranslation);
    const local = scored.filter((it) => !it.needsTranslation);

    const intlPick = intl.slice(0, 30); // up to 30 international (Asia + world)
    const localPick = local.slice(0, 60); // up to 60 local/Bangla

    // Re-sort the combined pool by score, then split top vs shuffled rest
    const combined = [...localPick, ...intlPick].sort((a, b) => b._score - a._score);
    const top = combined.slice(0, 25);
    const rest = shuffle(combined.slice(25, 90));
    const merged = [...top, ...rest];

    // Ensure no two consecutive items share the same source
    const final = dedupeConsecutiveSource(merged);

    // Translate English headlines (only the ones in final list, to save credits)
    const englishTitles = final
      .filter((it) => it.needsTranslation)
      .map((it) => it.title);
    const translations = await translateHeadlines(englishTitles);

    const payload = {
      updatedAt: new Date().toISOString(),
      count: final.length,
      items: final.map(({ _score, importance, recencyHours, weight, needsTranslation, ...rest }) => ({
        ...rest,
        title: needsTranslation && translations[rest.title] ? translations[rest.title] : rest.title,
      })),
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
