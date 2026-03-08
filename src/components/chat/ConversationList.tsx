import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Users, User, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const sb = supabase as any;

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewPersonal: () => void;
  onNewGroup: () => void;
}

export function ConversationList({ selectedId, onSelect, onNewPersonal, onNewGroup }: ConversationListProps) {
  const { user } = useAuth();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: memberConvos } = await sb
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user!.id);

      if (!memberConvos || memberConvos.length === 0) return [];

      const convIds = memberConvos.map((c: any) => c.conversation_id);
      const { data: convos } = await sb
        .from("conversations")
        .select("*")
        .in("id", convIds)
        .order("updated_at", { ascending: false });

      const enriched = await Promise.all(
        (convos ?? []).map(async (conv: any) => {
          const { data: members } = await sb
            .from("conversation_members")
            .select("user_id")
            .eq("conversation_id", conv.id);

          const memberUserIds = members?.map((m: any) => m.user_id) ?? [];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("full_name, photo_url, user_id")
            .in("user_id", memberUserIds);

          const { data: lastMsg } = await sb
            .from("messages")
            .select("content, created_at, sender_id")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const otherMembers = profiles?.filter((p) => p.user_id !== user!.id) ?? [];
          const displayName =
            conv.type === "group"
              ? conv.name || "গ্রুপ চ্যাট"
              : otherMembers[0]?.full_name || "অজানা সদস্য";
          const photoUrl = conv.type === "personal" ? otherMembers[0]?.photo_url : null;

          return {
            ...conv,
            displayName,
            photoUrl,
            memberCount: memberUserIds.length,
            lastMessage: lastMsg?.[0] || null,
            otherMembers,
          };
        })
      );

      return enriched;
    },
    refetchInterval: 5000,
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border/30 flex items-center justify-between">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" /> চ্যাট
        </h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNewPersonal} title="ব্যক্তিগত চ্যাট">
            <User className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNewGroup} title="গ্রুপ চ্যাট">
            <Users className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && <div className="p-4 text-center text-sm text-muted-foreground">লোড হচ্ছে...</div>}
        {!isLoading && (!conversations || conversations.length === 0) && (
          <div className="p-6 text-center text-sm text-muted-foreground space-y-3">
            <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <p>কোনো চ্যাট নেই</p>
            <div className="flex gap-2 justify-center">
              <Button size="sm" variant="outline" onClick={onNewPersonal}>
                <User className="h-3.5 w-3.5 mr-1" /> ব্যক্তিগত
              </Button>
              <Button size="sm" variant="outline" onClick={onNewGroup}>
                <Users className="h-3.5 w-3.5 mr-1" /> গ্রুপ
              </Button>
            </div>
          </div>
        )}
        {conversations?.map((conv: any) => (
          <div
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              "p-3 flex items-center gap-3 cursor-pointer hover:bg-secondary/50 transition-colors border-b border-border/10",
              selectedId === conv.id && "bg-secondary"
            )}
          >
            <Avatar className="h-10 w-10 flex-shrink-0">
              {conv.photoUrl && <AvatarImage src={conv.photoUrl} />}
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {conv.type === "group" ? <Users className="h-4 w-4" /> : conv.displayName?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground truncate">{conv.displayName}</p>
                {conv.lastMessage && (
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {new Date(conv.lastMessage.created_at).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
              {conv.lastMessage && (
                <p className="text-xs text-muted-foreground truncate">{conv.lastMessage.content}</p>
              )}
              {conv.type === "group" && (
                <p className="text-[10px] text-muted-foreground">{conv.memberCount} জন সদস্য</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
