import { useEffect, useState } from "react";
import { WPAdminShell } from "@/components/admin/WPAdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon } from "lucide-react";

type Hero = {
  id?: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image_url: string | null;
  hero_badge: string;
  hero_cta_label: string;
  hero_cta_link: string;
};

const empty: Hero = {
  hero_title: "",
  hero_subtitle: "",
  hero_image_url: null,
  hero_badge: "",
  hero_cta_label: "",
  hero_cta_link: "",
};

export default function AdminSiteHero() {
  const [data, setData] = useState<Hero>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: row } = await supabase
        .from("site_settings")
        .select("id, hero_title, hero_subtitle, hero_image_url, hero_badge, hero_cta_label, hero_cta_link")
        .limit(1)
        .maybeSingle();
      if (row) setData({ ...empty, ...row } as Hero);
      setLoading(false);
    })();
  }, []);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `site-hero/hero-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, {
        upsert: true, cacheControl: "3600",
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
      setData((d) => ({ ...d, hero_image_url: pub.publicUrl }));
      toast.success("ছবি আপলোড হয়েছে");
    } catch (e: any) {
      toast.error(e.message || "আপলোড ব্যর্থ");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        hero_title: data.hero_title,
        hero_subtitle: data.hero_subtitle,
        hero_image_url: data.hero_image_url,
        hero_badge: data.hero_badge,
        hero_cta_label: data.hero_cta_label,
        hero_cta_link: data.hero_cta_link,
      };
      const query = data.id
        ? supabase.from("site_settings").update(payload).eq("id", data.id)
        : supabase.from("site_settings").insert(payload);
      const { error } = await query;
      if (error) throw error;
      toast.success("সংরক্ষণ হয়েছে");
    } catch (e: any) {
      toast.error(e.message || "সংরক্ষণ ব্যর্থ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <WPAdminShell title="হিরো ব্যানার">
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      </WPAdminShell>
    );
  }

  return (
    <WPAdminShell
      title="হিরো ব্যানার"
      subtitle="হোম পেইজের প্রধান ব্যানারের কন্টেন্ট এডিট করুন"
      actions={
        <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          সংরক্ষণ করুন
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-white border border-slate-200 rounded-md p-5 md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">টেক্সট কন্টেন্ট</h2>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-slate-600">ব্যাজ টেক্সট</Label>
              <Input value={data.hero_badge || ""} onChange={(e) => setData({ ...data, hero_badge: e.target.value })} placeholder="যেমন: ১০০% অর্গানিক" />
            </div>
            <div>
              <Label className="text-xs text-slate-600">হিরো টাইটেল (নতুন লাইনের জন্য Enter চাপুন)</Label>
              <Textarea rows={3} value={data.hero_title || ""} onChange={(e) => setData({ ...data, hero_title: e.target.value })} placeholder={"প্রতিদিনের সুস্থতায়\nহোক খাঁটি পণ্য"} />
            </div>
            <div>
              <Label className="text-xs text-slate-600">সাবটাইটেল</Label>
              <Textarea rows={3} value={data.hero_subtitle || ""} onChange={(e) => setData({ ...data, hero_subtitle: e.target.value })} placeholder="সংক্ষিপ্ত বিবরণ..." />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-slate-600">বাটন লেবেল</Label>
                <Input value={data.hero_cta_label || ""} onChange={(e) => setData({ ...data, hero_cta_label: e.target.value })} placeholder="এখনই কিনুন" />
              </div>
              <div>
                <Label className="text-xs text-slate-600">বাটন লিংক</Label>
                <Input value={data.hero_cta_link || ""} onChange={(e) => setData({ ...data, hero_cta_link: e.target.value })} placeholder="#shop" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-md p-5 md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">হিরো ইমেজ</h2>
          <p className="text-xs text-slate-500 mb-4">প্রোডাক্ট/ফল-সবজির ট্রান্সপারেন্ট ছবি ভালো দেখায়।</p>
          <div className="flex items-center gap-4">
            <div className="h-32 w-32 rounded border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
              {data.hero_image_url ? (
                <img src={data.hero_image_url} alt="hero" className="h-full w-full object-contain" />
              ) : (
                <ImageIcon className="h-8 w-8 text-slate-300" />
              )}
            </div>
            <label className="inline-flex items-center gap-2 text-sm px-3 py-2 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              আপলোড
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
            {data.hero_image_url && (
              <button onClick={() => setData((d) => ({ ...d, hero_image_url: null }))} className="text-xs text-red-600 hover:underline">মুছুন</button>
            )}
          </div>
        </div>
      </div>
    </WPAdminShell>
  );
}
