import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  Upload,
  Smartphone,
  Apple,
  Trash2,
  CheckCircle2,
  Plus,
  Download,
  Loader2,
} from "lucide-react";

type Platform = "android" | "ios";

interface AppVersion {
  id: string;
  version: string;
  platform: Platform;
  file_path: string;
  file_size: number;
  release_notes: string | null;
  is_active: boolean;
  released_at: string;
  created_at: string;
}

const formatBytes = (bytes: number) => {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
};

const formatDate = (iso: string) => {
  if (!iso) return "";
  return new Date(iso).toLocaleString("bn-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AdminAppVersions = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [version, setVersion] = useState("");
  const [platform, setPlatform] = useState<Platform>("android");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: versions, isLoading } = useQuery({
    queryKey: ["app-versions-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_versions")
        .select("*")
        .order("released_at", { ascending: false });
      if (error) throw error;
      return data as AppVersion[];
    },
  });

  const resetForm = () => {
    setVersion("");
    setPlatform("android");
    setReleaseNotes("");
    setFile(null);
  };

  const handleUpload = async () => {
    if (!version.trim()) {
      toast.error("ভার্সন নাম্বার দিন");
      return;
    }
    if (!file) {
      toast.error("ফাইল সিলেক্ট করুন");
      return;
    }

    setUploading(true);
    try {
      const ext = platform === "android" ? "apk" : "ipa";
      const fileName = `${platform}/v${version}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("app-downloads")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
          contentType:
            platform === "android"
              ? "application/vnd.android.package-archive"
              : "application/octet-stream",
        });

      if (uploadError) throw uploadError;

      const { data: { user } } = await supabase.auth.getUser();

      const { error: insertError } = await supabase.from("app_versions").insert({
        version: version.trim(),
        platform,
        file_path: fileName,
        file_size: file.size,
        release_notes: releaseNotes.trim() || null,
        is_active: true,
        created_by: user?.id ?? null,
      });

      if (insertError) throw insertError;

      toast.success(`✅ ভার্সন ${version} আপলোড হয়েছে!`);
      queryClient.invalidateQueries({ queryKey: ["app-versions-admin"] });
      queryClient.invalidateQueries({ queryKey: ["app-versions-public"] });
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message ?? "আপলোড ব্যর্থ হয়েছে");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const v = versions?.find((x) => x.id === id);
    if (!v) return;

    try {
      // Delete from storage
      await supabase.storage.from("app-downloads").remove([v.file_path]);
      // Delete from db
      const { error } = await supabase.from("app_versions").delete().eq("id", id);
      if (error) throw error;

      toast.success("ভার্সন ডিলিট হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["app-versions-admin"] });
      queryClient.invalidateQueries({ queryKey: ["app-versions-public"] });
    } catch (err: any) {
      toast.error(err.message ?? "ডিলিট ব্যর্থ");
    } finally {
      setDeleteId(null);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      const { error } = await supabase
        .from("app_versions")
        .update({ is_active: true })
        .eq("id", id);
      if (error) throw error;
      toast.success("সক্রিয় হিসেবে সেট করা হয়েছে");
      queryClient.invalidateQueries({ queryKey: ["app-versions-admin"] });
      queryClient.invalidateQueries({ queryKey: ["app-versions-public"] });
    } catch (err: any) {
      toast.error(err.message ?? "ব্যর্থ");
    }
  };

  const androidVersions = versions?.filter((v) => v.platform === "android") ?? [];
  const iosVersions = versions?.filter((v) => v.platform === "ios") ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              ফিরে যান
            </Button>
            <h1 className="text-xl font-bold">App Versions</h1>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            নতুন ভার্সন
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Android */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  Android Versions ({androidVersions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {androidVersions.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    এখনো কোনো Android ভার্সন আপলোড হয়নি
                  </p>
                ) : (
                  <div className="space-y-2">
                    {androidVersions.map((v) => (
                      <VersionRow
                        key={v.id}
                        version={v}
                        onDelete={() => setDeleteId(v.id)}
                        onSetActive={() => handleSetActive(v.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* iOS */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-zinc-900 flex items-center justify-center">
                    <Apple className="w-5 h-5 text-white" />
                  </div>
                  iOS Versions ({iosVersions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {iosVersions.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    এখনো কোনো iOS ভার্সন আপলোড হয়নি
                  </p>
                ) : (
                  <div className="space-y-2">
                    {iosVersions.map((v) => (
                      <VersionRow
                        key={v.id}
                        version={v}
                        onDelete={() => setDeleteId(v.id)}
                        onSetActive={() => handleSetActive(v.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>নতুন App ভার্সন আপলোড</DialogTitle>
            <DialogDescription>
              APK/IPA ফাইল আপলোড করলে স্বয়ংক্রিয়ভাবে এটাই active version হবে এবং পুরাতনগুলো archived হয়ে যাবে।
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>প্ল্যাটফর্ম</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="android">🤖 Android (.apk)</SelectItem>
                  <SelectItem value="ios">🍎 iOS (.ipa)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ভার্সন নাম্বার *</Label>
              <Input
                placeholder="যেমন: 1.0.0"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>রিলিজ নোট (ঐচ্ছিক)</Label>
              <Textarea
                placeholder="এই ভার্সনে কী নতুন আছে?"
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>ফাইল সিলেক্ট করুন *</Label>
              <Input
                type="file"
                accept={platform === "android" ? ".apk" : ".ipa"}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && (
                <p className="text-xs text-muted-foreground">
                  {file.name} ({formatBytes(file.size)})
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={uploading}>
              বাতিল
            </Button>
            <Button onClick={handleUpload} disabled={uploading} className="gap-2">
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  আপলোড হচ্ছে...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  আপলোড করুন
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ভার্সন ডিলিট করবেন?</AlertDialogTitle>
            <AlertDialogDescription>
              এই অ্যাকশন undo করা যাবে না। ফাইল এবং record দুটোই permanently মুছে যাবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ডিলিট
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const VersionRow = ({
  version: v,
  onDelete,
  onSetActive,
}: {
  version: AppVersion;
  onDelete: () => void;
  onSetActive: () => void;
}) => {
  const handleDownload = async () => {
    const { data } = supabase.storage.from("app-downloads").getPublicUrl(v.file_path);
    window.open(data.publicUrl, "_blank");
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold">v{v.version}</span>
          {v.is_active ? (
            <Badge variant="default" className="bg-red-600 hover:bg-red-700 gap-1">
              <CheckCircle2 className="w-3 h-3" />
              সক্রিয়
            </Badge>
          ) : (
            <Badge variant="secondary">আর্কাইভ</Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {formatBytes(v.file_size)} • {formatDate(v.released_at)}
          </span>
        </div>
        {v.release_notes && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{v.release_notes}</p>
        )}
      </div>
      <div className="flex items-center gap-1 ml-2">
        <Button variant="ghost" size="icon" onClick={handleDownload} title="Download">
          <Download className="w-4 h-4" />
        </Button>
        {!v.is_active && (
          <Button variant="ghost" size="icon" onClick={onSetActive} title="Set as active">
            <CheckCircle2 className="w-4 h-4 text-red-600" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onDelete} title="Delete">
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
};

export default AdminAppVersions;
