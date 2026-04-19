import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 30;

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
    const identifier = `member_${member_id}`;

    // Check lockout status
    const { data: attempt } = await adminClient
      .from("login_attempts")
      .select("*")
      .eq("identifier", identifier)
      .maybeSingle();

    if (attempt?.locked_until) {
      const lockedUntil = new Date(attempt.locked_until);
      if (lockedUntil > new Date()) {
        const remaining = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
        return new Response(
          JSON.stringify({
            error: `অনেকবার ভুল পাসওয়ার্ড দেওয়া হয়েছে। ${remaining} মিনিট পর আবার চেষ্টা করুন।`,
            locked: true,
            locked_until: attempt.locked_until,
            remaining_minutes: remaining,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

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
      // Track failed attempt
      const newCount = (attempt?.attempt_count || 0) + 1;
      const lockData: any = {
        identifier,
        attempt_count: newCount,
        updated_at: new Date().toISOString(),
      };

      if (newCount >= MAX_ATTEMPTS) {
        lockData.locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString();
      }

      if (attempt) {
        await adminClient.from("login_attempts").update(lockData).eq("identifier", identifier);
      } else {
        await adminClient.from("login_attempts").insert(lockData);
      }

      const remainingAttempts = MAX_ATTEMPTS - newCount;
      if (newCount >= MAX_ATTEMPTS) {
        return new Response(
          JSON.stringify({
            error: `৩ বার ভুল পাসওয়ার্ড দেওয়া হয়েছে। ${LOCKOUT_MINUTES} মিনিটের জন্য সাসপেন্ড করা হয়েছে।`,
            locked: true,
            remaining_minutes: LOCKOUT_MINUTES,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          error: `আপনার পাসওয়ার্ড ভুল। সঠিক পাসওয়ার্ড দিয়ে চেষ্টা করুন। (আর ${remainingAttempts} বার চেষ্টা করতে পারবেন)`,
          remaining_attempts: remainingAttempts,
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Successful login — reset attempts
    if (attempt) {
      await adminClient.from("login_attempts").delete().eq("identifier", identifier);
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
