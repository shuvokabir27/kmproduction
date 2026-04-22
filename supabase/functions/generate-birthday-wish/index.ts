const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { full_name, designation, days_until, member_id } = await req.json();
    if (!full_name) {
      return new Response(JSON.stringify({ error: "full_name required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const timing = days_until === 0
      ? "আজ তার জন্মদিন"
      : days_until === 1
        ? "আগামীকাল তার জন্মদিন"
        : `${days_until} দিন পর তার জন্মদিন`;

    const prompt = `তুমি একজন বাংলা কবি ও শুভেচ্ছা লেখক। নিচের সদস্যের জন্য একটি ইউনিক, আন্তরিক, উষ্ণ ও সুন্দর জন্মদিনের শুভেচ্ছা বার্তা লেখো বাংলায়।

সদস্যের নাম: ${full_name}
${designation ? `পদবী: ${designation}` : ""}
সময়: ${timing}

নিয়ম:
- সম্পূর্ণ বাংলায় লেখো
- ৩-৪ লাইনের একটি হৃদয়ছোঁয়া বার্তা
- নাম ব্যক্তিগতভাবে উল্লেখ করো
- ইমোজি ব্যবহার করো (২-৪টি)
- পদবী/পেশার সাথে মিল রেখে কিছু বলো (যদি থাকে)
- শুধু বার্তাটি দাও, অন্য কিছু নয়
- প্রতিবার ভিন্ন স্টাইল ও শব্দ ব্যবহার করো`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "তুমি একজন সৃজনশীল বাংলা শুভেচ্ছা লেখক। প্রতিবার ইউনিক ও আন্তরিক বার্তা লেখো।" },
          { role: "user", content: prompt },
        ],
        temperature: 1.0,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Try again later.", message: errText }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${errText}`);
    }

    const data = await aiResponse.json();
    const message = data.choices?.[0]?.message?.content?.trim() ?? "";

    return new Response(JSON.stringify({ message, member_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
