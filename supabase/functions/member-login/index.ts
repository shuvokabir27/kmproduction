import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { member_id, password } = await req.json();

    if (!member_id || !password) {
      return new Response(
        JSON.stringify({ error: "সদস্য আইডি ও পাসওয়ার্ড দিতে হবে" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Look up profile by member_id to get email
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("email, user_id")
      .eq("member_id", Number(member_id))
      .maybeSingle();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "এই আইডি দিয়ে কোনো সদস্য পাওয়া যায়নি" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.email) {
      return new Response(
        JSON.stringify({ error: "এই সদস্যের ইমেইল সেট করা নেই" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sign in with the found email and provided password
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
      email: profile.email,
      password: password,
    });

    if (authError) {
      return new Response(
        JSON.stringify({ error: "পাসওয়ার্ড সঠিক নয়" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        access_token: authData.session?.access_token,
        refresh_token: authData.session?.refresh_token,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
