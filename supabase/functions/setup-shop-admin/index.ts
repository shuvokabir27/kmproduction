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

    // Super admin (owner) account — demo password, user will change from panel
    const SUPER_EMAIL = "shuvokuakata27@gmail.com";
    const SUPER_PASSWORD = "Admin@1234";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const ensureUser = async (email: string, password: string, fullName: string) => {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list?.users?.find((u) => u.email === email);
      if (existing) {
        // Do NOT overwrite password if user already exists (so owner-changed password sticks).
        return existing.id;
      }
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (cErr || !created.user) throw new Error(cErr?.message || "create user failed");
      return created.user.id;
    };

    // 1) product admin (existing phone-based admin)
    const adminId = await ensureUser(EMAIL, PASSWORD, "KM Shop Admin");
    await admin.from("user_roles").upsert(
      { user_id: adminId, role: "product_admin" },
      { onConflict: "user_id,role" }
    );
    await admin.from("admin_phone_logins").upsert(
      { user_id: adminId, phone: PHONE },
      { onConflict: "phone" }
    );

    // 2) super admin (owner gmail)
    const superId = await ensureUser(SUPER_EMAIL, SUPER_PASSWORD, "Super Admin");
    await admin.from("user_roles").upsert(
      { user_id: superId, role: "super_admin" },
      { onConflict: "user_id,role" }
    );
    // also give product_admin so existing admin panels work
    await admin.from("user_roles").upsert(
      { user_id: superId, role: "product_admin" },
      { onConflict: "user_id,role" }
    );

    return new Response(
      JSON.stringify({ ok: true, admin_id: adminId, super_id: superId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
