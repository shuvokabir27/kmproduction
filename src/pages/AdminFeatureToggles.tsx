import { AppLayout } from "@/components/AppLayout";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { ALL_FEATURES, FEATURE_LABELS, useFeatureFlags } from "@/hooks/useFeatureFlags";
import { toast } from "sonner";
import { Eye, EyeOff, ToggleRight } from "lucide-react";

const DESCRIPTIONS: Record<string, string> = {
  meme_generator: "সদস্যদের ড্যাশবোর্ডে মিম জেনারেটর সেকশন দেখাবে কি না",
  spotlight: "সদস্যদের ড্যাশবোর্ডে আজকের স্পটলাইট কার্ড দেখাবে কি না",
  members_list: "সদস্যদের ড্যাশবোর্ডে সদস্য তালিকা গ্রিড দেখাবে কি না",
  daily_rashifal: "সদস্যদের ড্যাশবোর্ডে আজকের রাশিফল সেকশন দেখাবে কি না",
  breaking_news: "উপরের ব্রেকিং নিউজ টিকার সদস্যদের দেখাবে কি না",
  weather_widget: "হেডারে আবহাওয়া উইজেট দেখাবে কি না (বন্ধ করলে API কল বন্ধ হয়ে স্পিড বাড়বে)",
};

const AdminFeatureToggles = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { flags, isEnabled, isLoading } = useFeatureFlags();

  const toggle = async (key: string, enabled: boolean) => {
    const { error } = await supabase
      .from("feature_flags" as any)
      .upsert({ key, enabled, updated_at: new Date().toISOString(), updated_by: user?.id });
    if (error) return toast.error(error.message);
    toast.success(enabled ? "চালু করা হয়েছে" : "বন্ধ করা হয়েছে");
    qc.invalidateQueries({ queryKey: ["feature-flags"] });
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <ToggleRight className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ফিচার টগল</h1>
            <p className="text-sm text-muted-foreground">
              সদস্যদের ড্যাশবোর্ডে কোন সেকশন দেখাবে তা নিয়ন্ত্রণ করুন
            </p>
          </div>
        </div>

        <div className="premium-card rounded-2xl divide-y divide-border/10">
          {ALL_FEATURES.map((key) => {
            const on = isEnabled(key);
            return (
              <div key={key} className="p-4 flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${on ? "bg-red-500/10 text-red-400" : "bg-muted text-muted-foreground"}`}>
                  {on ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{FEATURE_LABELS[key]}</div>
                  <div className="text-xs text-muted-foreground">{DESCRIPTIONS[key]}</div>
                </div>
                <Switch
                  checked={on}
                  disabled={isLoading}
                  onCheckedChange={(v) => toggle(key, v)}
                />
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          বন্ধ করলে কোনো সদস্য এই সেকশনটি দেখতে পাবে না। আপনি (অ্যাডমিন) সবসময় দেখতে পান।
        </p>
      </div>
    </AppLayout>
  );
};

export default AdminFeatureToggles;
