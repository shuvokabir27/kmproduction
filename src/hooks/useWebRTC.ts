import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export type CallState = "idle" | "calling" | "ringing" | "active" | "ended";

interface UseWebRTCOptions {
  onIncomingCall?: (callerId: string, callerName: string, callType: "audio" | "video", callId: string) => void;
}

export function useWebRTC(options?: UseWebRTCOptions) {
  const { user } = useAuth();
  const [callState, setCallState] = useState<CallState>("idle");
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [callId, setCallId] = useState<string | null>(null);
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const channelRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // Cleanup
  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = new MediaStream();
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    pendingCandidatesRef.current = [];
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
  }, []);

  // Get media stream
  const getMedia = useCallback(async (type: "audio" | "video") => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "video",
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    return stream;
  }, []);

  // Create peer connection
  const createPC = useCallback((signalingChannel: any) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        signalingChannel.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { candidate: e.candidate.toJSON(), sender: user?.id },
        });
      }
    };

    pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach((track) => {
        remoteStreamRef.current.addTrack(track);
      });
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
        endCall();
      }
    };

    // Add local tracks
    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });

    return pc;
  }, [user?.id]);

  // Setup signaling channel
  const setupSignaling = useCallback((targetUserId: string, currentCallId: string) => {
    const channelName = [user?.id, targetUserId].sort().join("-");
    const channel = supabase.channel(`call-${channelName}`);

    channel.on("broadcast", { event: "offer" }, async ({ payload }: any) => {
      if (payload.sender === user?.id) return;
      const pc = pcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      channel.send({
        type: "broadcast",
        event: "answer",
        payload: { sdp: answer, sender: user?.id },
      });
      // Process pending candidates
      for (const c of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      }
      pendingCandidatesRef.current = [];
    });

    channel.on("broadcast", { event: "answer" }, async ({ payload }: any) => {
      if (payload.sender === user?.id) return;
      const pc = pcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      for (const c of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      }
      pendingCandidatesRef.current = [];
    });

    channel.on("broadcast", { event: "ice-candidate" }, async ({ payload }: any) => {
      if (payload.sender === user?.id) return;
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription) {
        pendingCandidatesRef.current.push(payload.candidate);
        return;
      }
      await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    });

    channel.on("broadcast", { event: "call-end" }, ({ payload }: any) => {
      if (payload.sender === user?.id) return;
      cleanup();
      setCallState("ended");
      setTimeout(() => setCallState("idle"), 2000);
    });

    channel.subscribe();
    channelRef.current = channel;
    return channel;
  }, [user?.id, cleanup]);

  // Start a call (caller side)
  const startCall = useCallback(async (targetUserId: string, type: "audio" | "video") => {
    if (!user?.id) return;
    try {
      setCallType(type);
      setRemoteUserId(targetUserId);
      setCallState("calling");

      await getMedia(type);

      // Create call record
      const { data: call } = await (supabase as any)
        .from("calls")
        .insert({
          caller_id: user.id,
          callee_id: targetUserId,
          call_type: type,
          status: "ringing",
        })
        .select("id")
        .single();

      if (!call) throw new Error("Failed to create call");
      setCallId(call.id);

      const channel = setupSignaling(targetUserId, call.id);
      const pc = createPC(channel);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Small delay to let channel subscribe
      setTimeout(() => {
        channel.send({
          type: "broadcast",
          event: "offer",
          payload: { sdp: offer, sender: user.id },
        });
      }, 500);
    } catch (err) {
      console.error("Failed to start call:", err);
      cleanup();
      setCallState("idle");
    }
  }, [user?.id, getMedia, setupSignaling, createPC, cleanup]);

  // Answer a call (callee side)
  const answerCall = useCallback(async (callerUserId: string, type: "audio" | "video", incomingCallId: string) => {
    if (!user?.id) return;
    try {
      setCallType(type);
      setRemoteUserId(callerUserId);
      setCallId(incomingCallId);
      setCallState("active");

      await getMedia(type);

      // Update call status
      await (supabase as any)
        .from("calls")
        .update({ status: "active", started_at: new Date().toISOString() })
        .eq("id", incomingCallId);

      const channel = setupSignaling(callerUserId, incomingCallId);
      createPC(channel);

      // Start timer
      timerRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to answer call:", err);
      cleanup();
      setCallState("idle");
    }
  }, [user?.id, getMedia, setupSignaling, createPC, cleanup]);

  // End call
  const endCall = useCallback(async () => {
    channelRef.current?.send({
      type: "broadcast",
      event: "call-end",
      payload: { sender: user?.id },
    });

    if (callId) {
      await (supabase as any)
        .from("calls")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", callId);
    }

    cleanup();
    setCallState("ended");
    setTimeout(() => setCallState("idle"), 1500);
  }, [user?.id, callId, cleanup]);

  // Decline call
  const declineCall = useCallback(async (incomingCallId: string, callerUserId: string) => {
    const channelName = [user?.id, callerUserId].sort().join("-");
    const channel = supabase.channel(`call-${channelName}`);
    channel.subscribe(() => {
      channel.send({
        type: "broadcast",
        event: "call-end",
        payload: { sender: user?.id },
      });
      setTimeout(() => supabase.removeChannel(channel), 1000);
    });

    await (supabase as any)
      .from("calls")
      .update({ status: "declined", ended_at: new Date().toISOString() })
      .eq("id", incomingCallId);
  }, [user?.id]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((m) => !m);
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsVideoOff((v) => !v);
  }, []);

  // Listen for incoming calls
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("incoming-calls")
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "calls", filter: `callee_id=eq.${user.id}` },
        async (payload: any) => {
          const call = payload.new;
          if (call.status !== "ringing") return;
          // Get caller profile
          const { data: callerProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", call.caller_id)
            .single();
          
          options?.onIncomingCall?.(
            call.caller_id,
            callerProfile?.full_name || "অজানা",
            call.call_type,
            call.id
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, options?.onIncomingCall]);

  // Listen for call status updates (caller side: when callee answers)
  useEffect(() => {
    if (!callId || callState !== "calling") return;

    const channel = supabase
      .channel(`call-status-${callId}`)
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "calls", filter: `id=eq.${callId}` },
        (payload: any) => {
          const updated = payload.new;
          if (updated.status === "active") {
            setCallState("active");
            timerRef.current = setInterval(() => {
              setCallDuration((d) => d + 1);
            }, 1000);
          } else if (updated.status === "declined" || updated.status === "missed") {
            cleanup();
            setCallState("ended");
            setTimeout(() => setCallState("idle"), 2000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [callId, callState, cleanup]);

  return {
    callState,
    callType,
    callId,
    remoteUserId,
    isMuted,
    isVideoOff,
    callDuration,
    localVideoRef,
    remoteVideoRef,
    remoteStream: remoteStreamRef.current,
    startCall,
    answerCall,
    endCall,
    declineCall,
    toggleMute,
    toggleVideo,
  };
}
