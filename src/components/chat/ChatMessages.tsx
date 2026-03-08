import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useOnlineStatus, isUserOnline, getLastSeenText } from "@/hooks/usePresence";
import { playMessageSound } from "@/lib/sounds";
import { useEffect, useRef, useState } from "react";
import { Send, ArrowLeft, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const sb = supabase as any;

interface ChatMessagesProps {
  conversationId: string;
  onBack?: () => void;
}

export function ChatMessages({ conversationId, onBack }: ChatMessagesProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: onlineMap } = useOnlineStatus();

  // Mark as read when opening conversation
  useEffect(() => {
    if (user?.id && conversationId) {
      sb.from("conversation_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["unread-messages"] });
        });
    }
  }, [conversationId, user?.id, queryClient]);

  const { data: conversation } = useQuery({
    queryKey: ["conversation-info", conversationId],
    queryFn: async () => {
      const { data: conv } = await sb
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .maybeSingle();

      const { data: members } = await sb
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", conversationId);

      const memberUserIds = members?.map((m: any) => m.user_id) ?? [];
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("full_name, photo_url, user_id, last_seen_at")
        .in("user_id", memberUserIds);

      const otherMembers = profiles?.filter((p) => p.user_id !== user?.id) ?? [];
      const displayName =
        conv?.type === "group"
          ? conv?.name || "গ্রুপ চ্যাট"
          : otherMembers[0]?.full_name || "অজানা সদস্য";
      const photoUrl = conv?.type === "personal" ? otherMembers[0]?.photo_url : null;

      return {
        ...conv,
        displayName,
        photoUrl,
        memberCount: memberUserIds.length,
        profiles: profiles ?? [],
      };
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const { data } = await sb
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    refetchInterval: 3000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          // Play sound for incoming messages from others
          if (payload.new?.sender_id !== user?.id) {
            playMessageSound();
          }
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          // Mark as read immediately
          sb.from("conversation_members")
            .update({ last_read_at: new Date().toISOString() })
            .eq("conversation_id", conversationId)
            .eq("user_id", user!.id)
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ["unread-messages"] });
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      const msgContent = newMessage.trim();
      const { error } = await sb.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user!.id,
        content: msgContent,
      });
      if (error) throw error;
      await sb
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      // Send push notification to other members (fire and forget)
      supabase.functions.invoke("send-push-notification", {
        body: {
          conversation_id: conversationId,
          sender_id: user!.id,
          content: msgContent,
        },
      }).catch(() => {});
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      inputRef.current?.focus();
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });

  const getProfile = (senderId: string) =>
    conversation?.profiles?.find((p: any) => p.user_id === senderId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessage.mutate();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border/30 flex items-center gap-3 bg-card/90 backdrop-blur sticky top-0 z-10">
        {onBack && (
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="relative">
          <Avatar className="h-9 w-9 flex-shrink-0">
            {conversation?.photoUrl && <AvatarImage src={conversation.photoUrl} />}
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {conversation?.type === "group" ? <Users className="h-4 w-4" /> : conversation?.displayName?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          {conversation?.type === "personal" && (() => {
            const other = conversation?.profiles?.find((p: any) => p.user_id !== user?.id);
            return other && onlineMap && isUserOnline(onlineMap.get(other.user_id)) ? (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
            ) : null;
          })()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{conversation?.displayName}</p>
          {conversation?.type === "personal" && (() => {
            const other = conversation?.profiles?.find((p: any) => p.user_id !== user?.id);
            const lastSeen = other ? (onlineMap?.get(other.user_id) || other.last_seen_at) : null;
            return <p className={cn("text-[10px]", isUserOnline(lastSeen) ? "text-green-500 font-medium" : "text-muted-foreground")}>{getLastSeenText(lastSeen)}</p>;
          })()}
          {conversation?.type === "group" && (
            <p className="text-[10px] text-muted-foreground">{conversation?.memberCount} জন সদস্য</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {(!messages || messages.length === 0) && (
          <div className="text-center text-sm text-muted-foreground py-10">
            কোনো মেসেজ নেই। কথোপকথন শুরু করুন!
          </div>
        )}
        {messages?.map((msg: any, i: number) => {
          const isMine = msg.sender_id === user?.id;
          const profile = getProfile(msg.sender_id);
          const prevMsg = messages[i - 1];
          const showAvatar = !isMine && (!prevMsg || prevMsg.sender_id !== msg.sender_id);

          return (
            <div
              key={msg.id}
              className={cn("flex gap-1.5 group", isMine ? "justify-end" : "justify-start")}
            >
              {!isMine && (
                <div className="w-7 flex-shrink-0">
                  {showAvatar && (
                    <Avatar className="h-7 w-7">
                      {profile?.photo_url && <AvatarImage src={profile.photo_url} />}
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {profile?.full_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )}
              <div className={cn("max-w-[78%]", isMine ? "items-end" : "items-start")}>
                {showAvatar && conversation?.type === "group" && (
                  <p className="text-[10px] text-muted-foreground mb-0.5 ml-1">{profile?.full_name}</p>
                )}
                <div className="relative">
                  <div
                    className={cn(
                      "px-3 py-1.5 text-[13px] leading-relaxed",
                      isMine
                        ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                        : "bg-secondary text-secondary-foreground rounded-2xl rounded-bl-md"
                    )}
                  >
                    {msg.content}
                    <span className={cn(
                      "text-[9px] ml-2 inline-block align-bottom opacity-60",
                      isMine ? "text-primary-foreground" : "text-muted-foreground"
                    )}>
                      {new Date(msg.created_at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {isMine && (
                    <button
                      onClick={() => deleteMessage.mutate(msg.id)}
                      className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-2 border-t border-border/30 flex gap-2 bg-card/90 backdrop-blur">
        <input
          ref={inputRef}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="মেসেজ লিখুন..."
          className="flex-1 bg-secondary/50 border border-border/30 rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          autoComplete="off"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!newMessage.trim() || sendMessage.isPending}
          className="h-9 w-9 rounded-full flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
