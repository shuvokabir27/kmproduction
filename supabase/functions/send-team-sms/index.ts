// Send SMS to KM team members for payment/attendance notifications
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function normalizePhone(p: string): string | null {
  const digits = String(p || "").replace(/\D/g, "");
  if (!digits) return null;
  // Accept 01XXXXXXXXX, 1XXXXXXXXX, +8801XXXXXXXXX, or 8801XXXXXXXXX.
  if (digits.length === 11 && digits.startsWith("01")) return "88" + digits;
  if (digits.length === 10 && digits.startsWith("1")) return "880" + digits;
  if (digits.length === 13 && digits.startsWith("8801")) return digits;
  return null;
}

async function sendOne(phone: string, message: string) {
  const apiKey = Deno.env.get("BULK_SMS_API_KEY");
  const senderId = Deno.env.get("BULK_SMS_SENDER_ID");
  if (!apiKey || !senderId) return { ok: false, error: "SMS provider not configured" };
  // Auto-detect: if message has any non-ASCII char (e.g. Bengali), use unicode mode.
  // Otherwise BulkSMSBD charges but does not deliver the message.
  const isUnicode = /[^\x00-\x7F]/.test(message);
  const type = isUnicode ? "unicode" : "text";
  const url = `http://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(apiKey)}&type=${type}&number=${encodeURIComponent(phone)}&senderid=${encodeURIComponent(senderId)}&message=${encodeURIComponent(message)}`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { /* Provider may return plain text */ }
    const providerAccepted = parsed
      ? Number(parsed.response_code) === 202
      : /(^|\D)202($|\D)|submitted|success/i.test(text);
    return { ok: res.ok && providerAccepted, status: res.status, type, response: parsed || text };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    // Accept either { member_id, message } or { member_ids: [], message } or { phone, message }
    const message = String(body.message || "").trim();
    if (!message) {
      return new Response(JSON.stringify({ error: "message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let phones: string[] = [];

    if (body.phone) {
      const n = normalizePhone(String(body.phone));
      if (n) phones.push(n);
    }

    const ids: string[] = [];
    if (body.member_id) ids.push(String(body.member_id));
    if (Array.isArray(body.member_ids)) ids.push(...body.member_ids.map((x: any) => String(x)));

    if (ids.length > 0) {
      const { data } = await supabase.from("profiles").select("sms_mobile, phone, whatsapp_no, bkash_no, nagad_no").in("id", ids);
      for (const row of data || []) {
        const n = normalizePhone((row as any).sms_mobile || (row as any).phone || (row as any).whatsapp_no || (row as any).bkash_no || (row as any).nagad_no || "");
        if (n) phones.push(n);
      }
    }

    phones = Array.from(new Set(phones));
    if (phones.length === 0) {
      return new Response(JSON.stringify({ sent: 0, skipped: true, reason: "no valid phones" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = await Promise.all(phones.map((p) => sendOne(p, message)));
    const sent = results.filter((r) => r.ok).length;
    return new Response(JSON.stringify({ sent, total: phones.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
