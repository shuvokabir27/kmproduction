import { useState, useRef, useCallback, useEffect } from "react";
import { MessageCircle, X, Minimize2 } from "lucide-react";
import { ConversationList } from "./ConversationList";
import { ChatMessages } from "./ChatMessages";
import { NewChatDialog } from "./NewChatDialog";
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

  // Draggable state — default bottom-right
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; dragged: boolean } | null>(null);

  useEffect(() => {
    setPos({
      x: window.innerWidth - BTN_SIZE - 16,
      y: window.innerHeight - (isMobile ? 140 : 80),
    });
  }, [isMobile]);

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

  // Calculate popup position so it never goes off-screen
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const btnCenterX = pos.x + BTN_SIZE / 2;
  const btnTop = pos.y;

  let popupStyle: React.CSSProperties;

  if (isMobile) {
    const popH = Math.min(vh * 0.6, btnTop - GAP - 8);
    popupStyle = {
      position: "fixed",
      left: 12,
      right: 12,
      bottom: vh - btnTop + GAP,
      height: Math.max(300, popH),
    };
  } else {
    // Horizontal: prefer aligning popup edge with button side
    let left: number;
    if (btnCenterX < vw / 2) {
      // Button on left — popup opens to right
      left = Math.max(8, pos.x);
    } else {
      // Button on right — popup opens to left
      left = Math.min(vw - POPUP_W - 8, pos.x + BTN_SIZE - POPUP_W);
    }
    // Clamp horizontal
    left = Math.max(8, Math.min(left, vw - POPUP_W - 8));

    // Vertical: popup above button
    let popBottom = vh - btnTop + GAP;
    const popTop = vh - popBottom - POPUP_H;
    if (popTop < 8) {
      popBottom = vh - POPUP_H - 8;
    }

    popupStyle = {
      position: "fixed",
      left,
      bottom: popBottom,
      width: POPUP_W,
      height: POPUP_H,
    };
  }

  const originClass = btnCenterX < vw / 2 ? "origin-bottom-left" : "origin-bottom-right";

  return (
    <>
      {/* Glow behind popup */}
      {isOpen && (
        <div
          className="fixed z-[59] pointer-events-none rounded-3xl"
          style={{
            left: (popupStyle.left as number) - 8,
            right: popupStyle.right ? 4 : undefined,
            bottom: (popupStyle.bottom as number) - 8,
            width: isMobile ? undefined : POPUP_W + 16,
            height: (popupStyle.height as number) + 16,
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
    </>
  );
}
