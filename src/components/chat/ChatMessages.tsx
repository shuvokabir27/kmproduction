import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef, useState } from "react";
import { Send, ArrowLeft, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ChatMessagesProps {
  conversationId: string;
  onBack?: () => void;
}

export function ChatMessages({ conversationId, onBack }: ChatMessagesProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get conversation info
  const { data: conversation } = useQuery({
    queryKey: ["conversation-info", conversationId],
    queryFn: async () => {
      const { data: conv } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .single();

      const { data: members } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", conversationId);

      const memberUserIds = members?.map((m) => m.user_id) ?? [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("full_name, photo_url, user_id")
        .in("user_id", memberUserIds);

      const otherMembers = profiles?.filter((p) => p.user_id !== user?.id) ?? [];
      const displayName =
        conv?.type === "group"
          ? conv?.name || "গ্রুপ চ্যাট"
          : otherMembers[0]?.full_name || "অজানা সদস্য";

      return {
        ...conv,
        displayName,
        memberCount: memberUserIds.length,
        profiles: profiles ?? [],
      };
    },
  });

  // Get messages
  const { data: messages } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
    refetchInterval: 3000,
  });

  // Realtime subscription
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
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user!.id,
        content: newMessage.trim(),
      });
      if (error) throw error;
      // Update conversation updated_at
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("messages").delete().eq("id", id);
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
      <div className="p-3 border-b border-border/30 flex items-center gap-3 bg-card/80 backdrop-blur">
        {onBack && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{conversation?.displayName}</p>
          {conversation?.type === "group" && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> {conversation?.memberCount} জন সদস্য
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {(!messages || messages.length === 0) && (
          <div className="text-center text-sm text-muted-foreground py-10">
            কোনো মেসেজ নেই। কথোপকথন শুরু করুন!
          </div>
        )}
        {messages?.map((msg: any) => {
          const isMine = msg.sender_id === user?.id;
          const profile = getProfile(msg.sender_id);
          return (
            <div
              key={msg.id}
              className={cn("flex gap-2 group", isMine ? "justify-end" : "justify-start")}
            >
              {!isMine && (
                <Avatar className="h-7 w-7 flex-shrink-0 mt-1">
                  {profile?.photo_url && <AvatarImage src={profile.photo_url} />}
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {profile?.full_name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={cn("max-w-[75%]", isMine ? "items-end" : "items-start")}>
                {!isMine && conversation?.type === "group" && (
                  <p className="text-[10px] text-muted-foreground mb-0.5 ml-1">{profile?.full_name}</p>
                )}
                <div
                  className={cn(
                    "px-3 py-2 rounded-2xl text-sm relative",
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-secondary-foreground rounded-bl-sm"
                  )}
                >
                  {msg.content}
                  {isMine && (
                    <button
                      onClick={() => deleteMessage.mutate(msg.id)}
                      className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  )}
                </div>
                <p className={cn("text-[10px] text-muted-foreground mt-0.5", isMine ? "text-right mr-1" : "ml-1")}>
                  {new Date(msg.created_at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border/30 flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="মেসেজ লিখুন..."
          className="flex-1"
          autoComplete="off"
        />
        <Button type="submit" size="icon" disabled={!newMessage.trim() || sendMessage.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
