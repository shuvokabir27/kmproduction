import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PHONE = "01710147613";
    const EMAIL = "01710147613@kmshop.local";
    const PASSWORD = "01778908877@Sk";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1) find or create auth user
    let userId: string | null = null;
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find((u) => u.email === EMAIL);
    if (existing) {
      userId = existing.id;
      // ensure password is set
      await admin.auth.admin.updateUserById(userId, { password: PASSWORD, email_confirm: true });
    } else {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: EMAIL,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: "KM Shop Admin" },
      });
      if (cErr || !created.user) throw new Error(cErr?.message || "create user failed");
      userId = created.user.id;
    }

    // 2) ensure product_admin role
    await admin.from("user_roles").upsert(
      { user_id: userId, role: "product_admin" },
      { onConflict: "user_id,role" }
    );

    // 3) ensure phone mapping
    await admin.from("admin_phone_logins").upsert(
      { user_id: userId, phone: PHONE },
      { onConflict: "phone" }
    );

    return new Response(
      JSON.stringify({ ok: true, user_id: userId, email: EMAIL }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
