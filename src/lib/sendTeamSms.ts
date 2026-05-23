import { supabase } from "@/integrations/supabase/client";

type Payload =
  | { member_id: string; message: string }
  | { member_ids: string[]; message: string }
  | { phone: string; message: string };

/**
 * Fire-and-forget SMS to team members via BulkSMSBD.
 * Never throws — failures only logged to console.
 */
export async function sendTeamSms(payload: Payload): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("send-team-sms", { body: payload });
    if (error) console.warn("[sendTeamSms]", error.message);
  } catch (e: any) {
    console.warn("[sendTeamSms]", e?.message);
  }
}

/** Bengali number formatting */
export function toBn(n: number | string): string {
  const map: Record<string, string> = { "0":"০","1":"১","2":"২","3":"৩","4":"৪","5":"৫","6":"৬","7":"৭","8":"৮","9":"৯" };
  return String(n).replace(/\d/g, (d) => map[d]);
}
