import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

// Update last_seen_at every 30 seconds
export function usePresenceTracker() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const updatePresence = async () => {
      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() } as any)
        .eq("user_id", user.id);
    };

    // Update immediately
    updatePresence();

    // Then every 30 seconds
    const interval = setInterval(updatePresence, 30000);

    // Update on visibility change
    const handleVisibility = () => {
      if (document.visibilityState === "visible") updatePresence();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user?.id]);
}

// Get all profiles with last_seen_at for online status
export function useOnlineStatus() {
  return useQuery({
    queryKey: ["online-status"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, last_seen_at" as any);
      const map = new Map<string, string>();
      (data as any[])?.forEach((p) => {
        if (p.user_id && p.last_seen_at) {
          map.set(p.user_id, p.last_seen_at);
        }
      });
      return map;
    },
    refetchInterval: 15000,
  });
}

// Check if a user is online (seen within last 2 minutes)
export function isUserOnline(lastSeenAt: string | undefined | null): boolean {
  if (!lastSeenAt) return false;
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  return diff < 2 * 60 * 1000; // 2 minutes
}

export function getLastSeenText(lastSeenAt: string | undefined | null): string {
  if (!lastSeenAt) return "অফলাইন";
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  if (diff < 2 * 60 * 1000) return "অনলাইন";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} মিনিট আগে`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ঘণ্টা আগে`;
  const days = Math.floor(hours / 24);
  return `${days} দিন আগে`;
}
