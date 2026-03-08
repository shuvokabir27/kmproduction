import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { NewChatDialog } from "@/components/chat/NewChatDialog";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MessageCircle } from "lucide-react";

const Chat = () => {
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newChatType, setNewChatType] = useState<"personal" | "group" | null>(null);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const showList = !isMobile || !selectedConversation;
  const showMessages = !isMobile || !!selectedConversation;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)]">
        <div className="bg-card border border-border/50 rounded-xl overflow-hidden h-full flex">
          {/* Conversation List */}
          {showList && (
            <div className={`${isMobile ? "w-full" : "w-80 border-r border-border/30"} flex-shrink-0`}>
              <ConversationList
                selectedId={selectedConversation}
                onSelect={setSelectedConversation}
                onNewPersonal={() => setNewChatType("personal")}
                onNewGroup={() => setNewChatType("group")}
              />
            </div>
          )}

          {/* Messages Area */}
          {showMessages && (
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <ChatMessages
                  conversationId={selectedConversation}
                  onBack={isMobile ? () => setSelectedConversation(null) : undefined}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center space-y-3">
                    <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground/20" />
                    <p className="text-sm">একটি কথোপকথন নির্বাচন করুন</p>
                  </div>
                </div>
              )}
            </div>
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
    </AppLayout>
  );
};

export default Chat;
