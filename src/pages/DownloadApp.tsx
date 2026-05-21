import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Download,
  Smartphone,
  Apple,
  ArrowLeft,
  Share2,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Info,
  HardDrive,
  Sparkles,
  Tag,
  Calendar,
  FileText,
} from "lucide-react";

interface AppVersion {
  id: string;
  version: string;
  platform: "android" | "ios";
  file_path: string;
  file_size: number;
  release_notes: string | null;
  released_at: string;
}

interface ResolvedVersion extends AppVersion {
  url: string;
}

const formatBytes = (bytes: number) => {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
};

const formatDate = (iso: string) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("bn-BD", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const DownloadApp = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["app-versions-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_versions")
        .select("*")
        .eq("is_active", true)
        .order("released_at", { ascending: false });

      if (error) throw error;

      const resolved: { android?: ResolvedVersion; ios?: ResolvedVersion } = {};
      for (const v of (data ?? []) as AppVersion[]) {
        const { data: urlData } = supabase.storage
          .from("app-downloads")
          .getPublicUrl(v.file_path);
        if (!resolved[v.platform]) {
          resolved[v.platform] = { ...v, url: urlData.publicUrl };
        }
      }
      return resolved;
    },
  });

  const androidFile = data?.android;
  const iosFile = data?.ios;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Top bar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">হোমে ফিরে যান</span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>App Center</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-12 pb-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Download className="w-4 h-4" />
            <span>মোবাইল অ্যাপ ডাউনলোড</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
            KM Production App
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            আপনার ফোনে আমাদের অ্যাপ ইনস্টল করুন। দ্রুত, সহজ এবং কোনো অ্যাপ স্টোর ছাড়াই।
          </p>
        </motion.div>
      </section>

      {/* Download Cards */}
      <section className="container mx-auto px-4 pb-12">
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Android Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/10 h-full">
              <div className="bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent p-6 border-b border-border">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                      <Smartphone className="w-9 h-9 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Android</h2>
                      <p className="text-sm text-muted-foreground">APK File</p>
                    </div>
                  </div>
                  {androidFile && (
                    <Badge variant="outline" className="border-red-500/30 text-red-600 dark:text-red-400 gap-1 shrink-0">
                      <Tag className="w-3 h-3" />
                      v{androidFile.version}
                    </Badge>
                  )}
                </div>
              </div>

              <CardContent className="p-6 space-y-4">
                {isLoading ? (
                  <div className="h-32 flex items-center justify-center text-muted-foreground">
                    লোড হচ্ছে...
                  </div>
                ) : androidFile ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <HardDrive className="w-4 h-4" />
                        <span>{formatBytes(androidFile.file_size)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4 text-red-500" />
                        <span>{formatDate(androidFile.released_at)}</span>
                      </div>
                    </div>

                    {androidFile.release_notes && (
                      <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400 mb-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          <span>এই ভার্সনে নতুন:</span>
                        </div>
                        <p className="text-sm text-foreground/80 whitespace-pre-line">
                          {androidFile.release_notes}
                        </p>
                      </div>
                    )}

                    <Button
                      asChild
                      size="lg"
                      className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg"
                    >
                      <a href={androidFile.url} download>
                        <Download className="w-5 h-5 mr-2" />
                        APK ডাউনলোড করুন (v{androidFile.version})
                      </a>
                    </Button>

                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Info className="w-4 h-4 text-primary" />
                        <span>ইনস্টল করার নিয়ম:</span>
                      </div>
                      <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                        <li>উপরের বাটনে ক্লিক করে APK ডাউনলোড করুন</li>
                        <li>Settings → Security → "Unknown Sources" enable করুন</li>
                        <li>Downloads ফোল্ডার থেকে APK তে tap করুন</li>
                        <li>"Install" এ ক্লিক করে অপেক্ষা করুন</li>
                        <li>Done! অ্যাপ ব্যবহার শুরু করুন ✅</li>
                      </ol>
                    </div>
                  </>
                ) : (
                  <div className="bg-muted/50 rounded-lg p-6 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-muted mx-auto flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">শীঘ্রই আসছে!</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Android APK এখনো আপলোড করা হয়নি। শীঘ্রই available হবে।
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* iOS Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/10 h-full">
              <div className="bg-gradient-to-br from-slate-500/10 via-zinc-500/5 to-transparent p-6 border-b border-border">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 to-zinc-900 flex items-center justify-center shadow-lg">
                      <Apple className="w-9 h-9 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">iOS / iPhone</h2>
                      <p className="text-sm text-muted-foreground">PWA / IPA</p>
                    </div>
                  </div>
                  {iosFile && (
                    <Badge variant="outline" className="border-slate-500/30 gap-1 shrink-0">
                      <Tag className="w-3 h-3" />
                      v{iosFile.version}
                    </Badge>
                  )}
                </div>
              </div>

              <CardContent className="p-6 space-y-4">
                {/* PWA Option */}
                <div className="bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/20 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded">
                      RECOMMENDED
                    </div>
                    <span className="text-sm font-semibold">Home Screen এ Install</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    iPhone এ Safari খুলে এই সাইট ভিজিট করুন, তারপর:
                  </p>
                  <ol className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">1.</span>
                      <span className="flex items-center gap-1.5">
                        নিচের <Share2 className="w-4 h-4 inline" /> Share আইকনে tap করুন
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">2.</span>
                      <span className="flex items-center gap-1.5">
                        <Plus className="w-4 h-4 inline" /> "Add to Home Screen" সিলেক্ট করুন
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">3.</span>
                      <span>"Add" তে tap করুন — অ্যাপ আইকন হোম স্ক্রিনে যোগ হয়ে যাবে ✨</span>
                    </li>
                  </ol>
                </div>

                {iosFile ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <HardDrive className="w-4 h-4" />
                        <span>{formatBytes(iosFile.file_size)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4 text-red-500" />
                        <span>{formatDate(iosFile.released_at)}</span>
                      </div>
                    </div>
                    {iosFile.release_notes && (
                      <div className="bg-muted/50 border border-border rounded-lg p-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold mb-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          <span>এই ভার্সনে নতুন:</span>
                        </div>
                        <p className="text-sm text-foreground/80 whitespace-pre-line">
                          {iosFile.release_notes}
                        </p>
                      </div>
                    )}
                    <Button asChild size="lg" variant="outline" className="w-full border-2">
                      <a href={iosFile.url} download>
                        <Download className="w-5 h-5 mr-2" />
                        IPA ডাউনলোড (v{iosFile.version})
                      </a>
                    </Button>
                  </>
                ) : (
                  <div className="bg-muted/50 rounded-lg p-4 text-center text-sm text-muted-foreground">
                    <Info className="w-4 h-4 inline mr-1" />
                    Native IPA file শীঘ্রই আসছে। এখন PWA ব্যবহার করুন (উপরে দেখুন)।
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Trust Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-4xl mx-auto mt-8"
        >
          <Card className="bg-gradient-to-br from-primary/5 via-transparent to-accent/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg">নিরাপদ ও বিশ্বস্ত</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    আমাদের অ্যাপ KM Production এর official অ্যাপ। কোনো বিজ্ঞাপন বা spyware নেই।
                    সমস্ত data সুরক্ষিতভাবে সংরক্ষিত। আপনি যদি Google এর "Unknown Sources" warning
                    দেখেন তাহলে চিন্তা করবেন না — এটা স্বাভাবিক, কারণ আমরা Play Store এর বাইরে থেকে
                    সরাসরি দিচ্ছি।
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="max-w-4xl mx-auto mt-8 space-y-3"
        >
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            প্রায়শই জিজ্ঞাসিত প্রশ্ন
          </h3>

          <Card>
            <CardContent className="p-4">
              <p className="font-semibold mb-1">📲 আপডেট কীভাবে পাবো?</p>
              <p className="text-sm text-muted-foreground">
                নতুন version আসলে এই page থেকে আবার download করে install করুন। উপরে সবসময় সবশেষ
                version দেখানো হবে।
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="font-semibold mb-1">🔒 আমার data কি সুরক্ষিত?</p>
              <p className="text-sm text-muted-foreground">
                হ্যাঁ। অ্যাপ এবং ওয়েবসাইট একই backend ব্যবহার করে, তাই আপনার সব data encrypted এবং
                নিরাপদ।
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="font-semibold mb-1">💻 PC/Laptop এ কি ব্যবহার করা যাবে?</p>
              <p className="text-sm text-muted-foreground">
                হ্যাঁ! ওয়েবসাইট hi চলবে — কোনো install দরকার নেই। শুধু{" "}
                <Link to="/" className="text-primary underline">হোম পেজে</Link> যান।
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </div>
  );
};

export default DownloadApp;
