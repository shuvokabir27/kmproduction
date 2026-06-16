import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    // Verify caller
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Invalid session" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isSuperAdmin = (roleRows || []).some((r: any) => r.role === "product_admin");
    if (!isSuperAdmin) return json({ error: "Only super admin can perform this action" }, 403);

    const body = await req.json().catch(() => ({}));
    const { action } = body as { action: string };

    if (action === "create") {
      const { email, password, role, full_name } = body as any;
      if (!email || !password || !role) return json({ error: "Missing fields" }, 400);
      if (!["product_admin", "order_manager", "site_manager"].includes(role))
        return json({ error: "Invalid role" }, 400);
      if (String(password).length < 6) return json({ error: "Password too short" }, 400);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || null, created_by: user.id },
      });
      if (createErr) return json({ error: createErr.message }, 400);

      const newUserId = created.user!.id;
      const { error: roleErr } = await admin
        .from("user_roles")
        .insert({ user_id: newUserId, role });
      if (roleErr) {
        await admin.auth.admin.deleteUser(newUserId);
        return json({ error: roleErr.message }, 400);
      }
      return json({ ok: true, user_id: newUserId });
    }

    if (action === "list") {
      const { data: roles } = await admin
        .from("user_roles")
        .select("user_id, role, created_at")
        .in("role", ["product_admin", "order_manager", "site_manager"])
        .order("created_at", { ascending: false });

      const userIds = Array.from(new Set((roles || []).map((r: any) => r.user_id)));
      const users: any[] = [];
      for (const id of userIds) {
        const { data } = await admin.auth.admin.getUserById(id);
        if (data?.user) users.push({ id: data.user.id, email: data.user.email, created_at: data.user.created_at, metadata: data.user.user_metadata });
      }
      const out = users.map((u) => ({
        ...u,
        roles: (roles || []).filter((r: any) => r.user_id === u.id).map((r: any) => r.role),
      }));
      return json({ users: out });
    }

    if (action === "update_role") {
      const { user_id, role } = body as any;
      if (!user_id || !role) return json({ error: "Missing fields" }, 400);
      if (!["product_admin", "order_manager", "site_manager"].includes(role))
        return json({ error: "Invalid role" }, 400);

      // Remove existing staff roles, set new one
      await admin.from("user_roles").delete()
        .eq("user_id", user_id)
        .in("role", ["product_admin", "order_manager", "site_manager"]);
      const { error } = await admin.from("user_roles").insert({ user_id, role });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "reset_password") {
      const { user_id, password } = body as any;
      if (!user_id || !password) return json({ error: "Missing fields" }, 400);
      if (String(password).length < 6) return json({ error: "Password too short" }, 400);
      const { error } = await admin.auth.admin.updateUserById(user_id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "delete") {
      const { user_id } = body as any;
      if (!user_id) return json({ error: "Missing fields" }, 400);
      if (user_id === user.id) return json({ error: "Cannot delete yourself" }, 400);
      await admin.from("user_roles").delete().eq("user_id", user_id);
      const { error } = await admin.auth.admin.deleteUser(user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    return json({ error: e?.message || "Server error" }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
