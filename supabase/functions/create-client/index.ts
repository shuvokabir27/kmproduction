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
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerData } = await callerClient.auth.getUser();
    if (!callerData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { client_id, name, phone, email, company, address, password } = await req.json();

    if (!client_id || !name || !password) {
      return new Response(JSON.stringify({ error: "client_id, name, and password are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create auth user with a generated email
    const fakeEmail = `${client_id.toLowerCase().replace(/[^a-z0-9]/g, "")}@client.local`;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: fakeEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, is_client: true },
    });

    if (authError) throw authError;

    const userId = authData.user.id;

    // Assign client role
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: "client",
    });
    if (roleError) throw roleError;

    // Create client profile
    const { error: profileError } = await supabase.from("client_profiles").insert({
      user_id: userId,
      client_id,
      name,
      phone: phone || null,
      email: email || null,
      company: company || null,
      address: address || null,
    });
    if (profileError) throw profileError;

    return new Response(
      JSON.stringify({ success: true, user_id: userId, client_id, login_email: fakeEmail }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});