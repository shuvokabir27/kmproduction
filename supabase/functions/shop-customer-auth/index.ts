// KM Shop customer auth — register / login / verify session
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Simple SHA-256 hash with a per-row salt-like prefix
async function hash(password: string, phone: string) {
  const data = new TextEncoder().encode(`kmshop:${phone}:${password}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function genToken() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function bad(error: string, status = 400) {
  return ok({ error }, status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const action = String(body.action || "");

    if (action === "register") {
      const phone = String(body.phone || "").replace(/\D/g, "");
      const password = String(body.password || "");
      const fullName = String(body.full_name || "").trim();
      if (phone.length !== 11) return bad("মোবাইল নম্বর অবশ্যই ১১ ডিজিটের হতে হবে");
      if (!/^\d{6}$/.test(password)) return bad("পাসওয়ার্ড অবশ্যই ৬ ডিজিটের সংখ্যা হতে হবে");

      const { data: existing } = await supabase
        .from("shop_customers").select("id").eq("phone", phone).maybeSingle();
      if (existing) return bad("এই নম্বরে ইতিমধ্যে অ্যাকাউন্ট আছে। লগইন করুন।");

      const password_hash = await hash(password, phone);
      const session_token = genToken();
      const session_expires_at = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

      const { data, error } = await supabase.from("shop_customers").insert({
        phone, full_name: fullName || null, password_hash,
        session_token, session_expires_at, last_login_at: new Date().toISOString(),
      }).select("id, phone, full_name, address").single();
      if (error) return bad(error.message, 500);

      // link any prior orders by phone
      await supabase.from("orders").update({ shop_customer_id: data.id })
        .eq("customer_phone", phone).is("shop_customer_id", null);

      return ok({ customer: data, token: session_token, expires_at: session_expires_at });
    }

    if (action === "login") {
      const phone = String(body.phone || "").replace(/\D/g, "");
      const password = String(body.password || "");
      if (phone.length !== 11) return bad("সঠিক মোবাইল নম্বর দিন");
      if (!/^\d{6}$/.test(password)) return bad("পাসওয়ার্ড অবশ্যই ৬ ডিজিট");

      const { data: cust } = await supabase
        .from("shop_customers")
        .select("id, phone, full_name, address, password_hash, is_active")
        .eq("phone", phone).maybeSingle();
      if (!cust) return bad("এই নম্বরে কোনো অ্যাকাউন্ট নেই", 401);
      if (!cust.is_active) return bad("আপনার অ্যাকাউন্ট নিষ্ক্রিয়", 403);

      const computed = await hash(password, phone);
      if (computed !== cust.password_hash) return bad("পাসওয়ার্ড ভুল", 401);

      const session_token = genToken();
      const session_expires_at = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
      await supabase.from("shop_customers").update({
        session_token, session_expires_at, last_login_at: new Date().toISOString(),
      }).eq("id", cust.id);

      // link any orphan orders by this phone
      await supabase.from("orders").update({ shop_customer_id: cust.id })
        .eq("customer_phone", phone).is("shop_customer_id", null);

      return ok({
        customer: { id: cust.id, phone: cust.phone, full_name: cust.full_name, address: cust.address },
        token: session_token, expires_at: session_expires_at,
      });
    }

    if (action === "verify") {
      const token = String(body.token || "");
      if (!token) return bad("টোকেন নেই", 401);
      const { data: cust } = await supabase
        .from("shop_customers")
        .select("id, phone, full_name, address, session_expires_at, is_active")
        .eq("session_token", token).maybeSingle();
      if (!cust) return bad("সেশন অবৈধ", 401);
      if (!cust.is_active) return bad("অ্যাকাউন্ট নিষ্ক্রিয়", 403);
      if (cust.session_expires_at && new Date(cust.session_expires_at) < new Date())
        return bad("সেশন শেষ হয়েছে", 401);

      const { data: orders } = await supabase
        .from("orders").select("*").eq("shop_customer_id", cust.id)
        .order("created_at", { ascending: false }).limit(200);

      return ok({
        customer: { id: cust.id, phone: cust.phone, full_name: cust.full_name, address: cust.address },
        orders: orders ?? [],
      });
    }

    if (action === "logout") {
      const token = String(body.token || "");
      if (token) await supabase.from("shop_customers")
        .update({ session_token: null, session_expires_at: null })
        .eq("session_token", token);
      return ok({ ok: true });
    }

    if (action === "request_otp") {
      const phone = String(body.phone || "").replace(/\D/g, "");
      if (phone.length !== 11) return bad("সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন");

      const { data: cust } = await supabase
        .from("shop_customers").select("id, is_active").eq("phone", phone).maybeSingle();
      if (!cust) return bad("এই নম্বরে কোনো অ্যাকাউন্ট নেই", 404);
      if (!cust.is_active) return bad("আপনার অ্যাকাউন্ট নিষ্ক্রিয়", 403);

      // Rate limit: max 3 OTP per phone in last 10 minutes
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count } = await supabase.from("customer_password_otps")
        .select("id", { count: "exact", head: true })
        .eq("phone", phone).gte("created_at", tenMinAgo);
      if ((count || 0) >= 3) return bad("অনেক বার চেষ্টা করেছেন, ১০ মিনিট পরে আবার চেষ্টা করুন", 429);

      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const otp_hash = await hash(otp, phone);
      const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      await supabase.from("customer_password_otps").insert({ phone, otp_hash, expires_at });

      const SMS_API_KEY = Deno.env.get("BULK_SMS_API_KEY");
      const SENDER_ID = Deno.env.get("BULK_SMS_SENDER_ID");
      if (!SMS_API_KEY || !SENDER_ID) return bad("SMS সার্ভিস কনফিগার করা নেই", 500);

      const message = `Apnar KM Shop OTP: ${otp}\n5 minute er moddhe babohar korun. Karo sathe share korben na.`;
      const smsUrl = `http://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(SMS_API_KEY)}&type=text&number=${encodeURIComponent(phone)}&senderid=${encodeURIComponent(SENDER_ID)}&message=${encodeURIComponent(message)}`;

      try {
        const smsRes = await fetch(smsUrl);
        const smsText = await smsRes.text();
        console.log("BulkSMSBD response:", smsRes.status, smsText);
        // BulkSMSBD returns JSON with response_code 202 = success
        let parsed: any = null;
        try { parsed = JSON.parse(smsText); } catch { /* plain text */ }
        if (parsed && parsed.response_code && parsed.response_code !== 202) {
          return bad(`SMS পাঠানো যায়নি: ${parsed.error_message || smsText}`, 500);
        }
      } catch (e: any) {
        console.error("SMS error:", e);
        return bad("SMS পাঠাতে সমস্যা হয়েছে: " + (e?.message || ""), 500);
      }

      return ok({ ok: true, message: "OTP পাঠানো হয়েছে আপনার মোবাইলে", expires_in: 300 });
    }

    if (action === "reset_with_otp") {
      const phone = String(body.phone || "").replace(/\D/g, "");
      const otp = String(body.otp || "").replace(/\D/g, "");
      const newPassword = String(body.new_password || "");
      if (phone.length !== 11) return bad("সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন");
      if (otp.length !== 6) return bad("৬ ডিজিটের OTP দিন");
      if (!/^\d{6,}$/.test(newPassword)) return bad("নতুন পাসওয়ার্ড কমপক্ষে ৬ ডিজিটের সংখ্যা হতে হবে");

      const { data: cust } = await supabase
        .from("shop_customers").select("id, is_active").eq("phone", phone).maybeSingle();
      if (!cust) return bad("এই নম্বরে কোনো অ্যাকাউন্ট নেই", 404);
      if (!cust.is_active) return bad("আপনার অ্যাকাউন্ট নিষ্ক্রিয়", 403);

      const { data: otpRow } = await supabase
        .from("customer_password_otps")
        .select("id, otp_hash, expires_at, attempts, used_at")
        .eq("phone", phone).is("used_at", null)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!otpRow) return bad("OTP পাওয়া যায়নি, আবার অনুরোধ করুন", 400);
      if (new Date(otpRow.expires_at) < new Date()) return bad("OTP এর মেয়াদ শেষ, নতুন OTP নিন", 400);
      if (otpRow.attempts >= 5) return bad("অনেকবার ভুল চেষ্টা হয়েছে, নতুন OTP নিন", 429);

      const otpHash = await hash(otp, phone);
      if (otpHash !== otpRow.otp_hash) {
        await supabase.from("customer_password_otps").update({ attempts: otpRow.attempts + 1 }).eq("id", otpRow.id);
        return bad("OTP ভুল", 400);
      }

      const password_hash = await hash(newPassword, phone);
      const session_token = genToken();
      const session_expires_at = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

      const { data: updated, error } = await supabase
        .from("shop_customers")
        .update({ password_hash, session_token, session_expires_at, last_login_at: new Date().toISOString() })
        .eq("id", cust.id).select("id, phone, full_name, address").single();
      if (error) return bad(error.message, 500);

      await supabase.from("customer_password_otps").update({ used_at: new Date().toISOString() }).eq("id", otpRow.id);

      return ok({ customer: updated, token: session_token, expires_at: session_expires_at });
    }


    if (action === "update_profile") {
      const token = String(body.token || "");
      if (!token) return bad("টোকেন নেই", 401);
      const { data: cust } = await supabase
        .from("shop_customers")
        .select("id, phone, session_expires_at, is_active")
        .eq("session_token", token).maybeSingle();
      if (!cust) return bad("সেশন অবৈধ", 401);
      if (!cust.is_active) return bad("অ্যাকাউন্ট নিষ্ক্রিয়", 403);
      if (cust.session_expires_at && new Date(cust.session_expires_at) < new Date())
        return bad("সেশন শেষ হয়েছে", 401);

      const fullName = body.full_name != null ? String(body.full_name).trim().slice(0, 100) : undefined;
      const address = body.address != null ? String(body.address).trim().slice(0, 500) : undefined;
      const newPhone = body.phone != null ? String(body.phone).replace(/\D/g, "") : undefined;

      const updates: Record<string, unknown> = {};
      if (fullName !== undefined) updates.full_name = fullName || null;
      if (address !== undefined) updates.address = address || null;
      if (newPhone !== undefined) {
        if (newPhone.length !== 11) return bad("সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন");
        if (newPhone !== cust.phone) {
          const { data: dup } = await supabase
            .from("shop_customers").select("id").eq("phone", newPhone).maybeSingle();
          if (dup) return bad("এই নম্বরে ইতিমধ্যে অ্যাকাউন্ট আছে");
          updates.phone = newPhone;
        }
      }

      if (Object.keys(updates).length === 0) return ok({ ok: true });

      const { data: updated, error } = await supabase
        .from("shop_customers").update(updates).eq("id", cust.id)
        .select("id, phone, full_name, address").single();
      if (error) return bad(error.message, 500);

      if (updates.phone) {
        await supabase.from("orders").update({ shop_customer_id: updated.id })
          .eq("customer_phone", updates.phone as string).is("shop_customer_id", null);
      }

      return ok({ customer: updated });
    }

    return bad("অজানা অ্যাকশন");
  } catch (e: any) {
    return bad(e?.message || "সার্ভার ত্রুটি", 500);
  }
});
