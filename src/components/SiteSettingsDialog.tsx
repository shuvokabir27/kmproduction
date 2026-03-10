import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, ImageIcon, Save, Type } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SiteSettingsDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("*").limit(1).single();
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setSiteName(settings.site_name || "");
      setLogoPreview(settings.logo_url || null);
      setFaviconPreview((settings as any).favicon_url || null);
    }
  }, [settings]);

  const uploadFile = async (file: File, folder: string) => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/site_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("member-photos").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: pub } = supabase.storage.from("member-photos").getPublicUrl(path);
    return pub.publicUrl;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: any = { site_name: siteName || null };
      if (logoFile) updates.logo_url = await uploadFile(logoFile, "site");
      if (faviconFile) updates.favicon_url = await uploadFile(faviconFile, "site");

      if (settings?.id) {
        const { error } = await supabase.from("site_settings").update(updates).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("site_settings").insert(updates);
        if (error) throw error;
      }

      toast.success("সাইট সেটিংস আপডেট হয়েছে!");
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      setLogoFile(null);
      setFaviconFile(null);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/50 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">সাইট সেটিংস</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-foreground text-xs flex items-center gap-1.5 mb-1.5">
              <Type className="h-3.5 w-3.5" /> সাইট টাইটেল
            </Label>
            <Input
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="bg-secondary border-border/50"
              placeholder="যেমন: KM Production House"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-foreground text-xs flex items-center gap-1.5 mb-1.5">
                <ImageIcon className="h-3.5 w-3.5" /> সাইট লোগো
              </Label>
              <input
                type="file"
                accept="image/*"
                ref={logoRef}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setLogoFile(f);
                    setLogoPreview(URL.createObjectURL(f));
                  }
                }}
              />
              <button
                type="button"
                onClick={() => logoRef.current?.click()}
                className="w-full h-24 rounded-lg border-2 border-dashed border-border/50 bg-secondary/50 flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors overflow-hidden"
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <>
                    <Camera className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">লোগো আপলোড</span>
                  </>
                )}
              </button>
            </div>
            <div>
              <Label className="text-foreground text-xs flex items-center gap-1.5 mb-1.5">
                <ImageIcon className="h-3.5 w-3.5" /> সাইট আইকন (Favicon)
              </Label>
              <input
                type="file"
                accept="image/*"
                ref={faviconRef}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setFaviconFile(f);
                    setFaviconPreview(URL.createObjectURL(f));
                  }
                }}
              />
              <button
                type="button"
                onClick={() => faviconRef.current?.click()}
                className="w-full h-24 rounded-lg border-2 border-dashed border-border/50 bg-secondary/50 flex flex-col items-center justify-center gap-1 hover:border-primary/50 transition-colors overflow-hidden"
              >
                {faviconPreview ? (
                  <img src={faviconPreview} alt="favicon" className="w-full h-full object-contain p-2" />
                ) : (
                  <>
                    <Camera className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">আইকন আপলোড</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="h-4 w-4 mr-1.5" />
            {saving ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
