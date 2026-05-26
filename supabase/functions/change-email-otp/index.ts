// Member email change via OTP sent to their mobile.
// Caller must be authenticated and changes own email only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(supabaseUrl, serviceRoleKey);

async function hash(otp: string, phone: string) {
  const data = new TextEncoder().encode(`kmemailchange:${phone}:${otp}`);
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
  if (digits.length === 11 && digits.startsWith("01")) return digits;
  if (digits.length === 13 && digits.startsWith("8801")) return digits.slice(2);
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return bad("Unauthorized", 401);

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) return bad("Unauthorized", 401);

    const body = await req.json();
    const action = String(body.action || "");

    // Fetch caller's profile (for phone)
    const { data: profile } = await admin.from("profiles")
      .select("id, phone, sms_mobile, whatsapp_no, full_name")
      .eq("user_id", user.id).maybeSingle();
    if (!profile) return bad("প্রোফাইল পাওয়া যায়নি", 404);

    const phone = normalizeBdPhone(profile.sms_mobile || profile.phone || profile.whatsapp_no || "");
    if (!phone) return bad("আপনার প্রোফাইলে মোবাইল নম্বর সেট করা নেই। অ্যাডমিনের সাথে যোগাযোগ করুন।", 400);

    if (action === "request_otp") {
      const newEmail = String(body.new_email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return bad("সঠিক ইমেইল দিন");

      // Rate limit: max 3 per phone in last 10 min
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count } = await admin.from("password_reset_otps")
        .select("id", { count: "exact", head: true })
        .eq("scope", "email_change").eq("phone", phone).gte("created_at", tenMinAgo);
      if ((count || 0) >= 3) return bad("অনেকবার চেষ্টা করেছেন, ১০ মিনিট পর আবার চেষ্টা করুন", 429);

      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const otp_hash = await hash(otp, phone);
      const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await admin.from("password_reset_otps").insert({ scope: "email_change", phone, otp_hash, expires_at });

      const SMS_API_KEY = Deno.env.get("BULK_SMS_API_KEY");
      const SENDER_ID = Deno.env.get("BULK_SMS_SENDER_ID");
      if (!SMS_API_KEY || !SENDER_ID) return bad("SMS সার্ভিস কনফিগার করা নেই", 500);

      const message = `Apnar KM Production email change OTP: ${otp}\n5 minute er moddhe babohar korun. Karo sathe share korben na.`;
      const smsUrl = `http://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(SMS_API_KEY)}&type=text&number=${encodeURIComponent(phone)}&senderid=${encodeURIComponent(SENDER_ID)}&message=${encodeURIComponent(message)}`;
      try {
        const r = await fetch(smsUrl);
        const t = await r.text();
        console.log("BulkSMSBD:", r.status, t);
        let parsed: any = null;
        try { parsed = JSON.parse(t); } catch { /* */ }
        if (parsed && parsed.response_code && parsed.response_code !== 202) {
          return bad(`SMS পাঠানো যায়নি: ${parsed.error_message || t}`, 500);
        }
      } catch (e: any) {
        return bad("SMS পাঠাতে সমস্যা: " + (e?.message || ""), 500);
      }

      const masked = phone.slice(0, 5) + "***" + phone.slice(-3);
      return ok({ ok: true, message: "OTP পাঠানো হয়েছে", masked_phone: masked, expires_in: 300 });
    }

    if (action === "verify_and_change") {
      const newEmail = String(body.new_email || "").trim().toLowerCase();
      const otp = String(body.otp || "").replace(/\D/g, "");
      if (otp.length !== 6) return bad("৬ ডিজিটের OTP দিন");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return bad("সঠিক ইমেইল দিন");

      const { data: row } = await admin.from("password_reset_otps")
        .select("id, otp_hash, expires_at, attempts, used_at")
        .eq("scope", "email_change").eq("phone", phone).is("used_at", null)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!row) return bad("OTP পাওয়া যায়নি, আবার অনুরোধ করুন");
      if (new Date(row.expires_at) < new Date()) return bad("OTP এর মেয়াদ শেষ, নতুন OTP নিন");
      if (row.attempts >= 5) return bad("অনেকবার ভুল চেষ্টা হয়েছে, নতুন OTP নিন", 429);

      const otpHash = await hash(otp, phone);
      if (otpHash !== row.otp_hash) {
        await admin.from("password_reset_otps").update({ attempts: row.attempts + 1 }).eq("id", row.id);
        return bad("OTP ভুল");
      }

      const { error: authError } = await admin.auth.admin.updateUserById(user.id, { email: newEmail, email_confirm: true });
      if (authError) return bad(authError.message, 400);

      await admin.from("profiles").update({ email: newEmail }).eq("user_id", user.id);
      await admin.from("password_reset_otps").update({ used_at: new Date().toISOString() }).eq("id", row.id);

      return ok({ ok: true, message: "ইমেইল সফলভাবে পরিবর্তন হয়েছে!" });
    }

    return bad("Unknown action");
  } catch (e: any) {
    console.error(e);
    return bad(e?.message || "Server error", 500);
  }
});
