import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_DELIVERY, DeliverySettings } from "@/lib/delivery";

export const useDeliverySettings = () => {
  const q = useQuery({
    queryKey: ["delivery-settings"],
    queryFn: async (): Promise<DeliverySettings & { id?: string }> => {
      const { data } = await (supabase as any)
        .from("delivery_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (!data) return DEFAULT_DELIVERY;
      return {
        id: data.id,
        base_weight_grams: Number(data.base_weight_grams) || DEFAULT_DELIVERY.base_weight_grams,
        base_charge: Number(data.base_charge) || DEFAULT_DELIVERY.base_charge,
        extra_charge_per_kg: Number(data.extra_charge_per_kg) || DEFAULT_DELIVERY.extra_charge_per_kg,
        free_delivery_threshold: Number(data.free_delivery_threshold) || DEFAULT_DELIVERY.free_delivery_threshold,
        free_delivery_enabled: !!data.free_delivery_enabled,
      };
    },
    staleTime: 60_000,
  });
  return { settings: q.data ?? DEFAULT_DELIVERY, isLoading: q.isLoading, refetch: q.refetch };
};
