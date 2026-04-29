import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const postNumber = url.searchParams.get("post_number");
  const newsId = url.searchParams.get("id");

  if (!category && !postNumber && !newsId) {
    return new Response("Missing news identifier", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let query = supabase
    .from("news")
    .select("id, title, excerpt, featured_image_url, content, category, post_number")
    .eq("is_published", true);

  if (category && postNumber) {
    query = query.eq("category", category).eq("post_number", parseInt(postNumber));
  } else if (newsId) {
    query = query.eq("id", newsId);
  }

  const { data: news, error } = await query.single();

  if (error || !news) {
    return new Response("News not found", { status: 404 });
  }

  const siteUrl = "https://kmproduction.lovable.app";
  const redirectUrl = news.post_number 
    ? `${siteUrl}/news/${encodeURIComponent(news.category)}/${news.post_number}`
    : `${siteUrl}/news?id=${news.id}`;
  const shareUrl = `${supabaseUrl}/functions/v1/og-news${url.search}`;
  const title = news.title || "দৈনিক ইন্তেকাল";
  const description = news.excerpt || news.content?.substring(0, 160) || "বাংলা ভাইরাল নিউজ";
  const image = news.featured_image_url || `${siteUrl}/favicon.png`;

  // Always serve OG HTML with meta refresh.
  // Crawlers will read OG tags; real users will be redirected via meta refresh + JS.
  const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeHtml(title)}" />
  <meta property="og:url" content="${escapeHtml(shareUrl)}" />
  <meta property="og:site_name" content="দৈনিক ইন্তেকাল" />
  <link rel="canonical" href="${escapeHtml(shareUrl)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <meta name="description" content="${escapeHtml(description)}" />
  <meta http-equiv="refresh" content="0; url=${escapeHtml(redirectUrl)}" />
  <title>${escapeHtml(title)}</title>
  <script>window.location.replace(${JSON.stringify(redirectUrl)});</script>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <p><a href="${escapeHtml(redirectUrl)}">Continue to article</a></p>
</body>
</html>`;

  const responseHeaders = new Headers();
  responseHeaders.set("Content-Type", "text/html; charset=UTF-8");
  responseHeaders.set("Cache-Control", "public, max-age=300, s-maxage=86400");
  responseHeaders.set("Access-Control-Allow-Origin", "*");
  responseHeaders.set("X-Content-Type-Options", "nosniff");

  return new Response(html, {
    status: 200,
    headers: responseHeaders,
  });
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
