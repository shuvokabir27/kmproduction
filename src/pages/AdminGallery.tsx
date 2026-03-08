import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Image, Upload, Link, Eye, EyeOff, GripVertical } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const AdminGallery = () => {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");

  const { data: images, isLoading } = useQuery({
    queryKey: ["gallery-images-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_images" as any)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gallery_images" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-images-admin"] });
      toast({ title: "ছবি মুছে ফেলা হয়েছে" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("gallery_images" as any).update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["gallery-images-admin"] }),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop();
        const fileName = `${Date.now()}-${i}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("gallery")
          .upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(fileName);

        const maxOrder = images?.length ? Math.max(...images.map((img: any) => img.sort_order || 0)) : 0;

        const { error: insertError } = await supabase.from("gallery_images" as any).insert({
          image_url: urlData.publicUrl,
          title: file.name.replace(/\.[^/.]+$/, ""),
          sort_order: maxOrder + 1 + i,
        } as any);
        if (insertError) throw insertError;
      }

      queryClient.invalidateQueries({ queryKey: ["gallery-images-admin"] });
      toast({ title: `${files.length}টি ছবি আপলোড হয়েছে` });
    } catch (err: any) {
      toast({ title: "আপলোডে সমস্যা", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleAddLink = async () => {
    if (!linkUrl.trim()) return;
    try {
      const maxOrder = images?.length ? Math.max(...images.map((img: any) => img.sort_order || 0)) : 0;
      const { error } = await supabase.from("gallery_images" as any).insert({
        image_url: linkUrl.trim(),
        title: linkTitle.trim() || null,
        sort_order: maxOrder + 1,
      } as any);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["gallery-images-admin"] });
      setLinkUrl("");
      setLinkTitle("");
      toast({ title: "ছবি যুক্ত হয়েছে" });
    } catch (err: any) {
      toast({ title: "সমস্যা হয়েছে", description: err.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">ছবি গ্যালারী</h1>

        {/* Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" /> ছবি আপলোড
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="gallery-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-all">
                  <Image className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {uploading ? "আপলোড হচ্ছে..." : "ক্লিক করুন বা ড্র্যাগ করুন"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">একসাথে একাধিক ছবি সিলেক্ট করতে পারবেন</p>
                </div>
              </Label>
              <input
                id="gallery-upload"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Link className="h-4 w-4 text-primary" /> লিংক যুক্ত করুন
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs mb-1 block">ছবির URL</Label>
                <Input
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">টাইটেল (ঐচ্ছিক)</Label>
                <Input
                  placeholder="ছবির নাম"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                />
              </div>
              <Button onClick={handleAddLink} size="sm" className="w-full" disabled={!linkUrl.trim()}>
                <Plus className="h-4 w-4 mr-1" /> যুক্ত করুন
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Image Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">সকল ছবি ({images?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">লোড হচ্ছে...</p>
            ) : !images?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">কোনো ছবি নেই</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((img: any) => (
                  <div
                    key={img.id}
                    className={`relative group rounded-xl overflow-hidden border border-border/30 ${
                      !img.is_active ? "opacity-50" : ""
                    }`}
                  >
                    <div className="aspect-[4/3] bg-muted">
                      <img
                        src={img.image_url}
                        alt={img.title || "Gallery"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleMutation.mutate({ id: img.id, is_active: !img.is_active })}
                      >
                        {img.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(img.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {img.title && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-2">
                        <p className="text-xs text-foreground truncate">{img.title}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AdminGallery;
