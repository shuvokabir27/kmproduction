import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileText, Upload, X, Save, Image, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
  userId: string;
  initialScript: string | null;
  initialImages: string[];
  onUpdate: () => void;
}

export function ClientProjectScript({ projectId, userId, initialScript, initialImages, onUpdate }: Props) {
  const [script, setScript] = useState(initialScript || "");
  const [images, setImages] = useState<string[]>(initialImages || []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSaveScript = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("freelance_projects")
      .update({ client_script: script })
      .eq("id", projectId);
    setSaving(false);
    if (error) {
      toast.error("স্ক্রিপ্ট সেভ করতে সমস্যা হয়েছে");
    } else {
      toast.success("স্ক্রিপ্ট সেভ হয়েছে");
      onUpdate();
    }
  };

  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);

    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${projectId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("client-scripts").upload(path, file);
      if (error) {
        toast.error(`আপলোড ব্যর্থ: ${file.name}`);
        continue;
      }
      const { data: urlData } = await supabase.storage.from("client-scripts").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (urlData?.signedUrl) newUrls.push(urlData.signedUrl);
    }

    if (newUrls.length > 0) {
      const updated = [...images, ...newUrls];
      const { error } = await (supabase as any)
        .from("freelance_projects")
        .update({ client_script_images: updated })
        .eq("id", projectId);
      if (!error) {
        setImages(updated);
        toast.success(`${newUrls.length}টি ছবি আপলোড হয়েছে`);
        onUpdate();
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleRemoveImage = async (url: string) => {
    const updated = images.filter((i) => i !== url);
    const { error } = await (supabase as any)
      .from("freelance_projects")
      .update({ client_script_images: updated })
      .eq("id", projectId);
    if (!error) {
      setImages(updated);
      toast.success("ছবি মুছে ফেলা হয়েছে");
      onUpdate();
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-foreground flex items-center gap-1.5">
        <FileText className="h-4 w-4 text-primary" /> স্ক্রিপ্ট / লাইনআপ
      </h4>

      {/* Script text */}
      <div className="space-y-2">
        <Textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="এখানে স্ক্রিপ্ট বা শুটিং লাইনআপ লিখুন..."
          rows={6}
          className="resize-y text-sm"
        />
        <Button size="sm" onClick={handleSaveScript} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          সেভ করুন
        </Button>
      </div>

      {/* Image upload */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="gap-1.5"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            স্ক্রিপ্ট ছবি আপলোড
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUploadImages}
          />
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {images.map((url, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden border border-border/30">
                <img src={url} alt={`স্ক্রিপ্ট ${i + 1}`} className="w-full h-32 object-cover" />
                <button
                  onClick={() => handleRemoveImage(url)}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
