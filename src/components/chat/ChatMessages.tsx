import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useOnlineStatus, isUserOnline, getLastSeenText } from "@/hooks/usePresence";
import { playMessageSound } from "@/lib/sounds";
import { useEffect, useRef, useState, useCallback } from "react";
import { Send, ArrowLeft, Users, Trash2, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const sb = supabase as any;

interface ChatMessagesProps {
  conversationId: string;
  onBack?: () => void;
}

function useTypingIndicator(conversationId: string, userId: string | undefined) {
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const channelRef = useRef<any>(null);
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    if (!userId || !conversationId) return;

    const channel = supabase.channel(`typing-${conversationId}`)
      .on("broadcast", { event: "typing" }, (payload: any) => {
        const senderId = payload.payload?.user_id;
        const senderName = payload.payload?.user_name;
        if (senderId && senderId !== userId) {
          setTypingUsers(prev => ({ ...prev, [senderId]: senderName || "..." }));
          if (timeoutsRef.current[senderId]) clearTimeout(timeoutsRef.current[senderId]);
          timeoutsRef.current[senderId] = setTimeout(() => {
            setTypingUsers(prev => {
              const next = { ...prev };
              delete next[senderId];
              return next;
            });
          }, 3000);
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      Object.values(timeoutsRef.current).forEach(clearTimeout);
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  const sendTyping = useCallback((userName: string) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId, user_name: userName },
    });
  }, [userId]);

  return { typingUsers, sendTyping };
}

export function ChatMessages({ conversationId, onBack }: ChatMessagesProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: onlineMap } = useOnlineStatus();
  const lastTypingSentRef = useRef(0);

  const { typingUsers, sendTyping } = useTypingIndicator(conversationId, user?.id);

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
        .select("user_id, last_read_at")
        .eq("conversation_id", conversationId);

      const memberUserIds = members?.map((m: any) => m.user_id) ?? [];
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("full_name, photo_url, user_id, last_seen_at")
        .in("user_id", memberUserIds);

      const otherMembers = profiles?.filter((p: any) => p.user_id !== user?.id) ?? [];
      const displayName =
        conv?.type === "group"
          ? conv?.name || "গ্রুপ চ্যাট"
          : otherMembers[0]?.full_name || "অজানা সদস্য";
      const photoUrl = conv?.type === "personal" ? otherMembers[0]?.photo_url : null;

      // Build a map of user_id -> last_read_at for read receipts
      const readMap: Record<string, string> = {};
      members?.forEach((m: any) => {
        if (m.user_id !== user?.id) {
          readMap[m.user_id] = m.last_read_at;
        }
      });

      return {
        ...conv,
        displayName,
        photoUrl,
        memberCount: memberUserIds.length,
        profiles: profiles ?? [],
        readMap,
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

  // Refetch read status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["conversation-info", conversationId] });
    }, 5000);
    return () => clearInterval(interval);
  }, [conversationId, queryClient]);

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
          if (payload.new?.sender_id !== user?.id) {
            playMessageSound();
          }
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          queryClient.invalidateQueries({ queryKey: ["conversation-info", conversationId] });
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
      const { error } = await sb.from("messages").update({ is_deleted: true, content: "এই মেসেজটি ডিলিট করা হয়েছে" }).eq("id", id);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    const now = Date.now();
    if (now - lastTypingSentRef.current > 2000) {
      lastTypingSentRef.current = now;
      const myProfile = conversation?.profiles?.find((p: any) => p.user_id === user?.id);
      sendTyping(myProfile?.full_name || "সদস্য");
    }
  };

  // Check if a message has been seen by at least one other member
  const isMessageSeen = (msgCreatedAt: string) => {
    if (!conversation?.readMap) return false;
    return Object.values(conversation.readMap).some(
      (lastRead: any) => lastRead && new Date(lastRead) >= new Date(msgCreatedAt)
    );
  };

  const typingNames = Object.values(typingUsers);

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
          {typingNames.length > 0 ? (
            <p className="text-[10px] text-primary font-medium animate-pulse">
              {typingNames.join(", ")} টাইপ করছে...
            </p>
          ) : (
            <>
              {conversation?.type === "personal" && (() => {
                const other = conversation?.profiles?.find((p: any) => p.user_id !== user?.id);
                const lastSeen = other ? (onlineMap?.get(other.user_id) || other.last_seen_at) : null;
                return <p className={cn("text-[10px]", isUserOnline(lastSeen) ? "text-green-500 font-medium" : "text-muted-foreground")}>{getLastSeenText(lastSeen)}</p>;
              })()}
              {conversation?.type === "group" && (
                <p className="text-[10px] text-muted-foreground">{conversation?.memberCount} জন সদস্য</p>
              )}
            </>
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
          const isLastMyMsg = isMine && (!messages[i + 1] || messages[i + 1].sender_id !== user?.id);
          const seen = isMine && isMessageSeen(msg.created_at);

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
                      msg.is_deleted
                        ? "bg-muted/50 text-muted-foreground italic rounded-2xl border border-border/30"
                        : isMine
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                          : "bg-secondary text-secondary-foreground rounded-2xl rounded-bl-md"
                    )}
                  >
                    {msg.is_deleted ? "🚫 এই মেসেজটি ডিলিট করা হয়েছে" : msg.content}
                    <span className={cn(
                      "text-[9px] ml-2 inline-flex items-center gap-0.5 align-bottom opacity-60",
                      isMine && !msg.is_deleted ? "text-primary-foreground" : "text-muted-foreground"
                    )}>
                      {new Date(msg.created_at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}
                      {isMine && !msg.is_deleted && (
                        seen
                          ? <CheckCheck className="h-3 w-3 text-blue-400 opacity-100" />
                          : <Check className="h-3 w-3" />
                      )}
                    </span>
                  </div>
                  {isMine && !msg.is_deleted && (
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
          onChange={handleInputChange}
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