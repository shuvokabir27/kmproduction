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
      {/* Popup Window */}
      {isOpen && (
        <div
          className={cn(
            "fixed z-[60] bg-card border border-border/50 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300 rounded-2xl",
            isMobile
              ? "bottom-[7rem] right-3 left-3 h-[65vh]"
              : "bottom-[5.5rem] right-6 w-[380px] h-[520px]"
          )}
        >
          {/* Header */}
          <div className="h-11 flex items-center justify-between px-3 bg-primary/10 border-b border-border/30 flex-shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
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

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "fixed z-[61] h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-2xl hover:bg-primary/90 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ring-2 ring-primary/30",
          isMobile ? "bottom-24 right-4" : "bottom-6 right-6",
          isOpen && "bg-destructive ring-destructive/30 hover:bg-destructive/90"
        )}
      >
        {isOpen ? (
          <X className="h-7 w-7" />
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
