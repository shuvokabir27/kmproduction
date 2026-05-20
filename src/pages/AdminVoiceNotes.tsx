import { useEffect, useRef, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  Square,
  Trash2,
  Loader2,
  Play,
  Pause,
  Plus,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Check,
  Sparkles,
  Save,
  FileText,
  Wand2,
  FileDown,
  FileType,
} from "lucide-react";
import { toast } from "sonner";
import { exportVoiceNotesPdf, exportVoiceNotesDocx } from "@/lib/voiceNotesExport";

interface Clip {
  id: string;
  voice_note_id: string;
  sequence_number: number;
  audio_path: string;
  duration_seconds: number | null;
  is_shot?: boolean;
  transcript?: string | null;
  transcript_status?: string | null;
  signedUrl?: string;
}

interface Group {
  id: string;
  title: string;
  created_at: string;
  clips: Clip[];
}

const toBn = (n: number) =>
  n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[parseInt(d)]);

export default function AdminVoiceNotes() {
  const { user, isAdmin, loading } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [fetching, setFetching] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [editingTranscripts, setEditingTranscripts] = useState<Record<string, string>>({});
  const [savingTranscript, setSavingTranscript] = useState<string | null>(null);
  const [retryingTranscript, setRetryingTranscript] = useState<string | null>(null);

  // Recording state — scoped to a target (groupId + optional replaceClipId)
  const [recordTarget, setRecordTarget] = useState<{
    groupId: string;
    replaceClipId?: string;
  } | null>(null);
  const [recordTime, setRecordTime] = useState(0);
  const [uploading, setUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);

  const load = async () => {
    setFetching(true);
    const { data: gData, error: gErr } = await supabase
      .from("voice_notes")
      .select("id, title, created_at")
      .order("created_at", { ascending: false });
    if (gErr) {
      toast.error(gErr.message);
      setFetching(false);
      return;
    }
    const groupIds = (gData || []).map((g) => g.id);
    let clipsByGroup: Record<string, Clip[]> = {};
    if (groupIds.length) {
      const { data: cData, error: cErr } = await supabase
        .from("voice_note_clips")
        .select("*")
        .in("voice_note_id", groupIds)
        .order("sequence_number", { ascending: true });
      if (cErr) {
        toast.error(cErr.message);
      } else {
        const withUrls = await Promise.all(
          (cData || []).map(async (c: any) => {
            const { data: signed } = await supabase.storage
              .from("voice-notes")
              .createSignedUrl(c.audio_path, 3600);
            return { ...c, signedUrl: signed?.signedUrl } as Clip;
          })
        );
        for (const c of withUrls) {
          (clipsByGroup[c.voice_note_id] ||= []).push(c);
        }
      }
    }
    setGroups(
      (gData || []).map((g: any) => ({
        ...g,
        clips: clipsByGroup[g.id] || [],
      }))
    );
    setFetching(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  // Auto-poll while any clip is processing
  useEffect(() => {
    const hasProcessing = groups.some((g) =>
      g.clips.some((c) => c.transcript_status === "processing" || c.transcript_status === "pending")
    );
    if (!hasProcessing) return;
    const t = window.setTimeout(load, 4000);
    return () => clearTimeout(t);
  }, [groups]);

  const createGroup = async () => {
    if (!newTitle.trim() || !user) return;
    setCreating(true);
    const { error } = await supabase.from("voice_notes").insert({
      user_id: user.id,
      title: newTitle.trim(),
    });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("শিরোনাম তৈরি হয়েছে");
    setNewTitle("");
    load();
  };

  const deleteGroup = async (g: Group) => {
    if (!confirm(`"${g.title}" এবং এর সব ভয়েস মুছে ফেলবেন?`)) return;
    if (g.clips.length) {
      await supabase.storage
        .from("voice-notes")
        .remove(g.clips.map((c) => c.audio_path));
    }
    const { error } = await supabase.from("voice_notes").delete().eq("id", g.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("মুছে ফেলা হয়েছে");
    load();
  };

  const transcribeClip = async (clipId: string) => {
    try {
      const { error } = await supabase.functions.invoke("transcribe-voice", {
        body: { clipId },
      });
      if (error) throw error;
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error("ট্রান্সক্রিপশন ব্যর্থ — পুনরায় চেষ্টা করুন");
    }
  };

  const retryTranscribe = async (clipId: string) => {
    setRetryingTranscript(clipId);
    try {
      // mark processing optimistically
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          clips: g.clips.map((c) =>
            c.id === clipId ? { ...c, transcript_status: "processing" } : c
          ),
        }))
      );
      await transcribeClip(clipId);
    } finally {
      setRetryingTranscript(null);
    }
  };

  const startRecording = async (target: { groupId: string; replaceClipId?: string }) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const dur = recordTime;
        await uploadClip(target, blob, dur);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecordTarget(target);
      setRecordTime(0);
      timerRef.current = window.setInterval(() => setRecordTime((t) => t + 1), 1000);
    } catch {
      toast.error("মাইক্রোফোন এক্সেস দিতে হবে");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
  };

  const uploadClip = async (
    target: { groupId: string; replaceClipId?: string },
    blob: Blob,
    duration: number
  ) => {
    if (!user) return;
    setUploading(true);
    try {
      const path = `${user.id}/${target.groupId}/${Date.now()}.webm`;
      const { error: upErr } = await supabase.storage
        .from("voice-notes")
        .upload(path, blob, { contentType: "audio/webm" });
      if (upErr) throw upErr;

      let clipId: string | null = null;

      if (target.replaceClipId) {
        const { data: oldClip } = await supabase
          .from("voice_note_clips")
          .select("audio_path")
          .eq("id", target.replaceClipId)
          .single();
        const { error: updErr } = await supabase
          .from("voice_note_clips")
          .update({
            audio_path: path,
            duration_seconds: duration,
            transcript: null,
            transcript_status: "processing",
          })
          .eq("id", target.replaceClipId);
        if (updErr) throw updErr;
        if (oldClip?.audio_path) {
          await supabase.storage.from("voice-notes").remove([oldClip.audio_path]);
        }
        clipId = target.replaceClipId;
        toast.success("ভয়েস আপডেট হয়েছে — টেক্সটে রূপান্তর হচ্ছে...");
      } else {
        const { data: existing } = await supabase
          .from("voice_note_clips")
          .select("sequence_number")
          .eq("voice_note_id", target.groupId)
          .order("sequence_number", { ascending: false })
          .limit(1);
        const next = (existing?.[0]?.sequence_number || 0) + 1;
        const { data: inserted, error: insErr } = await supabase
          .from("voice_note_clips")
          .insert({
            voice_note_id: target.groupId,
            sequence_number: next,
            audio_path: path,
            duration_seconds: duration,
            transcript_status: "processing",
          })
          .select("id")
          .single();
        if (insErr) throw insErr;
        clipId = inserted?.id ?? null;
        toast.success(`দৃশ্য ${toBn(next)} সেভ — টেক্সটে রূপান্তর হচ্ছে...`);
      }
      await load();
      // Fire transcription (don't await to keep UI responsive)
      if (clipId) transcribeClip(clipId);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      setRecordTarget(null);
      setRecordTime(0);
    }
  };

  const toggleShot = async (clip: Clip, next: boolean) => {
    // optimistic update
    setGroups((prev) =>
      prev.map((g) =>
        g.id === clip.voice_note_id
          ? { ...g, clips: g.clips.map((c) => (c.id === clip.id ? { ...c, is_shot: next } : c)) }
          : g
      )
    );
    const { error } = await supabase
      .from("voice_note_clips")
      .update({ is_shot: next })
      .eq("id", clip.id);
    if (error) {
      toast.error(error.message);
      load();
    }
  };

  const deleteClip = async (clip: Clip) => {
    if (!confirm(`দৃশ্য ${toBn(clip.sequence_number)} মুছে ফেলবেন?`)) return;
    await supabase.storage.from("voice-notes").remove([clip.audio_path]);
    const { error } = await supabase
      .from("voice_note_clips")
      .delete()
      .eq("id", clip.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("মুছে ফেলা হয়েছে");
    load();
  };

  const togglePlay = (clip: Clip) => {
    if (!clip.signedUrl) return;
    if (playingClipId === clip.id) {
      audioRef.current?.pause();
      setPlayingClipId(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(clip.signedUrl);
    audio.onended = () => setPlayingClipId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingClipId(clip.id);
  };

  const startEdit = (clip: Clip) => {
    setEditingTranscripts((prev) => ({ ...prev, [clip.id]: clip.transcript || "" }));
  };

  const cancelEdit = (clipId: string) => {
    setEditingTranscripts((prev) => {
      const n = { ...prev };
      delete n[clipId];
      return n;
    });
  };

  const saveTranscript = async (clipId: string) => {
    const text = editingTranscripts[clipId] ?? "";
    setSavingTranscript(clipId);
    const { error } = await supabase
      .from("voice_note_clips")
      .update({ transcript: text, transcript_status: "done" })
      .eq("id", clipId);
    setSavingTranscript(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("টেক্সট সেভ হয়েছে");
    cancelEdit(clipId);
    load();
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6 p-4">
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/10 via-card to-card p-6">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2 relative">
            <Mic className="h-6 w-6 text-primary" /> ভয়েস নোট
            <Badge variant="secondary" className="ml-2 gap-1 text-[10px]">
              <Sparkles className="h-3 w-3" /> AI ট্রান্সক্রিপশন
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 relative">
            ভয়েস রেকর্ড করুন — স্বয়ংক্রিয়ভাবে বাংলায় টেক্সট হয়ে যাবে। ভুল হলে পরে এডিট করতে পারবেন।
          </p>
        </div>

        <Card className="p-4 space-y-3 bg-card border-border/50">
          <p className="text-sm text-foreground font-medium">নতুন শিরোনাম যোগ করুন</p>
          <div className="flex gap-2">
            <Input
              placeholder="শিরোনাম (যেমনঃ স্ক্রিপ্টের নাম)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createGroup()}
              disabled={creating}
            />
            <Button onClick={createGroup} disabled={creating || !newTitle.trim()} className="gap-2">
              <Plus className="h-4 w-4" /> যোগ
            </Button>
          </div>
        </Card>

        <div className="space-y-3">
          {fetching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : groups.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              কোনো ভয়েস নোট নেই
            </p>
          ) : (
            groups.map((g) => {
              const isOpen = openGroupId === g.id;
              const isRecordingHere = recordTarget?.groupId === g.id;
              return (
                <Card key={g.id} className="bg-card border-border/50 overflow-hidden">
                  <button
                    type="button"
                    className="w-full p-4 flex items-center gap-3 text-left hover:bg-secondary/40 transition"
                    onClick={() => setOpenGroupId(isOpen ? null : g.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{g.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {toBn(g.clips.length)}টি দৃশ্য ·{" "}
                        {new Date(g.created_at).toLocaleDateString("bn-BD")}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="PDF ডাউনলোড"
                      className="text-primary hover:text-primary"
                      disabled={g.clips.length === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.promise(exportVoiceNotesPdf(g.title, g.clips), {
                          loading: "PDF তৈরি হচ্ছে...",
                          success: "PDF ডাউনলোড হয়েছে",
                          error: "PDF তৈরি ব্যর্থ",
                        });
                      }}
                    >
                      <FileDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Word (DOCX) ডাউনলোড"
                      className="text-blue-400 hover:text-blue-300"
                      disabled={g.clips.length === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.promise(exportVoiceNotesDocx(g.title, g.clips), {
                          loading: "DOCX তৈরি হচ্ছে...",
                          success: "DOCX ডাউনলোড হয়েছে",
                          error: "DOCX তৈরি ব্যর্থ",
                        });
                      }}
                    >
                      <FileType className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteGroup(g);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
                      {g.clips.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          এখনো কোনো ভয়েস নেই
                        </p>
                      ) : (
                        g.clips.map((c) => {
                          const replacingThis =
                            isRecordingHere && recordTarget?.replaceClipId === c.id;
                          const isEditing = editingTranscripts[c.id] !== undefined;
                          const status = c.transcript_status || "pending";
                          return (
                            <div
                              key={c.id}
                              className={`rounded-xl p-3 transition-colors space-y-2 ${
                                c.is_shot
                                  ? "bg-emerald-500/10 border border-emerald-500/40"
                                  : "bg-secondary/40 border border-border/40"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  className="rounded-full h-10 w-10 flex-shrink-0"
                                  onClick={() => togglePlay(c)}
                                >
                                  {playingClipId === c.id ? (
                                    <Pause className="h-4 w-4" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </Button>
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`text-sm font-medium flex items-center gap-2 ${
                                      c.is_shot ? "text-emerald-400" : "text-foreground"
                                    }`}
                                  >
                                    দৃশ্য {toBn(c.sequence_number)}
                                    {c.is_shot && (
                                      <span className="text-[10px] text-emerald-400/80">✓ শুট সম্পন্ন</span>
                                    )}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {c.duration_seconds
                                      ? fmt(Math.round(c.duration_seconds))
                                      : "—"}
                                  </p>
                                </div>
                                {replacingThis ? (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="gap-1"
                                    onClick={stopRecording}
                                  >
                                    <Square className="h-3.5 w-3.5" />
                                    {fmt(recordTime)}
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      title={c.is_shot ? "ডাবল-ক্লিক করে আনটিক করুন" : "শুট সম্পন্ন"}
                                      className={
                                        c.is_shot
                                          ? "text-emerald-400 hover:text-emerald-300 bg-emerald-500/10"
                                          : "text-muted-foreground hover:text-emerald-400"
                                      }
                                      onClick={() => {
                                        if (!c.is_shot) toggleShot(c, true);
                                      }}
                                      onDoubleClick={() => {
                                        if (c.is_shot) toggleShot(c, false);
                                      }}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      title="পুনরায় রেকর্ড"
                                      disabled={!!recordTarget || uploading}
                                      onClick={() =>
                                        startRecording({
                                          groupId: g.id,
                                          replaceClipId: c.id,
                                        })
                                      }
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => deleteClip(c)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>

                              {/* Transcript area */}
                              <div className="pl-1">
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <Textarea
                                      value={editingTranscripts[c.id]}
                                      onChange={(e) =>
                                        setEditingTranscripts((prev) => ({
                                          ...prev,
                                          [c.id]: e.target.value,
                                        }))
                                      }
                                      rows={3}
                                      className="text-sm"
                                      placeholder="টেক্সট লিখুন..."
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => cancelEdit(c.id)}
                                      >
                                        বাতিল
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="gap-1"
                                        disabled={savingTranscript === c.id}
                                        onClick={() => saveTranscript(c.id)}
                                      >
                                        {savingTranscript === c.id ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <Save className="h-3.5 w-3.5" />
                                        )}
                                        সেভ
                                      </Button>
                                    </div>
                                  </div>
                                ) : status === "processing" || status === "pending" ? (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/50 rounded-md p-2">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                    <span>AI টেক্সটে রূপান্তর করছে...</span>
                                  </div>
                                ) : status === "failed" ? (
                                  <div className="flex items-center justify-between gap-2 text-xs bg-destructive/10 border border-destructive/30 rounded-md p-2">
                                    <span className="text-destructive">ট্রান্সক্রিপশন ব্যর্থ</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 gap-1"
                                      disabled={retryingTranscript === c.id}
                                      onClick={() => retryTranscribe(c.id)}
                                    >
                                      {retryingTranscript === c.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Wand2 className="h-3 w-3" />
                                      )}
                                      পুনরায়
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="group/transcript bg-background/60 rounded-md p-2 border border-border/40">
                                    <div className="flex items-start gap-2">
                                      <FileText className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                                      <p className="flex-1 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                        {c.transcript || (
                                          <span className="text-muted-foreground italic">কোনো টেক্সট নেই</span>
                                        )}
                                      </p>
                                    </div>
                                    <div className="flex gap-1 justify-end mt-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-[11px] gap-1"
                                        onClick={() => retryTranscribe(c.id)}
                                        disabled={retryingTranscript === c.id}
                                      >
                                        {retryingTranscript === c.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <Wand2 className="h-3 w-3" />
                                        )}
                                        আবার রূপান্তর
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2 text-[11px]"
                                        onClick={() => startEdit(c)}
                                      >
                                        এডিট
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}

                      <div className="pt-4">
                        {isRecordingHere && !recordTarget?.replaceClipId ? (
                          <div className="relative flex flex-col items-center justify-center rounded-2xl border border-destructive/40 bg-gradient-to-b from-destructive/10 via-background to-background py-8 px-4 overflow-hidden">
                            {/* Ambient glow */}
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--destructive)/0.25),transparent_60%)] animate-pulse" />

                            {/* Live indicator */}
                            <div className="relative z-10 mb-4 flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 backdrop-blur-sm">
                              <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
                              </span>
                              <span className="text-[11px] font-semibold tracking-widest text-destructive uppercase">
                                রেকর্ডিং
                              </span>
                            </div>

                            {/* Stop button with multi-layer rings */}
                            <div className="relative z-10 flex items-center justify-center">
                              <span className="absolute h-28 w-28 rounded-full bg-destructive/20 animate-ping" />
                              <span className="absolute h-24 w-24 rounded-full bg-destructive/30 animate-ping [animation-delay:300ms]" />
                              <span className="absolute h-20 w-20 rounded-full bg-destructive/40 animate-pulse" />
                              <button
                                onClick={stopRecording}
                                aria-label="রেকর্ড থামান"
                                className="relative h-20 w-20 rounded-full bg-gradient-to-br from-red-500 to-red-700 shadow-[0_0_40px_hsl(var(--destructive)/0.6)] ring-4 ring-destructive/30 transition-transform hover:scale-105 active:scale-95 flex items-center justify-center"
                              >
                                <Square className="h-7 w-7 text-white fill-white" />
                              </button>
                            </div>

                            {/* Animated waveform bars */}
                            <div className="relative z-10 mt-6 flex items-end justify-center gap-1 h-8">
                              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <span
                                  key={i}
                                  className="w-1 rounded-full bg-gradient-to-t from-destructive/60 to-destructive animate-pulse"
                                  style={{
                                    height: `${30 + ((i * 17) % 70)}%`,
                                    animationDelay: `${i * 90}ms`,
                                    animationDuration: `${600 + (i % 3) * 200}ms`,
                                  }}
                                />
                              ))}
                            </div>

                            {/* Timer */}
                            <div className="relative z-10 mt-4 font-mono text-2xl font-bold tracking-wider text-destructive tabular-nums">
                              {fmt(recordTime)}
                            </div>
                            <p className="relative z-10 mt-1 text-xs text-muted-foreground">
                              থামাতে লাল বাটনে চাপ দিন
                            </p>
                          </div>
                        ) : (
                          <div className="relative flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-gradient-to-b from-primary/5 via-background to-background py-8 px-4">
                            <div className="relative z-10 flex items-center justify-center">
                              {!uploading && !recordTarget && (
                                <>
                                  <span className="absolute h-24 w-24 rounded-full bg-primary/10 animate-ping" />
                                  <span className="absolute h-20 w-20 rounded-full bg-primary/20" />
                                </>
                              )}
                              <button
                                onClick={() => startRecording({ groupId: g.id })}
                                disabled={!!recordTarget || uploading}
                                aria-label="রেকর্ড শুরু করুন"
                                className="relative h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-[0_0_30px_hsl(var(--primary)/0.4)] ring-4 ring-primary/20 transition-all hover:scale-105 hover:shadow-[0_0_40px_hsl(var(--primary)/0.6)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
                              >
                                {uploading ? (
                                  <Loader2 className="h-8 w-8 text-primary-foreground animate-spin" />
                                ) : (
                                  <Mic className="h-8 w-8 text-primary-foreground" />
                                )}
                              </button>
                            </div>
                            <div className="relative z-10 mt-5 text-sm font-semibold text-foreground">
                              {uploading
                                ? "আপলোড ও ট্রান্সক্রিপশন..."
                                : `দৃশ্য ${toBn(g.clips.length + 1)} রেকর্ড করুন`}
                            </div>
                            <p className="relative z-10 mt-1 text-xs text-muted-foreground">
                              {uploading ? "অপেক্ষা করুন" : "মাইক্রোফোন বাটনে চাপ দিন"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
