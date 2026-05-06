import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export interface ProductCategory {
  id: string;
  parent_id: string | null;
  label: string;
  value: string;
  icon: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface CategoryNode extends ProductCategory {
  children: ProductCategory[];
}

export const useProductCategories = () => {
  return useQuery({
    queryKey: ["product-categories"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("product_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const all = (data ?? []) as ProductCategory[];
      const mains = all.filter((c) => !c.parent_id);
      const tree: CategoryNode[] = mains.map((m) => ({
        ...m,
        children: all.filter((c) => c.parent_id === m.id),
      }));
      return { all, tree };
    },
  });
};
