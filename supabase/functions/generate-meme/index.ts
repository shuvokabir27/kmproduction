// Generates a fresh, unique Bengali meme caption for a team member.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { member_id, member_name, designation = "", photo_url = "" } = await req.json();
    if (!member_id || !member_name) {
      return new Response(JSON.stringify({ error: "member_id and member_name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(supaUrl, serviceKey);

    // Fetch existing captions to avoid repeats
    const { data: existing } = await supa.from("memes").select("caption").limit(500);
    const existingSet = new Set((existing || []).map((m: any) => m.caption.trim().toLowerCase()));

    const system = `তুমি একজন বাংলা মিম রাইটার। ছোট, মজার, পাঞ্চলাইন-ওয়ালা বাংলা মিম ক্যাপশন লিখো (১-২ লাইন, ম্যাক্স ১৫ শব্দ)। 
নিয়ম:
- পেশা/রোল অনুযায়ী মজা (যেমন ক্যামেরাম্যান হলে ক্যামেরা/ফোকাস, ডিরেক্টর হলে অ্যাকশন/কাট)।
- ১-২টা ইমোজি।
- শুধু ক্যাপশনটাই দাও, কোনো ব্যাখ্যা না।
- নাম উল্লেখ করতে পারো বা নাও পারো — বেশি ফানি হতে হবে।`;

    let caption = "";
    let captionHash = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: system },
            { role: "user", content: `নাম: ${member_name}\nপেশা: ${designation || "টিম মেম্বার"}\nএকদম নতুন একটা মিম ক্যাপশন দাও। (চেষ্টা ${attempt + 1})` },
          ],
        }),
      });
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit, একটু পর চেষ্টা করো" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI ক্রেডিট শেষ" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!aiRes.ok) throw new Error(`AI error ${aiRes.status}`);
      const data = await aiRes.json();
      const c = (data?.choices?.[0]?.message?.content || "").trim().replace(/^["'`]+|["'`]+$/g, "");
      if (!c) continue;
      const h = await sha256(c);
      if (!existingSet.has(c.trim().toLowerCase())) {
        caption = c;
        captionHash = h;
        break;
      }
    }
    if (!caption) {
      return new Response(JSON.stringify({ error: "নতুন মিম জেনারেট হলো না, আবার চেষ্টা করো" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inserted, error: insErr } = await supa.from("memes").insert({
      member_id, member_name, photo_url, caption, caption_hash: captionHash,
    }).select().single();
    if (insErr) {
      // unique violation = race condition, treat as duplicate
      return new Response(JSON.stringify({ error: "ডুপ্লিকেট, আবার চেষ্টা করো" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ meme: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
