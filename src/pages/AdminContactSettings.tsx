import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Facebook, MessageCircle, Phone, Mail, MapPin, Youtube, Instagram, Globe } from "lucide-react";

interface FacebookPage {
  name: string;
  url: string;
}

const AdminContactSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").limit(1).single();
      return data;
    },
  });

  const [form, setForm] = useState({
    contact_phone: "",
    contact_email: "",
    contact_address: "",
    whatsapp_no: "",
    facebook_url: "",
    youtube_url: "",
    instagram_url: "",
    tiktok_url: "",
  });
  const [pages, setPages] = useState<FacebookPage[]>([]);

  useEffect(() => {
    if (settings) {
      setForm({
        contact_phone: settings.contact_phone || "",
        contact_email: settings.contact_email || "",
        contact_address: settings.contact_address || "",
        whatsapp_no: (settings as any).whatsapp_no || "",
        facebook_url: settings.facebook_url || "",
        youtube_url: settings.youtube_url || "",
        instagram_url: settings.instagram_url || "",
        tiktok_url: settings.tiktok_url || "",
      });
      setPages(((settings as any).facebook_pages as FacebookPage[]) || []);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updateData = {
        ...form,
        facebook_pages: pages,
      };
      if (settings?.id) {
        const { error } = await supabase.from("site_settings").update(updateData as any).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("site_settings").insert(updateData as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast({ title: "সংরক্ষিত হয়েছে!" });
    },
    onError: () => {
      toast({ title: "সংরক্ষণে সমস্যা হয়েছে", variant: "destructive" });
    },
  });

  const addPage = () => setPages([...pages, { name: "", url: "" }]);
  const removePage = (i: number) => setPages(pages.filter((_, idx) => idx !== i));
  const updatePage = (i: number, field: keyof FacebookPage, val: string) => {
    const updated = [...pages];
    updated[i] = { ...updated[i], [field]: val };
    setPages(updated);
  };

  if (isLoading) return <AppLayout><div className="p-8 text-center text-muted-foreground">লোড হচ্ছে...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">যোগাযোগ সেটিংস</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" /> যোগাযোগ তথ্য
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="flex items-center gap-2 mb-1.5">
                <MessageCircle className="h-4 w-4 text-green-500" /> WhatsApp নাম্বার
              </Label>
              <Input
                placeholder="+8801XXXXXXXXX"
                value={form.whatsapp_no}
                onChange={(e) => setForm({ ...form, whatsapp_no: e.target.value })}
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-1.5">
                <Phone className="h-4 w-4" /> ফোন নাম্বার
              </Label>
              <Input
                placeholder="01XXXXXXXXX"
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-1.5">
                <Mail className="h-4 w-4" /> ইমেইল
              </Label>
              <Input
                placeholder="email@example.com"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-1.5">
                <MapPin className="h-4 w-4" /> ঠিকানা
              </Label>
              <Input
                placeholder="আপনার ঠিকানা"
                value={form.contact_address}
                onChange={(e) => setForm({ ...form, contact_address: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Facebook Pages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Facebook className="h-5 w-5 text-blue-500" /> ফেসবুক পেইজ সমূহ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pages.map((page, i) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30 border border-border/30">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="পেইজের নাম (যেমন: KM Production House)"
                    value={page.name}
                    onChange={(e) => updatePage(i, "name", e.target.value)}
                  />
                  <Input
                    placeholder="https://facebook.com/..."
                    value={page.url}
                    onChange={(e) => updatePage(i, "url", e.target.value)}
                  />
                </div>
                <Button variant="ghost" size="icon" onClick={() => removePage(i)} className="text-destructive hover:text-destructive mt-1">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addPage} className="w-full">
              <Plus className="h-4 w-4 mr-1" /> নতুন পেইজ যোগ করুন
            </Button>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" /> সোশ্যাল মিডিয়া লিংক
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="flex items-center gap-2 mb-1.5">
                <Facebook className="h-4 w-4 text-blue-500" /> Facebook URL
              </Label>
              <Input
                placeholder="https://facebook.com/..."
                value={form.facebook_url}
                onChange={(e) => setForm({ ...form, facebook_url: e.target.value })}
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-1.5">
                <Youtube className="h-4 w-4 text-red-500" /> YouTube URL
              </Label>
              <Input
                placeholder="https://youtube.com/..."
                value={form.youtube_url}
                onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-1.5">
                <Instagram className="h-4 w-4 text-pink-500" /> Instagram URL
              </Label>
              <Input
                placeholder="https://instagram.com/..."
                value={form.instagram_url}
                onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-1.5">
                <Globe className="h-4 w-4" /> TikTok URL
              </Label>
              <Input
                placeholder="https://tiktok.com/..."
                value={form.tiktok_url}
                onChange={(e) => setForm({ ...form, tiktok_url: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full" size="lg">
          {saveMutation.isPending ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
        </Button>
      </div>
    </AppLayout>
  );
};

export default AdminContactSettings;
