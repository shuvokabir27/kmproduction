import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, Zap } from "lucide-react";

interface TickerItem {
  id: string;
  text: string;
  is_active: boolean;
  sort_order: number;
}

export default function AdminTicker() {
  const queryClient = useQueryClient();
  const [newText, setNewText] = useState("");

  const { data: tickerItems, isLoading } = useQuery({
    queryKey: ["admin-ticker-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_ticker")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as TickerItem[];
    },
  });

  const { data: siteSettings } = useQuery({
    queryKey: ["ticker-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("ticker_speed, ticker_enabled")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const addItem = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase
        .from("news_ticker")
        .insert({ text, sort_order: (tickerItems?.length || 0) + 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ticker-items"] });
      setNewText("");
      toast({ title: "টিকার টেক্সট যুক্ত হয়েছে" });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("news_ticker").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ticker-items"] });
      toast({ title: "টিকার টেক্সট মুছে ফেলা হয়েছে" });
    },
  });

  const toggleItem = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("news_ticker")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ticker-items"] });
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (settings: { ticker_speed?: number; ticker_enabled?: boolean }) => {
      const { error } = await supabase
        .from("site_settings")
        .update(settings)
        .not("id", "is", null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticker-settings"] });
      toast({ title: "সেটিংস আপডেট হয়েছে" });
    },
  });

  return (
    <div className="space-y-6">
      {/* Settings */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">টিকার সেটিংস</h3>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">চালু</Label>
              <Switch
                checked={siteSettings?.ticker_enabled ?? true}
                onCheckedChange={(checked) =>
                  updateSettings.mutate({ ticker_enabled: checked })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              স্ক্রল স্পিড: {siteSettings?.ticker_speed || 30}s (কম = দ্রুত)
            </Label>
            <Slider
              value={[siteSettings?.ticker_speed || 30]}
              min={5}
              max={60}
              step={5}
              onValueCommit={(val) =>
                updateSettings.mutate({ ticker_speed: val[0] })
              }
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>দ্রুত (5s)</span>
              <span>ধীর (60s)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add New */}
      <div className="flex gap-2">
        <Input
          placeholder="কাস্টম টিকার টেক্সট লিখুন..."
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newText.trim()) addItem.mutate(newText.trim());
          }}
        />
        <Button
          size="sm"
          onClick={() => newText.trim() && addItem.mutate(newText.trim())}
          disabled={!newText.trim() || addItem.isPending}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center text-muted-foreground text-sm py-4">লোড হচ্ছে...</div>
        ) : !tickerItems?.length ? (
          <div className="text-center text-muted-foreground text-sm py-4">
            কোনো কাস্টম টিকার নেই। নিউজ টাইটেল অটো দেখাবে।
          </div>
        ) : (
          tickerItems.map((item) => (
            <Card key={item.id} className={!item.is_active ? "opacity-50" : ""}>
              <CardContent className="p-3 flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-sm flex-1 truncate">{item.text}</p>
                <Switch
                  checked={item.is_active}
                  onCheckedChange={(checked) =>
                    toggleItem.mutate({ id: item.id, is_active: checked })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => deleteItem.mutate(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        💡 কাস্টম টেক্সট না থাকলে নিউজ টাইটেলগুলো অটোমেটিক টিকারে দেখাবে।
      </p>
    </div>
  );
}
