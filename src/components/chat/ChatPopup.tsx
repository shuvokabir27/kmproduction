import { useState } from "react";
import { MessageCircle, X, Minimize2 } from "lucide-react";
import { ConversationList } from "./ConversationList";
import { ChatMessages } from "./ChatMessages";
import { NewChatDialog } from "./NewChatDialog";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChatPopupProps {
  unreadCount?: number;
}

export function ChatPopup({ unreadCount }: ChatPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newChatType, setNewChatType] = useState<"personal" | "group" | null>(null);
  const isMobile = useIsMobile();

  const showList = !selectedConversation;
  const showMessages = !!selectedConversation;

  return (
    <>
      {/* Glow effect behind popup */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-[59] pointer-events-none",
            isMobile
              ? "bottom-[6.5rem] right-1 left-1 h-[66vh]"
              : "bottom-[5rem] right-4 w-[396px] h-[536px]"
          )}
        >
          <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-xl animate-pulse" />
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-t from-primary/30 via-primary/5 to-accent/10 blur-lg" />
        </div>
      )}

      {/* Connector tail from button to popup */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-[60] pointer-events-none",
            isMobile
              ? "bottom-[6.25rem] right-7 w-6 h-6"
              : "bottom-[4.75rem] right-[1.85rem] w-6 h-6"
          )}
        >
          <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[12px] border-t-card" />
        </div>
      )}

      {/* Popup Window */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-[60] bg-card/95 backdrop-blur-xl border border-primary/20 shadow-[0_0_40px_-8px_hsl(var(--primary)/0.3)] flex flex-col overflow-hidden rounded-2xl",
            "animate-scale-in origin-bottom-right",
            isMobile
              ? "bottom-[7rem] right-3 left-3 h-[65vh]"
              : "bottom-[5.5rem] right-6 w-[380px] h-[520px]"
          )}
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

      {/* Floating Button with glow */}
      <div className={cn("fixed z-[61]", isMobile ? "bottom-24 right-4" : "bottom-6 right-6")}>
        {/* Button glow ring */}
        {!isOpen && (
          <div className="absolute inset-0 rounded-full bg-primary/30 blur-md animate-pulse scale-125" />
        )}
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "relative h-14 w-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300",
            isOpen
              ? "bg-destructive text-destructive-foreground ring-2 ring-destructive/30 hover:bg-destructive/90 rotate-90"
              : "bg-primary text-primary-foreground ring-2 ring-primary/30 hover:bg-primary/90 hover:scale-110 active:scale-95"
          )}
        >
          {isOpen ? (
            <X className="h-6 w-6 transition-transform duration-300" />
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
        </button>
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
