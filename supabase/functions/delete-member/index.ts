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
    const authHeader = req.headers.get("Authorization") || "";

    // Verify caller via JWT
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { profile_id, admin_password } = body || {};

    if (!profile_id || !admin_password) {
      return new Response(JSON.stringify({ error: "profile_id এবং পাসওয়ার্ড প্রয়োজন" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Confirm caller is admin
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "শুধুমাত্র এডমিন এই কাজ করতে পারবেন" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin password by attempting sign-in with caller's email
    if (!caller.email) {
      return new Response(JSON.stringify({ error: "এডমিন ইমেইল পাওয়া যায়নি" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const verifyClient = createClient(supabaseUrl, anonKey);
    const { error: pwErr } = await verifyClient.auth.signInWithPassword({
      email: caller.email,
      password: admin_password,
    });
    if (pwErr) {
      return new Response(JSON.stringify({ error: "এডমিন পাসওয়ার্ড ভুল" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load target profile
    const { data: target, error: targetErr } = await adminClient
      .from("profiles")
      .select("id, user_id, member_id, full_name, full_name_en, photo_url")
      .eq("id", profile_id)
      .maybeSingle();

    if (targetErr || !target) {
      return new Response(JSON.stringify({ error: "সদস্য পাওয়া যায়নি" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Block super admin deletion
    if (target.member_id === 20200) {
      return new Response(JSON.stringify({ error: "সুপার এডমিন ডিলিট করা যাবে না" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (target.user_id === caller.id) {
      return new Response(JSON.stringify({ error: "নিজেকে ডিলিট করা যাবে না" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profileId: string = target.id;
    const userId: string = target.user_id;

    // Delete dependent rows by profile_id
    const tablesByProfileId = [
      "attendance",
      "bonuses",
      "payments",
      "advance_requests",
      "salary_credits",
      "member_achievements",
      "freelance_assignments",
      "favorite_works",
      "script_permissions",
      "client_project_artists",
      "profile_comments",
      "profile_ratings",
    ];
    for (const t of tablesByProfileId) {
      const { error } = await adminClient.from(t).delete().eq("member_id", profileId);
      if (error && !/column .* does not exist/i.test(error.message)) {
        // try profile_id column for tables that use it
      }
    }
    // Tables that use a different column name
    await adminClient.from("client_project_artists").delete().eq("profile_id", profileId);
    await adminClient.from("profile_comments").delete().eq("profile_id", profileId);
    await adminClient.from("profile_ratings").delete().eq("profile_id", profileId);

    // Tasks (assigned_to / assigned_by)
    await adminClient.from("member_tasks").delete().eq("assigned_to", profileId);
    await adminClient.from("member_tasks").delete().eq("assigned_by", profileId);

    // user_id-based dependencies
    await adminClient.from("notifications").delete().eq("user_id", userId);
    await adminClient.from("conversation_members").delete().eq("user_id", userId);
    await adminClient.from("push_subscriptions").delete().eq("user_id", userId);
    await adminClient.from("user_roles").delete().eq("user_id", userId);
    await adminClient.from("notice_comments").delete().eq("user_id", userId);
    await adminClient.from("poll_votes").delete().eq("user_id", userId);
    await adminClient.from("script_comments").delete().eq("user_id", userId);

    // Delete profile
    const { error: profileDelErr } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", profileId);
    if (profileDelErr) {
      return new Response(JSON.stringify({ error: "প্রোফাইল ডিলিট ব্যর্থ: " + profileDelErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete auth user
    const { error: authDelErr } = await adminClient.auth.admin.deleteUser(userId);
    if (authDelErr) {
      console.error("Auth delete error:", authDelErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        member: {
          id: profileId,
          full_name: target.full_name,
          full_name_en: target.full_name_en,
          photo_url: target.photo_url,
          member_id: target.member_id,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("delete-member error:", err);
    return new Response(JSON.stringify({ error: err?.message || "অজানা ত্রুটি" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
