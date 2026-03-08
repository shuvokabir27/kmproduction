import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Image as ImageIcon, Eye, EyeOff, Star, Calendar, Newspaper, Crop, Check, Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2, List, ListOrdered, AlignLeft, AlignCenter, Link2, Video, ZoomIn, ZoomOut, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminTicker from "@/components/AdminTicker";
import { format } from "date-fns";
import ReactCrop, { type Crop as CropType, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

const categories = [
  { value: "entertainment", label: "🎬 এন্টারটেইনমেন্ট" },
  { value: "funny", label: "😂 ফানি" },
  { value: "behind-the-scenes", label: "🎭 বিহাইন্ড দ্য সিন" },
  { value: "announcement", label: "📢 ঘোষণা" },
];

interface NewsItem {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  featured_image_url: string | null;
  category: string;
  is_published: boolean;
  is_featured: boolean;
  created_at: string;
  published_at: string | null;
  video_url: string | null;
  publisher_id: string | null;
}

interface Publisher {
  id: string;
  name: string;
  photo_url: string | null;
  created_at: string;
}

export default function AdminNews() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("entertainment");
  const [isPublished, setIsPublished] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [inlineUploading, setInlineUploading] = useState(false);
  const inlineFileRef = useRef<HTMLInputElement>(null);
  const [inlineImageDialog, setInlineImageDialog] = useState(false);
  const [inlineImageUrl, setInlineImageUrl] = useState<string | null>(null);
  const [inlineCaption, setInlineCaption] = useState("");
  const [inlineSize, setInlineSize] = useState(60); // percentage width
  const [editingInlineImage, setEditingInlineImage] = useState<{ match: string; caption: string; size: number; url: string } | null>(null);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<CropType>();
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const c = centerCrop(
      makeAspectCrop({ unit: "%", width: 90 }, 16 / 9, width, height),
      width, height
    );
    setCrop(c);
  }, []);

  const getCroppedBlob = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const image = imgRef.current;
      if (!image || !completedCrop) return reject("No crop");
      const canvas = document.createElement("canvas");
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      const pixelCrop = {
        x: (completedCrop.x || 0) * scaleX,
        y: (completedCrop.y || 0) * scaleY,
        width: (completedCrop.width || 0) * scaleX,
        height: (completedCrop.height || 0) * scaleY,
      };
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("No canvas context");
      ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject("Failed to create blob");
      }, "image/jpeg", 0.92);
    });
  }, [completedCrop]);

  const handleCropConfirm = async () => {
    try {
      const blob = await getCroppedBlob();
      const file = new File([blob], `cropped-${Date.now()}.jpg`, { type: "image/jpeg" });
      setImageFile(file);
      setImagePreview(URL.createObjectURL(blob));
      setCropDialogOpen(false);
      setRawImageSrc(null);
    } catch {
      toast({ title: "ক্রপ ব্যর্থ", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (!loading && !isAdmin) navigate("/login");
  }, [loading, isAdmin, navigate]);

  const { data: newsList, isLoading } = useQuery({
    queryKey: ["admin-news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as NewsItem[];
    },
  });

  const contentRef = useRef<HTMLTextAreaElement>(null);

  const insertFormat = (prefix: string, suffix: string = "") => {
    const ta = contentRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.substring(start, end);
    const before = content.substring(0, start);
    const after = content.substring(end);
    const newText = `${before}${prefix}${selected}${suffix}${after}`;
    setContent(newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const handleInlineImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setInlineUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `inline-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("news-images").upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from("news-images").getPublicUrl(fileName);
      setInlineImageUrl(data.publicUrl);
      setInlineCaption("");
      setInlineSize(60);
      setInlineImageDialog(true);
    } catch (err: any) {
      toast({ title: "ছবি আপলোড ব্যর্থ", description: err.message, variant: "destructive" });
    }
    setInlineUploading(false);
    if (inlineFileRef.current) inlineFileRef.current.value = "";
  };

  const confirmInlineImage = () => {
    if (!inlineImageUrl) return;
    if (editingInlineImage) {
      // Replace the old markdown with new one
      const newMarkdown = `![${inlineCaption}|${inlineSize}](${inlineImageUrl})`;
      setContent(content.replace(editingInlineImage.match, newMarkdown));
      setEditingInlineImage(null);
    } else {
      // Insert new
      insertFormat(`\n![${inlineCaption}|${inlineSize}](${inlineImageUrl})\n`, "");
    }
    setInlineImageDialog(false);
    setInlineImageUrl(null);
  };

  const openEditInlineImage = (match: string, caption: string, size: number, url: string) => {
    setEditingInlineImage({ match, caption, size, url });
    setInlineImageUrl(url);
    setInlineCaption(caption);
    setInlineSize(size);
    setInlineImageDialog(true);
  };

  // Parse inline images from content
  const inlineImages = Array.from(content.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)).map((m) => {
    const meta = m[1];
    const url = m[2];
    let caption = meta;
    let size = 100;
    if (meta.includes("|")) {
      const parts = meta.split("|");
      caption = parts[0];
      size = parseInt(parts[1]) || 100;
    }
    return { match: m[0], caption, size, url };
  });

  const resetForm = () => {
    setTitle("");
    setContent("");
    setExcerpt("");
    setCategory("entertainment");
    setIsPublished(false);
    setIsFeatured(false);
    setImageFile(null);
    setImagePreview(null);
    setEditingNews(null);
    setRawImageSrc(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setVideoUrl("");
  };

  const openEdit = (news: NewsItem) => {
    setEditingNews(news);
    setTitle(news.title);
    setContent(news.content);
    setExcerpt(news.excerpt || "");
    setCategory(news.category);
    setIsPublished(news.is_published);
    setIsFeatured(news.is_featured);
    setImagePreview(news.featured_image_url);
    setVideoUrl(news.video_url || "");
    setImageFile(null);
    setDialogOpen(true);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const src = URL.createObjectURL(file);
      setRawImageSrc(src);
      setCropDialogOpen(true);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("news-images").upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from("news-images").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let imageUrl = editingNews?.featured_image_url || null;

      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const payload = {
        title,
        content,
        excerpt: excerpt || null,
        featured_image_url: imageUrl,
        category,
        is_published: isPublished,
        is_featured: isFeatured,
        published_at: isPublished ? new Date().toISOString() : null,
        video_url: videoUrl || null,
      };

      if (editingNews) {
        const { error } = await supabase.from("news").update(payload).eq("id", editingNews.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("news").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-news"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: editingNews ? "নিউজ আপডেট হয়েছে" : "নিউজ তৈরি হয়েছে" });
      setUploading(false);
    },
    onError: (err: any) => {
      toast({ title: "ত্রুটি", description: err.message, variant: "destructive" });
      setUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("news").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-news"] });
      toast({ title: "নিউজ মুছে ফেলা হয়েছে" });
    },
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from("news").update({
        is_published: published,
        published_at: published ? new Date().toISOString() : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-news"] });
    },
  });

  if (loading || !isAdmin) return null;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Newspaper className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">নিউজ ম্যানেজমেন্ট</h1>
              <p className="text-xs text-muted-foreground">এন্টারটেইনমেন্ট ও ফানি নিউজ</p>
            </div>
          </div>
          <Button onClick={openNew} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> নতুন নিউজ
          </Button>
        </div>

        <Tabs defaultValue="news">
          <TabsList className="mb-4">
            <TabsTrigger value="news" className="gap-1.5">
              <Newspaper className="h-3.5 w-3.5" /> নিউজ
            </TabsTrigger>
            <TabsTrigger value="ticker" className="gap-1.5">
              <Zap className="h-3.5 w-3.5" /> টিকার
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ticker">
            <AdminTicker />
          </TabsContent>

          <TabsContent value="news">

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 rounded-xl bg-secondary/50 animate-pulse" />
            ))}
          </div>
        ) : !newsList?.length ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>কোনো নিউজ নেই। নতুন নিউজ যোগ করুন।</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {newsList.map((news) => (
              <Card key={news.id} className="overflow-hidden hover:border-border/60 transition-colors">
                <CardContent className="p-0">
                  <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div className="w-28 h-28 md:w-36 md:h-28 flex-shrink-0 bg-secondary/50 overflow-hidden">
                      {news.featured_image_url ? (
                        <img src={news.featured_image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 py-3 pr-3 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant={news.is_published ? "default" : "secondary"} className="text-[10px]">
                            {news.is_published ? "প্রকাশিত" : "ড্রাফট"}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {categories.find(c => c.value === news.category)?.label || news.category}
                          </Badge>
                          {news.is_featured && (
                            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                          )}
                        </div>
                        <h3 className="font-semibold text-sm text-foreground truncate">{news.title}</h3>
                        {news.excerpt && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{news.excerpt}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(news.created_at), "dd MMM yyyy")}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => togglePublish.mutate({ id: news.id, published: !news.is_published })}
                          >
                            {news.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(news)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => {
                              if (confirm("নিউজটি মুছে ফেলতে চান?")) deleteMutation.mutate(news.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-orange-400" />
                {editingNews ? "নিউজ সম্পাদনা" : "নতুন নিউজ"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {/* Featured Image */}
              <div>
                <Label className="text-xs font-medium mb-2 block">ফিচার ফটো</Label>
                <div className="relative">
                  {imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-border/40">
                      <img src={imagePreview} alt="" className="w-full h-48 object-cover" />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-2 right-2 gap-1"
                        onClick={() => { setImageFile(null); setImagePreview(null); }}
                      >
                        <Trash2 className="h-3 w-3" /> সরান
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-40 rounded-xl border-2 border-dashed border-border/50 bg-secondary/30 cursor-pointer hover:bg-secondary/50 transition-colors">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <span className="text-xs text-muted-foreground">ছবি আপলোড করুন</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    </label>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <Label className="text-xs font-medium mb-1.5 block">শিরোনাম *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="নিউজের শিরোনাম লিখুন..."
                  className="text-base"
                />
              </div>

              {/* Excerpt */}
              <div>
                <Label className="text-xs font-medium mb-1.5 block">সংক্ষিপ্ত বিবরণ</Label>
                <Input
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="সংক্ষেপে নিউজের বিষয়বস্তু..."
                />
              </div>

              {/* Content with toolbar */}
              <div>
                <Label className="text-xs font-medium mb-1.5 block">বিস্তারিত *</Label>
                <div className="border border-border/50 rounded-xl overflow-hidden">
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-secondary/40 border-b border-border/30">
                    <button type="button" onClick={() => insertFormat("**", "**")} className="h-7 w-7 rounded flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="বোল্ড">
                      <Bold className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => insertFormat("*", "*")} className="h-7 w-7 rounded flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="ইটালিক">
                      <Italic className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => insertFormat("__", "__")} className="h-7 w-7 rounded flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="আন্ডারলাইন">
                      <UnderlineIcon className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-px h-5 bg-border/50 mx-1" />
                    <button type="button" onClick={() => insertFormat("\n# ", "\n")} className="h-7 w-7 rounded flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="বড় হেডিং">
                      <Heading1 className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => insertFormat("\n## ", "\n")} className="h-7 w-7 rounded flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="ছোট হেডিং">
                      <Heading2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-px h-5 bg-border/50 mx-1" />
                    <button type="button" onClick={() => insertFormat("\n• ", "")} className="h-7 w-7 rounded flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="বুলেট লিস্ট">
                      <List className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => insertFormat("\n1. ", "")} className="h-7 w-7 rounded flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="নম্বর লিস্ট">
                      <ListOrdered className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-px h-5 bg-border/50 mx-1" />
                    <button type="button" onClick={() => insertFormat("\n---\n", "")} className="h-7 w-7 rounded flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="লাইন বিভাজক">
                      <AlignCenter className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => { const url = prompt("লিংক দিন:"); if (url) insertFormat("[", `](${url})`); }} className="h-7 w-7 rounded flex items-center justify-center hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="লিংক">
                      <Link2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-px h-5 bg-border/50 mx-1" />
                    <button
                      type="button"
                      onClick={() => inlineFileRef.current?.click()}
                      disabled={inlineUploading}
                      className="h-7 px-2 rounded flex items-center justify-center gap-1 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors text-[11px]"
                      title="কন্টেন্টে ছবি যোগ করুন"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      {inlineUploading ? "আপলোড..." : "ছবি"}
                    </button>
                    <input ref={inlineFileRef} type="file" accept="image/*" className="hidden" onChange={handleInlineImage} />
                  </div>
                  <Textarea
                    ref={contentRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="নিউজের পুরো বিবরণ লিখুন..."
                    rows={10}
                    className="text-sm leading-relaxed border-0 rounded-none focus-visible:ring-0 resize-y"
                  />
                </div>
                {/* Inline Images Edit List */}
                {inlineImages.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">কন্টেন্টের ছবি (ক্লিক করে এডিট করুন):</Label>
                    <div className="flex flex-wrap gap-2">
                      {inlineImages.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => openEditInlineImage(img.match, img.caption, img.size, img.url)}
                          className="relative group rounded-lg overflow-hidden border border-border/40 hover:border-primary/50 transition-all"
                          style={{ width: "72px", height: "72px" }}
                        >
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
                            <Pencil className="h-3.5 w-3.5 text-white" />
                            <span className="text-[9px] text-white mt-0.5">{img.size}%</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Video URL */}
              <div>
                <Label className="text-xs font-medium mb-1.5 block flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5" /> ভিডিও লিংক (ঐচ্ছিক)
                </Label>
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="YouTube বা অন্য ভিডিও লিংক দিন..."
                />
                {videoUrl && (
                  <p className="text-[10px] text-muted-foreground mt-1">নিউজের শেষে ভিডিও এম্বেড হবে</p>
                )}
              </div>

              {/* Category */}
              <div>
                <Label className="text-xs font-medium mb-1.5 block">ক্যাটাগরি</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Switch id="published" checked={isPublished} onCheckedChange={setIsPublished} />
                  <Label htmlFor="published" className="text-sm">প্রকাশ করুন</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="featured" checked={isFeatured} onCheckedChange={setIsFeatured} />
                  <Label htmlFor="featured" className="text-sm">ফিচার্ড</Label>
                </div>
              </div>

              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!title.trim() || !content.trim() || uploading}
                className="w-full"
              >
                {uploading ? "আপলোড হচ্ছে..." : editingNews ? "আপডেট করুন" : "নিউজ প্রকাশ করুন"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Crop Dialog */}
        <Dialog open={cropDialogOpen} onOpenChange={(open) => { setCropDialogOpen(open); if (!open) setRawImageSrc(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crop className="h-5 w-5 text-primary" /> ছবি ক্রপ করুন
              </DialogTitle>
            </DialogHeader>
            <div className="mt-2">
              {rawImageSrc && (
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={16 / 9}
                  className="rounded-lg overflow-hidden max-h-[60vh]"
                >
                  <img
                    ref={imgRef}
                    src={rawImageSrc}
                    alt="Crop"
                    onLoad={onImageLoad}
                    className="max-h-[60vh] w-full object-contain"
                  />
                </ReactCrop>
              )}
              <div className="flex gap-2 mt-4">
                <Button variant="secondary" className="flex-1" onClick={() => { setCropDialogOpen(false); setRawImageSrc(null); }}>
                  বাতিল
                </Button>
                <Button className="flex-1 gap-1.5" onClick={handleCropConfirm} disabled={!completedCrop}>
                  <Check className="h-4 w-4" /> ক্রপ সম্পন্ন
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Inline Image Size Dialog */}
        <Dialog open={inlineImageDialog} onOpenChange={(open) => { setInlineImageDialog(open); if (!open) { setInlineImageUrl(null); setEditingInlineImage(null); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" /> {editingInlineImage ? "ছবি এডিট করুন" : "ছবি সাইজ ও ক্যাপশন"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {inlineImageUrl && (
                <div className="flex justify-center bg-secondary/30 rounded-xl p-4 border border-border/30">
                  <img
                    src={inlineImageUrl}
                    alt="Preview"
                    className="rounded-lg border border-border/30 object-contain"
                    style={{ width: `${inlineSize}%`, maxHeight: "300px" }}
                  />
                </div>
              )}

              {/* Zoom Controls */}
              <div>
                <Label className="text-xs font-medium mb-2 block">সাইজ: {inlineSize}%</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setInlineSize(Math.max(20, inlineSize - 10))}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <input
                    type="range"
                    min={20}
                    max={100}
                    step={5}
                    value={inlineSize}
                    onChange={(e) => setInlineSize(Number(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setInlineSize(Math.min(100, inlineSize + 10))}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[30, 50, 70, 100].map(s => (
                    <button
                      key={s}
                      onClick={() => setInlineSize(s)}
                      className={`px-3 py-1 rounded-md text-xs border transition-colors ${inlineSize === s ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/50 text-muted-foreground border-border/30"}`}
                    >
                      {s}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Caption */}
              <div>
                <Label className="text-xs font-medium mb-1.5 block">ক্যাপশন (ঐচ্ছিক)</Label>
                <Input
                  value={inlineCaption}
                  onChange={(e) => setInlineCaption(e.target.value)}
                  placeholder="ছবির ক্যাপশন লিখুন..."
                />
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => { setInlineImageDialog(false); setInlineImageUrl(null); }}>
                  বাতিল
                </Button>
                <Button className="flex-1 gap-1.5" onClick={confirmInlineImage}>
                  <Check className="h-4 w-4" /> {editingInlineImage ? "আপডেট করুন" : "যোগ করুন"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
