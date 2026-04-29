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
  const title = news.title || "দৈনিক ইন্তেকাল";
  const description = news.excerpt || news.content?.substring(0, 160) || "বাংলা ভাইরাল নিউজ";
  const image = news.featured_image_url || `${siteUrl}/favicon.png`;

  // Check if request is from a social media crawler
  const userAgent = req.headers.get("user-agent") || "";
  const isCrawler = /facebookexternalhit|Facebot|Twitterbot|WhatsApp|LinkedInBot|Slackbot|TelegramBot|Pinterest|Discordbot/i.test(userAgent);

  if (!isCrawler) {
    // Regular user - redirect immediately
    return new Response(null, {
      status: 302,
      headers: {
        "Location": redirectUrl,
        ...corsHeaders,
      },
    });
  }

  // Crawler - serve OG meta tags
  const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${escapeHtml(redirectUrl)}" />
  <meta property="og:site_name" content="দৈনিক ইন্তেকাল" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <p>${escapeHtml(title)}</p>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...corsHeaders,
    },
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
