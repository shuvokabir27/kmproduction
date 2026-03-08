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

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { email, password, full_name, profile_data } = await req.json();
    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: "email, password, full_name required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create user via admin API — does NOT affect caller's session
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createError) {
      if (createError.message.includes("already been registered")) {
        // Find existing account name
        const { data: existingProfile } = await adminClient
          .from("profiles")
          .select("full_name, member_id")
          .eq("email", email)
          .maybeSingle();
        const name = existingProfile?.full_name || "অজানা";
        const mid = existingProfile?.member_id ? ` (ID: ${existingProfile.member_id})` : "";
        return new Response(JSON.stringify({ 
          error: `এই ইমেইল দিয়ে ইতিমধ্যে "${name}"${mid} নামে একটি অ্যাকাউন্ট নিবন্ধিত আছে।`,
          duplicate: true,
          existing_name: name,
          existing_member_id: existingProfile?.member_id || null,
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Wait for trigger to create profile
    await new Promise((r) => setTimeout(r, 1500));

    // Update profile with additional data
    if (newUser.user && profile_data) {
      await adminClient.from("profiles").update(profile_data).eq("user_id", newUser.user.id);
    }

    return new Response(JSON.stringify({ success: true, user_id: newUser.user?.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
