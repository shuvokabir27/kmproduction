import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FeatureKey =
  | "meme_generator"
  | "spotlight"
  | "members_list"
  | "daily_rashifal"
  | "breaking_news"
  | "weather_widget";

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  meme_generator: "মিম জেনারেটর",
  spotlight: "আজকের স্পটলাইট",
  members_list: "সদস্য তালিকা",
  daily_rashifal: "আজকের রাশিফল",
  breaking_news: "ব্রেকিং নিউজ",
  weather_widget: "আবহাওয়া উইজেট",
};

export const ALL_FEATURES: FeatureKey[] = [
  "meme_generator",
  "spotlight",
  "members_list",
  "daily_rashifal",
  "breaking_news",
  "weather_widget",
];

export function useFeatureFlags() {
  const { data = {}, isLoading } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const { data } = await supabase.from("feature_flags" as any).select("key, enabled");
      const map: Record<string, boolean> = {};
      for (const row of (data ?? []) as any[]) map[row.key] = row.enabled;
      return map;
    },
    staleTime: 60_000,
  });

  // Default to enabled if missing
  const isEnabled = (key: FeatureKey) => data[key] !== false;

  return { flags: data as Record<FeatureKey, boolean>, isEnabled, isLoading };
}
