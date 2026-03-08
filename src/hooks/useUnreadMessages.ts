import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

const sb = supabase as any;

export function useUnreadMessages() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["unread-messages", user?.id],
    enabled: !!user?.id,
    refetchInterval: 5000,
    queryFn: async () => {
      // Get all conversation memberships with last_read_at
      const { data: memberships } = await sb
        .from("conversation_members")
        .select("conversation_id, last_read_at")
        .eq("user_id", user!.id);

      if (!memberships || memberships.length === 0) return 0;

      let totalUnread = 0;
      for (const m of memberships) {
        const { count } = await sb
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", m.conversation_id)
          .neq("sender_id", user!.id)
          .gt("created_at", m.last_read_at || "1970-01-01");

        totalUnread += count || 0;
      }

      return totalUnread;
    },
  });
}
