import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Phone, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

const Products = () => {
  const { data: products, isLoading } = useQuery({
    queryKey: ["public-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const categories = [...new Set((products ?? []).map((p: any) => p.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/20 via-background to-primary/5 border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" /> হোমে ফিরুন
          </Link>
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">আমাদের প্রডাক্ট</h1>
              <p className="text-muted-foreground mt-1">আমাদের বিভিন্ন প্রডাক্ট দেখুন</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 bg-card animate-pulse rounded-xl" />
            ))}
          </div>
        ) : !products?.length ? (
          <div className="text-center py-20 text-muted-foreground">
            <ShoppingBag className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">এখনো কোনো প্রডাক্ট যোগ করা হয়নি</p>
          </div>
        ) : (
          <>
            {/* Categories filter */}
            {categories.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {categories.map((cat) => (
                  <Badge key={cat} variant="secondary" className="text-sm">
                    {cat}
                  </Badge>
                ))}
              </div>
            )}

            {/* Product grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product: any) => (
                <div
                  key={product.id}
                  className="bg-card border border-border/50 rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
                >
                  {/* Image */}
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-16 w-16 text-muted-foreground/20" />
                      </div>
                    )}
                    {product.is_featured && (
                      <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">ফিচার্ড</Badge>
                    )}
                    {product.stock_status === "out_of_stock" && (
                      <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                        <Badge variant="destructive" className="text-sm">স্টক শেষ</Badge>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    {product.category && (
                      <div className="flex items-center gap-1">
                        <Tag className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{product.category}</span>
                      </div>
                    )}
                    <h3 className="font-semibold text-foreground text-lg leading-tight">{product.name}</h3>
                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      {product.discount_price ? (
                        <>
                          <span className="text-lg font-bold text-primary">৳{toBn(product.discount_price)}</span>
                          <span className="text-sm text-muted-foreground line-through">৳{toBn(product.price)}</span>
                        </>
                      ) : (
                        <span className="text-lg font-bold text-primary">৳{toBn(product.price)}</span>
                      )}
                    </div>
                    {product.contact_info && (
                      <div className="pt-2">
                        <a
                          href={`tel:${product.contact_info}`}
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <Phone className="h-3 w-3" /> {product.contact_info}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Products;
