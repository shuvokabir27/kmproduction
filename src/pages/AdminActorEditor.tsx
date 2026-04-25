import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Film, Save, Plus, Trash2, ExternalLink, Upload, X, Image as ImageIcon, User } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const AdminActorEditor = () => {
  const { user, isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [skillInput, setSkillInput] = useState("");
  const [langInput, setLangInput] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: members } = useQuery({
    queryKey: ["actor-editor-members"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, member_id, designation, photo_url, is_actor" as any)
        .eq("is_active", true)
        .order("member_id");
      return (data as any[]) ?? [];
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["actor-edit-profile", selectedId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", selectedId!).maybeSingle();
      return data as any;
    },
    enabled: !!selectedId,
  });

  const { data: gallery } = useQuery({
    queryKey: ["actor-edit-gallery", selectedId],
    queryFn: async () => {
      const { data } = await supabase
        .from("actor_portfolio_images" as any)
        .select("*")
        .eq("profile_id", selectedId!)
        .order("sort_order");
      return (data as any[]) ?? [];
    },
    enabled: !!selectedId,
  });

  const { data: credits } = useQuery({
    queryKey: ["actor-edit-credits", selectedId],
    queryFn: async () => {
      const { data } = await supabase
        .from("actor_credits" as any)
        .select("*")
        .eq("profile_id", selectedId!)
        .order("release_year", { ascending: false });
      return (data as any[]) ?? [];
    },
    enabled: !!selectedId,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        is_actor: profile.is_actor ?? false,
        stage_name: profile.stage_name ?? "",
        age_range: profile.age_range ?? "",
        current_location: profile.current_location ?? "",
        height_cm: profile.height_cm ?? "",
        skin_tone: profile.skin_tone ?? "",
        hair_type: profile.hair_type ?? "",
        eye_color: profile.eye_color ?? "",
        body_measurements: profile.body_measurements ?? "",
        showreel_url: profile.showreel_url ?? "",
        instagram_url: profile.instagram_url ?? "",
        facebook_url: profile.facebook_url ?? "",
        youtube_url: profile.youtube_url ?? "",
        special_skills: profile.special_skills ?? [],
        languages: profile.languages ?? [],
        acting_education: profile.acting_education ?? "",
      });
    }
  }, [profile]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const saveProfile = async () => {
    const payload = {
      ...form,
      height_cm: form.height_cm ? Number(form.height_cm) : null,
    };
    const { error } = await supabase.from("profiles").update(payload as any).eq("id", selectedId!);
    if (error) return toast.error(error.message);
    toast.success("সংরক্ষিত হয়েছে");
    qc.invalidateQueries({ queryKey: ["actor-edit-profile", selectedId] });
    qc.invalidateQueries({ queryKey: ["actor-editor-members"] });
  };

  const addSkill = () => {
    if (!skillInput.trim()) return;
    setForm({ ...form, special_skills: [...(form.special_skills || []), skillInput.trim()] });
    setSkillInput("");
  };

  const removeSkill = (i: number) => {
    setForm({ ...form, special_skills: form.special_skills.filter((_: any, idx: number) => idx !== i) });
  };

  const addLang = () => {
    if (!langInput.trim()) return;
    setForm({ ...form, languages: [...(form.languages || []), langInput.trim()] });
    setLangInput("");
  };

  const removeLang = (i: number) => {
    setForm({ ...form, languages: form.languages.filter((_: any, idx: number) => idx !== i) });
  };

  const uploadGalleryImage = async (file: File, category: string) => {
    if (!selectedId) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `actor-${selectedId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('member-photos').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('member-photos').getPublicUrl(path);
      const { error } = await supabase.from('actor_portfolio_images' as any).insert({
        profile_id: selectedId,
        image_url: publicUrl,
        category,
        sort_order: (gallery?.length ?? 0),
      } as any);
      if (error) throw error;
      toast.success("ছবি যোগ হয়েছে");
      qc.invalidateQueries({ queryKey: ["actor-edit-gallery", selectedId] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (id: string) => {
    const { error } = await supabase.from('actor_portfolio_images' as any).delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success("মুছে ফেলা হয়েছে");
    qc.invalidateQueries({ queryKey: ["actor-edit-gallery", selectedId] });
  };

  const addCredit = async () => {
    if (!selectedId) return;
    const { error } = await supabase.from('actor_credits' as any).insert({
      profile_id: selectedId,
      project_title: "নতুন প্রজেক্ট",
      category: "drama",
    } as any);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["actor-edit-credits", selectedId] });
  };

  const updateCredit = async (id: string, patch: any) => {
    const { error } = await supabase.from('actor_credits' as any).update(patch).eq('id', id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["actor-edit-credits", selectedId] });
  };

  const deleteCredit = async (id: string) => {
    const { error } = await supabase.from('actor_credits' as any).delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success("মুছে ফেলা হয়েছে");
    qc.invalidateQueries({ queryKey: ["actor-edit-credits", selectedId] });
  };

  const selectedMember = members?.find((m: any) => m.id === selectedId);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Film className="h-5 w-5 md:h-6 md:w-6 text-primary" /> অভিনেতা পোর্টফোলিও এডিটর
            </h1>
            <p className="text-muted-foreground text-xs">সদস্যের অভিনেতা প্রোফাইল, গ্যালারি ও অভিনয়ের তালিকা সম্পাদনা করুন</p>
          </div>
          {selectedMember && (
            <Link to={`/actor/${selectedMember.member_id}`} target="_blank">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> পোর্টফোলিও দেখুন
              </Button>
            </Link>
          )}
        </div>

        {/* Member selector */}
        <Card className="p-4">
          <Label className="text-xs text-muted-foreground mb-2 block">সদস্য নির্বাচন করুন</Label>
          <Select value={selectedId ?? ""} onValueChange={setSelectedId}>
            <SelectTrigger><SelectValue placeholder="একজন সদস্য বাছাই করুন..." /></SelectTrigger>
            <SelectContent>
              {members?.map((m: any) => (
                <SelectItem key={m.id} value={m.id}>
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    <span>{m.full_name} · ID: {m.member_id}</span>
                    {m.is_actor && <Badge variant="outline" className="ml-2 text-[10px] h-4 border-primary/40 text-primary">Actor</Badge>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {selectedId && profile && (
          <Tabs defaultValue="info" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">তথ্য</TabsTrigger>
              <TabsTrigger value="gallery">গ্যালারি ({gallery?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="credits">অভিনয় ({credits?.length ?? 0})</TabsTrigger>
            </TabsList>

            {/* INFO TAB */}
            <TabsContent value="info" className="space-y-4">
              <Card className="p-5 space-y-5">
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div>
                    <p className="font-medium text-sm">পাবলিক অভিনেতা পোর্টফোলিও</p>
                    <p className="text-xs text-muted-foreground">চালু থাকলে /actor/{selectedMember?.member_id} এ দেখাবে</p>
                  </div>
                  <Switch checked={form.is_actor} onCheckedChange={(v) => setForm({ ...form, is_actor: v })} />
                </div>

                <Section title="মূল তথ্য">
                  <Field label="স্টেজ নাম" value={form.stage_name} onChange={(v) => setForm({ ...form, stage_name: v })} placeholder="যেমনঃ Arman Khan" />
                  <Field label="বয়সের পরিসর" value={form.age_range} onChange={(v) => setForm({ ...form, age_range: v })} placeholder="25-30 বছর" />
                  <Field label="বর্তমান লোকেশন" value={form.current_location} onChange={(v) => setForm({ ...form, current_location: v })} placeholder="ঢাকা, বাংলাদেশ" />
                </Section>

                <Section title="শারীরিক বৈশিষ্ট্য">
                  <Field label="উচ্চতা (cm)" value={form.height_cm} onChange={(v) => setForm({ ...form, height_cm: v })} placeholder="175" type="number" />
                  <Field label="গায়ের রং" value={form.skin_tone} onChange={(v) => setForm({ ...form, skin_tone: v })} placeholder="Fair / Wheatish" />
                  <Field label="চুলের ধরন" value={form.hair_type} onChange={(v) => setForm({ ...form, hair_type: v })} placeholder="Black,