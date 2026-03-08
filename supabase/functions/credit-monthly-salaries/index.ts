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

    // Get current month's first day
    const now = new Date();
    const creditMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    // Get all active monthly-salaried members
    const { data: members, error: membersError } = await supabase
      .from("profiles")
      .select("id, full_name, monthly_salary, salary_type")
      .eq("is_active", true)
      .eq("salary_type", "monthly")
      .gt("monthly_salary", 0);

    if (membersError) throw membersError;
    if (!members || members.length === 0) {
      return new Response(JSON.stringify({ message: "No monthly-salaried members found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let credited = 0;
    let skipped = 0;

    for (const member of members) {
      // Check if already credited for this month
      const { data: existing } = await supabase
        .from("salary_credits")
        .select("id")
        .eq("member_id", member.id)
        .eq("credit_month", creditMonth)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const { error } = await supabase.from("salary_credits").insert({
        member_id: member.id,
        amount: member.monthly_salary,
        credit_month: creditMonth,
      });

      if (!error) credited++;
    }

    return new Response(
      JSON.stringify({ message: `Credited: ${credited}, Skipped: ${skipped}`, creditMonth }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
