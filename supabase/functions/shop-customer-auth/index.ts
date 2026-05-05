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
