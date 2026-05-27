import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, password } = await req.json();
    if (!phone || !password) {
      return new Response(JSON.stringify({ error: "ফোন ও পাসওয়ার্ড দিতে হবে" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Normalize: strip non-digits, keep last 11 starting with 0
    const digits = String(phone).replace(/\D/g, "");
    const candidates = new Set<string>([String(phone).trim(), digits]);
    if (digits.length >= 11) candidates.add(digits.slice(-11));
    if (digits.startsWith("88")) candidates.add(digits.slice(2));

    const { data: row } = await admin
      .from("admin_phone_logins")
      .select("user_id, phone")
      .in("phone", Array.from(candidates))
      .maybeSingle();

    if (!row) {
      return new Response(JSON.stringify({ error: "এই নম্বরে কোনো এডমিন পাওয়া যায়নি" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Confirm role (admin OR product_admin)
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", row.user_id)
      .in("role", ["admin", "product_admin"]);
    if (!roleRows || roleRows.length === 0) {
      return new Response(JSON.stringify({ error: "এই ইউজার এডমিন নয়" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const isProductAdmin = roleRows.some((r: any) => r.role === "product_admin");

    const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(row.user_id);
    if (userErr || !userRes?.user?.email) {
      return new Response(JSON.stringify({ error: "এডমিন ইমেইল পাওয়া যায়নি" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anon = createClient(supabaseUrl, anonKey);
    const { data: authData, error: authError } = await anon.auth.signInWithPassword({
      email: userRes.user.email,
      password,
    });
    if (authError) {
      return new Response(
        JSON.stringify({ error: "আপনার পাসওয়ার্ড ভুল। সঠিক পাসওয়ার্ড দিয়ে চেষ্টা করুন।" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        access_token: authData.session?.access_token,
        refresh_token: authData.session?.refresh_token,
        is_product_admin: isProductAdmin,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
