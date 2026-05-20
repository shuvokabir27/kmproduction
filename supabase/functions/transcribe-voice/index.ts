// Transcribe voice note clip using Lovable AI (Gemini supports audio)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { clipId } = await req.json();
    if (!clipId) throw new Error("clipId required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get clip
    const { data: clip, error: clipErr } = await supabase
      .from("voice_note_clips")
      .select("audio_path")
      .eq("id", clipId)
      .single();
    if (clipErr || !clip) throw new Error(clipErr?.message || "Clip not found");

    // Mark processing
    await supabase.from("voice_note_clips")
      .update({ transcript_status: "processing" })
      .eq("id", clipId);

    // Download audio
    const { data: audioData, error: dlErr } = await supabase.storage
      .from("voice-notes")
      .download(clip.audio_path);
    if (dlErr || !audioData) throw new Error(dlErr?.message || "Download failed");

    const buf = new Uint8Array(await audioData.arrayBuffer());
    // base64 encode
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) {
      bin += String.fromCharCode.apply(null, buf.subarray(i, i + chunk) as any);
    }
    const base64 = btoa(bin);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a Bengali speech-to-text transcriber. Transcribe the audio exactly as spoken in Bengali script. If the speaker speaks English words, keep them as-is. Output ONLY the transcription text, no commentary, no prefixes, no quotes.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "এই অডিওটি বাংলায় হুবহু লিখুন:" },
              {
                type: "input_audio",
                input_audio: { data: base64, format: "webm" },
              },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      await supabase.from("voice_note_clips")
        .update({ transcript_status: "failed" })
        .eq("id", clipId);
      return new Response(
        JSON.stringify({ error: aiRes.status === 429 ? "Rate limited" : aiRes.status === 402 ? "Credits required" : "Transcription failed" }),
        { status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiRes.json();
    const transcript = aiData?.choices?.[0]?.message?.content?.trim() || "";

    await supabase.from("voice_note_clips")
      .update({ transcript, transcript_status: "done" })
      .eq("id", clipId);

    return new Response(JSON.stringify({ transcript }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("transcribe-voice error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
