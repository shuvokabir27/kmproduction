import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Pencil, Trash2, ShoppingBag, Upload, Image, LogOut,
  LayoutDashboard, Package, FileText, BarChart3, Weight, Users, Play, FolderTree, Truck
} from "lucide-react";

import OrderManagement from "@/components/OrderManagement";
import ProductDashboardStats from "@/components/ProductDashboardStats";
import CustomerCRM from "@/components/CustomerCRM";
import ShopCustomersAdmin from "@/components/ShopCustomersAdmin";
import WeightPricingEditor from "@/components/WeightPricingEditor";
import ProductVideoManager from "@/components/ProductVideoManager";
import CategoryManager from "@/components/CategoryManager";
import { useProductCategories } from "@/hooks/useProductCategories";

const AdminProducts = () => {
  const { user, isProductAdmin, isAdmin, loading, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [productCategory, setProductCategory] = useState<"taler_gur" | "other">("taler_gur");
  const { data: categoryData } = useProductCategories();
  const categoryTree = categoryData?.tree ?? [];

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    discount_price: "",
    image_url: "",
    category: "",
    is_active: true,
    is_featured: false,
    stock_status: "in_stock",
    sort_order: "0",
    contact_info: "",
    unit_type: "piece" as "piece" | "kg" | "size",
    weight_grams: "",
    variants: [] as { label: string; price: string; discount_price: string; weight_grams: string }[],
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const resetForm = () => {
    setForm({
      name: "", description: "", price: "", discount_price: "", image_url: "",
      category: "", is_active: true, is_featured: false, stock_status: "in_stock",
      sort_order: "0", contact_info: "", unit_type: "piece", weight_grams: "", variants: [],
    });
    setEditingProduct(null);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (p: any) => {
    setEditingProduct(p);
    setForm({
      name: p.name || "",
      description: p.description || "",
      price: String(p.price || 0),
      discount_price: p.discount_price ? String(p.discount_price) : "",
      image_url: p.image_url || "",
      category: p.category || "",
      is_active: p.is_active ?? true,
      is_featured: p.is_featured ?? false,
      stock_status: p.stock_status || "in_stock",
      sort_order: String(p.sort_order || 0),
      contact_info: p.contact_info || "",
      unit_type: (p.unit_type || "piece") as "piece" | "kg" | "size",
      weight_grams: p.weight_grams ? String(p.weight_grams) : "",
      variants: Array.isArray(p.variants)
        ? p.variants.map((v: any) => ({
            label: v.label || "",
            price: String(v.price ?? ""),
            discount_price: v.discount_price != null ? String(v.discount_price) : "",
            weight_grams: v.weight_grams != null ? String(v.weight_grams) : "",
          }))
        : [],
    });
    setDialogOpen(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: publicUrl }));
      toast.success("ছবি আপলোড হয়েছে");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("প্রডাক্টের নাম দিন"); return; }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(form.price) || 0,
      discount_price: form.discount_price ? Number(form.discount_price) : null,
      image_url: form.image_url || null,
      category: form.category.trim() || null,
      is_active: form.is_active,
      is_featured: form.is_featured,
      stock_status: form.stock_status,
      sort_order: Number(form.sort_order) || 0,
      contact_info: form.contact_info.trim() || null,
      unit_type: form.unit_type,
      weight_grams: Number(form.weight_grams) || 0,
      variants: form.variants
        .filter(v => v.label.trim() && v.price !== "")
        .map(v => ({
          label: v.label.trim(),
          price: Number(v.price) || 0,
          discount_price: v.discount_price ? Number(v.discount_price) : null,
          weight_grams: v.weight_grams ? Number(v.weight_grams) : 0,
        })),
    } as any;

    try {
      if (editingProduct) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
        if (error) throw error;
        toast.success("প্রডাক্ট আপডেট হয়েছে");
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        toast.success("প্রডাক্ট যোগ হয়েছে");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("প্রডাক্টটি মুছে ফেলতে চান?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("প্রডাক্ট মুছে ফেলা হয়েছে");
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
  };

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isProductAdmin && !isAdmin) return <Navigate to="/dashboard" replace />;

  const useProductLayout = isProductAdmin && !isAdmin;

  const content = (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌴</span>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">KM Products</h1>
            <p className="text-xs text-muted-foreground">প্রডাক্ট ও অর্ডার ম্যানেজমেন্ট</p>
          </div>
        </div>
        <Link to="/admin/delivery-settings" className="inline-flex items-center gap-1.5 text-xs font-bold bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-lg">
          <Truck className="h-4 w-4" /> <span className="hidden sm:inline">ডেলিভারি সেটিংস</span>
        </Link>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 sm:grid-cols-10 h-auto sm:h-11 bg-muted/50 rounded-xl">
          <TabsTrigger value="dashboard" className="text-xs gap-1 data-[state=active]:bg-card rounded-lg">
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">ড্যাশবোর্ড</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="text-xs gap-1 data-[state=active]:bg-card rounded-lg">
            <Package className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">প্রডাক্ট</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="text-xs gap-1 data-[state=active]:bg-card rounded-lg">
            <FolderTree className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">ক্যাটাগরি</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="text-xs gap-1 data-[state=active]:bg-card rounded-lg">
            <ShoppingBag className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">অর্ডার</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="text-xs gap-1 data-[state=active]:bg-card rounded-lg">
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">কাস্টমার</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs gap-1 data-[state=active]:bg-card rounded-lg">
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">ইউজার</span>
          </TabsTrigger>
          <TabsTrigger value="pricing" className="text-xs gap-1 data-[state=active]:bg-card rounded-lg">
            <Weight className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">প্রাইসিং</span>
          </TabsTrigger>
          <TabsTrigger value="videos" className="text-xs gap-1 data-[state=active]:bg-card rounded-lg">
            <Play className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">ভিডিও</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs gap-1 data-[state=active]:bg-card rounded-lg">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">রিপোর্ট</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-4">
          <ProductDashboardStats />
        </TabsContent>

        <TabsContent value="products" className="mt-4 space-y-4">
          {/* Product Category Sub-tabs */}
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl w-fit">
            <button
              onClick={() => setProductCategory("taler_gur")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                productCategory === "taler_gur"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🌴 তালের গুড়
            </button>
            <button
              onClick={() => setProductCategory("other")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                productCategory === "other"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              📦 অন্যান্য প্রডাক্ট
            </button>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              {productCategory === "taler_gur" ? "তালের গুড় প্রডাক্ট" : "অন্যান্য প্রডাক্ট"}
            </h2>
            <Button onClick={() => {
              resetForm();
              setForm(f => ({ ...f, category: productCategory === "taler_gur" ? "taler_gur" : "" }));
              setDialogOpen(true);
            }} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> নতুন প্রডাক্ট
            </Button>
          </div>

          {(() => {
            const filtered = products?.filter((p: any) =>
              productCategory === "taler_gur"
                ? p.category === "taler_gur"
                : p.category !== "taler_gur"
            ) ?? [];

            return isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((i) => <div key={i} className="h-40 bg-card animate-pulse rounded-xl" />)}
              </div>
            ) : !filtered.length ? (
              <div className="text-center py-16 text-muted-foreground">
                <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>{productCategory === "taler_gur" ? "তালের গুড়ের কোনো প্রডাক্ট নেই" : "অন্যান্য কোনো প্রডাক্ট নেই"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((p: any) => (
                  <div key={p.id} className="bg-card border border-border/30 rounded-2xl overflow-hidden hover:border-primary/30 transition-all group">
                    <div className="h-40 bg-muted relative">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="h-10 w-10 text-muted-foreground/20" />
                        </div>
                      )}
                      {!p.is_active && (
                        <div className="absolute top-2 right-2 bg-destructive/90 text-destructive-foreground text-xs px-2 py-0.5 rounded-full">নিষ্ক্রিয়</div>
                      )}
                      {p.discount_price && p.discount_price < p.price && (
                        <div className="absolute top-2 left-2 bg-destructive/90 text-destructive-foreground text-xs px-2 py-0.5 rounded-full font-bold">
                          {Math.round(((p.price - p.discount_price) / p.price) * 100)}% ছাড়
                        </div>
                      )}
                    </div>
                    <div className="p-3.5 space-y-2">
                      <h3 className="font-bold text-foreground text-sm">{p.name}</h3>
                      <div className="flex items-center gap-2">
                        {p.discount_price && p.discount_price < p.price ? (
                          <>
                            <span className="text-muted-foreground line-through text-xs">৳{p.price}</span>
                            <span className="text-base font-extrabold text-primary">৳{p.discount_price}</span>
                          </>
                        ) : (
                          <span className="text-base font-extrabold text-primary">৳{p.price}</span>
                        )}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" className="flex-1 gap-1" onClick={() => openEdit(p)}>
                          <Pencil className="h-3 w-3" /> এডিট
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <CategoryManager />
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="mt-4">
          <OrderManagement />
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="mt-4">
          <CustomerCRM />
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <ShopCustomersAdmin />
        </TabsContent>
        <TabsContent value="pricing" className="mt-4">
          <WeightPricingEditor />
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos" className="mt-4">
          <ProductVideoManager />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-4">
          <ReportsSection />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "প্রডাক্ট এডিট" : "নতুন প্রডাক্ট"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ছবি</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.image_url && (
                  <img src={form.image_url} alt="" className="h-16 w-16 object-cover rounded-lg border border-border" />
                )}
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleUpload} />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-1">
                  <Upload className="h-3 w-3" /> {uploading ? "আপলোড হচ্ছে..." : "ছবি আপলোড"}
                </Button>
              </div>
            </div>
            <div>
              <Label>প্রডাক্টের নাম *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="যেমন: তালের গুড় ১ কেজি" />
            </div>
            <div>
              <Label>বিবরণ</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="প্রডাক্টের বিবরণ" rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>বেস দাম (৳)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
              <div>
                <Label>ডিসকাউন্ট (৳)</Label>
                <Input type="number" value={form.discount_price} onChange={(e) => setForm((f) => ({ ...f, discount_price: e.target.value }))} placeholder="ঐচ্ছিক" />
              </div>
              <div>
                <Label>ওজন (গ্রাম)</Label>
                <Input type="number" value={form.weight_grams} onChange={(e) => setForm((f) => ({ ...f, weight_grams: e.target.value }))} placeholder="যেমন: ৫০০" />
              </div>
            </div>

            <div>
              <Label>ইউনিট টাইপ (কীভাবে বিক্রি হবে)</Label>
              <Select value={form.unit_type} onValueChange={(v: any) => setForm(f => ({ ...f, unit_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="piece">📦 পিস (টুকরা হিসেবে)</SelectItem>
                  <SelectItem value="kg">⚖️ কেজি / ওজন</SelectItem>
                  <SelectItem value="size">📏 সাইজ অনুযায়ী</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                {form.unit_type === "piece" && "প্রতি পিসের জন্য একটি দাম। ভিন্ন প্যাক/কম্বো হলে নিচে ভ্যারিয়েন্ট যোগ করুন।"}
                {form.unit_type === "kg" && "ওজন অনুযায়ী আলাদা দাম দিতে নিচে ভ্যারিয়েন্ট যোগ করুন (যেমন: ৫০০ গ্রাম, ১ কেজি, ২ কেজি)।"}
                {form.unit_type === "size" && "সাইজ অনুযায়ী আলাদা দাম দিতে নিচে ভ্যারিয়েন্ট যোগ করুন (যেমন: Small, Medium, Large)।"}
              </p>
            </div>

            <div className="border border-border/40 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold">
                  ভ্যারিয়েন্ট / অপশন {form.unit_type === "kg" ? "(ওজন)" : form.unit_type === "size" ? "(সাইজ)" : ""}
                </Label>
                <div className="flex gap-1">
                  <Button type="button" size="sm" variant="outline" className="h-7 gap-1"
                    onClick={() => setForm(f => ({ ...f, variants: [...f.variants, { label: "", price: "", discount_price: "", weight_grams: "" }] }))}>
                    <Plus className="h-3 w-3" /> অপশন
                  </Button>
                </div>
              </div>

              {form.unit_type === "size" && (
                <div className="flex flex-wrap gap-1.5 pb-1">
                  <span className="text-[11px] text-muted-foreground self-center mr-1">দ্রুত যোগ:</span>
                  {[
                    { group: "পোষাক (Adult)", sizes: ["S", "M", "L", "XL", "XXL", "XXXL"] },
                    { group: "পোষাক (Kids)", sizes: ["0-3M", "3-6M", "6-12M", "1-2Y", "2-3Y", "3-4Y", "4-5Y", "5-6Y", "7-8Y", "9-10Y"] },
                    { group: "নাম্বার সাইজ", sizes: ["28", "30", "32", "34", "36", "38", "40", "42", "44"] },
                    { group: "ফ্রি সাইজ", sizes: ["Free Size"] },
                  ].map((g) => (
                    <Button key={g.group} type="button" size="sm" variant="secondary" className="h-7 text-[11px] gap-1"
                      onClick={() => setForm(f => {
                        const existing = new Set(f.variants.map(v => v.label.trim()));
                        const toAdd = g.sizes
                          .filter(s => !existing.has(s))
                          .map(s => ({ label: s, price: "", discount_price: "", weight_grams: "" }));
                        return { ...f, variants: [...f.variants, ...toAdd] };
                      })}>
                      + {g.group}
                    </Button>
                  ))}
                  <Button type="button" size="sm" variant="ghost" className="h-7 text-[11px] text-destructive"
                    onClick={() => setForm(f => ({ ...f, variants: [] }))}>
                    সব মুছুন
                  </Button>
                </div>
              )}
              {form.variants.length === 0 && (
                <p className="text-[11px] text-muted-foreground">কোনো ভ্যারিয়েন্ট নেই — উপরের একক দাম ব্যবহার হবে।</p>
              )}
              {form.variants.map((v, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <Input className="col-span-3 h-9" placeholder={form.unit_type === "kg" ? "১ কেজি" : form.unit_type === "size" ? "Medium" : "১ পিস"}
                    value={v.label}
                    onChange={(e) => setForm(f => { const a = [...f.variants]; a[i] = { ...a[i], label: e.target.value }; return { ...f, variants: a }; })} />
                  <Input className="col-span-2 h-9" type="number" placeholder="দাম"
                    value={v.price}
                    onChange={(e) => setForm(f => { const a = [...f.variants]; a[i] = { ...a[i], price: e.target.value }; return { ...f, variants: a }; })} />
                  <Input className="col-span-2 h-9" type="number" placeholder="ডিসকা."
                    value={v.discount_price}
                    onChange={(e) => setForm(f => { const a = [...f.variants]; a[i] = { ...a[i], discount_price: e.target.value }; return { ...f, variants: a }; })} />
                  <Input className="col-span-3 h-9" type="number" placeholder="ওজন (গ্রাম)"
                    value={v.weight_grams}
                    onChange={(e) => setForm(f => { const a = [...f.variants]; a[i] = { ...a[i], weight_grams: e.target.value }; return { ...f, variants: a }; })} />
                  <Button type="button" size="sm" variant="ghost" className="col-span-2 text-destructive h-9"
                    onClick={() => setForm(f => ({ ...f, variants: f.variants.filter((_, j) => j !== i) }))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ক্যাটাগরি</Label>
                <Select value={form.category || "none"} onValueChange={(v) => setForm((f) => ({ ...f, category: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="বাছুন" /></SelectTrigger>
                  <SelectContent className="max-h-80">
                    <SelectItem value="none">কোনোটি নয়</SelectItem>
                    {categoryTree.map((m) => (
                      <div key={m.id}>
                        <div className="px-2 py-1 mt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          {m.icon} {m.label}
                        </div>
                        <SelectItem value={m.value}>{m.label} (মেইন)</SelectItem>
                        {m.children.map((s) => (
                          <SelectItem key={s.id} value={s.value}>— {s.label}</SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>স্টক স্ট্যাটাস</Label>
                <Select value={form.stock_status} onValueChange={(v) => setForm((f) => ({ ...f, stock_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_stock">স্টকে আছে</SelectItem>
                    <SelectItem value="out_of_stock">স্টক শেষ</SelectItem>
                    <SelectItem value="pre_order">প্রি-অর্ডার</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>যোগাযোগ নম্বর</Label>
              <Input value={form.contact_info} onChange={(e) => setForm((f) => ({ ...f, contact_info: e.target.value }))} placeholder="ফোন নম্বর" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>সর্ট অর্ডার</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
                <Label>সক্রিয়</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_featured} onCheckedChange={(v) => setForm((f) => ({ ...f, is_featured: v }))} />
                <Label>ফিচার্ড</Label>
              </div>
            </div>
            <Button onClick={handleSave} className="w-full">{editingProduct ? "আপডেট করুন" : "যোগ করুন"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (useProductLayout) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <span className="font-bold text-foreground">KM Products</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => signOut()} className="gap-1 text-muted-foreground">
              <LogOut className="h-4 w-4" /> লগআউট
            </Button>
          </div>
        </header>
        <main>{content}</main>
      </div>
    );
  }

  return <AppLayout>{content}</AppLayout>;
};

// Reports Section
const ReportsSection = () => {
  const { data: orders } = useQuery({
    queryKey: ["report-orders"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (!orders) return <div className="h-40 bg-card animate-pulse rounded-2xl" />;

  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const valid = orders.filter(o => o.status !== "cancelled" && o.status !== "abandoned");
  const thisMonthOrders = valid.filter(o => new Date(o.created_at) >= thisMonth);
  const lastMonthOrders = valid.filter(o => {
    const d = new Date(o.created_at);
    return d >= lastMonth && d <= lastMonthEnd;
  });

  const thisMonthRev = thisMonthOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const lastMonthRev = lastMonthOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const growth = lastMonthRev > 0 ? Math.round(((thisMonthRev - lastMonthRev) / lastMonthRev) * 100) : 0;

  const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

  const statusCounts = valid.reduce((acc: Record<string, number>, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const totalDelivered = statusCounts["delivered"] || 0;
  const totalPending = statusCounts["pending"] || 0;
  const conversionRate = valid.length > 0 ? Math.round((totalDelivered / valid.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" /> রিপোর্ট সামারি
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border/30 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">এই মাসের আয়</p>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">৳{toBn(thisMonthRev)}</p>
        </div>
        <div className="bg-card border border-border/30 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">গত মাসের আয়</p>
          <p className="text-2xl font-extrabold text-amber-400 mt-1">৳{toBn(lastMonthRev)}</p>
        </div>
        <div className="bg-card border border-border/30 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">প্রবৃদ্ধি</p>
          <p className={`text-2xl font-extrabold mt-1 ${growth >= 0 ? "text-emerald-400" : "text-destructive"}`}>
            {growth >= 0 ? "+" : ""}{toBn(growth)}%
          </p>
        </div>
        <div className="bg-card border border-border/30 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">ডেলিভারি রেট</p>
          <p className="text-2xl font-extrabold text-blue-400 mt-1">{toBn(conversionRate)}%</p>
        </div>
      </div>

      <div className="bg-card border border-border/30 rounded-2xl p-4">
        <h4 className="font-bold text-foreground text-sm mb-3">অর্ডার স্ট্যাটাস সামারি</h4>
        <div className="space-y-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
              <span className="text-sm text-foreground capitalize">{status}</span>
              <span className="text-sm font-bold text-foreground">{toBn(count)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminProducts;
