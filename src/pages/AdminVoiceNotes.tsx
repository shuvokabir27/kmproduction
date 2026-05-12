import { useEffect, useRef, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Mic, Square, Trash2, Loader2, Play, Pause } from "lucide-react";
import { toast } from "sonner";

interface VoiceNote {
  id: string;
  title: string;
  sequence: string | null;
  audio_path: string;
  duration_seconds: number | null;
  created_at: string;
  signedUrl?: string;
}

export default function AdminVoiceNotes() {
  const { user, isAdmin, loading } = useAuth();
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [fetching, setFetching] = useState(true);
  const [title, setTitle] = useState("");
  const [sequence, setSequence] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const load = async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from("voice_notes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setFetching(false);
      return;
    }
    const withUrls = await Promise.all(
      (data || []).map(async (n: any) => {
        const { data: signed } = await supabase.storage
          .from("voice-notes")
          .createSignedUrl(n.audio_path, 3600);
        return { ...n, signedUrl: signed?.signedUrl };
      })
    );
    setNotes(withUrls);
    setFetching(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await uploadRecording(blob, recordTime);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordTime(0);
      timerRef.current = window.setInterval(() => setRecordTime((t) => t + 1), 1000);
    } catch (err: any) {
      toast.error("মাইক্রোফোন এক্সেস দিতে হবে");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const uploadRecording = async (blob: Blob, duration: number) => {
    if (!title.trim()) {
      toast.error("শিরোনাম দিন");
      return;
    }
    if (!user) return;
    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}.webm`;
      const { error: upErr } = await supabase.storage
        .from("voice-notes")
        .upload(path, blob, { contentType: "audio/webm" });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("voice_notes").insert({
        user_id: user.id,
        title: title.trim(),
        sequence: sequence.trim() || null,
        audio_path: path,
        duration_seconds: duration,
      });
      if (insErr) throw insErr;
      toast.success("ভয়েস নোট সেভ হয়েছে");
      setTitle("");
      setSequence("");
      setRecordTime(0);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteNote = async (note: VoiceNote) => {
    if (!confirm("এই ভয়েস নোট মুছে ফেলবেন?")) return;
    await supabase.storage.from("voice-notes").remove([note.audio_path]);
    const { error } = await supabase.from("voice_notes").delete().eq("id", note.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("মুছে ফেলা হয়েছে");
    load();
  };

  const togglePlay = (note: VoiceNote) => {
    if (!note.signedUrl) return;
    if (playingId === note.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(note.signedUrl);
    audio.onended = () => setPlayingId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingId(note.id);
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
            স্ক্রিপ্টের প্রতি সিকুয়েন্স ভয়েস আকারে রেকর্ড করে রাখুন
          </p>
        </div>

        <Card className="p-4 space-y-3 bg-card border-border/50">
          <Input
            placeholder="শিরোনাম (যেমনঃ স্ক্রিপ্টের নাম)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={recording || uploading}
          />
          <Input
            placeholder="সিকুয়েন্স / সিন (ঐচ্ছিক)"
            value={sequence}
            onChange={(e) => setSequence(e.target.value)}
            disabled={recording || uploading}
          />

          <div className="flex items-center gap-3">
            {!recording ? (
              <Button onClick={startRecording} disabled={uploading} className="gap-2">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                {uploading ? "আপলোড হচ্ছে..." : "রেকর্ড শুরু করুন"}
              </Button>
            ) : (
              <Button onClick={stopRecording} variant="destructive" className="gap-2">
                <Square className="h-4 w-4" /> রেকর্ড থামান ({fmt(recordTime)})
              </Button>
            )}
            {recording && (
              <span className="flex items-center gap-2 text-sm text-destructive">
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                রেকর্ড হচ্ছে...
              </span>
            )}
          </div>
        </Card>

        <div className="space-y-3">
          {fetching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">কোনো ভয়েস নোট নেই</p>
          ) : (
            notes.map((n) => (
              <Card key={n.id} className="p-4 bg-card border-border/50 flex items-center gap-3">
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full h-12 w-12 flex-shrink-0"
                  onClick={() => togglePlay(n)}
                >
                  {playingId === n.id ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{n.title}</p>
                  {n.sequence && (
                    <p className="text-xs text-muted-foreground truncate">সিকুয়েন্স: {n.sequence}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("bn-BD")}
                    {n.duration_seconds ? ` • ${fmt(Math.round(n.duration_seconds))}` : ""}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive flex-shrink-0"
                  onClick={() => deleteNote(n)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
