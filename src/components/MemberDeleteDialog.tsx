import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Download, ShieldAlert, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";

interface DeletedMember {
  id: string;
  full_name: string;
  full_name_en?: string | null;
  photo_url?: string | null;
  member_id?: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  member: { id: string; full_name: string; full_name_en?: string | null; photo_url?: string | null; member_id?: number | null } | null;
  onDeleted?: () => void;
}

export function MemberDeleteDialog({ open, onOpenChange, member, onDeleted }: Props) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletedMember, setDeletedMember] = useState<DeletedMember | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const reset = () => {
    setPassword("");
    setSubmitting(false);
    setDeletedMember(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleDelete = async () => {
    if (!member) return;
    if (!password) {
      toast.error("এডমিন পাসওয়ার্ড দিন");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-member", {
        body: { profile_id: member.id, admin_password: password },
      });
      if (error) {
        const msg = (error as any)?.context?.body
          ? await (async () => {
              try { return JSON.parse((error as any).context.body).error; } catch { return null; }
            })()
          : null;
        throw new Error(msg || error.message || "ডিলিট ব্যর্থ");
      }
      if ((data as any)?.error) throw new Error((data as any).error);

      const m = (data as any)?.member as DeletedMember;
      toast.success(`${m?.full_name || "সদস্য"} সফলভাবে ডিলিট হয়েছে`);
      setDeletedMember(m);
      onDeleted?.();
    } catch (err: any) {
      toast.error(err?.message || "ডিলিট ব্যর্থ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPng = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        backgroundColor: null,
        scale: 2,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const blob = await (await fetch(dataUrl)).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `অব্যাহতি-${deletedMember?.full_name || "সদস্য"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("কার্ড ডাউনলোড হয়েছে");
    } catch (err: any) {
      toast.error("ডাউনলোড ব্যর্থ: " + (err?.message || ""));
    } finally {
      setDownloading(false);
    }
  };

  const today = new Date().toLocaleDateString("bn-BD", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border/50 max-w-md">
        {!deletedMember ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-destructive" />
                সদস্য ডিলিট নিশ্চিত করুন
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 space-y-2">
                <p className="text-sm font-semibold text-destructive">
                  সাবধান! এই সদস্যের নিচের সকল তথ্য চিরতরে ডিলিট হবে:
                </p>
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                  <li>প্রোফাইল ও লগইন একাউন্ট</li>
                  <li>হাজিরা, পেমেন্ট, অ্যাডভান্স, বোনাস, স্যালারি</li>
                  <li>বাইরের কাজের (ফ্রিল্যান্স) হিস্টরী</li>
                  <li>টাস্ক, নোটিফিকেশন, চ্যাট ও কমেন্ট</li>
                </ul>
              </div>
              {member && (
                <div className="flex items-center gap-3 p-3 rounded-md bg-secondary/50 border border-border/30">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-primary/15 flex items-center justify-center shrink-0">
                    {member.photo_url ? (
                      <img src={member.photo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-primary font-bold">{member.full_name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground">ID: {member.member_id ?? "—"}</p>
                  </div>
                </div>
              )}
              <div>
                <Label className="text-foreground text-xs">এডমিন লগইন পাসওয়ার্ড *</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="আপনার পাসওয়ার্ড লিখুন"
                  className="bg-secondary border-border/50"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>
                বাতিল
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {submitting ? "ডিলিট হচ্ছে..." : "চিরতরে ডিলিট করুন"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-foreground">অব্যাহতিপত্র</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div
                ref={cardRef}
                className="relative w-full overflow-hidden rounded-xl"
                style={{
                  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
                  fontFamily: "'Tiro Bangla', 'Hind Siliguri', serif",
                  padding: "28px 24px",
                  border: "2px solid #334155",
                }}
              >
                {/* Decorative corners */}
                <div style={{ position: "absolute", top: 8, left: 8, width: 24, height: 24, borderTop: "2px solid #06b6d4", borderLeft: "2px solid #06b6d4" }} />
                <div style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderTop: "2px solid #06b6d4", borderRight: "2px solid #06b6d4" }} />
                <div style={{ position: "absolute", bottom: 8, left: 8, width: 24, height: 24, borderBottom: "2px solid #06b6d4", borderLeft: "2px solid #06b6d4" }} />
                <div style={{ position: "absolute", bottom: 8, right: 8, width: 24, height: 24, borderBottom: "2px solid #06b6d4", borderRight: "2px solid #06b6d4" }} />

                <div style={{ textAlign: "center", color: "#06b6d4", fontSize: 11, letterSpacing: 2, marginBottom: 4 }}>
                  KUAKATA MULTIMEDIA
                </div>
                <div style={{ textAlign: "center", color: "#f1f5f9", fontSize: 18, fontWeight: 700, marginBottom: 18 }}>
                  ✦ অব্যাহতিপত্র ✦
                </div>

                <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                  <div
                    style={{
                      width: 92,
                      height: 92,
                      borderRadius: "50%",
                      overflow: "hidden",
                      background: "#1e293b",
                      border: "3px solid #06b6d4",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 0 0 4px rgba(6,182,212,0.15)",
                    }}
                  >
                    {deletedMember.photo_url ? (
                      <img
                        src={deletedMember.photo_url}
                        alt=""
                        crossOrigin="anonymous"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ color: "#06b6d4", fontSize: 32, fontWeight: 700 }}>
                        {deletedMember.full_name?.charAt(0) || "?"}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: "center", color: "#f1f5f9", fontSize: 17, fontWeight: 700, marginBottom: 2 }}>
                  {deletedMember.full_name}
                </div>
                {deletedMember.full_name_en && (
                  <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>
                    {deletedMember.full_name_en}
                  </div>
                )}
                {deletedMember.member_id != null && (
                  <div style={{ textAlign: "center", color: "#64748b", fontSize: 10, marginBottom: 14 }}>
                    সদস্য আইডি: {deletedMember.member_id}
                  </div>
                )}

                <div
                  style={{
                    background: "rgba(15,23,42,0.6)",
                    border: "1px solid #334155",
                    borderRadius: 8,
                    padding: "14px 12px",
                    color: "#e2e8f0",
                    fontSize: 13,
                    lineHeight: 1.7,
                    textAlign: "center",
                  }}
                >
                  আপনাকে কুয়াকাটা মাল্টিমিডিয়ার সকল সদস্য পদ ও সমস্ত কার্যক্রম থেকে অব্যাহতি দেওয়া হলো।
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, color: "#64748b", fontSize: 10 }}>
                  <span>তারিখ: {today}</span>
                  <span style={{ color: "#06b6d4" }}>— কর্তৃপক্ষ</span>
                </div>
              </div>

              <Button onClick={handleDownloadPng} disabled={downloading} className="w-full gap-2">
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {downloading ? "ডাউনলোড হচ্ছে..." : "PNG ডাউনলোড করুন"}
              </Button>
              <Button variant="outline" onClick={() => handleClose(false)} className="w-full">
                বন্ধ করুন
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
