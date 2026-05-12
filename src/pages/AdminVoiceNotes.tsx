import { useEffect, useRef, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
} from "lucide-react";
import { toast } from "sonner";

interface Clip {
  id: string;
  voice_note_id: string;
  sequence_number: number;
  audio_path: string;
  duration_seconds: number | null;
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

      if (target.replaceClipId) {
        // Replace: get old path, update row, delete old file
        const { data: oldClip } = await supabase
          .from("voice_note_clips")
          .select("audio_path")
          .eq("id", target.replaceClipId)
          .single();
        const { error: updErr } = await supabase
          .from("voice_note_clips")
          .update({ audio_path: path, duration_seconds: duration })
          .eq("id", target.replaceClipId);
        if (updErr) throw updErr;
        if (oldClip?.audio_path) {
          await supabase.storage.from("voice-notes").remove([oldClip.audio_path]);
        }
        toast.success("ভয়েস আপডেট হয়েছে");
      } else {
        // Determine next sequence number
        const { data: existing } = await supabase
          .from("voice_note_clips")
          .select("sequence_number")
          .eq("voice_note_id", target.groupId)
          .order("sequence_number", { ascending: false })
          .limit(1);
        const next = (existing?.[0]?.sequence_number || 0) + 1;
        const { error: insErr } = await supabase.from("voice_note_clips").insert({
          voice_note_id: target.groupId,
          sequence_number: next,
          audio_path: path,
          duration_seconds: duration,
        });
        if (insErr) throw insErr;
        toast.success(`ভয়েস ${toBn(next)} সেভ হয়েছে`);
      }
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      setRecordTarget(null);
      setRecordTime(0);
    }
  };

  const deleteClip = async (clip: Clip) => {
    if (!confirm(`ভয়েস ${toBn(clip.sequence_number)} মুছে ফেলবেন?`)) return;
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
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Mic className="h-6 w-6 text-primary" /> ভয়েস নোট
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            একটি শিরোনামে ক্রমিক নম্বরে একাধিক ভয়েস রেকর্ড করে রাখুন
          </p>
        </div>

        {/* New title */}
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
                        {toBn(g.clips.length)}টি ভয়েস ·{" "}
                        {new Date(g.created_at).toLocaleDateString("bn-BD")}
                      </p>
                    </div>
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
                    <div className="px-4 pb-4 space-y-2 border-t border-border/30 pt-3">
                      {g.clips.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          এখনো কোনো ভয়েস নেই
                        </p>
                      ) : (
                        g.clips.map((c) => {
                          const replacingThis =
                            isRecordingHere && recordTarget?.replaceClipId === c.id;
                          return (
                            <div
                              key={c.id}
                              className="flex items-center gap-2 bg-secondary/40 rounded-lg p-2"
                            >
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
                                <p className="text-sm font-medium text-foreground">
                                  নাম্বার {toBn(c.sequence_number)}
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
                          );
                        })
                      )}

                      {/* Add new clip button */}
                      <div className="pt-2">
                        {isRecordingHere && !recordTarget?.replaceClipId ? (
                          <Button
                            onClick={stopRecording}
                            variant="destructive"
                            className="w-full gap-2"
                          >
                            <Square className="h-4 w-4" />
                            রেকর্ড থামান ({fmt(recordTime)})
                          </Button>
                        ) : (
                          <Button
                            onClick={() => startRecording({ groupId: g.id })}
                            disabled={!!recordTarget || uploading}
                            className="w-full gap-2"
                          >
                            {uploading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Mic className="h-4 w-4" />
                            )}
                            {uploading
                              ? "আপলোড হচ্ছে..."
                              : `নাম্বার ${toBn(g.clips.length + 1)} রেকর্ড করুন`}
                          </Button>
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
