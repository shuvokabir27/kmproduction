// Member / Client password reset via OTP (SMS)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function hash(otp: string, phone: string) {
  const data = new TextEncoder().encode(`kmreset:${phone}:${otp}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
const bad = (e: string, s = 400) => ok({ error: e }, s);

function normalizeBdPhone(input: string): string | null {
  const digits = String(input || "").replace(/\D/g, "");
  // Accept 11-digit local (01XXXXXXXXX) or 13-digit (8801XXXXXXXXX)
  if (digits.length === 11 && digits.startsWith("01")) return digits;
  if (digits.length === 13 && digits.startsWith("8801")) return digits.slice(2);
  return null;
}

async function findUser(scope: "member" | "client", identifier: string) {
  if (scope === "member") {
    const memberId = parseInt(identifier.trim(), 10);
    if (Number.isFinite(memberId)) {
      const { data } = await supabase.from("profiles")
        .select("user_id, phone, full_name")
        .eq("member_id", memberId).maybeSingle();
      if (data) {
        const phone = normalizeBdPhone(data.phone || "");
        if (phone) return { user_id: data.user_id, phone, name: data.full_name || "" };
      }
    }
    return null;
  }
  // scope === "client" — identifier is phone. Try client_profiles first, then members by phone.
  const phone = normalizeBdPhone(identifier);
  if (!phone) return null;
  const { data: client } = await supabase.from("client_profiles")
    .select("user_id, phone, name")
    .eq("phone", phone).maybeSingle();
  if (client?.user_id) return { user_id: client.user_id, phone, name: client.name || "" };

  // Fallback: phone may belong to a member. Try both 11-digit and +880 forms.
  const { data: member } = await supabase.from("profiles")
    .select("user_id, phone, full_name")
    .or(`phone.eq.${phone},phone.eq.+88${phone},phone.eq.88${phone}`).maybeSingle();
  if (member?.user_id) return { user_id: member.user_id, phone, name: member.full_name || "" };
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const action = String(body.action || "");
    const scope = (String(body.scope || "") as "member" | "client");
    if (!["member", "client"].includes(scope)) return bad("scope ভুল");

    if (action === "request_otp") {
      const identifier = String(body.identifier || "").trim();
      if (!identifier) return bad("Please enter your ID / mobile number");

      const found = await findUser(scope, identifier);
      if (!found) return bad("No account found with this information or phone number not set", 404);

      const phone = found.phone;

      // Rate limit: max 3 per phone in last 10 min
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count } = await supabase.from("password_reset_otps")
        .select("id", { count: "exact", head: true })
        .eq("scope", scope).eq("phone", phone).gte("created_at", tenMinAgo);
      if ((count || 0) >= 3) return bad("Too many attempts, please try again after 10 minutes", 429);

      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const otp_hash = await hash(otp, phone);
      const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await supabase.from("password_reset_otps").insert({ scope, phone, otp_hash, expires_at });

      const SMS_API_KEY = Deno.env.get("BULK_SMS_API_KEY");
      const SENDER_ID = Deno.env.get("BULK_SMS_SENDER_ID");
      if (!SMS_API_KEY || !SENDER_ID) return bad("SMS service not configured", 500);

      const brand = scope === "client" ? "KM Shop" : "KM Production";
      const message = `Your ${brand} password reset OTP is: ${otp}\nValid for 5 minutes. Do not share with anyone.`;
      const smsUrl = `http://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(SMS_API_KEY)}&type=text&number=${encodeURIComponent(phone)}&senderid=${encodeURIComponent(SENDER_ID)}&message=${encodeURIComponent(message)}`;

      try {
        const r = await fetch(smsUrl);
        const t = await r.text();
        console.log("BulkSMSBD:", r.status, t);
        let parsed: any = null;
        try { parsed = JSON.parse(t); } catch { /* */ }
        if (parsed && parsed.response_code && parsed.response_code !== 202) {
          return bad(`Failed to send SMS: ${parsed.error_message || t}`, 500);
        }
      } catch (e: any) {
        console.error("SMS error", e);
        return bad("Problem sending SMS: " + (e?.message || ""), 500);
      }

      // Mask the phone in response: 01XXX***XXXX
      const masked = phone.slice(0, 5) + "***" + phone.slice(-3);
      return ok({ ok: true, message: "OTP sent successfully", masked_phone: masked, expires_in: 300 });
    }

    if (action === "reset_with_otp") {
      const identifier = String(body.identifier || "").trim();
      const otp = String(body.otp || "").replace(/\D/g, "");
      const newPassword = String(body.new_password || "");
      if (otp.length !== 6) return bad("Please enter a 6-digit OTP");
      if (newPassword.length < 6) return bad("New password must be at least 6 characters");

      const found = await findUser(scope, identifier);
      if (!found) return bad("Account not found", 404);

      const { data: row } = await supabase.from("password_reset_otps")
        .select("id, otp_hash, expires_at, attempts, used_at")
        .eq("scope", scope).eq("phone", found.phone).is("used_at", null)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!row) return bad("OTP not found, please request a new one");
      if (new Date(row.expires_at) < new Date()) return bad("OTP has expired, please request a new one");
      if (row.attempts >= 5) return bad("Too many failed attempts, please request a new OTP", 429);

      const otpHash = await hash(otp, found.phone);
      if (otpHash !== row.otp_hash) {
        await supabase.from("password_reset_otps").update({ attempts: row.attempts + 1 }).eq("id", row.id);
        return bad("Invalid OTP");
      }

      const { error } = await supabase.auth.admin.updateUserById(found.user_id, { password: newPassword });
      if (error) return bad(error.message, 500);

      await supabase.from("password_reset_otps").update({ used_at: new Date().toISOString() }).eq("id", row.id);
      return ok({ ok: true, message: "Password reset successfully. Please log in now." });
    }

    return bad("Unknown action");
  } catch (e: any) {
    console.error(e);
    return bad(e?.message || "Server error", 500);
  }
});
