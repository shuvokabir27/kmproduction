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
import { Film, Save, Plus, Trash2, ExternalLink, X, User } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";

const Field = ({ label, value, onChange, placeholder, type = "text" }: any) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <Input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);

const Section = ({ title, children }: any) => (
  <div className="space-y-3">
    <h3 className="text-sm font-semibold text-foreground border-b border-border/30 pb-2">{title}</h3>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
  </div>
);

const AdminActorEditor = () => {
  const { user, isAdmin, loading } = useAuth();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [skillInput, setSkillInput] = useState("");
  const [langInput, setLangInput] = useState("");
  const [uploadingCat, setUploadingCat] = useState<string | null>(null);
  const fileRefs = { headshot: useRef<HTMLInputElement>(null), fullbody: useRef<HTMLInputElement>(null), lookbook: useRef<HTMLInputElement>(null) };

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
        blood_group: profile.blood_group ?? "",
        showreel_url: profile.showreel_url ?? "",
        instagram_url: profile.instagram_url ?? "",
        facebook_url: profile.facebook_url ?? "",
        youtube_url: profile.youtube_url ?? "",
        phone: profile.phone ?? "",
        email: profile.email ?? "",
        whatsapp_no: profile.whatsapp_no ?? "",
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
    const payload = { ...form, height_cm: form.height_cm ? Number(form.height_cm) : null };
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
  const removeSkill = (i: number) => setForm({ ...form, special_skills: form.special_skills.filter((_: any, idx: number) => idx !== i) });
  const addLang = () => {
    if (!langInput.trim()) return;
    setForm({ ...form, languages: [...(form.languages || []), langInput.trim()] });
    setLangInput("");
  };
  const removeLang = (i: number) => setForm({ ...form, languages: form.languages.filter((_: any, idx: number) => idx !== i) });

  const uploadGalleryImage = async (file: File, category: string) => {
    if (!selectedId) return;
    setUploadingCat(category);
    try {
      const ext = file.name.split('.').pop();
      const path = `actor-${selectedId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('member-photos').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('member-photos').getPublicUrl(path);
      const { error } = await supabase.from('actor_portfolio_images' as any).insert({
        profile_id: selectedId, image_url: publicUrl, category, sort_order: gallery?.length ?? 0,
      } as any);
      if (error) throw error;
      toast.success("ছবি যোগ হয়েছে");
      qc.invalidateQueries({ queryKey: ["actor-edit-gallery", selectedId] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploadingCat(null);
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
      profile_id: selectedId, project_title: "নতুন প্রজেক্ট", category: "drama",
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

  const renderGallerySection = (cat: "headshot" | "fullbody" | "lookbook", label: string) => {
    const imgs = (gallery ?? []).filter((g: any) => g.category === cat);
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">{label} ({imgs.length})</h4>
          <input
            ref={fileRefs[cat]}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadGalleryImage(e.target.files[0], cat)}
          />
          <Button size="sm" variant="outline" disabled={uploadingCat === cat} onClick={() => fileRefs[cat].current?.click()}>
            <Plus className="h-3.5 w-3.5 mr-1" /> {uploadingCat === cat ? "আপলোড হচ্ছে..." : "ছবি যোগ"}
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {imgs.map((img: any) => (
            <div key={img.id} className="relative group aspect-[3/4] rounded-lg overflow-hidden border border-border/30">
              <img src={img.image_url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => deleteImage(img.id)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {imgs.length === 0 && (
            <div className="col-span-full text-xs text-muted-foreground text-center py-6 border border-dashed border-border/30 rounded-lg">
              এখনো কোনো ছবি নেই
            </div>
          )}
        </div>
      </div>
    );
  };

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

            <TabsContent value="info" className="space-y-4">
              <Card className="p-5 space-y-6">
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div>
                    <p className="font-medium text-sm">পাবলিক অভিনেতা পোর্টফোলিও</p>
                    <p className="text-xs text-muted-foreground">চালু থাকলে /actor/{selectedMember?.member_id} এ দেখাবে</p>
                  </div>
                  <Switch checked={form.is_actor} onCheckedChange={(v) => setForm({ ...form, is_actor: v })} />
                </div>

                <Section title="মূল তথ্য">
                  <Field label="স্টেজ নাম" value={form.stage_name} onChange={(v: string) => setForm({ ...form, stage_name: v })} placeholder="Arman Khan" />
                  <Field label="বয়সের পরিসর" value={form.age_range} onChange={(v: string) => setForm({ ...form, age_range: v })} placeholder="25-30 বছর" />
                  <Field label="বর্তমান লোকেশন" value={form.current_location} onChange={(v: string) => setForm({ ...form, current_location: v })} placeholder="ঢাকা, বাংলাদেশ" />
                </Section>

                <Section title="শারীরিক বৈশিষ্ট্য">
                  <Field label="উচ্চতা (cm)" value={form.height_cm} onChange={(v: string) => setForm({ ...form, height_cm: v })} placeholder="175" type="number" />
                  <Field label="গায়ের রং" value={form.skin_tone} onChange={(v: string) => setForm({ ...form, skin_tone: v })} placeholder="Fair / Wheatish" />
                  <Field label="চুলের ধরন" value={form.hair_type} onChange={(v: string) => setForm({ ...form, hair_type: v })} placeholder="Black, Curly" />
                  <Field label="চোখের রং" value={form.eye_color} onChange={(v: string) => setForm({ ...form, eye_color: v })} placeholder="Brown" />
                  <Field label="বডি মেজারমেন্ট" value={form.body_measurements} onChange={(v: string) => setForm({ ...form, body_measurements: v })} placeholder="36-32-38" />
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">রক্তের গ্রুপ</Label>
                    <Select value={form.blood_group || ""} onValueChange={(v) => setForm({ ...form, blood_group: v })}>
                      <SelectTrigger><SelectValue placeholder="নির্বাচন করুন" /></SelectTrigger>
                      <SelectContent>
                        {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map((bg) => (
                          <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Section>

                <Section title="যোগাযোগ (Contact CTA-র জন্য)">
                  <Field label="ফোন নম্বর" value={form.phone} onChange={(v: string) => setForm({ ...form, phone: v })} placeholder="01XXXXXXXXX" />
                  <Field label="WhatsApp নম্বর" value={form.whatsapp_no} onChange={(v: string) => setForm({ ...form, whatsapp_no: v })} placeholder="01XXXXXXXXX" />
                  <Field label="ইমেইল" value={form.email} onChange={(v: string) => setForm({ ...form, email: v })} placeholder="actor@example.com" type="email" />
                </Section>

                <Section title="মিডিয়া ও সোশ্যাল">
                  <Field label="Showreel (YouTube URL)" value={form.showreel_url} onChange={(v: string) => setForm({ ...form, showreel_url: v })} placeholder="https://youtube.com/watch?v=..." />
                  <Field label="Instagram URL" value={form.instagram_url} onChange={(v: string) => setForm({ ...form, instagram_url: v })} placeholder="https://instagram.com/..." />
                  <Field label="Facebook URL" value={form.facebook_url} onChange={(v: string) => setForm({ ...form, facebook_url: v })} placeholder="https://facebook.com/..." />
                  <Field label="YouTube URL" value={form.youtube_url} onChange={(v: string) => setForm({ ...form, youtube_url: v })} placeholder="https://youtube.com/@..." />
                </Section>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold border-b border-border/30 pb-2">দক্ষতা ও ভাষা</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">ভাষা</Label>
                      <div className="flex gap-2">
                        <Input value={langInput} onChange={(e) => setLangInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLang())} placeholder="যেমনঃ Bengali" />
                        <Button size="sm" onClick={addLang}><Plus className="h-3.5 w-3.5" /></Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {form.languages?.map((l: string, i: number) => (
                          <Badge key={i} variant="secondary" className="gap-1.5 pr-1">
                            {l}
                            <button onClick={() => removeLang(i)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">বিশেষ দক্ষতা</Label>
                      <div className="flex gap-2">
                        <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())} placeholder="যেমনঃ Swimming" />
                        <Button size="sm" onClick={addSkill}><Plus className="h-3.5 w-3.5" /></Button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {form.special_skills?.map((s: string, i: number) => (
                          <Badge key={i} variant="secondary" className="gap-1.5 pr-1">
                            {s}
                            <button onClick={() => removeSkill(i)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold border-b border-border/30 pb-2">অভিনয় শিক্ষা ও প্রশিক্ষণ</h3>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">ওয়ার্কশপ / একাডেমিক ট্রেনিং</Label>
                    <Textarea
                      value={form.acting_education ?? ""}
                      onChange={(e) => setForm({ ...form, acting_education: e.target.value })}
                      rows={3}
                      placeholder="যেমনঃ ঢাকা থিয়েটার, ২০২০ থেকে ৪ বছরের অভিনয় ওয়ার্কশপ..."
                    />
                  </div>
                </div>

                <Button onClick={saveProfile} className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" /> সংরক্ষণ করুন
                </Button>
              </Card>
            </TabsContent>

            <TabsContent value="gallery" className="space-y-4">
              <Card className="p-5 space-y-6">
                {renderGallerySection("headshot", "Headshots")}
                {renderGallerySection("fullbody", "Full Body")}
                {renderGallerySection("lookbook", "Look Book")}
              </Card>
            </TabsContent>

            <TabsContent value="credits" className="space-y-4">
              <Card className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold">অভিনয়ের তালিকা</h3>
                  <Button size="sm" onClick={addCredit}><Plus className="h-3.5 w-3.5 mr-1" /> নতুন</Button>
                </div>

                <div className="space-y-2">
                  {credits?.map((c: any) => (
                    <div key={c.id} className="grid grid-cols-12 gap-2 p-3 rounded-lg border border-border/30 bg-muted/10 items-center">
                      <Select value={c.category} onValueChange={(v) => updateCredit(c.id, { category: v })}>
                        <SelectTrigger className="col-span-6 sm:col-span-2 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="drama">নাটক</SelectItem>
                          <SelectItem value="tvc">TVC</SelectItem>
                          <SelectItem value="film">Film</SelectItem>
                          <SelectItem value="web">Web Series</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input className="col-span-6 sm:col-span-1 h-9" type="number" placeholder="বছর" defaultValue={c.release_year ?? ""} onBlur={(e) => updateCredit(c.id, { release_year: e.target.value ? Number(e.target.value) : null })} />
                      <Input className="col-span-12 sm:col-span-3 h-9" placeholder="প্রজেক্টের নাম" defaultValue={c.project_title} onBlur={(e) => updateCredit(c.id, { project_title: e.target.value })} />
                      <Input className="col-span-6 sm:col-span-2 h-9" placeholder="চরিত্র" defaultValue={c.character_name ?? ""} onBlur={(e) => updateCredit(c.id, { character_name: e.target.value })} />
                      <Input className="col-span-6 sm:col-span-2 h-9" placeholder="পরিচালক" defaultValue={c.director ?? ""} onBlur={(e) => updateCredit(c.id, { director: e.target.value })} />
                      <Input className="col-span-10 sm:col-span-1 h-9" placeholder="প্রযোজনা" defaultValue={c.production_house ?? ""} onBlur={(e) => updateCredit(c.id, { production_house: e.target.value })} />
                      <Button size="icon" variant="ghost" className="col-span-2 sm:col-span-1 text-destructive hover:bg-destructive/10" onClick={() => deleteCredit(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  {(!credits || credits.length === 0) && (
                    <p className="text-center text-xs text-muted-foreground py-8">এখনো কোনো অভিনয়ের তথ্য নেই</p>
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminActorEditor;
