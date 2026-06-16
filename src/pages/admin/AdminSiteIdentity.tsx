import { useEffect, useState } from "react";
import { WPAdminShell } from "@/components/admin/WPAdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon } from "lucide-react";

type Identity = {
  id?: string;
  shop_name: string;
  shop_tagline: string;
  site_name: string;
  logo_url: string | null;
  favicon_url: string | null;
};

const empty: Identity = {
  shop_name: "",
  shop_tagline: "",
  site_name: "",
  logo_url: null,
  favicon_url: null,
};

export default function AdminSiteIdentity() {
  const [data, setData] = useState<Identity>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "favicon" | null>(null);

  useEffect(() => {
    (async () => {
      const { data: row } = await supabase
        .from("site_settings")
        .select("id, shop_name, shop_tagline, site_name, logo_url, favicon_url")
        .limit(1)
        .maybeSingle();
      if (row) setData({ ...empty, ...row } as Identity);
      setLoading(false);
    })();
  }, []);

  const upload = async (file: File, kind: "logo" | "favicon") => {
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `site-identity/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, {
        upsert: true, cacheControl: "3600",
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
      setData((d) => ({ ...d, [kind === "logo" ? "logo_url" : "favicon_url"]: pub.publicUrl }));
      toast.success(`${kind === "logo" ? "লোগো" : "আইকন"} আপলোড হয়েছে`);
    } catch (e: any) {
      toast.error(e.message || "আপলোড ব্যর্থ");
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        shop_name: data.shop_name,
        shop_tagline: data.shop_tagline,
        site_name: data.site_name,
        logo_url: data.logo_url,
        favicon_url: data.favicon_url,
      };
      const query = data.id
        ? supabase.from("site_settings").update(payload).eq("id", data.id)
        : supabase.from("site_settings").insert(payload);
      const { error } = await query;
      if (error) throw error;
      toast.success("সংরক্ষণ হয়েছে");
      // Refresh document title/favicon immediately
      if (data.shop_name) document.title = data.shop_name;
      if (data.favicon_url) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.href = data.favicon_url;
      }
    } catch (e: any) {
      toast.error(e.message || "সংরক্ষণ ব্যর্থ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <WPAdminShell title="সাইট আইডেন্টিটি">
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      </WPAdminShell>
    );
  }

  return (
    <WPAdminShell
      title="সাইট আইডেন্টিটি"
      subtitle="সাইট আইকন, লোগো, টাইটেল ও শ্লোগান এডিট করুন"
      actions={
        <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          সংরক্ষণ করুন
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        {/* Site Icon (Favicon) */}
        <div className="bg-white border border-slate-200 rounded-md p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">সাইট আইকন (Favicon)</h2>
          <p className="text-xs text-slate-500 mb-4">ব্রাউজার ট্যাবে দেখানো আইকন। স্কয়ার ছবি দিন (512×512 প্রস্তাবিত)।</p>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
              {data.favicon_url ? (
                <img src={data.favicon_url} alt="favicon" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-6 w-6 text-slate-300" />
              )}
            </div>
            <label className="inline-flex items-center gap-2 text-sm px-3 py-2 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50">
              {uploading === "favicon" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              আপলোড
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "favicon")} />
            </label>
            {data.favicon_url && (
              <button onClick={() => setData((d) => ({ ...d, favicon_url: null }))} className="text-xs text-red-600 hover:underline">মুছুন</button>
            )}
          </div>
        </div>

        {/* Site Logo */}
        <div className="bg-white border border-slate-200 rounded-md p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">সাইট লোগো</h2>
          <p className="text-xs text-slate-500 mb-4">হেডার ও ফুটারে দেখানো লোগো।</p>
          <div className="flex items-center gap-4">
            <div className="h-16 w-32 rounded border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
              {data.logo_url ? (
                <img src={data.logo_url} alt="logo" className="h-full w-full object-contain" />
              ) : (
                <ImageIcon className="h-6 w-6 text-slate-300" />
              )}
            </div>
            <label className="inline-flex items-center gap-2 text-sm px-3 py-2 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50">
              {uploading === "logo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              আপলোড
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "logo")} />
            </label>
            {data.logo_url && (
              <button onClick={() => setData((d) => ({ ...d, logo_url: null }))} className="text-xs text-red-600 hover:underline">মুছুন</button>
            )}
          </div>
        </div>

        {/* Site Title */}
        <div className="bg-white border border-slate-200 rounded-md p-5 md:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">সাইট টাইটেল ও শ্লোগান</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="shop_name" className="text-xs text-slate-600">সাইট টাইটেল</Label>
              <Input id="shop_name" value={data.shop_name || ""} onChange={(e) => setData({ ...data, shop_name: e.target.value })} placeholder="যেমন: কে এম শপ" />
            </div>
            <div>
              <Label htmlFor="site_name" className="text-xs text-slate-600">প্রতিষ্ঠানের নাম (Brand)</Label>
              <Input id="site_name" value={data.site_name || ""} onChange={(e) => setData({ ...data, site_name: e.target.value })} placeholder="যেমন: KM Production" />
            </div>
            <div>
              <Label htmlFor="shop_tagline" className="text-xs text-slate-600">শ্লোগান (Tagline)</Label>
              <Textarea id="shop_tagline" rows={2} value={data.shop_tagline || ""} onChange={(e) => setData({ ...data, shop_tagline: e.target.value })} placeholder="যেমন: কুয়াকাটার সেরা পণ্য, আপনার দোরগোড়ায়।" />
            </div>
          </div>
        </div>
      </div>
    </WPAdminShell>
  );
}
