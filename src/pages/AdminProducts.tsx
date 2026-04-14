import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
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
import { Plus, Pencil, Trash2, ShoppingBag, Upload, Image } from "lucide-react";

const AdminProducts = () => {
  const { user, isProductAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      sort_order: "0", contact_info: "",
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
    };

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
  if (!isProductAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">প্রডাক্ট ম্যানেজমেন্ট</h1>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> নতুন প্রডাক্ট
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-card animate-pulse rounded-lg" />)}
          </div>
        ) : !products?.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>কোনো প্রডাক্ট নেই। নতুন প্রডাক্ট যোগ করুন।</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p: any) => (
              <div key={p.id} className="bg-card border border-border/50 rounded-lg overflow-hidden">
                <div className="h-40 bg-muted relative">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="h-10 w-10 text-muted-foreground/20" />
                    </div>
                  )}
                  {!p.is_active && (
                    <div className="absolute top-2 right-2 bg-destructive/80 text-destructive-foreground text-xs px-2 py-0.5 rounded">নিষ্ক্রিয়</div>
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <h3 className="font-semibold text-foreground">{p.name}</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-primary font-bold">৳{p.price}</span>
                    {p.discount_price && <span className="text-muted-foreground line-through text-xs">৳{p.discount_price}</span>}
                    {p.category && <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">{p.category}</span>}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEdit(p)}>
                      <Pencil className="h-3 w-3" /> এডিট
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive gap-1" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "প্রডাক্ট এডিট" : "নতুন প্রডাক্ট"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>প্রডাক্টের নাম *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="প্রডাক্টের নাম" />
              </div>
              <div>
                <Label>বিবরণ</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="প্রডাক্টের বিবরণ" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>দাম (৳)</Label>
                  <Input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
                </div>
                <div>
                  <Label>ডিসকাউন্ট দাম (৳)</Label>
                  <Input type="number" value={form.discount_price} onChange={(e) => setForm((f) => ({ ...f, discount_price: e.target.value }))} placeholder="ঐচ্ছিক" />
                </div>
              </div>
              <div>
                <Label>ক্যাটাগরি</Label>
                <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="যেমন: পোশাক, ইলেক্ট্রনিক্স" />
              </div>
              <div>
                <Label>ছবি</Label>
                <div className="flex items-center gap-3">
                  {form.image_url && (
                    <img src={form.image_url} alt="" className="h-16 w-16 object-cover rounded border border-border" />
                  )}
                  <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleUpload} />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-1">
                    <Upload className="h-3 w-3" /> {uploading ? "আপলোড হচ্ছে..." : "ছবি আপলোড"}
                  </Button>
                </div>
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
    </AppLayout>
  );
};

export default AdminProducts;
