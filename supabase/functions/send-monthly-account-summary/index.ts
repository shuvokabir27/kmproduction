// Sends monthly account summary SMS to all active members.
// Triggered by pg_cron on the 24th of each month.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function normalizePhone(p: string): string | null {
  const digits = String(p || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 11 && digits.startsWith("01")) return "88" + digits;
  if (digits.length === 10 && digits.startsWith("1")) return "880" + digits;
  if (digits.length === 13 && digits.startsWith("8801")) return digits;
  return null;
}

async function sendSms(phone: string, message: string) {
  const apiKey = Deno.env.get("BULK_SMS_API_KEY");
  const senderId = Deno.env.get("BULK_SMS_SENDER_ID");
  if (!apiKey || !senderId) return { ok: false, error: "SMS provider not configured" };
  const isUnicode = /[^\x00-\x7F]/.test(message);
  const type = isUnicode ? "unicode" : "text";
  const url = `http://bulksmsbd.net/api/smsapi?api_key=${encodeURIComponent(apiKey)}&type=${type}&number=${encodeURIComponent(phone)}&senderid=${encodeURIComponent(senderId)}&message=${encodeURIComponent(message)}`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { /* plain text */ }
    const providerAccepted = parsed
      ? Number(parsed.response_code) === 202
      : /(^|\D)202($|\D)|submitted|success/i.test(text);
    return { ok: res.ok && providerAccepted };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

const formatNum = (n: number) => Math.round(n).toLocaleString("en-US");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Load active members with member role only
    const { data: allMembers } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, sms_mobile, phone, whatsapp_no, bkash_no, nagad_no, previous_balance, salary_type, salary_type_changed_at")
      .eq("is_active", true);

    const { data: rolesData } = await supabase.from("user_roles").select("user_id, role");
    const rolesByUser = new Map<string, string[]>();
    (rolesData ?? []).forEach((r: any) => {
      const a = rolesByUser.get(r.user_id) ?? [];
      a.push(r.role);
      rolesByUser.set(r.user_id, a);
    });

    const members = (allMembers ?? []).filter((p: any) => {
      const r = rolesByUser.get(p.user_id) ?? [];
      return r.includes("member") && !r.includes("admin") && !r.includes("client") && !r.includes("product_admin");
    });

    const [{ data: attendance }, { data: payments }, { data: bonuses }, { data: salaryCredits }, { data: freelanceRows }] = await Promise.all([
      supabase.from("attendance").select("member_id, daily_rate").eq("is_present", true),
      supabase.from("payments").select("member_id, amount, payment_date"),
      supabase.from("bonuses").select("member_id, amount"),
      supabase.from("salary_credits").select("member_id, amount, credit_month"),
      supabase.from("freelance_assignments").select("member_id, rate, paid_amount"),
    ]);

    const excludeMap: Record<string, string> = {};
    members.forEach((m: any) => {
      if (m.salary_type === "daily" && m.salary_type_changed_at) {
        const d = new Date(m.salary_type_changed_at);
        excludeMap[m.id] = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      }
    });

    const map = new Map<string, any>();
    members.forEach((m: any) => map.set(m.id, {
      ...m,
      earned: 0, paid: 0, bonus: 0, salary: 0, freelance: 0, freelancePaid: 0,
      previous: Number(m.previous_balance || 0),
      lastPaid: 0,
      lastPaidDate: "",
    }));

    attendance?.forEach((a: any) => { const e = map.get(a.member_id); if (e) e.earned += Number(a.daily_rate || 0); });
    payments?.forEach((p: any) => {
      const e = map.get(p.member_id);
      if (!e) return;
      e.paid += Number(p.amount || 0);
      if (!e.lastPaidDate || p.payment_date > e.lastPaidDate) {
        e.lastPaidDate = p.payment_date;
        e.lastPaid = Number(p.amount || 0);
      }
    });
    bonuses?.forEach((b: any) => { const e = map.get(b.member_id); if (e) e.bonus += Number(b.amount || 0); });
    salaryCredits?.forEach((s: any) => {
      const cutoff = excludeMap[s.member_id];
      if (cutoff && s.credit_month >= cutoff) return;
      const e = map.get(s.member_id); if (e) e.salary += Number(s.amount || 0);
    });
    freelanceRows?.forEach((f: any) => {
      const e = map.get(f.member_id);
      if (e) { e.freelance += Number(f.rate || 0); e.freelancePaid += Number(f.paid_amount || 0); }
    });

    let sent = 0, skipped = 0;
    const details: any[] = [];

    for (const m of map.values()) {
      const balance = m.earned + m.bonus + m.salary + m.freelance + m.previous - m.paid - m.freelancePaid;
      const phone = normalizePhone(m.sms_mobile || m.phone || m.whatsapp_no || m.bkash_no || m.nagad_no || "");
      if (!phone) { skipped++; continue; }

      const status = balance > 0
        ? `AC Balance: Tk ${formatNum(balance)}`
        : balance < 0
          ? `Advance: Tk ${formatNum(Math.abs(balance))}`
          : `AC Balance: Tk 0`;
      const message = `Dear ${m.full_name}, Account Summary:\n${status}\nLast Paid: ${m.lastPaid > 0 ? `Tk ${formatNum(m.lastPaid)}` : "0000"}\n- Kuakata Multimedia`;

      const r = await sendSms(phone, message);
      if (r.ok) sent++; else skipped++;
      details.push({ name: m.full_name, phone, ok: r.ok });
    }

    return new Response(JSON.stringify({ sent, skipped, total: map.size, details }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
