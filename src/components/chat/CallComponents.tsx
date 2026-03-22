import { Phone, Video, X, Mic, MicOff, VideoOff, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

// Format seconds to mm:ss
function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// ========== Call Buttons (in chat header) ==========
interface CallButtonsProps {
  onAudioCall: () => void;
  onVideoCall: () => void;
  disabled?: boolean;
}

export function CallButtons({ onAudioCall, onVideoCall, disabled }: CallButtonsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onAudioCall}
        disabled={disabled}
        className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-primary/10 text-primary transition-colors disabled:opacity-40"
        title="অডিও কল"
      >
        <Phone className="h-4 w-4" />
      </button>
      <button
        onClick={onVideoCall}
        disabled={disabled}
        className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-primary/10 text-primary transition-colors disabled:opacity-40"
        title="ভিডিও কল"
      >
        <Video className="h-4 w-4" />
      </button>
    </div>
  );
}

// ========== Incoming Call Dialog ==========
interface IncomingCallProps {
  callerName: string;
  callType: "audio" | "video";
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallDialog({ callerName, callType, onAccept, onDecline }: IncomingCallProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-primary/20 rounded-2xl p-6 w-[300px] shadow-[0_0_60px_-10px_hsl(var(--primary)/0.4)] text-center space-y-5">
        {/* Pulsing avatar */}
        <div className="mx-auto relative w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
            {callType === "video" ? (
              <Video className="h-8 w-8 text-primary" />
            ) : (
              <Phone className="h-8 w-8 text-primary" />
            )}
          </div>
        </div>

        <div>
          <p className="text-foreground font-semibold text-lg">{callerName}</p>
          <p className="text-muted-foreground text-sm">
            {callType === "video" ? "ভিডিও কল আসছে..." : "অডিও কল আসছে..."}
          </p>
        </div>

        <div className="flex items-center justify-center gap-6">
          <button
            onClick={onDecline}
            className="h-14 w-14 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:bg-destructive/90 transition-transform active:scale-95"
          >
            <PhoneOff className="h-6 w-6" />
          </button>
          <button
            onClick={onAccept}
            className="h-14 w-14 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg hover:bg-green-600 transition-transform active:scale-95 animate-bounce"
          >
            <Phone className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ========== Active Call Screen ==========
interface ActiveCallProps {
  callerName: string;
  callType: "audio" | "video";
  callState: "calling" | "ringing" | "active" | "ended";
  duration: number;
  isMuted: boolean;
  isVideoOff: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  remoteStream: MediaStream;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
}

export function ActiveCallScreen({
  callerName,
  callType,
  callState,
  duration,
  isMuted,
  isVideoOff,
  localVideoRef,
  remoteVideoRef,
  remoteStream,
  onToggleMute,
  onToggleVideo,
  onEndCall,
}: ActiveCallProps) {
  const remoteRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = remoteVideoRef?.current || remoteRef.current;
    if (el && remoteStream) {
      el.srcObject = remoteStream;
    }
  }, [remoteStream, remoteVideoRef]);

  const statusText =
    callState === "calling"
      ? "কল করা হচ্ছে..."
      : callState === "active"
        ? formatDuration(duration)
        : callState === "ended"
          ? "কল শেষ"
          : "রিং হচ্ছে...";

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col animate-fade-in">
      {/* Video area */}
      {callType === "video" ? (
        <div className="flex-1 relative bg-muted/50">
          {/* Remote video (full screen) */}
          <video
            ref={(el) => {
              if (remoteVideoRef) (remoteVideoRef as any).current = el;
              (remoteRef as any).current = el;
            }}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Local video (small PIP) */}
          <div className="absolute top-4 right-4 w-28 h-40 rounded-xl overflow-hidden border-2 border-primary/30 shadow-lg bg-muted">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={cn("w-full h-full object-cover", isVideoOff && "hidden")}
            />
            {isVideoOff && (
              <div className="w-full h-full flex items-center justify-center">
                <VideoOff className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Overlay info */}
          <div className="absolute top-4 left-4 bg-background/60 backdrop-blur-sm rounded-lg px-3 py-1.5">
            <p className="text-sm font-medium text-foreground">{callerName}</p>
            <p className="text-xs text-muted-foreground">{statusText}</p>
          </div>
        </div>
      ) : (
        /* Audio call UI */
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
            <Phone className="h-10 w-10 text-primary" />
          </div>
          <p className="text-xl font-semibold text-foreground">{callerName}</p>
          <p className="text-muted-foreground text-sm">{statusText}</p>

          {callState === "calling" && (
            <div className="flex gap-1 mt-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-5 py-6 bg-card/80 backdrop-blur-xl border-t border-border/30">
        <button
          onClick={onToggleMute}
          className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center transition-colors",
            isMuted
              ? "bg-destructive/20 text-destructive"
              : "bg-muted text-foreground hover:bg-muted/80"
          )}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        {callType === "video" && (
          <button
            onClick={onToggleVideo}
            className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center transition-colors",
              isVideoOff
                ? "bg-destructive/20 text-destructive"
                : "bg-muted text-foreground hover:bg-muted/80"
            )}
          >
            {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </button>
        )}

        <button
          onClick={onEndCall}
          className="h-14 w-14 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg hover:bg-destructive/90 transition-transform active:scale-95"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
