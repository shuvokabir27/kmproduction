// Generates a fresh, role-aware, day-aware funny Bengali message for the dashboard spotlight.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DAYS_BN = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name = "", designation = "" } = await req.json().catch(() => ({}));
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const now = new Date();
    // Bangladesh time (UTC+6)
    const bdt = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const day = DAYS_BN[bdt.getUTCDay()];
    const hour = bdt.getUTCHours();
    const partOfDay =
      hour < 5 ? "মধ্যরাত" : hour < 11 ? "সকাল" : hour < 15 ? "দুপুর" : hour < 18 ? "বিকাল" : hour < 21 ? "সন্ধ্যা" : "রাত";

    const system = `তুমি একজন বাংলা কমেডিয়ান। KM Production টিমের জন্য একদম নতুন, মজার, ছোট (১ লাইন, ১০-২০ শব্দ) বাংলা মেসেজ লিখো।
নিয়ম:
- কোনো সদস্যের নাম ব্যবহার করো না।
- ব্যক্তির পেশা/রোল অনুযায়ী মজা করো (যেমন: ক্যামেরাম্যান হলে ক্যামেরা, পরিচালক হলে অ্যাকশন/কাট, অভিনেতা হলে ডায়লগ/অভিনয়, প্রোডাকশন হলে ম্যানেজমেন্ট, স্ক্রিপ্ট রাইটার হলে স্ক্রিপ্ট/সিন)।
- দিন/সময় অনুযায়ী মজা করতে পারো (যেমন: শুক্রবার ছুটি, সকালে চা, রাতে ঘুম)।
- ১-২টা ইমোজি দাও।
- শুধু মেসেজটাই দাও, অন্য কিছু না।`;

    const user = `পেশা/রোল: ${designation || "টিম মেম্বার"}
আজ: ${day}, ${partOfDay}
একটা সম্পূর্ণ নতুন ফানি মেসেজ দাও।`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ message: "☕ একটু বিশ্রাম নাও — আমিও দম নিচ্ছি!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      throw new Error(`AI error ${aiRes.status}: ${txt}`);
    }

    const data = await aiRes.json();
    const message = (data?.choices?.[0]?.message?.content || "").trim() || "🌟 আজকের দিনটা দুর্দান্ত হোক!";

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ message: "🎬 অ্যাকশন! আজ ভালো একটা দিন হবে।", error: String(e?.message || e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
