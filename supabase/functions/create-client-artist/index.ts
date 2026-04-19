import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization")!;

    // Verify caller is authenticated client OR admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is a client or admin
    const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", caller.id);
    const roleSet = new Set((roles ?? []).map((r: any) => r.role));
    if (!roleSet.has("client") && !roleSet.has("admin")) {
      return new Response(JSON.stringify({ error: "Client or admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { full_name } = await req.json();
    if (!full_name || !full_name.trim()) {
      return new Response(JSON.stringify({ error: "full_name required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const trimmed = full_name.trim();

    // Check if a profile with this name already exists — return existing
    const { data: existing } = await adminClient
      .from("profiles")
      .select("id, user_id, member_id, full_name")
      .eq("full_name", trimmed)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ success: true, existing: true, profile: existing }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate demo email + random password
    const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "artist";
    const demoEmail = `artist-${slug}-${Date.now()}@demo.local`;
    const tempPassword = crypto.randomUUID() + "Aa1!";

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: demoEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: trimmed },
    });
    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Wait for handle_new_user trigger to create profile + member role
    await new Promise((r) => setTimeout(r, 1500));

    // Ensure profile name is correct (trigger uses metadata.full_name fallback)
    if (newUser.user) {
      await adminClient.from("profiles").update({
        full_name: trimmed,
        designation: "অভিনেতা",
        is_active: true,
      }).eq("user_id", newUser.user.id);
    }

    const { data: createdProfile } = await adminClient
      .from("profiles")
      .select("id, user_id, member_id, full_name")
      .eq("user_id", newUser.user!.id)
      .maybeSingle();

    return new Response(JSON.stringify({ success: true, profile: createdProfile }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
