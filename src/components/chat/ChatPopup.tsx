import { useState, useRef, useCallback, useEffect } from "react";
import { MessageCircle, X, Minimize2 } from "lucide-react";
import { ConversationList } from "./ConversationList";
import { ChatMessages } from "./ChatMessages";
import { NewChatDialog } from "./NewChatDialog";
import { IncomingCallDialog, ActiveCallScreen } from "./CallComponents";
import { useWebRTC } from "@/hooks/useWebRTC";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChatPopupProps {
  unreadCount?: number;
}

const BTN_SIZE = 56;
const POPUP_W = 380;
const POPUP_H = 520;
const GAP = 14;

export function ChatPopup({ unreadCount }: ChatPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newChatType, setNewChatType] = useState<"personal" | "group" | null>(null);
  const isMobile = useIsMobile();

  // Incoming call state
  const [incomingCall, setIncomingCall] = useState<{
    callerId: string;
    callerName: string;
    callType: "audio" | "video";
    callId: string;
  } | null>(null);

  const webrtc = useWebRTC({
    onIncomingCall: (callerId, callerName, callType, callId) => {
      setIncomingCall({ callerId, callerName, callType, callId });
    },
  });

  const handleStartCall = useCallback((targetUserId: string, type: "audio" | "video") => {
    webrtc.startCall(targetUserId, type);
  }, [webrtc]);

  const handleAcceptCall = useCallback(() => {
    if (!incomingCall) return;
    webrtc.answerCall(incomingCall.callerId, incomingCall.callType, incomingCall.callId);
    setIncomingCall(null);
  }, [incomingCall, webrtc]);

  const handleDeclineCall = useCallback(() => {
    if (!incomingCall) return;
    webrtc.declineCall(incomingCall.callId, incomingCall.callerId);
    setIncomingCall(null);
  }, [incomingCall, webrtc]);

  // Get remote user name for active call
  const [remoteUserName, setRemoteUserName] = useState("সদস্য");
  useEffect(() => {
    if (webrtc.remoteUserId) {
      import("@/integrations/supabase/client").then(({ supabase }) => {
        supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", webrtc.remoteUserId!)
          .single()
          .then(({ data }) => {
            if (data) setRemoteUserName(data.full_name);
          });
      });
    }
  }, [webrtc.remoteUserId]);

  // Draggable state — default bottom-right
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; dragged: boolean } | null>(null);

  const getDefaultPos = useCallback(() => ({
    x: window.innerWidth - BTN_SIZE - 16,
    y: window.innerWidth < 768 ? 76 : window.innerHeight - 80,
  }), []);

  // Reset to default on mount and viewport change
  useEffect(() => {
    setPos(getDefaultPos());
  }, [isMobile, getDefaultPos]);

  // Reset on resize so button never stays off-screen
  useEffect(() => {
    const onResize = () => setPos(getDefaultPos());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [getDefaultPos]);

  const clamp = useCallback((x: number, y: number) => ({
    x: Math.max(4, Math.min(x, window.innerWidth - BTN_SIZE - 4)),
    y: Math.max(4, Math.min(y, window.innerHeight - BTN_SIZE - 4)),
  }), []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!pos) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y, dragged: false };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.dragged = true;
    if (d.dragged) {
      setPos(clamp(d.origX + dx, d.origY + dy));
    }
  }, [clamp]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || !d.dragged) {
      setIsOpen((prev) => !prev);
    }
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  const showList = !selectedConversation;
  const showMessages = !!selectedConversation;

  if (!pos) return null;

  // Calculate popup position so it always stays inside the viewport
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const btnCenterX = pos.x + BTN_SIZE / 2;
  const clampToRange = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  const popupWidth = isMobile ? Math.max(280, vw - 24) : Math.min(POPUP_W, vw - 16);
  const popupHeight = isMobile
    ? Math.min(Math.max(320, Math.round(vh * 0.58)), vh - 16)
    : Math.min(POPUP_H, vh - 16);

  const availableAbove = pos.y - GAP - 8;
  const availableBelow = vh - (pos.y + BTN_SIZE) - GAP - 8;
  const openAbove = availableAbove >= popupHeight || availableAbove >= availableBelow;

  let opensRight = btnCenterX <= vw / 2;
  let left = 12;

  if (isMobile) {
    left = clampToRange((vw - popupWidth) / 2, 8, vw - popupWidth - 8);
  } else {
    const availableRight = vw - (pos.x + BTN_SIZE) - 8;
    const availableLeft = pos.x - 8;
    opensRight = availableRight >= popupWidth || availableRight >= availableLeft;
    left = clampToRange(
      opensRight ? pos.x : pos.x + BTN_SIZE - popupWidth,
      8,
      vw - popupWidth - 8,
    );
  }

  const top = clampToRange(
    openAbove ? pos.y - popupHeight - GAP : pos.y + BTN_SIZE + GAP,
    8,
    vh - popupHeight - 8,
  );

  const popupStyle: React.CSSProperties = {
    position: "fixed",
    left,
    top,
    width: popupWidth,
    height: popupHeight,
  };

  const originClass = openAbove
    ? opensRight
      ? "origin-bottom-left"
      : "origin-bottom-right"
    : opensRight
      ? "origin-top-left"
      : "origin-top-right";

  return (
    <>
      {/* Glow behind popup */}
      {isOpen && (
        <div
          className="fixed z-[59] pointer-events-none rounded-3xl"
          style={{
            left: left - 8,
            top: top - 8,
            width: popupWidth + 16,
            height: popupHeight + 16,
          }}
        >
          <div className="absolute inset-0 rounded-3xl bg-primary/15 blur-xl animate-pulse" />
        </div>
      )}

      {/* Popup Window */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-[60] bg-card/95 backdrop-blur-xl border border-primary/20 shadow-[0_0_40px_-8px_hsl(var(--primary)/0.3)] flex flex-col overflow-hidden rounded-2xl",
            "animate-scale-in",
            originClass
          )}
          style={popupStyle}
        >
          {/* Header */}
          <div className="h-11 flex items-center justify-between px-3 bg-gradient-to-r from-primary/15 to-accent/10 border-b border-primary/10 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                <MessageCircle className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="font-semibold text-sm text-foreground">মেসেজ</span>
            </div>
            <div className="flex items-center gap-1">
              {selectedConversation && (
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {showList && !showMessages && (
              <div className="flex-1 overflow-hidden">
                <ConversationList
                  selectedId={selectedConversation}
                  onSelect={setSelectedConversation}
                  onNewPersonal={() => setNewChatType("personal")}
                  onNewGroup={() => setNewChatType("group")}
                />
              </div>
            )}
            {showMessages && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <ChatMessages
                  conversationId={selectedConversation!}
                  onBack={() => setSelectedConversation(null)}
                  onStartCall={handleStartCall}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Draggable Floating Button */}
      <div
        className="fixed z-[61] touch-none select-none"
        style={{ left: pos.x, top: pos.y }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {!isOpen && (
          <div className="absolute inset-0 rounded-full bg-primary/25 blur-md animate-pulse scale-125" />
        )}
        <div
          className={cn(
            "relative h-14 w-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 cursor-grab active:cursor-grabbing",
            isOpen
              ? "bg-destructive/90 text-destructive-foreground ring-2 ring-destructive/30 rotate-90"
              : "bg-primary/90 text-primary-foreground ring-2 ring-primary/30"
          )}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <>
              <MessageCircle className="h-7 w-7" />
              {(unreadCount ?? 0) > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-6 min-w-6 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold flex items-center justify-center shadow-lg animate-bounce">
                  {unreadCount! > 99 ? "99+" : unreadCount}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* New Chat Dialog */}
      {newChatType && (
        <NewChatDialog
          open={!!newChatType}
          onOpenChange={(open) => !open && setNewChatType(null)}
          type={newChatType}
          onCreated={(id) => {
            setSelectedConversation(id);
            setNewChatType(null);
          }}
        />
      )}

      {/* Incoming Call Dialog */}
      {incomingCall && (
        <IncomingCallDialog
          callerName={incomingCall.callerName}
          callType={incomingCall.callType}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />
      )}

      {/* Active Call Screen */}
      {(webrtc.callState === "calling" || webrtc.callState === "active" || webrtc.callState === "ended") && (
        <ActiveCallScreen
          callerName={remoteUserName}
          callType={webrtc.callType}
          callState={webrtc.callState}
          duration={webrtc.callDuration}
          isMuted={webrtc.isMuted}
          isVideoOff={webrtc.isVideoOff}
          localVideoRef={webrtc.localVideoRef}
          remoteVideoRef={webrtc.remoteVideoRef}
          remoteStream={webrtc.remoteStream}
          onToggleMute={webrtc.toggleMute}
          onToggleVideo={webrtc.toggleVideo}
          onEndCall={webrtc.endCall}
        />
      )}
    </>
  );
}
